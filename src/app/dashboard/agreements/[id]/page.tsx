'use client';

import { useEffect, useState, useCallback, useRef, createRef, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Loader2,
  AlertTriangle,
  Save,
  Check,
  Clock,
  MoreHorizontal,
  Keyboard,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { AGREEMENT_SECTIONS } from '@/lib/agreement-schema';
import SectionNavigator from '@/components/SectionNavigator';
import EditCanvas from '@/components/EditCanvas';
import ValidationPanel, { runValidation } from '@/components/ValidationPanel';
import AuditTrail from '@/components/AuditTrail';
import { StatusBadge } from '@/components/ui/Badge';
import { formatAddress, formatRelativeTime } from '@/lib/utils';
import type {
  ContractWithRelations,
  ContractMortgage,
  ContractEscrow,
  ContractStatus,
} from '@/lib/types';
import WireFraudBanner from '@/components/security/WireFraudBanner';
import ClosingProximityFlag from '@/components/security/ClosingProximityFlag';
import MobileReadOnlyGuard from '@/components/MobileReadOnlyGuard';
import { isContractLocked, lockdownMessage } from '@/lib/contract-lockdown';
import type { FieldIssue } from '@/components/EditCanvas';
import type { ValidationIssue } from '@/components/SectionNavigator';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

const SELLER_FIELD_MAP: Record<string, string> = {
  seller_first_name: 'first_name',
  seller_last_name: 'last_name',
  seller_email: 'email',
  seller_phone: 'phone',
  seller_city: 'city',
  seller_masked_tax_id: 'masked_tax_id',
};

const PURCHASER_FIELD_MAP: Record<string, string> = {
  purchaser_first_name: 'first_name',
  purchaser_last_name: 'last_name',
  purchaser_email: 'email',
  purchaser_phone: 'phone',
  purchaser_city: 'city',
  purchaser_masked_tax_id: 'masked_tax_id',
};

const PROPERTY_FIELDS = new Set([
  'street_1', 'street_2', 'city', 'county', 'postal_code',
  'property_type', 'bedrooms', 'bathrooms', 'year_built',
  'legal_description', 'has_public_road_access', 'delivered_vacant', 'as_is_sale',
]);

const CONTRACT_FIELDS = new Set([
  'purchase_price', 'downpayment_amount', 'balance_due_at_closing',
  'acceptable_funds', 'subject_to_mortgage_contingency',
  'contract_date', 'closing_date', 'commitment_date', 'title_company_name',
  'seller_has_right_to_sell', 'seller_not_foreign_person',
  'no_undisclosed_abatements', 'title_insurable', 'premises_broom_clean',
  'systems_in_working_order', 'smoke_detector_affidavit_required',
  'certificate_of_occupancy_required', 'firpta_cert_required', 'notes',
]);

function flattenContract(
  contract: ContractWithRelations,
  _mortgages: ContractMortgage[],
  _escrow: ContractEscrow | null
): Record<string, unknown> {
  const vals: Record<string, unknown> = {};

  vals.seller_first_name = contract.seller.first_name;
  vals.seller_last_name = contract.seller.last_name;
  vals.seller_email = contract.seller.email;
  vals.seller_phone = contract.seller.phone;
  vals.seller_city = contract.seller.city;
  vals.seller_masked_tax_id = contract.seller.masked_tax_id;

  vals.purchaser_first_name = contract.purchaser.first_name;
  vals.purchaser_last_name = contract.purchaser.last_name;
  vals.purchaser_email = contract.purchaser.email;
  vals.purchaser_phone = contract.purchaser.phone;
  vals.purchaser_city = contract.purchaser.city;
  vals.purchaser_masked_tax_id = contract.purchaser.masked_tax_id;

  if (contract.seller_attorney) {
    vals.seller_attorney = `${contract.seller_attorney.first_name} ${contract.seller_attorney.last_name}`;
  }
  if (contract.purchaser_attorney) {
    vals.purchaser_attorney = `${contract.purchaser_attorney.first_name} ${contract.purchaser_attorney.last_name}`;
  }

  vals.street_1 = contract.property.street_1;
  vals.street_2 = contract.property.street_2;
  vals.city = contract.property.city;
  vals.county = contract.property.county;
  vals.postal_code = contract.property.postal_code;
  vals.property_type = contract.property.property_type;
  vals.bedrooms = contract.property.bedrooms;
  vals.bathrooms = contract.property.bathrooms;
  vals.year_built = contract.property.year_built;
  vals.legal_description = contract.property.legal_description;
  vals.has_public_road_access = contract.property.has_public_road_access;
  vals.delivered_vacant = contract.property.delivered_vacant;
  vals.as_is_sale = contract.property.as_is_sale;

  vals.purchase_price = contract.purchase_price;
  vals.downpayment_amount = contract.downpayment_amount;
  vals.balance_due_at_closing = contract.balance_due_at_closing;
  vals.acceptable_funds = contract.acceptable_funds;

  vals.subject_to_mortgage_contingency = contract.subject_to_mortgage_contingency;
  vals.contract_date = contract.contract_date;
  vals.closing_date = contract.closing_date;
  vals.commitment_date = contract.commitment_date;
  vals.title_company_name = contract.title_company_name;

  vals.seller_has_right_to_sell = contract.seller_has_right_to_sell;
  vals.seller_not_foreign_person = contract.seller_not_foreign_person;
  vals.no_undisclosed_abatements = contract.no_undisclosed_abatements;
  vals.title_insurable = contract.title_insurable;
  vals.premises_broom_clean = contract.premises_broom_clean;
  vals.systems_in_working_order = contract.systems_in_working_order;
  vals.smoke_detector_affidavit_required = contract.smoke_detector_affidavit_required;
  vals.certificate_of_occupancy_required = contract.certificate_of_occupancy_required;
  vals.firpta_cert_required = contract.firpta_cert_required;
  vals.notes = contract.notes;

  if (_mortgages.length > 0) {
    const m = _mortgages[0];
    vals.mortgage_type = m.mortgage_type;
    vals.lender_name = m.lender_name;
    vals.principal_amount = m.principal_amount;
    vals.interest_rate = m.interest_rate;
    vals.monthly_payment = m.monthly_payment;
    vals.escrow_required = m.escrow_required;
    vals.commitment_received = m.commitment_received;
    vals.commitment_received_date = m.commitment_received_date;
  }

  if (_escrow) {
    const agent = (_escrow as Record<string, unknown>).agent as { first_name: string; last_name: string } | null;
    vals.escrow_agent = agent ? `${agent.first_name} ${agent.last_name}` : '';
    vals.bank_name = _escrow.bank_name;
    vals.account_reference = _escrow.account_reference;
    vals.amount_held = _escrow.amount_held;
    vals.segregated_account = _escrow.segregated_account;
  }

  return vals;
}

function ValidationIconBar({ issues }: { issues: Array<{ severity: string }> }) {
  const errors = issues.filter((i) => i.severity === 'error').length;
  const warnings = issues.filter((i) => i.severity === 'warning').length;
  const infos = issues.filter((i) => i.severity === 'info').length;

  return (
    <>
      {errors > 0 && (
        <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center" title={`${errors} error(s)`}>
          <span className="text-[10px] font-mono font-medium text-error">{errors}</span>
        </div>
      )}
      {warnings > 0 && (
        <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center" title={`${warnings} warning(s)`}>
          <span className="text-[10px] font-mono font-medium text-warning">{warnings}</span>
        </div>
      )}
      {infos > 0 && (
        <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center" title={`${infos} note(s)`}>
          <span className="text-[10px] font-mono font-medium text-info">{infos}</span>
        </div>
      )}
      {errors === 0 && warnings === 0 && infos === 0 && (
        <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center" title="No issues">
          <Check className="w-4 h-4 text-success" />
        </div>
      )}
    </>
  );
}

function ProgressBar({
  sections,
  formValues,
  activeSection,
}: {
  sections: typeof AGREEMENT_SECTIONS;
  formValues: Record<string, unknown>;
  activeSection: string;
}) {
  return (
    <div className="hidden xl:flex items-center gap-0.5">
      {sections.map((s, idx) => {
        const requiredFields = s.fields.filter((f) => f.required);
        const filled = requiredFields.filter((f) => {
          const v = formValues[f.name];
          return v !== null && v !== undefined && v !== '';
        });
        const pct =
          requiredFields.length > 0
            ? Math.round((filled.length / requiredFields.length) * 100)
            : 100;
        const isActive = s.id === activeSection;

        return (
          <div key={s.id} className="flex items-center">
            <div
              className={`
                w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-mono
                transition-all duration-200
                ${
                  pct >= 100
                    ? 'bg-success/10 text-success'
                    : isActive
                      ? 'bg-gold/10 text-gold border border-gold/30'
                      : 'bg-surface-sunken text-disabled'
                }
              `}
              title={`${s.label}: ${pct}%`}
            >
              {pct >= 100 ? <Check className="w-3 h-3" /> : idx + 1}
            </div>
            {idx < sections.length - 1 && (
              <div
                className={`w-4 h-px ${
                  pct >= 100 ? 'bg-success/30' : 'bg-border'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function SaveIndicator({ state, timestamp }: { state: SaveState; timestamp: string | null }) {
  if (state === 'saving') {
    return (
      <span className="flex items-center gap-1.5 text-xs text-gold">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        Saving…
      </span>
    );
  }
  if (state === 'saved') {
    return (
      <span className="flex items-center gap-1.5 text-xs text-success">
        <Check className="w-3.5 h-3.5" />
        Saved just now
      </span>
    );
  }
  if (state === 'error') {
    return (
      <span className="flex items-center gap-1.5 text-xs text-error">
        <AlertTriangle className="w-3.5 h-3.5" />
        Save failed
      </span>
    );
  }
  if (timestamp) {
    return (
      <span className="flex items-center gap-1.5 text-xs text-secondary">
        <Clock className="w-3.5 h-3.5" />
        {formatRelativeTime(timestamp)}
      </span>
    );
  }
  return null;
}

export default function AgreementWorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const contractId = params.id as string;

  const [pageState, setPageState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [contract, setContract] = useState<ContractWithRelations | null>(null);
  const [formValues, setFormValues] = useState<Record<string, unknown>>({});
  const [lastSaved, setLastSaved] = useState<Record<string, unknown>>({});
  const [activeSection, setActiveSection] = useState('parties');
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [navCollapsed, setNavCollapsed] = useState(false);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sectionRefs = useMemo(() => {
    const refs: Record<string, React.RefObject<HTMLDivElement | null>> = {};
    for (const s of AGREEMENT_SECTIONS) {
      refs[s.id] = createRef<HTMLDivElement>();
    }
    return refs;
  }, []);

  useEffect(() => {
    async function load() {
      const supabase = createClient();

      const { data: cRow, error: cErr } = await supabase
        .from('contracts')
        .select(`
          *,
          property:properties!property_id(*),
          seller:people!seller_id(*),
          purchaser:people!purchaser_id(*),
          seller_attorney:people!seller_attorney_id(*),
          purchaser_attorney:people!purchaser_attorney_id(*)
        `)
        .eq('id', contractId)
        .single();

      if (cErr || !cRow) {
        setPageState('error');
        return;
      }

      const contractData = cRow as unknown as ContractWithRelations;
      setContract(contractData);

      const { data: mRows } = await supabase
        .from('contract_mortgages')
        .select('*')
        .eq('contract_id', contractId);

      const { data: eRow } = await supabase
        .from('contract_escrow')
        .select('*, agent:people!escrow_agent_id(first_name, last_name)')
        .eq('contract_id', contractId)
        .maybeSingle();

      const flat = flattenContract(
        contractData,
        (mRows ?? []) as ContractMortgage[],
        (eRow as ContractEscrow | null) ?? null
      );
      setFormValues(flat);
      setLastSaved(flat);
      setLastSavedAt(contractData.updated_at);
      setPageState('ready');
    }

    load();
  }, [contractId]);

  const issues = useMemo(() => runValidation(formValues), [formValues]);

  const fieldIssues = useMemo(() => {
    const map: Record<string, FieldIssue> = {};
    for (const issue of issues) {
      if (!map[issue.fieldName] || issue.severity === 'error') {
        map[issue.fieldName] = {
          severity: issue.severity,
          message: issue.message,
        };
      }
    }
    return map;
  }, [issues]);

  const isLocked = contract ? isContractLocked(contract.status as ContractStatus) : false;

  const performSave = useCallback(async (valuesToSave: Record<string, unknown>, baseValues: Record<string, unknown>) => {
    setSaveState('saving');

    const changes: Array<{ fieldName: string; oldValue: string | null; newValue: string | null }> = [];
    const contractFields: Record<string, unknown> = {};
    const sellerFields: Record<string, unknown> = {};
    const purchaserFields: Record<string, unknown> = {};
    const propertyFields: Record<string, unknown> = {};

    for (const [key, newVal] of Object.entries(valuesToSave)) {
      const oldVal = baseValues[key];
      if (newVal === oldVal) continue;
      if (newVal === '' && (oldVal === null || oldVal === undefined)) continue;

      changes.push({
        fieldName: key,
        oldValue: oldVal != null ? String(oldVal) : null,
        newValue: newVal != null ? String(newVal) : null,
      });

      if (SELLER_FIELD_MAP[key]) {
        sellerFields[SELLER_FIELD_MAP[key]] = newVal;
      } else if (PURCHASER_FIELD_MAP[key]) {
        purchaserFields[PURCHASER_FIELD_MAP[key]] = newVal;
      } else if (PROPERTY_FIELDS.has(key)) {
        propertyFields[key] = newVal;
      } else if (CONTRACT_FIELDS.has(key)) {
        contractFields[key] = newVal;
      }
    }

    if (changes.length === 0) {
      setSaveState('idle');
      return;
    }

    try {
      const res = await fetch(`/api/agreements/${contractId}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractFields,
          sellerFields,
          purchaserFields,
          propertyFields,
          changes,
        }),
      });

      if (!res.ok) throw new Error('Save failed');

      const data = await res.json();
      setLastSavedAt(data.timestamp);
      setLastSaved({ ...valuesToSave });
      setSaveState('saved');

      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => setSaveState('idle'), 3000);
    } catch {
      setSaveState('error');
    }
  }, [contractId]);

  const handleChange = useCallback(
    (fieldName: string, value: unknown) => {
      if (isLocked) return;

      setFormValues((prev) => {
        const next = { ...prev, [fieldName]: value };

        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => {
          performSave(next, lastSaved);
        }, 2000);

        return next;
      });
    },
    [isLocked, lastSaved, performSave]
  );

  const handleSectionClick = useCallback((sectionId: string) => {
    setActiveSection(sectionId);
    const ref = sectionRefs[sectionId];
    ref?.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [sectionRefs]);

  const handleJumpToField = useCallback(
    (fieldName: string, sectionId: string) => {
      handleSectionClick(sectionId);
      setTimeout(() => {
        const el = document.querySelector(`[data-field="${fieldName}"]`) as HTMLElement | null;
        el?.focus();
      }, 400);
    },
    [handleSectionClick]
  );

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey) {
        if (e.key === 's') {
          e.preventDefault();
          if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
          performSave(formValues, lastSaved);
        }

        if (e.key === '/') {
          e.preventDefault();
          setShowShortcuts((prev) => !prev);
        }

        const num = parseInt(e.key);
        if (num >= 1 && num <= AGREEMENT_SECTIONS.length) {
          e.preventDefault();
          const section = AGREEMENT_SECTIONS[num - 1];
          handleSectionClick(section.id);
        }
      }

      if (e.key === 'Escape') {
        setFormValues({ ...lastSaved });
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [formValues, lastSaved, performSave, handleSectionClick]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    };
  }, []);

  if (pageState === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-gold animate-spin" strokeWidth={1.5} />
          <p className="text-sm text-secondary">Loading agreement…</p>
        </div>
      </div>
    );
  }

  if (pageState === 'error' || !contract) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <AlertTriangle className="w-8 h-8 text-error" strokeWidth={1.5} />
          <p className="text-sm text-error">Contract not found.</p>
          <button onClick={() => router.push('/dashboard')} className="btn-secondary !h-8 !text-xs">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const address = formatAddress(contract.property);

  return (
    <MobileReadOnlyGuard>
    <div className="-mx-4 lg:-mx-8 -my-6 lg:-my-8">
      {/* ── Sticky Header Bar ──────────────────────── */}
      <header className="sticky top-14 z-20 bg-surface-raised border-b border-border px-4 lg:px-6 py-2.5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => router.push('/dashboard')}
              className="text-secondary hover:text-primary p-1 flex-shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="min-w-0">
              <h1 className="text-sm font-medium text-navy truncate">{address}</h1>
              <p className="text-[10px] font-mono text-secondary">
                {contract.contract_number}
              </p>
            </div>
          </div>

          <ProgressBar
            sections={AGREEMENT_SECTIONS}
            formValues={formValues}
            activeSection={activeSection}
          />

          <div className="flex items-center gap-3 flex-shrink-0">
            <SaveIndicator state={saveState} timestamp={lastSavedAt} />
            <StatusBadge status={contract.status as ContractStatus} />
            <button
              onClick={() => {
                if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
                performSave(formValues, lastSaved);
              }}
              disabled={saveState === 'saving'}
              className="btn-secondary !h-8 !px-3 !text-xs hidden sm:flex"
            >
              <Save className="w-3.5 h-3.5" />
              Save
            </button>
            <button className="p-1.5 text-secondary hover:text-primary rounded-md">
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* ── Locked banner ──────────────────────────── */}
      {isLocked && (
        <div className="bg-surface-sunken border-b border-border px-6 py-2 text-center">
          <p className="text-xs text-secondary">
            {lockdownMessage(contract.status as ContractStatus) ??
              `This agreement is ${contract.status.replace(/_/g, ' ')} and cannot be edited.`}
          </p>
        </div>
      )}

      {/* ── Security banners ──────────────────────── */}
      {!isLocked && (
        <div className="px-4 lg:px-6 pt-2 space-y-2">
          <ClosingProximityFlag closingDate={contract.closing_date} />
          {activeSection === 'escrow' && <WireFraudBanner variant="page" />}
        </div>
      )}

      {/* ── Tri-panel Layout ───────────────────────── */}
      <div className="flex min-h-[calc(100vh-120px)]">
        {/* Left: Section Navigator */}
        <aside
          className={`
            hidden lg:block flex-shrink-0 border-r border-border p-4
            transition-all duration-200
            ${navCollapsed ? 'w-16' : 'w-[260px]'}
          `}
        >
          <button
            onClick={() => setNavCollapsed(!navCollapsed)}
            className="text-[10px] text-secondary hover:text-primary mb-2 block"
          >
            {navCollapsed ? '→' : '← Collapse'}
          </button>
          <SectionNavigator
            sections={AGREEMENT_SECTIONS}
            activeSection={activeSection}
            formValues={formValues}
            issues={issues}
            onSectionClick={handleSectionClick}
            collapsed={navCollapsed}
          />
        </aside>

        {/* Center: Edit Canvas */}
        <main className="flex-1 overflow-y-auto px-4 lg:px-8 py-6">
          <EditCanvas
            formValues={formValues}
            onChange={handleChange}
            fieldIssues={fieldIssues}
            locked={isLocked}
            activeSectionId={activeSection}
            sectionRefs={sectionRefs}
          />
        </main>

        {/* Right: Validation Panel — full at >=1440px, icon-bar at 1024-1439px */}
        <aside className="hidden lg:block flex-shrink-0 border-l border-border p-4">
          <div className="hidden xl:block w-[280px]">
            <ValidationPanel
              issues={issues}
              onJumpToField={handleJumpToField}
            />
          </div>
          <div className="xl:hidden w-10 flex flex-col items-center gap-2 pt-2">
            <ValidationIconBar issues={issues} />
          </div>
        </aside>
      </div>

      {/* ── Bottom: Audit Trail ────────────────────── */}
      <AuditTrail
        contractId={contractId}
        lastSavedAt={lastSavedAt}
        lastSavedBy={null}
      />

      {/* ── Keyboard shortcuts modal ───────────────── */}
      {showShortcuts && (
        <div
          className="fixed inset-0 bg-black/20 z-50 flex items-center justify-center"
          onClick={() => setShowShortcuts(false)}
        >
          <div
            className="bg-surface-raised rounded-lg shadow-modal p-6 w-[360px]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg text-navy flex items-center gap-2">
                <Keyboard className="w-5 h-5" />
                Keyboard Shortcuts
              </h3>
              <button
                onClick={() => setShowShortcuts(false)}
                className="text-secondary hover:text-primary"
              >
                ×
              </button>
            </div>
            <div className="space-y-2 text-sm">
              {[
                ['⌘ + S', 'Save now'],
                ['⌘ + /', 'Toggle this panel'],
                ['⌘ + 1-8', 'Jump to section'],
                ['Escape', 'Revert unsaved changes'],
                ['Tab / Shift+Tab', 'Navigate fields'],
              ].map(([key, desc]) => (
                <div key={key} className="flex items-center justify-between py-1">
                  <span className="text-secondary">{desc}</span>
                  <kbd className="px-2 py-0.5 bg-surface-sunken rounded text-xs font-mono text-primary border border-border">
                    {key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
    </MobileReadOnlyGuard>
  );
}
