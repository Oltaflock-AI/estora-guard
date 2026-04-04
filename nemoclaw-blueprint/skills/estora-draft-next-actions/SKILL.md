---
name: estora-draft-next-actions
description: Generate a prioritized list of recommended next actions for a specific role on a real estate transaction. Uses AI to analyze deal data and produce role-specific guidance.
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
    emoji: 💡
    homepage: https://estora-guard.vercel.app
---

Use this skill when the user asks for recommendations, next steps, what they should focus on, what needs attention, or asks "help me" with a transaction.

## Trigger conditions

- User asks "What should I do next?" or "What needs attention?"
- User asks for recommendations, priorities, or focus areas
- User asks "Help me with this deal" or "What should I focus on?"

## How to call

```bash
curl -s "${ESTORA_APP_URL}/api/agent/chat" \
  -X POST \
  -H "Authorization: Bearer ${ESTORA_AUTH_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What should I focus on next? Recommend actions.",
    "transactionId": "'${CONTRACT_ID}'",
    "role": "'${AGENT_ROLE}'"
  }'
```

## Response format

The API returns a `ChatResponse` with:
- `content`: AI-generated prioritized action list tailored to the user's role
- `skillInvoked`: Will be `draft_next_actions`
- `decision`: Policy decision (allowed/denied/approval_required)
- `receiptId`: Audit receipt ID for this action

## Role-specific output

- **buyer_agent**: Client-facing next steps, contingency status, what to tell the buyer
- **seller_agent**: Seller deliverables, what's needed from the seller's side
- **attorney**: Clause review items, legal risks, what needs legal attention
- **transaction_coordinator**: Deadlines, docs needed, what is overdue, what to chase

## Important notes

This skill calls the Anthropic Claude API internally via Estora Guard. The network policy must allow `api.anthropic.com:443` for this skill to function.

## Error handling

If the API returns an error or the policy denies the request, report the decision and reason. Never fabricate recommendations.
