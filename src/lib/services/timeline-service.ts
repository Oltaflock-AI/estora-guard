import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/database.types';

type TypedClient = SupabaseClient<Database>;
type TaskInsert = Database['public']['Tables']['tasks']['Insert'];
type TimelineInsert = Database['public']['Tables']['timeline_items']['Insert'];

interface TemplateItem {
  title: string;
  offset_days: number;
  description: string;
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  milestone_type?: string;
}

const TIMELINE_TEMPLATES: Record<string, TemplateItem[]> = {
  ny_residential: [
    {
      title: 'Execute contract',
      offset_days: 0,
      description: 'All parties sign the Agreement of Sale',
      category: 'Contract',
      severity: 'critical',
      milestone_type: 'contract_signed',
    },
    {
      title: 'Deposit earnest money',
      offset_days: 3,
      description: 'Deliver down payment to escrow agent within contract terms',
      category: 'Escrow',
      severity: 'high',
    },
    {
      title: 'Attorney review period',
      offset_days: 5,
      description: 'Attorney review of executed contract, riders, and contingencies',
      category: 'Contract',
      severity: 'high',
    },
    {
      title: 'Submit mortgage application',
      offset_days: 7,
      description: 'Complete and submit full mortgage application to lender',
      category: 'Mortgage',
      severity: 'high',
    },
    {
      title: 'Order title search',
      offset_days: 10,
      description: 'Engage title company to perform a full title search',
      category: 'Title',
      severity: 'high',
    },
    {
      title: 'Schedule property inspection',
      offset_days: 14,
      description: 'Schedule and complete the general property inspection',
      category: 'Inspection',
      severity: 'high',
    },
    {
      title: 'Appraisal ordered',
      offset_days: 21,
      description: 'Lender orders property appraisal for underwriting',
      category: 'Appraisal',
      severity: 'medium',
    },
    {
      title: 'Appraisal review',
      offset_days: 30,
      description: 'Review the lender-ordered property appraisal report',
      category: 'Appraisal',
      severity: 'high',
    },
    {
      title: 'Receive mortgage commitment',
      offset_days: 45,
      description: 'Obtain written mortgage commitment letter from lender',
      category: 'Mortgage',
      severity: 'critical',
      milestone_type: 'commitment_received',
    },
    {
      title: 'Title cleared',
      offset_days: 50,
      description: 'Confirm all title exceptions resolved and title is insurable',
      category: 'Title',
      severity: 'high',
      milestone_type: 'title_cleared',
    },
    {
      title: 'Obtain certificate of occupancy',
      offset_days: 55,
      description: 'Verify certificate of occupancy is current and valid',
      category: 'Compliance',
      severity: 'medium',
    },
    {
      title: 'Smoke detector affidavit',
      offset_days: 55,
      description: 'Obtain signed smoke/carbon monoxide detector affidavit',
      category: 'Compliance',
      severity: 'low',
    },
    {
      title: 'Final walkthrough',
      offset_days: -2,
      description: 'Buyer performs final walkthrough to confirm property condition',
      category: 'Walkthrough',
      severity: 'critical',
      milestone_type: 'final_walkthrough',
    },
    {
      title: 'Settlement / Closing',
      offset_days: 0,
      description: 'Closing day — execute deed, disburse funds, transfer keys',
      category: 'Closing',
      severity: 'critical',
      milestone_type: 'closing',
    },
  ],
};

function computeDueDate(
  anchorDate: Date,
  closeDateStr: string | null,
  item: TemplateItem
): Date {
  if (item.milestone_type === 'closing' && closeDateStr) {
    return new Date(closeDateStr);
  }

  if (item.offset_days < 0 && closeDateStr) {
    const closeDate = new Date(closeDateStr);
    closeDate.setDate(closeDate.getDate() + item.offset_days);
    return closeDate;
  }

  const d = new Date(anchorDate);
  d.setDate(d.getDate() + item.offset_days);
  return d;
}

export async function generateDefaultTimeline(
  supabase: TypedClient,
  contractId: string,
  closeDate: string | null,
  templateName: string = 'ny_residential'
): Promise<void> {
  const template = TIMELINE_TEMPLATES[templateName];
  if (!template) {
    throw new Error(`Unknown timeline template: ${templateName}`);
  }

  const now = new Date();

  const tasksToInsert: TaskInsert[] = [];
  const timelineToInsert: TimelineInsert[] = [];

  for (let i = 0; i < template.length; i++) {
    const item = template[i];
    const dueAt = computeDueDate(now, closeDate, item);

    tasksToInsert.push({
      contract_id: contractId,
      title: item.title,
      description: item.description,
      category: item.category,
      severity: item.severity,
      status: 'todo',
      offset_days: item.offset_days,
      due_at: dueAt.toISOString(),
      dedupe_key: `timeline:${contractId}:${item.title}`,
    });

    timelineToInsert.push({
      contract_id: contractId,
      label: item.title,
      description: item.description,
      milestone_type: item.milestone_type ?? null,
      due_at: dueAt.toISOString(),
      sort_order: i,
    });
  }

  const { error: taskError } = await supabase
    .from('tasks')
    .insert(tasksToInsert as never[]);
  if (taskError) throw taskError;

  const { error: tlError } = await supabase
    .from('timeline_items')
    .insert(timelineToInsert as never[]);
  if (tlError) throw tlError;
}
