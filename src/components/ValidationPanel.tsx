'use client';

import { useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Info,
  ChevronRight,
  X,
  ShieldAlert,
} from 'lucide-react';
import type { ValidationIssue } from '@/components/SectionNavigator';
import { AGREEMENT_SECTIONS } from '@/lib/agreement-schema';

function isWeekend(dateStr: string): boolean {
  const d = new Date(dateStr);
  return d.getDay() === 0 || d.getDay() === 6;
}

function businessDaysBetween(from: string, to: string): number {
  const start = new Date(from);
  const end = new Date(to);
  let count = 0;
  const cursor = new Date(start);
  while (cursor < end) {
    cursor.setDate(cursor.getDate() + 1);
    if (cursor.getDay() !== 0 && cursor.getDay() !== 6) count++;
  }
  return count;
}

function daysBetween(from: string, to: string): number {
  return Math.ceil(
    (new Date(to).getTime() - new Date(from).getTime()) / (1000 * 60 * 60 * 24)
  );
}

export function runValidation(
  values: Record<string, unknown>
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  const fieldSectionMap: Record<string, string> = {};
  for (const section of AGREEMENT_SECTIONS) {
    for (const field of section.fields) {
      fieldSectionMap[field.name] = section.id;
    }
  }

  for (const section of AGREEMENT_SECTIONS) {
    for (const field of section.fields) {
      if (!field.required) continue;
      const v = values[field.name];
      const isEmpty =
        v === null ||
        v === undefined ||
        v === '' ||
        (typeof v === 'number' && v === 0 && field.type === 'currency');
      if (isEmpty) {
        issues.push({
          fieldName: field.name,
          sectionId: section.id,
          severity: 'error',
          message: `${field.label} is required`,
        });
      }
    }
  }

  const price = Number(values.purchase_price) || 0;
  if (price <= 0 && values.purchase_price !== undefined) {
    const existing = issues.find(
      (i) =>
        i.fieldName === 'purchase_price' && i.message === 'Purchase Price is required'
    );
    if (!existing) {
      issues.push({
        fieldName: 'purchase_price',
        sectionId: 'price',
        severity: 'error',
        message: 'Purchase price must be greater than $0',
      });
    }
  }

  const contractDate = String(values.contract_date ?? '');
  const closingDate = String(values.closing_date ?? '');
  const commitmentDate = String(values.commitment_date ?? '');

  if (commitmentDate && contractDate) {
    const bizDays = businessDaysBetween(contractDate, commitmentDate);
    if (bizDays < 10 && bizDays >= 0) {
      issues.push({
        fieldName: 'commitment_date',
        sectionId: 'closing',
        severity: 'warning',
        message: `Commitment date is only ${bizDays} business days from contract date`,
      });
    }
  }

  if (closingDate && contractDate) {
    const days = daysBetween(contractDate, closingDate);
    if (days < 30 && days >= 0) {
      issues.push({
        fieldName: 'closing_date',
        sectionId: 'closing',
        severity: 'warning',
        message: `Closing date is only ${days} days from contract date`,
      });
    }
  }

  if (closingDate && isWeekend(closingDate)) {
    issues.push({
      fieldName: 'closing_date',
      sectionId: 'closing',
      severity: 'warning',
      message: 'Closing date falls on a weekend',
    });
  }

  if (commitmentDate && isWeekend(commitmentDate)) {
    issues.push({
      fieldName: 'commitment_date',
      sectionId: 'closing',
      severity: 'warning',
      message: 'Commitment date falls on a weekend',
    });
  }

  const yearBuilt = Number(values.year_built) || 0;
  if (yearBuilt > 0 && yearBuilt < 1978) {
    issues.push({
      fieldName: 'year_built',
      sectionId: 'property',
      severity: 'info',
      message: 'Pre-1978 property — lead paint disclosure required',
    });
  }

  if (values.seller_not_foreign_person === false) {
    issues.push({
      fieldName: 'seller_not_foreign_person',
      sectionId: 'conditions',
      severity: 'info',
      message: 'Foreign seller — FIRPTA withholding may apply (26 U.S.C. §1445)',
    });
  }

  return issues;
}

const SEVERITY_CONFIG = {
  error: {
    label: 'Error',
    icon: AlertCircle,
    textClass: 'text-error',
    bgClass: 'bg-error/5',
    borderClass: 'border-l-error',
  },
  warning: {
    label: 'Warning',
    icon: AlertTriangle,
    textClass: 'text-warning',
    bgClass: 'bg-warning/5',
    borderClass: 'border-l-warning',
  },
  info: {
    label: 'Info',
    icon: Info,
    textClass: 'text-info',
    bgClass: 'bg-info/5',
    borderClass: 'border-l-info',
  },
};

interface ValidationPanelProps {
  issues: ValidationIssue[];
  onJumpToField: (fieldName: string, sectionId: string) => void;
  onDismiss?: (fieldName: string) => void;
}

export default function ValidationPanel({
  issues,
  onJumpToField,
  onDismiss,
}: ValidationPanelProps) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const visible = issues.filter((i) => !dismissed.has(i.fieldName));

  const errors = visible.filter((i) => i.severity === 'error');
  const warnings = visible.filter((i) => i.severity === 'warning');
  const infos = visible.filter((i) => i.severity === 'info');

  function handleDismiss(fieldName: string) {
    setDismissed((prev) => new Set(prev).add(fieldName));
    onDismiss?.(fieldName);
  }

  return (
    <div className="w-[280px] sticky top-20 space-y-4">
      {/* Summary header */}
      <div className="card !p-3">
        <div className="flex items-center gap-2 mb-2">
          <ShieldAlert className="w-4 h-4 text-navy" strokeWidth={1.5} />
          <h3 className="text-xs font-medium text-navy uppercase tracking-wider">
            Validation
          </h3>
        </div>
        <div className="flex items-center gap-3 text-[11px] font-mono">
          {errors.length > 0 && (
            <span className="text-error">{errors.length} error{errors.length !== 1 ? 's' : ''}</span>
          )}
          {warnings.length > 0 && (
            <span className="text-warning">{warnings.length} warning{warnings.length !== 1 ? 's' : ''}</span>
          )}
          {infos.length > 0 && (
            <span className="text-info">{infos.length} note{infos.length !== 1 ? 's' : ''}</span>
          )}
          {visible.length === 0 && (
            <span className="text-success">All clear</span>
          )}
        </div>
      </div>

      {/* Issue list */}
      <div className="space-y-1.5 max-h-[calc(100vh-200px)] overflow-y-auto">
        {[...errors, ...warnings, ...infos].map((issue, idx) => {
          const config = SEVERITY_CONFIG[issue.severity];
          const Icon = config.icon;
          const canDismiss = issue.severity !== 'error';

          return (
            <div
              key={`${issue.fieldName}-${idx}`}
              className={`
                border-l-[3px] ${config.borderClass} ${config.bgClass}
                rounded-r-md px-3 py-2 group
              `}
            >
              <div className="flex items-start justify-between gap-1">
                <div className="flex items-start gap-1.5 min-w-0 flex-1">
                  <Icon className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${config.textClass}`} />
                  <div className="min-w-0">
                    <p className="text-[11px] text-primary leading-tight">
                      {issue.message}
                    </p>
                    <button
                      onClick={() => onJumpToField(issue.fieldName, issue.sectionId)}
                      className="text-[10px] text-secondary hover:text-gold flex items-center gap-0.5 mt-0.5"
                    >
                      Jump to field <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                {canDismiss && (
                  <button
                    onClick={() => handleDismiss(issue.fieldName)}
                    className="opacity-0 group-hover:opacity-100 text-secondary hover:text-primary p-0.5 transition-opacity"
                    title="Dismiss"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
