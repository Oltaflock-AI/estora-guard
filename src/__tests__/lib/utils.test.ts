import { describe, it, expect } from 'vitest';
import {
  formatCurrency,
  formatDate,
  formatDateShort,
  formatAddress,
  getHealthColor,
  getHealthBgClass,
} from '@/lib/utils';

describe('formatCurrency', () => {
  it('formats whole numbers without decimals', () => {
    expect(formatCurrency(500000)).toBe('$500,000');
  });

  it('formats zero', () => {
    expect(formatCurrency(0)).toBe('$0');
  });

  it('formats large numbers with commas', () => {
    expect(formatCurrency(1250000)).toBe('$1,250,000');
  });
});

describe('formatDate', () => {
  it('formats ISO date string', () => {
    expect(formatDate('2026-04-15')).toBe('Apr 15, 2026');
  });

  it('returns dash for null', () => {
    expect(formatDate(null)).toBe('—');
  });

  it('returns dash for invalid date', () => {
    expect(formatDate('not-a-date')).toBe('—');
  });
});

describe('formatDateShort', () => {
  it('formats to short month day', () => {
    expect(formatDateShort('2026-04-15')).toBe('Apr 15');
  });

  it('returns dash for null', () => {
    expect(formatDateShort(null)).toBe('—');
  });
});

describe('formatAddress', () => {
  it('formats full address', () => {
    const result = formatAddress({
      street_1: '123 Main St',
      city: 'Manhattan',
      state: 'NY',
      postal_code: '10001',
    });
    expect(result).toBe('123 Main St, Manhattan, NY 10001');
  });

  it('includes street_2 when present', () => {
    const result = formatAddress({
      street_1: '123 Main St',
      street_2: 'Apt 4B',
      city: 'Manhattan',
      state: 'NY',
      postal_code: '10001',
    });
    expect(result).toBe('123 Main St, Apt 4B, Manhattan, NY 10001');
  });
});

describe('getHealthColor', () => {
  it('returns success color for green', () => {
    expect(getHealthColor('green')).toBe('var(--color-success)');
  });

  it('returns warning color for yellow', () => {
    expect(getHealthColor('yellow')).toBe('var(--color-warning)');
  });

  it('returns error color for red', () => {
    expect(getHealthColor('red')).toBe('var(--color-error)');
  });

  it('returns disabled color for null', () => {
    expect(getHealthColor(null)).toBe('var(--color-text-disabled)');
  });
});

describe('getHealthBgClass', () => {
  it('returns bg-success for green', () => {
    expect(getHealthBgClass('green')).toBe('bg-success');
  });

  it('returns bg-warning for yellow', () => {
    expect(getHealthBgClass('yellow')).toBe('bg-warning');
  });

  it('returns bg-error for red', () => {
    expect(getHealthBgClass('red')).toBe('bg-error');
  });

  it('returns bg-gray-300 for null', () => {
    expect(getHealthBgClass(null)).toBe('bg-gray-300');
  });
});
