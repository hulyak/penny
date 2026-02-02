import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateWithGemini } from './gemini';

const REMINDERS_KEY = 'penny_smart_reminders';
const REMINDER_HISTORY_KEY = 'penny_reminder_history';

export type ReminderType =
  | 'bill_due'
  | 'savings_day'
  | 'check_in'
  | 'budget_review'
  | 'goal_progress'
  | 'learning'
  | 'celebration'
  | 'custom';

export type ReminderFrequency = 'once' | 'daily' | 'weekly' | 'monthly' | 'smart';

export interface SmartReminder {
  id: string;
  type: ReminderType;
  title: string;
  message: string;
  scheduledFor: string; // ISO date
  frequency: ReminderFrequency;
  isActive: boolean;
  lastTriggered?: string;
  context?: Record<string, unknown>;
  priority: 'low' | 'medium' | 'high';
  actionLabel?: string;
  actionRoute?: string;
}

export interface ReminderTrigger {
  reminder: SmartReminder;
  shouldShow: boolean;
  personalizedMessage?: string;
}

// Default smart reminders
const DEFAULT_REMINDERS: Omit<SmartReminder, 'id'>[] = [
  {
    type: 'check_in',
    title: 'Daily Check-in',
    message: "How's your financial day going?",
    scheduledFor: '09:00',
    frequency: 'daily',
    isActive: true,
    priority: 'medium',
    actionLabel: 'Check In',
    actionRoute: '/(tabs)',
  },
  {
    type: 'savings_day',
    title: 'Savings Sunday',
    message: 'Review your savings progress this week',
    scheduledFor: 'sunday_10:00',
    frequency: 'weekly',
    isActive: true,
    priority: 'medium',
    actionLabel: 'Review',
    actionRoute: '/(tabs)/plan',
  },
  {
    type: 'budget_review',
    title: 'Mid-Month Budget Check',
    message: "You're halfway through the month. Let's check your spending.",
    scheduledFor: '15_12:00', // 15th of month at noon
    frequency: 'monthly',
    isActive: true,
    priority: 'high',
    actionLabel: 'Review Budget',
    actionRoute: '/(tabs)/scenarios',
  },
  {
    type: 'learning',
    title: 'Financial Tip Time',
    message: 'Learn something new about money today',
    scheduledFor: '19:00',
    frequency: 'smart', // AI decides when to show
    isActive: true,
    priority: 'low',
    actionLabel: 'Learn',
    actionRoute: '/(tabs)/learn',
  },
];

export async function getReminders(): Promise<SmartReminder[]> {
  try {
    const stored = await AsyncStorage.getItem(REMINDERS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }

    // Initialize with defaults
    const reminders: SmartReminder[] = DEFAULT_REMINDERS.map((r, i) => ({
      ...r,
      id: `reminder_${i}`,
    }));
    await AsyncStorage.setItem(REMINDERS_KEY, JSON.stringify(reminders));
    return reminders;
  } catch (error) {
    console.error('[SmartReminders] Error loading reminders:', error);
    return [];
  }
}

export async function saveReminders(reminders: SmartReminder[]): Promise<void> {
  try {
    await AsyncStorage.setItem(REMINDERS_KEY, JSON.stringify(reminders));
  } catch (error) {
    console.error('[SmartReminders] Error saving reminders:', error);
  }
}

export async function addReminder(reminder: Omit<SmartReminder, 'id'>): Promise<SmartReminder> {
  const reminders = await getReminders();
  const newReminder: SmartReminder = {
    ...reminder,
    id: `reminder_${Date.now()}`,
  };
  reminders.push(newReminder);
  await saveReminders(reminders);
  return newReminder;
}

export async function updateReminder(id: string, updates: Partial<SmartReminder>): Promise<void> {
  const reminders = await getReminders();
  const index = reminders.findIndex(r => r.id === id);
  if (index !== -1) {
    reminders[index] = { ...reminders[index], ...updates };
    await saveReminders(reminders);
  }
}

export async function deleteReminder(id: string): Promise<void> {
  const reminders = await getReminders();
  const filtered = reminders.filter(r => r.id !== id);
  await saveReminders(filtered);
}

export async function checkReminders(context: {
  currentTime: Date;
  healthScore: number;
  savingsRate: number;
  streak: number;
  lastCheckIn?: string;
}): Promise<ReminderTrigger[]> {
  const reminders = await getReminders();
  const triggers: ReminderTrigger[] = [];

  const now = context.currentTime;
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentDay = now.getDate();
  const currentDayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

  for (const reminder of reminders) {
    if (!reminder.isActive) continue;

    let shouldTrigger = false;
    const lastTriggered = reminder.lastTriggered
      ? new Date(reminder.lastTriggered)
      : null;

    switch (reminder.frequency) {
      case 'daily': {
        // Check if scheduled time matches and hasn't triggered today
        const [schedHour, schedMin] = reminder.scheduledFor.split(':').map(Number);
        const isRightTime = currentHour === schedHour && currentMinute >= schedMin && currentMinute < schedMin + 30;
        const notTriggeredToday = !lastTriggered || lastTriggered.toDateString() !== now.toDateString();
        shouldTrigger = isRightTime && notTriggeredToday;
        break;
      }

      case 'weekly': {
        // Format: "dayofweek_HH:MM"
        const [dayTime] = reminder.scheduledFor.split('_');
        const [day, time] = [dayTime.toLowerCase(), reminder.scheduledFor.split('_')[1]];
        const [schedHour, schedMin] = time ? time.split(':').map(Number) : [10, 0];

        const isRightDay = currentDayOfWeek.startsWith(day.substring(0, 3));
        const isRightTime = currentHour === schedHour && currentMinute >= schedMin && currentMinute < schedMin + 30;
        const notTriggeredThisWeek = !lastTriggered ||
          (now.getTime() - lastTriggered.getTime()) > 6 * 24 * 60 * 60 * 1000;

        shouldTrigger = isRightDay && isRightTime && notTriggeredThisWeek;
        break;
      }

      case 'monthly': {
        // Format: "DD_HH:MM"
        const [dayStr, time] = reminder.scheduledFor.split('_');
        const schedDay = parseInt(dayStr);
        const [schedHour, schedMin] = time ? time.split(':').map(Number) : [12, 0];

        const isRightDay = currentDay === schedDay;
        const isRightTime = currentHour === schedHour && currentMinute >= schedMin && currentMinute < schedMin + 30;
        const notTriggeredThisMonth = !lastTriggered ||
          lastTriggered.getMonth() !== now.getMonth();

        shouldTrigger = isRightDay && isRightTime && notTriggeredThisMonth;
        break;
      }

      case 'smart': {
        // AI decides based on context
        shouldTrigger = await shouldTriggerSmartReminder(reminder, context);
        break;
      }

      case 'once': {
        const scheduledDate = new Date(reminder.scheduledFor);
        shouldTrigger = now >= scheduledDate && !lastTriggered;
        break;
      }
    }

    if (shouldTrigger) {
      // Generate personalized message
      let personalizedMessage: string | undefined;
      try {
        personalizedMessage = await generatePersonalizedReminderMessage(reminder, context);
      } catch (e) {
        // Use default message
      }

      triggers.push({
        reminder,
        shouldShow: true,
        personalizedMessage,
      });

      // Mark as triggered
      reminder.lastTriggered = now.toISOString();
    }
  }

  // Save updated reminders
  await saveReminders(reminders);

  return triggers;
}

async function shouldTriggerSmartReminder(
  reminder: SmartReminder,
  context: {
    healthScore: number;
    savingsRate: number;
    streak: number;
    lastCheckIn?: string;
  }
): Promise<boolean> {
  // Smart logic based on context
  const now = new Date();
  const currentHour = now.getHours();

  // Don't show during sleeping hours
  if (currentHour < 8 || currentHour > 21) return false;

  // Learning reminders - show when user has been consistent
  if (reminder.type === 'learning') {
    return context.streak >= 3 && currentHour >= 18 && currentHour <= 20;
  }

  // Celebration reminders - show when there's good news
  if (reminder.type === 'celebration') {
    return context.savingsRate >= 20 || context.healthScore >= 80;
  }

  // Goal progress - show mid-week
  if (reminder.type === 'goal_progress') {
    const dayOfWeek = now.getDay();
    return dayOfWeek === 3 && currentHour === 12; // Wednesday noon
  }

  return false;
}

async function generatePersonalizedReminderMessage(
  reminder: SmartReminder,
  context: {
    healthScore: number;
    savingsRate: number;
    streak: number;
  }
): Promise<string> {
  try {
    const prompt = `You are Penny. Generate a brief, personalized reminder message.

Reminder type: ${reminder.type}
Default message: ${reminder.message}
User context:
- Health score: ${context.healthScore}/100
- Savings rate: ${context.savingsRate.toFixed(1)}%
- Check-in streak: ${context.streak} days

Make it personal, warm, and under 20 words. Reference their streak or progress if relevant.`;

    return await generateWithGemini({
      prompt,
      temperature: 0.8,
      maxTokens: 50,
      thinkingLevel: 'minimal',
    });
  } catch (error) {
    return reminder.message;
  }
}

// Pre-built reminder templates
export const REMINDER_TEMPLATES: Omit<SmartReminder, 'id' | 'isActive' | 'lastTriggered'>[] = [
  {
    type: 'bill_due',
    title: 'Bill Reminder',
    message: 'Your bill is due soon',
    scheduledFor: '',
    frequency: 'monthly',
    priority: 'high',
    actionLabel: 'View Bills',
  },
  {
    type: 'savings_day',
    title: 'Payday Savings',
    message: 'Payday! Time to move money to savings',
    scheduledFor: '',
    frequency: 'monthly',
    priority: 'high',
    actionLabel: 'Transfer',
  },
  {
    type: 'budget_review',
    title: 'Weekly Spending Check',
    message: "Let's see how this week's spending looks",
    scheduledFor: 'friday_18:00',
    frequency: 'weekly',
    priority: 'medium',
    actionLabel: 'Review',
    actionRoute: '/(tabs)/scenarios',
  },
  {
    type: 'goal_progress',
    title: 'Goal Check-in',
    message: 'How are your financial goals coming along?',
    scheduledFor: '',
    frequency: 'weekly',
    priority: 'medium',
    actionLabel: 'Check Goals',
    actionRoute: '/(tabs)/plan',
  },
];

export async function createBillReminder(params: {
  billName: string;
  amount: number;
  dueDay: number;
  reminderDaysBefore: number;
}): Promise<SmartReminder> {
  const { billName, amount, dueDay, reminderDaysBefore } = params;

  const reminderDay = dueDay - reminderDaysBefore;
  const adjustedDay = reminderDay <= 0 ? reminderDay + 30 : reminderDay;

  return addReminder({
    type: 'bill_due',
    title: `${billName} Due Soon`,
    message: `Your ${billName} bill ($${amount}) is due in ${reminderDaysBefore} days`,
    scheduledFor: `${adjustedDay}_09:00`,
    frequency: 'monthly',
    priority: 'high',
    isActive: true,
    context: { billName, amount, dueDay },
    actionLabel: 'View Details',
  });
}

export async function createPaydaySavingsReminder(params: {
  payday: number; // day of month
  savingsAmount: number;
}): Promise<SmartReminder> {
  const { payday, savingsAmount } = params;

  return addReminder({
    type: 'savings_day',
    title: 'Payday Savings Time!',
    message: `Move $${savingsAmount} to savings today`,
    scheduledFor: `${payday}_10:00`,
    frequency: 'monthly',
    priority: 'high',
    isActive: true,
    context: { payday, savingsAmount },
    actionLabel: 'Transfer Now',
  });
}

// Log reminder history for analytics
export async function logReminderInteraction(
  reminderId: string,
  action: 'shown' | 'clicked' | 'dismissed'
): Promise<void> {
  try {
    const historyStr = await AsyncStorage.getItem(REMINDER_HISTORY_KEY);
    const history = historyStr ? JSON.parse(historyStr) : [];

    history.push({
      reminderId,
      action,
      timestamp: new Date().toISOString(),
    });

    // Keep last 100 interactions
    const trimmed = history.slice(-100);
    await AsyncStorage.setItem(REMINDER_HISTORY_KEY, JSON.stringify(trimmed));
  } catch (error) {
    console.error('[SmartReminders] Error logging interaction:', error);
  }
}
