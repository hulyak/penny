import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateWithGemini } from './gemini';

const ALERTS_KEY = 'penny_spending_alerts';
const BUDGET_KEY = 'penny_budgets';

export interface Budget {
  id: string;
  category: string;
  monthlyLimit: number;
  currentSpent: number;
  alertThreshold: number; // percentage (e.g., 80 = alert at 80%)
  isActive: boolean;
}

export interface SpendingAlert {
  id: string;
  type: 'approaching' | 'exceeded' | 'unusual' | 'tip';
  category: string;
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
  amount?: number;
  budgetLimit?: number;
  percentUsed?: number;
  createdAt: string;
  isRead: boolean;
  isDismissed: boolean;
}

export const DEFAULT_BUDGETS: Budget[] = [
  { id: 'food', category: 'Food & Dining', monthlyLimit: 500, currentSpent: 0, alertThreshold: 80, isActive: true },
  { id: 'transport', category: 'Transportation', monthlyLimit: 300, currentSpent: 0, alertThreshold: 80, isActive: true },
  { id: 'shopping', category: 'Shopping', monthlyLimit: 200, currentSpent: 0, alertThreshold: 75, isActive: true },
  { id: 'entertainment', category: 'Entertainment', monthlyLimit: 150, currentSpent: 0, alertThreshold: 80, isActive: true },
  { id: 'subscriptions', category: 'Subscriptions', monthlyLimit: 100, currentSpent: 0, alertThreshold: 90, isActive: true },
];

export async function getBudgets(): Promise<Budget[]> {
  try {
    const stored = await AsyncStorage.getItem(BUDGET_KEY);
    return stored ? JSON.parse(stored) : DEFAULT_BUDGETS;
  } catch (error) {
    console.error('[SpendingAlerts] Error loading budgets:', error);
    return DEFAULT_BUDGETS;
  }
}

export async function saveBudgets(budgets: Budget[]): Promise<void> {
  try {
    await AsyncStorage.setItem(BUDGET_KEY, JSON.stringify(budgets));
  } catch (error) {
    console.error('[SpendingAlerts] Error saving budgets:', error);
  }
}

export async function updateBudgetSpending(categoryId: string, amount: number): Promise<SpendingAlert | null> {
  const budgets = await getBudgets();
  const budget = budgets.find(b => b.id === categoryId);

  if (!budget || !budget.isActive) return null;

  const previousSpent = budget.currentSpent;
  budget.currentSpent += amount;

  await saveBudgets(budgets);

  // Check if we need to generate an alert
  const percentUsed = (budget.currentSpent / budget.monthlyLimit) * 100;
  const previousPercent = (previousSpent / budget.monthlyLimit) * 100;

  // Alert when crossing threshold
  if (previousPercent < budget.alertThreshold && percentUsed >= budget.alertThreshold) {
    return createAlert({
      type: 'approaching',
      category: budget.category,
      amount: budget.currentSpent,
      budgetLimit: budget.monthlyLimit,
      percentUsed,
    });
  }

  // Alert when exceeding budget
  if (previousPercent < 100 && percentUsed >= 100) {
    return createAlert({
      type: 'exceeded',
      category: budget.category,
      amount: budget.currentSpent,
      budgetLimit: budget.monthlyLimit,
      percentUsed,
    });
  }

  return null;
}

async function createAlert(params: {
  type: SpendingAlert['type'];
  category: string;
  amount?: number;
  budgetLimit?: number;
  percentUsed?: number;
}): Promise<SpendingAlert> {
  const { type, category, amount, budgetLimit, percentUsed } = params;

  let title = '';
  let message = '';
  let severity: SpendingAlert['severity'] = 'medium';

  switch (type) {
    case 'approaching':
      title = `${category} budget alert`;
      message = `You've used ${percentUsed?.toFixed(0)}% of your ${category.toLowerCase()} budget. $${(budgetLimit! - amount!).toFixed(0)} left for the month.`;
      severity = 'medium';
      break;
    case 'exceeded':
      title = `${category} budget exceeded`;
      message = `You've gone over your ${category.toLowerCase()} budget by $${(amount! - budgetLimit!).toFixed(0)}. Let's find ways to balance this.`;
      severity = 'high';
      break;
    case 'unusual':
      title = 'Unusual spending detected';
      message = `Your ${category.toLowerCase()} spending seems higher than usual. Want to review?`;
      severity = 'medium';
      break;
    default:
      title = 'Spending tip';
      message = `Here's a tip for managing your ${category.toLowerCase()} expenses.`;
      severity = 'low';
  }

  const alert: SpendingAlert = {
    id: `alert_${Date.now()}`,
    type,
    category,
    title,
    message,
    severity,
    amount,
    budgetLimit,
    percentUsed,
    createdAt: new Date().toISOString(),
    isRead: false,
    isDismissed: false,
  };

  await saveAlert(alert);
  return alert;
}

async function saveAlert(alert: SpendingAlert): Promise<void> {
  try {
    const alerts = await getAlerts();
    alerts.unshift(alert);
    // Keep only last 50 alerts
    const trimmed = alerts.slice(0, 50);
    await AsyncStorage.setItem(ALERTS_KEY, JSON.stringify(trimmed));
  } catch (error) {
    console.error('[SpendingAlerts] Error saving alert:', error);
  }
}

export async function getAlerts(): Promise<SpendingAlert[]> {
  try {
    const stored = await AsyncStorage.getItem(ALERTS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('[SpendingAlerts] Error loading alerts:', error);
    return [];
  }
}

export async function getUnreadAlerts(): Promise<SpendingAlert[]> {
  const alerts = await getAlerts();
  return alerts.filter(a => !a.isRead && !a.isDismissed);
}

export async function markAlertRead(alertId: string): Promise<void> {
  const alerts = await getAlerts();
  const alert = alerts.find(a => a.id === alertId);
  if (alert) {
    alert.isRead = true;
    await AsyncStorage.setItem(ALERTS_KEY, JSON.stringify(alerts));
  }
}

export async function dismissAlert(alertId: string): Promise<void> {
  const alerts = await getAlerts();
  const alert = alerts.find(a => a.id === alertId);
  if (alert) {
    alert.isDismissed = true;
    await AsyncStorage.setItem(ALERTS_KEY, JSON.stringify(alerts));
  }
}

export async function checkAllBudgets(): Promise<SpendingAlert[]> {
  const budgets = await getBudgets();
  const newAlerts: SpendingAlert[] = [];

  for (const budget of budgets) {
    if (!budget.isActive) continue;

    const percentUsed = (budget.currentSpent / budget.monthlyLimit) * 100;

    if (percentUsed >= 100) {
      const alert = await createAlert({
        type: 'exceeded',
        category: budget.category,
        amount: budget.currentSpent,
        budgetLimit: budget.monthlyLimit,
        percentUsed,
      });
      newAlerts.push(alert);
    } else if (percentUsed >= budget.alertThreshold) {
      const alert = await createAlert({
        type: 'approaching',
        category: budget.category,
        amount: budget.currentSpent,
        budgetLimit: budget.monthlyLimit,
        percentUsed,
      });
      newAlerts.push(alert);
    }
  }

  return newAlerts;
}

export async function generateSmartSpendingTip(
  budgets: Budget[],
  totalMonthlyIncome: number
): Promise<string> {
  const overBudget = budgets.filter(b => b.currentSpent > b.monthlyLimit);
  const nearLimit = budgets.filter(b => {
    const percent = (b.currentSpent / b.monthlyLimit) * 100;
    return percent >= 70 && percent < 100;
  });

  try {
    const prompt = `You are Penny, a helpful financial coach. Generate ONE brief, actionable spending tip.

User's budget situation:
- Over budget categories: ${overBudget.map(b => `${b.category} ($${b.currentSpent - b.monthlyLimit} over)`).join(', ') || 'None'}
- Near limit categories: ${nearLimit.map(b => `${b.category} (${((b.currentSpent / b.monthlyLimit) * 100).toFixed(0)}%)`).join(', ') || 'None'}
- Monthly income: $${totalMonthlyIncome}

Generate a specific, encouraging tip under 30 words. Focus on what they CAN do, not what they did wrong.`;

    return await generateWithGemini({
      prompt,
      temperature: 0.7,
      maxTokens: 80,
      thinkingLevel: 'low',
    });
  } catch (error) {
    return "Try the 'one in, one out' rule: before buying something new, consider what you could let go of.";
  }
}

export async function resetMonthlyBudgets(): Promise<void> {
  const budgets = await getBudgets();
  for (const budget of budgets) {
    budget.currentSpent = 0;
  }
  await saveBudgets(budgets);
}

// Check if it's a new month and reset budgets
export async function checkAndResetMonthlyBudgets(): Promise<boolean> {
  const LAST_RESET_KEY = 'penny_last_budget_reset';

  try {
    const lastReset = await AsyncStorage.getItem(LAST_RESET_KEY);
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${now.getMonth()}`;

    if (lastReset !== currentMonth) {
      await resetMonthlyBudgets();
      await AsyncStorage.setItem(LAST_RESET_KEY, currentMonth);
      return true;
    }
    return false;
  } catch (error) {
    console.error('[SpendingAlerts] Error checking monthly reset:', error);
    return false;
  }
}
