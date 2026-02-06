import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import * as Notifications from "expo-notifications";
import React, { useEffect, useRef } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { View, ActivityIndicator, StyleSheet, AppState, Text, Image } from "react-native";
import { PENNY_MASCOT } from "@/constants/images";
import { AppProvider, useApp } from "@/context/AppContext";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { PurchasesProvider } from "@/context/PurchasesContext";
import { PaywallModal } from "@/components/PaywallModal";
import { ToastProvider } from "@/components/Toast";
import Colors from "@/constants/colors";
import { trpc, trpcClient } from "@/lib/trpc";
import { startSession, endSession } from "@/lib/analytics";
import { registerAgentLoop, markInterventionResponded } from "@/lib/agentLoop";
import { registerBackgroundRefresh } from "@/lib/backgroundRefresh";

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
        <Image source={PENNY_MASCOT} style={styles.loadingMascot} />
        <Text style={styles.loadingTitle}>Penny</Text>
        <Text style={styles.loadingSubtitle}>Your Portfolio Companion</Text>
        <ActivityIndicator size="small" color={Colors.primary} style={styles.loadingSpinner} />
      </View>
    );
  }

  return <>{children}</>;
}

function RootLayoutNav() {
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
            title: 'Details',
          }}
        />
        <Stack.Screen
          name="portfolio"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="creator"
          options={{
            headerShown: false,
          }}
        />
      </Stack>
    </AuthGate>
  );
}

export default function RootLayout() {
  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);

  useEffect(() => {
    SplashScreen.hideAsync();

    // Start analytics session
    startSession();

    // Register the agentic background loop
    registerAgentLoop().catch(console.error);

    // Register background price refresh task
    registerBackgroundRefresh().catch(console.error);

    // Listen for notification responses (user tapped notification)
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      if (data?.interventionId) {
        // Mark intervention as responded - the agent learns from this
        markInterventionResponded(data.interventionId as string, 'notification_tapped');
        console.log('[Agent] User responded to intervention:', data.interventionId);
      }
    });

    // Listen for notifications received while app is foregrounded
    notificationListener.current = Notifications.addNotificationReceivedListener((notification: Notifications.Notification) => {
      console.log('[Agent] Notification received:', notification.request.content.title);
    });

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
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <AuthProvider>
        <AppProvider>
          <PurchasesProvider>
            <ToastProvider>
              <RootLayoutNav />
              <PaywallModal />
            </ToastProvider>
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
  loadingMascot: {
    width: 100,
    height: 100,
    marginBottom: 16,
  },
  loadingTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  loadingSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 24,
  },
  loadingSpinner: {
    marginTop: 8,
  },
});
