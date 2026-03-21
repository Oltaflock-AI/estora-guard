'use client';

import { useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

type PostgresEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

interface UseRealtimeOptions<T> {
  table: string;
  schema?: string;
  event?: PostgresEvent;
  filter?: string;
  onInsert?: (payload: T) => void;
  onUpdate?: (payload: { old: T; new: T }) => void;
  onDelete?: (payload: T) => void;
  onChange?: (payload: { eventType: PostgresEvent; new: T; old: T }) => void;
  enabled?: boolean;
}

export function useRealtime<T = Record<string, unknown>>({
  table,
  schema = 'public',
  event = '*',
  filter,
  onInsert,
  onUpdate,
  onDelete,
  onChange,
  enabled = true,
}: UseRealtimeOptions<T>) {
  const supabaseRef = useRef(createClient());
  const channelRef = useRef<RealtimeChannel | null>(null);

  const onInsertRef = useRef(onInsert);
  const onUpdateRef = useRef(onUpdate);
  const onDeleteRef = useRef(onDelete);
  const onChangeRef = useRef(onChange);

  onInsertRef.current = onInsert;
  onUpdateRef.current = onUpdate;
  onDeleteRef.current = onDelete;
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!enabled) return;

    const supabase = supabaseRef.current;
    const channelName = `realtime:${table}:${filter ?? 'all'}`;

    const channelConfig: {
      event: PostgresEvent;
      schema: string;
      table: string;
      filter?: string;
    } = { event, schema, table };

    if (filter) {
      channelConfig.filter = filter;
    }

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes' as never,
        channelConfig,
        (payload: { eventType: string; new: unknown; old: unknown }) => {
          const eventType = payload.eventType as PostgresEvent;
          const newRecord = payload.new as T;
          const oldRecord = payload.old as T;

          if (onChangeRef.current) {
            onChangeRef.current({ eventType, new: newRecord, old: oldRecord });
          }

          if (eventType === 'INSERT' && onInsertRef.current) {
            onInsertRef.current(newRecord);
          } else if (eventType === 'UPDATE' && onUpdateRef.current) {
            onUpdateRef.current({ old: oldRecord, new: newRecord });
          } else if (eventType === 'DELETE' && onDeleteRef.current) {
            onDeleteRef.current(oldRecord);
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [table, schema, event, filter, enabled]);
}

export function useRealtimeTable<T = Record<string, unknown>>(
  table: string,
  options: {
    filter?: string;
    enabled?: boolean;
    onAnyChange?: () => void;
  } = {}
) {
  const { filter, enabled = true, onAnyChange } = options;

  const handleChange = useCallback(() => {
    onAnyChange?.();
  }, [onAnyChange]);

  useRealtime<T>({
    table,
    filter,
    enabled,
    onChange: handleChange,
  });
}
