import type { ContractStatus } from '@/lib/types';

const TERMINAL_STATUSES: ContractStatus[] = [
  'closed',
  'cancelled',
  'defaulted_buyer',
  'defaulted_seller',
];

export function isContractLocked(status: ContractStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

export function lockdownMessage(status: ContractStatus): string | null {
  switch (status) {
    case 'closed':
      return 'This agreement has been closed and is now read-only. To make changes, create an amendment.';
    case 'cancelled':
      return 'This agreement has been cancelled and is now read-only.';
    case 'defaulted_buyer':
      return 'This agreement is in buyer default status and is now read-only.';
    case 'defaulted_seller':
      return 'This agreement is in seller default status and is now read-only.';
    default:
      return null;
  }
}
