'use client';

import { FileText, Clock } from 'lucide-react';
import type { SecurityReceipt } from '@/lib/agent/types';

interface SecurityReceiptCardProps {
  receipt: SecurityReceipt;
}

export default function SecurityReceiptCard({ receipt }: SecurityReceiptCardProps) {
  const decisionBadgeClass =
    receipt.decision === 'allowed'
      ? 'badge-success'
      : receipt.decision === 'denied'
        ? 'badge-error'
        : 'badge-warning';

  return (
    <div className="card p-4 fade-in-scale">
      <div className="flex items-center gap-2 mb-3">
        <FileText className="w-4 h-4 text-gold" />
        <span className="text-xs font-semibold text-navy uppercase tracking-wider">
          Security Receipt
        </span>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
        <div>
          <span className="field-label">Receipt ID</span>
          <p className="mono-value text-xs truncate">{receipt.id}</p>
        </div>
        <div>
          <span className="field-label">Decision</span>
          <p>
            <span className={decisionBadgeClass}>{receipt.decision}</span>
          </p>
        </div>
        <div>
          <span className="field-label">Role</span>
          <p className="mono-value text-xs">{receipt.role}</p>
        </div>
        <div>
          <span className="field-label">Skill</span>
          <p className="mono-value text-xs">{receipt.skillRequested}</p>
        </div>
        <div className="col-span-2">
          <span className="field-label">Reason</span>
          <p className="text-secondary">{receipt.reason}</p>
        </div>
        {receipt.approvedBy && (
          <div className="col-span-2">
            <span className="field-label">Approved By</span>
            <p className="mono-value text-xs">{receipt.approvedBy}</p>
          </div>
        )}
        <div className="col-span-2 flex items-center gap-1 text-disabled">
          <Clock className="w-3 h-3" />
          <span className="mono-value text-xs">
            {new Date(receipt.createdAt).toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}
