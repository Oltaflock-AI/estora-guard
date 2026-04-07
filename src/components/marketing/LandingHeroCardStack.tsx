'use client';

import { useEffect, useState } from 'react';

const ROTATE_MS = 4800;
const SLIDE_COUNT = 3;

function stackTransform(pos: number): string {
  switch (pos) {
    case 0:
      return 'translateX(-50%) translateY(0) scale(1) rotate(1deg)';
    case 1:
      return 'translateX(-50%) translateY(14px) scale(0.96) rotate(-1.2deg)';
    case 2:
      return 'translateX(-50%) translateY(28px) scale(0.91) rotate(1.8deg)';
    default:
      return 'translateX(-50%) translateY(0) scale(1) rotate(0deg)';
  }
}

function stackZIndex(pos: number): number {
  return 30 - pos * 10;
}

function stackOpacity(pos: number): number {
  if (pos === 0) return 1;
  if (pos === 1) return 0.9;
  return 0.76;
}

function BackCard() {
  return (
    <div className="landing-mock-back-card card absolute -bottom-6 -left-4 z-0 w-[88%] -rotate-2 border-border p-4 shadow-card">
      <p className="text-xs text-secondary">Timeline · Tasks · Health at a glance</p>
      <div className="mt-3 flex gap-1.5">
        <span className="landing-back-pulse h-1.5 w-1.5 shrink-0 rounded-full bg-gold/60" />
        <span className="h-1.5 w-8 shrink-0 rounded-full bg-gold/25" />
        <span className="h-1.5 w-12 shrink-0 rounded-full bg-border" />
      </div>
    </div>
  );
}

function DealHealthRiskCard({
  animateEntrance,
}: {
  animateEntrance: boolean;
}) {
  const barClass = animateEntrance ? 'landing-timeline-bar w-full' : 'landing-timeline-bar landing-timeline-bar--static w-full';
  const blurClass = animateEntrance ? 'landing-timeline-blur landing-timeline-rows space-y-2' : 'landing-timeline-blur--static landing-timeline-rows space-y-2';
  const riskClass = animateEntrance
    ? 'landing-risk-flag relative -mt-14 rounded-lg border border-error/25 bg-surface-raised p-3 shadow-card'
    : 'landing-risk-flag--static relative -mt-14 rounded-lg border border-error/25 bg-surface-raised p-3 shadow-card';

  return (
    <>
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="font-mono text-[11px] uppercase tracking-wider text-secondary">Deal health</span>
        <span className="landing-health-score rounded-full border border-gold/30 bg-gold-light/50 px-2.5 py-0.5 font-mono text-xs font-medium text-navy">
          74 / 100
        </span>
      </div>
      <div className={blurClass}>
        <div className="landing-timeline-track w-full">
          <div className={barClass} />
        </div>
        <div className="landing-timeline-track w-[88%]">
          <div className={barClass} />
        </div>
        <div className="landing-timeline-track w-[72%]">
          <div className={barClass} />
        </div>
      </div>
      <div className={riskClass}>
        <p className="font-mono text-[11px] uppercase tracking-wider text-error">Risk flag</p>
        <p className="mt-1 font-display text-sm font-semibold text-navy">
          HIGH — Missing contingency removal date
        </p>
      </div>
    </>
  );
}

function MediumRiskCard() {
  return (
    <>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="font-mono text-[11px] uppercase tracking-wider text-secondary">Risk flag</span>
        <span className="rounded-full border border-warning/35 bg-amber-50 px-2.5 py-0.5 font-mono text-xs font-medium text-warning">
          MEDIUM
        </span>
      </div>
      <p className="font-display text-lg font-semibold leading-snug text-navy">
        Inspection window closes in 3 business days
      </p>
      <p className="mt-3 text-sm leading-relaxed text-secondary">
        Clause 12(b) — buyer notice required. Linked to page 7 of the purchase agreement.
      </p>
      <div className="mt-4 flex items-center gap-2 border-t border-border pt-3">
        <span className="h-2 w-2 shrink-0 rounded-full bg-warning" />
        <span className="text-xs text-secondary">Awaiting coordinator acknowledgment</span>
      </div>
    </>
  );
}

function MilestoneCard({ emphasize }: { emphasize: boolean }) {
  return (
    <>
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="font-mono text-[11px] uppercase tracking-wider text-gold">Next milestone</span>
        <span className="rounded-full border border-gold/35 bg-gold-light/40 px-2.5 py-0.5 font-mono text-xs font-medium text-navy">
          Due soon
        </span>
      </div>
      <p className="font-display text-lg font-semibold text-navy">Clear to close package</p>
      <p className="mt-2 text-sm text-secondary">Title commitment review + lender checklist</p>
      <div className="mt-5 space-y-2">
        <div className="flex justify-between text-xs text-secondary">
          <span>Progress</span>
          <span className="font-mono text-navy">62%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-surface-sunken">
          <div
            className={`h-full rounded-full bg-gradient-to-r from-gold to-gold/50 ${emphasize ? 'transition-all duration-700 ease-out' : ''}`}
            style={{ width: '62%' }}
          />
        </div>
      </div>
      <p className="mt-4 font-mono text-[11px] text-disabled">Est. completion · 12 days to closing</p>
    </>
  );
}

export default function LandingHeroCardStack() {
  const [active, setActive] = useState(0);
  const [motionOk, setMotionOk] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setMotionOk(!mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (!motionOk) return;
    const id = window.setInterval(() => {
      setActive((i) => (i + 1) % SLIDE_COUNT);
    }, ROTATE_MS);
    return () => window.clearInterval(id);
  }, [motionOk]);

  if (!motionOk) {
    return (
      <div className="relative w-full max-w-[400px]">
        <BackCard />
        <div className="landing-mock-enter relative z-10 mt-2">
          <div className="card rotate-1 border-gold/25 p-5 shadow-modal">
            <DealHealthRiskCard animateEntrance={false} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-[400px]">
      <BackCard />

      <div className="landing-mock-enter relative z-10 mx-auto min-h-[300px] w-full max-w-[380px]">
        <div className="landing-mock-float">
          <div className="relative min-h-[280px] w-full" style={{ perspective: '1000px' }}>
            {[0, 1, 2].map((slideIndex) => {
              const pos = (slideIndex - active + SLIDE_COUNT) % SLIDE_COUNT;
              const isFront = pos === 0;
              const transition =
                'transform 0.75s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.75s ease, filter 0.75s ease';

              return (
                <div
                  key={slideIndex}
                  className="pointer-events-none absolute left-1/2 top-0 w-full max-w-[380px] origin-top"
                  style={{
                    zIndex: stackZIndex(pos),
                    transform: stackTransform(pos),
                    opacity: stackOpacity(pos),
                    transition,
                    filter: pos >= 2 ? 'blur(0.35px)' : 'none',
                  }}
                >
                  <div className={`card border-gold/25 p-5 ${isFront ? 'shadow-modal' : 'shadow-card'}`}>
                    {slideIndex === 0 && (
                      <DealHealthRiskCard
                        key={isFront ? 'deal-front' : 'deal-back'}
                        animateEntrance={isFront}
                      />
                    )}
                    {slideIndex === 1 && <MediumRiskCard />}
                    {slideIndex === 2 && <MilestoneCard emphasize={isFront} />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-5 flex justify-center gap-1.5" aria-hidden>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === active ? 'w-5 bg-gold' : 'w-1.5 bg-border'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
