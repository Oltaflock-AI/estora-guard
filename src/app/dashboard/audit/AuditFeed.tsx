'use client';

import { useState, useCallback } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import {
  ChevronLeft,
  ChevronRight,
  Filter,
  User,
  Bot,
  ArrowRight,
  Search,
  X,
} from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';
import { useRealtime } from '@/hooks/useRealtime';
import type { AuditEvent } from '@/lib/types';

const ENTITY_TYPES = [
  { value: '', label: 'All entities' },
  { value: 'contract', label: 'Contract' },
  { value: 'task', label: 'Task' },
  { value: 'document', label: 'Document' },
  { value: 'risk_flag', label: 'Risk Flag' },
  { value: 'person', label: 'Person' },
  { value: 'property', label: 'Property' },
];

const ACTION_LABELS: Record<string, string> = {
  'contract.created': 'Created contract',
  'contract.updated': 'Updated contract',
  'contract.status_changed': 'Changed contract status',
  'task.created': 'Created task',
  'task.status_changed': 'Changed task status',
  'task.completed': 'Completed task',
  'document.uploaded': 'Uploaded document',
  'document.extracted': 'Extracted fields',
  'risk_flag.acknowledged': 'Acknowledged risk flag',
  'field.updated': 'Updated field',
};

function actionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action.replace(/[._]/g, ' ');
}

function entityTypeIcon(entityType: string) {
  const cls = 'w-3.5 h-3.5';
  switch (entityType) {
    case 'contract':
      return <span className={cls}>📄</span>;
    case 'task':
      return <span className={cls}>✓</span>;
    case 'document':
      return <span className={cls}>📎</span>;
    case 'risk_flag':
      return <span className={cls}>⚠</span>;
    default:
      return <span className={cls}>•</span>;
  }
}

function RedlineChange({
  oldValue,
  newValue,
}: {
  oldValue: string | null;
  newValue: string | null;
}) {
  if (!oldValue && !newValue) return null;

  return (
    <div className="flex items-center gap-2 mt-1">
      {oldValue && (
        <span className="text-xs font-mono line-through text-error/70 bg-red-50 px-1.5 py-0.5 rounded">
          {oldValue}
        </span>
      )}
      {oldValue && newValue && (
        <ArrowRight className="w-3 h-3 text-secondary flex-shrink-0" />
      )}
      {newValue && (
        <span className="text-xs font-mono text-success bg-green-50 px-1.5 py-0.5 rounded">
          {newValue}
        </span>
      )}
    </div>
  );
}

interface AuditFeedProps {
  events: AuditEvent[];
  profiles: Record<string, { full_name: string | null; email: string | null }>;
  total: number;
  page: number;
  pageSize: number;
  currentEntityType?: string;
  currentAction?: string;
}

export default function AuditFeed({
  events: initialEvents,
  profiles,
  total,
  page,
  pageSize,
  currentEntityType,
  currentAction,
}: AuditFeedProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [events, setEvents] = useState(initialEvents);
  const [actionFilter, setActionFilter] = useState(currentAction ?? '');
  const [realtimeCount, setRealtimeCount] = useState(0);

  const totalPages = Math.ceil(total / pageSize);

  useRealtime<AuditEvent>({
    table: 'audit_events',
    event: 'INSERT',
    onInsert: useCallback(
      (newEvent: AuditEvent) => {
        if (page === 1) {
          setEvents((prev) => [newEvent, ...prev.slice(0, pageSize - 1)]);
        } else {
          setRealtimeCount((c) => c + 1);
        }
      },
      [page, pageSize]
    ),
  });

  function updateSearchParams(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    }
    params.delete('page');
    router.push(`${pathname}?${params.toString()}`);
  }

  function goToPage(p: number) {
    const params = new URLSearchParams(searchParams.toString());
    if (p > 1) {
      params.set('page', String(p));
    } else {
      params.delete('page');
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  function handleActionSearch(e: React.FormEvent) {
    e.preventDefault();
    updateSearchParams({ action: actionFilter });
  }

  function clearFilters() {
    setActionFilter('');
    router.push(pathname);
  }

  const hasFilters = currentEntityType || currentAction;

  function getActorDisplay(event: AuditEvent) {
    if (!event.actor_id) {
      return { name: 'System', isSystem: true };
    }
    const profile = profiles[event.actor_id];
    if (profile) {
      return {
        name: profile.full_name || profile.email || 'Unknown',
        isSystem: false,
      };
    }
    return { name: event.actor_id.slice(0, 8), isSystem: false };
  }

  return (
    <div>
      {/* ── Filters ──────────────────────────────────── */}
      <div className="card p-4 mb-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-secondary">
            <Filter className="w-4 h-4" strokeWidth={1.5} />
            <span className="text-xs font-medium uppercase tracking-wider">
              Filters
            </span>
          </div>

          <select
            value={currentEntityType ?? ''}
            onChange={(e) =>
              updateSearchParams({ entity_type: e.target.value })
            }
            className="field-input !h-8 !text-xs !px-2 w-40"
          >
            {ENTITY_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>

          <form
            onSubmit={handleActionSearch}
            className="flex items-center gap-1"
          >
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-disabled" />
              <input
                type="text"
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                placeholder="Search action…"
                className="field-input !h-8 !text-xs !pl-7 !pr-2 w-44"
              />
            </div>
            <button
              type="submit"
              className="btn-secondary !h-8 !px-3 !text-xs"
            >
              Go
            </button>
          </form>

          {hasFilters && (
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-1 text-xs text-secondary hover:text-primary transition-colors"
            >
              <X className="w-3 h-3" />
              Clear
            </button>
          )}

          <span className="ml-auto text-xs text-secondary font-mono tabular-nums">
            {total.toLocaleString()} event{total !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* ── Realtime banner ──────────────────────────── */}
      {realtimeCount > 0 && page !== 1 && (
        <button
          onClick={() => goToPage(1)}
          className="w-full mb-3 py-2 text-center text-xs font-medium text-gold bg-gold/5 border border-gold/20 rounded-md hover:bg-gold/10 transition-colors"
        >
          {realtimeCount} new event{realtimeCount !== 1 ? 's' : ''} — click to
          refresh
        </button>
      )}

      {/* ── Event list ───────────────────────────────── */}
      {events.length === 0 ? (
        <div className="card py-12 text-center">
          <p className="text-sm text-secondary">No audit events found</p>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="mt-2 text-xs text-navy hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <div className="divide-y divide-border">
            {events.map((event, i) => {
              const actor = getActorDisplay(event);

              return (
                <div
                  key={event.id}
                  className="px-4 py-3 hover:bg-surface-sunken/30 transition-colors stagger-in"
                  style={{ '--i': i } as React.CSSProperties}
                >
                  <div className="flex items-start gap-3">
                    {/* Actor icon */}
                    <div
                      className={`
                        w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5
                        ${actor.isSystem ? 'bg-surface-sunken' : 'bg-navy/10'}
                      `}
                    >
                      {actor.isSystem ? (
                        <Bot className="w-3.5 h-3.5 text-secondary" strokeWidth={1.5} />
                      ) : (
                        <User className="w-3.5 h-3.5 text-navy" strokeWidth={1.5} />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="text-sm font-medium text-primary">
                          {actor.name}
                        </span>
                        <span className="text-sm text-secondary">
                          {actionLabel(event.action)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono text-secondary uppercase tracking-wider">
                          {entityTypeIcon(event.entity_type)}
                          {event.entity_type}
                        </span>
                        {event.field_name && (
                          <span className="text-[10px] font-mono text-gold bg-gold/5 px-1.5 py-0.5 rounded">
                            {event.field_name}
                          </span>
                        )}
                        {event.entity_id && (
                          <span className="text-[10px] font-mono text-disabled truncate max-w-[120px]">
                            {event.entity_id.slice(0, 8)}…
                          </span>
                        )}
                      </div>

                      {(event.old_value || event.new_value) && (
                        <RedlineChange
                          oldValue={event.old_value}
                          newValue={event.new_value}
                        />
                      )}

                      {event.detail &&
                        typeof event.detail === 'object' &&
                        Object.keys(event.detail as object).length > 0 && (
                          <details className="mt-1.5">
                            <summary className="text-[10px] text-secondary cursor-pointer hover:text-primary">
                              Detail
                            </summary>
                            <pre className="text-[10px] font-mono text-secondary bg-surface-sunken rounded p-2 mt-1 overflow-x-auto">
                              {JSON.stringify(event.detail, null, 2)}
                            </pre>
                          </details>
                        )}
                    </div>

                    {/* Timestamp */}
                    <span className="text-[11px] font-mono text-secondary tabular-nums flex-shrink-0 mt-0.5">
                      {formatRelativeTime(event.created_at)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Pagination ───────────────────────────────── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-xs text-secondary font-mono">
            Page {page} of {totalPages}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => goToPage(page - 1)}
              disabled={page <= 1}
              className="btn-secondary !h-8 !px-2 disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (page <= 3) {
                pageNum = i + 1;
              } else if (page >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = page - 2 + i;
              }

              return (
                <button
                  key={pageNum}
                  onClick={() => goToPage(pageNum)}
                  className={`
                    w-8 h-8 rounded-md text-xs font-medium transition-colors
                    ${
                      pageNum === page
                        ? 'bg-navy text-white'
                        : 'text-secondary hover:bg-surface-sunken'
                    }
                  `}
                >
                  {pageNum}
                </button>
              );
            })}

            <button
              onClick={() => goToPage(page + 1)}
              disabled={page >= totalPages}
              className="btn-secondary !h-8 !px-2 disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
