import { Stack } from 'expo-router';
import Colors from '@/constants/colors';

export default function CreatorLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.background },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="portfolio" />
      <Stack.Screen name="commentary" />
      <Stack.Screen name="ask" />
    </Stack>
  );
}
