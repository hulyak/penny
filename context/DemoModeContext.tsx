import createContextHook from '@nkzw/create-context-hook';
import { useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Holding, AssetClass } from '@/types';

const DEMO_MODE_KEY = '@penny_demo_mode';

// Sample portfolio for demo/judges
export const DEMO_HOLDINGS: Holding[] = [
  {
    id: 'demo_1',
    type: 'stock',
    name: 'Apple Inc',
    symbol: 'AAPL',
    quantity: 15,
    purchasePrice: 150.00,
    purchaseDate: '2024-06-15',
    currency: 'USD',
    currentPrice: 185.50,
    currentValue: 2782.50,
    lastPriceUpdate: new Date().toISOString(),
    isManualPricing: false,
    sector: 'Technology',
    country: 'United States',
    assetClass: 'equity' as AssetClass,
    createdAt: '2024-06-15T00:00:00Z',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'demo_2',
    type: 'etf',
    name: 'Vanguard S&P 500 ETF',
    symbol: 'VOO',
    quantity: 8,
    purchasePrice: 420.00,
    purchaseDate: '2024-03-10',
    currency: 'USD',
    currentPrice: 485.00,
    currentValue: 3880.00,
    lastPriceUpdate: new Date().toISOString(),
    isManualPricing: false,
    sector: 'Diversified',
    country: 'United States',
    assetClass: 'equity' as AssetClass,
    createdAt: '2024-03-10T00:00:00Z',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'demo_3',
    type: 'crypto',
    name: 'Bitcoin',
    symbol: 'BTC',
    quantity: 0.15,
    purchasePrice: 42000.00,
    purchaseDate: '2024-01-20',
    currency: 'USD',
    currentPrice: 67500.00,
    currentValue: 10125.00,
    lastPriceUpdate: new Date().toISOString(),
    isManualPricing: false,
    assetClass: 'equity' as AssetClass,
    createdAt: '2024-01-20T00:00:00Z',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'demo_4',
    type: 'gold',
    name: 'Gold Bullion',
    symbol: 'GOLD',
    quantity: 2,
    purchasePrice: 1950.00,
    purchaseDate: '2024-02-01',
    currency: 'USD',
    currentPrice: 2350.00,
    currentValue: 4700.00,
    lastPriceUpdate: new Date().toISOString(),
    isManualPricing: false,
    assetClass: 'commodity' as AssetClass,
    createdAt: '2024-02-01T00:00:00Z',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'demo_5',
    type: 'bond',
    name: 'US Treasury Bond 10Y',
    symbol: 'GOVT',
    quantity: 50,
    purchasePrice: 95.00,
    purchaseDate: '2024-04-15',
    currency: 'USD',
    currentPrice: 97.50,
    currentValue: 4875.00,
    lastPriceUpdate: new Date().toISOString(),
    isManualPricing: true,
    interestRate: 4.5,
    maturityDate: '2034-04-15',
    assetClass: 'debt' as AssetClass,
    createdAt: '2024-04-15T00:00:00Z',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'demo_6',
    type: 'stock',
    name: 'NVIDIA Corporation',
    symbol: 'NVDA',
    quantity: 5,
    purchasePrice: 450.00,
    purchaseDate: '2024-05-01',
    currency: 'USD',
    currentPrice: 875.00,
    currentValue: 4375.00,
    lastPriceUpdate: new Date().toISOString(),
    isManualPricing: false,
    sector: 'Technology',
    country: 'United States',
    assetClass: 'equity' as AssetClass,
    createdAt: '2024-05-01T00:00:00Z',
    updatedAt: new Date().toISOString(),
  },
];

// Calculate demo portfolio stats
export const DEMO_PORTFOLIO_STATS = {
  totalValue: DEMO_HOLDINGS.reduce((sum, h) => sum + (h.currentValue || 0), 0),
  totalInvested: DEMO_HOLDINGS.reduce((sum, h) => sum + (h.quantity * h.purchasePrice), 0),
  get totalGain() {
    return this.totalValue - this.totalInvested;
  },
  get totalGainPercent() {
    return this.totalInvested > 0 ? (this.totalGain / this.totalInvested) * 100 : 0;
  },
};

export const [DemoModeProvider, useDemoMode] = createContextHook(() => {
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check if demo mode is enabled on mount
  useEffect(() => {
    const checkDemoMode = async () => {
      try {
        const stored = await AsyncStorage.getItem(DEMO_MODE_KEY);
        setIsDemoMode(stored === 'true');
      } catch (error) {
        console.error('[DemoMode] Error checking demo mode:', error);
      } finally {
        setIsLoading(false);
      }
    };
    checkDemoMode();
  }, []);

  const enableDemoMode = useCallback(async () => {
    console.log('[DemoMode] Enabling demo mode for hackathon judges');
    await AsyncStorage.setItem(DEMO_MODE_KEY, 'true');
    setIsDemoMode(true);
  }, []);

  const disableDemoMode = useCallback(async () => {
    console.log('[DemoMode] Disabling demo mode');
    await AsyncStorage.removeItem(DEMO_MODE_KEY);
    setIsDemoMode(false);
  }, []);

  const toggleDemoMode = useCallback(async () => {
    if (isDemoMode) {
      await disableDemoMode();
    } else {
      await enableDemoMode();
    }
  }, [isDemoMode, enableDemoMode, disableDemoMode]);

  return {
    isDemoMode,
    isLoading,
    enableDemoMode,
    disableDemoMode,
    toggleDemoMode,
    demoHoldings: DEMO_HOLDINGS,
    demoStats: DEMO_PORTFOLIO_STATS,
  };
});
