import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PriceAlert, Holding } from '@/types';
import { getPrice, hasLivePricing } from './priceService';

const ALERTS_STORAGE_KEY = 'penny_portfolio_alerts';
const LAST_CHECK_KEY = 'penny_alerts_last_check';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Request notification permissions
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  return finalStatus === 'granted';
}

/**
 * Load alerts from storage
 */
export async function loadAlerts(): Promise<PriceAlert[]> {
  try {
    const stored = await AsyncStorage.getItem(ALERTS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('[AlertService] Failed to load alerts:', error);
    return [];
  }
}

/**
 * Save alerts to storage
 */
export async function saveAlerts(alerts: PriceAlert[]): Promise<void> {
  try {
    await AsyncStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify(alerts));
  } catch (error) {
    console.error('[AlertService] Failed to save alerts:', error);
  }
}

/**
 * Add a new alert
 */
export async function addAlert(alert: PriceAlert): Promise<void> {
  const alerts = await loadAlerts();
  alerts.push(alert);
  await saveAlerts(alerts);

  // Schedule reminder if it's a date-based alert
  if (alert.type === 'maturity' || alert.type === 'reminder') {
    await scheduleReminderNotification(alert);
  }
}

/**
 * Update an existing alert
 */
export async function updateAlert(updatedAlert: PriceAlert): Promise<void> {
  const alerts = await loadAlerts();
  const index = alerts.findIndex((a) => a.id === updatedAlert.id);
  if (index >= 0) {
    alerts[index] = updatedAlert;
    await saveAlerts(alerts);
  }
}

/**
 * Delete an alert
 */
export async function deleteAlert(alertId: string): Promise<void> {
  const alerts = await loadAlerts();
  const filtered = alerts.filter((a) => a.id !== alertId);
  await saveAlerts(filtered);

  // Cancel any scheduled notification
  await Notifications.cancelScheduledNotificationAsync(alertId);
}

/**
 * Toggle alert active status
 */
export async function toggleAlert(alertId: string): Promise<void> {
  const alerts = await loadAlerts();
  const alert = alerts.find((a) => a.id === alertId);
  if (alert) {
    alert.isActive = !alert.isActive;
    await saveAlerts(alerts);

    if (!alert.isActive) {
      await Notifications.cancelScheduledNotificationAsync(alertId);
    } else if (alert.type === 'maturity' || alert.type === 'reminder') {
      await scheduleReminderNotification(alert);
    }
  }
}

// Maturity reminder intervals in days
const MATURITY_REMINDER_INTERVALS = [30, 7, 1, 0]; // 30 days, 7 days, 1 day, day-of

/**
 * Schedule multiple reminder notifications for maturity dates
 */
async function scheduleReminderNotification(alert: PriceAlert): Promise<void> {
  if (!alert.targetDate || !alert.isActive) return;

  const targetDate = new Date(alert.targetDate);
  const now = new Date();

  // Don't schedule if date has passed
  if (targetDate <= now) return;

  // Cancel any existing notifications for this alert first
  await cancelMaturityReminders(alert.id);

  if (alert.type === 'maturity') {
    // Schedule multiple reminders for maturity alerts
    for (const daysBefore of MATURITY_REMINDER_INTERVALS) {
      const reminderDate = new Date(targetDate);
      reminderDate.setDate(reminderDate.getDate() - daysBefore);

      if (reminderDate > now) {
        const identifier = daysBefore === 0 ? alert.id : `${alert.id}_${daysBefore}d`;
        const title = getReminderTitle(daysBefore);
        const body = getReminderBody(alert.message, daysBefore);

        await Notifications.scheduleNotificationAsync({
          identifier,
          content: {
            title,
            body,
            data: { alertId: alert.id, type: 'maturity_reminder', daysBefore },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: reminderDate,
          },
        });
      }
    }
  } else {
    // Regular reminder - just schedule for the target date
    await Notifications.scheduleNotificationAsync({
      identifier: alert.id,
      content: {
        title: 'Reminder',
        body: alert.message,
        data: { alertId: alert.id, type: alert.type },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: targetDate,
      },
    });
  }
}

/**
 * Cancel all maturity reminders for an alert
 */
async function cancelMaturityReminders(alertId: string): Promise<void> {
  const identifiersToCancel = [
    alertId,
    ...MATURITY_REMINDER_INTERVALS.filter(d => d > 0).map(d => `${alertId}_${d}d`),
  ];

  for (const identifier of identifiersToCancel) {
    try {
      await Notifications.cancelScheduledNotificationAsync(identifier);
    } catch {
      // Ignore errors for non-existent notifications
    }
  }
}

/**
 * Get reminder title based on days before maturity
 */
function getReminderTitle(daysBefore: number): string {
  switch (daysBefore) {
    case 0:
      return 'Maturity Today!';
    case 1:
      return 'Maturity Tomorrow';
    case 7:
      return 'Maturity in 1 Week';
    case 30:
      return 'Maturity in 30 Days';
    default:
      return `Maturity in ${daysBefore} Days`;
  }
}

/**
 * Get reminder body based on days before maturity
 */
function getReminderBody(message: string, daysBefore: number): string {
  switch (daysBefore) {
    case 0:
      return `${message} - matures today! Time to review your options.`;
    case 1:
      return `${message} - matures tomorrow! Start planning your next steps.`;
    case 7:
      return `${message} - matures in one week. Consider your reinvestment options.`;
    case 30:
      return `${message} - matures in 30 days. Good time to research alternatives.`;
    default:
      return `${message} - matures in ${daysBefore} days.`;
  }
}

/**
 * Send an immediate notification
 */
export async function sendNotification(
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
    },
    trigger: null, // Immediate
  });
}

/**
 * Check price alerts against current prices
 */
export async function checkPriceAlerts(holdings: Holding[]): Promise<PriceAlert[]> {
  const alerts = await loadAlerts();
  const triggeredAlerts: PriceAlert[] = [];

  // Get active price alerts
  const priceAlerts = alerts.filter(
    (a) => a.isActive && (a.type === 'price_above' || a.type === 'price_below') && a.holdingId
  );

  for (const alert of priceAlerts) {
    const holding = holdings.find((h) => h.id === alert.holdingId);
    if (!holding || !hasLivePricing(holding.type)) continue;

    // Get current price
    const priceResult = await getPrice(holding.type, holding.symbol);
    if (!priceResult) continue;

    const currentPrice = priceResult.price;
    const targetPrice = alert.targetValue || 0;

    let isTriggered = false;

    if (alert.type === 'price_above' && currentPrice >= targetPrice) {
      isTriggered = true;
    } else if (alert.type === 'price_below' && currentPrice <= targetPrice) {
      isTriggered = true;
    }

    if (isTriggered) {
      // Send notification
      const direction = alert.type === 'price_above' ? 'above' : 'below';
      await sendNotification(
        `Price Alert: ${holding.name}`,
        `${holding.symbol || holding.name} is now $${currentPrice.toFixed(2)}, ${direction} your target of $${targetPrice.toFixed(2)}`,
        { alertId: alert.id, holdingId: holding.id }
      );

      // Update alert
      alert.lastTriggered = new Date().toISOString();
      triggeredAlerts.push(alert);
    }
  }

  // Save updated alerts
  if (triggeredAlerts.length > 0) {
    await saveAlerts(alerts);
  }

  return triggeredAlerts;
}

/**
 * Check maturity/reminder alerts
 */
export async function checkDateAlerts(): Promise<PriceAlert[]> {
  const alerts = await loadAlerts();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const triggeredAlerts: PriceAlert[] = [];

  const dateAlerts = alerts.filter(
    (a) => a.isActive && (a.type === 'maturity' || a.type === 'reminder') && a.targetDate
  );

  for (const alert of dateAlerts) {
    const targetDate = new Date(alert.targetDate!);
    targetDate.setHours(0, 0, 0, 0);

    // Check if today is the target date
    if (targetDate.getTime() === today.getTime()) {
      await sendNotification(
        alert.type === 'maturity' ? 'Maturity Today!' : 'Reminder',
        alert.message,
        { alertId: alert.id }
      );

      alert.lastTriggered = new Date().toISOString();
      triggeredAlerts.push(alert);
    }
  }

  if (triggeredAlerts.length > 0) {
    await saveAlerts(alerts);
  }

  return triggeredAlerts;
}

/**
 * Get alerts for a specific holding
 */
export async function getAlertsForHolding(holdingId: string): Promise<PriceAlert[]> {
  const alerts = await loadAlerts();
  return alerts.filter((a) => a.holdingId === holdingId);
}

/**
 * Get all active alerts count
 */
export async function getActiveAlertsCount(): Promise<number> {
  const alerts = await loadAlerts();
  return alerts.filter((a) => a.isActive).length;
}

/**
 * Create a price alert
 */
export function createPriceAlert(
  holdingId: string,
  holdingName: string,
  type: 'price_above' | 'price_below',
  targetPrice: number
): PriceAlert {
  const direction = type === 'price_above' ? 'rises above' : 'falls below';
  return {
    id: `alert_${Date.now()}`,
    holdingId,
    type,
    targetValue: targetPrice,
    message: `${holdingName} ${direction} $${targetPrice.toFixed(2)}`,
    isActive: true,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Create a maturity/reminder alert
 */
export function createDateAlert(
  holdingId: string | undefined,
  type: 'maturity' | 'reminder',
  targetDate: string,
  message: string
): PriceAlert {
  return {
    id: `alert_${Date.now()}`,
    holdingId,
    type,
    targetDate,
    message,
    isActive: true,
    createdAt: new Date().toISOString(),
  };
}
