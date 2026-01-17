import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AppProvider } from "@/context/AppContext";
import { AuthProvider } from "@/context/AuthContext";
import { CoachProvider } from "@/context/CoachContext";
import { PurchasesProvider } from "@/context/PurchasesContext";
import { PaywallModal } from "@/components/PaywallModal";
import { CoachDrawer } from "@/components/CoachDrawer";
import { PurchaseAnalysisModal } from "@/components/PurchaseAnalysisModal";
import { InvestmentReadinessModal } from "@/components/InvestmentReadinessModal";
import { FloatingCoachButton } from "@/components/FloatingCoachButton";
import Colors from "@/constants/colors";
import { trpc, trpcClient } from "@/lib/trpc";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <>
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
      <FloatingCoachButton />
      <CoachDrawer />
      <PurchaseAnalysisModal />
      <InvestmentReadinessModal />
    </>
  );
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
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
