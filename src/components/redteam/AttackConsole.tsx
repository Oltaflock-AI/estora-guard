'use client';

import { useState } from 'react';
import { Play, CheckCircle, XCircle, AlertTriangle, Loader2, Zap } from 'lucide-react';
import type { AttackCase } from '@/lib/agent/attacks';
import { ATTACKS } from '@/lib/agent/attacks';
import type { PolicyDecision } from '@/lib/agent/types';
import Scoreboard, { type ScoreboardStats } from '@/components/agent/Scoreboard';

const CATEGORY_LABELS: Record<string, string> = {
  prompt_injection: 'Prompt Injection',
  pii_extraction: 'PII Extraction',
  privilege_escalation: 'Privilege Escalation',
  unauthorized_write: 'Unauthorized Write',
  document_instruction: 'Document Instruction',
  data_overreach: 'Data Overreach',
};

const CATEGORY_BADGE: Record<string, string> = {
  prompt_injection: 'badge-error',
  pii_extraction: 'badge-warning',
  privilege_escalation: 'badge-error',
  unauthorized_write: 'badge-error',
  document_instruction: 'badge-warning',
  data_overreach: 'badge-info',
};

interface AttackResult {
  actualDecision: PolicyDecision;
  reason: string;
  passed: boolean;
  receiptId: string;
}

interface AttackConsoleProps {
  transactionId?: string;
}

export default function AttackConsole({ transactionId }: AttackConsoleProps) {
  const [results, setResults] = useState<Record<string, AttackResult>>({});
  const [runningId, setRunningId] = useState<string | null>(null);
  const [runningAll, setRunningAll] = useState(false);

  const stats: ScoreboardStats = {
    attacksRun: Object.keys(results).length,
    totalAttacks: ATTACKS.length,
    blocked: Object.values(results).filter((r) => r.actualDecision === 'denied').length,
    gated: Object.values(results).filter((r) => r.actualDecision === 'approval_required').length,
    unauthorizedReveals: Object.values(results).filter(
      (r) => r.actualDecision === 'allowed' && !r.passed
    ).length,
    allLogged: Object.keys(results).length > 0,
  };

  async function runAttack(attack: AttackCase) {
    setRunningId(attack.id);

    try {
      const res = await fetch('/api/agent/attacks/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attackId: attack.id,
          transactionId: transactionId ?? undefined,
        }),
      });

      const data = await res.json();

      setResults((prev) => ({
        ...prev,
        [attack.id]: {
          actualDecision: data.actualDecision,
          reason: data.reason,
          passed: data.passed,
          receiptId: data.receiptId,
        },
      }));
    } catch {
      setResults((prev) => ({
        ...prev,
        [attack.id]: {
          actualDecision: 'denied',
          reason: 'Network error',
          passed: false,
          receiptId: '',
        },
      }));
    } finally {
      setRunningId(null);
    }
  }

  async function handleRunAll() {
    setRunningAll(true);
    for (const attack of ATTACKS) {
      if (!results[attack.id]) {
        await runAttack(attack);
      }
    }
    setRunningAll(false);
  }

  return (
    <div className="space-y-6">
      <Scoreboard stats={stats} />

      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg text-navy">Attack Cases</h3>
        <button
          onClick={handleRunAll}
          disabled={runningAll || runningId !== null}
          className="btn-primary"
        >
          {runningAll ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Running All...
            </>
          ) : (
            <>
              <Zap className="w-4 h-4" />
              Run All Attacks
            </>
          )}
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {ATTACKS.map((attack, i) => {
          const result = results[attack.id];
          const isRunning = runningId === attack.id;

          return (
            <div
              key={attack.id}
              className="card p-4 card-enter"
              style={{ '--i': i } as React.CSSProperties}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="text-sm font-semibold text-navy">{attack.title}</h4>
                  <span className={CATEGORY_BADGE[attack.category] ?? 'badge-info'}>
                    {CATEGORY_LABELS[attack.category] ?? attack.category}
                  </span>
                </div>
                {result && (
                  <div
                    className={`flex items-center gap-1 text-xs font-medium ${
                      result.passed ? 'text-success' : 'text-error'
                    }`}
                  >
                    {result.passed ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <XCircle className="w-4 h-4" />
                    )}
                    {result.passed ? 'PASS' : 'FAIL'}
                  </div>
                )}
              </div>

              <div className="mb-3">
                <span className="field-label">Role</span>
                <span className="mono-value text-xs ml-2">{attack.role}</span>
              </div>

              <div className="bg-surface-sunken rounded-md p-3 mb-3">
                <span className="field-label">Attack Prompt</span>
                <p className="text-xs text-primary mt-1 font-mono">{attack.prompt}</p>
              </div>

              <div className="flex items-center justify-between mb-3">
                <div className="text-xs text-secondary">
                  Expected:{' '}
                  <span
                    className={
                      attack.expectedDecision === 'denied'
                        ? 'text-error font-medium'
                        : 'text-warning font-medium'
                    }
                  >
                    {attack.expectedDecision}
                  </span>
                </div>
              </div>

              {result && (
                <div
                  className={`rounded-md p-3 text-xs ${
                    result.actualDecision === 'denied'
                      ? 'bg-red-50'
                      : result.actualDecision === 'approval_required'
                        ? 'bg-amber-50'
                        : 'bg-green-50'
                  }`}
                >
                  <div className="flex items-center gap-1 font-medium mb-1">
                    {result.actualDecision === 'denied' ? (
                      <XCircle className="w-3 h-3 text-error" />
                    ) : result.actualDecision === 'approval_required' ? (
                      <AlertTriangle className="w-3 h-3 text-warning" />
                    ) : (
                      <CheckCircle className="w-3 h-3 text-success" />
                    )}
                    Result: {result.actualDecision}
                  </div>
                  <p className="text-secondary">{result.reason}</p>
                  {result.receiptId && (
                    <p className="mono-value text-xs text-disabled mt-1 truncate">
                      Receipt: {result.receiptId}
                    </p>
                  )}
                </div>
              )}

              {!result && (
                <button
                  onClick={() => runAttack(attack)}
                  disabled={isRunning || runningAll}
                  className="btn-secondary w-full text-xs"
                >
                  {isRunning ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Running...
                    </>
                  ) : (
                    <>
                      <Play className="w-3 h-3" />
                      Run Attack
                    </>
                  )}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
