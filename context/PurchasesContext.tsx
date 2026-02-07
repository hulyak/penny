import createContextHook from '@nkzw/create-context-hook';
import { useState, useCallback, useEffect } from 'react';
import { Platform } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Purchases, { PurchasesPackage } from 'react-native-purchases';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DEMO_MODE_KEY = '@penny_demo_mode';
const TRIAL_START_KEY = '@penny_trial_start';
const TRIAL_DURATION_DAYS = 7;

function getRCToken() {
  if (__DEV__ || Platform.OS === "web") {
    return process.env.EXPO_PUBLIC_REVENUECAT_TEST_API_KEY;
  }
  return Platform.select({
    ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY,
    android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY,
    default: process.env.EXPO_PUBLIC_REVENUECAT_TEST_API_KEY,
  });
}

const rcToken = getRCToken();
if (rcToken) {
  console.log('[Purchases] Configuring RevenueCat...');
  Purchases.configure({ apiKey: rcToken });
}

// Define entitlements for Penny Pro
export const ENTITLEMENTS = {
  PRO: 'coach_plus', // Main Pro entitlement (named coach_plus in RevenueCat)
  COACH_PLUS: 'coach_plus', // Alias for backward compatibility
} as const;

// Subscription tiers
export type SubscriptionTier = 'free' | 'pro' | 'premium';

export const [PurchasesProvider, usePurchases] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [isPaywallVisible, setIsPaywallVisible] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [trialStartDate, setTrialStartDate] = useState<Date | null>(null);

  // Check for demo mode and trial on mount
  useEffect(() => {
    const checkStoredData = async () => {
      try {
        const stored = await AsyncStorage.getItem(DEMO_MODE_KEY);
        setIsDemoMode(stored === 'true');
        console.log('[Purchases] Demo mode:', stored === 'true');

        const trialStart = await AsyncStorage.getItem(TRIAL_START_KEY);
        if (trialStart) {
          setTrialStartDate(new Date(trialStart));
          console.log('[Purchases] Trial started:', trialStart);
        }
      } catch (error) {
        console.error('[Purchases] Error checking stored data:', error);
      }
    };
    checkStoredData();
  }, []);

  const customerInfoQuery = useQuery({
    queryKey: ['customerInfo'],
    queryFn: async () => {
      console.log('[Purchases] Fetching customer info...');
      const info = await Purchases.getCustomerInfo();
      console.log('[Purchases] Customer info received:', info.entitlements.active);
      return info;
    },
    staleTime: 1000 * 60 * 5,
  });

  const offeringsQuery = useQuery({
    queryKey: ['offerings'],
    queryFn: async () => {
      console.log('[Purchases] Fetching offerings...');
      const offerings = await Purchases.getOfferings();
      console.log('[Purchases] Offerings received:', offerings.current?.identifier);
      return offerings;
    },
    staleTime: 1000 * 60 * 60,
  });

  const purchaseMutation = useMutation({
    mutationFn: async (pkg: PurchasesPackage) => {
      console.log('[Purchases] Purchasing package:', pkg.identifier);
      const result = await Purchases.purchasePackage(pkg);
      console.log('[Purchases] Purchase completed');
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customerInfo'] });
      setIsPaywallVisible(false);
    },
    onError: (error: Error) => {
      console.error('[Purchases] Purchase error:', error.message);
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async () => {
      console.log('[Purchases] Restoring purchases...');
      const info = await Purchases.restorePurchases();
      console.log('[Purchases] Restore completed');
      return info;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customerInfo'] });
    },
    onError: (error: Error) => {
      console.error('[Purchases] Restore error:', error.message);
    },
  });

  // Trial period logic
  const startTrial = useCallback(async () => {
    if (!trialStartDate) {
      const now = new Date();
      await AsyncStorage.setItem(TRIAL_START_KEY, now.toISOString());
      setTrialStartDate(now);
      console.log('[Purchases] Trial started');
    }
  }, [trialStartDate]);

  const isTrialActive = useCallback(() => {
    if (!trialStartDate) return false;
    const now = new Date();
    const trialEnd = new Date(trialStartDate);
    trialEnd.setDate(trialEnd.getDate() + TRIAL_DURATION_DAYS);
    return now < trialEnd;
  }, [trialStartDate]);

  const trialDaysRemaining = useCallback(() => {
    if (!trialStartDate) return TRIAL_DURATION_DAYS;
    const now = new Date();
    const trialEnd = new Date(trialStartDate);
    trialEnd.setDate(trialEnd.getDate() + TRIAL_DURATION_DAYS);
    const daysLeft = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, daysLeft);
  }, [trialStartDate]);

  // Check if user has a specific entitlement
  const hasEntitlement = useCallback((entitlement: string) => {
    if (isDemoMode) return true;
    if (isTrialActive()) return true;
    return customerInfoQuery.data?.entitlements.active[entitlement]?.isActive ?? false;
  }, [isDemoMode, customerInfoQuery.data, isTrialActive]);

  // Determine current subscription tier
  const subscriptionTier: SubscriptionTier = (() => {
    if (isDemoMode || isTrialActive()) return 'pro';

    // Check for Penny Pro entitlement (coach_plus in RevenueCat)
    if (hasEntitlement(ENTITLEMENTS.PRO)) {
      return 'pro';
    }

    return 'free';
  })();

  // Legacy support: isPremium checks for any paid tier
  const isPremium = subscriptionTier !== 'free';
  const isPro = subscriptionTier === 'pro';
  const isPremiumTier = false;

  const currentOffering = offeringsQuery.data?.current ?? null;

  // Get packages for Penny Pro
  // Package identifiers from RevenueCat: "monthly" and "annual"
  const proMonthlyPackage = currentOffering?.availablePackages.find(
    pkg => pkg.identifier === 'monthly' ||
           pkg.identifier === '$rc_monthly' ||
           pkg.product.identifier === 'penny_pro_monthly'
  ) ?? null;

  const proAnnualPackage = currentOffering?.availablePackages.find(
    pkg => pkg.identifier === 'annual' ||
           pkg.identifier === '$rc_annual' ||
           pkg.product.identifier === 'penny_pro_annual'
  ) ?? null;

  // Debug logging
  if (__DEV__ && currentOffering) {
    console.log('[Purchases] Available packages:', currentOffering.availablePackages.map(p => ({
      packageId: p.identifier,
      productId: p.product.identifier,
      price: p.product.priceString,
    })));
    console.log('[Purchases] Monthly package:', proMonthlyPackage?.identifier);
    console.log('[Purchases] Annual package:', proAnnualPackage?.identifier);
  }

  // Legacy package support (not used anymore)
  const premiumMonthlyPackage = null;
  const premiumAnnualPackage = null;

  // Legacy package support
  const monthlyPackage = proMonthlyPackage;
  const annualPackage = proAnnualPackage;

  const showPaywall = useCallback(() => {
    console.log('[Purchases] Showing paywall');
    setIsPaywallVisible(true);
  }, []);

  const hidePaywall = useCallback(() => {
    console.log('[Purchases] Hiding paywall');
    setIsPaywallVisible(false);
  }, []);

  const { mutate: purchaseMutate } = purchaseMutation;
  const purchase = useCallback((pkg: PurchasesPackage) => {
    purchaseMutate(pkg);
  }, [purchaseMutate]);

  const { mutate: restoreMutate } = restoreMutation;
  const restore = useCallback(() => {
    restoreMutate();
  }, [restoreMutate]);

  // Demo mode functions for hackathon
  const enableDemoMode = useCallback(async () => {
    console.log('[Purchases] Enabling demo mode (premium access for judges)');
    await AsyncStorage.setItem(DEMO_MODE_KEY, 'true');
    setIsDemoMode(true);
  }, []);

  const disableDemoMode = useCallback(async () => {
    console.log('[Purchases] Disabling demo mode');
    await AsyncStorage.removeItem(DEMO_MODE_KEY);
    setIsDemoMode(false);
  }, []);

  return {
    // Tier information
    subscriptionTier,
    isPremium,
    isPro,
    isPremiumTier,
    
    // Trial information
    isTrialActive: isTrialActive(),
    trialDaysRemaining: trialDaysRemaining(),
    startTrial,
    
    // Entitlement checking
    hasEntitlement,
    
    // Demo mode
    isDemoMode,
    enableDemoMode,
    disableDemoMode,
    
    // Loading states
    isLoading: customerInfoQuery.isLoading || offeringsQuery.isLoading,
    isPurchasing: purchaseMutation.isPending,
    isRestoring: restoreMutation.isPending,
    purchaseError: purchaseMutation.error?.message ?? null,
    restoreError: restoreMutation.error?.message ?? null,
    
    // Offerings and packages
    currentOffering,
    proMonthlyPackage,
    proAnnualPackage,
    premiumMonthlyPackage,
    premiumAnnualPackage,
    monthlyPackage, // Legacy
    annualPackage, // Legacy
    
    // Paywall
    isPaywallVisible,
    showPaywall,
    hidePaywall,
    
    // Actions
    purchase,
    restore,
  };
});

export function useRequirePremium() {
  const { isPremium, showPaywall } = usePurchases();
  
  const checkPremium = useCallback((onAllowed: () => void) => {
    if (isPremium) {
      onAllowed();
    } else {
      showPaywall();
    }
  }, [isPremium, showPaywall]);

  return { isPremium, checkPremium };
}

// Hook for checking specific entitlements
export function useRequireEntitlement(entitlement: string) {
  const { hasEntitlement, showPaywall } = usePurchases();
  
  const checkEntitlement = useCallback((onAllowed: () => void) => {
    if (hasEntitlement(entitlement)) {
      onAllowed();
    } else {
      showPaywall();
    }
  }, [hasEntitlement, entitlement, showPaywall]);

  return { 
    hasAccess: hasEntitlement(entitlement), 
    checkEntitlement 
  };
}

// Hook for checking tier access
export function useRequireTier(requiredTier: SubscriptionTier) {
  const { subscriptionTier, showPaywall } = usePurchases();
  
  const tierLevel = { free: 0, pro: 1, premium: 2 };
  const hasAccess = tierLevel[subscriptionTier] >= tierLevel[requiredTier];
  
  const checkTier = useCallback((onAllowed: () => void) => {
    if (hasAccess) {
      onAllowed();
    } else {
      showPaywall();
    }
  }, [hasAccess, showPaywall]);

  return { hasAccess, checkTier };
}
