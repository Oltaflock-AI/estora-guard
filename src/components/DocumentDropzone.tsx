'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Upload,
  Loader2,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';

type DropzoneState = 'idle' | 'dragover' | 'uploading' | 'processing' | 'success' | 'error';

const PROCESSING_STEPS = [
  'Reading document…',
  'Extracting text…',
  'Analyzing agreement…',
  'Identifying risk factors…',
  'Generating summary…',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export default function DocumentDropzone() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [state, setState] = useState<DropzoneState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [processingStep, setProcessingStep] = useState(0);
  const [fileName, setFileName] = useState<string | null>(null);

  function cleanup() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setState('dragover');
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setState('idle');
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }

  function processFile(file: File) {
    if (file.type !== 'application/pdf') {
      setError('Please upload a PDF file.');
      setState('error');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError('File must be under 10 MB.');
      setState('error');
      return;
    }
    uploadFile(file);
  }

  async function uploadFile(file: File) {
    setFileName(file.name);
    setError(null);
    setState('processing');
    setProcessingStep(0);

    intervalRef.current = setInterval(() => {
      setProcessingStep((prev) => (prev + 1) % PROCESSING_STEPS.length);
    }, 800);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });

      cleanup();

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Upload failed (${res.status})`);
      }

      const data = await res.json();
      setState('success');

      setTimeout(() => {
        router.push(`/dashboard/documents/${data.id}`);
      }, 800);
    } catch (err) {
      cleanup();
      setError(err instanceof Error ? err.message : 'Upload failed. Please try again.');
      setState('error');
    }
  }

  function handleReset() {
    cleanup();
    setState('idle');
    setError(null);
    setFileName(null);
    setProcessingStep(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }

  const borderClass = {
    idle: 'border-border hover:border-gold/50',
    dragover: 'border-gold',
    uploading: 'border-gold/30',
    processing: 'border-gold/30',
    success: 'border-success/30',
    error: 'border-error/30',
  }[state];

  const bgClass = {
    idle: 'bg-surface-raised',
    dragover: 'bg-gold/5',
    uploading: 'bg-gold/5',
    processing: 'bg-gold/5',
    success: 'bg-green-50',
    error: 'bg-red-50',
  }[state];

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => state === 'idle' && fileInputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && state === 'idle') fileInputRef.current?.click();
      }}
      className={`
        relative border-2 border-dashed rounded-lg px-6 py-10 text-center
        transition-all duration-200 cursor-pointer
        ${borderClass} ${bgClass}
      `}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        onChange={handleInputChange}
        className="hidden"
        aria-label="Upload PDF document"
      />

      {state === 'idle' && (
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gold/10 flex items-center justify-center">
            <Upload className="w-5 h-5 text-gold" strokeWidth={1.5} />
          </div>
          <div>
            <p className="text-sm font-medium text-primary">
              Drop an Agreement of Sale here
            </p>
            <p className="text-xs text-secondary mt-1">
              PDF only, up to 10 MB
            </p>
          </div>
        </div>
      )}

      {state === 'dragover' && (
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gold/20 flex items-center justify-center animate-bounce">
            <Upload className="w-5 h-5 text-gold" strokeWidth={1.5} />
          </div>
          <p className="text-sm font-medium text-gold">Release to upload</p>
        </div>
      )}

      {(state === 'uploading' || state === 'processing') && (
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-gold animate-spin" strokeWidth={1.5} />
          <div>
            <p className="text-sm font-medium text-primary">{fileName}</p>
            <p className="text-xs text-gold mt-1 h-4">
              {PROCESSING_STEPS[processingStep]}
            </p>
          </div>
        </div>
      )}

      {state === 'success' && (
        <div className="flex flex-col items-center gap-3">
          <CheckCircle className="w-8 h-8 text-success" strokeWidth={1.5} />
          <p className="text-sm font-medium text-success">
            Analysis complete — redirecting…
          </p>
        </div>
      )}

      {state === 'error' && (
        <div className="flex flex-col items-center gap-3">
          <AlertTriangle className="w-8 h-8 text-error" strokeWidth={1.5} />
          <p className="text-sm text-error">{error}</p>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleReset();
            }}
            className="text-xs text-secondary hover:text-primary underline underline-offset-2 mt-1"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
}
