import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView,
  RefreshControl,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus,
  ChevronRight,
  Target,
  PiggyBank,
} from 'lucide-react-native';
import { useApp } from '@/context/AppContext';
import { Card } from '@/components/Card';
import { WhyPanel } from '@/components/WhyPanel';
import Colors from '@/constants/colors';

export default function OverviewScreen() {
  const router = useRouter();
  const { 
    snapshot, 
    financials, 
    weeklyFocuses,
    financialRealityOutput,
    agentsProcessing,
    isLoading,
    hasOnboarded,
  } = useApp();
  
  const [refreshing, setRefreshing] = React.useState(false);

  React.useEffect(() => {
    if (!isLoading && !hasOnboarded) {
      router.replace('/onboarding');
    }
  }, [isLoading, hasOnboarded, router]);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  if (isLoading || !snapshot) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.accent} />
        <Text style={styles.loadingText}>Analyzing your finances...</Text>
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
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Health Score Card */}
      <Card style={styles.healthCard}>
        <View style={styles.healthHeader}>
          <Text style={styles.healthLabel}>Financial Health</Text>
          {agentsProcessing && (
            <View style={styles.processingBadge}>
              <Text style={styles.processingText}>Updating...</Text>
            </View>
          )}
        </View>
        
        <View style={styles.healthScore}>
          <Text style={[styles.scoreNumber, { color: healthColor }]}>
            {snapshot.healthScore}
          </Text>
          <Text style={styles.scoreMax}>/100</Text>
        </View>
        
        <View style={[styles.healthBadge, { backgroundColor: healthColor + '15' }]}>
          <Text style={[styles.healthBadgeText, { color: healthColor }]}>
            {snapshot.healthLabel}
          </Text>
        </View>

        <View style={styles.metricsGrid}>
          <MetricItem 
            label="Disposable" 
            value={`$${snapshot.disposableIncome.toLocaleString()}`}
            trend={snapshot.disposableIncome > 500 ? 'up' : 'neutral'}
          />
          <MetricItem 
            label="Savings Rate" 
            value={`${snapshot.savingsRate.toFixed(0)}%`}
            trend={snapshot.savingsRate >= 20 ? 'up' : snapshot.savingsRate >= 10 ? 'neutral' : 'down'}
          />
          <MetricItem 
            label="Runway" 
            value={`${snapshot.monthsOfRunway.toFixed(1)}mo`}
            trend={snapshot.monthsOfRunway >= 3 ? 'up' : snapshot.monthsOfRunway >= 1 ? 'neutral' : 'down'}
          />
          <MetricItem 
            label="Fixed Costs" 
            value={`${snapshot.fixedCostRatio.toFixed(0)}%`}
            trend={snapshot.fixedCostRatio <= 50 ? 'up' : snapshot.fixedCostRatio <= 70 ? 'neutral' : 'down'}
          />
        </View>
      </Card>

      {/* Why Panel for Financial Reality */}
      {financialRealityOutput && (
        <View style={styles.whyContainer}>
          <WhyPanel
            title="Why this score?"
            summary={financialRealityOutput.summary}
            reasoning={financialRealityOutput.reasoning}
            assumptions={financialRealityOutput.assumptions}
            whatWouldChange={financialRealityOutput.whatWouldChange}
            confidence={financialRealityOutput.confidence}
          />
        </View>
      )}

      {/* Emergency Fund Progress */}
      <Card style={styles.progressCard}>
        <View style={styles.progressHeader}>
          <View style={styles.progressTitleRow}>
            <PiggyBank size={20} color={Colors.success} />
            <Text style={styles.progressTitle}>Emergency Fund</Text>
          </View>
          <Text style={styles.progressPercent}>{emergencyProgress.toFixed(0)}%</Text>
        </View>
        
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${emergencyProgress}%` }]} />
        </View>
        
        <View style={styles.progressDetails}>
          <Text style={styles.progressAmount}>
            ${financials.savings.toLocaleString()} of ${financials.emergencyFundGoal.toLocaleString()}
          </Text>
          <Text style={styles.progressRunway}>
            {snapshot.monthsOfRunway.toFixed(1)} months runway
          </Text>
        </View>
      </Card>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <Text style={styles.sectionTitle}>This Week</Text>
        
        {weeklyFocuses.slice(0, 2).map((focus) => (
          <Pressable 
            key={focus.id} 
            style={styles.actionCard}
            onPress={() => router.push('/plan' as never)}
          >
            <View style={[styles.actionIcon, { backgroundColor: getPriorityColor(focus.priority) + '15' }]}>
              <Target size={18} color={getPriorityColor(focus.priority)} />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>{focus.title}</Text>
              <Text style={styles.actionDescription} numberOfLines={1}>
                {focus.description}
              </Text>
            </View>
            <ChevronRight size={18} color={Colors.textMuted} />
          </Pressable>
        ))}
      </View>

      {/* Quick Stats */}
      <View style={styles.statsRow}>
        <Pressable 
          style={styles.statCard}
          onPress={() => router.push('/(tabs)/scenarios')}
        >
          <Text style={styles.statLabel}>View Scenarios</Text>
          <Text style={styles.statValue}>3 paths</Text>
          <ChevronRight size={16} color={Colors.accent} style={styles.statArrow} />
        </Pressable>
        
        <Pressable 
          style={styles.statCard}
          onPress={() => router.push('/learn' as never)}
        >
          <Text style={styles.statLabel}>Learn</Text>
          <Text style={styles.statValue}>4 topics</Text>
          <ChevronRight size={16} color={Colors.accent} style={styles.statArrow} />
        </Pressable>
      </View>
    </ScrollView>
  );
}

function MetricItem({ label, value, trend }: { label: string; value: string; trend: 'up' | 'down' | 'neutral' }) {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? Colors.success : trend === 'down' ? Colors.danger : Colors.textMuted;
  
  return (
    <View style={styles.metricItem}>
      <Text style={styles.metricLabel}>{label}</Text>
      <View style={styles.metricValueRow}>
        <Text style={styles.metricValue}>{value}</Text>
        <TrendIcon size={14} color={trendColor} />
      </View>
    </View>
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
  return colors[label] || Colors.textMuted;
}

function getPriorityColor(priority: string): string {
  const colors: Record<string, string> = {
    'high': Colors.danger,
    'medium': Colors.warning,
    'low': Colors.accent,
  };
  return colors[priority] || Colors.textMuted;
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
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    color: Colors.textSecondary,
  },
  healthCard: {
    padding: 20,
  },
  healthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  healthLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  processingBadge: {
    backgroundColor: Colors.accent + '15',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  processingText: {
    fontSize: 12,
    color: Colors.accent,
    fontWeight: '500',
  },
  healthScore: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  scoreNumber: {
    fontSize: 56,
    fontWeight: '700',
  },
  scoreMax: {
    fontSize: 20,
    color: Colors.textMuted,
    marginLeft: 4,
  },
  healthBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginBottom: 20,
  },
  healthBadgeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 12,
  },
  metricItem: {
    width: '47%',
    backgroundColor: Colors.surfaceSecondary,
    padding: 12,
    borderRadius: 10,
  },
  metricLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 4,
  },
  metricValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  whyContainer: {
    marginTop: 16,
  },
  progressCard: {
    marginTop: 16,
    padding: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginLeft: 8,
  },
  progressPercent: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.success,
  },
  progressBar: {
    height: 8,
    backgroundColor: Colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.success,
    borderRadius: 4,
  },
  progressDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  progressAmount: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  progressRunway: {
    fontSize: 13,
    color: Colors.accent,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  quickActions: {
    marginTop: 24,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  actionDescription: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  statArrow: {
    position: 'absolute' as const,
    right: 12,
    top: 16,
  },
});
