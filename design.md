# Design Specification: Agreement of Sale — Agent Workspace

**Version 1.0 | Real Estate Transaction Platform**

-----

## 1. Product Overview

A professional desktop-first web application that enables licensed real estate agents to autonomously create, edit, review, and manage residential agreements of sale. The interface must support precision data entry, legal compliance awareness, and fast transaction throughput — all while reducing agent error and cognitive load.

**Primary Users:** Licensed real estate agents (buyer’s agents, seller’s agents, dual agents)
**Secondary Users:** Transaction coordinators, real estate attorneys (read-only review)
**Core Jobs To Be Done:**

- Populate and adjust agreement fields quickly and accurately
- Catch errors and legal conflicts before submission
- Track changes and maintain an audit trail
- Move a deal from offer to executed contract with minimal friction

-----

## 2. Design Principles

### 2.1 Clarity Over Cleverness

Every UI element must earn its place. Legal documents carry consequence — the interface must communicate exactly what is being edited, what is affected, and what is required. Decorative elements exist only in service of structure and hierarchy.

### 2.2 Progressive Disclosure

Expose complexity only when needed. A new agent and a seasoned agent should both feel at home. Standard fields are always visible; advanced or conditional clauses reveal only when applicable (e.g., purchase money mortgage fields only appear when that option is selected).

### 2.3 Error Prevention Before Error Correction

The interface should prevent mistakes before they happen — through field constraints, inline validation, smart defaults, and contextual warnings — rather than relying on error messages after the fact. Inspired by Nielsen’s “Error Prevention” heuristic.

### 2.4 Confidence Through Feedback

Every action the agent takes must produce an immediate, clear response. Saving, validating, submitting, and flagging should all produce unambiguous system feedback. Silence is never acceptable in a legal workflow.

### 2.5 Respect Agent Expertise

Agents are professionals, not novices. The UI should afford speed and autonomy — keyboard-first navigation, smart defaults from prior transactions, auto-complete on common fields — without being condescending with excessive hand-holding.

### 2.6 Audit-First Architecture

Every change is recorded. The UI should make the history of a document visible and accessible, not buried. Trust is built through transparency.

-----

## 3. Information Architecture

```
App Shell
├── Dashboard (Active Deals Overview)
│   ├── Pipeline View (Kanban by stage)
│   └── List View (sortable, filterable)
│
├── Agreement Workspace [CORE]
│   ├── Header Bar (deal identity + status)
│   ├── Section Navigator (left sidebar)
│   ├── Edit Canvas (center — the contract)
│   ├── Validation Panel (right sidebar)
│   └── Audit Trail (bottom drawer)
│
├── Templates Library
│   └── Saved clause sets, riders, addenda
│
├── Contacts (Buyers, Sellers, Attorneys, Lenders)
│
└── Settings
    ├── Agent Profile
    ├── Brokerage Defaults
    └── Signature & Stamp Config
```

-----

## 4. Agreement Workspace — Detailed Layout

The workspace is the heart of the product. It follows a **tri-panel layout**:

```
┌─────────────────────────────────────────────────────────────────┐
│  HEADER BAR — Deal Name | Address | Status | Actions            │
├──────────────┬──────────────────────────────────┬───────────────┤
│              │                                  │               │
│  SECTION     │       EDIT CANVAS                │  VALIDATION   │
│  NAVIGATOR   │   (Contract Fields)              │  PANEL        │
│  (left)      │                                  │  (right)      │
│              │                                  │               │
│  • Parties   │                                  │  ⚠ Warnings   │
│  • Property  │                                  │  ✓ Complete   │
│  • Price     │                                  │  ✗ Required   │
│  • Mortgage  │                                  │               │
│  • Escrow    │                                  │               │
│  • Closing   │                                  │               │
│  • Conditions│                                  │               │
│  • Defaults  │                                  │               │
│  • Riders    │                                  │               │
│              │                                  │               │
├──────────────┴──────────────────────────────────┴───────────────┤
│  AUDIT TRAIL (collapsible bottom drawer)                        │
└─────────────────────────────────────────────────────────────────┘
```

-----

## 5. Component Specifications

### 5.1 Header Bar

- **Left:** Property address (large), deal nickname (editable inline), MLS # badge
- **Center:** Progress indicator — 8-step horizontal stepper showing contract completion (Parties → Property → Price → Mortgage → Escrow → Conditions → Review → Execute)
- **Right:** Status badge (Draft / Under Review / Executed / Void), last-saved timestamp, primary CTA (“Send for Signature” / “Save Draft”), overflow menu (Print, Export PDF, Share, Void)
- **Behavior:** Sticky on scroll. The header never disappears during editing.

### 5.2 Section Navigator (Left Sidebar)

- Fixed vertical list of all contract sections
- Each section shows a **completion ring** (0–100% fill) and an **issue badge** (red = error, yellow = warning, green = complete)
- Active section is highlighted; clicking jumps the canvas to that section with a smooth scroll
- Collapsed to icon-only mode on smaller viewports
- Sections marked “Not Applicable” are visually de-emphasized (strikethrough, muted color) but still accessible

### 5.3 Edit Canvas (Center Panel)

The canvas renders the contract as a **structured form** — not a raw document editor, not a PDF overlay. Fields are rendered inline within the natural reading flow of the agreement.

**Field Types:**

|Field Type            |Use Case                           |Behavior                                                              |
|----------------------|-----------------------------------|----------------------------------------------------------------------|
|Text Input            |Names, addresses                   |Auto-complete from contacts DB                                        |
|Currency Input        |Prices, deposits                   |Formatted on blur ($###,###), validates > 0                           |
|Date Picker           |Closing date, commitment date      |Calendar picker, blocks past dates where appropriate, shows days-until|
|Percentage Input      |Interest rates                     |Decimal validation, range warning                                     |
|Toggle / Switch       |Delete-if-inapplicable clauses     |Animates field group in/out on toggle                                 |
|Dropdown              |Loan type, payment method          |Searchable, shows description on hover                                |
|Multi-Select          |Included/excluded personal property|Checkbox list with “custom” text entry                                |
|Rich Textarea         |Riders, special conditions         |Character count, legal clause library shortcut                        |
|Calculated / Read-only|Balance at closing                 |Auto-calculated, visually distinct (gray bg)                          |

**Field States:**

- **Empty (required):** Subtle red left border + placeholder text
- **Empty (optional):** Gray left border + italic placeholder
- **Filled / Valid:** Neutral, no indicator
- **Warning:** Yellow left border + inline icon with tooltip (“Commitment date is only 8 days away — typical minimum is 15”)
- **Error:** Red border + inline error message below field
- **Auto-filled:** Blue left border + “Auto-filled from contacts” badge (dismissible)
- **Locked (post-execution):** Gray background, padlock icon, read-only

**Conditional Sections:**

- When “Subject to existing mortgage” is toggled off → the existing mortgage section collapses with an animation and its fields are excluded from validation
- When “Purchase money mortgage” is enabled → the PM mortgage section expands inline

### 5.4 Validation Panel (Right Sidebar)

A live compliance and completeness assistant — not a chatbot, not a legal advisor, but a structured checklist of issues in the current document.

**Three categories:**

1. **Errors (🔴)** — Blocking issues. Cannot submit/send without resolving. Example: “Purchase price is $0.”
1. **Warnings (🟡)** — Non-blocking but recommended review. Example: “Commitment date is less than 10 business days from today.”
1. **Info (🔵)** — Contextual reminders. Example: “New York law requires a lead paint disclosure for pre-1978 properties. Confirm this has been provided separately.”

Each item in the panel:

- Names the field/section it relates to
- Provides a one-sentence plain-language explanation
- Has a **“Jump to field”** link that scrolls the canvas to the issue
- Can be dismissed (warnings/info only) with a note logged to the audit trail

**Panel Header:** Shows a summary score — e.g., “3 errors · 2 warnings · 1 note” with a colored ring indicator.

### 5.5 Audit Trail (Bottom Drawer)

- Default: collapsed to a slim bar showing “Last edited by [Agent] 2 min ago”
- Expanded: chronological feed of all changes, each entry showing:
  - Timestamp
  - Agent name + role
  - Field name
  - Old value → New value (redline style)
  - Optional note/reason (agent can add a comment to any change)
- Filterable by: date range, field, agent, change type
- Export as PDF or CSV for legal record-keeping
- **All entries are immutable.** Deleting or editing audit entries is prohibited.

-----

## 6. Critical UX Flows

### 6.1 Creating a New Agreement

1. Agent clicks “New Agreement” from Dashboard
1. Modal asks: **New from scratch** or **Use template** or **Import from MLS**
1. If template: shows saved templates with last-used date and a preview thumbnail
1. Workspace opens with auto-populated fields from template or MLS pull
1. Section Navigator shows all sections red (incomplete) — agent works top to bottom

### 6.2 Editing a Field Mid-Transaction

1. Agent clicks any field in the canvas
1. Field enters edit mode immediately (no “Edit Mode” toggle required — inline editing always on)
1. Agent makes change
1. On blur: field validates instantly, validation panel updates in real-time
1. Auto-save triggers after 2 seconds of inactivity — a subtle “Saved” indicator pulses in the header
1. Audit trail logs the change in the background

### 6.3 Handling a Counteroffer

1. Agent opens an existing executed offer
1. Clicks “Create Counteroffer” in header overflow menu
1. System creates a versioned copy (v1 → v2)
1. Changed fields from v1 are highlighted in amber (“Modified from original offer”)
1. Unchanged fields are locked by default (can be unlocked individually)
1. Validation runs against the new version
1. Agent sends v2 for signature — v1 is preserved as a historical record

### 6.4 Conditional Clause Management

1. Each clause with “Delete if inapplicable” is represented as a **toggle switch** with the clause label
1. Default state is determined by template settings or brokerage defaults
1. When toggled OFF, the clause block collapses, all its fields are cleared and excluded from validation
1. A visual “strikethrough” pill shows in the Section Navigator indicating the clause is inactive
1. Agent can restore at any time; fields return blank (not pre-filled with old values)

-----

## 7. Visual Design Direction

### 7.1 Tone

**Refined utilitarian.** The aesthetic is inspired by professional-grade tools — Bloomberg Terminal meets modern SaaS. Serious, efficient, and precise — but not cold. The agent should feel in command, not overwhelmed.

### 7.2 Color System

```
--color-surface:        #F8F7F4   /* Warm off-white — reduces eye strain on long sessions */
--color-surface-raised: #FFFFFF   /* Cards, panels */
--color-surface-sunken: #EFEDE8   /* Read-only fields, backgrounds */

--color-navy:           #1B2A4A   /* Primary brand, header, key UI chrome */
--color-navy-light:     #2D4270   /* Hover states, active nav items */

--color-gold:           #C9973A   /* Accent — CTAs, active states, progress */
--color-gold-light:     #F0DDB0   /* Accent fills, highlights */

--color-text-primary:   #1A1A1A   /* Body text */
--color-text-secondary: #666058   /* Labels, captions */
--color-text-disabled:  #ABABAB   /* Inactive fields */

--color-error:          #C0392B
--color-warning:        #D4870A
--color-success:        #2E7D32
--color-info:           #1565C0

--color-border:         #DEDAD2
--color-border-focus:   #C9973A   /* Gold border on focused fields */
```

### 7.3 Typography

```
Display / Header:    "Canela" or "Playfair Display" — serif authority
Body / UI:           "DM Sans" — clean, legible, professional
Monospace / Values:  "JetBrains Mono" — currency, dates, legal references
```

**Scale:**

- Section headers: 13px uppercase tracked / 500 weight / navy
- Field labels: 11px uppercase / 400 weight / secondary text
- Field values: 15px / 400 weight / primary text
- Error messages: 12px / 500 weight / error red
- Legal body text: 14px / 400 weight / line-height 1.7

### 7.4 Spacing & Layout

- Base unit: 4px
- Standard field height: 40px
- Section padding: 32px horizontal, 24px vertical
- Between fields: 20px vertical gap
- Between sections: 48px visual break (thin rule + section label)
- Left panel: 240px fixed width
- Right panel: 280px fixed width
- Canvas: fluid, max-width 780px, centered

### 7.5 Elevation & Depth

- App shell background: `--color-surface` (warm off-white)
- Panels and cards: `--color-surface-raised` with `box-shadow: 0 1px 3px rgba(0,0,0,0.08)`
- Active/focused fields: `box-shadow: 0 0 0 3px rgba(201, 151, 58, 0.25)` (gold glow)
- Modals: `box-shadow: 0 24px 64px rgba(0,0,0,0.18)` with backdrop blur

### 7.6 Iconography

- Style: 1.5px stroke, rounded caps — Lucide or Phosphor icon set
- Size: 16px in-line, 20px in navigation, 24px in empty states
- Never use filled icons and outline icons in the same context

-----

## 8. Interaction Patterns

### 8.1 Auto-Save

- Auto-save fires 2 seconds after any change
- Header shows: “Saving…” → “Saved just now” → fades to timestamp
- On network loss: “Unable to save — retrying…” banner in amber
- On reconnect: saves immediately, confirms with “Saved” toast

### 8.2 Smart Auto-Complete

- Party name fields pull from the agent’s Contacts database
- Selecting a contact auto-fills: name, address, SSN/Fed ID (masked), email, phone
- Lender fields pull from a curated institutional lender list
- Attorney fields pull from brokerage preferred attorneys list

### 8.3 Keyboard Navigation

- `Tab` / `Shift+Tab` moves between fields in document order
- `Enter` on a dropdown or toggle activates it
- `Cmd/Ctrl + S` triggers manual save
- `Cmd/Ctrl + /` opens the keyboard shortcut reference modal
- `Escape` cancels an in-progress edit and reverts to last saved value
- Section jump: `Cmd/Ctrl + 1–9` jumps to the nth section

### 8.4 Field-Level Help

- Every field has a `?` icon (visible on hover)
- Clicking opens a **tooltip popover** (not a modal) with:
  - Plain-language description of the field
  - Legal context (which paragraph it maps to in the contract)
  - Example value
  - Common agent mistakes to avoid
- Popovers are dismissible and do not steal focus

### 8.5 Inline Calculation

- “Balance at Closing” (¶3d) is always calculated: `Purchase Price − Downpayment − Existing Mortgage − PM Mortgage`
- Updates in real time as source fields change
- Displayed in a read-only field with a formula indicator icon
- Hovering the formula icon shows the calculation breakdown as a tooltip

### 8.6 Date Intelligence

- All date fields show:
  - Calendar picker
  - “Days from today” label (e.g., “42 days from today”)
  - Warning if date falls on a weekend or federal holiday: “This date is a Sunday — confirm with all parties”
- Commitment Date warns if fewer than 10 business days from today
- Closing Date warns if fewer than 30 days from contract date (typical minimum)

-----

## 9. Accessibility Requirements

- **WCAG 2.1 AA** compliance minimum; target AAA for color contrast on form fields
- All interactive elements reachable and operable by keyboard alone
- All form fields have explicit `<label>` associations (no placeholder-only labeling)
- Error messages are announced by screen readers via `aria-live="polite"` regions
- Focus states are highly visible (gold ring, never removed)
- Color is never the sole means of conveying information (always paired with icon or text)
- Touch targets minimum 44×44px for any mobile-responsive breakpoint
- Validation panel uses ARIA roles: `role="alert"` for errors, `role="status"` for saves

-----

## 10. Responsive Behavior

This is a desktop-first application, but agents increasingly work on tablets.

|Breakpoint |Behavior                                                                  |
|-----------|--------------------------------------------------------------------------|
|≥ 1440px   |Full tri-panel layout                                                     |
|1024–1439px|Right validation panel collapses to icon-bar; click to expand as overlay  |
|768–1023px |Left navigator collapses to icon-bar; single-column canvas                |
|< 768px    |Read-only / review mode only; editing locked with “Open on desktop” prompt|

-----

## 11. Empty States & Onboarding

### 11.1 New Agreement — Empty Canvas

- Each section shows a ghost/skeleton state with instructional text: *“Enter the buyer’s full legal name as it appears on their ID”*
- A progress banner at the top: *“Complete Parties section to unlock Property details”*

### 11.2 First-Time Agent

- Contextual coach marks (not a modal tour) highlight the 3 most important areas: Section Navigator, Validation Panel, and the auto-save indicator
- Dismissible after first interaction with each area
- Never re-shown unless agent resets onboarding in Settings

### 11.3 Empty Dashboard

- Illustrated state (minimal line art of a house) with headline: *“No active agreements”*
- Two clear CTAs: “New Agreement” and “Import from MLS”

-----

## 12. Error Handling & Edge Cases

|Scenario                |UI Response                                                                                            |
|------------------------|-------------------------------------------------------------------------------------------------------|
|Session timeout         |Modal: “Your session has expired. Your work was auto-saved. Please log in again.”                      |
|Network loss during edit|Amber banner: “You’re offline. Changes will save when you reconnect.” Local draft preserved.           |
|Duplicate deal detected |Warning banner on save: “An agreement for this address already exists. View existing deal or continue.”|
|Invalid date range      |Inline error: “Commitment Date must be before Closing Date.” Both fields highlighted.                  |
|Purchase price = $0     |Blocking error. CTA to send for signature is disabled until resolved.                                  |
|FIRPTA flag             |If seller marked as foreign person: info banner with link to FIRPTA withholding guidance.              |
|Pre-1978 property       |Automatic info notice: “Lead paint disclosure required by federal law for this property year.”         |

-----

## 13. Security & Compliance UX

- All SSN/Fed ID fields are **masked by default** (`***-**-1234`). Agent must click “Reveal” (with a hold-to-show interaction) to view full value. Reveal action is logged in the audit trail.
- Executed agreements are **locked** — no field edits permitted. A “Create Amendment” or “Create Counteroffer” workflow is required.
- Role-based access: only the assigned agent can edit; attorney/coordinator role is view-only by default
- Session activity timeout at 20 minutes idle with a 2-minute warning countdown
- Any export (PDF, CSV) is watermarked with agent name, timestamp, and “DRAFT” if not yet executed

-----

## 14. Performance Targets

|Metric                              |Target             |
|------------------------------------|-------------------|
|Time to interactive (workspace load)|< 2.0s on broadband|
|Field validation response           |< 100ms            |
|Auto-save round trip                |< 500ms            |
|Section jump animation              |200ms ease-out     |
|PDF export generation               |< 5s               |
|Audit trail load (100 entries)      |< 1.0s             |

-----

## 15. Design Anti-Patterns to Avoid

- ❌ **Full-page modal for every action** — use inline editing and slide-over panels instead
- ❌ **Pagination for contract sections** — one long scrollable canvas keeps context; use sticky navigation
- ❌ **Disabling the save button** — always allow saving, even with validation errors (errors block submission, not saving)
- ❌ **Ambiguous icons without labels** — all icons in the nav and toolbar must have visible labels or persistent tooltips
- ❌ **Red for all validation states** — use yellow for warnings (non-blocking) and reserve red strictly for blocking errors
- ❌ **Overwriting auto-populated fields without notice** — warn agent before replacing an auto-filled value
- ❌ **Silent failures** — every action must produce visible feedback, especially saves and submissions

-----

*This document is a living design specification. Version and date every revision. Pair with a component library (Figma or Storybook) and a pattern library of all field types in all states.*
