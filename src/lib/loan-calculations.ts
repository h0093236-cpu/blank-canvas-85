/**
 * Core business logic for loan calculations.
 * All monetary values are in BRL (reais).
 */

export function calculateCycleInterest(principalOpen: number, monthlyRatePct: number): number {
  return principalOpen * (monthlyRatePct / 100);
}

export function calculateLateDays(dueAt: Date): number {
  const now = new Date();
  const diff = now.getTime() - dueAt.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  return Math.max(0, days);
}

export function calculateLateFee(cycleInterest: number, lateDays: number): number {
  if (lateDays <= 0) return 0;
  const dailyFee = cycleInterest / 30;
  return dailyFee * lateDays;
}

export function calculateDueDate(transferAt: Date, cycleDays: number = 30): Date {
  const due = new Date(transferAt);
  due.setDate(due.getDate() + cycleDays);
  return due;
}

export interface PaymentBreakdown {
  lateFeePaid: number;
  cycleInterestPaid: number;
  principalPaid: number;
  remaining: number;
}

/**
 * Apply payment following priority:
 * 1. Late fee
 * 2. Cycle interest
 * 3. Principal (if type allows)
 */
export function applyPayment(
  amount: number,
  lateFee: number,
  cycleInterest: number,
  principalOpen: number,
  type: 'interest_only' | 'interest_plus_principal' | 'full_settlement'
): PaymentBreakdown {
  let remaining = amount;

  // 1. Pay late fee
  const lateFeePaid = Math.min(remaining, lateFee);
  remaining -= lateFeePaid;

  // 2. Pay cycle interest
  const cycleInterestPaid = Math.min(remaining, cycleInterest);
  remaining -= cycleInterestPaid;

  // 3. Pay principal based on type
  let principalPaid = 0;
  if (type === 'interest_plus_principal') {
    principalPaid = Math.min(remaining, principalOpen);
    remaining -= principalPaid;
  } else if (type === 'full_settlement') {
    principalPaid = Math.min(remaining, principalOpen);
    remaining -= principalPaid;
  }

  return { lateFeePaid, cycleInterestPaid, principalPaid, remaining };
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date));
}

export function formatDateTime(date: Date | string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}
