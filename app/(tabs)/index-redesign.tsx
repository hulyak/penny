import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Plus,
  RefreshCw,
  BarChart3,
  Bot,
  Bell,
  Star,
  ShoppingCart,
  Sparkles,
  Upload,
} from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { PortfolioCoachCard } from '@/components/PortfolioCoachCard';
import { CelebrationModal, type CelebrationData } from '@/components/CelebrationModal';
import { AnimatedListItem, AnimatedScaleIn } from '@/components/AnimatedListItem';
import { PortfolioSkeleton } from '@/components/SkeletonLoader';
import Colors from '@/constants/colors';
import { usePortfolioData } from '@/hooks/usePortfolioData';
import haptics from '@/lib/haptics';
import { generateMockChartData } from '@/components/onboarding';
import EnhancedCard from '@/components/ui/EnhancedCard';
import Button from '@/components/ui/Button';
import TimePeriodSelector, { TimePeriod } from '@/components/ui/TimePeriodSelector';
import HoldingListItem from '@/components/ui/HoldingListItem';
import PortfolioChart from '@/components/ui/PortfolioChart';

export default function HomeScreen() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const [celebration, setCelebration] = useState<CelebrationData | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('1D');

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

  // Generate chart data based on selected period
  const chartData = useMemo(() => {
    const baseValue = summary.totalValue - summary.totalGain;
    const data = generateMockChartData(baseValue, summary.totalGainPercent);
    return data;
  }, [summary, selectedPeriod]);

  const chartLabels = useMemo(() => {
    switch (selectedPeriod) {
      case '1D': return ['9AM', '12PM', '3PM', '6PM'];
      case '1W': return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
      case '1M': return ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
      case '3M': return ['Month 1', 'Month 2', 'Month 3'];
      case '1Y': return ['Q1', 'Q2', 'Q3', 'Q4'];
      case 'ALL': return ['Start', 'Q1', 'Q2', 'Now'];
      default: return [];
    }
  }, [selectedPeriod]);

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

  // Calculate quick stats
  const dayChangePercent = dayChange?.percentChange || 0;
  const weekChangePercent = summary.totalGainPercent * 0.7; // Mock data
  const monthChangePercent = summary.totalGainPercent * 0.9; // Mock data

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

      {/* AI Coach Card - Preserved */}
      <PortfolioCoachCard
        holdings={holdings}
        totalValue={summary.totalValue}
        totalGain={summary.totalGain}
        totalGainPercent={summary.totalGainPercent}
        userName={firstName}
        onInsightPress={(insight) => {
          if (insight.actionRoute) {
            router.push(insight.actionRoute as any);
          }
        }}
      />

      <CelebrationModal
        visible={!!celebration}
        onClose={() => setCelebration(null)}
        celebration={celebration}
      />

      {holdings.length > 0 ? (
        <>
          {/* Portfolio Value Header - TradingView Style */}
          <View style={styles.portfolioHeader}>
            <Text style={styles.portfolioValue}>
              ${summary.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
            <View style={styles.changeRow}>
              {isGain ? (
                <TrendingUp size={16} color={Colors.success} />
              ) : (
                <TrendingDown size={16} color={Colors.danger} />
              )}
              <Text style={[styles.changeText, { color: isGain ? Colors.success : Colors.danger }]}>
                {isGain ? '+' : ''}${Math.abs(summary.totalGain).toFixed(2)} ({isGain ? '+' : ''}{summary.totalGainPercent.toFixed(2)}%) Today
              </Text>
            </View>

            {/* Quick Stats Row */}
            <View style={styles.quickStats}>
              <Text style={styles.quickStat}>
                Day: <Text style={{ color: dayChangePercent >= 0 ? Colors.success : Colors.danger }}>
                  {dayChangePercent >= 0 ? '+' : ''}{dayChangePercent.toFixed(2)}%
                </Text>
              </Text>
              <Text style={styles.quickStat}>
                Week: <Text style={{ color: weekChangePercent >= 0 ? Colors.success : Colors.danger }}>
                  {weekChangePercent >= 0 ? '+' : ''}{weekChangePercent.toFixed(2)}%
                </Text>
              </Text>
              <Text style={styles.quickStat}>
                Month: <Text style={{ color: monthChangePercent >= 0 ? Colors.success : Colors.danger }}>
                  {monthChangePercent >= 0 ? '+' : ''}{monthChangePercent.toFixed(2)}%
                </Text>
              </Text>
            </View>
          </View>

          {/* Time Period Selector */}
          <TimePeriodSelector selected={selectedPeriod} onSelect={setSelectedPeriod} />

          {/* Portfolio Chart */}
          <View style={styles.chartContainer}>
            <PortfolioChart data={chartData} labels={chartLabels} />
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
            <Button
              title="Reports"
              onPress={() => router.push('/portfolio/analysis' as any)}
              variant="secondary"
              size="medium"
              style={styles.actionButton}
              icon={<BarChart3 size={18} color={Colors.text} />}
            />
            <Button
              title="AI"
              onPress={() => router.push('/portfolio/ask-before-buy' as any)}
              variant="secondary"
              size="medium"
              style={styles.actionButton}
              icon={<Bot size={18} color={Colors.purple} />}
            />
          </View>

          {/* Creator Hub Banner - Preserved */}
          <Pressable
            style={styles.creatorBanner}
            onPress={() => router.push('/creator' as any)}
          >
            <EnhancedCard style={styles.creatorCard}>
              <View style={styles.creatorContent}>
                <View style={styles.creatorIcon}>
                  <Star size={20} color="#FFD700" fill="#FFD700" />
                </View>
                <View style={styles.creatorText}>
                  <Text style={styles.creatorTitle}>Josh's Model Portfolio</Text>
                  <Text style={styles.creatorSubtitle}>View insights from @VisualFaktory</Text>
                </View>
              </View>
              <ChevronRight size={20} color={Colors.textSecondary} />
            </EnhancedCard>
          </Pressable>

          {/* Ask Before I Buy - Preserved */}
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
  quickStats: {
    flexDirection: 'row',
    gap: 20,
  },
  quickStat: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  chartContainer: {
    marginVertical: 16,
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
