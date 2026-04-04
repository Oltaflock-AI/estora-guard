import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/database.types';
import type { AgentRole } from '@/lib/agent/types';
import type { Task } from '@/lib/types';

type TypedClient = SupabaseClient<Database>;

interface TaskGroup {
  label: string;
  tasks: Task[];
}

export interface TaskListResult {
  groups: TaskGroup[];
  total: number;
  formatted: string;
}

export async function readTaskList(
  supabase: TypedClient,
  contractId: string,
  _role: AgentRole
): Promise<TaskListResult> {
  const { data: rawTasks, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('contract_id', contractId)
    .order('due_at', { ascending: true });

  if (error) throw error;
  const tasks = (rawTasks ?? []) as Task[];

  const now = new Date();

  const overdue: Task[] = [];
  const dueSoon: Task[] = [];
  const inProgress: Task[] = [];
  const todo: Task[] = [];
  const done: Task[] = [];

  const dueSoonThreshold = new Date(now.getTime() + 48 * 60 * 60 * 1000);

  for (const task of tasks) {
    if (task.status === 'done') {
      done.push(task);
      continue;
    }

    const dueAt = task.due_at ? new Date(task.due_at) : null;
    const isOverdue =
      task.status === 'overdue' ||
      (dueAt !== null && dueAt <= now && (task.status === 'todo' || task.status === 'in_progress'));

    if (isOverdue) {
      overdue.push(task);
      continue;
    }

    if (
      dueAt !== null &&
      dueAt > now &&
      dueAt <= dueSoonThreshold &&
      (task.status === 'todo' || task.status === 'in_progress')
    ) {
      dueSoon.push(task);
      continue;
    }

    if (task.status === 'in_progress') {
      inProgress.push(task);
      continue;
    }

    todo.push(task);
  }

  const groups: TaskGroup[] = [
    { label: 'Overdue', tasks: overdue },
    { label: 'Due Soon (next 48h)', tasks: dueSoon },
    { label: 'In Progress', tasks: inProgress },
    { label: 'To Do', tasks: todo },
    { label: 'Done', tasks: done },
  ].filter((g) => g.tasks.length > 0);

  const lines = [`## Task List (${tasks.length} total)`, ''];

  for (const group of groups) {
    lines.push(`### ${group.label} (${group.tasks.length})`);
    for (const task of group.tasks) {
      const severity = task.severity ? ` [${task.severity}]` : '';
      const dueStr = task.due_at ? ` — due ${new Date(task.due_at).toLocaleDateString()}` : '';
      lines.push(`- ${task.title}${severity}${dueStr}`);
      if (task.description) {
        lines.push(`  ${task.description}`);
      }
    }
    lines.push('');
  }

  return { groups, total: tasks.length, formatted: lines.join('\n') };
}
