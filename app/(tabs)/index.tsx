import React from 'react';
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
} from 'lucide-react-native';
import { useApp } from '@/context/AppContext';
import { Card } from '@/components/Card';
import Colors from '@/constants/colors';

const MASCOT_URL = 'https://r2-pub.rork.com/generated-images/27789a4a-5f4b-41c7-8590-21b6ef0e91a2.png';

export default function OverviewScreen() {
  const router = useRouter();
  const { 
    snapshot, 
    financials, 
    weeklyFocuses,
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
        <Image source={{ uri: MASCOT_URL }} style={styles.loadingMascot} />
        <Text style={styles.loadingText}>Crunching numbers...</Text>
      </View>
    );
  }

  const emergencyProgress = Math.min(100, (financials.savings / financials.emergencyFundGoal) * 100);
  const healthColor = getHealthColor(snapshot.healthLabel);
  
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning!';
    if (hour < 17) return 'Good afternoon!';
    return 'Good evening!';
  };

  const getMascotMessage = () => {
    if (snapshot.healthScore >= 80) return "You're doing great! Keep it up! 🎉";
    if (snapshot.healthScore >= 60) return "Nice progress! Let's keep building.";
    if (snapshot.healthScore >= 40) return "We've got a solid plan for you.";
    return "Let's work on this together!";
  };

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Mascot Greeting */}
      <View style={styles.greetingCard}>
        <Image source={{ uri: MASCOT_URL }} style={styles.mascotImage} />
        <View style={styles.greetingContent}>
          <Text style={styles.greetingTitle}>{getGreeting()}</Text>
          <Text style={styles.greetingMessage}>{getMascotMessage()}</Text>
        </View>
        {agentsProcessing && (
          <View style={styles.processingDot} />
        )}
      </View>

      {/* Health Score Card */}
      <Card style={styles.healthCard}>
        <View style={styles.healthHeader}>
          <Text style={styles.healthLabel}>Financial Health</Text>
          <View style={[styles.healthBadge, { backgroundColor: healthColor + '15' }]}>
            <Text style={[styles.healthBadgeText, { color: healthColor }]}>
              {snapshot.healthLabel}
            </Text>
          </View>
        </View>
        
        <View style={styles.scoreRow}>
          <View style={styles.scoreCircle}>
            <Text style={[styles.scoreNumber, { color: healthColor }]}>
              {snapshot.healthScore}
            </Text>
            <Text style={styles.scoreMax}>/100</Text>
          </View>
          
          <View style={styles.metricsColumn}>
            <MetricRow 
              icon={<Wallet size={16} color={Colors.accent} />}
              label="Disposable" 
              value={`$${snapshot.disposableIncome.toLocaleString()}/mo`}
            />
            <MetricRow 
              icon={<TrendingUp size={16} color={Colors.success} />}
              label="Savings Rate" 
              value={`${snapshot.savingsRate.toFixed(0)}%`}
            />
            <MetricRow 
              icon={<Target size={16} color={Colors.warning} />}
              label="Runway" 
              value={`${snapshot.monthsOfRunway.toFixed(1)} months`}
            />
          </View>
        </View>
      </Card>

      {/* Emergency Fund Progress */}
      <Card style={styles.fundCard}>
        <View style={styles.fundHeader}>
          <View style={styles.fundTitleRow}>
            <PiggyBank size={20} color={Colors.success} />
            <Text style={styles.fundTitle}>Emergency Fund</Text>
          </View>
          <Text style={styles.fundPercent}>{emergencyProgress.toFixed(0)}%</Text>
        </View>
        
        <View style={styles.fundProgress}>
          <View style={[styles.fundProgressFill, { width: `${emergencyProgress}%` }]} />
        </View>
        
        <Text style={styles.fundDetails}>
          ${financials.savings.toLocaleString()} of ${financials.emergencyFundGoal.toLocaleString()}
        </Text>
      </Card>

      {/* This Week Section */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>This Week</Text>
        <Pressable onPress={() => router.push('/plan')}>
          <Text style={styles.seeAll}>See all</Text>
        </Pressable>
      </View>

      {weeklyFocuses.slice(0, 2).map((focus) => (
        <Pressable 
          key={focus.id}
          style={styles.taskCard}
          onPress={() => router.push('/plan')}
        >
          <View style={[styles.taskIcon, { backgroundColor: getPriorityColor(focus.priority) + '15' }]}>
            <Target size={18} color={getPriorityColor(focus.priority)} />
          </View>
          <View style={styles.taskContent}>
            <Text style={styles.taskTitle}>{focus.title}</Text>
            <Text style={styles.taskDescription} numberOfLines={1}>
              {focus.description}
            </Text>
          </View>
          <ChevronRight size={18} color={Colors.textMuted} />
        </Pressable>
      ))}

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <Pressable 
          style={styles.quickAction}
          onPress={() => router.push('/(tabs)/scenarios')}
        >
          <View style={[styles.quickIcon, { backgroundColor: Colors.accentMuted }]}>
            <Sparkles size={20} color={Colors.accent} />
          </View>
          <Text style={styles.quickLabel}>Explore</Text>
          <Text style={styles.quickSubLabel}>Scenarios</Text>
        </Pressable>
        
        <Pressable 
          style={styles.quickAction}
          onPress={() => router.push('/(tabs)/learn')}
        >
          <View style={[styles.quickIcon, { backgroundColor: Colors.successMuted }]}>
            <TrendingUp size={20} color={Colors.success} />
          </View>
          <Text style={styles.quickLabel}>Learn</Text>
          <Text style={styles.quickSubLabel}>Finance tips</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function MetricRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <View style={styles.metricRow}>
      {icon}
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
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
  return colors[label] || Colors.accent;
}

function getPriorityColor(priority: string): string {
  const colors: Record<string, string> = {
    'high': Colors.danger,
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
    width: 80,
    height: 80,
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  greetingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  mascotImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  greetingContent: {
    flex: 1,
    marginLeft: 12,
  },
  greetingTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 2,
  },
  greetingMessage: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  processingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.accent,
  },
  healthCard: {
    padding: 16,
    marginBottom: 12,
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
  },
  healthBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  healthBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scoreCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  scoreNumber: {
    fontSize: 32,
    fontWeight: '700',
  },
  scoreMax: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: -4,
  },
  metricsColumn: {
    flex: 1,
    gap: 8,
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metricLabel: {
    flex: 1,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  fundCard: {
    padding: 16,
    marginBottom: 20,
  },
  fundHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  fundTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fundTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  fundPercent: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.success,
  },
  fundProgress: {
    height: 8,
    backgroundColor: Colors.border,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  fundProgressFill: {
    height: '100%',
    backgroundColor: Colors.success,
    borderRadius: 4,
  },
  fundDetails: {
    fontSize: 13,
    color: Colors.textSecondary,
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
  seeAll: {
    fontSize: 14,
    color: Colors.accent,
    fontWeight: '500',
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  taskIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  taskContent: {
    flex: 1,
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
    marginTop: 16,
  },
  quickAction: {
    flex: 1,
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  quickIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
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
