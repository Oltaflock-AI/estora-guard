'use client';

import { Shield, UserCheck } from 'lucide-react';
import type { AgentRole } from '@/lib/agent/types';

const ROLE_LABELS: Record<AgentRole, string> = {
  buyer_agent: "Buyer's Agent",
  seller_agent: "Seller's Agent",
  attorney: 'Attorney',
  transaction_coordinator: 'Transaction Coordinator',
};

const ROLE_OPTIONS: AgentRole[] = [
  'buyer_agent',
  'seller_agent',
  'attorney',
  'transaction_coordinator',
];

interface RoleSelectorProps {
  selectedRole: AgentRole;
  onRoleChange: (role: AgentRole) => void;
}

export default function RoleSelector({ selectedRole, onRoleChange }: RoleSelectorProps) {
  return (
    <div className="flex items-center gap-3 p-3 bg-surface-sunken rounded-lg border border-border">
      <div className="flex items-center gap-2 text-sm text-secondary">
        <Shield className="w-4 h-4" />
        <span className="font-medium">Role:</span>
      </div>
      <div className="flex gap-1 flex-wrap">
        {ROLE_OPTIONS.map((role) => (
          <button
            key={role}
            onClick={() => onRoleChange(role)}
            className={`
              px-3 py-1.5 rounded-md text-xs font-medium transition-colors duration-150
              ${
                selectedRole === role
                  ? 'bg-navy text-white'
                  : 'bg-surface-raised text-secondary hover:bg-surface-sunken border border-border'
              }
            `}
          >
            <span className="flex items-center gap-1.5">
              {selectedRole === role && <UserCheck className="w-3 h-3" />}
              {ROLE_LABELS[role]}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
