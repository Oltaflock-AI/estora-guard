---
name: estora-read-deal-summary
description: Read the deal summary for a real estate transaction from the Estora Guard platform. Returns property details, parties, price, closing date, health score, and top risk flags.
---

To read a deal summary for a transaction, call:

GET {ESTORA_APP_URL}/api/agent/skills/read-deal-summary?contractId={contractId}

Headers:
  Content-Type: application/json

Return the response as a structured deal summary including:
- Property address
- Buyer and seller names
- Purchase price
- Closing date
- Health score and status
- Top 3 risk flags

If the API returns an error, report it clearly and do not fabricate data.
