'use client';

import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import type { PolicyDecision, SkillName } from '@/lib/agent/types';

const DECISION_CONFIG: Record<
  PolicyDecision,
  { icon: typeof CheckCircle; bgClass: string; textClass: string; label: string }
> = {
  allowed: {
    icon: CheckCircle,
    bgClass: 'bg-green-50 border-green-200',
    textClass: 'text-success',
    label: 'Allowed',
  },
  denied: {
    icon: XCircle,
    bgClass: 'bg-red-50 border-red-200',
    textClass: 'text-error',
    label: 'Denied',
  },
  approval_required: {
    icon: AlertTriangle,
    bgClass: 'bg-amber-50 border-amber-200',
    textClass: 'text-warning',
    label: 'Approval Required',
  },
};

const SKILL_LABELS: Record<SkillName, string> = {
  read_deal_summary: 'Read Deal Summary',
  read_risk_flags: 'Read Risk Flags',
  read_timeline: 'Read Timeline',
  read_task_list: 'Read Task List',
  draft_next_actions: 'Draft Next Actions',
  request_pii_reveal: 'Request PII Reveal',
};

interface PolicyDecisionBannerProps {
  decision: PolicyDecision;
  skillInvoked: SkillName;
  reason: string;
}

export default function PolicyDecisionBanner({
  decision,
  skillInvoked,
  reason,
}: PolicyDecisionBannerProps) {
  const config = DECISION_CONFIG[decision];
  const Icon = config.icon;

  return (
    <div className={`flex items-start gap-3 px-4 py-3 rounded-lg border ${config.bgClass}`}>
      <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${config.textClass}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-sm font-semibold ${config.textClass}`}>
            {config.label}
          </span>
          <span className="text-xs text-secondary">
            Skill: <span className="mono-value">{SKILL_LABELS[skillInvoked]}</span>
          </span>
        </div>
        <p className="text-xs text-secondary mt-1">{reason}</p>
      </div>
    </div>
  );
}
