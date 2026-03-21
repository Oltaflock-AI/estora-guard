import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/database.types';
import type { Task } from '@/lib/types';

type TypedClient = SupabaseClient<Database>;

export type HealthStatus = 'green' | 'yellow' | 'red';

export interface HealthResult {
  score: number;
  status: HealthStatus;
  reasons: string[];
  overdue: number;
  dueSoon: number;
  onTrack: number;
}

const SEVERITY_WEIGHTS: Record<string, number> = {
  critical: 3.0,
  high: 2.0,
  medium: 1.0,
  low: 0.5,
};

function weight(severity: string | null): number {
  return SEVERITY_WEIGHTS[severity ?? 'medium'] ?? 1.0;
}

export async function computeHealthScore(
  supabase: TypedClient,
  contractId: string
): Promise<HealthResult> {
  const now = new Date();
  const dueSoonThreshold = new Date(now.getTime() + 48 * 60 * 60 * 1000);

  const { data: rawTasks } = await supabase
    .from('tasks')
    .select('*')
    .eq('contract_id', contractId);

  const tasks = (rawTasks ?? []) as Task[];

  let overdueCount = 0;
  let dueSoonCount = 0;
  let onTrackCount = 0;
  let overdueWeighted = 0;
  let dueSoonWeighted = 0;
  let hasCriticalOverdue = false;
  const reasons: string[] = [];

  for (const task of tasks) {
    if (task.status === 'done') {
      onTrackCount++;
      continue;
    }

    const dueAt = task.due_at ? new Date(task.due_at) : null;

    const isOverdue =
      task.status === 'overdue' ||
      (dueAt !== null &&
        dueAt <= now &&
        (task.status === 'todo' || task.status === 'in_progress'));

    if (isOverdue) {
      overdueCount++;
      overdueWeighted += weight(task.severity);
      if ((task.severity ?? 'medium') === 'critical') {
        hasCriticalOverdue = true;
      }
      continue;
    }

    if (
      dueAt !== null &&
      dueAt > now &&
      dueAt <= dueSoonThreshold &&
      (task.status === 'todo' || task.status === 'in_progress')
    ) {
      dueSoonCount++;
      dueSoonWeighted += weight(task.severity);
      continue;
    }

    onTrackCount++;
  }

  if (overdueCount > 0) {
    reasons.push(
      `${overdueCount} task(s) overdue (weighted score ${overdueWeighted.toFixed(1)})`
    );
  }
  if (dueSoonCount > 0) {
    reasons.push(
      `${dueSoonCount} task(s) due in next 48h (weighted score ${dueSoonWeighted.toFixed(1)})`
    );
  }

  let status: HealthStatus;
  if (hasCriticalOverdue || overdueWeighted >= 3.0) {
    status = 'red';
  } else if (overdueWeighted >= 1.0 || dueSoonCount > 0) {
    status = 'yellow';
  } else {
    status = 'green';
    if (reasons.length === 0) {
      reasons.push('All tasks on track');
    }
  }

  const score = Math.max(
    0,
    Math.min(100, Math.round(100 - overdueWeighted * 15 - dueSoonWeighted * 5))
  );

  return {
    score,
    status,
    reasons,
    overdue: overdueCount,
    dueSoon: dueSoonCount,
    onTrack: onTrackCount,
  };
}
