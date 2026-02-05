import createContextHook from '@nkzw/create-context-hook';
import { useState, useCallback } from 'react';
import { AssetType } from '@/types';

// Types for onboarding flow
export interface OnboardingAsset {
  id: string;
  type: AssetType;
  name: string;
  symbol?: string;
  currentPrice: number;
  changePercent: number;
  quantity?: number;
  value?: number;
}

export interface OnboardingMentor {
  id: string;
  name: string;
  title: string;
  description: string;
  quote: string;
  focus: string;
  imageUrl?: string;
}

export type OnboardingStep =
  | 'welcome'
  | 'assets-preview'
  | 'learn'
  | 'ai-mentors'
  | 'asset-types'
  | 'asset-selection'
  | 'holdings-entry'
  | 'portfolio-confirmation'
  | 'mentor-selection'
  | 'felix-welcome';

export interface OnboardingState {
  currentStep: OnboardingStep;
  selectedAssetTypes: AssetType[];
  selectedAssets: OnboardingAsset[];
  selectedMentor: OnboardingMentor | null;
  totalPortfolioValue: number;
}

const INITIAL_STATE: OnboardingState = {
  currentStep: 'welcome',
  selectedAssetTypes: [],
  selectedAssets: [],
  selectedMentor: null,
  totalPortfolioValue: 0,
};

// Default mentors - Josh is the primary coach
export const DEFAULT_MENTORS: OnboardingMentor[] = [
  {
    id: 'josh',
    name: 'Josh',
    title: 'Your Portfolio Coach',
    description: '@VisualFaktory',
    quote: 'Build wealth through smart, diversified investing',
    focus: 'Portfolio strategy, market insights, learning',
    imageUrl: 'https://pbs.twimg.com/profile_images/1745526817684033536/CKhbsnRa_400x400.jpg',
  },
];

// Popular assets with live pricing (to be fetched)
export const POPULAR_STOCKS = [
  { symbol: 'AAPL', name: 'Apple Inc.' },
  { symbol: 'TSLA', name: 'Tesla Inc.' },
  { symbol: 'NVDA', name: 'NVIDIA Corporation' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.' },
  { symbol: 'MSFT', name: 'Microsoft Corporation' },
  { symbol: 'META', name: 'Meta Platforms Inc.' },
  { symbol: 'JPM', name: 'JPMorgan Chase & Co.' },
];

export const POPULAR_CRYPTO = [
  { symbol: 'BTC', name: 'Bitcoin' },
  { symbol: 'ETH', name: 'Ethereum' },
  { symbol: 'SOL', name: 'Solana' },
  { symbol: 'BNB', name: 'BNB' },
  { symbol: 'ADA', name: 'Cardano' },
  { symbol: 'XRP', name: 'XRP' },
];

export const POPULAR_ETFS = [
  { symbol: 'SPY', name: 'SPDR S&P 500 ETF' },
  { symbol: 'QQQ', name: 'Invesco QQQ Trust' },
  { symbol: 'VTI', name: 'Vanguard Total Stock Market ETF' },
  { symbol: 'VOO', name: 'Vanguard S&P 500 ETF' },
];

export const [OnboardingProvider, useOnboarding] = createContextHook(() => {
  const [state, setState] = useState<OnboardingState>(INITIAL_STATE);

  // Navigation
  const setStep = useCallback((step: OnboardingStep) => {
    setState(prev => ({ ...prev, currentStep: step }));
  }, []);

  const nextStep = useCallback(() => {
    const steps: OnboardingStep[] = [
      'welcome',
      'assets-preview',
      'learn',
      'ai-mentors',
      'asset-types',
      'asset-selection',
      'holdings-entry',
      'portfolio-confirmation',
      'mentor-selection',
      'felix-welcome',
    ];
    const currentIndex = steps.indexOf(state.currentStep);
    if (currentIndex < steps.length - 1) {
      setState(prev => ({ ...prev, currentStep: steps[currentIndex + 1] }));
    }
  }, [state.currentStep]);

  const prevStep = useCallback(() => {
    const steps: OnboardingStep[] = [
      'welcome',
      'assets-preview',
      'learn',
      'ai-mentors',
      'asset-types',
      'asset-selection',
      'holdings-entry',
      'portfolio-confirmation',
      'mentor-selection',
      'felix-welcome',
    ];
    const currentIndex = steps.indexOf(state.currentStep);
    if (currentIndex > 0) {
      setState(prev => ({ ...prev, currentStep: steps[currentIndex - 1] }));
    }
  }, [state.currentStep]);

  // Asset type selection
  const toggleAssetType = useCallback((type: AssetType) => {
    setState(prev => {
      const isSelected = prev.selectedAssetTypes.includes(type);
      return {
        ...prev,
        selectedAssetTypes: isSelected
          ? prev.selectedAssetTypes.filter(t => t !== type)
          : [...prev.selectedAssetTypes, type],
      };
    });
  }, []);

  const setSelectedAssetTypes = useCallback((types: AssetType[]) => {
    setState(prev => ({ ...prev, selectedAssetTypes: types }));
  }, []);

  // Asset selection
  const addAsset = useCallback((asset: OnboardingAsset) => {
    setState(prev => {
      // Check if already exists
      if (prev.selectedAssets.some(a => a.id === asset.id)) {
        return prev;
      }
      const newAssets = [...prev.selectedAssets, asset];
      return {
        ...prev,
        selectedAssets: newAssets,
        totalPortfolioValue: newAssets.reduce((sum, a) => sum + (a.value || 0), 0),
      };
    });
  }, []);

  const removeAsset = useCallback((assetId: string) => {
    setState(prev => {
      const newAssets = prev.selectedAssets.filter(a => a.id !== assetId);
      return {
        ...prev,
        selectedAssets: newAssets,
        totalPortfolioValue: newAssets.reduce((sum, a) => sum + (a.value || 0), 0),
      };
    });
  }, []);

  const updateAssetQuantity = useCallback((assetId: string, quantity: number) => {
    setState(prev => {
      const newAssets = prev.selectedAssets.map(asset => {
        if (asset.id === assetId) {
          return {
            ...asset,
            quantity,
            value: quantity * asset.currentPrice,
          };
        }
        return asset;
      });
      return {
        ...prev,
        selectedAssets: newAssets,
        totalPortfolioValue: newAssets.reduce((sum, a) => sum + (a.value || 0), 0),
      };
    });
  }, []);

  const setSelectedAssets = useCallback((assets: OnboardingAsset[]) => {
    setState(prev => ({
      ...prev,
      selectedAssets: assets,
      totalPortfolioValue: assets.reduce((sum, a) => sum + (a.value || 0), 0),
    }));
  }, []);

  // Mentor selection
  const setSelectedMentor = useCallback((mentor: OnboardingMentor | null) => {
    setState(prev => ({ ...prev, selectedMentor: mentor }));
  }, []);

  // Reset
  const resetOnboarding = useCallback(() => {
    setState(INITIAL_STATE);
  }, []);

  // Skip asset selection
  const skipAssetSelection = useCallback(() => {
    setState(prev => ({ ...prev, currentStep: 'mentor-selection' }));
  }, []);

  return {
    ...state,
    setStep,
    nextStep,
    prevStep,
    toggleAssetType,
    setSelectedAssetTypes,
    addAsset,
    removeAsset,
    updateAssetQuantity,
    setSelectedAssets,
    setSelectedMentor,
    resetOnboarding,
    skipAssetSelection,
  };
});
