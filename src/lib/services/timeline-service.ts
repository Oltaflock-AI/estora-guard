import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/database.types';

type TypedClient = SupabaseClient<Database>;
type TaskInsert = Database['public']['Tables']['tasks']['Insert'];
type TimelineInsert = Database['public']['Tables']['timeline_items']['Insert'];
type RiskFlagInsert = Database['public']['Tables']['risk_flags']['Insert'];

type Audience = 'buyer' | 'seller' | 'both';

interface TemplateItem {
  title: string;
  offset_days: number;
  description: string;
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  audience: Audience;
  milestone_type?: string;
  /** Key into extractedDates to override offset_days with an actual date from the PDF */
  date_override_key?: string;
}

/** Map of extraction field names to ISO date strings from the PDF */
export type ExtractedDates = Record<string, string | null>;

const TIMELINE_TEMPLATES: Record<string, TemplateItem[]> = {
  // Legacy scaffolding from the prior NY-first product. Not actively maintained.
  // All items default to audience 'both' so they render identically in either view.
  ny_residential: [
    {
      title: 'Execute contract',
      offset_days: 0,
      description: 'All parties sign the Agreement of Sale',
      category: 'Contract',
      severity: 'critical',
      audience: 'both',
      milestone_type: 'contract_signed',
      date_override_key: 'contract_date',
    },
    {
      title: 'Deposit earnest money',
      offset_days: 3,
      description: 'Deliver down payment to escrow agent within contract terms',
      category: 'Escrow',
      severity: 'high',
      audience: 'both',
    },
    {
      title: 'Attorney review period',
      offset_days: 5,
      description: 'Attorney review of executed contract, riders, and contingencies',
      category: 'Contract',
      severity: 'high',
      audience: 'both',
      date_override_key: 'attorney_review_deadline',
    },
    {
      title: 'Submit mortgage application',
      offset_days: 7,
      description: 'Complete and submit full mortgage application to lender',
      category: 'Mortgage',
      severity: 'high',
      audience: 'both',
      date_override_key: 'mortgage_application_deadline',
    },
    {
      title: 'Order title search',
      offset_days: 10,
      description: 'Engage title company to perform a full title search',
      category: 'Title',
      severity: 'high',
      audience: 'both',
      date_override_key: 'title_search_deadline',
    },
    {
      title: 'Schedule property inspection',
      offset_days: 14,
      description: 'Schedule and complete the general property inspection',
      category: 'Inspection',
      severity: 'high',
      audience: 'both',
      date_override_key: 'inspection_deadline',
    },
    {
      title: 'Appraisal ordered',
      offset_days: 21,
      description: 'Lender orders property appraisal for underwriting',
      category: 'Appraisal',
      severity: 'medium',
      audience: 'both',
    },
    {
      title: 'Appraisal review',
      offset_days: 30,
      description: 'Review the lender-ordered property appraisal report',
      category: 'Appraisal',
      severity: 'high',
      audience: 'both',
      date_override_key: 'appraisal_deadline',
    },
    {
      title: 'Receive mortgage commitment',
      offset_days: 45,
      description: 'Obtain written mortgage commitment letter from lender',
      category: 'Mortgage',
      severity: 'critical',
      audience: 'both',
      milestone_type: 'commitment_received',
      date_override_key: 'commitment_date',
    },
    {
      title: 'Title cleared',
      offset_days: 50,
      description: 'Confirm all title exceptions resolved and title is insurable',
      category: 'Title',
      severity: 'high',
      audience: 'both',
      milestone_type: 'title_cleared',
    },
    {
      title: 'Obtain certificate of occupancy',
      offset_days: 55,
      description: 'Verify certificate of occupancy is current and valid',
      category: 'Compliance',
      severity: 'medium',
      audience: 'both',
      date_override_key: 'certificate_of_occupancy_deadline',
    },
    {
      title: 'Smoke detector affidavit',
      offset_days: 55,
      description: 'Obtain signed smoke/carbon monoxide detector affidavit',
      category: 'Compliance',
      severity: 'low',
      audience: 'both',
    },
    {
      title: 'Final walkthrough',
      offset_days: -2,
      description: 'Buyer performs final walkthrough to confirm property condition',
      category: 'Walkthrough',
      severity: 'critical',
      audience: 'both',
      milestone_type: 'final_walkthrough',
    },
    {
      title: 'Settlement / Closing',
      offset_days: 0,
      description: 'Closing day — execute deed, disburse funds, transfer keys',
      category: 'Closing',
      severity: 'critical',
      audience: 'both',
      milestone_type: 'closing',
    },
  ],
  pa_residential: [
    {
      title: 'Execute contract',
      offset_days: 0,
      description: 'All parties sign the PAR Standard Agreement for the Sale of Real Estate',
      category: 'Contract',
      severity: 'critical',
      audience: 'both',
      milestone_type: 'contract_signed',
      date_override_key: 'contract_date',
    },
    {
      title: 'Initial deposit due',
      offset_days: 3,
      description: 'Buyer delivers initial deposit to listing broker escrow within 3 business days of Execution',
      category: 'Escrow',
      severity: 'high',
      audience: 'buyer',
      date_override_key: 'initial_deposit_due_date',
    },
    {
      title: 'Order title insurance',
      offset_days: 5,
      description: 'Buyer engages title company to begin title work within 5 days of Execution',
      category: 'Title',
      severity: 'high',
      audience: 'buyer',
      date_override_key: 'title_search_deadline',
    },
    {
      title: 'Submit mortgage application',
      offset_days: 7,
      description: 'Buyer submits a completed mortgage application to lender within 7 days of Execution',
      category: 'Mortgage',
      severity: 'high',
      audience: 'buyer',
      date_override_key: 'mortgage_application_deadline',
    },
    {
      title: 'Inspection contingency period ends',
      offset_days: 10,
      description: 'PA standard 10-day inspection window — accept Property, submit Corrective Proposal, or terminate',
      category: 'Inspection',
      severity: 'critical',
      audience: 'both',
      date_override_key: 'inspection_deadline',
    },
    {
      title: 'Receive mortgage commitment',
      offset_days: 30,
      description: 'Buyer obtains written mortgage commitment letter from lender by Commitment Date',
      category: 'Mortgage',
      severity: 'critical',
      audience: 'both',
      milestone_type: 'commitment_received',
      date_override_key: 'commitment_date',
    },
    {
      title: 'Title cleared',
      offset_days: 40,
      description: 'Title company confirms marketable title — exceptions resolved, insurable at standard rates',
      category: 'Title',
      severity: 'high',
      audience: 'both',
      milestone_type: 'title_cleared',
    },
    {
      title: 'Smoke detector & CO affidavit',
      offset_days: 50,
      description: 'Seller provides smoke detector and carbon monoxide detector affidavit per Paragraph 15',
      category: 'Compliance',
      severity: 'low',
      audience: 'seller',
    },
    {
      title: 'Vacate & broom-clean property',
      offset_days: -1,
      description: 'Seller delivers possession broom-clean and free of all debris and excluded personal property (Para 4A)',
      category: 'Possession',
      severity: 'high',
      audience: 'seller',
    },
    {
      title: 'Cancel utilities & ADT lease',
      offset_days: -1,
      description: 'Seller cancels or transfers utilities and the leased ADT security system per SPD additional comments',
      category: 'Possession',
      severity: 'medium',
      audience: 'seller',
    },
    {
      title: 'Pre-settlement walkthrough',
      offset_days: -1,
      description: 'Buyer walkthrough within 24 hours of Settlement to verify condition and included items',
      category: 'Walkthrough',
      severity: 'critical',
      audience: 'buyer',
      milestone_type: 'final_walkthrough',
    },
    {
      title: 'FIRPTA non-foreign certification',
      offset_days: 0,
      description: 'Seller delivers FIRPTA non-foreign person certification at settlement (Para 15)',
      category: 'Compliance',
      severity: 'medium',
      audience: 'seller',
    },
    {
      title: 'Settlement / Closing',
      offset_days: 0,
      description: 'Settlement day — execute deed, pay PA realty transfer tax, disburse funds, transfer possession',
      category: 'Closing',
      severity: 'critical',
      audience: 'both',
      milestone_type: 'closing',
    },
  ],
};

// Date-only strings ("YYYY-MM-DD") must be anchored to noon UTC, not midnight.
// `new Date('2026-04-24')` yields midnight UTC, which renders as the previous
// day in any negative-offset timezone (e.g. EST). Noon UTC stays on the
// intended calendar day in any plausible local timezone.
function dateOnlyToDate(dateStr: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (m) {
    return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0));
  }
  return new Date(dateStr);
}

function computeDueDate(
  anchorDate: Date,
  closeDateStr: string | null,
  item: TemplateItem,
  extractedDates: ExtractedDates
): Date {
  // Use extracted date from the PDF if available
  if (item.date_override_key) {
    const extracted = extractedDates[item.date_override_key];
    if (extracted) {
      return dateOnlyToDate(extracted);
    }
  }

  if (item.milestone_type === 'closing' && closeDateStr) {
    return dateOnlyToDate(closeDateStr);
  }

  if (item.offset_days < 0 && closeDateStr) {
    const closeDate = dateOnlyToDate(closeDateStr);
    closeDate.setUTCDate(closeDate.getUTCDate() + item.offset_days);
    return closeDate;
  }

  const d = new Date(anchorDate);
  d.setUTCDate(d.getUTCDate() + item.offset_days);
  return d;
}

export async function generateDefaultTimeline(
  supabase: TypedClient,
  contractId: string,
  closeDate: string | null,
  templateName: string = 'ny_residential',
  extractedDates: ExtractedDates = {}
): Promise<void> {
  const template = TIMELINE_TEMPLATES[templateName];
  if (!template) {
    throw new Error(`Unknown timeline template: ${templateName}`);
  }

  // Use contract_date as anchor if available, otherwise today
  const anchorDateStr = extractedDates.contract_date;
  const now = anchorDateStr ? dateOnlyToDate(anchorDateStr) : new Date();

  const tasksToInsert: TaskInsert[] = [];
  const timelineToInsert: TimelineInsert[] = [];

  for (let i = 0; i < template.length; i++) {
    const item = template[i];
    const dueAt = computeDueDate(now, closeDate, item, extractedDates);

    tasksToInsert.push({
      contract_id: contractId,
      title: item.title,
      description: item.description,
      category: item.category,
      severity: item.severity,
      audience: item.audience,
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
      audience: item.audience,
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

// ─── Disclosure-derived rules ────────────────────────────────────────────────
//
// When an SPD or LBP disclosure is attached to an existing contract, this engine
// re-evaluates a small fixed rule set against the union of all extracted fields
// across every document linked to that contract, and appends any new tasks /
// timeline pins / risk flags that the disclosure data implies.
//
// Idempotency: tasks dedupe on `dedupe_key`; timeline_items and risk_flags use
// (contract_id, label/title) lookups before insert. Re-uploading the same
// disclosure does not double-add.

interface DerivedTask {
  ruleId: string;
  title: string;
  description: string;
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  audience: 'buyer' | 'seller' | 'both';
  offsetDaysFromClose: number;
  alsoOnTimeline: boolean;
}

interface DerivedFlag {
  title: string;
  explanation: string;
  flagType: 'tight_deadline' | 'missing_clause' | 'unusual_condition' | 'unclear_language' | 'material_defect';
  severity: 'low' | 'medium' | 'high';
  audience: 'buyer' | 'seller' | 'both';
}

function asBool(v: string | null | undefined): boolean | null {
  if (v == null) return null;
  const s = v.toString().trim().toLowerCase();
  if (s === 'true' || s === 'yes' || s === '1') return true;
  if (s === 'false' || s === 'no' || s === '0') return false;
  return null;
}

function asNum(v: string | null | undefined): number | null {
  if (v == null) return null;
  const n = Number(String(v).replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(n) ? n : null;
}

function evaluateRules(fields: Record<string, string | null>): {
  tasks: DerivedTask[];
  flags: DerivedFlag[];
} {
  const tasks: DerivedTask[] = [];
  const flags: DerivedFlag[] = [];

  // ── SPD rules ──────────────────────────────────────────────────────────────

  // Rule 1 — Active radon mitigation system → walkthrough verification task (buyer)
  if (asBool(fields.radon_mitigation_present) === true) {
    tasks.push({
      ruleId: 'radon_walkthrough_check',
      title: 'Verify radon mitigation system at walkthrough',
      description:
        'Active radon mitigation system installed (per SPD). Confirm system is functioning, request maintenance/installation records from seller, and verify post-mitigation reading is below EPA action level (4.0 pCi/L).',
      category: 'Inspection',
      severity: 'high',
      audience: 'buyer',
      offsetDaysFromClose: -1,
      alsoOnTimeline: true,
    });
  }

  // Rule 2 — Roof warranty transferable → seller deliverable (seller)
  if (asBool(fields.roof_warranty_transferable) === true) {
    tasks.push({
      ruleId: 'roof_warranty_transfer',
      title: 'Provide transferable roof warranty documentation',
      description:
        'Roof warranty is transferable per SPD. Seller to deliver warranty documentation and transfer paperwork to buyer prior to settlement.',
      category: 'Documentation',
      severity: 'medium',
      audience: 'seller',
      offsetDaysFromClose: -7,
      alsoOnTimeline: true,
    });
  }

  // Rule 3 — Deck permit number disclosed → seller deliverable (seller, task only)
  const deckPermit = (fields.deck_permit_number ?? '').trim();
  if (deckPermit && deckPermit.toLowerCase() !== 'none' && deckPermit.toLowerCase() !== 'n/a') {
    tasks.push({
      ruleId: 'deck_permit_docs',
      title: `Provide deck permit documentation (${deckPermit})`,
      description:
        'SPD references a permitted deck addition. Seller to provide a copy of the permit and any final inspection sign-off for the buyer\'s records.',
      category: 'Documentation',
      severity: 'low',
      audience: 'seller',
      offsetDaysFromClose: -7,
      alsoOnTimeline: false,
    });
  }

  // Rule 4 — Radon test value at or above EPA action level → flag (buyer)
  const radonValue = asNum(fields.radon_test_value_pci_l);
  if (radonValue !== null && radonValue >= 4.0) {
    flags.push({
      title: `Radon tested at ${radonValue} pCi/L — at or above EPA action level`,
      explanation: `Initial radon test reported ${radonValue} pCi/L (EPA action level is 4.0 pCi/L). Mitigation system was installed, but buyer should request the post-mitigation reading and verify ongoing system operation before settlement.`,
      flagType: 'material_defect',
      severity: 'medium',
      audience: 'buyer',
    });
  }

  // Rule 5 — Basement wall cracks disclosed → flag (buyer)
  if (asBool(fields.basement_wall_cracks_disclosed) === true) {
    flags.push({
      title: 'Hairline cracks disclosed in basement walls',
      explanation:
        'Seller disclosed cracks in basement walls (described as cosmetic). Buyer should verify with a qualified inspector during the inspection contingency period.',
      flagType: 'material_defect',
      severity: 'low',
      audience: 'buyer',
    });
  }

  // Rule 6 — No basement waterproofing system → flag (buyer)
  if (asBool(fields.basement_waterproofed) === false) {
    flags.push({
      title: 'Basement has no waterproofing system',
      explanation:
        'SPD reports no interior or exterior basement waterproofing system. Confirm acceptable given full unfinished basement; buyer may want to budget for a future system or sump-pump backup.',
      flagType: 'material_defect',
      severity: 'low',
      audience: 'buyer',
    });
  }

  // ── LBP rules ─────────────────────────────────────────────────────────────

  // Rule 7 — Pre-1978 property + buyer waived inspection → flag (buyer)
  const yearBuilt = asNum(fields.year_built);
  const lbpInspectionElected = asBool(fields.lead_based_paint_inspection_elected);
  if (yearBuilt !== null && yearBuilt < 1978 && lbpInspectionElected === false) {
    flags.push({
      title: 'Pre-1978 property; lead-based paint inspection not elected by buyer',
      explanation:
        'Federal law (42 U.S.C. §4852d) gives buyers of pre-1978 properties a 10-day right to a lead-paint risk assessment. Buyer waived this right per the signed LBP disclosure. Documented residual exposure — flag retained for the agent\'s record.',
      flagType: 'unusual_condition',
      severity: 'medium',
      audience: 'buyer',
    });
  }

  return { tasks, flags };
}

export async function applyDisclosureRules(
  supabase: TypedClient,
  contractId: string,
  sourceDocumentId: string
): Promise<{ tasksAdded: number; timelineAdded: number; flagsAdded: number }> {
  // 1. Pull every extraction across every document linked to this contract.
  const { data: docs } = await supabase
    .from('documents')
    .select('id')
    .eq('contract_id', contractId);
  const docIds = ((docs ?? []) as Array<{ id: string }>).map((d) => d.id);
  if (docIds.length === 0) {
    return { tasksAdded: 0, timelineAdded: 0, flagsAdded: 0 };
  }

  const { data: extractionRows } = await supabase
    .from('extractions')
    .select('field_name, field_value')
    .in('document_id', docIds);

  const fields: Record<string, string | null> = {};
  for (const row of (extractionRows ?? []) as Array<{ field_name: string; field_value: string | null }>) {
    // Last-wins; later docs (e.g., SPD) override AOS for shared fields like year_built.
    fields[row.field_name] = row.field_value;
  }

  // 2. Pull contract closing_date as the anchor for relative due dates.
  const { data: contractRow } = await supabase
    .from('contracts')
    .select('closing_date')
    .eq('id', contractId)
    .maybeSingle();
  const closeDateStr = (contractRow as { closing_date: string | null } | null)?.closing_date ?? null;

  // 3. Evaluate the rule set.
  const { tasks: derivedTasks, flags: derivedFlags } = evaluateRules(fields);

  // 4. Insert tasks (idempotent via dedupe_key).
  let tasksAdded = 0;
  let timelineAdded = 0;

  for (const t of derivedTasks) {
    const dedupeKey = `disclosure_rule:${contractId}:${t.ruleId}`;

    const { data: existingTask } = await supabase
      .from('tasks')
      .select('id')
      .eq('dedupe_key', dedupeKey)
      .maybeSingle();
    if (existingTask) continue;

    const dueAt = closeDateStr
      ? (() => {
          const d = new Date(closeDateStr);
          d.setDate(d.getDate() + t.offsetDaysFromClose);
          return d.toISOString();
        })()
      : null;

    const taskRow: TaskInsert = {
      contract_id: contractId,
      title: t.title,
      description: t.description,
      category: t.category,
      severity: t.severity,
      audience: t.audience,
      status: 'todo',
      offset_days: t.offsetDaysFromClose,
      due_at: dueAt,
      dedupe_key: dedupeKey,
    };

    const { error: taskErr } = await supabase.from('tasks').insert(taskRow as never);
    if (taskErr) {
      console.error('Disclosure rule task insert failed:', taskErr.message, t.ruleId);
      continue;
    }
    tasksAdded++;

    if (t.alsoOnTimeline) {
      const { data: existingTl } = await supabase
        .from('timeline_items')
        .select('id')
        .eq('contract_id', contractId)
        .eq('label', t.title)
        .maybeSingle();
      if (!existingTl) {
        // Append to the end of the timeline.
        const { data: maxRow } = await supabase
          .from('timeline_items')
          .select('sort_order')
          .eq('contract_id', contractId)
          .order('sort_order', { ascending: false })
          .limit(1)
          .maybeSingle();
        const nextSort =
          ((maxRow as { sort_order: number } | null)?.sort_order ?? 0) + 1;

        const tlRow: TimelineInsert = {
          contract_id: contractId,
          label: t.title,
          description: t.description,
          milestone_type: null,
          audience: t.audience,
          due_at: dueAt,
          sort_order: nextSort,
        };
        const { error: tlErr } = await supabase
          .from('timeline_items')
          .insert(tlRow as never);
        if (tlErr) {
          console.error('Disclosure rule timeline insert failed:', tlErr.message, t.ruleId);
        } else {
          timelineAdded++;
        }
      }
    }
  }

  // 5. Insert risk flags (dedupe by contract_id + title).
  let flagsAdded = 0;

  for (const f of derivedFlags) {
    const { data: existingFlag } = await supabase
      .from('risk_flags')
      .select('id')
      .eq('contract_id', contractId)
      .eq('title', f.title)
      .maybeSingle();
    if (existingFlag) continue;

    const flagRow: RiskFlagInsert = {
      document_id: sourceDocumentId,
      contract_id: contractId,
      flag_type: f.flagType,
      severity: f.severity,
      title: f.title,
      explanation: f.explanation,
      audience: f.audience,
    };
    const { error: flagErr } = await supabase
      .from('risk_flags')
      .insert(flagRow as never);
    if (flagErr) {
      console.error('Disclosure rule flag insert failed:', flagErr.message, f.title);
      continue;
    }
    flagsAdded++;
  }

  return { tasksAdded, timelineAdded, flagsAdded };
}
