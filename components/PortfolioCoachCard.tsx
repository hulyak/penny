import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  ActivityIndicator,
} from 'react-native';
import {
  Flame,
  Sparkles,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Target,
  RefreshCw,
  PartyPopper,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import Colors from '@/constants/colors';
import { PENNY_MASCOT } from '@/constants/images';
import {
  generatePortfolioGreeting,
  generatePortfolioInsights,
  generateDailyTip,
  getPortfolioGoals,
  recordPortfolioCheckIn,
  type PortfolioInsight,
  type PortfolioCoachingContext,
} from '@/lib/portfolioCoach';
import { Holding, AssetClass } from '@/types';
import { opik } from '@/lib/opik';
import { GeminiBadge } from './GeminiBadge';

interface PortfolioCoachCardProps {
  holdings: Holding[];
  totalValue: number;
  totalGain: number;
  totalGainPercent: number;
  userName?: string;
  onInsightPress?: (insight: PortfolioInsight) => void;
}

export function PortfolioCoachCard({
  holdings,
  totalValue,
  totalGain,
  totalGainPercent,
  userName,
  onInsightPress,
}: PortfolioCoachCardProps) {
  const router = useRouter();
  const [greeting, setGreeting] = useState<string | null>(null);
  const [dailyTip, setDailyTip] = useState<string | null>(null);
  const [insights, setInsights] = useState<PortfolioInsight[]>([]);
  const [streak, setStreak] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showInsights, setShowInsights] = useState(false);

  useEffect(() => {
    loadCoachContent();
  }, [holdings.length, totalValue]);

  const loadCoachContent = async () => {
    setIsLoading(true);
    try {
      // Record check-in
      const { streak: currentStreak } = await recordPortfolioCheckIn();
      setStreak(currentStreak);

      // Get user goals
      const goals = await getPortfolioGoals();

      // Calculate allocation
      const allocation: Record<AssetClass, number> = {
        equity: 0, debt: 0, commodity: 0, real_asset: 0, cash: 0, other: 0,
      };
      let total = 0;
      holdings.forEach((h) => {
        const value = h.currentValue || h.quantity * (h.currentPrice || h.purchasePrice);
        total += value;
        allocation[h.assetClass] = (allocation[h.assetClass] || 0) + value;
      });
      if (total > 0) {
        Object.keys(allocation).forEach((key) => {
          allocation[key as AssetClass] = (allocation[key as AssetClass] / total) * 100;
        });
      }

      const context: PortfolioCoachingContext = {
        holdings,
        goals,
        totalValue,
        totalGain,
        totalGainPercent,
        allocation,
        userName,
      };

      // Run all AI calls in parallel for speed
      const [greetingText, tip, newInsights] = await Promise.all([
        generatePortfolioGreeting(context),
        generateDailyTip(context),
        generatePortfolioInsights(context, 2), // Reduced to 2 insights for speed
      ]);

      setGreeting(greetingText);
      setDailyTip(tip);
      setInsights(newInsights);
    } catch (error) {
      console.error('[PortfolioCoachCard] Error loading content:', error);
      setGreeting(holdings.length > 0
        ? `Your portfolio is at $${totalValue.toLocaleString()}. Let's check in.`
        : 'Ready to start building your investment portfolio?'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const getInsightIcon = (type: PortfolioInsight['type']) => {
    switch (type) {
      case 'milestone':
        return <PartyPopper size={16} color={Colors.success} />;
      case 'goal_progress':
        return <Target size={16} color={Colors.accent} />;
      case 'rebalance_needed':
        return <RefreshCw size={16} color={Colors.warning} />;
      case 'concentration_warning':
        return <AlertTriangle size={16} color={Colors.coral} />;
      case 'strategy_drift':
        return <TrendingDown size={16} color={Colors.warning} />;
      case 'action_reminder':
        return <Sparkles size={16} color={Colors.accent} />;
      case 'market_context':
        return <TrendingUp size={16} color={Colors.lavender} />;
      default:
        return <Sparkles size={16} color={Colors.accent} />;
    }
  };

  const getInsightColor = (type: PortfolioInsight['type']) => {
    switch (type) {
      case 'milestone':
        return Colors.successMuted;
      case 'goal_progress':
        return Colors.accentMuted;
      case 'rebalance_needed':
        return Colors.warningMuted;
      case 'concentration_warning':
        return Colors.coralMuted;
      case 'strategy_drift':
        return Colors.warningMuted;
      case 'action_reminder':
        return Colors.accentMuted;
      case 'market_context':
        return Colors.lavenderMuted;
      default:
        return Colors.accentMuted;
    }
  };

  const handleInsightPress = async (insight: PortfolioInsight) => {
    // Log feedback to Opik
    await opik.logFeedback({
      traceId: insight.id,
      rating: 'helpful',
      timestamp: new Date().toISOString(),
    });

    if (onInsightPress) {
      onInsightPress(insight);
    } else if (insight.actionRoute) {
      router.push(insight.actionRoute as any);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Image
            source={PENNY_MASCOT}
            style={styles.mascotSmall}
            resizeMode="contain"
          />
          <ActivityIndicator size="small" color={Colors.accent} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Main Greeting Card */}
      <Pressable
        style={styles.greetingCard}
        onPress={() => router.push('/(tabs)/portfolio' as any)}
      >
        <View style={styles.greetingHeader}>
          <Image
            source={PENNY_MASCOT}
            style={styles.mascot}
            resizeMode="contain"
          />
          <View style={styles.greetingContent}>
            <View style={styles.greetingMeta}>
              {totalGainPercent >= 0 ? (
                <TrendingUp size={16} color={Colors.success} />
              ) : (
                <TrendingDown size={16} color={Colors.danger} />
              )}
              {streak > 1 && (
                <View style={styles.streakBadge}>
                  <Flame size={12} color={Colors.coral} />
                  <Text style={styles.streakText}>{streak} day streak</Text>
                </View>
              )}
            </View>
            <Text style={styles.greetingText}>{greeting}</Text>
          </View>
        </View>
      </Pressable>

      {/* Daily Tip */}
      {dailyTip && (
        <View style={styles.tipCard}>
          <View style={styles.tipHeader}>
            <Sparkles size={14} color={Colors.accent} />
            <Text style={styles.tipLabel}>Today's Focus</Text>
            <View style={styles.tipBadge}>
              <GeminiBadge variant="inline" />
            </View>
          </View>
          <Text style={styles.tipText}>{dailyTip}</Text>
        </View>
      )}

      {/* Insights Toggle */}
      {insights.length > 0 && (
        <Pressable
          style={styles.insightsToggle}
          onPress={() => setShowInsights(!showInsights)}
        >
          <View style={styles.insightsToggleLeft}>
            <Target size={16} color={Colors.accent} />
            <Text style={styles.insightsToggleText}>
              {insights.length} insight{insights.length > 1 ? 's' : ''} for you
            </Text>
          </View>
          <ChevronRight
            size={18}
            color={Colors.textMuted}
            style={{ transform: [{ rotate: showInsights ? '90deg' : '0deg' }] }}
          />
        </Pressable>
      )}

      {/* Insights List */}
      {showInsights && insights.map((insight) => (
        <Pressable
          key={insight.id}
          style={[styles.insightCard, { backgroundColor: getInsightColor(insight.type) }]}
          onPress={() => handleInsightPress(insight)}
        >
          <View style={styles.insightIcon}>
            {getInsightIcon(insight.type)}
          </View>
          <View style={styles.insightContent}>
            <Text style={styles.insightTitle}>{insight.title}</Text>
            <Text style={styles.insightMessage} numberOfLines={2}>
              {insight.message}
            </Text>
          </View>
          {insight.actionLabel && (
            <ChevronRight size={16} color={Colors.textMuted} />
          )}
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 12,
  },
  mascotSmall: {
    width: 44,
    height: 50,
  },

  greetingCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  greetingHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  mascot: {
    width: 56,
    height: 64,
    marginRight: 12,
  },
  greetingContent: {
    flex: 1,
  },
  greetingMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.coralMuted,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 4,
  },
  streakText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.coral,
  },
  greetingText: {
    fontSize: 15,
    color: Colors.text,
    lineHeight: 22,
  },

  tipCard: {
    backgroundColor: Colors.accentMuted,
    borderRadius: 14,
    padding: 14,
    marginTop: 12,
  },
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  tipLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    flex: 1,
  },
  tipBadge: {
    marginLeft: 'auto',
  },
  tipText: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },

  insightsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
  },
  insightsToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  insightsToggleText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
  },

  insightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 14,
    marginTop: 8,
  },
  insightIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  insightContent: {
    flex: 1,
  },
  insightTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  insightMessage: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
});
