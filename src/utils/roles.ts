import type { UserRole } from '../types/auth';

const normalizeText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');

export const normalizeUserRole = (role: unknown): UserRole => {
  if (typeof role !== 'string') return 'Khach';
  const normalized = normalizeText(role);

  if (normalized === 'ban quan ly' || normalized === 'admin' || normalized === 'administrator') return 'Ban quan ly';
  if (normalized === 'cu dan' || normalized === 'resident') return 'Cu dan';
  if (normalized === 'khach' || normalized === 'guest' || normalized === 'customer') return 'Khach';

  return 'Khach';
};

