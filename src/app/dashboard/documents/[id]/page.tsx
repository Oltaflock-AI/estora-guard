'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  FileText,
  ArrowLeft,
  Loader2,
  AlertTriangle,
  CheckCircle,
  Clock,
  Plus,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import ExtractionViewer from '@/components/ExtractionViewer';
import RiskFlagPanel from '@/components/RiskFlagPanel';
import { formatRelativeTime } from '@/lib/utils';
import type { Document, Extraction, RiskFlag } from '@/lib/types';

type PageState = 'loading' | 'ready' | 'error' | 'creating';

const STATUS_DISPLAY: Record<string, { label: string; className: string }> = {
  pending: { label: 'Pending', className: 'bg-gray-100 text-gray-600' },
  processing: { label: 'Processing', className: 'bg-amber-50 text-warning' },
  done: { label: 'Analyzed', className: 'bg-green-50 text-success' },
  failed: { label: 'Failed', className: 'bg-red-50 text-error' },
};

const DOC_TYPE_LABELS: Record<string, string> = {
  agreement_of_sale: 'Agreement of Sale',
  disclosure: 'Disclosure',
  addendum: 'Addendum',
  other: 'Other',
};

export default function ExtractionReviewPage() {
  const params = useParams();
  const router = useRouter();
  const documentId = params.id as string;

  const [state, setState] = useState<PageState>('loading');
  const [doc, setDoc] = useState<Document | null>(null);
  const [extractions, setExtractions] = useState<Extraction[]>([]);
  const [riskFlags, setRiskFlags] = useState<RiskFlag[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();

      const { data: docRow, error: docError } = await supabase
        .from('documents')
        .select('*')
        .eq('id', documentId)
        .single();

      if (docError || !docRow) {
        setErrorMsg('Document not found.');
        setState('error');
        return;
      }

      setDoc(docRow as Document);

      const { data: extRows } = await supabase
        .from('extractions')
        .select('*')
        .eq('document_id', documentId)
        .order('created_at', { ascending: true });

      setExtractions((extRows ?? []) as Extraction[]);

      const { data: flagRows } = await supabase
        .from('risk_flags')
        .select('*')
        .eq('document_id', documentId)
        .order('created_at', { ascending: true });

      setRiskFlags((flagRows ?? []) as RiskFlag[]);
      setState('ready');
    }

    load();
  }, [documentId]);

  async function handleCreateTransaction() {
    setState('creating');
    setCreateError(null);

    try {
      const res = await fetch(`/api/documents/${documentId}/create-transaction`, {
        method: 'POST',
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Failed (${res.status})`);
      }

      const data = await res.json();
      router.push(`/dashboard/transactions/${data.id}`);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create transaction.');
      setState('ready');
    }
  }

  if (state === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-gold animate-spin" strokeWidth={1.5} />
          <p className="text-sm text-secondary">Loading document…</p>
        </div>
      </div>
    );
  }

  if (state === 'error' || !doc) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3 text-center">
          <AlertTriangle className="w-8 h-8 text-error" strokeWidth={1.5} />
          <p className="text-sm text-error">{errorMsg ?? 'Something went wrong.'}</p>
          <button onClick={() => router.back()} className="btn-secondary !h-8 !text-xs">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const statusConfig = STATUS_DISPLAY[doc.status] ?? STATUS_DISPLAY.pending;
  const docTypeLabel = DOC_TYPE_LABELS[doc.doc_type ?? ''] ?? 'Document';
  const hasTransaction = doc.contract_id !== null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push('/dashboard')}
          className="text-secondary hover:text-primary p-1 rounded transition-colors"
          title="Back to Dashboard"
        >
          <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
        </button>
        <div>
          <h1 className="font-display text-2xl text-navy">Extraction Review</h1>
          <p className="text-sm text-secondary">
            Review AI-extracted fields and risk flags before creating a transaction
          </p>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Document metadata */}
        <div className="lg:col-span-1 space-y-4">
          <div className="card space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-navy/5 flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5 text-navy" strokeWidth={1.5} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-mono text-primary truncate" title={doc.filename}>
                  {doc.filename}
                </p>
                <p className="text-xs text-secondary mt-0.5">{docTypeLabel}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className={`badge ${statusConfig.className}`}>
                {doc.status === 'done' && <CheckCircle className="w-3 h-3 mr-0.5" />}
                {statusConfig.label}
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-secondary">
              <Clock className="w-3.5 h-3.5" strokeWidth={1.5} />
              <span>Uploaded {formatRelativeTime(doc.created_at)}</span>
            </div>

            <hr className="border-border" />

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-surface-sunken rounded-md px-3 py-2">
                <p className="text-[10px] text-secondary uppercase tracking-wider">Fields</p>
                <p className="text-lg font-display text-navy">{extractions.length}</p>
              </div>
              <div className="bg-surface-sunken rounded-md px-3 py-2">
                <p className="text-[10px] text-secondary uppercase tracking-wider">Flags</p>
                <p className="text-lg font-display text-navy">{riskFlags.length}</p>
              </div>
            </div>

            {/* Confidence summary */}
            {extractions.length > 0 && (
              <div className="bg-surface-sunken rounded-md px-3 py-2">
                <p className="text-[10px] text-secondary uppercase tracking-wider mb-1">
                  Avg Confidence
                </p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
                    <div
                      className="h-full bg-success rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.round(
                          (extractions.reduce((sum, e) => sum + (e.confidence ?? 0), 0) /
                            extractions.length) *
                            100
                        )}%`,
                      }}
                    />
                  </div>
                  <span className="text-xs font-mono text-primary">
                    {Math.round(
                      (extractions.reduce((sum, e) => sum + (e.confidence ?? 0), 0) /
                        extractions.length) *
                        100
                    )}
                    %
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* AI Summary */}
          {doc.summary && (
            <div className="card">
              <p className="text-[10px] text-secondary uppercase tracking-wider mb-2">
                AI Summary
              </p>
              <blockquote className="border-l-2 border-gold pl-3 text-sm text-primary italic leading-relaxed">
                {doc.summary}
              </blockquote>
            </div>
          )}

          {/* Create Transaction CTA */}
          {doc.status === 'done' && !hasTransaction && (
            <div className="card bg-gold/5 border-gold/20">
              <button
                onClick={handleCreateTransaction}
                disabled={state === 'creating'}
                className="btn-gold w-full gap-2"
              >
                {state === 'creating' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating Transaction…
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Create Transaction
                  </>
                )}
              </button>
              {createError && (
                <p className="text-xs text-error mt-2 text-center">{createError}</p>
              )}
              <p className="text-[10px] text-secondary mt-2 text-center">
                Creates parties, property, contract, timeline, and tasks
              </p>
            </div>
          )}

          {/* Already linked */}
          {hasTransaction && (
            <div className="card bg-green-50/50 border-success/20">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-4 h-4 text-success" strokeWidth={1.5} />
                <span className="text-sm font-medium text-success">Transaction Created</span>
              </div>
              <button
                onClick={() => router.push(`/dashboard/transactions/${doc.contract_id}`)}
                className="btn-primary w-full !h-9 !text-xs"
              >
                View Transaction
              </button>
            </div>
          )}
        </div>

        {/* Right column: Extractions + Risk Flags */}
        <div className="lg:col-span-2 space-y-8">
          {doc.status === 'done' && (
            <>
              <div>
                <h2 className="section-header mb-4">Extracted Fields</h2>
                <ExtractionViewer extractions={extractions} />
              </div>

              <RiskFlagPanel flags={riskFlags} />
            </>
          )}

          {doc.status === 'processing' && (
            <div className="card flex flex-col items-center py-16">
              <Loader2 className="w-10 h-10 text-gold animate-spin mb-4" strokeWidth={1.5} />
              <p className="text-sm font-medium text-primary">Analyzing Document</p>
              <p className="text-xs text-secondary mt-1">
                Extracting fields and identifying risk factors…
              </p>
            </div>
          )}

          {doc.status === 'failed' && (
            <div className="card flex flex-col items-center py-16">
              <AlertTriangle className="w-10 h-10 text-error mb-4" strokeWidth={1.5} />
              <p className="text-sm font-medium text-error">Extraction Failed</p>
              <p className="text-xs text-secondary mt-1">
                The document could not be analyzed. Please try uploading again.
              </p>
            </div>
          )}

          {doc.status === 'pending' && (
            <div className="card flex flex-col items-center py-16">
              <Clock className="w-10 h-10 text-secondary mb-4" strokeWidth={1.5} />
              <p className="text-sm font-medium text-primary">Pending Processing</p>
              <p className="text-xs text-secondary mt-1">
                This document is waiting to be analyzed.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
