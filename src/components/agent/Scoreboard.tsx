'use client';

import { Shield, ShieldCheck, ShieldAlert, Eye, FileText } from 'lucide-react';

export interface ScoreboardStats {
  attacksRun: number;
  totalAttacks: number;
  blocked: number;
  gated: number;
  unauthorizedReveals: number;
  allLogged: boolean;
}

interface ScoreboardProps {
  stats: ScoreboardStats;
}

export default function Scoreboard({ stats }: ScoreboardProps) {
  const allPassed = stats.blocked + stats.gated === stats.attacksRun && stats.unauthorizedReveals === 0;

  return (
    <div className="card p-6">
      <div className="flex items-center gap-2 mb-4">
        <Shield className="w-5 h-5 text-gold" />
        <h3 className="font-display text-lg text-navy">Security Scoreboard</h3>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="text-center p-3 bg-surface-sunken rounded-lg">
          <div className="text-2xl font-display text-navy">
            {stats.attacksRun} / {stats.totalAttacks}
          </div>
          <div className="text-xs text-secondary mt-1 flex items-center justify-center gap-1">
            <ShieldAlert className="w-3 h-3" />
            Attacks Run
          </div>
        </div>

        <div className="text-center p-3 bg-red-50 rounded-lg">
          <div className="text-2xl font-display text-error">{stats.blocked}</div>
          <div className="text-xs text-error mt-1 flex items-center justify-center gap-1">
            <ShieldCheck className="w-3 h-3" />
            Blocked
          </div>
        </div>

        <div className="text-center p-3 bg-amber-50 rounded-lg">
          <div className="text-2xl font-display text-warning">{stats.gated}</div>
          <div className="text-xs text-warning mt-1 flex items-center justify-center gap-1">
            <ShieldAlert className="w-3 h-3" />
            Gated
          </div>
        </div>

        <div className="text-center p-3 bg-green-50 rounded-lg">
          <div className="text-2xl font-display text-success">{stats.unauthorizedReveals}</div>
          <div className="text-xs text-success mt-1 flex items-center justify-center gap-1">
            <Eye className="w-3 h-3" />
            Unauthorized Reveals
          </div>
        </div>

        <div className="text-center p-3 bg-blue-50 rounded-lg">
          <div className="text-2xl font-display text-info">
            {stats.allLogged ? '100%' : '—'}
          </div>
          <div className="text-xs text-info mt-1 flex items-center justify-center gap-1">
            <FileText className="w-3 h-3" />
            Logged
          </div>
        </div>
      </div>

      {stats.attacksRun > 0 && (
        <div className={`mt-4 px-4 py-2 rounded-lg text-sm font-medium text-center ${allPassed ? 'bg-green-50 text-success' : 'bg-red-50 text-error'}`}>
          {allPassed
            ? `All ${stats.attacksRun} attacks handled correctly — ${stats.blocked} blocked, ${stats.gated} gated`
            : 'Some attacks were not handled as expected'}
        </div>
      )}
    </div>
  );
}
