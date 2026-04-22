import { MANIFEST } from './manifest';
import type { AgentRole, PolicyResult, SkillName } from './types';

const PROMPT_INJECTION_PATTERNS = [
  /ignore\s+(your\s+)?(previous|prior)\s+instructions/i,
  /ignore\s+your\s+rules/i,
  /pretend\s+(you\s+are|to\s+be|you're)/i,
  /\bDAN\b/,
  /developer\s+mode/i,
  /jailbreak/i,
  /do\s+anything\s+now/i,
  /bypass\s+(your\s+)?(safety|security|rules|policy)/i,
  /you\s+are\s+now\s+(free|unrestricted)/i,
  /act\s+as\s+(an?\s+)?(unrestricted|unfiltered)/i,
];

const ESCROW_PATTERNS = [
  /(?:update|change|modify|alter|redirect|reroute)\s+(?:the\s+)?(?:escrow|wire|wiring)\s+(?:instructions?|details?|routing|destination|account)/i,
  /(?:wire|send|transfer)\s+(?:the\s+)?funds?\s+to/i,
  /(?:change|update|new)\s+(?:bank\s+)?account\s+(?:number|#)/i,
  /(?:new|different|updated)\s+routing\s+(?:number|#)/i,
];

const CROSS_ORG_PATTERNS = [
  /\ball\s+(?:active\s+)?deals\b/i,
  /\ball\s+(?:active\s+)?transactions\b/i,
  /\ball\s+parties\b/i,
  /\bentire\s+organization\b/i,
  /\bexport\s+everything\b/i,
  /\bevery\s+party'?s?\s+contact/i,
];

const DOC_INSTRUCTION_PATTERNS = [
  /(?:the|this)\s+(?:uploaded\s+)?(?:document|contract|file|pdf)\s+says?\s+to/i,
  /(?:the|this)\s+contract\s+says?\s+to\s+(?:send|email|forward)/i,
  /per\s+the\s+uploaded\s+file/i,
  /(?:as\s+)?(?:instructed|directed)\s+(?:by|in)\s+the\s+(?:document|contract)/i,
];

const HEALTH_OVERRIDE_PATTERNS = [
  /mark\s+(?:it\s+)?(?:as\s+)?healthy/i,
  /clear\s+all\s+(?:risk\s+)?flags/i,
  /set\s+(?:the\s+)?health\s+(?:score\s+)?to/i,
  /override\s+(?:the\s+)?health/i,
];

const PRIVILEGE_ESCALATION_PATTERNS = [
  /\bi\s+am\s+(?:the\s+|an?\s+)?(?:system\s+)?admin(?:istrator)?\b/i,
  /\bi\s+am\s+(?:the\s+)?(?:super[-\s]?user|root|owner)\b/i,
  /\bas\s+(?:the\s+|an?\s+)?(?:system\s+)?admin(?:istrator)?\b/i,
  /\belevate\s+(?:my\s+)?(?:privileges?|permissions?|role)\b/i,
];

const TASK_WRITE_PATTERNS = [
  /\bmark\s+(?:all\s+|the\s+|every\s+)?(?:contingenc(?:y|ies)|tasks?|items?|checklist|todos?|to-dos?)\s+(?:as\s+)?(?:complete|completed|done|finished|resolved)\b/i,
  /\b(?:complete|close|finish|resolve)\s+(?:all\s+|every\s+)?(?:contingenc(?:y|ies)|tasks?|items?|checklist|todos?|to-dos?)\b/i,
  /\bset\s+(?:all\s+)?(?:contingenc(?:y|ies)|tasks?|items?)\s+(?:status\s+)?(?:to\s+)?(?:complete|done|finished)\b/i,
];

interface PolicyInput {
  message: string;
  approvedActionId?: string;
}

export function evaluatePolicy(
  skillName: SkillName,
  role: AgentRole,
  input: PolicyInput
): PolicyResult {
  const { message, approvedActionId } = input;

  // Layer 1: Hard deny rules — checked against raw message
  const injectionMatch = PROMPT_INJECTION_PATTERNS.some((p) => p.test(message));
  if (injectionMatch) {
    return { decision: 'denied', reason: 'Prompt injection pattern detected' };
  }

  const escrowMatch = ESCROW_PATTERNS.some((p) => p.test(message));
  if (escrowMatch) {
    return { decision: 'denied', reason: 'Escrow modification is always denied' };
  }

  const crossOrgMatch = CROSS_ORG_PATTERNS.some((p) => p.test(message));
  if (crossOrgMatch) {
    return { decision: 'denied', reason: 'Cross-transaction queries are not permitted' };
  }

  const docInstructionMatch = DOC_INSTRUCTION_PATTERNS.some((p) => p.test(message));
  if (docInstructionMatch) {
    return { decision: 'denied', reason: 'Document instructions cannot override tool policy' };
  }

  const healthOverrideMatch = HEALTH_OVERRIDE_PATTERNS.some((p) => p.test(message));
  if (healthOverrideMatch) {
    return { decision: 'denied', reason: 'Health score is computed from deal data and cannot be manually set' };
  }

  const taskWriteMatch = TASK_WRITE_PATTERNS.some((p) => p.test(message));
  if (taskWriteMatch) {
    return { decision: 'denied', reason: 'Role not authorized for task writes' };
  }

  const privilegeEscalationMatch = PRIVILEGE_ESCALATION_PATTERNS.some((p) => p.test(message));
  if (privilegeEscalationMatch) {
    return { decision: 'denied', reason: 'Privilege escalation attempt detected' };
  }

  // Layer 2: Role authorization
  const skillConfig = MANIFEST.skills[skillName];
  if (!skillConfig) {
    return { decision: 'denied', reason: `Unknown skill: ${skillName}` };
  }

  const allowedRoles = skillConfig.allowedRoles as readonly string[];
  if (!allowedRoles.includes(role)) {
    return {
      decision: 'denied',
      reason: `Role ${role} not authorized for skill ${skillName}`,
    };
  }

  // Layer 3: Approval required
  if (skillConfig.approvalRequired && !approvedActionId) {
    return {
      decision: 'approval_required',
      reason: 'Critical sensitivity — human approval required',
    };
  }

  // Layer 4: Default — allowed
  return { decision: 'allowed', reason: 'Policy check passed' };
}
