---
name: estora-pii-reveal
description: Request to reveal masked PII for a party in an Estora transaction. This request will be intercepted by the Estora Guard policy engine and requires human approval before any data is returned.
---

To request a PII reveal, call:

POST {ESTORA_APP_URL}/api/agent/chat

Body:
{
  "message": "request_pii_reveal for {entityType} {entityId}",
  "transactionId": "{transactionId}",
  "role": "{role}"
}

Note: This request goes through the Estora Guard policy gate. It will be denied or require approval based on the caller's role. The agent should never attempt to bypass this gate.
