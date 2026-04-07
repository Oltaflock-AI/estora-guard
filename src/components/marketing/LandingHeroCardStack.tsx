'use client';

import { useEffect, useState } from 'react';

/** Longer interval = fewer React updates; tab-hidden pauses entirely. */
const ROTATE_MS = 6000;
const SLIDE_COUNT = 2;

function stackTransform(pos: number): string {
  if (pos === 0) {
    return 'translateX(-50%) translateY(0) scale(1) rotate(1deg)';
  }
  return 'translateX(-50%) translateY(12px) scale(0.96) rotate(-1deg)';
}

function stackZIndex(pos: number): number {
  return pos === 0 ? 20 : 10;
}

function DealHealthRiskCard({
  animateEntrance,
}: {
  animateEntrance: boolean;
}) {
  const barClass = animateEntrance
    ? 'landing-timeline-bar w-full'
    : 'landing-timeline-bar landing-timeline-bar--static w-full';
  const blurClass = animateEntrance
    ? 'landing-timeline-blur landing-timeline-rows space-y-2'
    : 'landing-timeline-blur--static landing-timeline-rows space-y-2';
  const riskClass = animateEntrance
    ? 'landing-risk-flag relative -mt-14 rounded-lg border border-error/25 bg-surface-raised p-3 shadow-card'
    : 'landing-risk-flag--static relative -mt-14 rounded-lg border border-error/25 bg-surface-raised p-3 shadow-card';

  return (
    <>
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="font-mono text-[11px] uppercase tracking-wider text-secondary">Deal health</span>
        <span className="rounded-full border border-gold/30 bg-gold-light/50 px-2.5 py-0.5 font-mono text-xs font-medium text-navy">
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

    let intervalId: number | undefined;

    const step = () => setActive((i) => (i + 1) % SLIDE_COUNT);

    const start = () => {
      if (intervalId != null) return;
      intervalId = window.setInterval(step, ROTATE_MS);
    };

    const stop = () => {
      if (intervalId != null) {
        window.clearInterval(intervalId);
        intervalId = undefined;
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        stop();
      } else {
        start();
      }
    };

    if (document.visibilityState === 'visible') {
      start();
    }
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [motionOk]);

  if (!motionOk) {
    return (
      <div className="relative w-full max-w-[400px]">
        <div className="landing-mock-enter relative z-10">
          <div className="card rotate-1 border-gold/25 p-5 shadow-modal">
            <DealHealthRiskCard animateEntrance={false} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-[400px]">
      <div
        className="landing-mock-enter relative z-10 mx-auto min-h-[260px] w-full max-w-[380px]"
        style={{ contain: 'layout' }}
      >
        <div className="relative min-h-[260px] w-full">
          {[0, 1].map((slideIndex) => {
            const pos = (slideIndex - active + SLIDE_COUNT) % SLIDE_COUNT;
            const isFront = pos === 0;
            return (
              <div
                key={slideIndex}
                className="pointer-events-none absolute left-1/2 top-0 w-full max-w-[380px] origin-top"
                style={{
                  zIndex: stackZIndex(pos),
                  transform: stackTransform(pos),
                  opacity: isFront ? 1 : 0.88,
                  transition: 'transform 0.5s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.5s ease',
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
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
