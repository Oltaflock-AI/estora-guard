# Checklist Ingestion — Heather Hart (Coldwell Banker / The Debernardis Group)

**Source:** Email thread between Amaan Barmare and Heather Hart, March 31 – April 14, 2026  
**Attachment:** `Checklists.xlsx` (two tabs: Listing Template, Buyer template)  
**Ingested:** 2026-04-21  

---

## Context from the Email Thread

Heather Hart is a real estate agent at **Coldwell Banker Realty, The Debernardis Group**, working primarily in **residential Pennsylvania transactions**. Amaan had a discovery call with her in late March to understand real-world workflows. She followed up with her checklist file and several important caveats:

1. **She works primarily with sellers.** The buyer-side checklist she provided is less complete — Cooper (another agent on the team) would be better positioned to provide the buyer workflow.
2. **These checklists are team-specific.** They reflect the way The Debernardis Group processes documents within Coldwell Banker Realty. Another team or an agent in a different state will work very differently.
3. **The transaction timeline is not fixed — it flows from the ASR.** Every deadline (inspection period, mortgage commitment, appraisal, settlement date) is set by the specific Agreement of Sale for that deal. Heather navigates her checklist *in the context of* the ASR dates.
4. **The PAR ASR form is the contractual backbone.** It defines the legal deadlines and timelines. Estora should reference and extract from that form.
5. **Existing CRM software to study:** Heather mentioned BrokerMint and Skyslope as tools agents use for timeline/checklist management (though her team does not use them).

---

## What Estora Guard Currently Has

The transaction detail page (`/dashboard/transactions/[id]`) renders a shared view regardless of whether the logged-in user is a buyer's agent or a seller's agent. Specifically:

- **Timeline items** (`timeline_items` table): No `party_role` or `assigned_to` field. All milestones are shared.
- **Tasks** (`tasks` table): Has an `assignee_id` (FK to `people`) and a `category` field, but no `agent_role` field (buyer agent vs. seller agent). All tasks are shown in one unified list.
- **Perspective toggle** (exists in `TransactionDetail.tsx`): A buyer/seller toggle exists in the UI and is saved to `localStorage`, but it is **cosmetic only** — it does not filter or modify the timeline or task list.
- **`PartyRole` enum** (in `database.types.ts`): `seller | purchaser | attorney | escrow_agent` — exists for the `people` table but is not connected to tasks or timeline items.

**Bottom line:** Both buyer agents and seller agents see the exact same tasks and timeline today.

---

## Seller Agent Checklist (Listing Template)

This is Heather's primary workflow. Organized by phase below.

### Phase 0 — Property & Deal Header Info
Captured at listing intake:
- Property Address, MLS#
- Seller 1 & 2 (name, phone, email)
- Mailing address (if different)
- Team agents, agent split, broker fee, commission, referral
- List Price (+ price reduction tracking)
- Contract date, Coming Soon date, List Date / Expiry
- Sign type, lockbox, garage code, vacant home flag
- HOA: contact, phone, fees, certification fee, initiation fee

### Phase 1 — Pre-Listing File Checklist
Documents to collect before going live:
- Tax record
- Client contact sheet
- Consumer Notice
- Listing contract
- Seller cost sheet
- Affiliated Business Disclosure
- Wire Fraud disclosure
- Bright Disclosure
- Seller's Property Disclosure (SPDS)
- Lead Paint Disclosure (LBPS)
- Utility sheet
- ShowingTime instructions
- Copy of HOA/Condo docs
- Current deed
- Business agreement / death certificate (if applicable)
- Referral paperwork (if applicable)
- Relo paperwork (if applicable)
- Enter into MyDeals + attach paperwork

### Phase 2 — Marketing Checklist (Pre-Listing)
- Add seller info to Outlook
- Introductory phone call to seller
- Order staging / confirm staging appointment (date + time)
- Enter into Listing Concierge
- Confirm photo appointment with photographer (date + time)
- Photo shoot / room measurements
- Enter into MLS
- Enter into ShowingTime
- Email listing to seller for review
- Upload photos/measurements to MLS
- Add MLS #, price & description to Listing Concierge
- Text courier to place sign(s)
- Text courier to place lockbox
- Finalize Just Listed postcard & YouTube ad
- Manage ShowingTime feedback
- Send weekly Listing Activity Reports
- Send 21-day Property Marketing Update

### Phase 3 — Price Reduction Checklist
- Send price reduction to sellers for signature
- Seller approval copies in files
- Change price in MLS
- Notify all showing agents
- Email top agents

### Phase 4 — Under Contract (Listing Sold Section)

**Deal summary fields:**
- Team agents, List Agent Commission
- Buyer name, Co-Broke agent, Agency, Office, Buyer Agent Commission
- Sale date, Sale price, Deposit amount, Seller help
- Settlement: Date, Time, Place, Title Co, Contact

**Financial / Mortgage tracking:**
- Commitment due date / received date
- Lender name & contact
- Appraisal due date

**Inspections (with dates):**
- Home, Wood (pest), Radon, Water, Sewer

### Phase 5 — Under Contract File Checklist
Documents to collect after ratification:
- Agreement of Sale
- Appraisal Contingency
- SPDS, LBPS
- Seller cost sheet
- Mortgage pre-approval
- Co-Broke Addendum
- DMN (Deposit Money Notice)
- EMD (Earnest Money Deposit)
- Reply to Inspection / CTA (Counter to Addendum)
- Mortgage commitment letter
- Pre-settlement walkthrough record
- Final ALTA / Settlement statement
- My Deals List sheet + Sale sheet
- Teams checklist PDF
- Resale cert ROD
- Commission form

### Phase 6 — Next Steps (Seller Side, Under Contract)
- Order resale cert
- Resale cert received → send to Buyer Agent + Title
- Final inspection report sent to seller
- Contact courier to place pending sign (after inspections)
- Order work from reply/appraisal
- Home warranty ordered
- New deed requested
- Payoff authorization provided to title
- Settlement fee info sent to Title Co
- Confirm escrow check for settlement is ordered (if applicable)
- Confirm seller will attend settlement (or sign ahead)
- Confirm seller wants proceeds check or funds wired
- Settlement scheduled
- Settlement added to agent's calendar
- Send settlement notice to seller
- Seller scheduled to sign docs (date + time)
- Walk-through scheduled (date + time)
- Confirm garage code
- Remind seller to transfer utilities & leave keys, remove all items
- Get seller's forwarding address
- Pick up escrow check from Admin (agent takes to settlement)
- Get preliminary ALTA from title

### Phase 7 — Process File Immediately (At Ratification)
- Enter sale in My Deals
- Files uploaded to transaction manager
- Ratified contract docs sent to seller
- Mark pending in MLS / ShowingTime
- Added to Teams Sales Board spreadsheet
- Added to whiteboard in office
- Reach out to Buyer Agent
- Reach out to Title Agent

### Phase 8 — After Settlement (Seller Side)
- Mark sold on MLS
- Update Listing Concierge / Send Just Sold Postcards
- Add contact to Prospect SQ "Primary Sphere"
- Ask courier to pick up sign / lockbox
- Send executed documents to sellers
- Add contact to 'Sphere'
- Update "Settled Transactions" file
- Upload all files
- Add to Homebot
- Prepare end of year ALTA mailing
- Add co-list to Zillow

### Showing & Property Notes (Reference Fields)
- Vacant or Occupied
- ShowingTime: Show & Go / Appointment Only
- Type of lockbox
- Fees for ALTA
- Items to convey
- Notes

---

## Buyer Agent Checklist (Buyer Template)

Heather's secondary workflow — acknowledged to be less complete since she primarily represents sellers.

### Phase 0 — Deal Header Info
- Property address
- Sale price, Seller Assist, Deposit
- Sale date, Commission, Broker Fee, MLS #
- Buyer 1 & 2 (name, phone, email)
- Buyer's current address
- Listing Agent (name, cell, office, fax, email), Agency

### Phase 1 — Settlement & Title
- Title (type)
- Attorney / Title Company, Contact (phone, fax)
- Settlement info: Date, Time, Place

### Phase 2 — Financing
- Commitment due date / received
- Type of financing
- Lender name, contact (phone, fax, email)

### Phase 3 — HOA (if applicable)
- Contact info

### Phase 4 — Inspections (with Due and Received dates)
- Home
- Pest (Wood)
- Radon
- Water
- Sewer

### Phase 5 — File Checklist (Buyer Side)
Documents to collect:
- Consumer Notice
- Buyer Agency agreement
- Wire Fraud Disclosure
- Affiliated Business Disclosure
- Bright form
- Ratified Agreement of Sale
- Addendum(s)
- Buyer's Cost Sheet
- DMN (Deposit Money Notice)
- SPDS (Seller's Property Disclosure)
- LBPS (Lead-Based Paint)
- Preapproval / POF (Proof of Funds)
- EMD (Earnest Money Deposit)
- Co-broke agreement
- Mortgage commitment
- RTI (Right to Inspect response)

### Phase 6 — Process File (At Ratification)
- Submit to MyDeals
- Send copies to buyer
- Send contract to Title
- Send contract & Title contact to Lender
- Order inspections
- Request resale package
- Request Cov & Res (Covenants & Restrictions)
- Request utility info
- Send Mortgage Commitment to Seller's Agent
- Send settlement fees to title
- Schedule settlement
- Schedule pre-settlement walk-through
- Remind buyer to change utilities

### Phase 7 — After Settlement (Buyer Side)
- Add contact to Sphere
- Save final settlement statement
- Save final walkthrough record
- Prepare end of year ALTA mailing
- Update settled transactions file
- Add contact to Prospect SQ "Primary Sphere"
- Add to Homebot

---

## Gap Analysis: Current Estora Guard vs. Real-World Workflow

| Dimension | Current State | What's Needed |
|---|---|---|
| Role differentiation | None — one unified task list | Tasks tagged with `assigned_agent_role: 'buyer_agent' \| 'seller_agent'` |
| Timeline ownership | Shared milestones | Some milestones are universal (closing date); others are role-specific (pending sign, just listed) |
| Task phases | No phase concept | Tasks organized by phase/stage of transaction |
| Perspective toggle | UI-only, cosmetic | Should actually filter tasks + timeline by role |
| DB schema | `tasks` has no agent role field | Add `agent_role` column to `tasks` table |
| Pre-listing tasks | Not modeled | Seller workflow starts before ASR — listing intake, marketing, MLS entry |
| Marketing tasks | Not modeled | Seller-specific: showings, postcards, MLS updates, staging |
| File checklist | Partially modeled via task categories | Rich document checklist tied to transaction phase |
| Inspection tracking | Partially in timeline | Should track per-inspection type with due + received dates |
| Mortgage commitment | Partially in mortgage table | Needs commitment due date + received date as tracked milestones |
| After-settlement tasks | Not modeled | Seller: MLS update, postcards, lockbox pickup. Buyer: sphere, Homebot, ALTA |

---

## Key Insights for Product

1. **The ASR drives everything.** Deadlines are not templates — they are extracted from each specific contract. Estora already extracts dates from PDFs; the task is connecting those extracted dates to the right tasks in the checklist.

2. **Two distinct workflows, not one.** The seller's agent workflow is significantly longer and starts before a buyer even exists (listing intake, marketing). The buyer's agent workflow kicks in at offer/ratification. These should be modeled as separate task templates, not a filtered view of one combined list.

3. **Phase-based structure maps well to the timeline.** Heather's checklist naturally maps to transaction phases: Pre-Listing → Listed → Under Contract → Pre-Settlement → Settlement → Post-Settlement. The existing `timeline_items` table could anchor each phase, with tasks attached to phases.

4. **Document collection is a major workflow component.** A large portion of both checklists is "collect this document, file it here." Estora's existing `documents` and `extractions` tables could power a document checklist feature.

5. **Competitive landscape to study:** BrokerMint and Skyslope handle timeline/checklist management. Worth reviewing their UX for buyer/seller differentiation patterns before designing Estora's implementation.

6. **Pennsylvania / PAR ASR specifics.** Several checklist items reference PA-specific forms (PAR ASR, SPDS, LBPS, Bright Disclosure). The system should be state-aware eventually — or at minimum, not hard-code PA-specific assumptions into the core data model.

---

## Recommended Next Steps (Future Work)

1. **Schema change:** Add `agent_role TEXT CHECK (agent_role IN ('buyer_agent', 'seller_agent', 'both'))` to the `tasks` table.
2. **Task templates:** Create seeded task template sets — one for seller agent (phases 0–8 above), one for buyer agent (phases 0–7 above) — that get instantiated when a transaction is created.
3. **Wire the perspective toggle:** Make the existing buyer/seller toggle in `TransactionDetail.tsx` actually filter tasks by `agent_role`.
4. **Milestone anchoring:** Map extracted contract dates (inspection deadline, commitment date, settlement date) to auto-populate task due dates in the checklist.
5. **Cooper interview:** Follow up with Cooper (buyer-side specialist on Heather's team) for a more complete buyer agent workflow.
6. **Study BrokerMint / Skyslope:** Competitive UX research before finalizing the task/timeline model.
