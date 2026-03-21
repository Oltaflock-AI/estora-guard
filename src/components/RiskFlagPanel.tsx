'use client';

import { useState } from 'react';
import {
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Send,
} from 'lucide-react';
import type { RiskFlag } from '@/lib/types';

const SEVERITY_CONFIG: Record<
  string,
  { label: string; borderClass: string; badgeClass: string; icon: typeof AlertTriangle }
> = {
  high: {
    label: 'HIGH',
    borderClass: 'border-l-error',
    badgeClass: 'badge-error',
    icon: AlertCircle,
  },
  medium: {
    label: 'MED',
    borderClass: 'border-l-warning',
    badgeClass: 'badge-warning',
    icon: AlertTriangle,
  },
  low: {
    label: 'LOW',
    borderClass: 'border-l-info',
    badgeClass: 'badge-info',
    icon: Info,
  },
};

const SEVERITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };

function sortFlags(flags: RiskFlag[]): RiskFlag[] {
  return [...flags].sort((a, b) => {
    if (a.acknowledged !== b.acknowledged) return a.acknowledged ? 1 : -1;
    const aOrder = SEVERITY_ORDER[a.severity] ?? 1;
    const bOrder = SEVERITY_ORDER[b.severity] ?? 1;
    return aOrder - bOrder;
  });
}

function FlagTypeLabel({ flagType }: { flagType: string }) {
  const labels: Record<string, string> = {
    tight_deadline: 'Tight Deadline',
    missing_clause: 'Missing Clause',
    unusual_condition: 'Unusual Condition',
    unclear_language: 'Unclear Language',
    material_defect: 'Material Defect',
  };
  return (
    <span className="text-[10px] font-mono text-secondary uppercase tracking-wider">
      {labels[flagType] ?? flagType}
    </span>
  );
}

interface RiskFlagCardProps {
  flag: RiskFlag;
  onAcknowledge: (flagId: string, note: string) => Promise<void>;
}

function RiskFlagCard({ flag, onAcknowledge }: RiskFlagCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [acknowledged, setAcknowledged] = useState(flag.acknowledged);

  const config = SEVERITY_CONFIG[flag.severity] ?? SEVERITY_CONFIG.medium;
  const Icon = acknowledged ? CheckCircle : config.icon;

  async function handleSubmit() {
    setSubmitting(true);
    try {
      await onAcknowledge(flag.id, note);
      setAcknowledged(true);
      setExpanded(false);
    } catch {
      // keep form open on error
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className={`
        border-l-4 ${acknowledged ? 'border-l-success/40' : config.borderClass}
        bg-surface-raised rounded-r-lg px-4 py-3
        transition-all duration-200
        ${acknowledged ? 'opacity-60' : ''}
      `}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5 min-w-0 flex-1">
          <Icon
            className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
              acknowledged ? 'text-success' : ''
            }`}
            strokeWidth={1.5}
            style={
              !acknowledged
                ? { color: `var(--color-${flag.severity === 'high' ? 'error' : flag.severity === 'medium' ? 'warning' : 'info'})` }
                : undefined
            }
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-0.5">
              <span className={`${config.badgeClass} !text-[9px]`}>
                {config.label}
              </span>
              <FlagTypeLabel flagType={flag.flag_type} />
            </div>
            <p className="text-sm font-medium text-primary leading-tight">
              {flag.title}
            </p>
            <p className="text-xs text-secondary mt-1 leading-relaxed">
              {flag.explanation}
            </p>
          </div>
        </div>

        {!acknowledged && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-secondary hover:text-primary p-1 flex-shrink-0"
            title={expanded ? 'Collapse' : 'Acknowledge'}
          >
            {expanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        )}

        {acknowledged && (
          <span className="text-[10px] text-success font-medium flex-shrink-0 mt-1">
            Acknowledged
          </span>
        )}
      </div>

      {expanded && !acknowledged && (
        <div className="mt-3 pl-7 border-t border-border pt-3">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add a note (optional)…"
            rows={2}
            className="field-input w-full resize-none text-xs"
          />
          <div className="flex justify-end mt-2">
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="btn-primary !h-8 !px-4 !text-xs gap-1.5"
            >
              {submitting ? (
                'Saving…'
              ) : (
                <>
                  <Send className="w-3 h-3" />
                  Acknowledge
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface RiskFlagPanelProps {
  flags: RiskFlag[];
  onAcknowledge?: (flagId: string, note: string) => Promise<void>;
}

export default function RiskFlagPanel({ flags, onAcknowledge }: RiskFlagPanelProps) {
  const sorted = sortFlags(flags);

  const highCount = flags.filter((f) => f.severity === 'high' && !f.acknowledged).length;
  const medCount = flags.filter((f) => f.severity === 'medium' && !f.acknowledged).length;
  const lowCount = flags.filter((f) => f.severity === 'low' && !f.acknowledged).length;
  const total = highCount + medCount + lowCount;

  async function defaultAcknowledge(flagId: string, note: string) {
    const res = await fetch(`/api/risk-flags/${flagId}/acknowledge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note }),
    });
    if (!res.ok) {
      throw new Error('Failed to acknowledge risk flag');
    }
  }

  const handleAcknowledge = onAcknowledge ?? defaultAcknowledge;

  if (flags.length === 0) {
    return (
      <div className="card py-6 text-center">
        <CheckCircle className="w-8 h-8 text-success mx-auto mb-2" strokeWidth={1.5} />
        <p className="text-sm font-medium text-primary">No Risk Flags</p>
        <p className="text-xs text-secondary mt-1">
          No issues were identified in this document.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="section-header">Risk Flags</h3>
        {total > 0 && (
          <div className="flex items-center gap-2 text-[10px] font-mono">
            {highCount > 0 && (
              <span className="text-error">{highCount} high</span>
            )}
            {medCount > 0 && (
              <span className="text-warning">{medCount} med</span>
            )}
            {lowCount > 0 && (
              <span className="text-info">{lowCount} low</span>
            )}
          </div>
        )}
      </div>

      <div className="space-y-2">
        {sorted.map((flag, i) => (
          <div
            key={flag.id}
            className="stagger-in"
            style={{ '--i': i } as React.CSSProperties}
          >
            <RiskFlagCard flag={flag} onAcknowledge={handleAcknowledge} />
          </div>
        ))}
      </div>
    </div>
  );
}
