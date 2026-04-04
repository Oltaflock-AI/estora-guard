---
name: estora-read-deal-summary
description: Read the deal summary for a real estate transaction from the Estora Guard platform. Returns property details, parties, purchase price, closing date, health score, and top risk flags.
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
    emoji: 🏠
    homepage: https://estora-guard.vercel.app
---

Use this skill when the user asks about a deal overview, property details, parties involved, purchase price, closing date, health score, or wants a general summary of a transaction.

## Trigger conditions

- User asks "What is this deal?" or "Give me a summary"
- User asks about property address, buyer, seller, price, or closing date
- User asks about the health score or overall deal status

## How to call

```bash
curl -s "${ESTORA_APP_URL}/api/agent/skills/read-deal-summary?contractId=${CONTRACT_ID}" \
  -H "Authorization: Bearer ${ESTORA_AUTH_TOKEN}" \
  -H "Content-Type: application/json"
```

## Response format

The API returns a JSON object with a `formatted` field containing a markdown-formatted deal summary including:

- Property address and type
- Buyer and seller names with attorneys
- Purchase price and earnest money
- Contract and closing dates
- Health score (0-100) with status indicator
- Top 3 risk flags if any exist

## Error handling

If the API returns an error or the contract ID is invalid, report the error clearly. Never fabricate deal data.
