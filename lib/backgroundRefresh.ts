import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Holding } from '@/types';
import { batchGetPrices, hasLivePricing } from './priceService';
import { checkPriceAlerts, checkDateAlerts } from './alertService';
import portfolioService from './portfolioService';

const BACKGROUND_FETCH_TASK = 'PORTFOLIO_PRICE_REFRESH';
const LAST_BACKGROUND_REFRESH_KEY = 'penny_last_background_refresh';

/**
 * Define the background task that fetches prices and checks alerts
 */
TaskManager.defineTask(BACKGROUND_FETCH_TASK, async () => {
  console.log('[BackgroundRefresh] Starting background price refresh...');

  try {
    // Load holdings using portfolio service
    const holdings = await portfolioService.getLocalHoldings();
    if (holdings.length === 0) {
      console.log('[BackgroundRefresh] No holdings found');
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    // Filter holdings that have live pricing
    const holdingsToUpdate = holdings
      .filter((h) => hasLivePricing(h.type))
      .map((h) => ({ id: h.id, type: h.type, symbol: h.symbol }));

    if (holdingsToUpdate.length === 0) {
      console.log('[BackgroundRefresh] No holdings with live pricing');
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    // Fetch updated prices
    const prices = await batchGetPrices(holdingsToUpdate);

    // Build price updates
    const priceUpdates: { id: string; currentPrice: number; currentValue: number; lastPriceUpdate: string }[] = [];

    // Update holdings with new prices
    const updatedHoldings = holdings.map((h) => {
      const priceData = prices[h.id];
      if (priceData) {
        priceUpdates.push({
          id: h.id,
          currentPrice: priceData.price,
          currentValue: h.quantity * priceData.price,
          lastPriceUpdate: priceData.timestamp,
        });
        return {
          ...h,
          currentPrice: priceData.price,
          currentValue: h.quantity * priceData.price,
          lastPriceUpdate: priceData.timestamp,
        };
      }
      return h;
    });

    // Save updated holdings via portfolio service
    await portfolioService.updateHoldingPrices(priceUpdates);

    // Save timestamp of last refresh
    await AsyncStorage.setItem(LAST_BACKGROUND_REFRESH_KEY, new Date().toISOString());

    // Check price alerts
    const triggeredPriceAlerts = await checkPriceAlerts(updatedHoldings);
    console.log(`[BackgroundRefresh] Triggered ${triggeredPriceAlerts.length} price alerts`);

    // Check date-based alerts (maturity reminders)
    const triggeredDateAlerts = await checkDateAlerts();
    console.log(`[BackgroundRefresh] Triggered ${triggeredDateAlerts.length} date alerts`);

    console.log('[BackgroundRefresh] Background refresh completed successfully');
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    console.error('[BackgroundRefresh] Error during background refresh:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

/**
 * Register the background fetch task
 */
export async function registerBackgroundRefresh(): Promise<boolean> {
  try {
    // Check if background fetch is available
    const status = await BackgroundFetch.getStatusAsync();

    if (status === BackgroundFetch.BackgroundFetchStatus.Restricted) {
      console.warn('[BackgroundRefresh] Background fetch is restricted');
      return false;
    }

    if (status === BackgroundFetch.BackgroundFetchStatus.Denied) {
      console.warn('[BackgroundRefresh] Background fetch is denied');
      return false;
    }

    // Check if task is already registered
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_FETCH_TASK);
    if (isRegistered) {
      console.log('[BackgroundRefresh] Task already registered');
      return true;
    }

    // Register the task with 30-minute minimum interval
    await BackgroundFetch.registerTaskAsync(BACKGROUND_FETCH_TASK, {
      minimumInterval: 30 * 60, // 30 minutes in seconds
      stopOnTerminate: false,
      startOnBoot: true,
    });

    console.log('[BackgroundRefresh] Background fetch task registered');
    return true;
  } catch (error: any) {
    // Gracefully handle the case where native module isn't configured yet
    // This happens when running in Expo Go or before a native rebuild
    if (error?.message?.includes('Background Fetch has not been configured') ||
        error?.message?.includes('UIBackgroundModes')) {
      console.warn('[BackgroundRefresh] Background fetch not available - requires native rebuild. Prices will refresh when app is open.');
      return false;
    }
    console.error('[BackgroundRefresh] Failed to register background fetch:', error);
    return false;
  }
}

/**
 * Unregister the background fetch task
 */
export async function unregisterBackgroundRefresh(): Promise<void> {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_FETCH_TASK);
    if (isRegistered) {
      await BackgroundFetch.unregisterTaskAsync(BACKGROUND_FETCH_TASK);
      console.log('[BackgroundRefresh] Background fetch task unregistered');
    }
  } catch (error) {
    console.error('[BackgroundRefresh] Failed to unregister background fetch:', error);
  }
}

/**
 * Get the timestamp of the last background refresh
 */
export async function getLastBackgroundRefresh(): Promise<Date | null> {
  try {
    const timestamp = await AsyncStorage.getItem(LAST_BACKGROUND_REFRESH_KEY);
    return timestamp ? new Date(timestamp) : null;
  } catch (error) {
    console.error('[BackgroundRefresh] Failed to get last refresh timestamp:', error);
    return null;
  }
}

/**
 * Check if background refresh is registered
 */
export async function isBackgroundRefreshRegistered(): Promise<boolean> {
  try {
    return await TaskManager.isTaskRegisteredAsync(BACKGROUND_FETCH_TASK);
  } catch (error) {
    console.error('[BackgroundRefresh] Failed to check task registration:', error);
    return false;
  }
}

/**
 * Get background fetch status
 */
export async function getBackgroundRefreshStatus(): Promise<BackgroundFetch.BackgroundFetchStatus | null> {
  try {
    return await BackgroundFetch.getStatusAsync();
  } catch (error) {
    console.error('[BackgroundRefresh] Failed to get status:', error);
    return null;
  }
}

/**
 * Trigger a manual background refresh (useful for testing)
 */
export async function triggerManualRefresh(): Promise<void> {
  console.log('[BackgroundRefresh] Triggering manual refresh...');
  try {
    // Load holdings using portfolio service
    const holdings = await portfolioService.getLocalHoldings();
    if (holdings.length === 0) {
      console.log('[BackgroundRefresh] No holdings found');
      return;
    }

    // Filter holdings that have live pricing
    const holdingsToUpdate = holdings
      .filter((h) => hasLivePricing(h.type))
      .map((h) => ({ id: h.id, type: h.type, symbol: h.symbol }));

    if (holdingsToUpdate.length === 0) {
      console.log('[BackgroundRefresh] No holdings with live pricing');
      return;
    }

    // Fetch updated prices
    const prices = await batchGetPrices(holdingsToUpdate);

    // Build price updates
    const priceUpdates: { id: string; currentPrice: number; currentValue: number; lastPriceUpdate: string }[] = [];

    // Update holdings with new prices
    holdings.forEach((h) => {
      const priceData = prices[h.id];
      if (priceData) {
        priceUpdates.push({
          id: h.id,
          currentPrice: priceData.price,
          currentValue: h.quantity * priceData.price,
          lastPriceUpdate: priceData.timestamp,
        });
      }
    });

    // Save updated holdings via portfolio service
    await portfolioService.updateHoldingPrices(priceUpdates);
    await AsyncStorage.setItem(LAST_BACKGROUND_REFRESH_KEY, new Date().toISOString());

    // Check alerts
    const updatedHoldings = await portfolioService.getLocalHoldings();
    await checkPriceAlerts(updatedHoldings);
    await checkDateAlerts();

    console.log('[BackgroundRefresh] Manual refresh completed');
  } catch (error) {
    console.error('[BackgroundRefresh] Manual refresh failed:', error);
  }
}
