import createContextHook from '@nkzw/create-context-hook';
import { useState, useCallback } from 'react';
import { Platform } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Purchases, { PurchasesPackage } from 'react-native-purchases';

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

const ENTITLEMENT_ID = 'coach_plus';

export const [PurchasesProvider, usePurchases] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [isPaywallVisible, setIsPaywallVisible] = useState(false);

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

  const isPremium = customerInfoQuery.data?.entitlements.active[ENTITLEMENT_ID]?.isActive ?? false;

  const currentOffering = offeringsQuery.data?.current ?? null;

  const monthlyPackage = currentOffering?.availablePackages.find(
    pkg => pkg.identifier === 'monthly' || pkg.identifier === '$rc_monthly'
  ) ?? null;

  const annualPackage = currentOffering?.availablePackages.find(
    pkg => pkg.identifier === 'annual' || pkg.identifier === '$rc_annual'
  ) ?? null;

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

  return {
    isPremium,
    isLoading: customerInfoQuery.isLoading || offeringsQuery.isLoading,
    isPurchasing: purchaseMutation.isPending,
    isRestoring: restoreMutation.isPending,
    purchaseError: purchaseMutation.error?.message ?? null,
    restoreError: restoreMutation.error?.message ?? null,
    currentOffering,
    monthlyPackage,
    annualPackage,
    isPaywallVisible,
    showPaywall,
    hidePaywall,
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
