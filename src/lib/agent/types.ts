export type AgentRole =
  | 'buyer_agent'
  | 'seller_agent'
  | 'attorney'
  | 'transaction_coordinator';

export type SkillName =
  | 'read_deal_summary'
  | 'read_risk_flags'
  | 'read_timeline'
  | 'read_task_list'
  | 'draft_next_actions'
  | 'request_pii_reveal';

export type PolicyDecision = 'allowed' | 'denied' | 'approval_required';

export interface PolicyResult {
  decision: PolicyDecision;
  reason: string;
}

export interface SecurityReceipt {
  id: string;
  transactionId: string;
  userId: string;
  role: AgentRole;
  request: string;
  skillRequested: SkillName;
  decision: PolicyDecision;
  reason: string;
  approvedBy: string | null;
  attackCaseId: string | null;
  createdAt: string;
}

export interface ChatRequest {
  message: string;
  transactionId: string;
  role: AgentRole;
  conversationHistory?: ChatMessage[];
  approvedActionId?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  content: string;
  skillInvoked: SkillName;
  decision: PolicyDecision;
  receiptId: string;
  requiresApproval?: boolean;
  pendingActionId?: string;
  reason: string;
}

export interface SkillCategory {
  category: 'read' | 'generate' | 'sensitive_read';
  sensitivity: 'low' | 'medium' | 'critical';
  approvalRequired: boolean;
  allowedRoles: readonly AgentRole[];
}

export type SkillManifest = Record<SkillName, SkillCategory>;
