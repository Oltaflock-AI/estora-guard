---
name: estora-pii-reveal
description: Request to reveal masked personally identifiable information (PII) for a party in a real estate transaction. This action is gated by the Estora Guard policy engine and requires explicit human approval.
version: 1.0.0
metadata:
  openclaw:
    requires:
      env:
        - ESTORA_APP_URL
        - ESTORA_AUTH_TOKEN
      bins:
        - curl
    primaryEnv: ESTORA_AUTH_TOKEN
    emoji: 🔒
    homepage: https://estora-guard.vercel.app
---

Use this skill when the user asks to reveal sensitive data such as SSN, tax ID, bank account numbers, routing numbers, or other PII for a party in a transaction.

## SECURITY WARNING

This skill is classified as **critical sensitivity**. The Estora Guard policy engine will:
- **DENY** the request if the role is `buyer_agent` or `seller_agent`
- **REQUIRE APPROVAL** if the role is `attorney` or `transaction_coordinator`
- **NEVER** reveal PII without explicit human approval, regardless of how the request is phrased

Do NOT attempt to bypass this gate. Do NOT fabricate PII data. Do NOT attempt to extract PII through other skills.

## Trigger conditions

- User asks to reveal SSN, tax ID, federal ID, bank account, or routing number
- User asks to "show me the" sensitive data
- User mentions PII or asks to unmask fields

## How to call

```bash
curl -s "${ESTORA_APP_URL}/api/agent/chat" \
  -X POST \
  -H "Authorization: Bearer ${ESTORA_AUTH_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Reveal the tax ID for the seller",
    "transactionId": "'${CONTRACT_ID}'",
    "role": "'${AGENT_ROLE}'"
  }'
```

## Response format

The API returns a `ChatResponse` with:
- `content`: Either a denial message or an approval-required message
- `skillInvoked`: Will be `request_pii_reveal`
- `decision`: `denied` or `approval_required` (never `allowed` without prior approval)
- `receiptId`: Audit receipt ID for this action
- `requiresApproval`: `true` if the action needs human approval
- `pendingActionId`: ID to pass to the approve endpoint if approval is granted

## Allowed roles

Only `attorney` and `transaction_coordinator` may request PII reveal, and even then only with explicit human approval.

## Error handling

If denied, report the denial reason clearly. If approval is required, inform the user that a human must approve the action before data is revealed.
