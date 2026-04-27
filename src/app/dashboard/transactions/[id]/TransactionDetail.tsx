'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Calendar,
  Paperclip,
  MapPin,
  Users,
  Building,
  Banknote,
  Bot,
} from 'lucide-react';
import { useRealtime } from '@/hooks/useRealtime';
import { StatusBadge } from '@/components/ui/Badge';
import HealthBar from '@/components/HealthBar';
import TimelineView from '@/components/TimelineView';
import TaskList from '@/components/TaskList';
import RiskFlagPanel from '@/components/RiskFlagPanel';
import WireFraudBanner from '@/components/security/WireFraudBanner';
import ClosingProximityFlag from '@/components/security/ClosingProximityFlag';
import {
  formatCurrency,
  formatDate,
  formatAddress,
} from '@/lib/utils';
import type {
  Contract,
  Person,
  Property,
  Task,
  TimelineItem,
  RiskFlag,
  ContractMortgage,
  ContractEscrow,
  Document,
} from '@/lib/types';

interface HealthData {
  score: number;
  status: string;
  reasons: string[];
  overdue: number;
  dueSoon: number;
  onTrack: number;
}

interface TransactionData {
  contract: Contract;
  property: Property;
  seller: Person;
  purchaser: Person;
  sellerAttorney: Person | null;
  purchaserAttorney: Person | null;
  tasks: Task[];
  timelineItems: TimelineItem[];
  mortgages: ContractMortgage[];
  escrow: ContractEscrow | null;
  riskFlags: RiskFlag[];
  documents: Document[];
  health: HealthData;
}

function PersonCard({
  label,
  person,
  icon: Icon,
}: {
  label: string;
  person: Person;
  icon: typeof Users;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon
        className="w-4 h-4 text-secondary mt-0.5 flex-shrink-0"
        strokeWidth={1.5}
      />
      <div className="min-w-0">
        <p className="text-[10px] font-mono text-secondary uppercase tracking-wider">
          {label}
        </p>
        <p className="text-sm text-primary font-medium">
          {person.first_name} {person.last_name}
        </p>
        {person.email && (
          <p className="text-xs text-secondary truncate">{person.email}</p>
        )}
      </div>
    </div>
  );
}

export default function TransactionDetail({ data }: { data: TransactionData }) {
  const {
    contract,
    property,
    seller,
    purchaser,
    sellerAttorney,
    purchaserAttorney,
    tasks,
    timelineItems,
    mortgages,
    escrow,
    riskFlags,
    documents,
  } = data;

  const router = useRouter();
  const [health, setHealth] = useState<HealthData>(data.health);
  const [perspective, setPerspective] = useState<'buyer' | 'seller'>('buyer');

  useEffect(() => {
    const key = `estora.dealPerspective.${contract.id}`;
    const saved = typeof window !== 'undefined' ? localStorage.getItem(key) : null;
    if (saved === 'buyer' || saved === 'seller') {
      setPerspective(saved);
    }
  }, [contract.id]);

  function handlePerspectiveChange(next: 'buyer' | 'seller') {
    setPerspective(next);
    localStorage.setItem(`estora.dealPerspective.${contract.id}`, next);
  }

  useRealtime({
    table: 'tasks',
    event: '*',
    filter: `contract_id=eq.${contract.id}`,
    onChange: useCallback(() => {
      router.refresh();
    }, [router]),
  });

  useRealtime({
    table: 'timeline_items',
    event: '*',
    filter: `contract_id=eq.${contract.id}`,
    onChange: useCallback(() => {
      router.refresh();
    }, [router]),
  });

  function handleHealthUpdate(update: {
    score: number;
    status: string;
    overdue: number;
    dueSoon: number;
    onTrack: number;
  }) {
    setHealth((prev) => ({ ...prev, ...update }));
  }

  return (
    <div>
      {/* ── Header ──────────────────────────────────────── */}
      <div className="mb-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-secondary hover:text-primary transition-colors mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>

        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="font-display text-2xl text-navy">
                {property.street_1}
              </h1>
              <StatusBadge status={contract.status} />
            </div>
            <p className="text-sm text-secondary font-mono">
              {formatAddress(property)}
            </p>
            <p className="text-xs text-secondary mt-1">
              <span className="font-mono">{contract.contract_number}</span>
              {contract.contract_date && (
                <> · Executed {formatDate(contract.contract_date)}</>
              )}
            </p>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-[10px] font-mono text-secondary uppercase tracking-wider">
                Purchase Price
              </p>
              <p className="font-mono text-lg text-navy tabular-nums">
                {formatCurrency(contract.purchase_price)}
              </p>
            </div>
            {contract.closing_date && (
              <div className="text-right">
                <p className="text-[10px] font-mono text-secondary uppercase tracking-wider">
                  Closing
                </p>
                <p className="font-mono text-sm text-primary tabular-nums">
                  {formatDate(contract.closing_date)}
                </p>
              </div>
            )}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div
                className="inline-flex rounded-md border border-border p-0.5 bg-surface-sunken"
                role="group"
                aria-label="Deal perspective"
              >
                <button
                  type="button"
                  onClick={() => handlePerspectiveChange('buyer')}
                  className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                    perspective === 'buyer'
                      ? 'bg-surface-raised text-navy shadow-sm'
                      : 'text-secondary hover:text-primary'
                  }`}
                >
                  Buyer side
                </button>
                <button
                  type="button"
                  onClick={() => handlePerspectiveChange('seller')}
                  className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                    perspective === 'seller'
                      ? 'bg-surface-raised text-navy shadow-sm'
                      : 'text-secondary hover:text-primary'
                  }`}
                >
                  Seller side
                </button>
              </div>
              <Link
                href={`/dashboard/transactions/${contract.id}/agent`}
                className="btn-gold gap-2 justify-center"
              >
                <Bot className="w-4 h-4" />
                Ask Agent
              </Link>
              <Link
                href={`/dashboard/agreements/${contract.id}`}
                className="btn-primary gap-2 justify-center"
              >
                <Paperclip className="w-4 h-4" />
                Files
              </Link>
            </div>
          </div>
        </div>
      </div>

      <ClosingProximityFlag closingDate={contract.closing_date} className="mb-4" />

      {/* ── Three-column layout ─────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Column 1: Timeline */}
        <div className="lg:col-span-3">
          <div className="card">
            <h3 className="section-header mb-4">Timeline</h3>
            <TimelineView items={timelineItems} />
          </div>
        </div>

        {/* Column 2: Health + Deal Summary */}
        <div className="lg:col-span-4 space-y-6">
          {/* Health card */}
          <div className="card flex flex-col items-center py-6">
            <h3 className="section-header mb-4 self-start">Health</h3>
            <HealthBar
              score={health.score}
              status={health.status}
              overdue={health.overdue}
              dueSoon={health.dueSoon}
              onTrack={health.onTrack}
            />
            {health.reasons.length > 0 && (
              <div className="mt-4 w-full space-y-1 pt-3 border-t border-border">
                {health.reasons.map((reason, i) => (
                  <p key={i} className="text-xs text-secondary leading-relaxed">
                    {reason}
                  </p>
                ))}
              </div>
            )}
          </div>

          {/* Deal summary card */}
          <div className="card">
            <h3 className="section-header mb-4">Deal Summary</h3>
            <div className="space-y-4">
              {/* Parties */}
              <div className="space-y-3">
                <PersonCard label="Seller" person={seller} icon={Users} />
                <PersonCard label="Purchaser" person={purchaser} icon={Users} />
                {sellerAttorney && (
                  <PersonCard
                    label="Seller Attorney"
                    person={sellerAttorney}
                    icon={Users}
                  />
                )}
                {purchaserAttorney && (
                  <PersonCard
                    label="Purchaser Attorney"
                    person={purchaserAttorney}
                    icon={Users}
                  />
                )}
              </div>

              <div className="h-px bg-border" />

              {/* Property */}
              <div className="flex items-start gap-2.5">
                <MapPin
                  className="w-4 h-4 text-secondary mt-0.5 flex-shrink-0"
                  strokeWidth={1.5}
                />
                <div>
                  <p className="text-[10px] font-mono text-secondary uppercase tracking-wider">
                    Property
                  </p>
                  <p className="text-sm text-primary">{property.street_1}</p>
                  <p className="text-xs text-secondary">
                    {property.city}, {property.state} {property.postal_code}
                  </p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-secondary">
                    <span className="flex items-center gap-1">
                      <Building className="w-3 h-3" />
                      {property.property_type?.replace('_', ' ')}
                    </span>
                    {property.bedrooms && <span>{property.bedrooms} bed</span>}
                    {property.bathrooms && (
                      <span>{property.bathrooms} bath</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="h-px bg-border" />

              {/* Financials */}
              <div className="flex items-start gap-2.5">
                <Banknote
                  className="w-4 h-4 text-secondary mt-0.5 flex-shrink-0"
                  strokeWidth={1.5}
                />
                <div className="space-y-1.5 w-full">
                  <p className="text-[10px] font-mono text-secondary uppercase tracking-wider">
                    Financials
                  </p>
                  <div className="flex justify-between">
                    <span className="text-xs text-secondary">Price</span>
                    <span className="font-mono text-xs text-primary">
                      {formatCurrency(contract.purchase_price)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-secondary">Down Payment</span>
                    <span className="font-mono text-xs text-primary">
                      {formatCurrency(contract.downpayment_amount)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-secondary">
                      Balance at Closing
                    </span>
                    <span className="font-mono text-xs text-primary">
                      {formatCurrency(contract.balance_due_at_closing)}
                    </span>
                  </div>
                  {mortgages.length > 0 && (
                    <>
                      <div className="h-px bg-border my-1" />
                      {mortgages.map((m) => (
                        <div key={m.id} className="flex justify-between">
                          <span className="text-xs text-secondary">
                            {m.mortgage_type?.replace('_', ' ')} mortgage
                          </span>
                          <span className="font-mono text-xs text-primary">
                            {formatCurrency(m.principal_amount)}
                          </span>
                        </div>
                      ))}
                    </>
                  )}
                  {escrow && (
                    <>
                      <div className="h-px bg-border my-1" />
                      <WireFraudBanner variant="inline" className="my-2" />
                      <div className="flex justify-between">
                        <span className="text-xs text-secondary">
                          Escrow ({escrow.bank_name})
                        </span>
                        <span className="font-mono text-xs text-primary">
                          {formatCurrency(escrow.amount_held)}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="h-px bg-border" />

              {/* Key dates */}
              <div className="flex items-start gap-2.5">
                <Calendar
                  className="w-4 h-4 text-secondary mt-0.5 flex-shrink-0"
                  strokeWidth={1.5}
                />
                <div className="space-y-1.5 w-full">
                  <p className="text-[10px] font-mono text-secondary uppercase tracking-wider">
                    Key Dates
                  </p>
                  <div className="flex justify-between">
                    <span className="text-xs text-secondary">Contract Date</span>
                    <span className="font-mono text-xs text-primary">
                      {formatDate(contract.contract_date)}
                    </span>
                  </div>
                  {contract.commitment_date && (
                    <div className="flex justify-between">
                      <span className="text-xs text-secondary">
                        Commitment Date
                      </span>
                      <span className="font-mono text-xs text-primary">
                        {formatDate(contract.commitment_date)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-xs text-secondary">Closing Date</span>
                    <span className="font-mono text-xs text-primary">
                      {formatDate(contract.closing_date)}
                    </span>
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* Column 3: Tasks + Risk Flags */}
        <div className="lg:col-span-5 space-y-6">
          <div className="card">
            <h3 className="section-header mb-3">Tasks</h3>
            <TaskList
              tasks={tasks}
              contractId={contract.id}
              onHealthUpdate={handleHealthUpdate}
            />
          </div>

          {riskFlags.length > 0 && (
            <div className="card">
              <RiskFlagPanel flags={riskFlags} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
