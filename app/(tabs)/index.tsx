import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView,
  RefreshControl,
  Pressable,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { 
  ChevronRight,
  TrendingUp,
  Wallet,
  PiggyBank,
  Target,
  Sparkles,
  ChevronDown,
  ChevronUp,
  BookOpen,
} from 'lucide-react-native';
import { useApp } from '@/context/AppContext';
import { useCoach } from '@/context/CoachContext';
import { ScreenCoachCard } from '@/components/CoachCard';
import { WhatWouldChange } from '@/components/WhatWouldChange';
import Colors from '@/constants/colors';

const MASCOT_URL = 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/vgkftarej1um5e3yfmz34';

export default function OverviewScreen() {
  const router = useRouter();
  const { 
    snapshot, 
    financials, 
    weeklyFocuses,
    isLoading,
    hasOnboarded,
    financialRealityOutput,
  } = useApp();
  const { triggerDailyCheckIn } = useCoach();
  
  const [refreshing, setRefreshing] = React.useState(false);
  const [showHealthDetails, setShowHealthDetails] = useState(false);
  const hasTriggeredCheckIn = React.useRef(false);

  React.useEffect(() => {
    if (!isLoading && !hasOnboarded) {
      router.replace('/onboarding');
    }
  }, [isLoading, hasOnboarded, router]);

  React.useEffect(() => {
    if (snapshot && !hasTriggeredCheckIn.current) {
      const timer = setTimeout(() => {
        triggerDailyCheckIn();
        hasTriggeredCheckIn.current = true;
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [snapshot, triggerDailyCheckIn]);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  if (isLoading || !snapshot) {
    return (
      <View style={styles.loadingContainer}>
        <Image source={{ uri: MASCOT_URL }} style={styles.loadingMascot} />
        <Text style={styles.loadingText}>Getting things ready...</Text>
      </View>
    );
  }

  const emergencyProgress = Math.min(100, (financials.savings / financials.emergencyFundGoal) * 100);
  const healthColor = getHealthColor(snapshot.healthLabel);

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />
      }
    >
      <ScreenCoachCard screenName="overview" />

      <Pressable onPress={() => setShowHealthDetails(!showHealthDetails)}>
        <View style={styles.healthCard}>
          <View style={styles.healthHeader}>
            <View style={styles.healthTitleRow}>
              <View style={[styles.healthDot, { backgroundColor: healthColor }]} />
              <Text style={styles.healthTitle}>Financial Health</Text>
            </View>
            <View style={styles.healthBadge}>
              <Text style={[styles.healthBadgeText, { color: healthColor }]}>
                {snapshot.healthLabel}
              </Text>
              {showHealthDetails ? (
                <ChevronUp size={16} color={Colors.textMuted} />
              ) : (
                <ChevronDown size={16} color={Colors.textMuted} />
              )}
            </View>
          </View>
          
          <View style={styles.scoreSection}>
            <View style={[styles.scoreRing, { borderColor: healthColor + '30' }]}>
              <Text style={[styles.scoreNumber, { color: healthColor }]}>
                {snapshot.healthScore}
              </Text>
              <Text style={styles.scoreLabel}>Score</Text>
            </View>
            
            <View style={styles.metricsGrid}>
              <View style={styles.metricItem}>
                <Wallet size={18} color={Colors.accent} />
                <Text style={styles.metricValue}>${snapshot.disposableIncome.toLocaleString()}</Text>
                <Text style={styles.metricLabel}>Disposable</Text>
              </View>
              <View style={styles.metricItem}>
                <TrendingUp size={18} color={Colors.success} />
                <Text style={styles.metricValue}>{snapshot.savingsRate.toFixed(0)}%</Text>
                <Text style={styles.metricLabel}>Savings Rate</Text>
              </View>
              <View style={styles.metricItem}>
                <Target size={18} color={Colors.warning} />
                <Text style={styles.metricValue}>{snapshot.monthsOfRunway.toFixed(1)}mo</Text>
                <Text style={styles.metricLabel}>Runway</Text>
              </View>
            </View>
          </View>

          {showHealthDetails && (
            <View style={styles.healthDetailsSection}>
              {financialRealityOutput?.reasoning && (
                <View style={styles.reasoningBox}>
                  <Text style={styles.reasoningLabel}>Why this score?</Text>
                  <Text style={styles.reasoningText}>{financialRealityOutput.reasoning}</Text>
                </View>
              )}
              
              <WhatWouldChange 
                items={financialRealityOutput?.whatWouldChange || [
                  'Increasing your savings rate by 5%',
                  'Reducing fixed costs below 50% of income',
                  'Building 3+ months of emergency runway',
                ]}
              />
            </View>
          )}
        </View>
      </Pressable>

      <View style={styles.fundCard}>
        <View style={styles.fundHeader}>
          <View style={styles.fundIconWrapper}>
            <PiggyBank size={20} color={Colors.success} />
          </View>
          <View style={styles.fundInfo}>
            <Text style={styles.fundTitle}>Emergency Fund</Text>
            <Text style={styles.fundSubtitle}>
              ${financials.savings.toLocaleString()} of ${financials.emergencyFundGoal.toLocaleString()}
            </Text>
          </View>
          <Text style={styles.fundPercent}>{emergencyProgress.toFixed(0)}%</Text>
        </View>
        
        <View style={styles.fundProgressTrack}>
          <View style={[styles.fundProgressFill, { width: `${emergencyProgress}%` }]} />
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>This Week</Text>
        <Pressable onPress={() => router.push('/plan')} style={styles.seeAllButton}>
          <Text style={styles.seeAllText}>View all</Text>
          <ChevronRight size={16} color={Colors.accent} />
        </Pressable>
      </View>

      {weeklyFocuses.slice(0, 2).map((focus) => (
        <Pressable 
          key={focus.id}
          style={styles.taskCard}
          onPress={() => router.push('/plan')}
        >
          <View style={[styles.taskPriorityBar, { backgroundColor: getPriorityColor(focus.priority) }]} />
          <View style={styles.taskContent}>
            <Text style={styles.taskTitle}>{focus.title}</Text>
            <Text style={styles.taskDescription} numberOfLines={1}>
              {focus.description}
            </Text>
          </View>
          <ChevronRight size={18} color={Colors.textMuted} />
        </Pressable>
      ))}

      <View style={styles.quickActions}>
        <Pressable 
          style={styles.quickAction}
          onPress={() => router.push('/(tabs)/scenarios')}
        >
          <View style={[styles.quickIconWrapper, { backgroundColor: Colors.lavenderMuted }]}>
            <Sparkles size={22} color={Colors.lavender} />
          </View>
          <Text style={styles.quickLabel}>Scenarios</Text>
          <Text style={styles.quickSubLabel}>Explore options</Text>
        </Pressable>
        
        <Pressable 
          style={styles.quickAction}
          onPress={() => router.push('/(tabs)/learn')}
        >
          <View style={[styles.quickIconWrapper, { backgroundColor: Colors.mintMuted }]}>
            <BookOpen size={22} color={Colors.accent} />
          </View>
          <Text style={styles.quickLabel}>Learn</Text>
          <Text style={styles.quickSubLabel}>Build skills</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function getHealthColor(label: string): string {
  const colors: Record<string, string> = {
    'Excellent': Colors.success,
    'Strong': Colors.success,
    'Stable': Colors.accent,
    'Needs Attention': Colors.warning,
    'Critical': Colors.danger,
  };
  return colors[label] || Colors.accent;
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
    padding: 16,
    paddingBottom: 32,
  },
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
  loadingText: {
    fontSize: 16,
    color: Colors.textSecondary,
  },

  healthCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 20,
    marginTop: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  healthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  healthTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  healthDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  healthTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  healthBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  healthBadgeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  scoreSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scoreRing: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
    backgroundColor: Colors.surfaceSecondary,
  },
  scoreNumber: {
    fontSize: 32,
    fontWeight: '700',
  },
  scoreLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: -2,
  },
  metricsGrid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricItem: {
    alignItems: 'center',
    minWidth: 70,
  },
  metricValue: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 6,
  },
  metricLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  healthDetailsSection: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  reasoningBox: {
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  reasoningLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  reasoningText: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },

  fundCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  fundHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  fundIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.successMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  fundInfo: {
    flex: 1,
  },
  fundTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  fundSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  fundPercent: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.success,
  },
  fundProgressTrack: {
    height: 8,
    backgroundColor: Colors.successMuted,
    borderRadius: 4,
    overflow: 'hidden',
  },
  fundProgressFill: {
    height: '100%',
    backgroundColor: Colors.success,
    borderRadius: 4,
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  seeAllText: {
    fontSize: 14,
    color: Colors.accent,
    fontWeight: '500',
  },

  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    marginBottom: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  taskPriorityBar: {
    width: 4,
    alignSelf: 'stretch',
  },
  taskContent: {
    flex: 1,
    padding: 14,
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  taskDescription: {
    fontSize: 13,
    color: Colors.textSecondary,
  },

  quickActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  quickAction: {
    flex: 1,
    backgroundColor: Colors.surface,
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  quickIconWrapper: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  quickLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  quickSubLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});
