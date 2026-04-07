# Estora — Landing Page (Content & Conversion Spec)

> **Purpose:** Single source of truth for the **Estora** (full platform) waitlist landing—copy, structure, psychology, and visual direction. Estora Guard is one layer inside this story, not the headline.
> **Stack note:** The live page is `src/app/page.tsx`. Extended waitlist fields require `signup_metadata` on `waitlist_signups` (see `migrations.md` — Migration 005).

---

## Brand

| | |
|---|---|
| **Name** | Estora |
| **Meaning** | Estate + Aura — *a guiding intelligence layer for real estate assets.* |
| **Domain** | estora.ai |
| **Status** | Waitlist — transaction layer built; public access gated. |

---

## Internal positioning (not published verbatim)

Estora is the **transaction operating system** for real estate teams—starting with contract intelligence and reliable deal state. The differentiator is **defense in depth**: policy-governed AI, immutable audit, and hard blocks on the actions that move money. Real estate moves real money; the product narrative must never sound like a generic “AI wrapper.”

---

## Conversion strategy (how this page wins)

1. **One primary goal:** get a qualified waitlist signup. Everything else is support.
2. **Problem → agitation → solution:** The statement block and hero subhead make the pain felt before the product is named.
3. **Progressive disclosure:** Hero asks for minimal friction (email); the **full qualification form** sits at the bottom for visitors who are already convinced.
4. **Authority without hype:** Dark, legal-terminal aesthetic; monospace only in Guard; no cartoon illustrations.
5. **Risk reversal:** “No product demos. No sales calls unless you want one.”
6. **Future pacing:** Vision block + “you’re part of the build” for early access cohorts.
7. **Trust substitutes (pre-launch):** No fake testimonials. Use **concrete mechanisms** (audit trail, policy table, hard-deny list, “eight attacks blocked”) as proof.

### Section order (recommended)

| # | Section | Job |
|---|---------|-----|
| 1 | Nav | Brand + single CTA |
| 2 | Hero | Hook + value + **email capture** |
| 3 | Statement | Emotional + logical case (“infrastructure, not workflow”) |
| 4 | Platform pillars | What Estora does (3 blocks) |
| 5 | Guard deep-dive | Differentiation + table + hard denies |
| 6 | Who it’s for | Self-identification (3 roles) |
| 7 | Vision | Roadmap honesty + waitlist CTA repeat |
| 8 | Full waitlist | Qualification fields |
| 9 | FAQ (optional but high-converting) | Objections pre-handled |
| 10 | Footer | Contact + copyright |

---

## Full copy

### NAV

- **Left:** `ESTORA` (wordmark only—no “Guard” in nav)
- **Right:** `[Join the waitlist →]` (anchor to `#waitlist` or hero form)
- **Waitlist mode:** No other links.
- **Full app mode (WAITLIST_ONLY off):** Secondary text links: Sign in · Get started — still lead with Estora branding.

---

### HERO

**Eyebrow (optional, 12px caps muted):**  
`TRANSACTION INTELLIGENCE`

**Primary headline (two lines):**  
Line 1: `Your contracts are smarter than your tools.`  
Line 2: `Estora changes that.`

**Subheadline:**  
`AI-powered transaction intelligence for real estate teams — from contract upload to close.`

**Primary CTA (button):** `Join the waitlist`

**Hero form (minimal):** Email → submit (Name optional if you want one field of personalization)

**Micro-copy under hero CTA:**  
`We’re opening access to transaction coordinators, attorneys, and brokerage ops teams first.`

**Hero visual (non-screenshot):** Fragment UI—e.g. blurred timeline with sharp `HEALTH: 74 / 100` or a risk flag card `HIGH — Missing contingency removal date` on dark glass surface.

---

### STATEMENT BLOCK

Full-width, centered, max-width ~760px, large body type (22–26px), no section title.

> Real estate transactions are still managed with PDFs, email threads, sticky notes, and memory.  
> A coordinator handling 20 active deals lives inside a spreadsheet that doesn’t talk to her calendar, a CRM that doesn’t know her deadlines, and an inbox where the contract lives as an attachment no one has fully read.  
> One missed contingency date. One overlooked clause. One unacknowledged risk flag.  
> That’s not a workflow problem. That’s an infrastructure problem. And it’s been accepted as normal for decades.  
> **Estora is the infrastructure.**

---

### SECTION — THE PLATFORM

**Label:** `THE PLATFORM`  
**Headline:** `From the moment a contract lands, your deal is understood.`

**Pillar 1 — Contract intelligence**  
- **Headline:** `Upload a purchase agreement. Estora reads it.`  
- **Body:** Every party, date, contingency, obligation—extracted, structured, linked to the source page with confidence and automatic risk flags. No manual rekeying; the deal is structured when the document arrives.  
- **Muted detail:** Document classification, entities, clauses, risks—with page-level provenance.

**Pillar 2 — Transaction control**  
- **Headline:** `Every deal gets a spine.`  
- **Body:** Live milestone timeline, health score, checklist generated from contract logic, deadlines that escalate—without a standup to discover what’s late.  
- **Muted detail:** Rules engine → tasks; deadline engine; escalation events.

**Pillar 3 — Estora Guard**  
- **Headline:** `The security layer real estate was never given.`  
- **Body:** Wire fraud and adversarial prompts are real. Guard is the in-platform security and intelligence layer: role-aware agent, strict policy boundary, human approval on sensitive operations, PII masked by default, append-only audit trail on every action and decision.  
- **Muted detail:** Injection, escrow tampering, cross-org access, privilege abuse—blocked at policy layer; every action receipts request, decision, reason.

---

### SECTION — ESTORA GUARD (DETAIL)

**Label:** `ESTORA GUARD`  
**Headline:** `Six things the agent can do. One that requires your approval. Everything else is hard-blocked.`

**Intro:** The agent is not open-ended—it runs a **manifest**: defined skills, roles, and human-in-the-loop rules.

**Skills table:**

| Skill | Who can use it | Requires approval? |
|-------|----------------|-------------------|
| Read deal summary | Everyone | No |
| Read risk flags | Everyone | No |
| Read timeline | Everyone | No |
| Read task list | Everyone | No |
| Draft next actions | Everyone | No |
| Access sensitive contact details | Attorneys and coordinators only | **Yes — always** |

**Follow-up:** Sensitive data masked by default; reveal requires explicit approval—request, decision, and reason logged. The platform must behave correctly even under misuse attempts.

**Hard deny block**  
*Label:* `ALWAYS BLOCKED · NO APPROVAL PATH` (monospace-friendly)

- Prompt injection patterns (“ignore previous instructions,” “DAN,” etc.)  
- Any modification to escrow or wire transfer instructions  
- Cross-organization data access  
- Manual health score overrides  
- Document instruction overrides  

**Closing:** Stress-tested with eight preset adversarial attacks in an attack console—each blocked.

---

### SECTION — WHO IT’S FOR

**Label:** `BUILT FOR`  
**Headline:** `The people who manage the actual work.`

**Transaction coordinators**  
15–30 active deals; command center; contracts read on arrival; deadlines tracked; tasks from clause logic; pipeline health at a glance.

**Real estate attorneys**  
Contracts pre-read; risks surfaced with clause links; PII gated and logged; audit trail for accountability.

**Brokerage operations**  
Portfolio visibility without chasing updates; health scores; escalations before liability; role-based access.

---

### SECTION — VISION

**Headline:** `This is just the start.`

**Body:** Today’s waitlist opens the **transaction and intelligence layer**—contract reading, deal management, security runtime. Next: client communications tied to deal state, listing and marketing automation, MLS integration, full workflow orchestration—built layer by layer with real teams.

**Closing:** `If you’re on the waitlist, you’re part of that build.`

---

### SECTION — WAITLIST (FULL FORM)

**Headline:** `Get access before we open to everyone.`  
**Subtext:** We’re onboarding transaction teams, attorneys, and brokerage ops leads first. Early access shapes the product and gets priority on every layer we ship.

**Fields:**

| Field | Required |
|-------|----------|
| Full name | Yes |
| Work email | Yes |
| Role (dropdown: Transaction Coordinator; Real Estate Attorney; Brokerage Operations / Admin; Principal / Broker; Real Estate Agent; Other) | Yes |
| Brokerage or company | No |
| Active transactions (1–5 / 6–15 / 16–30 / 30+) | No |
| Biggest operational pain point (short text) | No |

**CTA:** `Request early access`  
**Micro-copy:** `No product demos. No sales calls unless you want one. We’ll reach out directly.`

**Success state:**  
`You’re on the list.`  
`We review every submission personally and will be in touch when early access opens for your role.`  
`If you want to tell us more about how you work, reply to our confirmation email.`

---

### FAQ (recommended additions)

Use 4–6 items; keep answers short.

1. **What is Estora vs Estora Guard?** — Estora is the platform (contracts, deals, timeline, health, audit). Guard is the policy-governed AI layer on top.  
2. **Will the agent change wire or escrow instructions?** — No. Hard-denied and logged.  
3. **Who gets access first?** — Coordinators, attorneys, brokerage ops—roles that run volume.  
4. **Is my email shared?** — No; waitlist only for Estora updates.  
5. **What integrations exist today?** — Focus is core transaction intelligence; roadmap includes MLS and orchestration (see Vision).  

---

### FOOTER

```
ESTORA

Estate + Aura. A guiding intelligence layer for real estate assets.

hello@estora.ai

© [YEAR] Estora. All rights reserved.
```

No social until active. Minimal legal; expand when you incorporate.

---

## Design system (landing)

### Aesthetic

**Precision instrument** — financial terminal × serious law firm. Not playful, not generic SaaS purple/blue gradients. **Dark-only** for this page.

### CSS tokens (reference)

```css
--lp-bg:            #09090D;
--lp-surface:       #0F0F16;
--lp-surface-hi:    #16161F;
--lp-text:          #EAE5DA;
--lp-text-secondary:#7A7690;
--lp-text-muted:    #3D3B50;
--lp-accent:        #B8956A;
--lp-accent-dim:    #7A5F3E;
--lp-guard:         #8B3A3A;
--lp-guard-dim:     #5C2828;
--lp-border:        rgba(255, 255, 255, 0.06);
```

**Rules:** Brass/amber accent everywhere except Guard section accents (muted red). No full dashboard screenshots—**fragments** only.

### Typography

- **Display:** Playfair Display or Cormorant Garamond (repo uses Playfair).  
- **Body:** DM Sans 15–16px, line-height ~1.65.  
- **Mono:** JetBrains Mono — Guard table footnotes, hard-deny list, fake audit line.

### Layout

- Max width **1140px** centered.  
- Hero **min-height ~92vh**, vertical center.  
- Section padding **120px** vertical (scale down on mobile).  
- Pillars: 3-col grid desktop; 1-col mobile; tight gap optional (`2px` hairline separations).

### Motion

- Hero: stagger headline lines + subhead + CTA (CSS animation, respect `prefers-reduced-motion`).  
- Sections: fade + translate on scroll (`IntersectionObserver`, threshold ~0.12).  
- Guard: hard-deny lines stagger ~20ms; optional typewriter audit line once per session.  
- CTA: subtle amber pulse (3s), hover scale ~1.02.  
- **Avoid:** parallax, particles, 3D flips, heavy animation libraries.

---

## SEO / social

```html
<title>Estora — Real Estate Transaction Intelligence</title>
<meta name="description" content="Estora reads your contracts, manages your deals, and protects your transactions. AI-powered intelligence for coordinators, attorneys, and brokerage ops. Join the waitlist." />
<meta property="og:title" content="Estora — Real Estate Transaction Intelligence" />
<meta property="og:description" content="From contract upload to close — with intelligence at every step. Join the waitlist." />
<meta property="og:image" content="/og-image.png" />
<meta name="twitter:card" content="summary_large_image" />
```

---

## A/B ideas (keep variants short)

**Headlines:** (1) primary hero copy (2) `Every real estate transaction deserves an operating system.` (3) `From contract to close — intelligence at every step.`  
**CTAs:** `Join the waitlist` · `Request early access` · `Get early access`  
**Subheads:** Alternate between “teams” focus and “contract + security” focus.

---

## Pre-launch checklist

- [ ] Remove stale brand references from codebase and meta  
- [ ] `WAITLIST_ONLY=true` in production when gating  
- [ ] `waitlist_signups` + **Migration 005** `signup_metadata` for extended fields  
- [ ] Unauthenticated users cannot reach dashboard/APIs (middleware)  
- [ ] OG image 1200×630 (dark, wordmark + line) — verify at opengraph.xyz  
- [ ] Form E2E to Supabase  
- [ ] Mobile: 375px & 430px  
- [ ] Lighthouse mobile ≥ 90 where feasible  
- [ ] Analytics on submit  
- [ ] Domain + SSL + favicon  

---

## File map

| Asset | Role |
|-------|------|
| `src/app/page.tsx` | Landing UI |
| `src/components/marketing/EstoraWaitlistForm.tsx` | Full waitlist form + dark styling |
| `src/components/marketing/RevealSection.tsx` | Scroll reveal wrapper |
| `src/app/globals.css` | `.landing-estora` variables + animations |
| `src/app/api/waitlist/route.ts` | Persists `signup_metadata` jsonb |
| `migrations.md` | Migration 005 SQL |
