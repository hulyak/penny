import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import {
  ArrowLeft,
  Sparkles,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Lightbulb,
  Target,
  Shield,
  Zap,
  RefreshCw,
  Crown,
  ChevronRight,
  PieChart,
  BarChart3,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';
import { Holding, AssetClass } from '@/types';
import { usePurchases } from '@/context/PurchasesContext';
import portfolioService from '@/lib/portfolioService';
import { generatePortfolioInsights, PortfolioInsight, PortfolioCoachingContext, getPortfolioGoals } from '@/lib/portfolioCoach';
import { PremiumBadge } from '@/components/PremiumBadge';

const INSIGHT_ICONS: Record<string, any> = {
  diversification: PieChart,
  rebalancing: BarChart3,
  risk_alert: AlertTriangle,
  opportunity: TrendingUp,
  market_context: Lightbulb,
  milestone: Target,
  tax_tip: Shield,
};

const INSIGHT_COLORS: Record<string, { bg: string; text: string }> = {
  diversification: { bg: Colors.purpleMuted, text: Colors.purple },
  rebalancing: { bg: Colors.blueMuted, text: Colors.blue },
  risk_alert: { bg: Colors.dangerMuted, text: Colors.danger },
  opportunity: { bg: Colors.successMuted, text: Colors.success },
  market_context: { bg: Colors.warningMuted, text: Colors.warning },
  milestone: { bg: Colors.goldMuted, text: Colors.gold },
  tax_tip: { bg: Colors.cyanMuted, text: Colors.cyan },
};

const PRIORITY_STYLES: Record<string, { borderColor: string }> = {
  high: { borderColor: Colors.danger },
  medium: { borderColor: Colors.warning },
  low: { borderColor: Colors.border },
};

export default function AIInsightsScreen() {
  const router = useRouter();
  const { isPremium, showPaywall } = usePurchases();
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [insights, setInsights] = useState<PortfolioInsight[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    try {
      const loadedHoldings = await portfolioService.getHoldings();
      setHoldings(loadedHoldings);

      if (loadedHoldings.length >= 2) {
        await generateInsights(loadedHoldings);
      }
    } catch (err) {
      console.error('Failed to load data:', err);
      setError('Failed to load portfolio data');
    } finally {
      setIsLoading(false);
    }
  };

  const generateInsights = async (currentHoldings: Holding[]) => {
    try {
      setError(null);
      const totalValue = currentHoldings.reduce((sum, h) => {
        return sum + (h.currentValue || h.quantity * (h.currentPrice || h.purchasePrice));
      }, 0);

      const totalGain = currentHoldings.reduce((sum, h) => {
        const currentValue = h.currentValue || h.quantity * (h.currentPrice || h.purchasePrice);
        const invested = h.quantity * h.purchasePrice;
        return sum + (currentValue - invested);
      }, 0);

      const totalInvested = currentHoldings.reduce((sum, h) => sum + h.quantity * h.purchasePrice, 0);
      const totalGainPercent = totalInvested > 0 ? (totalGain / totalInvested) * 100 : 0;

      // Calculate allocation
      const allocationMap: Record<string, number> = {};
      currentHoldings.forEach((h) => {
        const value = h.currentValue || h.quantity * (h.currentPrice || h.purchasePrice);
        allocationMap[h.assetClass] = (allocationMap[h.assetClass] || 0) + ((value / totalValue) * 100);
      });

      const allocation: Record<AssetClass, number> = {
        equity: allocationMap['equity'] || 0,
        debt: allocationMap['debt'] || 0,
        commodity: allocationMap['commodity'] || 0,
        real_asset: allocationMap['real_asset'] || 0,
        cash: allocationMap['cash'] || 0,
      };

      // Get user goals
      const goals = await getPortfolioGoals();

      // Build context
      const context: PortfolioCoachingContext = {
        holdings: currentHoldings,
        goals,
        totalValue,
        totalGain,
        totalGainPercent,
        allocation,
      };

      // Generate multiple insights
      const newInsights = await generatePortfolioInsights(context, 5);

      setInsights(newInsights || []);
    } catch (err) {
      console.error('Failed to generate insights:', err);
      setError('Failed to generate AI insights');
    }
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  };

  const handleRefreshInsights = async () => {
    if (holdings.length >= 2) {
      setIsLoading(true);
      await generateInsights(holdings);
      setIsLoading(false);
    }
  };

  if (isLoading && insights.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Analyzing your portfolio...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>AI Insights</Text>
        <Pressable
          style={styles.refreshButton}
          onPress={handleRefreshInsights}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : (
            <RefreshCw size={20} color={Colors.text} />
          )}
        </Pressable>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
      >
        {/* AI Banner */}
        <LinearGradient
          colors={['#5B5FEF', '#8B5CF6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.aiBanner}
        >
          <View style={styles.aiIconWrapper}>
            <Sparkles size={24} color="#FFFFFF" />
          </View>
          <View style={styles.aiBannerContent}>
            <Text style={styles.aiBannerTitle}>Penny AI Coach</Text>
            <Text style={styles.aiBannerSubtitle}>
              Personalized insights powered by Google Gemini AI
            </Text>
          </View>
          {!isPremium && (
            <Pressable style={styles.premiumBadgeWrapper} onPress={showPaywall}>
              <Crown size={14} color={Colors.gold} />
              <Text style={styles.premiumBadgeText}>PRO</Text>
            </Pressable>
          )}
        </LinearGradient>

        {/* Premium Gate for Non-Premium Users */}
        {!isPremium && (
          <Pressable style={styles.upgradeCard} onPress={showPaywall}>
            <View style={styles.upgradeContent}>
              <Crown size={32} color={Colors.gold} />
              <Text style={styles.upgradeTitle}>Unlock Full AI Analysis</Text>
              <Text style={styles.upgradeSubtitle}>
                Get unlimited AI insights, personalized recommendations, and advanced portfolio analysis
              </Text>
              <View style={styles.upgradeButton}>
                <Text style={styles.upgradeButtonText}>Upgrade to Premium</Text>
                <ChevronRight size={18} color={Colors.textLight} />
              </View>
            </View>
          </Pressable>
        )}

        {/* Holdings Check */}
        {holdings.length < 2 ? (
          <View style={styles.emptyCard}>
            <Sparkles size={48} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>Add More Holdings</Text>
            <Text style={styles.emptySubtitle}>
              Add at least 2 holdings to unlock AI-powered portfolio insights
            </Text>
            <Pressable
              style={styles.addButton}
              onPress={() => router.push('/portfolio/add' as any)}
            >
              <Text style={styles.addButtonText}>Add Holdings</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {/* Quick Stats */}
            <View style={styles.statsCard}>
              <Text style={styles.statsTitle}>Portfolio Overview</Text>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{holdings.length}</Text>
                  <Text style={styles.statLabel}>Holdings</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{insights.length}</Text>
                  <Text style={styles.statLabel}>Insights</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <View style={styles.aiPoweredBadge}>
                    <Zap size={12} color={Colors.warning} />
                    <Text style={styles.aiPoweredText}>AI</Text>
                  </View>
                  <Text style={styles.statLabel}>Powered</Text>
                </View>
              </View>
            </View>

            {/* Insights List */}
            <View style={styles.insightsSection}>
              <Text style={styles.sectionTitle}>Your AI Insights</Text>

              {error && (
                <View style={styles.errorCard}>
                  <AlertTriangle size={20} color={Colors.danger} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              {insights.length === 0 && !error && (
                <View style={styles.noInsightsCard}>
                  <Lightbulb size={32} color={Colors.textMuted} />
                  <Text style={styles.noInsightsText}>
                    Generating insights... Pull down to refresh.
                  </Text>
                </View>
              )}

              {insights.map((insight, index) => {
                const IconComponent = INSIGHT_ICONS[insight.type] || Lightbulb;
                const colors = INSIGHT_COLORS[insight.type] || { bg: Colors.surfaceSecondary, text: Colors.text };
                const priorityStyle = PRIORITY_STYLES[insight.priority] || PRIORITY_STYLES.low;

                return (
                  <Pressable
                    key={index}
                    style={[styles.insightCard, { borderLeftColor: priorityStyle.borderColor }]}
                    onPress={() => {
                      if (insight.actionRoute) {
                        router.push(insight.actionRoute as any);
                      }
                    }}
                  >
                    <View style={[styles.insightIconWrapper, { backgroundColor: colors.bg }]}>
                      <IconComponent size={20} color={colors.text} />
                    </View>
                    <View style={styles.insightContent}>
                      <View style={styles.insightHeader}>
                        <Text style={styles.insightTitle}>{insight.title}</Text>
                        <View style={[styles.priorityBadge, { backgroundColor: priorityStyle.borderColor + '20' }]}>
                          <Text style={[styles.priorityText, { color: priorityStyle.borderColor }]}>
                            {insight.priority.toUpperCase()}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.insightMessage}>{insight.message}</Text>
                      {insight.actionLabel && (
                        <View style={styles.actionRow}>
                          <Text style={styles.actionLabel}>{insight.actionLabel}</Text>
                          <ChevronRight size={16} color={Colors.primary} />
                        </View>
                      )}
                    </View>
                  </Pressable>
                );
              })}
            </View>

            {/* AI Disclaimer */}
            <View style={styles.disclaimer}>
              <Text style={styles.disclaimerText}>
                AI insights are for educational purposes only and should not be considered financial advice. Always consult with a qualified financial advisor before making investment decisions.
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: Colors.background,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  refreshButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  aiBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
  },
  aiIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiBannerContent: {
    flex: 1,
    marginLeft: 12,
  },
  aiBannerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  aiBannerSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  premiumBadgeWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  premiumBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.gold,
  },
  upgradeCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.gold + '40',
  },
  upgradeContent: {
    alignItems: 'center',
  },
  upgradeTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 12,
  },
  upgradeSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 16,
  },
  upgradeButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textLight,
  },
  statsCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  statsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: Colors.border,
  },
  aiPoweredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.warningMuted,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  aiPoweredText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.warning,
  },
  insightsSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.dangerMuted,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: Colors.danger,
  },
  noInsightsCard: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: Colors.surface,
    borderRadius: 16,
  },
  noInsightsText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 12,
  },
  insightCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderLeftWidth: 3,
  },
  insightIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  insightContent: {
    flex: 1,
    marginLeft: 12,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  insightTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '700',
  },
  insightMessage: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 10,
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
  },
  emptyCard: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    marginTop: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  addButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 20,
  },
  addButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textLight,
  },
  disclaimer: {
    padding: 16,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 12,
    marginBottom: 32,
  },
  disclaimerText: {
    fontSize: 11,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 16,
  },
});
