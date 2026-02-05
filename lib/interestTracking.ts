import AsyncStorage from '@react-native-async-storage/async-storage';
import { Holding, InterestFrequency } from '@/types';

const INTEREST_HISTORY_KEY = 'penny_interest_history';

export interface InterestPayment {
  id: string;
  holdingId: string;
  holdingName: string;
  amount: number;
  date: string;
  isPaid: boolean;
  notes?: string;
  createdAt: string;
}

export interface ExpectedInterest {
  holdingId: string;
  holdingName: string;
  expectedAmount: number;
  expectedDate: string;
  interestRate: number;
  frequency: InterestFrequency;
}

/**
 * Calculate days between interest payments based on frequency
 */
function getInterestIntervalDays(frequency: InterestFrequency): number {
  switch (frequency) {
    case 'monthly':
      return 30;
    case 'quarterly':
      return 91;
    case 'semi-annual':
      return 182;
    case 'annual':
      return 365;
    case 'at-maturity':
      return 0; // Special case - no interval
    default:
      return 365;
  }
}

/**
 * Calculate expected interest amount for a holding
 */
export function calculateExpectedInterest(holding: Holding): number {
  if (!holding.interestRate) return 0;

  const principal = holding.quantity * holding.purchasePrice;
  const annualInterest = principal * (holding.interestRate / 100);
  const frequency = holding.interestFrequency || 'annual';

  switch (frequency) {
    case 'monthly':
      return annualInterest / 12;
    case 'quarterly':
      return annualInterest / 4;
    case 'semi-annual':
      return annualInterest / 2;
    case 'annual':
    case 'at-maturity':
      return annualInterest;
    default:
      return annualInterest;
  }
}

/**
 * Calculate next interest payment date
 */
export function calculateNextInterestDate(
  holding: Holding,
  fromDate: Date = new Date()
): Date | null {
  if (!holding.interestRate || !holding.interestFrequency) return null;

  // For at-maturity, return maturity date
  if (holding.interestFrequency === 'at-maturity') {
    return holding.maturityDate ? new Date(holding.maturityDate) : null;
  }

  const purchaseDate = new Date(holding.purchaseDate);
  const intervalDays = getInterestIntervalDays(holding.interestFrequency);

  if (intervalDays === 0) return null;

  // Find the next payment date after fromDate
  let nextDate = new Date(purchaseDate);
  while (nextDate <= fromDate) {
    nextDate.setDate(nextDate.getDate() + intervalDays);
  }

  // Don't return dates after maturity
  if (holding.maturityDate) {
    const maturityDate = new Date(holding.maturityDate);
    if (nextDate > maturityDate) {
      return maturityDate;
    }
  }

  return nextDate;
}

/**
 * Get all expected interest payments for the next N days
 */
export function getUpcomingInterestPayments(
  holdings: Holding[],
  daysAhead: number = 30
): ExpectedInterest[] {
  const today = new Date();
  const endDate = new Date(today);
  endDate.setDate(endDate.getDate() + daysAhead);

  const upcomingPayments: ExpectedInterest[] = [];

  for (const holding of holdings) {
    if (!holding.interestRate || !holding.interestFrequency) continue;

    const nextDate = calculateNextInterestDate(holding, today);
    if (!nextDate || nextDate > endDate) continue;

    upcomingPayments.push({
      holdingId: holding.id,
      holdingName: holding.name,
      expectedAmount: calculateExpectedInterest(holding),
      expectedDate: nextDate.toISOString(),
      interestRate: holding.interestRate,
      frequency: holding.interestFrequency,
    });
  }

  // Sort by date
  return upcomingPayments.sort(
    (a, b) => new Date(a.expectedDate).getTime() - new Date(b.expectedDate).getTime()
  );
}

/**
 * Get total expected interest income for the year
 */
export function getAnnualExpectedInterest(holdings: Holding[]): number {
  let totalAnnual = 0;

  for (const holding of holdings) {
    if (!holding.interestRate) continue;

    const principal = holding.quantity * holding.purchasePrice;
    totalAnnual += principal * (holding.interestRate / 100);
  }

  return totalAnnual;
}

/**
 * Load interest payment history from storage
 */
export async function loadInterestHistory(): Promise<InterestPayment[]> {
  try {
    const stored = await AsyncStorage.getItem(INTEREST_HISTORY_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('[InterestTracking] Failed to load history:', error);
    return [];
  }
}

/**
 * Save interest payment history to storage
 */
export async function saveInterestHistory(history: InterestPayment[]): Promise<void> {
  try {
    await AsyncStorage.setItem(INTEREST_HISTORY_KEY, JSON.stringify(history));
  } catch (error) {
    console.error('[InterestTracking] Failed to save history:', error);
  }
}

/**
 * Record an interest payment
 */
export async function recordInterestPayment(
  holding: Holding,
  amount: number,
  date: string,
  notes?: string
): Promise<InterestPayment> {
  const history = await loadInterestHistory();

  const payment: InterestPayment = {
    id: `interest_${Date.now()}`,
    holdingId: holding.id,
    holdingName: holding.name,
    amount,
    date,
    isPaid: true,
    notes,
    createdAt: new Date().toISOString(),
  };

  history.push(payment);
  await saveInterestHistory(history);

  return payment;
}

/**
 * Get interest payment history for a specific holding
 */
export async function getInterestHistoryForHolding(holdingId: string): Promise<InterestPayment[]> {
  const history = await loadInterestHistory();
  return history
    .filter((p) => p.holdingId === holdingId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

/**
 * Get total interest received for a holding
 */
export async function getTotalInterestReceived(holdingId: string): Promise<number> {
  const history = await getInterestHistoryForHolding(holdingId);
  return history.reduce((sum, payment) => sum + payment.amount, 0);
}

/**
 * Delete an interest payment record
 */
export async function deleteInterestPayment(paymentId: string): Promise<void> {
  const history = await loadInterestHistory();
  const filtered = history.filter((p) => p.id !== paymentId);
  await saveInterestHistory(filtered);
}

/**
 * Get summary of interest income by month
 */
export async function getInterestSummaryByMonth(): Promise<Record<string, number>> {
  const history = await loadInterestHistory();
  const summary: Record<string, number> = {};

  for (const payment of history) {
    const date = new Date(payment.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    summary[monthKey] = (summary[monthKey] || 0) + payment.amount;
  }

  return summary;
}

/**
 * Format interest frequency for display
 */
export function formatInterestFrequency(frequency: InterestFrequency): string {
  switch (frequency) {
    case 'monthly':
      return 'Monthly';
    case 'quarterly':
      return 'Quarterly';
    case 'semi-annual':
      return 'Semi-Annual';
    case 'annual':
      return 'Annual';
    case 'at-maturity':
      return 'At Maturity';
    default:
      return frequency;
  }
}
