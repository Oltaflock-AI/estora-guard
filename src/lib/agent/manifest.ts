import type { AgentRole, SkillManifest } from './types';

export const ROLES: readonly AgentRole[] = [
  'buyer_agent',
  'seller_agent',
  'attorney',
  'transaction_coordinator',
] as const;

const ALL_ROLES: readonly AgentRole[] = ROLES;

export const MANIFEST: { roles: readonly AgentRole[]; skills: SkillManifest } = {
  roles: ROLES,

  skills: {
    read_deal_summary: {
      category: 'read',
      sensitivity: 'low',
      approvalRequired: false,
      allowedRoles: ALL_ROLES,
    },
    read_risk_flags: {
      category: 'read',
      sensitivity: 'medium',
      approvalRequired: false,
      allowedRoles: ALL_ROLES,
    },
    read_timeline: {
      category: 'read',
      sensitivity: 'low',
      approvalRequired: false,
      allowedRoles: ALL_ROLES,
    },
    read_task_list: {
      category: 'read',
      sensitivity: 'low',
      approvalRequired: false,
      allowedRoles: ALL_ROLES,
    },
    draft_next_actions: {
      category: 'generate',
      sensitivity: 'medium',
      approvalRequired: false,
      allowedRoles: ALL_ROLES,
    },
    request_pii_reveal: {
      category: 'sensitive_read',
      sensitivity: 'critical',
      approvalRequired: true,
      allowedRoles: ['attorney', 'transaction_coordinator'],
    },
  },
} as const;
