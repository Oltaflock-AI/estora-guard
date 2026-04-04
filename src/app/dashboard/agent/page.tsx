import { Bot, Shield, FileText, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { MANIFEST } from '@/lib/agent/manifest';
import Link from 'next/link';

const SKILL_LABELS: Record<string, string> = {
  read_deal_summary: 'Read Deal Summary',
  read_risk_flags: 'Read Risk Flags',
  read_timeline: 'Read Timeline',
  read_task_list: 'Read Task List',
  draft_next_actions: 'Draft Next Actions',
  request_pii_reveal: 'Request PII Reveal',
};

const SENSITIVITY_BADGE: Record<string, string> = {
  low: 'badge-success',
  medium: 'badge-warning',
  critical: 'badge-error',
};

export default function AgentOverviewPage() {
  const skills = Object.entries(MANIFEST.skills);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center">
          <Bot className="w-5 h-5 text-gold" />
        </div>
        <div>
          <h1 className="font-display text-2xl text-navy">Estora Guard</h1>
          <p className="text-sm text-secondary">
            AI agent with policy-governed security layer
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 mb-8">
        <Link href="/dashboard/redteam" className="card p-6 hover:shadow-md transition-shadow group">
          <div className="flex items-center gap-3 mb-3">
            <Shield className="w-5 h-5 text-error" />
            <h3 className="font-display text-lg text-navy group-hover:text-gold transition-colors">
              Red Team Console
            </h3>
          </div>
          <p className="text-sm text-secondary">
            Run 8 adversarial attacks against the policy engine and verify security.
          </p>
        </Link>

        <div className="card p-6">
          <div className="flex items-center gap-3 mb-3">
            <FileText className="w-5 h-5 text-info" />
            <h3 className="font-display text-lg text-navy">Security Model</h3>
          </div>
          <div className="space-y-2 text-sm text-secondary">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-success" />
              Policy-governed skill execution
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-success" />
              Role-based access control
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-success" />
              Human approval gates
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-success" />
              Append-only receipt logging
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-success" />
              Hard deny rules for injection
            </div>
          </div>
        </div>
      </div>

      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5 text-gold" />
          <h3 className="font-display text-lg text-navy">Skill Manifest</h3>
        </div>
        <p className="text-sm text-secondary mb-4">
          Every skill the agent can invoke is defined here. This is the single source of truth
          for what the agent can and cannot do.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 field-label">Skill</th>
                <th className="text-left py-3 px-4 field-label">Category</th>
                <th className="text-left py-3 px-4 field-label">Sensitivity</th>
                <th className="text-left py-3 px-4 field-label">Approval</th>
                <th className="text-left py-3 px-4 field-label">Allowed Roles</th>
              </tr>
            </thead>
            <tbody>
              {skills.map(([name, config]) => (
                <tr key={name} className="border-b border-border/50 hover:bg-surface-sunken/50">
                  <td className="py-3 px-4 mono-value text-xs">{SKILL_LABELS[name] ?? name}</td>
                  <td className="py-3 px-4 text-xs text-secondary">{config.category}</td>
                  <td className="py-3 px-4">
                    <span className={SENSITIVITY_BADGE[config.sensitivity]}>
                      {config.sensitivity}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {config.approvalRequired ? (
                      <AlertTriangle className="w-4 h-4 text-warning" />
                    ) : (
                      <XCircle className="w-4 h-4 text-disabled" />
                    )}
                  </td>
                  <td className="py-3 px-4 text-xs text-secondary">
                    {config.allowedRoles.length === 4
                      ? 'All roles'
                      : config.allowedRoles.join(', ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
