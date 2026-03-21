'use client';

import { useMemo } from 'react';
import { formatDate, formatDateShort } from '@/lib/utils';
import type { TimelineItem } from '@/lib/types';

interface TimelineViewProps {
  items: TimelineItem[];
}

type DotStatus = 'complete' | 'overdue' | 'upcoming';

function getDotStatus(item: TimelineItem): DotStatus {
  if (item.completed_at) return 'complete';
  if (!item.due_at) return 'upcoming';
  const now = new Date();
  const due = new Date(item.due_at);
  return due < now ? 'overdue' : 'upcoming';
}

function Dot({ status, isClosing }: { status: DotStatus; isClosing: boolean }) {
  const size = isClosing ? 'w-4 h-4' : 'w-2.5 h-2.5';

  if (status === 'complete') {
    return (
      <div
        className={`${size} rounded-full bg-gold flex-shrink-0`}
        style={{ backgroundColor: 'var(--color-gold)' }}
      />
    );
  }
  if (status === 'overdue') {
    return (
      <div
        className={`${size} rounded-full flex-shrink-0 pulse-overdue`}
        style={{ backgroundColor: 'var(--color-error)' }}
      />
    );
  }
  return (
    <div
      className={`${size} rounded-full border-2 flex-shrink-0`}
      style={{ borderColor: 'var(--color-border)' }}
    />
  );
}

export default function TimelineView({ items }: TimelineViewProps) {
  const sorted = useMemo(
    () => [...items].sort((a, b) => a.sort_order - b.sort_order),
    [items]
  );

  if (sorted.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-secondary italic">
          Timeline is being generated…
        </p>
      </div>
    );
  }

  return (
    <div className="relative">
      {sorted.map((item, i) => {
        const status = getDotStatus(item);
        const isClosing = item.milestone_type === 'closing';
        const isLast = i === sorted.length - 1;

        const lineCompleted =
          status === 'complete' ||
          (i < sorted.length - 1 &&
            getDotStatus(sorted[i + 1]) === 'complete');

        return (
          <div
            key={item.id}
            className="flex gap-3 stagger-in"
            style={{ '--i': i } as React.CSSProperties}
          >
            {/* Rail column */}
            <div className="flex flex-col items-center w-4 flex-shrink-0">
              <Dot status={status} isClosing={isClosing} />
              {!isLast && (
                <div
                  className="flex-1 w-px my-1"
                  style={{
                    borderLeft: lineCompleted
                      ? '2px solid var(--color-gold)'
                      : '2px dashed var(--color-border)',
                  }}
                />
              )}
            </div>

            {/* Content */}
            <div className={`pb-5 flex-1 min-w-0 ${isLast ? 'pb-0' : ''}`}>
              <p
                className={`text-sm font-medium leading-tight ${
                  isClosing
                    ? 'font-display text-base text-navy'
                    : status === 'overdue'
                      ? 'text-error'
                      : status === 'complete'
                        ? 'text-secondary line-through decoration-border'
                        : 'text-primary'
                }`}
              >
                {item.label}
              </p>
              {item.description && (
                <p className="text-xs text-secondary mt-0.5 leading-relaxed">
                  {item.description}
                </p>
              )}
              <div className="flex items-center gap-2 mt-1">
                {item.due_at && (
                  <span className="font-mono text-[11px] text-secondary tabular-nums">
                    {isClosing ? formatDate(item.due_at) : formatDateShort(item.due_at)}
                  </span>
                )}
                {status === 'complete' && item.completed_at && (
                  <span className="text-[10px] text-success font-medium">
                    ✓ {formatDateShort(item.completed_at)}
                  </span>
                )}
                {status === 'overdue' && (
                  <span className="text-[10px] text-error font-medium">
                    Overdue
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
