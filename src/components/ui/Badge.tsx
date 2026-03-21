import type { ContractStatus } from '@/lib/types';

const STATUS_CONFIG: Record<
  ContractStatus,
  { label: string; className: string }
> = {
  draft: {
    label: 'Draft',
    className: 'bg-gray-100 text-gray-600',
  },
  pending_commitment: {
    label: 'Pending',
    className: 'bg-amber-50 text-warning',
  },
  active: {
    label: 'Active',
    className: 'bg-green-50 text-success',
  },
  closed: {
    label: 'Closed',
    className: 'bg-blue-50 text-info',
  },
  cancelled: {
    label: 'Cancelled',
    className: 'bg-red-50 text-error',
  },
  defaulted_buyer: {
    label: 'Defaulted',
    className: 'bg-red-50 text-error',
  },
  defaulted_seller: {
    label: 'Defaulted',
    className: 'bg-red-50 text-error',
  },
};

export function StatusBadge({ status }: { status: ContractStatus }) {
  const config = STATUS_CONFIG[status];
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}

export function SeverityBadge({
  severity,
}: {
  severity: 'low' | 'medium' | 'high' | 'critical';
}) {
  const config: Record<string, { label: string; className: string }> = {
    low: { label: 'LOW', className: 'bg-blue-50 text-info' },
    medium: { label: 'MED', className: 'bg-amber-50 text-warning' },
    high: { label: 'HIGH', className: 'bg-red-50 text-error' },
    critical: { label: 'CRITICAL', className: 'bg-red-100 text-error font-semibold' },
  };
  const c = config[severity];
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium tracking-wider ${c.className}`}
    >
      {c.label}
    </span>
  );
}
