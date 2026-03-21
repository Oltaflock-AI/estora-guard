import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/database.types';
import type { Task } from '@/lib/types';

type TypedClient = SupabaseClient<Database>;
type TaskInsert = Database['public']['Tables']['tasks']['Insert'];

const TASK_TITLE_MAX_LEN = 255;

interface RuleDef {
  name: string;
  trigger: string;
  taskTitleTemplate: string;
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  assignToCoordinator: boolean;
}

const RULES: RuleDef[] = [
  {
    name: 'due_soon_reminder',
    trigger: 'task.due_soon',
    taskTitleTemplate: "Reminder: Confirm '{taskTitle}' is scheduled",
    category: 'reminder',
    severity: 'medium',
    assignToCoordinator: false,
  },
  {
    name: 'overdue_escalation',
    trigger: 'task.overdue',
    taskTitleTemplate: "ESCALATION: '{taskTitle}' is overdue",
    category: 'escalation',
    severity: 'critical',
    assignToCoordinator: true,
  },
  {
    name: 'appraisal_low_negotiation',
    trigger: 'appraisal.flagged_low',
    taskTitleTemplate: "Negotiate: appraisal flagged low for '{taskTitle}'",
    category: 'negotiation',
    severity: 'high',
    assignToCoordinator: false,
  },
];

function buildDedupeKey(
  ruleName: string,
  trigger: string,
  sourceTaskId: string
): string {
  return `rule:${ruleName}:${trigger}:${sourceTaskId}`;
}

async function resolveCoordinator(
  supabase: TypedClient,
  _contractId: string
): Promise<string | null> {
  const { data: rawMemberships } = await supabase
    .from('memberships')
    .select('user_id')
    .eq('role', 'admin')
    .order('user_id', { ascending: true })
    .limit(1);

  const memberships = (rawMemberships ?? []) as Array<{ user_id: string }>;
  return memberships.length > 0 ? memberships[0].user_id : null;
}

export async function evaluateRules(
  supabase: TypedClient,
  trigger: string,
  sourceTask: Task,
  contractId: string
): Promise<void> {
  const matchingRules = RULES.filter((r) => r.trigger === trigger);

  for (const rule of matchingRules) {
    const dedupeKey = buildDedupeKey(rule.name, trigger, sourceTask.id);

    const { data: existing } = await supabase
      .from('tasks')
      .select('id')
      .eq('dedupe_key', dedupeKey)
      .limit(1);

    if (existing && existing.length > 0) continue;

    let title = rule.taskTitleTemplate.replace(
      '{taskTitle}',
      sourceTask.title
    );
    if (title.length > TASK_TITLE_MAX_LEN) {
      title = title.slice(0, TASK_TITLE_MAX_LEN);
    }

    let assigneeId: string | null = null;
    if (rule.assignToCoordinator) {
      assigneeId = await resolveCoordinator(supabase, contractId);
    }

    const row: TaskInsert = {
      contract_id: contractId,
      title,
      category: rule.category,
      severity: rule.severity,
      status: 'todo',
      assignee_id: assigneeId,
      dedupe_key: dedupeKey,
    };

    await supabase
      .from('tasks')
      .insert(row as never);
  }
}
