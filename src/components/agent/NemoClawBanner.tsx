'use client';

import { Shield, Lock, Globe, Cpu } from 'lucide-react';

const POLICY_RULES = [
  {
    icon: Globe,
    label: 'Network',
    detail: 'estora-guard.vercel.app, api.anthropic.com only',
  },
  {
    icon: Lock,
    label: 'Filesystem',
    detail: '/sandbox, /tmp (read-write)',
  },
  {
    icon: Cpu,
    label: 'Process',
    detail: 'Landlock + seccomp isolation',
  },
];

export default function NemoClawBanner() {
  return (
    <div className="mb-4 rounded-lg border border-border bg-surface-sunken/50 p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-full bg-navy/10 flex items-center justify-center">
          <Shield className="w-4 h-4 text-navy" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-navy">
            NemoClaw OpenShell Sandbox
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-success/10 text-success">
            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
            Active
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {POLICY_RULES.map((rule) => (
          <div
            key={rule.label}
            className="flex items-start gap-2 text-xs text-secondary"
          >
            <rule.icon className="w-3.5 h-3.5 mt-0.5 text-navy/60 flex-shrink-0" />
            <div>
              <span className="font-medium text-primary">{rule.label}</span>
              <p className="text-[11px] leading-tight mt-0.5">{rule.detail}</p>
            </div>
          </div>
        ))}
      </div>

      <p className="text-[10px] text-disabled mt-3 font-mono">
        Model: nvidia/nemotron-3-super-120b-a12b &middot; Policy v5 &middot; Deny-by-default egress
      </p>
    </div>
  );
}
