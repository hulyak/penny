import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserFinancials, FinancialSnapshot } from '@/types';

const STORAGE_KEYS = {
  FINANCIALS: 'clearpath_financials',
  ONBOARDED: 'clearpath_onboarded',
};

// Default financials for new users
const DEFAULT_FINANCIALS: UserFinancials = {
  monthlyIncome: 0,
  housingCost: 0,
  carCost: 0,
  essentialsCost: 0,
  savings: 0,
  debts: 0,
  emergencyFundGoal: 10000,
};

export const [AppProvider, useApp] = createContextHook(() => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasOnboarded, setHasOnboarded] = useState(false);
  const [financials, setFinancials] = useState<UserFinancials>(DEFAULT_FINANCIALS);
  const [snapshot, setSnapshot] = useState<FinancialSnapshot | null>(null);

  // Calculate snapshot from financials
  const calculateSnapshot = useCallback((fin: UserFinancials): FinancialSnapshot => {
    const totalExpenses = fin.housingCost + fin.carCost + fin.essentialsCost;
    const disposableIncome = fin.monthlyIncome - totalExpenses;
    const savingsRate = fin.monthlyIncome > 0 ? (disposableIncome / fin.monthlyIncome) * 100 : 0;
    const monthsOfRunway = totalExpenses > 0 ? fin.savings / totalExpenses : 0;
    const debtToIncomeRatio = fin.monthlyIncome > 0 ? (fin.debts / (fin.monthlyIncome * 12)) * 100 : 0;
    const fixedCostRatio = fin.monthlyIncome > 0 ? (totalExpenses / fin.monthlyIncome) * 100 : 0;

    let healthScore = 50;
    let healthLabel: 'Critical' | 'Needs Attention' | 'Stable' | 'Strong' | 'Excellent' = 'Stable';

    // Calculate health score
    if (savingsRate >= 20 && monthsOfRunway >= 6) {
      healthScore = 90;
      healthLabel = 'Excellent';
    } else if (savingsRate >= 15 && monthsOfRunway >= 3) {
      healthScore = 75;
      healthLabel = 'Strong';
    } else if (savingsRate >= 10 && monthsOfRunway >= 1) {
      healthScore = 60;
      healthLabel = 'Stable';
    } else if (savingsRate >= 0) {
      healthScore = 40;
      healthLabel = 'Needs Attention';
    } else {
      healthScore = 20;
      healthLabel = 'Critical';
    }

    return {
      healthScore,
      healthLabel,
      disposableIncome: Math.max(0, disposableIncome),
      savingsRate: Math.max(0, savingsRate),
      monthsOfRunway: Math.max(0, monthsOfRunway),
      debtToIncomeRatio,
      fixedCostRatio,
    };
  }, []);

  const loadStoredData = useCallback(async () => {
    try {
      const [storedFinancials, storedOnboarded] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.FINANCIALS),
        AsyncStorage.getItem(STORAGE_KEYS.ONBOARDED),
      ]);

      if (storedOnboarded === 'true') {
        setHasOnboarded(true);
      }

      if (storedFinancials) {
        const parsed = JSON.parse(storedFinancials);
        setFinancials(parsed);
        setSnapshot(calculateSnapshot(parsed));
      } else {
        setSnapshot(calculateSnapshot(DEFAULT_FINANCIALS));
      }
    } catch (error) {
      console.error('[AppContext] Error loading stored data:', error);
      setSnapshot(calculateSnapshot(DEFAULT_FINANCIALS));
    } finally {
      setIsLoading(false);
    }
  }, [calculateSnapshot]);

  useEffect(() => {
    loadStoredData();
  }, [loadStoredData]);

  const updateFinancials = useCallback(async (newFinancials: UserFinancials) => {
    console.log('[AppContext] Updating financials...');
    setFinancials(newFinancials);
    setSnapshot(calculateSnapshot(newFinancials));

    try {
      await AsyncStorage.setItem(STORAGE_KEYS.FINANCIALS, JSON.stringify(newFinancials));
    } catch (error) {
      console.error('[AppContext] Error saving financials:', error);
    }
  }, [calculateSnapshot]);

  const completeOnboarding = useCallback(async (onboardingFinancials: UserFinancials) => {
    console.log('[AppContext] Completing onboarding...');
    setHasOnboarded(true);

    try {
      await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDED, 'true');
      await AsyncStorage.setItem(STORAGE_KEYS.FINANCIALS, JSON.stringify(onboardingFinancials));
    } catch (error) {
      console.error('[AppContext] Error saving onboarding data:', error);
    }

    setFinancials(onboardingFinancials);
    setSnapshot(calculateSnapshot(onboardingFinancials));
  }, [calculateSnapshot]);

  const resetDemo = useCallback(async () => {
    console.log('[AppContext] Resetting...');
    try {
      await AsyncStorage.multiRemove([STORAGE_KEYS.FINANCIALS, STORAGE_KEYS.ONBOARDED]);
    } catch (error) {
      console.error('[AppContext] Error resetting:', error);
    }

    setHasOnboarded(false);
    setFinancials(DEFAULT_FINANCIALS);
    setSnapshot(calculateSnapshot(DEFAULT_FINANCIALS));
  }, [calculateSnapshot]);

  return {
    isLoading,
    hasOnboarded,
    financials,
    snapshot,
    updateFinancials,
    completeOnboarding,
    resetDemo,
  };
});
