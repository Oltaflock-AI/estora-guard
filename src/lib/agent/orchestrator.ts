import type { SkillName } from './types';

export interface ClassifiedIntent {
  skillName: SkillName;
  originalMessage: string;
  normalizedMessage: string;
}

const SKILL_KEYWORDS: { skill: SkillName; patterns: RegExp[] }[] = [
  {
    skill: 'request_pii_reveal',
    patterns: [
      /\bssn\b/i,
      /\btax\s*id\b/i,
      /\bfederal\s*id\b/i,
      /\bbank\s*account\b/i,
      /\bbank\s*details?\b/i,
      /\brouting\s*number\b/i,
      /\baccount\s*number\b/i,
      /\breveal\b/i,
      /\bshow\s+me\s+the\b/i,
      /\bpii\b/i,
    ],
  },
  {
    skill: 'read_risk_flags',
    patterns: [
      /\brisk/i,
      /\bflag/i,
      /\bdanger/i,
      /\bissue/i,
      /\bproblem/i,
      /\bwarning/i,
      /\bconcern/i,
    ],
  },
  {
    skill: 'read_timeline',
    patterns: [
      /\bdeadline/i,
      /\btimeline/i,
      /\bclosing\s*date/i,
      /\bdue\b/i,
      /\bwhen\b/i,
      /\bmilestone/i,
      /\bschedule/i,
    ],
  },
  {
    skill: 'read_task_list',
    patterns: [
      /\btask/i,
      /\bchecklist/i,
      /\btodo/i,
      /\bto.do/i,
      /\bcomplete/i,
      /\bincomplete/i,
      /\bpending\s*items/i,
    ],
  },
  {
    skill: 'draft_next_actions',
    patterns: [
      /\bnext\b/i,
      /\bshould\s*i\b/i,
      /\brecommend/i,
      /\bwhat\s*(should|do|can)\b/i,
      /\bhelp\s*me\b/i,
      /\baction/i,
      /\bprioritize/i,
      /\bfocus/i,
      /\battention/i,
    ],
  },
  {
    skill: 'read_deal_summary',
    patterns: [
      /\bsummary/i,
      /\boverview/i,
      /\bdeal\b/i,
      /\babout\s*this/i,
      /\bwhat\s*is\s*this/i,
      /\bdetails/i,
      /\bparties/i,
      /\bprice/i,
    ],
  },
];

export function classifyIntent(message: string): ClassifiedIntent {
  const normalizedMessage = message.trim().toLowerCase();

  for (const { skill, patterns } of SKILL_KEYWORDS) {
    if (patterns.some((p) => p.test(normalizedMessage))) {
      return { skillName: skill, originalMessage: message, normalizedMessage };
    }
  }

  return {
    skillName: 'read_deal_summary',
    originalMessage: message,
    normalizedMessage,
  };
}
