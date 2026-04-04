---
name: estora-read-timeline
description: Read the deal timeline showing all milestones, due dates, completion status, and upcoming deadlines for a real estate transaction.
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
    emoji: 📅
    homepage: https://estora-guard.vercel.app
---

Use this skill when the user asks about deadlines, timelines, milestones, closing dates, schedules, or when things are due.

## Trigger conditions

- User asks "When is the closing?" or "What's the timeline?"
- User asks about deadlines, due dates, milestones, or schedule
- User asks what is overdue or coming up next

## How to call

```bash
curl -s "${ESTORA_APP_URL}/api/agent/chat" \
  -X POST \
  -H "Authorization: Bearer ${ESTORA_AUTH_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Show me the timeline and deadlines",
    "transactionId": "'${CONTRACT_ID}'",
    "role": "'${AGENT_ROLE}'"
  }'
```

## Response format

The API returns a `ChatResponse` with:
- `content`: Markdown-formatted timeline with milestones, due dates, completion status, and days remaining/overdue
- `skillInvoked`: Will be `read_timeline`
- `decision`: Policy decision (allowed/denied/approval_required)
- `receiptId`: Audit receipt ID for this action

## Error handling

If the API returns an error or the policy denies the request, report the decision and reason. Never fabricate timeline data.
