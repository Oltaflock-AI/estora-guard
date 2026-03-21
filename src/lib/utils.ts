import { format, formatDistanceToNow, isValid, parseISO } from 'date-fns';

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  const date = parseISO(dateStr);
  if (!isValid(date)) return '—';
  return format(date, 'MMM d, yyyy');
}

export function formatDateShort(dateStr: string | null): string {
  if (!dateStr) return '—';
  const date = parseISO(dateStr);
  if (!isValid(date)) return '—';
  return format(date, 'MMM d');
}

export function formatRelativeTime(dateStr: string): string {
  const date = parseISO(dateStr);
  if (!isValid(date)) return '';
  return formatDistanceToNow(date, { addSuffix: true });
}

export function formatAddress(property: {
  street_1: string;
  street_2?: string | null;
  city: string;
  state: string;
  postal_code: string;
}): string {
  const line1 = property.street_2
    ? `${property.street_1}, ${property.street_2}`
    : property.street_1;
  return `${line1}, ${property.city}, ${property.state} ${property.postal_code}`;
}

export function getHealthColor(status: string | null): string {
  switch (status) {
    case 'green':
      return 'var(--color-success)';
    case 'yellow':
      return 'var(--color-warning)';
    case 'red':
      return 'var(--color-error)';
    default:
      return 'var(--color-text-disabled)';
  }
}

export function getHealthBgClass(status: string | null): string {
  switch (status) {
    case 'green':
      return 'bg-success';
    case 'yellow':
      return 'bg-warning';
    case 'red':
      return 'bg-error';
    default:
      return 'bg-gray-300';
  }
}
