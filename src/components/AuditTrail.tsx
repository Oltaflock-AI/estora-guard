'use client';

import { useState, useEffect } from 'react';
import {
  ChevronUp,
  ChevronDown,
  Clock,
  Filter,
  ArrowRight,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { formatRelativeTime } from '@/lib/utils';
import type { AuditEvent } from '@/lib/types';

const ACTION_LABELS: Record<string, string> = {
  'field.updated': 'Updated',
  'contract.created': 'Created contract',
  'contract.created_from_document': 'Created from document',
  'document.uploaded': 'Uploaded document',
  'risk_flag.acknowledged': 'Acknowledged risk flag',
  'task.status_changed': 'Changed task status',
};

interface AuditTrailProps {
  contractId: string;
  lastSavedAt: string | null;
  lastSavedBy: string | null;
}

export default function AuditTrail({
  contractId,
  lastSavedAt,
  lastSavedBy,
}: AuditTrailProps) {
  const [expanded, setExpanded] = useState(false);
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterField, setFilterField] = useState<string>('');

  useEffect(() => {
    if (!expanded || events.length > 0) return;

    async function load() {
      setLoading(true);
      const supabase = createClient();

      const { data: taskRows } = await supabase
        .from('tasks')
        .select('id')
        .eq('contract_id', contractId);

      const taskIds = ((taskRows ?? []) as Array<{ id: string }>).map(
        (t) => t.id
      );
      const entityIds = [contractId, ...taskIds];

      const { data } = await supabase
        .from('audit_events')
        .select('*')
        .in('entity_id', entityIds)
        .order('created_at', { ascending: false })
        .limit(100);

      setEvents((data ?? []) as AuditEvent[]);
      setLoading(false);
    }

    load();
  }, [expanded, contractId, events.length]);

  const filteredEvents = filterField
    ? events.filter((e) => e.field_name === filterField)
    : events;

  const uniqueFields = Array.from(
    new Set(events.filter((e) => e.field_name).map((e) => e.field_name!))
  );

  const summaryText = lastSavedAt
    ? `Last edited ${lastSavedBy ? `by ${lastSavedBy}` : ''} ${formatRelativeTime(lastSavedAt)}`
    : 'No changes recorded';

  return (
    <div className="border-t border-border bg-surface-raised">
      {/* Collapsed bar */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-6 py-2.5 hover:bg-surface-sunken/50 transition-colors"
      >
        <div className="flex items-center gap-2 text-xs text-secondary">
          <Clock className="w-3.5 h-3.5" strokeWidth={1.5} />
          <span>{summaryText}</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-secondary">
          <span className="font-mono">{events.length || '—'} events</span>
          {expanded ? (
            <ChevronDown className="w-3.5 h-3.5" />
          ) : (
            <ChevronUp className="w-3.5 h-3.5" />
          )}
        </div>
      </button>

      {/* Expanded feed */}
      {expanded && (
        <div className="border-t border-border px-6 py-4 max-h-[320px] overflow-y-auto">
          {/* Filter bar */}
          {uniqueFields.length > 0 && (
            <div className="flex items-center gap-2 mb-3">
              <Filter className="w-3.5 h-3.5 text-secondary" strokeWidth={1.5} />
              <select
                value={filterField}
                onChange={(e) => setFilterField(e.target.value)}
                className="text-xs border border-border rounded px-2 py-1 bg-surface-raised text-primary"
              >
                <option value="">All fields</option>
                {uniqueFields.map((f) => (
                  <option key={f} value={f}>
                    {f.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </div>
          )}

          {loading && (
            <p className="text-xs text-secondary italic py-4 text-center">
              Loading audit trail…
            </p>
          )}

          {!loading && filteredEvents.length === 0 && (
            <p className="text-xs text-secondary italic py-4 text-center">
              No audit events found
            </p>
          )}

          {!loading && (
            <div className="space-y-0">
              {filteredEvents.map((event) => (
                <AuditEventRow key={event.id} event={event} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AuditEventRow({ event }: { event: AuditEvent }) {
  const actionLabel =
    ACTION_LABELS[event.action] ?? event.action.replace(/[._]/g, ' ');

  return (
    <div className="flex items-start gap-3 py-2 border-b border-border/50 last:border-0">
      <span className="text-[10px] font-mono text-disabled whitespace-nowrap mt-0.5 w-24 flex-shrink-0">
        {formatRelativeTime(event.created_at)}
      </span>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-medium text-primary">
            {actionLabel}
          </span>
          {event.field_name && (
            <span className="text-[10px] font-mono text-secondary">
              {event.field_name.replace(/_/g, ' ')}
            </span>
          )}
        </div>

        {(event.old_value || event.new_value) && (
          <div className="flex items-center gap-1.5 mt-0.5 text-[11px]">
            {event.old_value && (
              <span className="text-error/70 line-through truncate max-w-[120px]">
                {event.old_value}
              </span>
            )}
            {event.old_value && event.new_value && (
              <ArrowRight className="w-3 h-3 text-secondary flex-shrink-0" />
            )}
            {event.new_value && (
              <span className="text-success truncate max-w-[120px]">
                {event.new_value}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
