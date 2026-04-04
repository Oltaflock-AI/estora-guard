'use client';

import { useState } from 'react';
import { ShieldAlert, Check, X } from 'lucide-react';
import type { SkillName } from '@/lib/agent/types';

const SKILL_LABELS: Record<SkillName, string> = {
  read_deal_summary: 'Read Deal Summary',
  read_risk_flags: 'Read Risk Flags',
  read_timeline: 'Read Timeline',
  read_task_list: 'Read Task List',
  draft_next_actions: 'Draft Next Actions',
  request_pii_reveal: 'Request PII Reveal',
};

interface ApprovalModalProps {
  skillRequested: SkillName;
  reason: string;
  pendingActionId: string;
  onApprove: (pendingActionId: string) => void;
  onDeny: () => void;
}

export default function ApprovalModal({
  skillRequested,
  reason,
  pendingActionId,
  onApprove,
  onDeny,
}: ApprovalModalProps) {
  const [loading, setLoading] = useState(false);

  function handleApprove() {
    setLoading(true);
    onApprove(pendingActionId);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onDeny} />
      <div className="relative bg-surface-raised rounded-xl shadow-2xl border border-border max-w-md w-full p-6 fade-in-scale">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center">
            <ShieldAlert className="w-5 h-5 text-warning" />
          </div>
          <div>
            <h3 className="font-display text-lg text-navy">Approval Required</h3>
            <p className="text-xs text-secondary">Human authorization needed</p>
          </div>
        </div>

        <div className="space-y-3 mb-6">
          <div>
            <span className="field-label">Action Requested</span>
            <p className="text-sm text-primary font-medium">{SKILL_LABELS[skillRequested]}</p>
          </div>
          <div>
            <span className="field-label">Risk Level</span>
            <p>
              <span className="badge-warning">Critical</span>
            </p>
          </div>
          <div>
            <span className="field-label">Reason</span>
            <p className="text-sm text-secondary">{reason}</p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onDeny}
            disabled={loading}
            className="btn-secondary flex-1"
          >
            <X className="w-4 h-4" />
            Deny
          </button>
          <button
            onClick={handleApprove}
            disabled={loading}
            className="btn-gold flex-1"
          >
            <Check className="w-4 h-4" />
            {loading ? 'Approving...' : 'Approve'}
          </button>
        </div>
      </div>
    </div>
  );
}
