import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { View, ActivityIndicator, StyleSheet, AppState } from "react-native";
import { AppProvider, useApp } from "@/context/AppContext";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { CoachProvider } from "@/context/CoachContext";
import { PurchasesProvider } from "@/context/PurchasesContext";
import { PaywallModal } from "@/components/PaywallModal";
import { CoachDrawer } from "@/components/CoachDrawer";
import { PurchaseAnalysisModal } from "@/components/PurchaseAnalysisModal";
import { InvestmentReadinessModal } from "@/components/InvestmentReadinessModal";
import { FloatingCoachButton } from "@/components/FloatingCoachButton";
import Colors from "@/constants/colors";
import { trpc, trpcClient } from "@/lib/trpc";
import { startSession, endSession } from "@/lib/analytics";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function AuthGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { hasOnboarded, isLoading: appLoading } = useApp();
  const router = useRouter();
  const segments = useSegments();

  const isLoading = authLoading || appLoading;

  useEffect(() => {
    if (isLoading) return;

    const inAuthScreen = segments[0] === 'auth' as string;
    const inOnboardingScreen = segments[0] === 'onboarding' as string;

    console.log('[AuthGate] State:', { isAuthenticated, hasOnboarded, inAuthScreen, inOnboardingScreen, segments });

    // First check: if not onboarded, go to onboarding
    if (!hasOnboarded && !inOnboardingScreen) {
      console.log('[AuthGate] Redirecting to onboarding...');
      router.replace('/onboarding' as any);
      return;
    }

    // Second check: if onboarded but not authenticated, go to auth
    if (hasOnboarded && !isAuthenticated && !inAuthScreen) {
      console.log('[AuthGate] Redirecting to auth...');
      router.replace('/auth' as any);
      return;
    }

    // Third check: if authenticated and on auth screen, go to tabs
    if (isAuthenticated && inAuthScreen) {
      console.log('[AuthGate] Redirecting to tabs...');
      router.replace('/(tabs)');
      return;
    }

    // Fourth check: if authenticated and on onboarding (already completed), go to tabs
    if (isAuthenticated && hasOnboarded && inOnboardingScreen) {
      console.log('[AuthGate] Already onboarded and authenticated, redirecting to tabs...');
      router.replace('/(tabs)');
      return;
    }
  }, [isAuthenticated, hasOnboarded, isLoading, segments, router]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  return <>{children}</>;
}

function RootLayoutNav() {
  const { isAuthenticated } = useAuth();
  const segments = useSegments();
  
  const isOnAuthOrOnboarding = (segments[0] as string) === 'auth' || (segments[0] as string) === 'onboarding';
  const showCoachButton = isAuthenticated && !isOnAuthOrOnboarding;

  return (
    <AuthGate>
      <Stack 
        screenOptions={{ 
          headerBackTitle: "Back",
          headerStyle: { backgroundColor: Colors.surface },
          headerTintColor: Colors.text,
          contentStyle: { backgroundColor: Colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen 
          name="onboarding" 
          options={{ 
            headerShown: false,
            presentation: 'fullScreenModal',
          }} 
        />
        <Stack.Screen 
          name="auth" 
          options={{ 
            headerShown: false,
            presentation: 'fullScreenModal',
          }} 
        />
        <Stack.Screen 
          name="modal" 
          options={{ 
            presentation: 'modal',
            title: 'Agent Details',
          }} 
        />
      </Stack>
      {showCoachButton && <FloatingCoachButton />}
      <CoachDrawer />
      <PurchaseAnalysisModal />
      <InvestmentReadinessModal />
    </AuthGate>
  );
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();

    // Start analytics session
    startSession();

    // Handle app state changes for session tracking
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        endSession();
      } else if (nextAppState === 'active') {
        startSession();
      }
    });

    return () => {
      endSession();
      subscription.remove();
    };
  }, []);

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <AuthProvider>
        <AppProvider>
          <PurchasesProvider>
          <CoachProvider>
            <RootLayoutNav />
            <PaywallModal />
          </CoachProvider>
          </PurchasesProvider>
        </AppProvider>
        </AuthProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
    </trpc.Provider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
});
