import Link from 'next/link';
import {
  ArrowRight,
  BarChart3,
  Bot,
  CheckCircle2,
  ChevronDown,
  FileText,
  Layers,
  Lock,
  Shield,
  Sparkles,
  Terminal,
} from 'lucide-react';
import WaitlistForm from '@/components/marketing/WaitlistForm';
import { isWaitlistOnly } from '@/lib/waitlist';

/** Read `WAITLIST_ONLY` at request time so deploy env can flip without a rebuild. */
export const dynamic = 'force-dynamic';

const trustPoints = [
  'Append-only audit trail on every change',
  'Row-level security in Supabase',
  'PII masking with gated reveal workflow',
];

const coreBenefits = [
  {
    icon: FileText,
    title: 'Contract → structured deal data',
    body: 'Upload a PDF. LlamaParse plus Claude extract parties, dates, money, and clauses—so you stop retyping the purchase agreement.',
  },
  {
    icon: BarChart3,
    title: 'Timeline, tasks, and health in one place',
    body: 'Milestones, checklist items, and a live health score give your team a single nerve center instead of scattered spreadsheets.',
  },
  {
    icon: Shield,
    title: 'Risk flags you can acknowledge',
    body: 'Inspection windows, missing language, and ambiguous terms surface as severities you can track—not surprises at the wire.',
  },
];

const guardBenefits = [
  {
    icon: Bot,
    title: 'Role-aware answers',
    body: 'Buyer’s agent, seller’s agent, attorney, coordinator—same deal, role-appropriate summaries and next steps.',
  },
  {
    icon: Lock,
    title: 'Policy gate on every skill',
    body: 'Six bounded skills, manifest-driven rules, and hard denies for jailbreaks, escrow tampering, and cross-org dumps.',
  },
  {
    icon: Terminal,
    title: 'Red-team console',
    body: 'Run eight preset attacks and watch allow, deny, and approval-required outcomes in real time—proof the firewall works.',
  },
];

const steps = [
  { step: '1', title: 'Upload the contract', detail: 'PDF to structured extraction with confidence and page references.' },
  { step: '2', title: 'Create the transaction', detail: 'Property, people, mortgage, escrow, and timeline materialize automatically.' },
  { step: '3', title: 'Operate the file', detail: 'Tasks, timeline, agreements, and audit trail stay in sync as the deal moves.' },
  { step: '4', title: 'Ask Estora Guard', detail: 'Chat with the agent; every invocation is policy-checked and receipt-logged.' },
];

const faqItemsBase = [
  {
    q: 'What is Estora versus Estora Guard?',
    a: 'Estora is the transaction intelligence platform—extraction, risks, timeline, health, and audit. Guard is the AI layer: a chat agent plus a policy engine, approvals for sensitive actions, receipts, and a red-team console.',
  },
  {
    q: 'Is the agent allowed to change wire instructions or escrow?',
    a: 'No. Escrow and wire modifications are hard-denied at the policy layer, regardless of how the prompt is phrased. That denial is logged like every other agent action.',
  },
  {
    q: 'What happens to my data?',
    a: 'Data lives in your Supabase project with row-level security. Agent skills read through the same services as the product UI; there is no separate shadow database for the demo path.',
  },
  {
    q: 'What is coming next?',
    a: 'The architecture supports a separate agent security runtime (e.g. NemoClaw / OpenShell) for process-level isolation alongside the in-app policy gate—documented in-repo for teams that want defense in depth.',
  },
];

const faqWaitlistItem = {
  q: 'Why a waitlist?',
  a: 'We are finishing the production backend and onboarding flow. Joining the list reserves your spot for early access and product updates—no obligation.',
};

export default function HomePage() {
  const waitlist = isWaitlistOnly();
  const faqItems = waitlist ? [...faqItemsBase, faqWaitlistItem] : faqItemsBase;

  return (
    <div className="min-h-screen bg-surface">
      <header className="sticky top-0 z-50 border-b border-border bg-surface-raised/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <Link href="/" className="font-display text-xl font-semibold text-navy">
            Estora
            <span className="ml-2 text-sm font-sans font-medium text-gold">Guard</span>
          </Link>
          <nav className="hidden items-center gap-8 text-sm font-medium text-secondary md:flex" aria-label="Page sections">
            {waitlist && (
              <a href="#waitlist" className="hover:text-primary transition-colors">
                Waitlist
              </a>
            )}
            <a href="#problem" className="hover:text-primary transition-colors">
              Why Estora
            </a>
            <a href="#platform" className="hover:text-primary transition-colors">
              Platform
            </a>
            <a href="#guard" className="hover:text-primary transition-colors">
              Guard
            </a>
            <a href="#faq" className="hover:text-primary transition-colors">
              FAQ
            </a>
          </nav>
          <div className="flex shrink-0 items-center gap-3">
            {waitlist ? (
              <a href="#waitlist" className="btn-gold !h-9 !px-4 text-xs md:text-sm">
                Join waitlist
              </a>
            ) : (
              <>
                <Link href="/login" className="btn-secondary !h-9 !px-4 text-xs md:text-sm">
                  Sign in
                </Link>
                <Link href="/signup" className="btn-gold !h-9 !px-4 text-xs md:text-sm">
                  Get started
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-border">
          <div
            className="pointer-events-none absolute -right-24 top-0 h-96 w-96 rounded-full bg-gold-light/40 blur-3xl"
            aria-hidden
          />
          <div className="mx-auto grid max-w-6xl gap-12 px-6 py-16 md:grid-cols-2 md:py-24 lg:gap-16">
            <div className="flex flex-col justify-center">
              <p className="section-header mb-3 text-gold">Real estate closings, without the chaos</p>
              <h1 className="font-display text-4xl font-semibold leading-tight text-navy md:text-5xl lg:text-[2.75rem]">
                Close faster with contract intelligence and an AI agent you can actually trust
              </h1>
              <p className="mt-5 text-lg text-secondary leading-relaxed">
                {waitlist
                  ? 'We are opening early access soon. Join the waitlist for launch updates and a first look at Estora Guard—contract intelligence plus a policy-governed agent layer.'
                  : 'Turn purchase agreements into living transactions—then ask Estora Guard questions with a manifest-driven firewall, human approval for sensitive actions, and a receipt for every attempt.'}
              </p>
              {waitlist ? (
                <div id="waitlist" className="mt-8 scroll-mt-28">
                  <WaitlistForm source="landing-hero" />
                </div>
              ) : (
                <div className="mt-8 flex flex-wrap items-center gap-4">
                  <Link href="/signup" className="btn-gold gap-2">
                    Create your account
                    <ArrowRight className="h-4 w-4" strokeWidth={2} aria-hidden />
                  </Link>
                  <a href="#platform" className="btn-secondary">
                    See how it works
                  </a>
                </div>
              )}
              <ul className="mt-10 flex flex-col gap-2 text-sm text-secondary sm:flex-row sm:flex-wrap sm:gap-x-6">
                {trustPoints.map((t) => (
                  <li key={t} className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-success" strokeWidth={2} aria-hidden />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="relative flex items-center justify-center" aria-hidden>
              <div className="relative w-full max-w-md">
                <div className="card relative z-10 rotate-1 shadow-modal border-gold/20 p-5">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <span className="text-xs font-medium uppercase tracking-wider text-secondary">Agent</span>
                    <span className="badge-success">Policy: allowed</span>
                  </div>
                  <p className="text-sm text-primary leading-relaxed">
                    “Summarize this deal for the buyer’s agent and list the top three risks before closing.”
                  </p>
                  <div className="mt-4 rounded-md bg-surface-sunken p-3 font-mono text-xs text-secondary">
                    skill: read_deal_summary → receipt logged
                  </div>
                </div>
                <div className="card absolute -bottom-6 -left-4 z-0 w-[88%] -rotate-2 border-border opacity-90 p-4 shadow-card">
                  <div className="flex items-center gap-2 text-xs text-secondary">
                    <Layers className="h-4 w-4 text-gold" strokeWidth={1.5} />
                    Transaction timeline · Health 82 · 6 open tasks
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Problem / Agitation / Solution */}
        <section id="problem" className="border-b border-border bg-surface-raised">
          <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="font-display text-3xl font-semibold text-navy md:text-4xl">
                The file moves fast. Your tools do not.
              </h2>
              <p className="mt-4 text-lg text-secondary leading-relaxed">
                Critical dates live in PDFs. Risks hide in boilerplate. Teams forward threads asking for “the latest”
                wire sheet. One rushed answer at the wrong moment becomes liability—or fraud.
              </p>
              <p className="mt-6 text-lg text-primary leading-relaxed">
                <strong className="font-semibold text-navy">Estora</strong> gives you structured deal data and an always-on
                timeline. <strong className="font-semibold text-navy">Estora Guard</strong> adds an agent that can reason
                about the file—inside a policy layer designed for real-world abuse.
              </p>
            </div>
          </div>
        </section>

        {/* Platform benefits */}
        <section id="platform" className="border-b border-border">
          <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
            <div className="mb-12 max-w-2xl">
              <p className="section-header mb-2">The Estora platform</p>
              <h2 className="font-display text-3xl font-semibold text-navy md:text-4xl">
                From static PDF to a deal you can run
              </h2>
              <p className="mt-3 text-secondary leading-relaxed">
                Features tell you what we built. Benefits tell you what you get: fewer missed deadlines, clearer
                handoffs, and a defensible record when questions come later.
              </p>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              {coreBenefits.map(({ icon: Icon, title, body }) => (
                <article key={title} className="card flex flex-col gap-3 border-border transition-shadow hover:shadow-card">
                  <Icon className="h-8 w-8 text-gold" strokeWidth={1.5} aria-hidden />
                  <h3 className="font-display text-xl text-navy">{title}</h3>
                  <p className="text-sm text-secondary leading-relaxed">{body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Guard */}
        <section id="guard" className="border-b border-border bg-navy text-white">
          <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
            <div className="mb-12 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div className="max-w-2xl">
                <p className="text-xs font-medium uppercase tracking-wider text-gold-light">Estora Guard</p>
                <h2 className="mt-2 font-display text-3xl font-semibold text-white md:text-4xl">
                  Useful AI—with enforceable boundaries
                </h2>
                <p className="mt-3 text-surface-sunken leading-relaxed">
                  Every skill is declared in a manifest. Policy evaluates role, sensitivity, and attack patterns before
                  execution. Sensitive flows can require explicit approval; hard denies never bypass the human chain of
                  command.
                </p>
              </div>
              {waitlist ? (
                <a
                  href="#waitlist"
                  className="inline-flex h-field-height shrink-0 items-center justify-center gap-2 rounded-md bg-gold px-6 text-sm font-medium text-white hover:brightness-110 focus:outline-none focus:shadow-focus-gold transition-all"
                >
                  <Sparkles className="h-4 w-4" strokeWidth={2} aria-hidden />
                  Join the waitlist
                </a>
              ) : (
                <Link
                  href="/signup"
                  className="inline-flex h-field-height shrink-0 items-center justify-center gap-2 rounded-md bg-gold px-6 text-sm font-medium text-white hover:brightness-110 focus:outline-none focus:shadow-focus-gold transition-all"
                >
                  <Sparkles className="h-4 w-4" strokeWidth={2} aria-hidden />
                  Try the full flow
                </Link>
              )}
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              {guardBenefits.map(({ icon: Icon, title, body }) => (
                <article
                  key={title}
                  className="rounded-lg border border-white/15 bg-white/5 p-6 backdrop-blur-sm"
                >
                  <Icon className="h-8 w-8 text-gold-light" strokeWidth={1.5} aria-hidden />
                  <h3 className="mt-3 font-display text-xl text-white">{title}</h3>
                  <p className="mt-2 text-sm text-white/80 leading-relaxed">{body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="border-b border-border bg-surface-raised">
          <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
            <h2 className="font-display text-3xl font-semibold text-navy md:text-4xl">How your team moves through Estora</h2>
            <ol className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {steps.map(({ step, title, detail }) => (
                <li key={step} className="relative card border-border">
                  <span className="font-mono text-xs text-gold">{step}</span>
                  <h3 className="mt-2 font-display text-lg text-navy">{title}</h3>
                  <p className="mt-2 text-sm text-secondary leading-relaxed">{detail}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Final CTA + FAQ */}
        <section id="faq" className="mx-auto max-w-6xl px-6 py-16 md:py-20">
          <div className="card border-gold/25 bg-gradient-to-br from-surface-raised to-gold-light/20 p-8 md:p-10">
            {waitlist ? (
              <div className="flex flex-col gap-6">
                <div>
                  <h2 className="font-display text-2xl font-semibold text-navy md:text-3xl">
                    Get notified when we open access
                  </h2>
                  <p className="mt-2 max-w-xl text-secondary">
                    Leave your email and we will reach out when the product is ready for your team—screenshots and a
                    short demo will land in your inbox first.
                  </p>
                </div>
                <WaitlistForm source="landing-footer" className="max-w-3xl" />
              </div>
            ) : (
              <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="font-display text-2xl font-semibold text-navy md:text-3xl">
                    Ready to run the next closing with guardrails?
                  </h2>
                  <p className="mt-2 max-w-xl text-secondary">
                    Sign up, upload a contract, create a transaction, then open the agent and red-team console—without
                    breaking the core deal workflow.
                  </p>
                </div>
                <Link href="/signup" className="btn-primary shrink-0 gap-2 self-start md:self-center">
                  Get started free
                  <ArrowRight className="h-4 w-4" strokeWidth={2} aria-hidden />
                </Link>
              </div>
            )}
          </div>

          <h2 className="mt-20 font-display text-2xl font-semibold text-navy">Questions teams ask before rolling this out</h2>
          <div className="mt-8 divide-y divide-border rounded-lg border border-border bg-surface-raised">
            {faqItems.map(({ q, a }) => (
              <details key={q} className="group px-5 py-4 first:rounded-t-lg last:rounded-b-lg">
                <summary className="cursor-pointer list-none font-medium text-primary outline-none marker:content-none [&::-webkit-details-marker]:hidden">
                  <span className="flex items-center justify-between gap-4">
                    {q}
                    <ChevronDown
                      className="h-5 w-5 shrink-0 text-gold transition-transform group-open:rotate-180"
                      strokeWidth={2}
                      aria-hidden
                    />
                  </span>
                </summary>
                <p className="mt-3 text-sm text-secondary leading-relaxed">{a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-surface-sunken">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-10 md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-secondary">
            © {new Date().getFullYear()} Estora Guard. Real estate transaction intelligence with a policy-governed agent
            layer.
          </p>
          <div className="flex flex-wrap gap-4 text-sm font-medium">
            {waitlist ? (
              <a href="#waitlist" className="text-navy hover:text-navy-light">
                Join waitlist
              </a>
            ) : (
              <>
                <Link href="/login" className="text-navy hover:text-navy-light">
                  Sign in
                </Link>
                <Link href="/signup" className="text-navy hover:text-navy-light">
                  Sign up
                </Link>
              </>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
