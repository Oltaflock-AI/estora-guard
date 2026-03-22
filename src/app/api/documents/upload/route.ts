import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { runExtraction, PdfValidationError, ExtractionError } from '@/lib/services/document-intelligence';
import { createAuditEvent } from '@/lib/services/audit-service';
import type { Database } from '@/lib/supabase/database.types';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_FILE_SIZE = 25 * 1024 * 1024;
const PDF_MAGIC_BYTES = [0x25, 0x50, 0x44, 0x46, 0x2d]; // %PDF-

function isPdfMagicBytes(buffer: Buffer): boolean {
  if (buffer.length < 5) return false;
  return PDF_MAGIC_BYTES.every((byte, i) => buffer[i] === byte);
}

function sanitizeFilename(name: string): string {
  return name
    .replace(/[^\w.\-]/g, '_')
    .replace(/\.{2,}/g, '.')
    .replace(/^\.+/, '')
    .slice(0, 200);
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const serviceClient = createServiceClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const { data: membershipRows } = await serviceClient
      .from('memberships')
      .select('org_id')
      .eq('user_id', user.id)
      .limit(1);

    let orgId = (membershipRows as Array<{ org_id: string }> | null)?.[0]?.org_id;

    if (!orgId) {
      // Auto-provision org + membership for new users
      const displayName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';
      const slug = `org-${user.id.slice(0, 8)}`;

      const { data: orgRow, error: orgErr } = await serviceClient
        .from('organizations')
        .insert({ name: `${displayName}'s Team`, slug } as never)
        .select('id')
        .single();

      if (orgErr || !orgRow) {
        console.error('Org creation failed:', orgErr?.message);
        return NextResponse.json({ error: 'Failed to create organization.' }, { status: 500 });
      }

      orgId = (orgRow as { id: string }).id;

      const { error: memErr } = await serviceClient
        .from('memberships')
        .insert({ org_id: orgId, user_id: user.id, role: 'admin' } as never);

      if (memErr) {
        console.error('Membership creation failed:', memErr.message);
        return NextResponse.json({ error: 'Failed to create membership.' }, { status: 500 });
      }
    }

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json({ error: 'Invalid form data.' }, { status: 400 });
    }

    const file = formData.get('file');
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Only PDF files are accepted.' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File must be under 25 MB.' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    if (!isPdfMagicBytes(buffer)) {
      return NextResponse.json(
        { error: 'File does not appear to be a valid PDF (magic byte check failed).' },
        { status: 400 }
      );
    }

    const safeName = sanitizeFilename(file.name);
    const storagePath = `uploads/${user.id}/${Date.now()}_${safeName}`;

    const { error: storageError } = await serviceClient.storage
      .from(process.env.NEXT_PUBLIC_STORAGE_BUCKET ?? 'documents')
      .upload(storagePath, buffer, {
        contentType: 'application/pdf',
        upsert: false,
      });

    if (storageError) {
      console.error('Storage upload failed:', storageError.message);
      return NextResponse.json({ error: `Failed to store document: ${storageError.message}` }, { status: 500 });
    }

    const docInsert: Database['public']['Tables']['documents']['Insert'] = {
      org_id: orgId,
      uploaded_by: user.id,
      filename: safeName,
      storage_path: storagePath,
      status: 'processing',
    };

    const { data: docRow, error: docError } = await serviceClient
      .from('documents')
      .insert(docInsert as never)
      .select('*')
      .single();

    if (docError || !docRow) {
      console.error('Document insert failed:', docError?.message);
      return NextResponse.json({ error: `Failed to create document record: ${docError?.message}` }, { status: 500 });
    }

    const doc = docRow as Database['public']['Tables']['documents']['Row'];

    try {
      const result = await runExtraction(buffer);

      await serviceClient
        .from('documents')
        .update({
          status: 'done',
          raw_text: result.rawText,
          summary: result.summary,
          doc_type: 'agreement_of_sale',
        } as never)
        .eq('id', doc.id);

      if (result.fields.length > 0) {
        const extractionRows = result.fields.map((f) => ({
          document_id: doc.id,
          field_name: f.fieldName,
          field_value: f.fieldValue,
          confidence: f.confidence,
          page_ref: f.pageRef,
        }));

        await serviceClient
          .from('extractions')
          .insert(extractionRows as never[]);
      }

      if (result.riskFlags.length > 0) {
        const flagRows = result.riskFlags.map((rf) => ({
          document_id: doc.id,
          flag_type: rf.flagType,
          severity: rf.severity,
          title: rf.title,
          explanation: rf.explanation,
        }));

        await serviceClient
          .from('risk_flags')
          .insert(flagRows as never[]);
      }

      await createAuditEvent(serviceClient, {
        orgId,
        actorId: user.id,
        action: 'document.uploaded',
        entityType: 'document',
        entityId: doc.id,
        detail: {
          filename: safeName,
          originalFilename: file.name,
          fileSize: file.size,
          fieldCount: result.fields.length,
          riskFlagCount: result.riskFlags.length,
        },
      });

      return NextResponse.json({
        id: doc.id,
        filename: doc.filename,
        status: 'done',
        summary: result.summary,
        fieldCount: result.fields.length,
        riskFlagCount: result.riskFlags.length,
      });
    } catch (err) {
      await serviceClient
        .from('documents')
        .update({ status: 'failed' } as never)
        .eq('id', doc.id);

      if (err instanceof PdfValidationError) {
        return NextResponse.json({ error: err.message }, { status: 422 });
      }
      if (err instanceof ExtractionError) {
        return NextResponse.json({ error: err.message }, { status: 422 });
      }

      console.error('Extraction failed:', err);
      return NextResponse.json({ error: `Extraction failed: ${err instanceof Error ? err.message : String(err)}` }, { status: 500 });
    }
  } catch (outerErr) {
    console.error('Upload route unhandled error:', outerErr);
    return NextResponse.json(
      { error: `Unexpected error: ${outerErr instanceof Error ? outerErr.message : String(outerErr)}` },
      { status: 500 }
    );
  }
}
