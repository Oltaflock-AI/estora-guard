---
name: estora-read-task-list
description: Read the current task list for a real estate transaction. Returns all tasks grouped by status — overdue, due soon, in progress, todo, and done.
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
    emoji: ✅
    homepage: https://estora-guard.vercel.app
---

Use this skill when the user asks about tasks, checklists, to-do items, what is complete, what is incomplete, or pending items on a transaction.

## Trigger conditions

- User asks "What tasks are pending?" or "Show me the checklist"
- User asks about incomplete items, to-dos, or what needs to be done
- User asks about task status or completion progress

## How to call

```bash
curl -s "${ESTORA_APP_URL}/api/agent/chat" \
  -X POST \
  -H "Authorization: Bearer ${ESTORA_AUTH_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Show me the task list",
    "transactionId": "'${CONTRACT_ID}'",
    "role": "'${AGENT_ROLE}'"
  }'
```

## Response format

The API returns a `ChatResponse` with:
- `content`: Markdown-formatted task list grouped by status (overdue, due soon, in progress, todo, done)
- `skillInvoked`: Will be `read_task_list`
- `decision`: Policy decision (allowed/denied/approval_required)
- `receiptId`: Audit receipt ID for this action

## Error handling

If the API returns an error or the policy denies the request, report the decision and reason. Never fabricate task data.
