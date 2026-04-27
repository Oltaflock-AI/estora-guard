'use client';

import { useMemo, useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { FileText, AlertTriangle, AlertCircle, Info, CheckCircle } from 'lucide-react';
import {
  sectionsForKind,
  readableKind,
  type DisclosureSection,
} from '@/lib/disclosure-sections';
import type { RiskFlag } from '@/lib/types';

interface ExtractionRow {
  id: string;
  field_name: string;
  field_value: string | null;
  confidence: number | null;
  page_ref: number | null;
}

interface DisclosureViewerProps {
  documentId: string;
  filename: string;
  status: string;
  extractions: ExtractionRow[];
  riskFlags: RiskFlag[];
}

interface SectionGroup {
  section: DisclosureSection | null;
  fields: ExtractionRow[];
}

function CompletionRing({ percent, size = 28 }: { percent: number; size?: number }) {
  const strokeWidth = 2.5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  let strokeColor = 'var(--color-border)';
  if (percent >= 100) strokeColor = 'var(--color-success)';
  else if (percent > 0) strokeColor = 'var(--color-gold)';

  return (
    <svg width={size} height={size} className="flex-shrink-0 -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="var(--color-border)"
        strokeWidth={strokeWidth}
        opacity={0.3}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        className="transition-all duration-500"
      />
    </svg>
  );
}

const SEVERITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };
const SEVERITY_BADGE: Record<string, { label: string; cls: string; Icon: typeof AlertCircle }> = {
  high: { label: 'HIGH', cls: 'badge-error', Icon: AlertCircle },
  medium: { label: 'MED', cls: 'badge-warning', Icon: AlertTriangle },
  low: { label: 'LOW', cls: 'badge-info', Icon: Info },
};

export default function DisclosureViewer({
  documentId,
  filename,
  status,
  extractions,
  riskFlags,
}: DisclosureViewerProps) {
  const documentKind =
    extractions.find((e) => e.field_name === 'document_kind')?.field_value ?? null;

  const sections = sectionsForKind(documentKind);
  const kindLabel = readableKind(documentKind);

  // Group extractions by section. Anything not claimed lands in a synthetic
  // "Other extracted fields" group at the bottom so nothing is lost.
  const groups: SectionGroup[] = useMemo(() => {
    if (!sections) {
      return [{ section: null, fields: extractions }];
    }
    const claimed = new Set<string>();
    const result: SectionGroup[] = sections.map((section) => {
      const fields: ExtractionRow[] = [];
      for (const fieldName of section.fieldNames) {
        const ext = extractions.find((e) => e.field_name === fieldName);
        if (ext) {
          fields.push(ext);
          claimed.add(ext.id);
        }
      }
      return { section, fields };
    });
    const leftover = extractions.filter((e) => !claimed.has(e.id));
    if (leftover.length > 0) {
      result.push({ section: null, fields: leftover });
    }
    return result.filter((g) => g.fields.length > 0);
  }, [sections, extractions]);

  const sectionsForNav = groups.map((g, i) => {
    const extracted = g.fields.length;
    const expected = g.section ? g.section.fieldNames.length : extracted;
    const percent = expected === 0 ? 100 : Math.min(100, Math.round((extracted / expected) * 100));
    return {
      id: g.section ? g.section.id : `_other_${i}`,
      label: g.section ? g.section.label : 'Other extracted fields',
      paragraph: g.section?.paragraph,
      count: extracted,
      percent,
    };
  });

  const [activeSectionId, setActiveSectionId] = useState<string>(
    sectionsForNav[0]?.id ?? ''
  );

  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    if (!sectionsForNav[0]) return;
    setActiveSectionId(sectionsForNav[0].id);
    // sectionsForNav identity changes on every render; keying off length avoids loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionsForNav.length, documentId]);

  function handleNavClick(sectionId: string) {
    setActiveSectionId(sectionId);
    const el = sectionRefs.current[sectionId];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  const sortedFlags = useMemo(
    () =>
      [...riskFlags].sort((a, b) => {
        if (a.acknowledged !== b.acknowledged) return a.acknowledged ? 1 : -1;
        return (SEVERITY_ORDER[a.severity] ?? 1) - (SEVERITY_ORDER[b.severity] ?? 1);
      }),
    [riskFlags]
  );

  return (
    <div className="flex min-h-[calc(100vh-180px)]">
      {/* Left rail — section navigator (matches AOS sidebar) */}
      <aside className="hidden lg:block flex-shrink-0 border-r border-border p-4 w-[260px]">
        <div className="mb-4">
          <p className="text-[10px] font-mono uppercase tracking-wider text-secondary mb-1">
            Read-only
          </p>
          <h3 className="text-sm font-medium text-navy leading-tight">{kindLabel}</h3>
        </div>
        <nav className="flex flex-col gap-1">
          {sectionsForNav.map((s, i) => {
            const isActive = s.id === activeSectionId;
            return (
              <button
                key={s.id}
                onClick={() => handleNavClick(s.id)}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg text-left
                  transition-all duration-150
                  ${
                    isActive
                      ? 'bg-surface-raised shadow-card border border-gold/20 text-navy'
                      : 'text-secondary hover:bg-surface-raised hover:text-primary'
                  }
                `}
              >
                <CompletionRing percent={s.percent} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] font-mono text-disabled">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className={`text-sm truncate ${isActive ? 'font-medium' : ''}`}>
                      {s.label}
                    </span>
                  </div>
                  <span className="block text-[10px] text-disabled leading-tight">
                    {s.paragraph ?? (s.percent < 100 ? `${s.percent}% complete` : 'Complete')}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-disabled flex-shrink-0">
                  {s.count}
                </span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Center — header + grouped extracted fields, read-only */}
      <main className="flex-1 overflow-y-auto px-4 lg:px-8 py-6 max-w-3xl">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="w-4 h-4 text-secondary" />
            <h2 className="text-base font-medium text-navy">{filename}</h2>
            <span
              className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded ${
                status === 'done'
                  ? 'bg-green-50 text-success'
                  : status === 'processing'
                    ? 'bg-amber-50 text-warning'
                    : status === 'failed'
                      ? 'bg-red-50 text-error'
                      : 'bg-surface-sunken text-secondary'
              }`}
            >
              {status}
            </span>
          </div>
          <p className="text-xs text-secondary">
            {kindLabel} · Read-only · Extracted by Estora
          </p>
          <p className="text-xs text-secondary mt-2">
            For the raw per-field extraction page,{' '}
            <Link
              href={`/dashboard/documents/${documentId}`}
              className="text-navy underline underline-offset-2 hover:text-navy-light"
            >
              open the full extraction view →
            </Link>
          </p>
        </div>

        {groups.map((group, idx) => {
          const navId = sectionsForNav[idx]?.id ?? `_group_${idx}`;
          return (
            <section
              key={navId}
              ref={(el) => {
                sectionRefs.current[navId] = el;
              }}
              className="mb-8"
            >
              <div className="mb-3 pb-2 border-b border-border">
                <h3 className="text-sm font-display text-navy">
                  {group.section ? group.section.label : 'Other extracted fields'}
                </h3>
                {group.section?.paragraph && (
                  <p className="text-[10px] font-mono text-secondary tracking-wider uppercase mt-0.5">
                    {group.section.paragraph}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                {group.fields.map((ext) => (
                  <div
                    key={ext.id}
                    className="card !py-3 !px-4 flex items-start gap-4"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-mono uppercase text-secondary tracking-wider mb-0.5">
                        {ext.field_name.replace(/_/g, ' ')}
                      </p>
                      <p className="text-sm text-primary font-medium break-words">
                        {ext.field_value ?? <span className="text-disabled italic">—</span>}
                      </p>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      {ext.confidence !== null && (
                        <span
                          className={`text-[10px] font-mono ${
                            ext.confidence >= 0.8
                              ? 'text-success'
                              : ext.confidence >= 0.5
                                ? 'text-warning'
                                : 'text-error'
                          }`}
                        >
                          {Math.round(ext.confidence * 100)}%
                        </span>
                      )}
                      {ext.page_ref !== null && (
                        <p className="text-[10px] text-disabled font-mono">p.{ext.page_ref}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </main>

      {/* Right rail — risk flags lifted from THIS document */}
      <aside className="hidden lg:block flex-shrink-0 border-l border-border p-4 w-[300px]">
        <div className="mb-4">
          <h3 className="text-sm font-medium text-navy leading-tight">Risks from this document</h3>
          <p className="text-[10px] text-secondary mt-1">
            Flags Estora pulled from {kindLabel.toLowerCase()}.
          </p>
        </div>

        {sortedFlags.length === 0 ? (
          <div className="text-center py-6">
            <CheckCircle className="w-6 h-6 text-success mx-auto mb-2" strokeWidth={1.5} />
            <p className="text-xs text-secondary">No risk flags from this document.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sortedFlags.map((flag) => {
              const cfg = SEVERITY_BADGE[flag.severity] ?? SEVERITY_BADGE.medium;
              const Icon = cfg.Icon;
              return (
                <div
                  key={flag.id}
                  className={`
                    border-l-4 ${
                      flag.severity === 'high'
                        ? 'border-l-error'
                        : flag.severity === 'medium'
                          ? 'border-l-warning'
                          : 'border-l-info'
                    }
                    bg-surface-raised rounded-r-md px-3 py-2
                    ${flag.acknowledged ? 'opacity-60' : ''}
                  `}
                >
                  <div className="flex items-start gap-2">
                    <Icon
                      className="w-3.5 h-3.5 mt-0.5 flex-shrink-0"
                      style={{
                        color:
                          flag.severity === 'high'
                            ? 'var(--color-error)'
                            : flag.severity === 'medium'
                              ? 'var(--color-warning)'
                              : 'var(--color-info)',
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <span className={`${cfg.cls} !text-[9px]`}>{cfg.label}</span>
                      <p className="text-xs font-medium text-primary leading-tight mt-1">
                        {flag.title}
                      </p>
                      <p className="text-[11px] text-secondary leading-relaxed mt-1">
                        {flag.explanation}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </aside>
    </div>
  );
}
