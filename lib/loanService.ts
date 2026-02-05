/**
 * Loan Amortization Service
 * Handles loan tracking, payment schedules, and amortization calculations
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const LOANS_KEY = 'penny_loans';
const LOAN_PAYMENTS_KEY = 'penny_loan_payments';

export interface Loan {
  id: string;
  name: string;
  lender: string;
  principal: number;
  interestRate: number; // Annual percentage rate
  termMonths: number;
  startDate: string; // ISO date
  monthlyPayment: number;
  paymentDay: number; // Day of month for payments (1-28)
  type: 'mortgage' | 'auto' | 'personal' | 'student' | 'other';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LoanPayment {
  id: string;
  loanId: string;
  paymentNumber: number;
  dueDate: string;
  paidDate?: string;
  amount: number;
  principalPortion: number;
  interestPortion: number;
  remainingBalance: number;
  status: 'scheduled' | 'paid' | 'missed' | 'partial';
  actualAmount?: number; // If different from scheduled
  notes?: string;
  createdAt: string;
}

export interface AmortizationEntry {
  paymentNumber: number;
  date: string;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
}

export interface LoanSummary {
  totalLoans: number;
  totalBalance: number;
  totalMonthlyPayment: number;
  totalInterestPaid: number;
  totalPrincipalPaid: number;
  upcomingPayments: LoanPayment[];
}

/**
 * Calculate monthly payment using standard amortization formula
 */
export function calculateMonthlyPayment(
  principal: number,
  annualRate: number,
  termMonths: number
): number {
  if (annualRate === 0) {
    return principal / termMonths;
  }

  const monthlyRate = annualRate / 100 / 12;
  const payment = principal *
    (monthlyRate * Math.pow(1 + monthlyRate, termMonths)) /
    (Math.pow(1 + monthlyRate, termMonths) - 1);

  return Math.round(payment * 100) / 100;
}

/**
 * Generate full amortization schedule
 */
export function generateAmortizationSchedule(
  principal: number,
  annualRate: number,
  termMonths: number,
  startDate: string,
  paymentDay: number = 1
): AmortizationEntry[] {
  const schedule: AmortizationEntry[] = [];
  const monthlyPayment = calculateMonthlyPayment(principal, annualRate, termMonths);
  const monthlyRate = annualRate / 100 / 12;

  let balance = principal;
  const start = new Date(startDate);

  for (let i = 1; i <= termMonths; i++) {
    const interest = balance * monthlyRate;
    const principalPortion = monthlyPayment - interest;
    balance = Math.max(0, balance - principalPortion);

    // Calculate payment date
    const paymentDate = new Date(start);
    paymentDate.setMonth(paymentDate.getMonth() + i);
    paymentDate.setDate(Math.min(paymentDay, 28));

    schedule.push({
      paymentNumber: i,
      date: paymentDate.toISOString().split('T')[0],
      payment: i === termMonths ? monthlyPayment + balance : monthlyPayment, // Adjust final payment
      principal: Math.round(principalPortion * 100) / 100,
      interest: Math.round(interest * 100) / 100,
      balance: Math.round(balance * 100) / 100,
    });
  }

  return schedule;
}

/**
 * Calculate remaining balance at a specific payment number
 */
export function calculateRemainingBalance(
  principal: number,
  annualRate: number,
  termMonths: number,
  paymentsMade: number
): number {
  if (paymentsMade >= termMonths) return 0;

  const monthlyPayment = calculateMonthlyPayment(principal, annualRate, termMonths);
  const monthlyRate = annualRate / 100 / 12;

  if (annualRate === 0) {
    return principal - (monthlyPayment * paymentsMade);
  }

  const balance = principal * Math.pow(1 + monthlyRate, paymentsMade) -
    monthlyPayment * ((Math.pow(1 + monthlyRate, paymentsMade) - 1) / monthlyRate);

  return Math.max(0, Math.round(balance * 100) / 100);
}

/**
 * Get all loans
 */
export async function getLoans(): Promise<Loan[]> {
  try {
    const stored = await AsyncStorage.getItem(LOANS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('[LoanService] Error loading loans:', error);
    return [];
  }
}

/**
 * Get a single loan by ID
 */
export async function getLoan(id: string): Promise<Loan | null> {
  const loans = await getLoans();
  return loans.find(l => l.id === id) || null;
}

/**
 * Add a new loan
 */
export async function addLoan(loan: Omit<Loan, 'id' | 'monthlyPayment' | 'createdAt' | 'updatedAt'>): Promise<Loan> {
  const loans = await getLoans();

  const monthlyPayment = calculateMonthlyPayment(
    loan.principal,
    loan.interestRate,
    loan.termMonths
  );

  const newLoan: Loan = {
    ...loan,
    id: `loan_${Date.now()}`,
    monthlyPayment,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  loans.push(newLoan);
  await AsyncStorage.setItem(LOANS_KEY, JSON.stringify(loans));

  // Generate initial payment schedule
  await generatePaymentSchedule(newLoan);

  return newLoan;
}

/**
 * Update a loan
 */
export async function updateLoan(id: string, updates: Partial<Loan>): Promise<Loan | null> {
  const loans = await getLoans();
  const index = loans.findIndex(l => l.id === id);

  if (index === -1) return null;

  // Recalculate monthly payment if terms changed
  if (updates.principal || updates.interestRate || updates.termMonths) {
    const principal = updates.principal ?? loans[index].principal;
    const interestRate = updates.interestRate ?? loans[index].interestRate;
    const termMonths = updates.termMonths ?? loans[index].termMonths;
    updates.monthlyPayment = calculateMonthlyPayment(principal, interestRate, termMonths);
  }

  loans[index] = {
    ...loans[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  await AsyncStorage.setItem(LOANS_KEY, JSON.stringify(loans));
  return loans[index];
}

/**
 * Delete a loan
 */
export async function deleteLoan(id: string): Promise<boolean> {
  const loans = await getLoans();
  const filtered = loans.filter(l => l.id !== id);

  if (filtered.length === loans.length) return false;

  await AsyncStorage.setItem(LOANS_KEY, JSON.stringify(filtered));

  // Also delete associated payments
  const payments = await getLoanPayments(id);
  const allPayments = await getAllPayments();
  const remainingPayments = allPayments.filter(p => p.loanId !== id);
  await AsyncStorage.setItem(LOAN_PAYMENTS_KEY, JSON.stringify(remainingPayments));

  return true;
}

/**
 * Get all loan payments
 */
async function getAllPayments(): Promise<LoanPayment[]> {
  try {
    const stored = await AsyncStorage.getItem(LOAN_PAYMENTS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('[LoanService] Error loading payments:', error);
    return [];
  }
}

/**
 * Get payments for a specific loan
 */
export async function getLoanPayments(loanId: string): Promise<LoanPayment[]> {
  const payments = await getAllPayments();
  return payments.filter(p => p.loanId === loanId).sort((a, b) => a.paymentNumber - b.paymentNumber);
}

/**
 * Generate payment schedule for a loan
 */
async function generatePaymentSchedule(loan: Loan): Promise<void> {
  const schedule = generateAmortizationSchedule(
    loan.principal,
    loan.interestRate,
    loan.termMonths,
    loan.startDate,
    loan.paymentDay
  );

  const payments: LoanPayment[] = schedule.map(entry => ({
    id: `payment_${loan.id}_${entry.paymentNumber}`,
    loanId: loan.id,
    paymentNumber: entry.paymentNumber,
    dueDate: entry.date,
    amount: entry.payment,
    principalPortion: entry.principal,
    interestPortion: entry.interest,
    remainingBalance: entry.balance,
    status: 'scheduled',
    createdAt: new Date().toISOString(),
  }));

  const existingPayments = await getAllPayments();
  const otherPayments = existingPayments.filter(p => p.loanId !== loan.id);
  await AsyncStorage.setItem(LOAN_PAYMENTS_KEY, JSON.stringify([...otherPayments, ...payments]));
}

/**
 * Record a payment
 */
export async function recordPayment(
  loanId: string,
  paymentNumber: number,
  actualAmount?: number,
  paidDate?: string,
  notes?: string
): Promise<LoanPayment | null> {
  const payments = await getAllPayments();
  const index = payments.findIndex(
    p => p.loanId === loanId && p.paymentNumber === paymentNumber
  );

  if (index === -1) return null;

  const payment = payments[index];
  const amount = actualAmount ?? payment.amount;

  payments[index] = {
    ...payment,
    status: amount >= payment.amount ? 'paid' : 'partial',
    actualAmount: actualAmount,
    paidDate: paidDate || new Date().toISOString().split('T')[0],
    notes,
  };

  await AsyncStorage.setItem(LOAN_PAYMENTS_KEY, JSON.stringify(payments));
  return payments[index];
}

/**
 * Get upcoming payments across all loans
 */
export async function getUpcomingPayments(daysAhead: number = 30): Promise<LoanPayment[]> {
  const payments = await getAllPayments();
  const today = new Date();
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysAhead);

  return payments
    .filter(p => {
      if (p.status === 'paid') return false;
      const dueDate = new Date(p.dueDate);
      return dueDate >= today && dueDate <= futureDate;
    })
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
}

/**
 * Get loan summary
 */
export async function getLoanSummary(): Promise<LoanSummary> {
  const loans = await getLoans();
  const allPayments = await getAllPayments();
  const upcomingPayments = await getUpcomingPayments();

  let totalBalance = 0;
  let totalMonthlyPayment = 0;
  let totalInterestPaid = 0;
  let totalPrincipalPaid = 0;

  for (const loan of loans) {
    const loanPayments = allPayments.filter(p => p.loanId === loan.id);
    const paidPayments = loanPayments.filter(p => p.status === 'paid' || p.status === 'partial');

    // Calculate remaining balance
    const lastPaid = paidPayments[paidPayments.length - 1];
    totalBalance += lastPaid ? lastPaid.remainingBalance : loan.principal;

    // Sum monthly payments
    totalMonthlyPayment += loan.monthlyPayment;

    // Sum paid amounts
    paidPayments.forEach(p => {
      totalInterestPaid += p.interestPortion;
      totalPrincipalPaid += p.principalPortion;
    });
  }

  return {
    totalLoans: loans.length,
    totalBalance: Math.round(totalBalance * 100) / 100,
    totalMonthlyPayment: Math.round(totalMonthlyPayment * 100) / 100,
    totalInterestPaid: Math.round(totalInterestPaid * 100) / 100,
    totalPrincipalPaid: Math.round(totalPrincipalPaid * 100) / 100,
    upcomingPayments,
  };
}

/**
 * Get payoff date for a loan
 */
export function getPayoffDate(loan: Loan): string {
  const start = new Date(loan.startDate);
  start.setMonth(start.getMonth() + loan.termMonths);
  return start.toISOString().split('T')[0];
}

/**
 * Calculate total interest over life of loan
 */
export function calculateTotalInterest(
  principal: number,
  annualRate: number,
  termMonths: number
): number {
  const monthlyPayment = calculateMonthlyPayment(principal, annualRate, termMonths);
  const totalPaid = monthlyPayment * termMonths;
  return Math.round((totalPaid - principal) * 100) / 100;
}

export default {
  calculateMonthlyPayment,
  generateAmortizationSchedule,
  calculateRemainingBalance,
  getLoans,
  getLoan,
  addLoan,
  updateLoan,
  deleteLoan,
  getLoanPayments,
  recordPayment,
  getUpcomingPayments,
  getLoanSummary,
  getPayoffDate,
  calculateTotalInterest,
};
