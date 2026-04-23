import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string | null): string {
  if (!date) return 'N/A';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-AU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatCurrency(amount: number | null, currency: string = 'AUD'): string {
  if (amount === null || amount === undefined) return 'N/A';
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency,
  }).format(amount);
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    // Contract status
    draft: 'bg-gray-100 text-gray-800',
    review: 'bg-yellow-100 text-yellow-800',
    negotiation: 'bg-orange-100 text-orange-800',
    pending_approval: 'bg-blue-100 text-blue-800',
    approved: 'bg-green-100 text-green-800',
    signed: 'bg-emerald-100 text-emerald-800',
    active: 'bg-green-100 text-green-800',
    expired: 'bg-red-100 text-red-800',
    terminated: 'bg-red-100 text-red-800',
    // Matter status
    open: 'bg-blue-100 text-blue-800',
    in_progress: 'bg-yellow-100 text-yellow-800',
    pending_review: 'bg-orange-100 text-orange-800',
    closed: 'bg-gray-100 text-gray-800',
    on_hold: 'bg-slate-100 text-slate-600',
    // Priority
    low: 'bg-gray-100 text-gray-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-orange-100 text-orange-800',
    critical: 'bg-red-100 text-red-800',
    // Approval status
    pending: 'bg-yellow-100 text-yellow-800',
    rejected: 'bg-red-100 text-red-800',
    cancelled: 'bg-gray-100 text-gray-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
}