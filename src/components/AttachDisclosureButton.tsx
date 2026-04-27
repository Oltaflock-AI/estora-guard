'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, FilePlus2, X, AlertTriangle, CheckCircle } from 'lucide-react';

type State = 'idle' | 'uploading' | 'success' | 'error';

const MAX_FILE_SIZE = 25 * 1024 * 1024;
const VALID_DOC_TYPES = ['disclosure', 'addendum', 'other'] as const;
type DocType = (typeof VALID_DOC_TYPES)[number];

interface AttachDisclosureButtonProps {
  contractId: string;
}

export default function AttachDisclosureButton({ contractId }: AttachDisclosureButtonProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<State>('idle');
  const [error, setError] = useState<string | null>(null);
  const [docType, setDocType] = useState<DocType>('disclosure');
  const [fileName, setFileName] = useState<string | null>(null);

  function reset() {
    setState('idle');
    setError(null);
    setFileName(null);
    setDocType('disclosure');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function close() {
    if (state === 'uploading') return;
    setOpen(false);
    reset();
  }

  async function handleFile(file: File) {
    if (file.type !== 'application/pdf') {
      setError('Please upload a PDF file.');
      setState('error');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError('File must be under 25 MB.');
      setState('error');
      return;
    }

    setFileName(file.name);
    setError(null);
    setState('uploading');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('contract_id', contractId);
      formData.append('doc_type', docType);

      const res = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Upload failed (${res.status})`);
      }

      setState('success');
      setTimeout(() => {
        setOpen(false);
        reset();
        router.refresh();
      }, 900);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed. Please try again.');
      setState('error');
    }
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-secondary gap-2 justify-center"
      >
        <FilePlus2 className="w-4 h-4" />
        Attach disclosure
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 fade-in-scale"
          role="dialog"
          aria-modal="true"
          aria-labelledby="attach-disclosure-title"
          onClick={close}
        >
          <div
            className="bg-surface-raised rounded-lg shadow-xl w-full max-w-md p-6 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={close}
              disabled={state === 'uploading'}
              className="absolute top-3 right-3 p-1 text-secondary hover:text-primary disabled:opacity-40"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>

            <h2 id="attach-disclosure-title" className="text-lg font-display text-navy mb-1">
              Attach a document
            </h2>
            <p className="text-xs text-secondary mb-4">
              Upload a Seller&apos;s Property Disclosure, Lead-Based Paint disclosure, or
              addendum to attach it to this transaction.
            </p>

            <div className="mb-4">
              <label className="field-label" htmlFor="attach-doc-type">
                Document type
              </label>
              <select
                id="attach-doc-type"
                className="field-input"
                value={docType}
                onChange={(e) => setDocType(e.target.value as DocType)}
                disabled={state === 'uploading'}
              >
                <option value="disclosure">Disclosure (SPD / LBP)</option>
                <option value="addendum">Addendum</option>
                <option value="other">Other</option>
              </select>
            </div>

            {state === 'idle' && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="btn-primary w-full justify-center gap-2"
              >
                <FilePlus2 className="w-4 h-4" />
                Choose PDF
              </button>
            )}

            {state === 'uploading' && (
              <div className="flex items-center gap-3 py-4">
                <Loader2 className="w-5 h-5 animate-spin text-gold" />
                <div>
                  <p className="text-sm text-primary font-medium">{fileName}</p>
                  <p className="text-xs text-secondary">Extracting fields and risk flags…</p>
                </div>
              </div>
            )}

            {state === 'success' && (
              <div className="flex items-center gap-3 py-4 text-success">
                <CheckCircle className="w-5 h-5" />
                <div>
                  <p className="text-sm font-medium">Attached</p>
                  <p className="text-xs text-secondary">{fileName}</p>
                </div>
              </div>
            )}

            {state === 'error' && (
              <div className="space-y-3">
                <div className="flex items-start gap-2 text-error text-sm">
                  <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
                <button
                  type="button"
                  onClick={reset}
                  className="btn-secondary w-full justify-center"
                >
                  Try again
                </button>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={handleFileInput}
            />
          </div>
        </div>
      )}
    </>
  );
}
