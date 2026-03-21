'use client';

import {
  Users,
  Home,
  DollarSign,
  Landmark,
  Shield,
  CalendarDays,
  ClipboardCheck,
  FileText,
} from 'lucide-react';
import type { SectionDef } from '@/lib/agreement-schema';

const SECTION_ICONS: Record<string, typeof Users> = {
  parties: Users,
  property: Home,
  price: DollarSign,
  mortgage: Landmark,
  escrow: Shield,
  closing: CalendarDays,
  conditions: ClipboardCheck,
  riders: FileText,
};

export interface ValidationIssue {
  fieldName: string;
  sectionId: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
}

interface SectionNavigatorProps {
  sections: SectionDef[];
  activeSection: string;
  formValues: Record<string, unknown>;
  issues: ValidationIssue[];
  onSectionClick: (sectionId: string) => void;
  collapsed?: boolean;
}

function computeCompletion(
  section: SectionDef,
  values: Record<string, unknown>
): number {
  const requiredFields = section.fields.filter((f) => f.required);
  if (requiredFields.length === 0) return 100;

  const filled = requiredFields.filter((f) => {
    const v = values[f.name];
    if (v === null || v === undefined || v === '') return false;
    if (typeof v === 'number' && v === 0 && f.type === 'currency') return false;
    return true;
  });

  return Math.round((filled.length / requiredFields.length) * 100);
}

function CompletionRing({
  percent,
  size = 28,
}: {
  percent: number;
  size?: number;
}) {
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

function IssueBadge({
  errors,
  warnings,
}: {
  errors: number;
  warnings: number;
}) {
  if (errors > 0) {
    return (
      <span className="w-5 h-5 rounded-full bg-error/10 flex items-center justify-center text-[10px] font-medium text-error">
        {errors}
      </span>
    );
  }
  if (warnings > 0) {
    return (
      <span className="w-5 h-5 rounded-full bg-warning/10 flex items-center justify-center text-[10px] font-medium text-warning">
        {warnings}
      </span>
    );
  }
  return null;
}

export default function SectionNavigator({
  sections,
  activeSection,
  formValues,
  issues,
  onSectionClick,
  collapsed = false,
}: SectionNavigatorProps) {
  return (
    <nav
      className={`
        flex flex-col gap-1 sticky top-20
        ${collapsed ? 'w-14' : 'w-[240px]'}
        transition-all duration-200
      `}
    >
      {sections.map((section, idx) => {
        const Icon = SECTION_ICONS[section.id] ?? FileText;
        const isActive = activeSection === section.id;
        const completion = computeCompletion(section, formValues);
        const sectionIssues = issues.filter((i) => i.sectionId === section.id);
        const errorCount = sectionIssues.filter(
          (i) => i.severity === 'error'
        ).length;
        const warningCount = sectionIssues.filter(
          (i) => i.severity === 'warning'
        ).length;

        return (
          <button
            key={section.id}
            onClick={() => onSectionClick(section.id)}
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
            {collapsed ? (
              <Icon
                className={`w-[18px] h-[18px] flex-shrink-0 ${
                  isActive ? 'text-gold' : ''
                }`}
                strokeWidth={1.5}
              />
            ) : (
              <>
                <CompletionRing percent={completion} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] font-mono text-disabled">
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <span
                      className={`text-sm truncate ${
                        isActive ? 'font-medium' : ''
                      }`}
                    >
                      {section.label}
                    </span>
                  </div>
                  {completion < 100 && (
                    <span className="text-[10px] text-disabled">
                      {completion}% complete
                    </span>
                  )}
                </div>
                <IssueBadge errors={errorCount} warnings={warningCount} />
              </>
            )}
          </button>
        );
      })}
    </nav>
  );
}
