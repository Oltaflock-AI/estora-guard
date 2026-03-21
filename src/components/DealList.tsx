'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  LayoutGrid,
  List,
  Calendar,
  ArrowUpDown,
  FileText,
} from 'lucide-react';
import { StatusBadge } from '@/components/ui/Badge';
import HealthBar from '@/components/HealthBar';
import { formatCurrency, formatDateShort, formatDate } from '@/lib/utils';
import type { ContractWithRelations, ContractStatus } from '@/lib/types';

interface DealListProps {
  deals: ContractWithRelations[];
}

type SortKey = 'updated' | 'price' | 'closing';

const PIPELINE_COLUMNS: {
  key: string;
  label: string;
  statuses: ContractStatus[];
}[] = [
  { key: 'draft', label: 'Draft', statuses: ['draft'] },
  { key: 'pending', label: 'Pending', statuses: ['pending_commitment'] },
  { key: 'active', label: 'Active', statuses: ['active'] },
  {
    key: 'closed',
    label: 'Closed',
    statuses: ['closed', 'cancelled', 'defaulted_buyer', 'defaulted_seller'],
  },
];

function DealCard({ deal }: { deal: ContractWithRelations }) {
  return (
    <Link href={`/dashboard/transactions/${deal.id}`} className="block">
      <div className="card p-4 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between mb-2">
          <span className="font-mono text-[11px] text-secondary">
            {deal.contract_number}
          </span>
          <HealthBar score={deal.health_score} status={deal.health_status} compact />
        </div>
        <p className="text-sm font-medium text-primary truncate mb-0.5">
          {deal.property.street_1}
        </p>
        <p className="text-xs text-secondary mb-3">
          {deal.property.city}, {deal.property.state}
        </p>
        <div className="flex items-center justify-between">
          <span className="font-mono text-sm text-primary">
            {formatCurrency(deal.purchase_price)}
          </span>
          {deal.closing_date && (
            <span className="text-xs text-secondary flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {formatDateShort(deal.closing_date)}
            </span>
          )}
        </div>
        <div className="mt-2 pt-2 border-t border-border">
          <p className="text-xs text-secondary truncate">
            {deal.seller.last_name} → {deal.purchaser.last_name}
          </p>
        </div>
      </div>
    </Link>
  );
}

function SortableHeader({
  label,
  sortKey,
  currentSort,
  currentDir,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  currentSort: SortKey;
  currentDir: 'asc' | 'desc';
  onSort: (key: SortKey) => void;
}) {
  const isActive = currentSort === sortKey;
  return (
    <th
      className="px-4 py-3 text-xs font-medium text-secondary uppercase tracking-wider cursor-pointer hover:text-primary transition-colors"
      onClick={() => onSort(sortKey)}
    >
      <span className="flex items-center gap-1">
        {label}
        <ArrowUpDown
          className={`w-3 h-3 ${isActive ? 'text-navy' : 'text-disabled'}`}
        />
        {isActive && (
          <span className="text-[9px] text-navy">
            {currentDir === 'asc' ? '↑' : '↓'}
          </span>
        )}
      </span>
    </th>
  );
}

export default function DealList({ deals }: DealListProps) {
  const [view, setView] = useState<'pipeline' | 'list'>('list');
  const [sortBy, setSortBy] = useState<SortKey>('updated');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  function handleSort(key: SortKey) {
    if (sortBy === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(key);
      setSortDir('desc');
    }
  }

  const sortedDeals = useMemo(() => {
    const sorted = [...deals].sort((a, b) => {
      switch (sortBy) {
        case 'price':
          return a.purchase_price - b.purchase_price;
        case 'closing': {
          if (!a.closing_date) return 1;
          if (!b.closing_date) return -1;
          return (
            new Date(a.closing_date).getTime() -
            new Date(b.closing_date).getTime()
          );
        }
        default:
          return (
            new Date(a.updated_at).getTime() -
            new Date(b.updated_at).getTime()
          );
      }
    });
    return sortDir === 'desc' ? sorted.reverse() : sorted;
  }, [deals, sortBy, sortDir]);

  const pipelineData = useMemo(
    () =>
      PIPELINE_COLUMNS.map((col) => ({
        ...col,
        deals: deals.filter((d) => col.statuses.includes(d.status)),
      })),
    [deals]
  );

  if (deals.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 rounded-full bg-surface-sunken flex items-center justify-center mx-auto mb-4">
          <FileText className="w-7 h-7 text-border" strokeWidth={1} />
        </div>
        <h3 className="font-display text-lg text-navy mb-2">
          No active agreements
        </h3>
        <p className="text-sm text-secondary max-w-sm mx-auto">
          Upload an Agreement of Sale above to get started. Estora will analyze
          it and create a transaction automatically.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="section-header">
          Active Deals
          <span className="ml-2 text-disabled font-normal">{deals.length}</span>
        </h2>
        <div className="flex items-center gap-1 bg-surface-sunken rounded-md p-0.5">
          <button
            onClick={() => setView('pipeline')}
            className={`p-1.5 rounded transition-colors ${
              view === 'pipeline'
                ? 'bg-surface-raised shadow-card text-navy'
                : 'text-secondary hover:text-primary'
            }`}
            title="Pipeline view"
            aria-label="Pipeline view"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setView('list')}
            className={`p-1.5 rounded transition-colors ${
              view === 'list'
                ? 'bg-surface-raised shadow-card text-navy'
                : 'text-secondary hover:text-primary'
            }`}
            title="List view"
            aria-label="List view"
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {view === 'pipeline' ? (
        <div className="flex gap-4 overflow-x-auto pb-4 -mx-2 px-2">
          {pipelineData.map((col) => (
            <div key={col.key} className="flex-shrink-0 w-72">
              <div className="flex items-center justify-between mb-3 px-1">
                <span className="text-xs font-medium text-secondary uppercase tracking-wider">
                  {col.label}
                </span>
                <span className="text-xs text-disabled font-mono">
                  {col.deals.length}
                </span>
              </div>
              <div className="space-y-3">
                {col.deals.length === 0 ? (
                  <div className="border border-dashed border-border rounded-lg p-6 text-center">
                    <p className="text-xs text-disabled">No deals</p>
                  </div>
                ) : (
                  col.deals.map((deal) => (
                    <DealCard key={deal.id} deal={deal} />
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-4 py-3 text-xs font-medium text-secondary uppercase tracking-wider">
                    Property
                  </th>
                  <th className="px-4 py-3 text-xs font-medium text-secondary uppercase tracking-wider">
                    Parties
                  </th>
                  <SortableHeader
                    label="Price"
                    sortKey="price"
                    currentSort={sortBy}
                    currentDir={sortDir}
                    onSort={handleSort}
                  />
                  <th className="px-4 py-3 text-xs font-medium text-secondary uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-xs font-medium text-secondary uppercase tracking-wider">
                    Health
                  </th>
                  <SortableHeader
                    label="Close Date"
                    sortKey="closing"
                    currentSort={sortBy}
                    currentDir={sortDir}
                    onSort={handleSort}
                  />
                </tr>
              </thead>
              <tbody>
                {sortedDeals.map((deal, i) => (
                  <tr
                    key={deal.id}
                    className="border-b border-border last:border-b-0 hover:bg-surface-sunken/50 transition-colors stagger-in"
                    style={{ '--i': i } as React.CSSProperties}
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/transactions/${deal.id}`}
                        className="group"
                      >
                        <p className="text-sm font-medium text-primary group-hover:text-navy transition-colors">
                          {deal.property.street_1}
                        </p>
                        <p className="text-xs text-secondary">
                          {deal.property.city}, {deal.property.state}
                        </p>
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-primary">
                        {deal.seller.last_name}{' '}
                        <span className="text-disabled">→</span>{' '}
                        {deal.purchaser.last_name}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-sm">
                        {formatCurrency(deal.purchase_price)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={deal.status} />
                    </td>
                    <td className="px-4 py-3">
                      <HealthBar
                        score={deal.health_score}
                        status={deal.health_status}
                        compact
                      />
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-sm text-secondary">
                        {formatDate(deal.closing_date)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
