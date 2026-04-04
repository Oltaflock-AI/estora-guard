import { Shield } from 'lucide-react';
import AttackConsole from '@/components/redteam/AttackConsole';

export default function RedTeamPage() {
  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
          <Shield className="w-5 h-5 text-error" />
        </div>
        <div>
          <h1 className="font-display text-2xl text-navy">Red Team Console</h1>
          <p className="text-sm text-secondary">
            Run adversarial attacks against the Estora Guard policy engine
          </p>
        </div>
      </div>

      <AttackConsole />
    </div>
  );
}
