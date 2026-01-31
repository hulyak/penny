import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView,
  RefreshControl,
  Pressable,
  Image,
  Animated,
  Dimensions
} from 'react-native';
import { useRouter } from 'expo-router';
import { 
  ChevronRight,
  ShieldCheck,
  Zap,
  ArrowRight,
  LayoutDashboard
} from 'lucide-react-native';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { useCoach } from '@/context/CoachContext';
import { ScreenCoachCard } from '@/components/CoachCard';
import Colors from '@/constants/colors';
import { MASCOT_IMAGE_URL } from '@/constants/images';

const MASCOT_URL = MASCOT_IMAGE_URL;

export default function OverviewScreen() {
  const router = useRouter();
  const { 
    snapshot, 
    financials, 
    weeklyFocuses,
    isLoading,
    hasOnboarded,
  } = useApp();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { triggerDailyCheckIn } = useCoach();
  
  const [refreshing, setRefreshing] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;
  const hasTriggeredCheckIn = useRef(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/auth' as any);
    } else if (!isLoading && !hasOnboarded && isAuthenticated) {
      router.replace('/onboarding' as any);
    }
  }, [isLoading, hasOnboarded, router, authLoading, isAuthenticated]);

  useEffect(() => {
    if (snapshot && !hasTriggeredCheckIn.current) {
      const timer = setTimeout(() => {
        triggerDailyCheckIn();
        hasTriggeredCheckIn.current = true;
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [snapshot, triggerDailyCheckIn]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  if (isLoading || authLoading || !snapshot) {
    return (
      <View style={styles.loadingContainer}>
        <Image source={{ uri: MASCOT_URL }} style={styles.loadingMascot} />
      </View>
    );
  }

  const emergencyProgress = Math.min(100, (financials.savings / financials.emergencyFundGoal) * 100);
  const healthColor = Colors.health[snapshot.healthLabel === 'Needs Attention' ? 'needsAttention' : snapshot.healthLabel === 'Critical' ? 'critical' : snapshot.healthLabel === 'Excellent' ? 'excellent' : snapshot.healthLabel === 'Strong' ? 'strong' : 'stable'] || Colors.primary;

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 50],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const headerTranslateY = scrollY.interpolate({
    inputRange: [0, 50],
    outputRange: [0, -20],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.container}>
      <Animated.ScrollView 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
      >
        <Animated.View style={[styles.header, { opacity: headerOpacity, transform: [{ translateY: headerTranslateY }] }]}>
          <Text style={styles.greeting}>Financial Health</Text>
          <Pressable onPress={() => router.push('/(tabs)/profile' as any)} style={styles.profileButton}>
             <LayoutDashboard size={24} color={Colors.text} />
          </Pressable>
        </Animated.View>

        <View style={styles.spacer} />

        <ScreenCoachCard screenName="overview" />

        <View style={styles.mainStatsContainer}>
          <View style={styles.scoreContainer}>
            <Text style={styles.scoreLabel}>Health Score</Text>
            <Text style={[styles.scoreValue, { color: healthColor }]}>{snapshot.healthScore}</Text>
            <View style={[styles.badge, { backgroundColor: healthColor + '20' }]}>
               <Text style={[styles.badgeText, { color: healthColor }]}>{snapshot.healthLabel}</Text>
            </View>
          </View>
          
          <View style={styles.metricsRow}>
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>Monthly Free Cash</Text>
              <Text style={styles.metricValue}>${snapshot.disposableIncome.toLocaleString()}</Text>
            </View>
            <View style={styles.metricSeparator} />
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>Savings Rate</Text>
              <Text style={styles.metricValue}>{snapshot.savingsRate.toFixed(0)}%</Text>
            </View>
            <View style={styles.metricSeparator} />
             <View style={styles.metric}>
              <Text style={styles.metricLabel}>Runway</Text>
              <Text style={styles.metricValue}>{snapshot.monthsOfRunway.toFixed(1)}mo</Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Focus</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.focusList}>
          {weeklyFocuses.slice(0, 3).map((focus, index) => (
            <Pressable 
              key={focus.id}
              style={[styles.focusCard, { marginLeft: index === 0 ? 0 : 12 }]}
              onPress={() => router.push('/(tabs)/plan' as any)}
            >
              <View style={[styles.focusIcon, { backgroundColor: getPriorityColor(focus.priority) + '15' }]}>
                <Zap size={20} color={getPriorityColor(focus.priority)} />
              </View>
              <Text style={styles.focusTitle} numberOfLines={2}>{focus.title}</Text>
              <View style={styles.focusFooter}>
                <Text style={styles.focusAction}>View</Text>
                <ArrowRight size={14} color={Colors.primary} />
              </View>
            </Pressable>
          ))}
          <Pressable 
              style={[styles.focusCard, styles.seeAllCard]}
              onPress={() => router.push('/(tabs)/plan' as any)}
            >
              <View style={styles.seeAllIcon}>
                <ChevronRight size={24} color={Colors.textSecondary} />
              </View>
              <Text style={styles.seeAllText}>See All Plan</Text>
            </Pressable>
        </ScrollView>

        <Text style={styles.sectionTitle}>Safety Net</Text>
        <Pressable style={styles.fundCard}>
          <View style={styles.fundHeader}>
            <View style={styles.fundIcon}>
              <ShieldCheck size={24} color={Colors.success} />
            </View>
            <View style={styles.fundTexts}>
              <Text style={styles.fundTitle}>Emergency Fund</Text>
              <Text style={styles.fundSubtitle}>
                ${financials.savings.toLocaleString()} / ${financials.emergencyFundGoal.toLocaleString()}
              </Text>
            </View>
            <Text style={styles.fundPercent}>{emergencyProgress.toFixed(0)}%</Text>
          </View>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${emergencyProgress}%` }]} />
          </View>
        </Pressable>

        <View style={styles.bottomSpacer} />
      </Animated.ScrollView>
    </View>
  );
}

function getPriorityColor(priority: string): string {
  const colors: Record<string, string> = {
    'high': Colors.coral,
    'medium': Colors.warning,
    'low': Colors.accent,
  };
  return colors[priority] || Colors.accent;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 20,
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.5,
  },
  profileButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.neutral,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  spacer: {
    height: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  loadingMascot: {
    width: 80,
    height: 80,
  },
  
  mainStatsContainer: {
    backgroundColor: Colors.surface,
    borderRadius: 24,
    padding: 24,
    marginBottom: 32,
    shadowColor: Colors.neutral,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 3,
  },
  scoreContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  scoreLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 4,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  scoreValue: {
    fontSize: 56,
    fontWeight: '800',
    marginBottom: 8,
    letterSpacing: -2,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 14,
    fontWeight: '700',
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metric: {
    flex: 1,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  metricSeparator: {
    width: 1,
    height: 30,
    backgroundColor: Colors.borderLight,
  },
  
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 16,
    marginLeft: 4,
  },
  focusList: {
    paddingRight: 20,
    marginBottom: 32,
  },
  focusCard: {
    width: 160,
    height: 180,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 16,
    justifyContent: 'space-between',
    shadowColor: Colors.neutral,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 12,
    elevation: 2,
  },
  focusIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  focusTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    lineHeight: 22,
  },
  focusFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  focusAction: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  
  seeAllCard: {
    marginLeft: 12,
    backgroundColor: Colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  seeAllIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },

  fundCard: {
    backgroundColor: Colors.surface,
    borderRadius: 24,
    padding: 20,
    shadowColor: Colors.neutral,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 12,
    elevation: 2,
  },
  fundHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  fundIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: Colors.successMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  fundTexts: {
    flex: 1,
  },
  fundTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 2,
  },
  fundSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  fundPercent: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.success,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: Colors.successMuted,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.success,
    borderRadius: 4,
  },
  
  bottomSpacer: {
    height: 40,
  },
});
