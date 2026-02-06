/**
 * Custom hook for portfolio data management
 *
 * Consolidates the duplicate price loading logic from
 * index.tsx and portfolio.tsx into a single reusable hook.
 */

import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Holding } from '@/types';
import { hasLivePricing, batchGetPrices } from '@/lib/priceService';
import portfolioService from '@/lib/portfolioService';
import portfolioHistory from '@/lib/portfolioHistory';
import logger from '@/lib/logger';

export interface PortfolioSummary {
  totalValue: number;
  totalInvested: number;
  totalGain: number;
  totalGainPercent: number;
}

export interface DayChange {
  valueChange: number;
  percentChange: number;
}

export interface UsePortfolioDataResult {
  holdings: Holding[];
  isLoading: boolean;
  isPriceLoading: boolean;
  refreshing: boolean;
  summary: PortfolioSummary;
  dayChange: DayChange | null;
  lastPriceUpdate: Date | null;
  refresh: () => Promise<void>;
  updatePrices: () => Promise<void>;
}

/**
 * Hook for managing portfolio data, prices, and calculations
 * Use this in any screen that needs portfolio data
 */
export function usePortfolioData(): UsePortfolioDataResult {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPriceLoading, setIsPriceLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [dayChange, setDayChange] = useState<DayChange | null>(null);
  const [lastPriceUpdate, setLastPriceUpdate] = useState<Date | null>(null);

  // Calculate summary from holdings
  const summary: PortfolioSummary = holdings.reduce(
    (acc, h) => {
      const currentValue = h.currentValue || h.quantity * (h.currentPrice || h.purchasePrice);
      const investedValue = h.quantity * h.purchasePrice;
      return {
        totalValue: acc.totalValue + currentValue,
        totalInvested: acc.totalInvested + investedValue,
        totalGain: acc.totalGain + (currentValue - investedValue),
        totalGainPercent: 0, // Calculated below
      };
    },
    { totalValue: 0, totalInvested: 0, totalGain: 0, totalGainPercent: 0 }
  );

  // Calculate percent after totals
  summary.totalGainPercent = summary.totalInvested > 0
    ? (summary.totalGain / summary.totalInvested) * 100
    : 0;

  // Load day change data
  const loadDayChange = useCallback(async (totalValue: number) => {
    try {
      const dayChangeData = await portfolioHistory.calculateDayChange(totalValue);
      if (dayChangeData) {
        setDayChange({
          valueChange: dayChangeData.valueChange,
          percentChange: dayChangeData.percentChange,
        });
      }
    } catch (err) {
      logger.warn('PortfolioData', 'Failed to calculate day change', err);
    }
  }, []);

  // Load holdings from storage
  const loadHoldings = useCallback(async () => {
    try {
      const loadedHoldings = await portfolioService.getHoldings();
      setHoldings(loadedHoldings);

      if (loadedHoldings.length > 0) {
        // Generate initial history for chart
        await portfolioHistory.generateInitialHistory(loadedHoldings);

        // Calculate total for day change
        const totalValue = loadedHoldings.reduce((sum, h) => {
          const value = h.currentValue || h.quantity * (h.currentPrice || h.purchasePrice);
          return sum + value;
        }, 0);
        await loadDayChange(totalValue);
      }

      return loadedHoldings;
    } catch (err) {
      logger.error('PortfolioData', 'Failed to load holdings', err);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [loadDayChange]);

  // Update prices for holdings with live pricing
  const updatePrices = useCallback(async () => {
    if (holdings.length === 0) return;

    setIsPriceLoading(true);
    try {
      const holdingsToUpdate = holdings
        .filter((h) => hasLivePricing(h.type))
        .map((h) => ({ id: h.id, type: h.type, symbol: h.symbol }));

      if (holdingsToUpdate.length === 0) {
        setIsPriceLoading(false);
        return;
      }

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

      setHoldings(updatedHoldings);
      setLastPriceUpdate(new Date());

      // Persist updates
      await portfolioService.updateHoldingPrices(priceUpdates);
      await portfolioHistory.saveSnapshot(updatedHoldings);

      // Recalculate day change
      const totalValue = updatedHoldings.reduce((sum, h) => {
        const value = h.currentValue || h.quantity * (h.currentPrice || h.purchasePrice);
        return sum + value;
      }, 0);
      await loadDayChange(totalValue);

      logger.debug('PortfolioData', `Updated prices for ${priceUpdates.length} holdings`);
    } catch (err) {
      logger.error('PortfolioData', 'Failed to update prices', err);
    } finally {
      setIsPriceLoading(false);
    }
  }, [holdings, loadDayChange]);

  // Refresh all data
  const refresh = useCallback(async () => {
    setRefreshing(true);
    const loadedHoldings = await loadHoldings();
    if (loadedHoldings.length > 0) {
      // Need to manually update after load since holdings state isn't updated yet
      setIsPriceLoading(true);
      try {
        const holdingsToUpdate = loadedHoldings
          .filter((h) => hasLivePricing(h.type))
          .map((h) => ({ id: h.id, type: h.type, symbol: h.symbol }));

        if (holdingsToUpdate.length > 0) {
          const prices = await batchGetPrices(holdingsToUpdate);
          const priceUpdates: { id: string; currentPrice: number; currentValue: number; lastPriceUpdate: string }[] = [];

          const updatedHoldings = loadedHoldings.map((h) => {
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

          setHoldings(updatedHoldings);
          setLastPriceUpdate(new Date());
          await portfolioService.updateHoldingPrices(priceUpdates);
          await portfolioHistory.saveSnapshot(updatedHoldings);
        }
      } catch (err) {
        logger.error('PortfolioData', 'Failed to update prices on refresh', err);
      } finally {
        setIsPriceLoading(false);
      }
    }
    setRefreshing(false);
  }, [loadHoldings]);

  // Load on focus
  useFocusEffect(
    useCallback(() => {
      loadHoldings();
    }, [loadHoldings])
  );

  return {
    holdings,
    isLoading,
    isPriceLoading,
    refreshing,
    summary,
    dayChange,
    lastPriceUpdate,
    refresh,
    updatePrices,
  };
}
