import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  BarChart3,
  ChevronDown,
  FileText,
  Lock,
  Shield,
} from 'lucide-react';
import EstoraWaitlistForm from '@/components/marketing/EstoraWaitlistForm';
import RevealSection from '@/components/marketing/RevealSection';
import { isWaitlistOnly } from '@/lib/waitlist';

export const metadata: Metadata = {
  title: 'Estora — Real Estate Transaction Intelligence',
  description:
    'Estora reads your contracts, manages your deals, and protects your transactions. AI-powered intelligence for coordinators, attorneys, and brokerage ops teams. Join the waitlist.',
  openGraph: {
    title: 'Estora — Real Estate Transaction Intelligence',
    description: 'From contract upload to close — with intelligence at every step. Join the waitlist.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Estora — Real Estate Transaction Intelligence',
    description: 'From contract upload to close — with intelligence at every step.',
  },
};

/** Read `WAITLIST_ONLY` at request time so deploy env can flip without a rebuild. */
export const dynamic = 'force-dynamic';

const skillsTable = [
  { skill: 'Read deal summary', who: 'Everyone', approval: 'No' },
  { skill: 'Read risk flags', who: 'Everyone', approval: 'No' },
  { skill: 'Read timeline', who: 'Everyone', approval: 'No' },
  { skill: 'Read task list', who: 'Everyone', approval: 'No' },
  { skill: 'Draft next actions', who: 'Everyone', approval: 'No' },
  {
    skill: 'Access sensitive contact details',
    who: 'Attorneys and coordinators only',
    approval: 'Yes — always',
    highlight: true,
  },
] as const;

const hardDenies = [
  'Prompt injection attempts (“ignore previous instructions,” “DAN,” etc.)',
  'Any attempt to modify escrow or wire transfer instructions',
  'Cross-organization data access',
  'Manual health score overrides',
  'Document instruction overrides',
] as const;

const faqItems = [
  {
    q: 'What is Estora versus Estora Guard?',
    a: 'Estora is the transaction platform—contract intelligence, deal management, timeline, health, and audit. Estora Guard is the policy-governed AI layer on top: a constrained agent, approval gates for sensitive data, receipts on every action, and hard blocks on dangerous requests.',
  },
  {
    q: 'Will the agent change wire or escrow instructions?',
    a: 'No. That class of change is hard-denied at the policy layer with no approval path. The attempt is logged like every other agent action.',
  },
  {
    q: 'Who gets access first?',
    a: 'We are prioritizing transaction coordinators, real estate attorneys, and brokerage operations leads—the roles running the highest deal volume and operational risk.',
  },
  {
    q: 'What happens to my waitlist email?',
    a: 'We use it only for Estora early access and product updates. No list sales, no unrelated marketing.',
  },
  {
    q: 'What integrations ship on day one?',
    a: 'The waitlist opens the core transaction and intelligence layer. Roadmap items like MLS and full workflow orchestration are layered in with design partners—see the vision section below.',
  },
] as const;

export default function HomePage() {
  const waitlist = isWaitlistOnly();

  return (
    <div className="landing-estora min-h-screen font-sans antialiased">
      <header className="sticky top-0 z-50 border-b border-[var(--lp-border)] bg-[var(--lp-bg)]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1140px] items-center justify-between gap-4 px-6 py-4">
          <Link href="/" className="font-display text-xl font-semibold tracking-tight text-[var(--lp-text)]">
            Estora
          </Link>
          <div className="flex shrink-0 items-center gap-3">
            {waitlist ? (
              <a
                href="#waitlist"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--lp-accent)] transition-colors hover:text-[var(--lp-text)]"
              >
                Join the waitlist
                <ArrowRight className="h-4 w-4" strokeWidth={2} aria-hidden />
              </a>
            ) : (
              <>
                <Link
                  href="/login"
                  className="rounded-md border border-[var(--lp-border)] px-4 py-2 text-sm font-medium text-[var(--lp-text-secondary)] transition-colors hover:border-[var(--lp-accent-dim)] hover:text-[var(--lp-text)]"
                >
                  Sign in
                </Link>
                <Link href="/signup" className="lp-cta inline-flex items-center gap-2 px-5 py-2 text-sm font-medium">
                  Get started
                  <ArrowRight className="h-4 w-4" strokeWidth={2} aria-hidden />
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-[var(--lp-border)]">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage: `linear-gradient(var(--lp-border) 1px, transparent 1px), linear-gradient(90deg, var(--lp-border) 1px, transparent 1px)`,
              backgroundSize: '48px 48px',
            }}
            aria-hidden
          />
          <div className="relative mx-auto grid max-w-[1140px] gap-14 px-6 py-20 md:min-h-[92vh] md:grid-cols-2 md:items-center md:py-0 md:pb-24 md:pt-28">
            <div>
              <p className="lp-label lp-hero-line mb-4 text-[var(--lp-text-muted)]">Transaction intelligence</p>
              <h1 className="font-display text-[clamp(2.25rem,5vw,3.75rem)] font-bold leading-[1.08] tracking-[-0.03em] text-[var(--lp-text)]">
                <span className="lp-hero-line block">Your contracts are smarter than your tools.</span>
                <span className="lp-hero-line lp-hero-line-2 mt-1 block text-[var(--lp-accent)]">
                  Estora changes that.
                </span>
              </h1>
              <p className="lp-hero-sub mt-6 max-w-xl text-lg leading-relaxed text-[var(--lp-text-secondary)]">
                AI-powered transaction intelligence for real estate teams — from contract upload to close.
              </p>
              <div className="lp-hero-cta mt-10">
                {waitlist ? (
                  <div id="hero-waitlist" className="max-w-md scroll-mt-28">
                    <EstoraWaitlistForm mode="hero" source="landing-hero" />
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-4">
                    <Link href="/signup" className="lp-cta inline-flex items-center gap-2 px-8 py-3 text-sm font-medium">
                      Create your account
                      <ArrowRight className="h-4 w-4" strokeWidth={2} aria-hidden />
                    </Link>
                    <a
                      href="#platform"
                      className="text-sm font-medium text-[var(--lp-text-secondary)] underline-offset-4 hover:text-[var(--lp-text)] hover:underline"
                    >
                      See how it works
                    </a>
                  </div>
                )}
              </div>
              {waitlist && (
                <p className="lp-hero-cta mt-4 max-w-md text-sm text-[var(--lp-text-muted)]">
                  We&apos;re opening access to transaction coordinators, attorneys, and brokerage ops teams first.
                </p>
              )}
            </div>

            <div className="relative flex min-h-[280px] items-center justify-center md:min-h-[360px]" aria-hidden>
              <div className="relative w-full max-w-[400px]">
                <div
                  className="absolute -inset-4 rounded-2xl opacity-40 blur-2xl"
                  style={{ background: 'radial-gradient(ellipse at center, rgba(184,149,106,0.25), transparent 70%)' }}
                />
                <div className="relative rounded-xl border border-[var(--lp-border)] bg-[var(--lp-surface)] p-5 shadow-2xl">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <span className="font-mono text-[11px] uppercase tracking-wider text-[var(--lp-text-muted)]">
                      Deal health
                    </span>
                    <span className="rounded-full border border-[var(--lp-accent)]/35 bg-[var(--lp-accent)]/10 px-2.5 py-0.5 font-mono text-xs text-[var(--lp-accent)]">
                      74 / 100
                    </span>
                  </div>
                  <div className="space-y-2 blur-[2.5px]">
                    <div className="h-2 w-full rounded bg-[var(--lp-surface-hi)]" />
                    <div className="h-2 w-[88%] rounded bg-[var(--lp-surface-hi)]" />
                    <div className="h-2 w-[72%] rounded bg-[var(--lp-surface-hi)]" />
                  </div>
                  <div className="relative -mt-14 rounded-lg border border-[var(--lp-guard)]/35 bg-[var(--lp-bg)]/95 p-3 backdrop-blur-sm">
                    <p className="font-mono text-[11px] uppercase tracking-wider text-[var(--lp-guard)]">Risk flag</p>
                    <p className="mt-1 font-display text-sm font-semibold text-[var(--lp-text)]">
                      HIGH — Missing contingency removal date
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Statement */}
        <RevealSection className="border-b border-[var(--lp-border)] px-6 py-24 md:py-32">
          <div className="mx-auto max-w-[760px] text-center">
            <p className="text-[1.25rem] font-normal leading-relaxed text-[var(--lp-text-secondary)] md:text-[1.35rem] md:leading-[1.7]">
              Real estate transactions are still managed with PDFs, email threads, sticky notes, and memory. A coordinator
              handling 20 active deals lives inside a spreadsheet that doesn&apos;t talk to her calendar, a CRM that
              doesn&apos;t know her deadlines, and an inbox where the contract lives as an attachment no one has fully
              read.
            </p>
            <p className="mt-8 text-[1.25rem] leading-relaxed text-[var(--lp-text-secondary)] md:text-[1.35rem] md:leading-[1.7]">
              One missed contingency date. One overlooked clause. One unacknowledged risk flag.
            </p>
            <p className="mt-8 text-[1.25rem] font-medium leading-relaxed text-[var(--lp-text)] md:text-[1.35rem] md:leading-[1.7]">
              That&apos;s not a workflow problem. That&apos;s an infrastructure problem. And it&apos;s been accepted as
              normal for decades.
            </p>
            <p className="mt-10 font-display text-2xl font-semibold text-[var(--lp-accent)] md:text-3xl">
              Estora is the infrastructure.
            </p>
          </div>
        </RevealSection>

        {/* Platform */}
        <RevealSection id="platform" className="border-b border-[var(--lp-border)] px-6 py-24 md:py-32">
          <div className="mx-auto max-w-[1140px]">
            <p className="lp-label text-[var(--lp-text-muted)]">The platform</p>
            <h2 className="mt-3 max-w-3xl font-display text-3xl font-semibold tracking-[-0.02em] text-[var(--lp-text)] md:text-[2.65rem] md:leading-tight">
              From the moment a contract lands, your deal is understood.
            </h2>
            <div className="mt-16 grid gap-px bg-[var(--lp-border)] md:grid-cols-3">
              <article className="bg-[var(--lp-bg)] p-8 md:p-10">
                <FileText className="h-9 w-9 text-[var(--lp-accent)]" strokeWidth={1.25} aria-hidden />
                <p className="lp-label mt-8 text-[var(--lp-accent-dim)]">Contract intelligence</p>
                <h3 className="mt-2 font-display text-xl font-semibold text-[var(--lp-text)] md:text-2xl">
                  Upload a purchase agreement. Estora reads it.
                </h3>
                <p className="mt-4 text-[15px] leading-relaxed text-[var(--lp-text-secondary)]">
                  Every party. Every date. Every contingency. Every obligation. Extracted, structured, and linked back to
                  the exact page it came from — with confidence scores and risk flags raised automatically.
                </p>
                <p className="mt-4 text-[15px] leading-relaxed text-[var(--lp-text-secondary)]">
                  No manual data entry. No rekeying into a CRM. No hoping someone read the whole thing. The deal is
                  structured the moment the document arrives.
                </p>
                <p className="mt-6 font-mono text-xs leading-relaxed text-[var(--lp-text-muted)]">
                  Document classification, entity extraction, clause logic, risk rationale — page-level provenance on every
                  field.
                </p>
              </article>
              <article className="bg-[var(--lp-bg)] p-8 md:p-10">
                <BarChart3 className="h-9 w-9 text-[var(--lp-accent)]" strokeWidth={1.25} aria-hidden />
                <p className="lp-label mt-8 text-[var(--lp-accent-dim)]">Transaction control</p>
                <h3 className="mt-2 font-display text-xl font-semibold text-[var(--lp-text)] md:text-2xl">
                  Every deal gets a spine.
                </h3>
                <p className="mt-4 text-[15px] leading-relaxed text-[var(--lp-text-secondary)]">
                  A live milestone timeline. A health score. A task checklist that generates itself from contract logic.
                  Deadlines that escalate automatically — from upcoming to due soon to overdue to critical — without
                  anyone running a morning standup to find out.
                </p>
                <p className="mt-4 text-[15px] leading-relaxed text-[var(--lp-text-secondary)]">
                  Your team sees what&apos;s done, what&apos;s late, and what&apos;s about to become a problem. Before it
                  becomes a problem.
                </p>
                <p className="mt-6 font-mono text-xs leading-relaxed text-[var(--lp-text-muted)]">
                  Rules engine → tasks. Deadline engine → escalations. Events your team can act on.
                </p>
              </article>
              <article className="bg-[var(--lp-bg)] p-8 md:p-10">
                <Shield className="h-9 w-9 text-[var(--lp-accent)]" strokeWidth={1.25} aria-hidden />
                <p className="lp-label mt-8 text-[var(--lp-accent-dim)]">Estora Guard</p>
                <h3 className="mt-2 font-display text-xl font-semibold text-[var(--lp-text)] md:text-2xl">
                  The security layer real estate was never given.
                </h3>
                <p className="mt-4 text-[15px] leading-relaxed text-[var(--lp-text-secondary)]">
                  Real estate transactions move real money. Wire fraud is the fastest-growing financial crime in property
                  deals. Most platforms were not built with that threat in mind.
                </p>
                <p className="mt-4 text-[15px] leading-relaxed text-[var(--lp-text-secondary)]">
                  Estora Guard is the security and intelligence layer built directly into the platform. A role-aware AI
                  agent that can reason about your deal — but only within a strict policy boundary. Human approval gates
                  on every sensitive operation. PII masked by default. An append-only audit trail on every action,
                  every decision, every reason.
                </p>
                <p className="mt-6 font-mono text-xs leading-relaxed text-[var(--lp-text-muted)]">
                  Injection, escrow tampering, cross-org access — blocked before execution. Every action receipts request,
                  decision, and reason.
                </p>
              </article>
            </div>
          </div>
        </RevealSection>

        {/* Guard detail */}
        <RevealSection
          id="guard"
          className="border-b border-[var(--lp-border)] bg-[var(--lp-surface)] px-6 py-24 md:py-32"
        >
          <div className="mx-auto max-w-[1140px]">
            <div className="border-l-2 border-[var(--lp-guard)] pl-6 md:pl-8">
              <p className="lp-label text-[var(--lp-guard)]">Estora Guard</p>
              <h2 className="mt-3 max-w-4xl font-display text-3xl font-semibold tracking-[-0.02em] text-[var(--lp-text)] md:text-[2.5rem] md:leading-tight">
                Six things the agent can do. One that requires your approval. Everything else is hard-blocked.
              </h2>
              <p className="mt-6 max-w-3xl text-[15px] leading-relaxed text-[var(--lp-text-secondary)]">
                The Estora agent has a defined set of skills. Not a general-purpose AI that can do anything it&apos;s
                asked — a constrained intelligence with a manifest that governs exactly what it can access, who can ask
                it, and what requires a human in the loop before anything happens.
              </p>
            </div>

            <div className="mt-12 overflow-x-auto rounded-lg border border-[var(--lp-border)]">
              <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--lp-border)] bg-[var(--lp-surface-hi)] font-mono text-[11px] uppercase tracking-wider text-[var(--lp-text-muted)]">
                    <th className="px-4 py-3 font-medium">Skill</th>
                    <th className="px-4 py-3 font-medium">Who can use it</th>
                    <th className="px-4 py-3 font-medium">Requires approval?</th>
                  </tr>
                </thead>
                <tbody className="text-[var(--lp-text-secondary)]">
                  {skillsTable.map((row) => (
                    <tr
                      key={row.skill}
                      className={`border-b border-[var(--lp-border)] last:border-b-0 ${
                        'highlight' in row && row.highlight ? 'bg-[var(--lp-guard)]/10' : ''
                      }`}
                    >
                      <td
                        className={`px-4 py-3 font-medium ${'highlight' in row && row.highlight ? 'text-[var(--lp-text)]' : 'text-[var(--lp-text)]'}`}
                      >
                        {row.skill}
                      </td>
                      <td className="px-4 py-3">{row.who}</td>
                      <td
                        className={`px-4 py-3 font-mono text-xs ${'highlight' in row && row.highlight ? 'font-semibold text-[var(--lp-guard)]' : ''}`}
                      >
                        {row.approval}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="mt-10 max-w-3xl text-[15px] leading-relaxed text-[var(--lp-text-secondary)]">
              Sensitive data — buyer SSN, wire instructions, attorney contact details — is masked in the interface by
              default. Revealing it requires explicit approval. The request is logged. The decision is logged. The
              reason is logged.
            </p>
            <p className="mt-4 max-w-3xl text-[15px] leading-relaxed text-[var(--lp-text-secondary)]">
              Not because we expect everyone to misuse it. Because the platform is designed to work correctly even when
              someone tries to.
            </p>

            <div className="mt-14 rounded-lg border border-[var(--lp-guard-dim)]/50 bg-[var(--lp-bg)] p-6 md:p-8">
              <p className="font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--lp-guard)]">
                Always blocked · No approval path
              </p>
              <ul className="guard-deny-stagger mt-6 space-y-3 font-mono text-sm text-[var(--lp-text-secondary)]">
                {hardDenies.map((line) => (
                  <li key={line} className="flex gap-2">
                    <span className="shrink-0 text-[var(--lp-guard)]">—</span>
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-8 font-mono text-xs text-[var(--lp-text-muted)]">
                [audit] POLICY_DECISION: DENIED | reason: prompt_injection_pattern_detected
              </p>
            </div>

            <p className="mt-10 text-[15px] text-[var(--lp-text-secondary)]">
              We stress-tested this. We built an attack console with eight preset adversarial attacks. Every one of them
              is blocked.
            </p>
          </div>
        </RevealSection>

        {/* Who it's for */}
        <RevealSection className="border-b border-[var(--lp-border)] px-6 py-24 md:py-32">
          <div className="mx-auto max-w-[1140px]">
            <p className="lp-label text-[var(--lp-text-muted)]">Built for</p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-[-0.02em] text-[var(--lp-text)] md:text-[2.65rem]">
              The people who manage the actual work.
            </h2>
            <div className="mt-14 grid gap-6 md:grid-cols-3">
              {[
                {
                  title: 'Transaction coordinators',
                  body: "You're managing 15–30 active deals at once. Estora is your command center. Every contract read the moment it lands. Every deadline tracked. Every task generated from clause logic — not from someone's memory of what needs to happen. Your pipeline in one place, with a health score on every deal.",
                },
                {
                  title: 'Real estate attorneys',
                  body: 'Contracts arrive already read. Risk flags are already surfaced, linked back to the exact clause that raised them. PII access is gated behind explicit approval and fully logged. You see what matters. You act on what matters. The audit trail covers you.',
                },
                {
                  title: 'Brokerage operations teams',
                  body: "Visibility across every active deal without chasing agents for updates. Health scores across the portfolio. Escalations that reach you before they become liability. Role-based access so every team member sees exactly what they're supposed to — nothing more.",
                },
              ].map((card) => (
                <article
                  key={card.title}
                  className="rounded-xl border border-[var(--lp-border)] bg-[var(--lp-surface)] p-8 transition-colors hover:border-[var(--lp-accent)]/25"
                >
                  <h3 className="font-display text-xl font-semibold text-[var(--lp-text)]">{card.title}</h3>
                  <p className="mt-4 text-[15px] leading-relaxed text-[var(--lp-text-secondary)]">{card.body}</p>
                </article>
              ))}
            </div>
          </div>
        </RevealSection>

        {/* Vision */}
        <RevealSection className="border-b border-[var(--lp-border)] px-6 py-24 md:py-32">
          <div className="mx-auto max-w-[760px] text-center">
            <h2 className="font-display text-3xl font-semibold tracking-[-0.02em] text-[var(--lp-text)] md:text-[2.5rem]">
              This is just the start.
            </h2>
            <p className="mt-8 text-[15px] leading-relaxed text-[var(--lp-text-secondary)]">
              What we&apos;ve built and are opening waitlist access for is the transaction and intelligence layer —
              contract reading, deal management, and the security runtime on top.
            </p>
            <p className="mt-6 text-[15px] leading-relaxed text-[var(--lp-text-secondary)]">
              What comes next: automated client communications tied to deal state. Listing and marketing automation. MLS
              integration. A full workflow orchestration layer that connects every part of real estate operations into one
              coherent system.
            </p>
            <p className="mt-6 text-[15px] leading-relaxed text-[var(--lp-text-secondary)]">
              We&apos;re building this the right way — layer by layer, with the teams who will actually use it.
            </p>
            <p className="mt-10 font-display text-lg text-[var(--lp-accent)]">
              If you&apos;re on the waitlist, you&apos;re part of that build.
            </p>
            {waitlist && (
              <a
                href="#waitlist"
                className="mt-10 inline-flex items-center gap-2 text-sm font-medium text-[var(--lp-accent)] hover:text-[var(--lp-text)]"
              >
                Join the waitlist
                <ArrowRight className="h-4 w-4" strokeWidth={2} aria-hidden />
              </a>
            )}
          </div>
        </RevealSection>

        {/* Waitlist / CTA */}
        <section id="waitlist" className="scroll-mt-28 px-6 py-24 md:py-32">
          <div className="mx-auto max-w-[640px]">
            {waitlist ? (
              <>
                <h2 className="font-display text-3xl font-semibold tracking-[-0.02em] text-[var(--lp-text)] md:text-[2.25rem]">
                  Get access before we open to everyone.
                </h2>
                <p className="mt-4 text-[15px] leading-relaxed text-[var(--lp-text-secondary)]">
                  We&apos;re onboarding transaction teams, real estate attorneys, and brokerage ops leads first. Early
                  access members shape the product, influence the roadmap, and get priority access to every layer we ship.
                </p>
                <div className="mt-10 rounded-xl border border-[var(--lp-border)] bg-[var(--lp-surface)] p-6 md:p-8">
                  <EstoraWaitlistForm mode="full" source="landing-waitlist" />
                </div>
              </>
            ) : (
              <>
                <h2 className="font-display text-3xl font-semibold tracking-[-0.02em] text-[var(--lp-text)] md:text-[2.25rem]">
                  Run your next closing in Estora
                </h2>
                <p className="mt-4 text-[15px] leading-relaxed text-[var(--lp-text-secondary)]">
                  Upload a contract, create a transaction, and explore the timeline, tasks, and Estora Guard agent — with
                  policy gates and a full audit trail.
                </p>
                <div className="mt-10 flex flex-wrap gap-4">
                  <Link href="/signup" className="lp-cta inline-flex items-center gap-2 px-8 py-3 text-sm font-medium">
                    Create your account
                    <ArrowRight className="h-4 w-4" strokeWidth={2} aria-hidden />
                  </Link>
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-2 rounded-md border border-[var(--lp-border)] px-8 py-3 text-sm font-medium text-[var(--lp-text-secondary)] hover:border-[var(--lp-accent-dim)] hover:text-[var(--lp-text)]"
                  >
                    Sign in
                  </Link>
                </div>
              </>
            )}
          </div>
        </section>

        {/* FAQ */}
        <section className="border-t border-[var(--lp-border)] px-6 py-20 md:py-24">
          <div className="mx-auto max-w-[720px]">
            <div className="mb-2 flex items-center gap-2">
              <Lock className="h-5 w-5 text-[var(--lp-accent)]" strokeWidth={1.5} aria-hidden />
              <h2 className="font-display text-2xl font-semibold text-[var(--lp-text)]">Questions we hear a lot</h2>
            </div>
            <div className="mt-8 divide-y divide-[var(--lp-border)] rounded-xl border border-[var(--lp-border)] bg-[var(--lp-surface)]">
              {faqItems.map(({ q, a }) => (
                <details key={q} className="group px-5 py-4 first:rounded-t-xl last:rounded-b-xl">
                  <summary className="cursor-pointer list-none font-medium text-[var(--lp-text)] outline-none marker:content-none [&::-webkit-details-marker]:hidden">
                    <span className="flex items-center justify-between gap-4">
                      {q}
                      <ChevronDown
                        className="h-5 w-5 shrink-0 text-[var(--lp-accent)] transition-transform group-open:rotate-180"
                        strokeWidth={2}
                        aria-hidden
                      />
                    </span>
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-[var(--lp-text-secondary)]">{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--lp-border)] px-6 py-14">
        <div className="mx-auto flex max-w-[1140px] flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="font-display text-lg font-semibold text-[var(--lp-text)]">Estora</p>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-[var(--lp-text-secondary)]">
              Estate + Aura. A guiding intelligence layer for real estate assets.
            </p>
          </div>
          <div className="text-sm">
            <a
              href="mailto:hello@estora.ai"
              className="text-[var(--lp-accent)] transition-colors hover:text-[var(--lp-text)]"
            >
              hello@estora.ai
            </a>
            <p className="mt-6 text-[var(--lp-text-muted)]">
              © {new Date().getFullYear()} Estora. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
