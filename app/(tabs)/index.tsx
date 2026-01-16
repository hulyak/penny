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
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowRight, Sparkles, TrendingUp } from 'lucide-react-native';
import { useApp } from '@/context/AppContext';
import { Card } from '@/components/Card';
import { HealthScore } from '@/components/HealthScore';
import { WeeklyFocusCard } from '@/components/WeeklyFocusCard';
import Colors from '@/constants/colors';

export default function DashboardScreen() {
  const router = useRouter();
  const { 
    snapshot, 
    financials, 
    weeklyFocuses, 
    marketContext,
    agentsProcessing,
    updateFocusProgress,
    hasOnboarded,
  } = useApp();

  const [refreshing, setRefreshing] = React.useState(false);

  React.useEffect(() => {
    if (!hasOnboarded) {
      router.replace('/onboarding');
    }
  }, [hasOnboarded, router]);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  if (!snapshot) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.secondary} />
        <Text style={styles.loadingText}>Agents analyzing your finances...</Text>
      </View>
    );
  }

  
  const emergencyProgress = (financials.savings / financials.emergencyFundGoal) * 100;

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      showsVerticalScrollIndicator={false}
    >
      <LinearGradient
        colors={[Colors.primary, Colors.primaryLight]}
        style={styles.headerGradient}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.greeting}>Your Financial Clarity</Text>
              <Text style={styles.subtitle}>Updated just now</Text>
            </View>
            {agentsProcessing && (
              <View style={styles.processingBadge}>
                <Sparkles size={14} color={Colors.warning} />
                <Text style={styles.processingText}>Agents working</Text>
              </View>
            )}
          </View>
          
          <View style={styles.healthContainer}>
            <HealthScore snapshot={snapshot} />
          </View>
        </View>
      </LinearGradient>

      <View style={styles.metricsRow}>
        <Card style={styles.metricCard} variant="elevated">
          <Text style={styles.metricLabel}>Monthly Income</Text>
          <Text style={styles.metricValue}>${financials.monthlyIncome.toLocaleString()}</Text>
        </Card>
        <Card style={styles.metricCard} variant="elevated">
          <Text style={styles.metricLabel}>Disposable</Text>
          <Text style={[styles.metricValue, { color: Colors.accent }]}>
            ${snapshot.disposableIncome.toLocaleString()}
          </Text>
        </Card>
      </View>

      <Card style={styles.emergencyCard} variant="elevated">
        <View style={styles.emergencyHeader}>
          <Text style={styles.sectionTitle}>Emergency Fund Progress</Text>
          <Text style={styles.emergencyPercent}>{emergencyProgress.toFixed(0)}%</Text>
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${Math.min(emergencyProgress, 100)}%` }]} />
        </View>
        <View style={styles.emergencyDetails}>
          <Text style={styles.emergencyText}>
            ${financials.savings.toLocaleString()} of ${financials.emergencyFundGoal.toLocaleString()}
          </Text>
          <Text style={styles.runwayText}>
            {snapshot.monthsOfRunway.toFixed(1)} months runway
          </Text>
        </View>
      </Card>

      <Pressable 
        style={styles.marketCard}
        onPress={() => router.push('/insights')}
      >
        <LinearGradient
          colors={[Colors.secondary + '15', Colors.accent + '10']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.marketGradient}
        >
          <View style={styles.marketHeader}>
            <TrendingUp size={20} color={Colors.secondary} />
            <Text style={styles.marketTitle}>Market Context</Text>
            <ArrowRight size={16} color={Colors.textMuted} />
          </View>
          <Text style={styles.marketSentiment}>
            Sentiment: <Text style={styles.sentimentValue}>{marketContext.overallSentiment}</Text>
          </Text>
          <Text style={styles.marketNote} numberOfLines={2}>
            {marketContext.educationalNote}
          </Text>
        </LinearGradient>
      </Pressable>

      <View style={styles.focusSection}>
        <Text style={styles.sectionTitle}>This Week&apos;s Focus</Text>
        <Text style={styles.sectionSubtitle}>
          Personalized by your Adaptation Agent
        </Text>
        {weeklyFocuses.map((focus) => (
          <WeeklyFocusCard 
            key={focus.id} 
            focus={focus}
            onProgressUpdate={(progress) => updateFocusProgress(focus.id, progress)}
          />
        ))}
      </View>

      <Pressable 
        style={styles.scenariosCta}
        onPress={() => router.push('/scenarios')}
      >
        <Text style={styles.ctaText}>Explore What-If Scenarios</Text>
        <ArrowRight size={18} color={Colors.secondary} />
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
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
    fontSize: 16,
    color: Colors.textSecondary,
  },
  headerGradient: {
    paddingTop: 16,
    paddingBottom: 32,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: {
    alignItems: 'center',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    width: '100%',
    marginBottom: 24,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textLight,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textLight,
    opacity: 0.7,
    marginTop: 4,
  },
  processingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  processingText: {
    fontSize: 12,
    color: Colors.warning,
    marginLeft: 6,
  },
  healthContainer: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    padding: 20,
  },
  metricsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: -16,
    gap: 12,
  },
  metricCard: {
    flex: 1,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  emergencyCard: {
    marginHorizontal: 16,
    marginTop: 16,
  },
  emergencyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  emergencyPercent: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.accent,
  },
  progressBar: {
    height: 8,
    backgroundColor: Colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.accent,
    borderRadius: 4,
  },
  emergencyDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  emergencyText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  runwayText: {
    fontSize: 13,
    color: Colors.secondary,
    fontWeight: '500',
  },
  marketCard: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  marketGradient: {
    padding: 16,
  },
  marketHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  marketTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginLeft: 8,
  },
  marketSentiment: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  sentimentValue: {
    fontWeight: '600',
    color: Colors.secondary,
    textTransform: 'capitalize',
  },
  marketNote: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  focusSection: {
    paddingHorizontal: 16,
    marginTop: 24,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: Colors.textMuted,
    marginBottom: 16,
  },
  scenariosCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginTop: 24,
    paddingVertical: 16,
    backgroundColor: Colors.secondary + '10',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.secondary + '30',
  },
  ctaText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.secondary,
    marginRight: 8,
  },
});
