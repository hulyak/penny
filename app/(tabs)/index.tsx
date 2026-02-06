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
import { LinearGradient } from 'expo-linear-gradient';
import {
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Plus,
  PieChart,
  Bell,
  Star,
  Briefcase,
  Sparkles,
  Upload,
  ShoppingCart,
} from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { PortfolioCoachCard } from '@/components/PortfolioCoachCard';
import { CelebrationModal, type CelebrationData } from '@/components/CelebrationModal';
import { AnimatedListItem, AnimatedScaleIn } from '@/components/AnimatedListItem';
import { PortfolioSkeleton } from '@/components/SkeletonLoader';
import Colors from '@/constants/colors';
import { Spacing, FontSize, BorderRadius, IconSize, ComponentHeight, Layout } from '@/constants/design';
import { ASSET_CLASS_COLORS, AssetClass } from '@/types';
import { usePortfolioData } from '@/hooks/usePortfolioData';
import haptics from '@/lib/haptics';
import { SparklineChart, generateMockChartData } from '@/components/onboarding';
import { AgentActivityLog } from '@/components/AgentActivityLog';

export default function HomeScreen() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const [celebration, setCelebration] = useState<CelebrationData | null>(null);

  // Use the consolidated portfolio data hook
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

  // Get top holdings for display (must be before conditional returns)
  const topHoldings = useMemo(() => {
    return [...holdings]
      .sort((a, b) => {
        const aValue = a.currentValue || a.quantity * (a.currentPrice || a.purchasePrice);
        const bValue = b.currentValue || b.quantity * (b.currentPrice || b.purchasePrice);
        return bValue - aValue;
      })
      .slice(0, 3);
  }, [holdings]);

  if (isLoading || authLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <View style={styles.header}>
            <View>
              <Text style={styles.greeting}>Hello!</Text>
              <Text style={styles.headerSubtitle}>Loading your portfolio...</Text>
            </View>
          </View>
          <PortfolioSkeleton />
        </View>
      </View>
    );
  }

  const isGain = summary.totalGain >= 0;
  const firstName = user?.displayName?.split(' ')[0] || 'there';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={Colors.accent} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {firstName}</Text>
          <Text style={styles.headerSubtitle}>Your portfolio at a glance</Text>
        </View>
        <Pressable
          style={styles.notificationButton}
          onPress={() => {
            haptics.lightTap();
            router.push('/portfolio/alerts' as any);
          }}
        >
          <Bell size={22} color={Colors.text} />
        </Pressable>
      </View>

      {/* AI Coach Card */}
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

      {/* Portfolio Value Card */}
      {holdings.length > 0 ? (
        <AnimatedScaleIn>
          <Pressable
            style={styles.valueCardWrapper}
            onPress={() => {
              haptics.lightTap();
              router.push('/(tabs)/portfolio' as any);
            }}
          >
          <LinearGradient
            colors={[Colors.primary, Colors.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.valueCard}
          >
            {/* Decorative circles */}
            <View style={styles.decorCircle1} />
            <View style={styles.decorCircle2} />

            <View style={styles.valueHeader}>
              <Text style={styles.valueLabel}>Total Portfolio Value</Text>
              <ChevronRight size={20} color="rgba(255,255,255,0.6)" />
            </View>
            <Text style={styles.valueAmount}>
              ${summary.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
            <View style={styles.changeRow}>
              <View style={[styles.changeBadge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                {isGain ? (
                  <TrendingUp size={14} color="#FFFFFF" />
                ) : (
                  <TrendingDown size={14} color="#FFFFFF" />
                )}
                <Text style={[styles.changeText, { color: '#FFFFFF' }]}>
                  {isGain ? '+' : ''}{summary.totalGainPercent.toFixed(2)}%
                </Text>
              </View>
              <Text style={styles.changeAmount}>
                {isGain ? '+' : '-'}${Math.abs(summary.totalGain).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} all time
              </Text>
            </View>
            {/* Day Change Display */}
            {dayChange && (
              <View style={styles.dayChangeRow}>
                <View style={[
                  styles.dayChangeBadge,
                  { backgroundColor: 'rgba(255,255,255,0.15)' }
                ]}>
                  {dayChange.valueChange >= 0 ? (
                    <TrendingUp size={12} color="#FFFFFF" />
                  ) : (
                    <TrendingDown size={12} color="#FFFFFF" />
                  )}
                  <Text style={[
                    styles.dayChangeText,
                    { color: '#FFFFFF' }
                  ]}>
                    {dayChange.valueChange >= 0 ? '+' : ''}${Math.abs(dayChange.valueChange).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({dayChange.percentChange >= 0 ? '+' : ''}{dayChange.percentChange.toFixed(2)}%) today
                  </Text>
                </View>
              </View>
            )}
          </LinearGradient>
          </Pressable>
        </AnimatedScaleIn>
      ) : (
        <View style={styles.emptyStateContainer}>
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconWrapper}>
              <Sparkles size={32} color={Colors.accent} />
            </View>
            <Text style={styles.emptyTitle}>Start Your Portfolio</Text>
            <Text style={styles.emptySubtitle}>
              Add your investments to track performance and get personalized AI coaching
            </Text>
            <View style={styles.emptyButtonsRow}>
              <Pressable
                style={styles.emptyButton}
                onPress={() => router.push('/portfolio/add' as any)}
              >
                <Plus size={18} color={Colors.textLight} />
                <Text style={styles.emptyButtonText}>Add Holding</Text>
              </Pressable>
              <Pressable
                style={styles.emptyButtonSecondary}
                onPress={() => router.push('/portfolio/import' as any)}
              >
                <Upload size={18} color={Colors.primary} />
                <Text style={styles.emptyButtonSecondaryText}>Bulk Import</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}

      {/* Quick Stats Grid */}
      {holdings.length > 0 && (
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={[styles.statIconWrapper, { backgroundColor: Colors.accentMuted }]}>
              <Briefcase size={18} color={Colors.accent} />
            </View>
            <Text style={styles.statValue}>{holdings.length}</Text>
            <Text style={styles.statLabel}>Holdings</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIconWrapper, { backgroundColor: Colors.purpleMuted }]}>
              <PieChart size={18} color={Colors.purple} />
            </View>
            <Text style={styles.statValue}>{allocation.length}</Text>
            <Text style={styles.statLabel}>Asset Classes</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIconWrapper, { backgroundColor: isGain ? Colors.successMuted : Colors.dangerMuted }]}>
              {isGain ? (
                <TrendingUp size={18} color={Colors.success} />
              ) : (
                <TrendingDown size={18} color={Colors.danger} />
              )}
            </View>
            <Text style={[styles.statValue, { color: isGain ? Colors.success : Colors.danger }]}>
              {isGain ? '+' : ''}{summary.totalGainPercent.toFixed(1)}%
            </Text>
            <Text style={styles.statLabel}>Return</Text>
          </View>
        </View>
      )}

      {/* Creator Hub Banner */}
      <Pressable
        style={styles.creatorBanner}
        onPress={() => router.push('/creator' as any)}
      >
        <LinearGradient
          colors={['#5B5FEF', '#8B5CF6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.creatorGradient}
        >
          <View style={styles.creatorContent}>
            <View style={styles.creatorIconBg}>
              <Star size={20} color="#FFD700" fill="#FFD700" />
            </View>
            <View style={styles.creatorText}>
              <Text style={styles.creatorTitle}>Josh's Model Portfolio</Text>
              <Text style={styles.creatorSubtitle}>View insights from @VisualFaktory</Text>
            </View>
          </View>
          <ChevronRight size={22} color="rgba(255,255,255,0.7)" />
        </LinearGradient>
      </Pressable>

      {/* Ask Before I Buy - Key Feature */}
      <Pressable
        style={styles.askBuyCard}
        onPress={() => router.push('/portfolio/ask-before-buy' as any)}
      >
        <View style={styles.askBuyIconWrapper}>
          <ShoppingCart size={22} color="#4285F4" />
        </View>
        <View style={styles.askBuyContent}>
          <View style={styles.askBuyTitleRow}>
            <Text style={styles.askBuyTitle}>Ask Before I Buy</Text>
            <View style={styles.askBuyBadge}>
              <Sparkles size={10} color="#4285F4" />
              <Text style={styles.askBuyBadgeText}>GEMINI 3</Text>
            </View>
          </View>
          <Text style={styles.askBuySubtitle}>
            Buy this or invest? AI analyzes any purchase
          </Text>
        </View>
        <ChevronRight size={20} color={Colors.textMuted} />
      </Pressable>

      {/* Top Holdings */}
      {topHoldings.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Top Holdings</Text>
            <Pressable onPress={() => router.push('/(tabs)/portfolio' as any)}>
              <Text style={styles.seeAllText}>See all</Text>
            </Pressable>
          </View>
          <View style={styles.holdingsList}>
            {topHoldings.map((holding, index) => {
              const value = holding.currentValue || holding.quantity * (holding.currentPrice || holding.purchasePrice);
              const invested = holding.quantity * holding.purchasePrice;
              const gain = value - invested;
              const gainPercent = invested > 0 ? (gain / invested) * 100 : 0;
              const holdingIsGain = gain >= 0;
              const chartData = generateMockChartData(holding.currentPrice || holding.purchasePrice, gainPercent);

              return (
                <AnimatedListItem key={holding.id} index={index}>
                  <Pressable
                    style={styles.holdingRow}
                    onPress={() => {
                      haptics.lightTap();
                      router.push(`/portfolio/${holding.id}` as any);
                    }}
                  >
                  <View style={[styles.holdingIcon, { backgroundColor: ASSET_CLASS_COLORS[holding.assetClass] + '20' }]}>
                    <Text style={[styles.holdingIconText, { color: ASSET_CLASS_COLORS[holding.assetClass] }]}>
                      {holding.symbol?.slice(0, 2).toUpperCase() || holding.name.slice(0, 2).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.holdingInfo}>
                    <Text style={styles.holdingName} numberOfLines={1}>{holding.name}</Text>
                    <Text style={styles.holdingMeta}>{holding.quantity} shares</Text>
                  </View>
                  {/* Mini Sparkline Chart */}
                  <View style={styles.holdingChartContainer}>
                    <SparklineChart
                      data={chartData}
                      width={50}
                      height={24}
                      color={holdingIsGain ? '#00D09C' : '#FF6B6B'}
                      showGradient={true}
                    />
                  </View>
                  <View style={styles.holdingValue}>
                    <Text style={styles.holdingAmount}>
                      ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Text>
                    <Text style={[styles.holdingChange, { color: holdingIsGain ? Colors.success : Colors.danger }]}>
                      {holdingIsGain ? '+' : ''}{gainPercent.toFixed(1)}%
                    </Text>
                  </View>
                  </Pressable>
                </AnimatedListItem>
              );
            })}
          </View>
        </View>
      )}

      {/* Allocation Preview */}
      {allocation.length > 0 && (
        <Pressable
          style={styles.allocationCard}
          onPress={() => router.push('/portfolio/analysis' as any)}
        >
          <View style={styles.allocationHeader}>
            <View style={styles.allocationTitleRow}>
              <View style={styles.allocationIconWrapper}>
                <PieChart size={16} color={Colors.accent} />
              </View>
              <Text style={styles.allocationTitle}>Asset Allocation</Text>
            </View>
            <ChevronRight size={18} color={Colors.textMuted} />
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
        </Pressable>
      )}

      {/* Portfolio Monitor */}
      {holdings.length > 0 && (
        <AgentActivityLog
          compact
          maxItems={3}
          onViewAll={() => router.push('/portfolio/agent-activity' as any)}
        />
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
    padding: Layout.screenPaddingHorizontal,
    paddingBottom: Spacing.xxxl,
    paddingTop: Layout.screenPaddingTop,
  },
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  greeting: {
    fontSize: FontSize.display,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    marginTop: Spacing.xxs,
  },
  notificationButton: {
    width: ComponentHeight.iconButtonLg,
    height: ComponentHeight.iconButtonLg,
    borderRadius: ComponentHeight.iconButtonLg / 2,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Value Card
  valueCardWrapper: {
    marginTop: Spacing.md,
    borderRadius: BorderRadius.xxl,
    overflow: 'hidden',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: Spacing.lg,
    elevation: 10,
  },
  valueCard: {
    padding: Spacing.xxl,
    position: 'relative',
    overflow: 'hidden',
  },
  decorCircle1: {
    position: 'absolute',
    top: -Spacing.huge,
    right: -Spacing.huge,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  decorCircle2: {
    position: 'absolute',
    bottom: -30,
    left: -30,
    width: ComponentHeight.card,
    height: ComponentHeight.card,
    borderRadius: Spacing.huge,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  valueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  valueLabel: {
    fontSize: FontSize.md,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
  },
  valueAmount: {
    fontSize: FontSize.giant,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
    letterSpacing: -1,
  },
  changeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  changeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm - 2,
    borderRadius: BorderRadius.xl,
  },
  changeText: {
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  changeAmount: {
    fontSize: FontSize.sm + 1,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '500',
  },
  dayChangeRow: {
    marginTop: Spacing.md - 2,
  },
  dayChangeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm - 2,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm - 2,
    borderRadius: BorderRadius.lg,
    alignSelf: 'flex-start',
  },
  dayChangeText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },

  // Empty Card
  emptyStateContainer: {
    marginTop: Spacing.lg,
  },
  emptyCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xxl,
    padding: Spacing.xxxl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptyIconWrapper: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.round,
    backgroundColor: Colors.accentMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    fontSize: FontSize.xxl,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.xl,
  },
  emptyButtonsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  emptyButtonText: {
    fontSize: FontSize.lg - 1,
    fontWeight: '600',
    color: Colors.textLight,
  },
  emptyButtonSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary + '15',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  emptyButtonSecondaryText: {
    fontSize: FontSize.lg - 1,
    fontWeight: '600',
    color: Colors.primary,
  },

  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    gap: Spacing.md - 2,
    marginTop: Spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md + 2,
    alignItems: 'center',
  },
  statIconWrapper: {
    width: ComponentHeight.buttonSm,
    height: ComponentHeight.buttonSm,
    borderRadius: BorderRadius.sm + 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  statValue: {
    fontSize: FontSize.xxl,
    fontWeight: '700',
    color: Colors.text,
  },
  statLabel: {
    fontSize: FontSize.xs + 1,
    color: Colors.textSecondary,
    marginTop: Spacing.xxs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Creator Banner
  creatorBanner: {
    marginTop: Spacing.lg,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  creatorGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  creatorContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  creatorIconBg: {
    width: ComponentHeight.iconButton,
    height: ComponentHeight.iconButton,
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  creatorText: {
    flex: 1,
  },
  creatorTitle: {
    fontSize: FontSize.lg - 1,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  creatorSubtitle: {
    fontSize: FontSize.sm,
    color: 'rgba(255,255,255,0.7)',
    marginTop: Spacing.xxs,
  },

  // Ask Before I Buy Card
  askBuyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(66, 133, 244, 0.08)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginTop: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(66, 133, 244, 0.25)',
  },
  askBuyIconWrapper: {
    width: ComponentHeight.iconButtonLg,
    height: ComponentHeight.iconButtonLg,
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(66, 133, 244, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  askBuyContent: {
    flex: 1,
  },
  askBuyTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xxs,
  },
  askBuyTitle: {
    fontSize: FontSize.lg - 1,
    fontWeight: '600',
    color: Colors.text,
  },
  askBuyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: 'rgba(66, 133, 244, 0.15)',
    paddingHorizontal: Spacing.sm - 2,
    paddingVertical: Spacing.xxs,
    borderRadius: BorderRadius.xs + 2,
  },
  askBuyBadgeText: {
    fontSize: FontSize.xs - 1,
    fontWeight: '700',
    color: '#4285F4',
  },
  askBuySubtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },

  // Section
  section: {
    marginTop: Spacing.xxl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSize.xl,
    fontWeight: '600',
    color: Colors.text,
  },
  seeAllText: {
    fontSize: FontSize.md,
    fontWeight: '500',
    color: Colors.accent,
  },

  // Holdings List
  holdingsList: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  holdingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md + 2,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  holdingIcon: {
    width: 42,
    height: 42,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  holdingIconText: {
    fontSize: FontSize.sm + 1,
    fontWeight: '700',
  },
  holdingInfo: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  holdingChartContainer: {
    width: 50,
    marginRight: Spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  holdingName: {
    fontSize: FontSize.lg - 1,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.xxs,
  },
  holdingMeta: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  holdingValue: {
    alignItems: 'flex-end',
  },
  holdingAmount: {
    fontSize: FontSize.lg - 1,
    fontWeight: '600',
    color: Colors.text,
  },
  holdingChange: {
    fontSize: FontSize.sm,
    fontWeight: '500',
    marginTop: Spacing.xxs,
  },

  // Allocation Card
  allocationCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    marginTop: Spacing.lg,
  },
  allocationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  allocationTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md - 2,
  },
  allocationIconWrapper: {
    width: IconSize.xl,
    height: IconSize.xl,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.accentMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  allocationTitle: {
    fontSize: FontSize.lg,
    fontWeight: '600',
    color: Colors.text,
  },
  allocationBar: {
    flexDirection: 'row',
    height: Spacing.md + 2,
    borderRadius: BorderRadius.sm - 1,
    overflow: 'hidden',
    marginBottom: Spacing.lg,
  },
  allocationSegment: {
    height: '100%',
  },
  allocationLegend: {
    gap: Spacing.md - 2,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: Spacing.md - 2,
    height: Spacing.md - 2,
    borderRadius: BorderRadius.round,
    marginRight: Spacing.md - 2,
  },
  legendLabel: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.text,
  },
  legendPercent: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
});
