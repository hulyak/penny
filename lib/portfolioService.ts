import AsyncStorage from '@react-native-async-storage/async-storage';
import { Holding, PriceAlert } from '@/types';
import { firestoreHelpers, isFirebaseConfigured } from './firebase';
import { auth } from './firebase';

const HOLDINGS_STORAGE_KEY = 'penny_portfolio_holdings';
const ALERTS_STORAGE_KEY = 'penny_portfolio_alerts';
const SYNC_STATUS_KEY = 'penny_sync_status';

interface SyncStatus {
  lastSyncedAt: string | null;
  pendingChanges: boolean;
}

/**
 * Get the current user ID from Firebase Auth
 */
function getCurrentUserId(): string | null {
  return auth?.currentUser?.uid || null;
}

/**
 * Portfolio Service - Unified data layer with Firebase sync
 *
 * Strategy:
 * - Always read/write to AsyncStorage first (for offline support)
 * - Sync to Firebase when user is logged in
 * - On app start, merge Firebase data with local data
 */
export const portfolioService = {
  // ==================== HOLDINGS ====================

  /**
   * Get all holdings - reads from local storage, syncs from Firebase if available
   */
  async getHoldings(): Promise<Holding[]> {
    try {
      // First, get local holdings
      const localHoldings = await this.getLocalHoldings();

      // If user is logged in and Firebase is configured, try to sync
      const userId = getCurrentUserId();
      if (userId && isFirebaseConfigured) {
        try {
          const remoteHoldings = await firestoreHelpers.getHoldings(userId);

          // Merge remote with local (remote wins for conflicts, keep local-only items)
          const merged = this.mergeHoldings(localHoldings, remoteHoldings);

          // Save merged result locally
          await this.saveLocalHoldings(merged);

          // Update sync status
          await this.updateSyncStatus({ lastSyncedAt: new Date().toISOString(), pendingChanges: false });

          return merged;
        } catch (error) {
          console.warn('[PortfolioService] Firebase sync failed, using local data:', error);
          return localHoldings;
        }
      }

      return localHoldings;
    } catch (error) {
      console.error('[PortfolioService] Error getting holdings:', error);
      return [];
    }
  },

  /**
   * Save a holding - saves locally and syncs to Firebase
   */
  async saveHolding(holding: Holding): Promise<boolean> {
    try {
      // Save locally first
      const holdings = await this.getLocalHoldings();
      const index = holdings.findIndex(h => h.id === holding.id);

      if (index >= 0) {
        holdings[index] = { ...holding, updatedAt: new Date().toISOString() };
      } else {
        holdings.push({ ...holding, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
      }

      await this.saveLocalHoldings(holdings);

      // Sync to Firebase if logged in
      const userId = getCurrentUserId();
      if (userId && isFirebaseConfigured) {
        try {
          await firestoreHelpers.saveHolding(userId, holding);
          console.log('[PortfolioService] Holding synced to Firebase:', holding.id);
        } catch (error) {
          console.warn('[PortfolioService] Firebase save failed, marked for later sync:', error);
          await this.updateSyncStatus({ pendingChanges: true });
        }
      }

      return true;
    } catch (error) {
      console.error('[PortfolioService] Error saving holding:', error);
      return false;
    }
  },

  /**
   * Delete a holding - removes locally and from Firebase
   */
  async deleteHolding(holdingId: string): Promise<boolean> {
    try {
      // Delete locally first
      const holdings = await this.getLocalHoldings();
      const filtered = holdings.filter(h => h.id !== holdingId);
      await this.saveLocalHoldings(filtered);

      // Delete from Firebase if logged in
      const userId = getCurrentUserId();
      if (userId && isFirebaseConfigured) {
        try {
          await firestoreHelpers.deleteHolding(userId, holdingId);
          console.log('[PortfolioService] Holding deleted from Firebase:', holdingId);
        } catch (error) {
          console.warn('[PortfolioService] Firebase delete failed:', error);
        }
      }

      return true;
    } catch (error) {
      console.error('[PortfolioService] Error deleting holding:', error);
      return false;
    }
  },

  /**
   * Update holding prices - batch update for background refresh
   */
  async updateHoldingPrices(updates: { id: string; currentPrice: number; currentValue: number; lastPriceUpdate: string }[]): Promise<boolean> {
    try {
      const holdings = await this.getLocalHoldings();

      for (const update of updates) {
        const index = holdings.findIndex(h => h.id === update.id);
        if (index >= 0) {
          holdings[index] = {
            ...holdings[index],
            currentPrice: update.currentPrice,
            currentValue: update.currentValue,
            lastPriceUpdate: update.lastPriceUpdate,
          };
        }
      }

      await this.saveLocalHoldings(holdings);

      // Note: We don't sync price updates to Firebase to reduce writes
      // Prices are fetched fresh on each device

      return true;
    } catch (error) {
      console.error('[PortfolioService] Error updating prices:', error);
      return false;
    }
  },

  // ==================== ALERTS ====================

  /**
   * Get all alerts
   */
  async getAlerts(): Promise<PriceAlert[]> {
    try {
      const localAlerts = await this.getLocalAlerts();

      const userId = getCurrentUserId();
      if (userId && isFirebaseConfigured) {
        try {
          const remoteAlerts = await firestoreHelpers.getAlerts(userId);
          const merged = this.mergeAlerts(localAlerts, remoteAlerts);
          await this.saveLocalAlerts(merged);
          return merged;
        } catch (error) {
          console.warn('[PortfolioService] Firebase alerts sync failed:', error);
          return localAlerts;
        }
      }

      return localAlerts;
    } catch (error) {
      console.error('[PortfolioService] Error getting alerts:', error);
      return [];
    }
  },

  /**
   * Save an alert
   */
  async saveAlert(alert: PriceAlert): Promise<boolean> {
    try {
      const alerts = await this.getLocalAlerts();
      const index = alerts.findIndex(a => a.id === alert.id);

      if (index >= 0) {
        alerts[index] = alert;
      } else {
        alerts.push(alert);
      }

      await this.saveLocalAlerts(alerts);

      const userId = getCurrentUserId();
      if (userId && isFirebaseConfigured) {
        try {
          await firestoreHelpers.saveAlert(userId, alert);
        } catch (error) {
          console.warn('[PortfolioService] Firebase alert save failed:', error);
        }
      }

      return true;
    } catch (error) {
      console.error('[PortfolioService] Error saving alert:', error);
      return false;
    }
  },

  /**
   * Delete an alert
   */
  async deleteAlert(alertId: string): Promise<boolean> {
    try {
      const alerts = await this.getLocalAlerts();
      const filtered = alerts.filter(a => a.id !== alertId);
      await this.saveLocalAlerts(filtered);

      const userId = getCurrentUserId();
      if (userId && isFirebaseConfigured) {
        try {
          await firestoreHelpers.deleteAlert(userId, alertId);
        } catch (error) {
          console.warn('[PortfolioService] Firebase alert delete failed:', error);
        }
      }

      return true;
    } catch (error) {
      console.error('[PortfolioService] Error deleting alert:', error);
      return false;
    }
  },

  // ==================== SYNC ====================

  /**
   * Force sync all data with Firebase
   */
  async syncWithFirebase(): Promise<boolean> {
    const userId = getCurrentUserId();
    if (!userId || !isFirebaseConfigured) {
      console.log('[PortfolioService] Sync skipped - user not logged in or Firebase not configured');
      return false;
    }

    try {
      console.log('[PortfolioService] Starting full sync with Firebase...');

      // Sync holdings
      const localHoldings = await this.getLocalHoldings();
      const remoteHoldings = await firestoreHelpers.getHoldings(userId);
      const mergedHoldings = this.mergeHoldings(localHoldings, remoteHoldings);

      // Upload any local-only holdings to Firebase
      for (const holding of mergedHoldings) {
        const isRemote = remoteHoldings.some(r => r.id === holding.id);
        if (!isRemote) {
          await firestoreHelpers.saveHolding(userId, holding);
        }
      }

      await this.saveLocalHoldings(mergedHoldings);

      // Sync alerts
      const localAlerts = await this.getLocalAlerts();
      const remoteAlerts = await firestoreHelpers.getAlerts(userId);
      const mergedAlerts = this.mergeAlerts(localAlerts, remoteAlerts);

      for (const alert of mergedAlerts) {
        const isRemote = remoteAlerts.some(r => r.id === alert.id);
        if (!isRemote) {
          await firestoreHelpers.saveAlert(userId, alert);
        }
      }

      await this.saveLocalAlerts(mergedAlerts);

      await this.updateSyncStatus({ lastSyncedAt: new Date().toISOString(), pendingChanges: false });

      console.log('[PortfolioService] Full sync completed');
      return true;
    } catch (error) {
      console.error('[PortfolioService] Sync failed:', error);
      return false;
    }
  },

  /**
   * Get sync status
   */
  async getSyncStatus(): Promise<SyncStatus> {
    try {
      const stored = await AsyncStorage.getItem(SYNC_STATUS_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('[PortfolioService] Error getting sync status:', error);
    }
    return { lastSyncedAt: null, pendingChanges: false };
  },

  // ==================== LOCAL STORAGE HELPERS ====================

  async getLocalHoldings(): Promise<Holding[]> {
    try {
      const stored = await AsyncStorage.getItem(HOLDINGS_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('[PortfolioService] Error reading local holdings:', error);
      return [];
    }
  },

  async saveLocalHoldings(holdings: Holding[]): Promise<void> {
    await AsyncStorage.setItem(HOLDINGS_STORAGE_KEY, JSON.stringify(holdings));
  },

  async getLocalAlerts(): Promise<PriceAlert[]> {
    try {
      const stored = await AsyncStorage.getItem(ALERTS_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('[PortfolioService] Error reading local alerts:', error);
      return [];
    }
  },

  async saveLocalAlerts(alerts: PriceAlert[]): Promise<void> {
    await AsyncStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify(alerts));
  },

  async updateSyncStatus(update: Partial<SyncStatus>): Promise<void> {
    const current = await this.getSyncStatus();
    const updated = { ...current, ...update };
    await AsyncStorage.setItem(SYNC_STATUS_KEY, JSON.stringify(updated));
  },

  // ==================== MERGE HELPERS ====================

  /**
   * Merge local and remote holdings
   * - Remote wins for items that exist in both (by ID)
   * - Local-only items are preserved
   * - Remote-only items are added
   */
  mergeHoldings(local: Holding[], remote: Holding[]): Holding[] {
    const merged = new Map<string, Holding>();

    // Add all local items
    for (const item of local) {
      merged.set(item.id, item);
    }

    // Remote items override local (they're more authoritative)
    for (const item of remote) {
      const localItem = merged.get(item.id);
      if (localItem) {
        // Compare updatedAt timestamps, keep newer
        const localTime = new Date(localItem.updatedAt || 0).getTime();
        const remoteTime = new Date(item.updatedAt || 0).getTime();
        if (remoteTime >= localTime) {
          merged.set(item.id, item);
        }
      } else {
        merged.set(item.id, item);
      }
    }

    return Array.from(merged.values());
  },

  mergeAlerts(local: PriceAlert[], remote: PriceAlert[]): PriceAlert[] {
    const merged = new Map<string, PriceAlert>();

    for (const item of local) {
      merged.set(item.id, item);
    }

    for (const item of remote) {
      // For alerts, remote always wins (simpler conflict resolution)
      merged.set(item.id, item);
    }

    return Array.from(merged.values());
  },

  // ==================== CLEAR DATA ====================

  /**
   * Clear all local portfolio data (for logout)
   */
  async clearLocalData(): Promise<void> {
    await AsyncStorage.multiRemove([
      HOLDINGS_STORAGE_KEY,
      ALERTS_STORAGE_KEY,
      SYNC_STATUS_KEY,
    ]);
    console.log('[PortfolioService] Local data cleared');
  },
};

export default portfolioService;
