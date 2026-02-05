/**
 * Dividend Tracking Service
 * Handles dividend payment tracking, history, and projections
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Holding } from '@/types';

const DIVIDENDS_KEY = 'penny_dividends';
const DIVIDEND_SETTINGS_KEY = 'penny_dividend_settings';

export type DividendFrequency = 'monthly' | 'quarterly' | 'semi-annual' | 'annual' | 'irregular';

export interface DividendPayment {
  id: string;
  holdingId: string;
  holdingName: string;
  symbol?: string;
  exDate: string; // Ex-dividend date
  paymentDate: string; // Payment date
  amount: number; // Per share
  totalAmount: number; // Total received (amount * shares)
  shares: number;
  status: 'announced' | 'pending' | 'received' | 'reinvested';
  reinvestedShares?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DividendSchedule {
  holdingId: string;
  holdingName: string;
  symbol?: string;
  frequency: DividendFrequency;
  lastDividend?: number; // Per share
  lastPaymentDate?: string;
  nextExpectedDate?: string;
  annualYield?: number; // Percentage
  annualAmount?: number; // Total annual dividend income
}

export interface DividendSummary {
  totalReceived: number;
  totalReinvested: number;
  totalPending: number;
  ytdDividends: number;
  lastMonthDividends: number;
  upcomingDividends: DividendPayment[];
  monthlyAverage: number;
  annualProjection: number;
}

export interface DividendCalendarEntry {
  date: string;
  payments: DividendPayment[];
  totalAmount: number;
}

/**
 * Get all dividend payments
 */
export async function getDividends(): Promise<DividendPayment[]> {
  try {
    const stored = await AsyncStorage.getItem(DIVIDENDS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('[DividendService] Error loading dividends:', error);
    return [];
  }
}

/**
 * Get dividends for a specific holding
 */
export async function getHoldingDividends(holdingId: string): Promise<DividendPayment[]> {
  const dividends = await getDividends();
  return dividends
    .filter(d => d.holdingId === holdingId)
    .sort((a, b) => b.paymentDate.localeCompare(a.paymentDate));
}

/**
 * Add a dividend payment
 */
export async function addDividend(
  dividend: Omit<DividendPayment, 'id' | 'createdAt' | 'updatedAt'>
): Promise<DividendPayment> {
  const dividends = await getDividends();

  const newDividend: DividendPayment = {
    ...dividend,
    id: `div_${Date.now()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  dividends.push(newDividend);
  await AsyncStorage.setItem(DIVIDENDS_KEY, JSON.stringify(dividends));

  return newDividend;
}

/**
 * Update a dividend payment
 */
export async function updateDividend(
  id: string,
  updates: Partial<DividendPayment>
): Promise<DividendPayment | null> {
  const dividends = await getDividends();
  const index = dividends.findIndex(d => d.id === id);

  if (index === -1) return null;

  dividends[index] = {
    ...dividends[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  await AsyncStorage.setItem(DIVIDENDS_KEY, JSON.stringify(dividends));
  return dividends[index];
}

/**
 * Delete a dividend payment
 */
export async function deleteDividend(id: string): Promise<boolean> {
  const dividends = await getDividends();
  const filtered = dividends.filter(d => d.id !== id);

  if (filtered.length === dividends.length) return false;

  await AsyncStorage.setItem(DIVIDENDS_KEY, JSON.stringify(filtered));
  return true;
}

/**
 * Mark dividend as received
 */
export async function markAsReceived(
  id: string,
  reinvested: boolean = false,
  reinvestedShares?: number
): Promise<DividendPayment | null> {
  return updateDividend(id, {
    status: reinvested ? 'reinvested' : 'received',
    reinvestedShares: reinvested ? reinvestedShares : undefined,
  });
}

/**
 * Get dividend summary
 */
export async function getDividendSummary(): Promise<DividendSummary> {
  const dividends = await getDividends();
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
  const lastMonthStart = lastMonth.toISOString().split('T')[0];
  const lastMonthEndStr = lastMonthEnd.toISOString().split('T')[0];

  let totalReceived = 0;
  let totalReinvested = 0;
  let totalPending = 0;
  let ytdDividends = 0;
  let lastMonthDividends = 0;
  const upcomingDividends: DividendPayment[] = [];

  const today = now.toISOString().split('T')[0];

  dividends.forEach(d => {
    if (d.status === 'received') {
      totalReceived += d.totalAmount;
    } else if (d.status === 'reinvested') {
      totalReinvested += d.totalAmount;
    } else if (d.status === 'pending' || d.status === 'announced') {
      totalPending += d.totalAmount;
      if (d.paymentDate >= today) {
        upcomingDividends.push(d);
      }
    }

    // YTD calculation (all received/reinvested this year)
    if ((d.status === 'received' || d.status === 'reinvested') && d.paymentDate >= startOfYear) {
      ytdDividends += d.totalAmount;
    }

    // Last month calculation
    if (
      (d.status === 'received' || d.status === 'reinvested') &&
      d.paymentDate >= lastMonthStart &&
      d.paymentDate <= lastMonthEndStr
    ) {
      lastMonthDividends += d.totalAmount;
    }
  });

  // Calculate monthly average from YTD
  const monthsElapsed = now.getMonth() + 1;
  const monthlyAverage = ytdDividends / monthsElapsed;
  const annualProjection = monthlyAverage * 12;

  // Sort upcoming by date
  upcomingDividends.sort((a, b) => a.paymentDate.localeCompare(b.paymentDate));

  return {
    totalReceived: Math.round(totalReceived * 100) / 100,
    totalReinvested: Math.round(totalReinvested * 100) / 100,
    totalPending: Math.round(totalPending * 100) / 100,
    ytdDividends: Math.round(ytdDividends * 100) / 100,
    lastMonthDividends: Math.round(lastMonthDividends * 100) / 100,
    upcomingDividends: upcomingDividends.slice(0, 5),
    monthlyAverage: Math.round(monthlyAverage * 100) / 100,
    annualProjection: Math.round(annualProjection * 100) / 100,
  };
}

/**
 * Get dividend calendar for a month
 */
export async function getDividendCalendar(
  year: number,
  month: number
): Promise<DividendCalendarEntry[]> {
  const dividends = await getDividends();

  // Filter dividends for the specified month
  const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
  const monthDividends = dividends.filter(d => d.paymentDate.startsWith(monthStr));

  // Group by date
  const calendar: Record<string, DividendPayment[]> = {};
  monthDividends.forEach(d => {
    if (!calendar[d.paymentDate]) {
      calendar[d.paymentDate] = [];
    }
    calendar[d.paymentDate].push(d);
  });

  // Convert to array
  return Object.entries(calendar)
    .map(([date, payments]) => ({
      date,
      payments,
      totalAmount: payments.reduce((sum, p) => sum + p.totalAmount, 0),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Get dividend schedule for all holdings
 */
export async function getDividendSchedules(holdings: Holding[]): Promise<DividendSchedule[]> {
  const dividends = await getDividends();
  const schedules: DividendSchedule[] = [];

  // Only include holdings that have dividends
  const holdingsWithDividends = holdings.filter(h =>
    ['stock', 'etf'].includes(h.type)
  );

  for (const holding of holdingsWithDividends) {
    const holdingDividends = dividends
      .filter(d => d.holdingId === holding.id && (d.status === 'received' || d.status === 'reinvested'))
      .sort((a, b) => b.paymentDate.localeCompare(a.paymentDate));

    if (holdingDividends.length === 0) {
      // No dividend history, but might pay dividends
      schedules.push({
        holdingId: holding.id,
        holdingName: holding.name,
        symbol: holding.symbol,
        frequency: 'irregular',
      });
      continue;
    }

    // Calculate frequency from history
    const frequency = calculateDividendFrequency(holdingDividends);
    const lastDividend = holdingDividends[0];

    // Calculate annual amount
    let annualAmount = 0;
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const oneYearAgoStr = oneYearAgo.toISOString().split('T')[0];

    holdingDividends.forEach(d => {
      if (d.paymentDate >= oneYearAgoStr) {
        annualAmount += d.totalAmount;
      }
    });

    // Calculate yield
    const currentValue = holding.currentValue || holding.quantity * (holding.currentPrice || holding.purchasePrice);
    const annualYield = currentValue > 0 ? (annualAmount / currentValue) * 100 : 0;

    // Estimate next dividend date
    const nextExpectedDate = estimateNextDividendDate(lastDividend.paymentDate, frequency);

    schedules.push({
      holdingId: holding.id,
      holdingName: holding.name,
      symbol: holding.symbol,
      frequency,
      lastDividend: lastDividend.amount,
      lastPaymentDate: lastDividend.paymentDate,
      nextExpectedDate,
      annualYield: Math.round(annualYield * 100) / 100,
      annualAmount: Math.round(annualAmount * 100) / 100,
    });
  }

  return schedules;
}

/**
 * Calculate dividend frequency from payment history
 */
function calculateDividendFrequency(dividends: DividendPayment[]): DividendFrequency {
  if (dividends.length < 2) return 'irregular';

  // Calculate average days between payments
  let totalDays = 0;
  for (let i = 1; i < dividends.length; i++) {
    const date1 = new Date(dividends[i - 1].paymentDate);
    const date2 = new Date(dividends[i].paymentDate);
    const days = Math.abs(date1.getTime() - date2.getTime()) / (1000 * 60 * 60 * 24);
    totalDays += days;
  }

  const avgDays = totalDays / (dividends.length - 1);

  if (avgDays <= 35) return 'monthly';
  if (avgDays <= 100) return 'quarterly';
  if (avgDays <= 200) return 'semi-annual';
  if (avgDays <= 400) return 'annual';
  return 'irregular';
}

/**
 * Estimate next dividend date based on frequency
 */
function estimateNextDividendDate(lastDate: string, frequency: DividendFrequency): string {
  const date = new Date(lastDate);

  switch (frequency) {
    case 'monthly':
      date.setMonth(date.getMonth() + 1);
      break;
    case 'quarterly':
      date.setMonth(date.getMonth() + 3);
      break;
    case 'semi-annual':
      date.setMonth(date.getMonth() + 6);
      break;
    case 'annual':
      date.setFullYear(date.getFullYear() + 1);
      break;
    default:
      return '';
  }

  return date.toISOString().split('T')[0];
}

/**
 * Get dividend history by month
 */
export async function getDividendHistory(
  months: number = 12
): Promise<{ month: string; amount: number }[]> {
  const dividends = await getDividends();
  const now = new Date();
  const history: Record<string, number> = {};

  // Initialize months
  for (let i = 0; i < months; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    history[key] = 0;
  }

  // Sum dividends by month
  dividends.forEach(d => {
    if (d.status === 'received' || d.status === 'reinvested') {
      const month = d.paymentDate.substring(0, 7);
      if (month in history) {
        history[month] += d.totalAmount;
      }
    }
  });

  // Convert to array and sort
  return Object.entries(history)
    .map(([month, amount]) => ({
      month,
      amount: Math.round(amount * 100) / 100,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

/**
 * Create dividend from holding data (for quick entry)
 */
export async function createDividendFromHolding(
  holding: Holding,
  amount: number,
  paymentDate: string,
  exDate?: string
): Promise<DividendPayment> {
  const totalAmount = amount * holding.quantity;

  return addDividend({
    holdingId: holding.id,
    holdingName: holding.name,
    symbol: holding.symbol,
    exDate: exDate || paymentDate,
    paymentDate,
    amount,
    totalAmount,
    shares: holding.quantity,
    status: 'pending',
  });
}

/**
 * Calculate dividend yield for a holding
 */
export function calculateDividendYield(
  annualDividend: number,
  currentPrice: number
): number {
  if (currentPrice <= 0) return 0;
  return Math.round((annualDividend / currentPrice) * 100 * 100) / 100;
}

/**
 * Clear all dividend data (for testing/reset)
 */
export async function clearDividends(): Promise<void> {
  await AsyncStorage.removeItem(DIVIDENDS_KEY);
}

export default {
  getDividends,
  getHoldingDividends,
  addDividend,
  updateDividend,
  deleteDividend,
  markAsReceived,
  getDividendSummary,
  getDividendCalendar,
  getDividendSchedules,
  getDividendHistory,
  createDividendFromHolding,
  calculateDividendYield,
  clearDividends,
};
