import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/database.types';
import type { AgentRole } from '@/lib/agent/types';
import type { TimelineItem } from '@/lib/types';

type TypedClient = SupabaseClient<Database>;

interface TimelineEntry {
  label: string;
  dueDate: string | null;
  completed: boolean;
  daysRemaining: number | null;
  overdue: boolean;
  milestoneType: string | null;
}

export interface TimelineResult {
  items: TimelineEntry[];
  formatted: string;
}

export async function readTimeline(
  supabase: TypedClient,
  contractId: string,
  _role: AgentRole
): Promise<TimelineResult> {
  const { data: rawItems, error } = await supabase
    .from('timeline_items')
    .select('*')
    .eq('contract_id', contractId)
    .order('sort_order', { ascending: true });

  if (error) throw error;
  const items = (rawItems ?? []) as TimelineItem[];

  const now = new Date();

  const entries: TimelineEntry[] = items.map((item) => {
    const dueAt = item.due_at ? new Date(item.due_at) : null;
    let daysRemaining: number | null = null;
    let overdue = false;

    if (dueAt) {
      const diffMs = dueAt.getTime() - now.getTime();
      daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      overdue = daysRemaining < 0 && !item.completed_at;
    }

    return {
      label: item.label,
      dueDate: item.due_at,
      completed: !!item.completed_at,
      daysRemaining,
      overdue,
      milestoneType: item.milestone_type,
    };
  });

  const overdueItems = entries.filter((e) => e.overdue);
  const upcomingItems = entries.filter(
    (e) => !e.completed && !e.overdue && e.daysRemaining !== null && e.daysRemaining <= 14
  );
  const completedItems = entries.filter((e) => e.completed);

  const lines = [
    `## Deal Timeline (${entries.length} milestones)`,
    '',
  ];

  if (overdueItems.length > 0) {
    lines.push(`### Overdue (${overdueItems.length})`);
    for (const item of overdueItems) {
      lines.push(`- **${item.label}** — ${Math.abs(item.daysRemaining!)} days overdue (due ${item.dueDate})`);
    }
    lines.push('');
  }

  if (upcomingItems.length > 0) {
    lines.push(`### Coming Up (next 14 days)`);
    for (const item of upcomingItems) {
      lines.push(`- **${item.label}** — ${item.daysRemaining} days remaining (due ${item.dueDate})`);
    }
    lines.push('');
  }

  if (completedItems.length > 0) {
    lines.push(`### Completed (${completedItems.length})`);
    for (const item of completedItems) {
      lines.push(`- ~~${item.label}~~`);
    }
    lines.push('');
  }

  return { items: entries, formatted: lines.join('\n') };
}
