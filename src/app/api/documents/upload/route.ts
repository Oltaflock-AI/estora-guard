import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { runExtraction, PdfValidationError, ExtractionError } from '@/lib/services/document-intelligence';
import { createAuditEvent } from '@/lib/services/audit-service';
import type { Database } from '@/lib/supabase/database.types';

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export async function POST(request: NextRequest) {
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

  const orgId = (membershipRows as Array<{ org_id: string }> | null)?.[0]?.org_id;
  if (!orgId) {
    return NextResponse.json({ error: 'No organization found.' }, { status: 403 });
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
    return NextResponse.json({ error: 'File must be under 10 MB.' }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  const storagePath = `uploads/${user.id}/${Date.now()}_${file.name}`;

  const { error: storageError } = await serviceClient.storage
    .from(process.env.NEXT_PUBLIC_STORAGE_BUCKET ?? 'documents')
    .upload(storagePath, buffer, {
      contentType: 'application/pdf',
      upsert: false,
    });

  if (storageError) {
    console.error('Storage upload failed:', storageError.message);
    return NextResponse.json({ error: 'Failed to store document.' }, { status: 500 });
  }

  const docInsert: Database['public']['Tables']['documents']['Insert'] = {
    org_id: orgId,
    uploaded_by: user.id,
    filename: file.name,
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
    return NextResponse.json({ error: 'Failed to create document record.' }, { status: 500 });
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
        filename: file.name,
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
    return NextResponse.json({ error: 'Extraction failed unexpectedly.' }, { status: 500 });
  }
}
