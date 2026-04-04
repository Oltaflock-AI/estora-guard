---
name: estora-read-risk-flags
description: Read all active risk flags for a real estate transaction. Returns flag type, severity, title, explanation, and acknowledgment status.
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
    emoji: ⚠️
    homepage: https://estora-guard.vercel.app
---

Use this skill when the user asks about risks, warnings, issues, problems, concerns, or danger flags on a transaction.

## Trigger conditions

- User asks "What are the risks?" or "Are there any flags?"
- User asks about problems, issues, concerns, or warnings
- User asks about tight deadlines, missing clauses, or unusual conditions

## How to call

```bash
curl -s "${ESTORA_APP_URL}/api/agent/chat" \
  -X POST \
  -H "Authorization: Bearer ${ESTORA_AUTH_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What are the risk flags?",
    "transactionId": "'${CONTRACT_ID}'",
    "role": "'${AGENT_ROLE}'"
  }'
```

## Response format

The API returns a `ChatResponse` with:
- `content`: Markdown-formatted list of risk flags with severity, type, and acknowledgment status
- `skillInvoked`: Will be `read_risk_flags`
- `decision`: Policy decision (allowed/denied/approval_required)
- `receiptId`: Audit receipt ID for this action

## Role-specific framing

- **attorney**: Clause ambiguity and compliance risks highlighted
- **transaction_coordinator**: Deadline and process risks highlighted
- **buyer_agent / seller_agent**: Client impact framing

## Error handling

If the API returns an error or the policy denies the request, report the decision and reason. Never fabricate risk data.
