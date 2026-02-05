import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
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
import { LinearGradient } from 'expo-linear-gradient';
import {
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Plus,
  PieChart,
  Bell,
  BarChart3,
  Star,
  Briefcase,
  Sparkles,
  Upload,
} from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { PortfolioCoachCard } from '@/components/PortfolioCoachCard';
import { CelebrationModal, type CelebrationData } from '@/components/CelebrationModal';
import { MarketOverview } from '@/components/MarketOverview';
import { PerformanceChart } from '@/components/PerformanceChart';
import Colors from '@/constants/colors';
import { MASCOT_IMAGE_URL } from '@/constants/images';
import { Holding, ASSET_CLASS_COLORS, AssetClass } from '@/types';
import { hasLivePricing, batchGetPrices } from '@/lib/priceService';
import portfolioService from '@/lib/portfolioService';
import portfolioHistory from '@/lib/portfolioHistory';
import { SparklineChart, generateMockChartData } from '@/components/onboarding';

export default function HomeScreen() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();

  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [celebration, setCelebration] = useState<CelebrationData | null>(null);
  const [dayChange, setDayChange] = useState<{ valueChange: number; percentChange: number } | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/auth' as any);
    }
  }, [authLoading, isAuthenticated]);

  // Reload holdings every time screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated) {
        loadHoldings();
      }
    }, [isAuthenticated])
  );

  const loadHoldings = async () => {
    try {
      const loadedHoldings = await portfolioService.getHoldings();
      setHoldings(loadedHoldings);

      // Calculate current total value and load day change
      if (loadedHoldings.length > 0) {
        // Generate initial history for new users so chart displays immediately
        await portfolioHistory.generateInitialHistory(loadedHoldings);

        const totalValue = loadedHoldings.reduce((sum, h) => {
          const value = h.currentValue || h.quantity * (h.currentPrice || h.purchasePrice);
          return sum + value;
        }, 0);
        const dayChangeData = await portfolioHistory.calculateDayChange(totalValue);
        if (dayChangeData) {
          setDayChange({
            valueChange: dayChangeData.valueChange,
            percentChange: dayChangeData.percentChange,
          });
        }
      }

      // Update prices for live holdings
      if (loadedHoldings.length > 0) {
        await updatePrices(loadedHoldings);
      }
    } catch (error) {
      console.error('Failed to load holdings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updatePrices = async (currentHoldings: Holding[]) => {
    if (currentHoldings.length === 0) return;

    try {
      const holdingsToUpdate = currentHoldings
        .filter((h) => hasLivePricing(h.type))
        .map((h) => ({ id: h.id, type: h.type, symbol: h.symbol }));

      if (holdingsToUpdate.length === 0) return;

      const prices = await batchGetPrices(holdingsToUpdate);

      const priceUpdates: { id: string; currentPrice: number; currentValue: number; lastPriceUpdate: string }[] = [];

      const updatedHoldings = currentHoldings.map((h) => {
        const priceData = prices[h.id];
        if (priceData) {
          priceUpdates.push({
            id: h.id,
            currentPrice: priceData.price,
            currentValue: h.quantity * priceData.price,
            lastPriceUpdate: priceData.timestamp,
          });
          return {
            ...h,
            currentPrice: priceData.price,
            currentValue: h.quantity * priceData.price,
            lastPriceUpdate: priceData.timestamp,
          };
        }
        return h;
      });

      setHoldings(updatedHoldings);
      await portfolioService.updateHoldingPrices(priceUpdates);

      // Save portfolio snapshot for performance tracking
      await portfolioHistory.saveSnapshot(updatedHoldings);

      // Calculate and set day change
      const totalValue = updatedHoldings.reduce((sum, h) => {
        const value = h.currentValue || h.quantity * (h.currentPrice || h.purchasePrice);
        return sum + value;
      }, 0);
      const dayChangeData = await portfolioHistory.calculateDayChange(totalValue);
      if (dayChangeData) {
        setDayChange({
          valueChange: dayChangeData.valueChange,
          percentChange: dayChangeData.percentChange,
        });
      }
    } catch (error) {
      console.error('Failed to update prices:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadHoldings();
    setRefreshing(false);
  };

  // Calculate portfolio summary
  const summary = useMemo(() => {
    let totalValue = 0;
    let totalInvested = 0;

    holdings.forEach((h) => {
      const currentValue = h.currentValue || h.quantity * (h.currentPrice || h.purchasePrice);
      const investedValue = h.quantity * h.purchasePrice;
      totalValue += currentValue;
      totalInvested += investedValue;
    });

    const totalGain = totalValue - totalInvested;
    const totalGainPercent = totalInvested > 0 ? (totalGain / totalInvested) * 100 : 0;

    return { totalValue, totalInvested, totalGain, totalGainPercent };
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
      <View style={styles.loadingContainer}>
        <Image source={{ uri: MASCOT_IMAGE_URL }} style={styles.loadingMascot} />
        <Text style={styles.loadingText}>Loading your portfolio...</Text>
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
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />
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
          onPress={() => router.push('/portfolio/alerts' as any)}
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

      {/* Market Overview - Live prices for indices, gold, crypto */}
      <MarketOverview />

      {/* Portfolio Value Card */}
      {holdings.length > 0 ? (
        <Pressable
          style={styles.valueCardWrapper}
          onPress={() => router.push('/(tabs)/portfolio' as any)}
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
              <View style={[styles.changeBadge, { backgroundColor: isGain ? 'rgba(0,208,156,0.2)' : 'rgba(255,107,107,0.2)' }]}>
                {isGain ? (
                  <TrendingUp size={14} color={Colors.success} />
                ) : (
                  <TrendingDown size={14} color={Colors.danger} />
                )}
                <Text style={[styles.changeText, { color: isGain ? '#4ADE80' : '#FF8A8A' }]}>
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
                  { backgroundColor: dayChange.valueChange >= 0 ? 'rgba(0,208,156,0.15)' : 'rgba(255,107,107,0.15)' }
                ]}>
                  {dayChange.valueChange >= 0 ? (
                    <TrendingUp size={12} color="#4ADE80" />
                  ) : (
                    <TrendingDown size={12} color="#FF8A8A" />
                  )}
                  <Text style={[
                    styles.dayChangeText,
                    { color: dayChange.valueChange >= 0 ? '#4ADE80' : '#FF8A8A' }
                  ]}>
                    {dayChange.valueChange >= 0 ? '+' : ''}${Math.abs(dayChange.valueChange).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({dayChange.percentChange >= 0 ? '+' : ''}{dayChange.percentChange.toFixed(2)}%) today
                  </Text>
                </View>
              </View>
            )}
          </LinearGradient>
        </Pressable>
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

      {/* Performance Chart */}
      {holdings.length > 0 && <PerformanceChart />}

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
            {topHoldings.map((holding) => {
              const value = holding.currentValue || holding.quantity * (holding.currentPrice || holding.purchasePrice);
              const invested = holding.quantity * holding.purchasePrice;
              const gain = value - invested;
              const gainPercent = invested > 0 ? (gain / invested) * 100 : 0;
              const holdingIsGain = gain >= 0;
              const chartData = generateMockChartData(holding.currentPrice || holding.purchasePrice, gainPercent);

              return (
                <Pressable
                  key={holding.id}
                  style={styles.holdingRow}
                  onPress={() => router.push(`/portfolio/${holding.id}` as any)}
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

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <Pressable
          style={styles.quickAction}
          onPress={() => router.push('/portfolio/add' as any)}
        >
          <View style={[styles.quickIconWrapper, { backgroundColor: Colors.accentMuted }]}>
            <Plus size={22} color={Colors.accent} />
          </View>
          <Text style={styles.quickLabel}>Add</Text>
        </Pressable>

        <Pressable
          style={styles.quickAction}
          onPress={() => router.push('/portfolio/import' as any)}
        >
          <View style={[styles.quickIconWrapper, { backgroundColor: Colors.primaryMuted }]}>
            <Upload size={22} color={Colors.primary} />
          </View>
          <Text style={styles.quickLabel}>Import</Text>
        </Pressable>

        <Pressable
          style={styles.quickAction}
          onPress={() => router.push('/portfolio/ai-insights' as any)}
        >
          <View style={[styles.quickIconWrapper, { backgroundColor: Colors.purpleMuted }]}>
            <Sparkles size={22} color={Colors.purple} />
          </View>
          <Text style={styles.quickLabel}>AI Coach</Text>
        </Pressable>

        <Pressable
          style={styles.quickAction}
          onPress={() => router.push('/portfolio/alerts' as any)}
        >
          <View style={[styles.quickIconWrapper, { backgroundColor: Colors.warningMuted }]}>
            <Bell size={22} color={Colors.warning} />
          </View>
          <Text style={styles.quickLabel}>Alerts</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
    paddingTop: 56,
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

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  greeting: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Value Card
  valueCardWrapper: {
    marginTop: 12,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  valueCard: {
    padding: 24,
    position: 'relative',
    overflow: 'hidden',
  },
  decorCircle1: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  decorCircle2: {
    position: 'absolute',
    bottom: -30,
    left: -30,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  valueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  valueLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
  },
  valueAmount: {
    fontSize: 40,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 8,
    marginBottom: 12,
    letterSpacing: -1,
  },
  changeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  changeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  changeText: {
    fontSize: 14,
    fontWeight: '700',
  },
  changeAmount: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '500',
  },
  dayChangeRow: {
    marginTop: 10,
  },
  dayChangeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  dayChangeText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Empty Card
  emptyStateContainer: {
    marginTop: 16,
  },
  emptyCard: {
    backgroundColor: Colors.surface,
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptyIconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.accentMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  emptyButtonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textLight,
  },
  emptyButtonSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.primary + '15',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  emptyButtonSecondaryText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.primary,
  },

  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
  },
  statIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Creator Banner
  creatorBanner: {
    marginTop: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  creatorGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  creatorContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  creatorIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  creatorText: {
    flex: 1,
  },
  creatorTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  creatorSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },

  // Section
  section: {
    marginTop: 24,
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
  seeAllText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.accent,
  },

  // Holdings List
  holdingsList: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
  },
  holdingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  holdingIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  holdingIconText: {
    fontSize: 13,
    fontWeight: '700',
  },
  holdingInfo: {
    flex: 1,
    marginRight: 8,
  },
  holdingChartContainer: {
    width: 50,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  holdingName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  holdingMeta: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  holdingValue: {
    alignItems: 'flex-end',
  },
  holdingAmount: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  holdingChange: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },

  // Allocation Card
  allocationCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 20,
    marginTop: 16,
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
    gap: 10,
  },
  allocationIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.accentMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  allocationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  allocationBar: {
    flexDirection: 'row',
    height: 14,
    borderRadius: 7,
    overflow: 'hidden',
    marginBottom: 16,
  },
  allocationSegment: {
    height: '100%',
  },
  allocationLegend: {
    gap: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  legendLabel: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
  },
  legendPercent: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },

  // Quick Actions
  quickActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 24,
  },
  quickAction: {
    flex: 1,
    backgroundColor: Colors.surface,
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderRadius: 16,
    alignItems: 'center',
  },
  quickIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text,
  },
});
