'use client';

import { getHealthColor, getHealthBgClass } from '@/lib/utils';

interface HealthBarProps {
  score: number | null;
  status: string | null;
  compact?: boolean;
  overdue?: number;
  dueSoon?: number;
  onTrack?: number;
}

export default function HealthBar({
  score,
  status,
  compact = false,
  overdue,
  dueSoon,
  onTrack,
}: HealthBarProps) {
  if (score === null) {
    if (compact) {
      return <span className="w-2 h-2 rounded-full bg-gray-300 inline-block" />;
    }
    return (
      <div className="flex items-center gap-3">
        <span className="font-display text-2xl text-disabled">—</span>
        <div className="w-1.5 h-[80px] bg-surface-sunken rounded-full" />
      </div>
    );
  }

  const fillHeight = Math.max(0, Math.min(100, score));

  if (compact) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <span className={`w-2 h-2 rounded-full ${getHealthBgClass(status)}`} />
        <span className="text-xs font-mono text-secondary">{score}</span>
      </span>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-end gap-4">
        <span
          className="font-display text-5xl tabular-nums leading-none"
          style={{ color: getHealthColor(status) }}
        >
          {score}
        </span>

        <div className="relative w-1.5 h-[120px] bg-surface-sunken rounded-full overflow-hidden">
          <div
            className="absolute bottom-0 left-0 right-0 rounded-full health-bar-fill"
            style={{
              height: `${fillHeight}%`,
              backgroundColor: getHealthColor(status),
            }}
          />
        </div>
      </div>

      {(overdue !== undefined || dueSoon !== undefined || onTrack !== undefined) && (
        <div className="space-y-1 text-center">
          {overdue !== undefined && overdue > 0 && (
            <p className="font-mono text-xs text-error">
              {overdue} overdue
            </p>
          )}
          {dueSoon !== undefined && dueSoon > 0 && (
            <p className="font-mono text-xs text-warning">
              {dueSoon} due soon
            </p>
          )}
          {onTrack !== undefined && (
            <p className="font-mono text-xs text-success">
              {onTrack} on track
            </p>
          )}
        </div>
      )}
    </div>
  );
}
