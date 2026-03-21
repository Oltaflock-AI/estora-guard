import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/database.types';
import type { Task } from '@/lib/types';
import { evaluateRules } from './rules-engine';

type TypedClient = SupabaseClient<Database>;
type EventLogInsert = Database['public']['Tables']['event_logs']['Insert'];

export interface DeadlineCheckResult {
  checkedAt: string;
  overdueMarked: number;
  dueSoonFlagged: number;
  rulesTriggered: number;
}

export async function checkDeadlines(
  supabase: TypedClient
): Promise<DeadlineCheckResult> {
  const now = new Date();
  const dueSoonThreshold = new Date(now.getTime() + 48 * 60 * 60 * 1000);

  const { data: rawOverdue } = await supabase
    .from('tasks')
    .select('*')
    .not('due_at', 'is', null)
    .lt('due_at', now.toISOString())
    .in('status', ['todo', 'in_progress']);

  const overdueTasks = (rawOverdue ?? []) as Task[];
  let rulesTriggered = 0;

  for (const task of overdueTasks) {
    await supabase
      .from('tasks')
      .update({ status: 'overdue' } as never)
      .eq('id', task.id);

    const logRow: EventLogInsert = {
      contract_id: task.contract_id,
      event_type: 'task.overdue',
      entity_type: 'task',
      entity_id: task.id,
      detail: {
        task_id: task.id,
        task_title: task.title,
        severity: task.severity ?? 'medium',
        due_at: task.due_at,
        marked_overdue_at: now.toISOString(),
      },
    };

    await supabase
      .from('event_logs')
      .insert(logRow as never);

    await evaluateRules(supabase, 'task.overdue', task, task.contract_id);
    rulesTriggered++;
  }

  const { data: rawDueSoon } = await supabase
    .from('tasks')
    .select('*')
    .not('due_at', 'is', null)
    .gt('due_at', now.toISOString())
    .lte('due_at', dueSoonThreshold.toISOString())
    .in('status', ['todo', 'in_progress']);

  const dueSoonTasks = (rawDueSoon ?? []) as Task[];
  let dueSoonFlagged = 0;

  for (const task of dueSoonTasks) {
    const { data: existingLog } = await supabase
      .from('event_logs')
      .select('id')
      .eq('entity_id', task.id)
      .eq('event_type', 'task.due_soon')
      .limit(1);

    if (existingLog && existingLog.length > 0) continue;

    const dueAt = new Date(task.due_at!);
    const hoursRemaining = Math.round(
      ((dueAt.getTime() - now.getTime()) / (1000 * 60 * 60)) * 10
    ) / 10;

    const logRow: EventLogInsert = {
      contract_id: task.contract_id,
      event_type: 'task.due_soon',
      entity_type: 'task',
      entity_id: task.id,
      detail: {
        task_id: task.id,
        task_title: task.title,
        severity: task.severity ?? 'medium',
        due_at: task.due_at,
        hours_remaining: hoursRemaining,
      },
    };

    await supabase
      .from('event_logs')
      .insert(logRow as never);

    await evaluateRules(supabase, 'task.due_soon', task, task.contract_id);
    dueSoonFlagged++;
  }

  return {
    checkedAt: now.toISOString(),
    overdueMarked: overdueTasks.length,
    dueSoonFlagged,
    rulesTriggered,
  };
}
