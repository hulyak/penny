import { Tabs } from 'expo-router';
import { Home, User, PieChart, Users } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { Platform } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.accent,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarStyle: {
          backgroundColor: '#1F2937',
          borderTopColor: '#374151',
          borderTopWidth: 1,
          elevation: 0,
          shadowOpacity: 0,
          height: Platform.OS === 'ios' ? 88 : 60,
          paddingBottom: Platform.OS === 'ios' ? 28 : 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          marginTop: 2,
        },
        headerStyle: {
          backgroundColor: Colors.background,
          borderBottomWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTitleStyle: {
          fontWeight: '700',
          color: Colors.text,
          fontSize: 18,
        },
        headerTitleAlign: 'left',
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          headerShown: false,
          tabBarIcon: ({ color }) => <Home size={24} color={color} strokeWidth={2.5} />,
        }}
      />
      <Tabs.Screen
        name="portfolio"
        options={{
          title: 'Portfolio',
          headerShown: false,
          tabBarIcon: ({ color }) => <PieChart size={24} color={color} strokeWidth={2.5} />,
        }}
      />
      <Tabs.Screen
        name="creator"
        options={{
          title: 'Creators',
          headerShown: false,
          tabBarIcon: ({ color }) => <Users size={24} color={color} strokeWidth={2.5} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <User size={24} color={color} strokeWidth={2.5} />,
        }}
      />
    </Tabs>
  );
}
