import { createClient } from '@/lib/supabase/server';
import type { AuditEvent } from '@/lib/types';
import AuditFeed from './AuditFeed';

interface SearchParams {
  page?: string;
  entity_type?: string;
  action?: string;
}

async function loadAuditEvents(searchParams: SearchParams) {
  const supabase = createClient();
  const page = parseInt(searchParams.page ?? '1', 10);
  const pageSize = 25;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('audit_events')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (searchParams.entity_type) {
    query = query.eq('entity_type', searchParams.entity_type);
  }

  if (searchParams.action) {
    query = query.ilike('action', `%${searchParams.action}%`);
  }

  query = query.range(from, to);

  const { data, count, error } = await query;

  if (error) {
    console.error('Failed to load audit events:', error.message);
    return { events: [], total: 0, page, pageSize };
  }

  const profileIds = Array.from(
    new Set(
      (data ?? [])
        .map((e: Record<string, unknown>) => e.actor_id as string | null)
        .filter((id): id is string => Boolean(id))
    )
  );

  let profiles: Record<string, { full_name: string | null; email: string | null }> = {};
  if (profileIds.length > 0) {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', profileIds);

    if (profileData) {
      for (const p of profileData as Array<{ id: string; full_name: string | null; email: string | null }>) {
        profiles[p.id] = { full_name: p.full_name, email: p.email };
      }
    }
  }

  return {
    events: (data ?? []) as AuditEvent[],
    profiles,
    total: count ?? 0,
    page,
    pageSize,
  };
}

export default async function AuditPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const data = await loadAuditEvents(searchParams);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl text-navy mb-1">Audit Trail</h1>
        <p className="text-sm text-secondary">
          Immutable log of all system actions and changes
        </p>
      </div>

      <AuditFeed
        events={data.events}
        profiles={data.profiles ?? {}}
        total={data.total}
        page={data.page}
        pageSize={data.pageSize}
        currentEntityType={searchParams.entity_type}
        currentAction={searchParams.action}
      />
    </div>
  );
}
