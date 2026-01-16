import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AppProvider } from "@/context/AppContext";
import Colors from "@/constants/colors";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
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
        name="modal" 
        options={{ 
          presentation: 'modal',
          title: 'Agent Details',
        }} 
      />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <AppProvider>
          <RootLayoutNav />
        </AppProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
