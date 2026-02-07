import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  TrendingDown,
  Plus,
  RefreshCw,
  BarChart3,
  Bell,
  Star,
  ShoppingCart,
  Sparkles,
  Upload,
  PieChart,
} from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { PortfolioCoachCard } from '@/components/PortfolioCoachCard';
import { CelebrationModal, type CelebrationData } from '@/components/CelebrationModal';
import { AnimatedListItem, AnimatedScaleIn } from '@/components/AnimatedListItem';
import { PortfolioSkeleton } from '@/components/SkeletonLoader';
import Colors from '@/constants/colors';
import { usePortfolioData } from '@/hooks/usePortfolioData';
import haptics from '@/lib/haptics';
import EnhancedCard from '@/components/ui/EnhancedCard';
import Button from '@/components/ui/Button';
import TimePeriodSelector, { TimePeriod } from '@/components/ui/TimePeriodSelector';
import HoldingListItem from '@/components/ui/HoldingListItem';
import PortfolioChart from '@/components/ui/PortfolioChart';

import { ASSET_CLASS_COLORS, AssetClass } from '@/types';
import portfolioHistory, { PerformanceData } from '@/lib/portfolioHistory';

export default function HomeScreen() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const [celebration, setCelebration] = useState<CelebrationData | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('1M');
  const [chartPerformance, setChartPerformance] = useState<PerformanceData>({ labels: [], values: [], gains: [], gainPercents: [] });
  const [periodReturn, setPeriodReturn] = useState<{ change: number; percent: number } | null>(null);

  const {
    holdings,
    isLoading,
    refreshing,
    summary,
    dayChange,
    refresh,
  } = usePortfolioData();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/auth');
    }
  }, [authLoading, isAuthenticated, router]);

  // Get top holdings
  const topHoldings = useMemo(() => {
    return [...holdings]
      .sort((a, b) => {
        const aValue = a.currentValue || a.quantity * (a.currentPrice || a.purchasePrice);
        const bValue = b.currentValue || b.quantity * (b.currentPrice || b.purchasePrice);
        return bValue - aValue;
      })
      .slice(0, 5);
  }, [holdings]);

  // Calculate allocation
  const allocation = useMemo(() => {
    const byClass: Record<string, number> = {};
    let total = 0;

    holdings.forEach((h) => {
      const value = h.currentValue || h.quantity * (h.currentPrice || h.purchasePrice);
      total += value;
      byClass[h.assetClass] = (byClass[h.assetClass] || 0) + value;
    });

    return Object.entries(byClass)
      .map(([assetClass, value]) => ({
        assetClass: assetClass as AssetClass,
        value,
        percent: total > 0 ? (value / total) * 100 : 0,
        color: ASSET_CLASS_COLORS[assetClass as AssetClass] || Colors.textMuted,
      }))
      .sort((a, b) => b.value - a.value);
  }, [holdings]);

  // Map TimePeriod to portfolioHistory period keys
  const historyPeriod = useMemo(() => {
    const map: Record<TimePeriod, '1W' | '1M' | '3M' | '1Y' | 'ALL'> = {
      '1D': '1W', // Show last week data for 1D (no intraday data available)
      '1W': '1W',
      '1M': '1M',
      '3M': '3M',
      '1Y': '1Y',
      'ALL': 'ALL',
    };
    return map[selectedPeriod];
  }, [selectedPeriod]);

  // Load real chart data from portfolio history
  const loadChartData = useCallback(async () => {
    if (holdings.length === 0) return;
    try {
      const perfData = await portfolioHistory.getPerformanceData(historyPeriod);
      setChartPerformance(perfData);

      if (perfData.values.length >= 2) {
        const startVal = perfData.values[0];
        const endVal = perfData.values[perfData.values.length - 1];
        const change = endVal - startVal;
        const percent = startVal > 0 ? (change / startVal) * 100 : 0;
        setPeriodReturn({
          change: Math.round(change * 100) / 100,
          percent: Math.round(percent * 100) / 100,
        });
      }
    } catch (err) {
      console.error('Failed to load chart data:', err);
    }
  }, [holdings.length, historyPeriod]);

  useEffect(() => {
    loadChartData();
  }, [loadChartData]);

  if (isLoading || authLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <PortfolioSkeleton />
        </View>
      </View>
    );
  }

  const isGain = summary.totalGain >= 0;
  const firstName = user?.displayName?.split(' ')[0] || 'there';

  // Use real period return for the selected period, fall back to all-time gain
  const displayChange = periodReturn || { change: summary.totalGain, percent: summary.totalGainPercent };
  const isPeriodPositive = displayChange.change >= 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={Colors.primary} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {firstName}</Text>
          <Text style={styles.subtitle}>Your portfolio at a glance</Text>
        </View>
        <Pressable
          style={styles.bellButton}
          onPress={() => {
            haptics.lightTap();
            router.push('/portfolio/alerts' as any);
          }}
        >
          <Bell size={24} color={Colors.text} />
        </Pressable>
      </View>

      <CelebrationModal
        visible={!!celebration}
        onClose={() => setCelebration(null)}
        celebration={celebration}
      />

      {holdings.length > 0 ? (
        <>
          {/* Portfolio Value Header */}
          <View style={styles.portfolioHeader}>
            <Text style={styles.portfolioValue}>
              ${summary.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
            <View style={styles.changeRow}>
              {isPeriodPositive ? (
                <TrendingUp size={16} color={Colors.success} />
              ) : (
                <TrendingDown size={16} color={Colors.danger} />
              )}
              <Text style={[styles.changeText, { color: isPeriodPositive ? Colors.success : Colors.danger }]}>
                {isPeriodPositive ? '+' : ''}${Math.abs(displayChange.change).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({isPeriodPositive ? '+' : ''}{displayChange.percent.toFixed(2)}%)
              </Text>
              <Text style={styles.periodLabel}>{selectedPeriod === 'ALL' ? 'All time' : selectedPeriod}</Text>
            </View>
          </View>

          {/* Time Period Selector */}
          <TimePeriodSelector selected={selectedPeriod} onSelect={setSelectedPeriod} />

          {/* Portfolio Chart */}
          <View style={styles.chartContainer}>
            {chartPerformance.values.length > 1 ? (
              <PortfolioChart
                data={chartPerformance.values}
                labels={chartPerformance.labels}
                isPositive={isPeriodPositive}
              />
            ) : (
              <View style={styles.chartPlaceholder}>
                <Text style={styles.chartPlaceholderText}>
                  Chart data is building up. Pull to refresh.
                </Text>
              </View>
            )}
          </View>

          {/* Your Portfolio Section */}
          <View style={styles.portfolioSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Your Portfolio</Text>
              <Pressable onPress={() => router.push('/(tabs)/portfolio' as any)}>
                <Text style={styles.sortButton}>Sort ▼</Text>
              </Pressable>
            </View>

            <EnhancedCard style={styles.holdingsCard}>
              {topHoldings.map((holding, index) => {
                const value = holding.currentValue || holding.quantity * (holding.currentPrice || holding.purchasePrice);
                const invested = holding.quantity * holding.purchasePrice;
                const gain = value - invested;
                const gainPercent = invested > 0 ? (gain / invested) * 100 : 0;

                return (
                  <HoldingListItem
                    key={holding.id}
                    symbol={holding.symbol || holding.name.slice(0, 4).toUpperCase()}
                    name={holding.name}
                    shares={holding.quantity}
                    price={holding.currentPrice || holding.purchasePrice}
                    value={value}
                    change={gain}
                    changePercent={gainPercent}
                    onPress={() => {
                      haptics.lightTap();
                      router.push(`/portfolio/${holding.id}` as any);
                    }}
                  />
                );
              })}
            </EnhancedCard>
          </View>

          {/* Ask Penny Button */}
          <Pressable
            style={styles.askPennyButton}
            onPress={() => {
              haptics.lightTap();
              router.push('/ask-penny' as any);
            }}
          >
            <View style={styles.askPennyContent}>
              <View style={styles.askPennyIcon}>
                <Image
                  source={require('@/assets/images/icon.png')}
                  style={styles.pennyImage}
                  resizeMode="contain"
                />
              </View>
              <View style={styles.askPennyText}>
                <Text style={styles.askPennyTitle}>Ask Penny</Text>
                <Text style={styles.askPennySubtitle}>Get AI-powered investment advice</Text>
              </View>
              <ChevronRight size={20} color={Colors.textSecondary} />
            </View>
          </Pressable>

          {/* Asset Allocation */}
          {allocation.length > 0 && (
            <Pressable
              style={styles.allocationSection}
              onPress={() => router.push('/portfolio/analysis' as any)}
            >
              <EnhancedCard>
                <View style={styles.allocationHeader}>
                  <View style={styles.allocationTitleRow}>
                    <PieChart size={20} color={Colors.primary} />
                    <Text style={styles.allocationTitle}>Asset Allocation</Text>
                  </View>
                  <ChevronRight size={20} color={Colors.textSecondary} />
                </View>
                <View style={styles.allocationBar}>
                  {allocation.map((item, index) => (
                    <View
                      key={item.assetClass}
                      style={[
                        styles.allocationSegment,
                        {
                          backgroundColor: item.color,
                          width: `${Math.max(item.percent, 2)}%`,
                          borderTopLeftRadius: index === 0 ? 8 : 0,
                          borderBottomLeftRadius: index === 0 ? 8 : 0,
                          borderTopRightRadius: index === allocation.length - 1 ? 8 : 0,
                          borderBottomRightRadius: index === allocation.length - 1 ? 8 : 0,
                        },
                      ]}
                    />
                  ))}
                </View>
                <View style={styles.allocationLegend}>
                  {allocation.slice(0, 4).map((item) => (
                    <View key={item.assetClass} style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                      <Text style={styles.legendLabel}>
                        {item.assetClass.charAt(0).toUpperCase() + item.assetClass.slice(1).replace('_', ' ')}
                      </Text>
                      <Text style={styles.legendPercent}>{item.percent.toFixed(0)}%</Text>
                    </View>
                  ))}
                </View>
              </EnhancedCard>
            </Pressable>
          )}

          {/* Quick Actions Bar */}
          <View style={styles.actionsBar}>
            <Button
              title="Buy"
              onPress={() => router.push('/portfolio/add' as any)}
              variant="primary"
              size="medium"
              style={styles.actionButton}
              icon={<Plus size={18} color={Colors.text} />}
            />
            <Button
              title="Refresh"
              onPress={refresh}
              variant="secondary"
              size="medium"
              style={styles.actionButton}
              icon={<RefreshCw size={18} color={Colors.text} />}
            />
          </View>

          {/* Ask Before I Buy */}
          <Pressable
            style={styles.askBuyBanner}
            onPress={() => router.push('/portfolio/ask-before-buy' as any)}
          >
            <EnhancedCard style={styles.askBuyCard}>
              <View style={styles.askBuyIcon}>
                <ShoppingCart size={22} color={Colors.purple} />
              </View>
              <View style={styles.askBuyContent}>
                <View style={styles.askBuyTitleRow}>
                  <Text style={styles.askBuyTitle}>Ask Before I Buy</Text>
                  <View style={styles.askBuyBadge}>
                    <Sparkles size={10} color={Colors.purple} />
                    <Text style={styles.askBuyBadgeText}>GEMINI 3</Text>
                  </View>
                </View>
                <Text style={styles.askBuySubtitle}>
                  Buy this or invest? AI analyzes any purchase
                </Text>
              </View>
              <ChevronRight size={20} color={Colors.textSecondary} />
            </EnhancedCard>
          </Pressable>

          {/* Creator Hub Banner */}
          <Pressable
            style={styles.creatorBanner}
            onPress={() => router.push('/(tabs)/creator' as any)}
          >
            <EnhancedCard style={styles.creatorCard}>
              <View style={styles.creatorContent}>
                <View style={styles.creatorIcon}>
                  <Star size={20} color="#FFD700" fill="#FFD700" />
                </View>
                <View style={styles.creatorText}>
                  <Text style={styles.creatorTitle}>VisualPolitik EN</Text>
                  <Text style={styles.creatorSubtitle}>Geopolitics & finance explained</Text>
                </View>
              </View>
              <ChevronRight size={20} color={Colors.textSecondary} />
            </EnhancedCard>
          </Pressable>

        </>
      ) : (
        /* Empty State - Preserved */
        <View style={styles.emptyState}>
          <EnhancedCard style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Sparkles size={48} color={Colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>Start Your Portfolio</Text>
            <Text style={styles.emptySubtitle}>
              Add your investments to track performance and get personalized AI coaching
            </Text>
            <View style={styles.emptyButtons}>
              <Button
                title="Add Holding"
                onPress={() => router.push('/portfolio/add' as any)}
                variant="primary"
                size="large"
                style={styles.emptyButton}
                icon={<Plus size={20} color={Colors.text} />}
              />
              <Button
                title="Bulk Import"
                onPress={() => router.push('/portfolio/import' as any)}
                variant="ghost"
                size="large"
                style={styles.emptyButton}
                icon={<Upload size={20} color={Colors.primary} />}
              />
            </View>
          </EnhancedCard>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
  },
  bellButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  askPennyButton: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 12,
    marginTop: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.purple + '30',
  },
  askPennyContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  askPennyIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.purple + '20',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  pennyImage: {
    width: 30,
    height: 30,
  },
  askPennyText: {
    flex: 1,
  },
  askPennyTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  askPennySubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  portfolioHeader: {
    marginBottom: 16,
  },
  portfolioValue: {
    fontSize: 48,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 8,
  },
  changeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  changeText: {
    fontSize: 16,
    fontWeight: '600',
  },
  periodLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginLeft: 4,
  },
  chartContainer: {
    marginVertical: 16,
  },
  chartPlaceholder: {
    height: 200,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  chartPlaceholderText: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  portfolioSection: {
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
  },
  sortButton: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  holdingsCard: {
    padding: 0,
    overflow: 'hidden',
  },
  actionsBar: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  actionButton: {
    flex: 1,
  },
  creatorBanner: {
    marginTop: 24,
  },
  creatorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  creatorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  creatorIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceHighlight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  creatorText: {
    flex: 1,
  },
  creatorTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  creatorSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  askBuyBanner: {
    marginTop: 16,
  },
  askBuyCard: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  askBuyIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.ai.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  askBuyContent: {
    flex: 1,
  },
  askBuyTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  askBuyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  askBuyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: Colors.ai.background,
  },
  askBuyBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.purple,
  },
  askBuySubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  allocationSection: {
    marginTop: 24,
  },
  allocationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  allocationTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  allocationTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  allocationBar: {
    flexDirection: 'row',
    height: 12,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 16,
  },
  allocationSegment: {
    height: '100%',
  },
  allocationLegend: {
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendLabel: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
  },
  legendPercent: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  emptyState: {
    marginTop: 40,
  },
  emptyCard: {
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  emptyButtons: {
    width: '100%',
    gap: 12,
  },
  emptyButton: {
    width: '100%',
  },
});
