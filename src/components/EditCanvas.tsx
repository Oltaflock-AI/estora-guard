'use client';

import { useRef } from 'react';
import {
  Lock,
  Sparkles,
  ChevronDown,
  AlertCircle,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useState } from 'react';
import { AGREEMENT_SECTIONS, type SectionDef, type FieldDef } from '@/lib/agreement-schema';
import { formatCurrency } from '@/lib/utils';

type FieldStatus = 'empty-required' | 'empty-optional' | 'valid' | 'warning' | 'error' | 'autofilled' | 'locked';

export interface FieldIssue {
  severity: 'error' | 'warning' | 'info';
  message: string;
}

interface EditCanvasProps {
  formValues: Record<string, unknown>;
  onChange: (fieldName: string, value: unknown) => void;
  fieldIssues: Record<string, FieldIssue>;
  locked: boolean;
  activeSectionId: string;
  autoFilledFields?: Set<string>;
  sectionRefs: Record<string, React.RefObject<HTMLDivElement | null>>;
}

function getFieldStatus(
  field: FieldDef,
  value: unknown,
  issue: FieldIssue | undefined,
  locked: boolean,
  autoFilled: boolean
): FieldStatus {
  if (locked) return 'locked';
  if (issue?.severity === 'error') return 'error';
  if (issue?.severity === 'warning') return 'warning';
  if (autoFilled && value !== null && value !== undefined && value !== '') return 'autofilled';

  const isEmpty =
    value === null ||
    value === undefined ||
    value === '' ||
    (typeof value === 'number' && value === 0 && field.type === 'currency');

  if (isEmpty) {
    return field.required ? 'empty-required' : 'empty-optional';
  }
  return 'valid';
}

const STATUS_BORDER: Record<FieldStatus, string> = {
  'empty-required': 'border-l-error/40',
  'empty-optional': 'border-l-border',
  valid: 'border-l-transparent',
  warning: 'border-l-warning',
  error: 'border-l-error',
  autofilled: 'border-l-info',
  locked: 'border-l-transparent',
};

function TextInput({
  field,
  value,
  status,
  issue,
  locked,
  onChange,
}: {
  field: FieldDef;
  value: string;
  status: FieldStatus;
  issue: FieldIssue | undefined;
  locked: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.label}
        disabled={locked}
        className={locked ? 'field-input-readonly w-full' : 'field-input w-full'}
      />
      {issue && status === 'error' && (
        <p className="text-[11px] text-error mt-1 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          {issue.message}
        </p>
      )}
    </div>
  );
}

function CurrencyInput({
  field,
  value,
  status,
  issue,
  locked,
  onChange,
}: {
  field: FieldDef;
  value: number;
  status: FieldStatus;
  issue: FieldIssue | undefined;
  locked: boolean;
  onChange: (v: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [raw, setRaw] = useState(String(value || ''));

  function handleFocus() {
    setEditing(true);
    setRaw(value ? String(value) : '');
  }

  function handleBlur() {
    setEditing(false);
    const n = Number(raw.replace(/[^0-9.-]/g, ''));
    onChange(isNaN(n) ? 0 : n);
  }

  const displayValue = editing ? raw : value ? formatCurrency(value) : '';

  return (
    <div>
      <input
        type="text"
        inputMode="numeric"
        value={displayValue}
        onChange={(e) => setRaw(e.target.value)}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder="$0"
        disabled={locked}
        className={`${locked ? 'field-input-readonly' : 'field-input'} w-full font-mono`}
      />
      {issue && status === 'error' && (
        <p className="text-[11px] text-error mt-1 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          {issue.message}
        </p>
      )}
    </div>
  );
}

function PercentageInput({
  field,
  value,
  locked,
  onChange,
}: {
  field: FieldDef;
  value: number;
  locked: boolean;
  onChange: (v: number) => void;
}) {
  return (
    <div className="relative">
      <input
        type="number"
        step="0.01"
        min="0"
        max="100"
        value={value || ''}
        onChange={(e) => onChange(Number(e.target.value))}
        placeholder="0.00"
        disabled={locked}
        className={`${locked ? 'field-input-readonly' : 'field-input'} w-full font-mono pr-8`}
      />
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-secondary">
        %
      </span>
    </div>
  );
}

function DateInput({
  field,
  value,
  status,
  issue,
  locked,
  onChange,
}: {
  field: FieldDef;
  value: string;
  status: FieldStatus;
  issue: FieldIssue | undefined;
  locked: boolean;
  onChange: (v: string) => void;
}) {
  const daysFromToday = value
    ? Math.ceil(
        (new Date(value).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      )
    : null;

  return (
    <div>
      <div className="flex items-center gap-2">
        <input
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={locked}
          className={`${locked ? 'field-input-readonly' : 'field-input'} w-full font-mono`}
        />
        {daysFromToday !== null && !locked && (
          <span className="text-[10px] text-secondary whitespace-nowrap flex-shrink-0">
            {daysFromToday === 0
              ? 'today'
              : daysFromToday > 0
                ? `${daysFromToday}d away`
                : `${Math.abs(daysFromToday)}d ago`}
          </span>
        )}
      </div>
      {issue && (status === 'error' || status === 'warning') && (
        <p
          className={`text-[11px] mt-1 flex items-center gap-1 ${
            status === 'error' ? 'text-error' : 'text-warning'
          }`}
        >
          <AlertCircle className="w-3 h-3" />
          {issue.message}
        </p>
      )}
    </div>
  );
}

function ToggleInput({
  field,
  value,
  locked,
  onChange,
}: {
  field: FieldDef;
  value: boolean;
  locked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      disabled={locked}
      onClick={() => onChange(!value)}
      className={`
        relative inline-flex h-6 w-11 items-center rounded-full
        transition-colors duration-200 flex-shrink-0
        ${locked ? 'opacity-50 cursor-default' : 'cursor-pointer'}
        ${value ? 'bg-gold' : 'bg-border'}
      `}
    >
      <span
        className={`
          inline-block h-4 w-4 rounded-full bg-white shadow-sm
          transition-transform duration-200
          ${value ? 'translate-x-[22px]' : 'translate-x-[3px]'}
        `}
      />
    </button>
  );
}

function DropdownInput({
  field,
  value,
  locked,
  onChange,
}: {
  field: FieldDef;
  value: string;
  locked: boolean;
  onChange: (v: string) => void;
}) {
  const options = field.options ?? [];

  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={locked}
        className={`${locked ? 'field-input-readonly' : 'field-input'} w-full appearance-none pr-8`}
      >
        <option value="">Select…</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary pointer-events-none" />
    </div>
  );
}

function TextareaInput({
  field,
  value,
  locked,
  onChange,
}: {
  field: FieldDef;
  value: string;
  locked: boolean;
  onChange: (v: string) => void;
}) {
  const maxChars = 2000;

  return (
    <div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.label}
        disabled={locked}
        rows={4}
        className={`${
          locked ? 'field-input-readonly' : 'field-input'
        } w-full resize-y min-h-[80px] !h-auto py-2`}
      />
      {!locked && (
        <div className="flex justify-end mt-0.5">
          <span
            className={`text-[10px] ${
              value.length > maxChars * 0.9 ? 'text-warning' : 'text-disabled'
            }`}
          >
            {value.length}/{maxChars}
          </span>
        </div>
      )}
    </div>
  );
}

function CalculatedInput({
  field,
  formValues,
}: {
  field: FieldDef;
  formValues: Record<string, unknown>;
}) {
  let computed = '';

  if (field.formula === 'purchase_price - downpayment_amount') {
    const price = Number(formValues.purchase_price) || 0;
    const down = Number(formValues.downpayment_amount) || 0;
    computed = price > 0 ? formatCurrency(price - down) : '—';
  }

  return (
    <div className="relative">
      <input
        type="text"
        value={computed}
        readOnly
        className="field-input-readonly w-full font-mono"
        title={field.formula ? `Formula: ${field.formula}` : undefined}
      />
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] text-disabled uppercase tracking-wider">
        auto
      </span>
    </div>
  );
}

function MaskedInput({
  field,
  value,
  locked,
  onChange,
}: {
  field: FieldDef;
  value: string;
  locked: boolean;
  onChange: (v: string) => void;
}) {
  const [revealed, setRevealed] = useState(false);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleMouseDown() {
    holdTimerRef.current = setTimeout(() => setRevealed(true), 300);
  }

  function handleMouseUp() {
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    setRevealed(false);
  }

  const maskedValue =
    value && !revealed ? value.replace(/.(?=.{4})/g, '•') : value;

  return (
    <div className="relative">
      <input
        type="text"
        value={maskedValue}
        onChange={(e) => onChange(e.target.value)}
        placeholder="•••-••-••••"
        disabled={locked}
        className={`${locked ? 'field-input-readonly' : 'field-input'} w-full font-mono pr-10`}
      />
      {value && !locked && (
        <button
          type="button"
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary hover:text-primary"
          title="Hold to reveal"
        >
          {revealed ? (
            <Eye className="w-4 h-4" />
          ) : (
            <EyeOff className="w-4 h-4" />
          )}
        </button>
      )}
    </div>
  );
}

function NumberInput({
  field,
  value,
  locked,
  onChange,
}: {
  field: FieldDef;
  value: number;
  locked: boolean;
  onChange: (v: number) => void;
}) {
  return (
    <input
      type="number"
      value={value || ''}
      onChange={(e) => onChange(Number(e.target.value))}
      placeholder="0"
      disabled={locked}
      className={`${locked ? 'field-input-readonly' : 'field-input'} w-full font-mono`}
    />
  );
}

function FieldRow({
  field,
  value,
  formValues,
  status,
  issue,
  locked,
  autoFilled,
  onChange,
}: {
  field: FieldDef;
  value: unknown;
  formValues: Record<string, unknown>;
  status: FieldStatus;
  issue: FieldIssue | undefined;
  locked: boolean;
  autoFilled: boolean;
  onChange: (v: unknown) => void;
}) {
  const borderClass = STATUS_BORDER[status];

  return (
    <div className={`border-l-[3px] ${borderClass} pl-4 py-2 transition-colors duration-150`}>
      <div className="flex items-center justify-between mb-1.5">
        <label className="field-label flex items-center gap-1.5">
          {field.label}
          {field.required && <span className="text-error">*</span>}
          {locked && <Lock className="w-3 h-3 text-disabled" />}
          {autoFilled && status === 'autofilled' && (
            <span className="badge-info !text-[8px] !py-0 !px-1.5 flex items-center gap-0.5">
              <Sparkles className="w-2.5 h-2.5" />
              Auto-filled
            </span>
          )}
        </label>
        {issue?.severity === 'warning' && (
          <span className="text-[10px] text-warning flex items-center gap-0.5">
            <AlertCircle className="w-3 h-3" />
            {issue.message}
          </span>
        )}
        {issue?.severity === 'info' && (
          <span className="text-[10px] text-info flex items-center gap-0.5">
            {issue.message}
          </span>
        )}
      </div>

      {field.type === 'text' && (
        <TextInput
          field={field}
          value={String(value ?? '')}
          status={status}
          issue={issue}
          locked={locked}
          onChange={onChange}
        />
      )}
      {field.type === 'currency' && (
        <CurrencyInput
          field={field}
          value={Number(value) || 0}
          status={status}
          issue={issue}
          locked={locked}
          onChange={onChange}
        />
      )}
      {field.type === 'percentage' && (
        <PercentageInput
          field={field}
          value={Number(value) || 0}
          locked={locked}
          onChange={onChange}
        />
      )}
      {field.type === 'date' && (
        <DateInput
          field={field}
          value={String(value ?? '')}
          status={status}
          issue={issue}
          locked={locked}
          onChange={onChange}
        />
      )}
      {field.type === 'toggle' && (
        <ToggleInput
          field={field}
          value={Boolean(value)}
          locked={locked}
          onChange={onChange}
        />
      )}
      {field.type === 'dropdown' && (
        <DropdownInput
          field={field}
          value={String(value ?? '')}
          locked={locked}
          onChange={onChange}
        />
      )}
      {field.type === 'textarea' && (
        <TextareaInput
          field={field}
          value={String(value ?? '')}
          locked={locked}
          onChange={onChange}
        />
      )}
      {field.type === 'calculated' && (
        <CalculatedInput field={field} formValues={formValues} />
      )}
      {field.type === 'masked' && (
        <MaskedInput
          field={field}
          value={String(value ?? '')}
          locked={locked}
          onChange={onChange}
        />
      )}
      {field.type === 'number' && (
        <NumberInput
          field={field}
          value={Number(value) || 0}
          locked={locked}
          onChange={onChange}
        />
      )}
    </div>
  );
}

export default function EditCanvas({
  formValues,
  onChange,
  fieldIssues,
  locked,
  activeSectionId,
  autoFilledFields = new Set(),
  sectionRefs,
}: EditCanvasProps) {
  return (
    <div className="max-w-[780px] space-y-10">
      {AGREEMENT_SECTIONS.map((section) => (
        <div
          key={section.id}
          ref={sectionRefs[section.id]}
          id={`section-${section.id}`}
        >
          <div className="flex items-center gap-2 mb-4">
            <h2 className="font-display text-lg text-navy">{section.label}</h2>
            <hr className="flex-1 border-border" />
          </div>

          <div className="space-y-1">
            {section.fields.map((field) => {
              const value = formValues[field.name];
              const issue = fieldIssues[field.name];
              const autoFilled = autoFilledFields.has(field.name);
              const status = getFieldStatus(
                field,
                value,
                issue,
                locked,
                autoFilled
              );

              return (
                <FieldRow
                  key={field.name}
                  field={field}
                  value={value}
                  formValues={formValues}
                  status={status}
                  issue={issue}
                  locked={locked}
                  autoFilled={autoFilled}
                  onChange={(v) => onChange(field.name, v)}
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
