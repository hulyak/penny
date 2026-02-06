import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
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
import {
  Plus,
  TrendingUp,
  TrendingDown,
  ChevronRight,
  PieChart,
  AlertCircle,
  Briefcase,
  RefreshCw,
  Wifi,
  Bell,
  BarChart3,
  CreditCard,
  DollarSign,
  Upload,
  Camera,
  Sparkles,
  Mic,
  Receipt,
  Bot,
} from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { usePurchases } from '@/context/PurchasesContext';
import Colors from '@/constants/colors';
import { Spacing, FontSize, BorderRadius, IconSize, ComponentHeight, Layout } from '@/constants/design';
import { AnimatedListItem, AnimatedScaleIn } from '@/components/AnimatedListItem';
import { PortfolioSkeleton } from '@/components/SkeletonLoader';
import haptics from '@/lib/haptics';
import {
  Holding,
  PortfolioSummary,
  ASSET_TYPE_CONFIG,
  ASSET_CLASS_COLORS,
  AssetClass,
} from '@/types';
import { batchGetPrices, hasLivePricing } from '@/lib/priceService';
import { PremiumBadge } from '@/components/PremiumBadge';
import { PerformanceChart } from '@/components/PerformanceChart';
import portfolioService from '@/lib/portfolioService';
import portfolioHistory from '@/lib/portfolioHistory';
import { SparklineChart, generateMockChartData } from '@/components/onboarding';

// Helper function to format relative time
function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

export default function PortfolioScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { isPremium, showPaywall } = usePurchases();
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isPriceLoading, setIsPriceLoading] = useState(false);
  const [lastPriceUpdate, setLastPriceUpdate] = useState<Date | null>(null);
  const [dayChange, setDayChange] = useState<{ valueChange: number; percentChange: number } | null>(null);

  // Load holdings from storage - reload every time screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadHoldings();
    }, [])
  );

  // Refresh prices when returning to screen
  useEffect(() => {
    if (holdings.length > 0 && !isLoading) {
      updatePrices();
    }
  }, [holdings.length, isLoading]);

  const loadHoldings = async () => {
    try {
      const holdings = await portfolioService.getHoldings();
      setHoldings(holdings);

      // Calculate current total value and load day change
      if (holdings.length > 0) {
        // Generate initial history for new users so chart displays immediately
        await portfolioHistory.generateInitialHistory(holdings);

        const totalValue = holdings.reduce((sum, h) => {
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
    } catch (error) {
      console.error('Failed to load holdings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updatePrices = async () => {
    if (holdings.length === 0) return;

    setIsPriceLoading(true);
    try {
      const holdingsToUpdate = holdings
        .filter((h) => hasLivePricing(h.type))
        .map((h) => ({ id: h.id, type: h.type, symbol: h.symbol }));

      if (holdingsToUpdate.length === 0) {
        setIsPriceLoading(false);
        return;
      }

      const prices = await batchGetPrices(holdingsToUpdate);

      // Build price updates
      const priceUpdates: { id: string; currentPrice: number; currentValue: number; lastPriceUpdate: string }[] = [];

      // Update holdings with new prices
      const updatedHoldings = holdings.map((h) => {
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
      setLastPriceUpdate(new Date());

      // Save updated holdings via portfolio service
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
    } finally {
      setIsPriceLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadHoldings();
    await updatePrices();
    setRefreshing(false);
  }, []);

  // Calculate portfolio summary
  const summary: PortfolioSummary = useMemo(() => {
    let totalValue = 0;
    let totalInvested = 0;
    let dayChange = 0;

    holdings.forEach((h) => {
      const currentValue = h.currentValue || h.quantity * (h.currentPrice || h.purchasePrice);
      const investedValue = h.quantity * h.purchasePrice;
      totalValue += currentValue;
      totalInvested += investedValue;
    });

    const totalGain = totalValue - totalInvested;
    const totalGainPercent = totalInvested > 0 ? (totalGain / totalInvested) * 100 : 0;

    return {
      totalValue,
      totalInvested,
      totalGain,
      totalGainPercent,
      dayChange,
      dayChangePercent: 0,
      holdingsCount: holdings.length,
    };
  }, [holdings]);

  // Calculate allocation by asset class
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

  const isGain = summary.totalGain >= 0;
  const liveHoldingsCount = holdings.filter((h) => hasLivePricing(h.type)).length;

  if (!isAuthenticated) {
    return (
      <View style={styles.emptyContainer}>
        <AlertCircle size={48} color={Colors.textMuted} />
        <Text style={styles.emptyTitle}>Sign in to view your portfolio</Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Portfolio</Text>
          </View>
          <PortfolioSkeleton />
        </View>
      </View>
    );
  }

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
        <Text style={styles.headerTitle}>Portfolio</Text>
        <View style={styles.headerButtons}>
          <Pressable
            style={styles.alertButton}
            onPress={() => router.push('/portfolio/alerts' as any)}
          >
            <Bell size={20} color={Colors.text} />
          </Pressable>
          <Pressable
            style={[styles.alertButton, styles.scanButton]}
            onPress={() => router.push('/portfolio/scan' as any)}
          >
            <Camera size={20} color="#4285F4" />
          </Pressable>
          <Pressable
            style={styles.addButton}
            onPress={() => router.push('/portfolio/add' as any)}
          >
            <Plus size={20} color={Colors.textLight} />
          </Pressable>
        </View>
      </View>

      {/* Portfolio Value Card */}
      <View style={styles.valueCardWrapper}>
        <LinearGradient
          colors={[Colors.primary, Colors.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.valueCard}
        >
          {/* Decorative elements */}
          <View style={styles.decorCircle1} />
          <View style={styles.decorCircle2} />

          <View style={styles.valueHeader}>
            <Text style={styles.valueLabel}>Total Portfolio Value</Text>
            {isPriceLoading ? (
              <ActivityIndicator size="small" color="rgba(255,255,255,0.7)" />
            ) : liveHoldingsCount > 0 ? (
              <Pressable onPress={updatePrices} style={styles.refreshButton}>
                <RefreshCw size={16} color="rgba(255,255,255,0.7)" />
              </Pressable>
            ) : null}
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
              <Text style={[styles.changePercent, { color: '#FFFFFF' }]}>
                {isGain ? '+' : ''}{summary.totalGainPercent.toFixed(2)}%
              </Text>
            </View>
            <Text style={styles.changeText}>
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
          {lastPriceUpdate && (
            <View style={styles.lastUpdate}>
              <Wifi size={12} color="rgba(255,255,255,0.5)" />
              <Text style={styles.lastUpdateText}>
                Updated {getRelativeTime(lastPriceUpdate)}
              </Text>
            </View>
          )}
          {isPriceLoading && (
            <View style={styles.updatingIndicator}>
              <ActivityIndicator size="small" color="rgba(255,255,255,0.7)" />
              <Text style={styles.updatingText}>Updating prices...</Text>
            </View>
          )}
        </LinearGradient>
      </View>

      {/* Quick Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <View style={[styles.statIconWrapper, { backgroundColor: Colors.accentMuted }]}>
            <Briefcase size={18} color={Colors.accent} />
          </View>
          <Text style={styles.statValue}>{summary.holdingsCount}</Text>
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

      {/* Live Prices Badge */}
      {liveHoldingsCount > 0 && (
        <View style={styles.liveBadge}>
          <Wifi size={14} color={Colors.success} />
          <Text style={styles.liveBadgeText}>
            {liveHoldingsCount} holding{liveHoldingsCount > 1 ? 's' : ''} with live prices
          </Text>
        </View>
      )}

      {/* Insights Card */}
      {holdings.length >= 2 && (
        <Pressable
          style={styles.insightsCard}
          onPress={() => router.push('/portfolio/analysis' as any)}
        >
          <View style={styles.insightsIcon}>
            <BarChart3 size={24} color={Colors.primary} />
          </View>
          <View style={styles.insightsContent}>
            <View style={styles.insightsTitleRow}>
              <Text style={styles.insightsTitle}>Portfolio Insights</Text>
              {!isPremium && <PremiumBadge size="small" onPress={showPaywall} />}
            </View>
            <Text style={styles.insightsSubtitle}>
              {isPremium
                ? 'Get AI-powered analysis of your diversification and risk'
                : 'Upgrade to unlock full AI analysis and recommendations'}
            </Text>
          </View>
          <ChevronRight size={20} color={Colors.textMuted} />
        </Pressable>
      )}

      {/* Performance Chart */}
      {holdings.length > 0 && <PerformanceChart />}

      {/* AI Features Row - Voice Coach, Receipt Scan, Agent */}
      <View style={styles.aiActionsRow}>
        <Pressable
          style={styles.aiActionCard}
          onPress={() => router.push('/portfolio/voice-coach' as any)}
        >
          <View style={[styles.aiActionIcon, { backgroundColor: 'rgba(66, 133, 244, 0.15)' }]}>
            <Mic size={20} color="#4285F4" />
          </View>
          <Text style={styles.aiActionTitle}>Voice Coach</Text>
          <Text style={styles.aiActionSubtitle}>Talk to Gemini 3</Text>
        </Pressable>
        <Pressable
          style={styles.aiActionCard}
          onPress={() => router.push('/portfolio/receipt-scan' as any)}
        >
          <View style={[styles.aiActionIcon, { backgroundColor: Colors.goldMuted }]}>
            <Receipt size={20} color={Colors.gold} />
          </View>
          <Text style={styles.aiActionTitle}>Scan Receipt</Text>
          <Text style={styles.aiActionSubtitle}>Track expenses</Text>
        </Pressable>
        <Pressable
          style={styles.aiActionCard}
          onPress={() => router.push('/portfolio/agent-activity' as any)}
        >
          <View style={[styles.aiActionIcon, { backgroundColor: Colors.lavenderMuted }]}>
            <Bot size={20} color={Colors.lavender} />
          </View>
          <Text style={styles.aiActionTitle}>Agent</Text>
          <Text style={styles.aiActionSubtitle}>View activity</Text>
        </Pressable>
      </View>

      {/* Quick Actions - Loans & Dividends */}
      <View style={styles.quickActionsRow}>
        <Pressable
          style={styles.quickActionCard}
          onPress={() => router.push('/portfolio/loans' as any)}
        >
          <View style={[styles.quickActionIcon, { backgroundColor: Colors.warningMuted }]}>
            <CreditCard size={20} color={Colors.warning} />
          </View>
          <Text style={styles.quickActionTitle}>Loans</Text>
          <Text style={styles.quickActionSubtitle}>Track amortization</Text>
        </Pressable>
        <Pressable
          style={styles.quickActionCard}
          onPress={() => router.push('/portfolio/dividends' as any)}
        >
          <View style={[styles.quickActionIcon, { backgroundColor: Colors.successMuted }]}>
            <DollarSign size={20} color={Colors.success} />
          </View>
          <Text style={styles.quickActionTitle}>Dividends</Text>
          <Text style={styles.quickActionSubtitle}>Track income</Text>
        </Pressable>
      </View>

      {/* Allocation Section */}
      {allocation.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Allocation</Text>
          <View style={styles.allocationCard}>
            {/* Simple bar chart */}
            <View style={styles.allocationBar}>
              {allocation.map((item, index) => (
                <View
                  key={item.assetClass}
                  style={[
                    styles.allocationSegment,
                    {
                      backgroundColor: item.color,
                      width: `${item.percent}%`,
                      borderTopLeftRadius: index === 0 ? 6 : 0,
                      borderBottomLeftRadius: index === 0 ? 6 : 0,
                      borderTopRightRadius: index === allocation.length - 1 ? 6 : 0,
                      borderBottomRightRadius: index === allocation.length - 1 ? 6 : 0,
                    },
                  ]}
                />
              ))}
            </View>
            {/* Legend */}
            <View style={styles.allocationLegend}>
              {allocation.map((item) => (
                <View key={item.assetClass} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                  <Text style={styles.legendLabel}>
                    {item.assetClass.charAt(0).toUpperCase() + item.assetClass.slice(1).replace('_', ' ')}
                  </Text>
                  <Text style={styles.legendPercent}>{item.percent.toFixed(1)}%</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      )}

      {/* Holdings Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Holdings</Text>
          {holdings.length > 0 && (
            <Pressable onPress={() => router.push('/portfolio/add' as any)}>
              <Text style={styles.addText}>+ Add</Text>
            </Pressable>
          )}
        </View>

        {holdings.length === 0 ? (
          <View style={styles.emptyStateContainer}>
            {/* Gemini 3 Multimodal Scan - HIGHLIGHT FOR HACKATHON */}
            <Pressable
              style={styles.scanCard}
              onPress={() => router.push('/portfolio/scan' as any)}
            >
              <View style={styles.scanCardBadge}>
                <Sparkles size={12} color="#4285F4" />
                <Text style={styles.scanCardBadgeText}>Gemini 3 Vision</Text>
              </View>
              <View style={styles.scanCardIcon}>
                <Camera size={32} color="#4285F4" />
              </View>
              <Text style={styles.scanCardTitle}>Scan Your Statement</Text>
              <Text style={styles.scanCardSubtitle}>
                Point your camera at any brokerage statement - AI extracts holdings instantly
              </Text>
              <View style={styles.scanCardFeatures}>
                <Text style={styles.scanCardFeature}>• Multimodal document analysis</Text>
                <Text style={styles.scanCardFeature}>• High thinking level reasoning</Text>
                <Text style={styles.scanCardFeature}>• Auto-import to portfolio</Text>
              </View>
            </Pressable>

            <Pressable
              style={styles.emptyCard}
              onPress={() => router.push('/portfolio/add' as any)}
            >
              <Plus size={32} color={Colors.accent} />
              <Text style={styles.emptyCardTitle}>Add Manually</Text>
              <Text style={styles.emptyCardSubtitle}>
                Enter holdings one by one
              </Text>
            </Pressable>
            <Pressable
              style={styles.importCard}
              onPress={() => router.push('/portfolio/import' as any)}
            >
              <Upload size={24} color={Colors.primary} />
              <View style={styles.importCardContent}>
                <Text style={styles.importCardTitle}>Import CSV</Text>
                <Text style={styles.importCardSubtitle}>
                  Bulk import from spreadsheet
                </Text>
              </View>
              <ChevronRight size={18} color={Colors.textMuted} />
            </Pressable>
          </View>
        ) : (
          holdings.map((holding) => (
            <HoldingCard
              key={holding.id}
              holding={holding}
              onPress={() => router.push(`/portfolio/${holding.id}` as any)}
            />
          ))
        )}
      </View>
    </ScrollView>
  );
}

function HoldingCard({ holding, onPress }: { holding: Holding; onPress: () => void }) {
  const currentValue = holding.currentValue || holding.quantity * (holding.currentPrice || holding.purchasePrice);
  const investedValue = holding.quantity * holding.purchasePrice;
  const gain = currentValue - investedValue;
  const gainPercent = investedValue > 0 ? (gain / investedValue) * 100 : 0;
  const isGain = gain >= 0;
  const hasLive = hasLivePricing(holding.type);
  const chartData = generateMockChartData(holding.currentPrice || holding.purchasePrice, gainPercent);

  const config = ASSET_TYPE_CONFIG[holding.type];

  return (
    <Pressable style={styles.holdingCard} onPress={onPress}>
      <View style={[styles.holdingIcon, { backgroundColor: ASSET_CLASS_COLORS[holding.assetClass] + '20' }]}>
        <Text style={styles.holdingIconText}>
          {holding.symbol?.slice(0, 2).toUpperCase() || holding.name.slice(0, 2).toUpperCase()}
        </Text>
      </View>
      <View style={styles.holdingInfo}>
        <View style={styles.holdingNameRow}>
          <Text style={styles.holdingName} numberOfLines={1}>{holding.name}</Text>
          {hasLive && holding.lastPriceUpdate && (
            <Wifi size={12} color={Colors.success} style={{ marginLeft: 4 }} />
          )}
        </View>
        <Text style={styles.holdingMeta}>
          {holding.quantity} {holding.type === 'mutual_fund' ? 'units' : 'shares'} · {config.label}
        </Text>
      </View>
      {/* Mini Sparkline Chart */}
      <View style={styles.holdingChart}>
        <SparklineChart
          data={chartData}
          width={50}
          height={24}
          color={isGain ? '#00D09C' : '#FF6B6B'}
          showGradient={true}
        />
      </View>
      <View style={styles.holdingValue}>
        <Text style={styles.holdingAmount}>
          ${currentValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </Text>
        <Text style={[styles.holdingChange, { color: isGain ? Colors.success : Colors.danger }]}>
          {isGain ? '+' : ''}{gainPercent.toFixed(2)}%
        </Text>
      </View>
      <ChevronRight size={18} color={Colors.textMuted} />
    </Pressable>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  headerTitle: {
    fontSize: FontSize.display,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.5,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  alertButton: {
    width: 42,
    height: 42,
    borderRadius: BorderRadius.round,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanButton: {
    backgroundColor: 'rgba(66, 133, 244, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(66, 133, 244, 0.3)',
  },
  addButton: {
    width: 42,
    height: 42,
    borderRadius: BorderRadius.round,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Value Card
  valueCardWrapper: {
    borderRadius: BorderRadius.xxl,
    overflow: 'hidden',
    marginBottom: Spacing.lg,
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
  refreshButton: {
    padding: Spacing.sm,
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
  changePercent: {
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  changeText: {
    fontSize: FontSize.sm + 1,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.6)',
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
  lastUpdate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.md,
  },
  lastUpdateText: {
    fontSize: FontSize.xs + 1,
    color: 'rgba(255,255,255,0.5)',
  },
  updatingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm - 2,
    marginTop: Spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm - 2,
    borderRadius: BorderRadius.md,
    alignSelf: 'flex-start',
  },
  updatingText: {
    fontSize: FontSize.sm,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
  },

  // Stats Row
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.md - 2,
    marginBottom: Spacing.lg,
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

  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm - 2,
    backgroundColor: Colors.successMuted,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.lg,
  },
  liveBadgeText: {
    fontSize: FontSize.sm,
    color: Colors.success,
    fontWeight: '500',
  },

  // Insights Card
  insightsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.accentMuted,
  },
  insightsIcon: {
    width: ComponentHeight.iconButtonLg,
    height: ComponentHeight.iconButtonLg,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.accentMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  insightsContent: {
    flex: 1,
  },
  insightsTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xxs,
  },
  insightsTitle: {
    fontSize: FontSize.lg - 1,
    fontWeight: '600',
    color: Colors.text,
  },
  insightsSubtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },

  // AI Actions Row (Voice, Receipt, Agent)
  aiActionsRow: {
    flexDirection: 'row',
    gap: Spacing.md - 2,
    marginBottom: Spacing.md,
  },
  aiActionCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md + 2,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(66, 133, 244, 0.1)',
  },
  aiActionIcon: {
    width: ComponentHeight.buttonSm,
    height: ComponentHeight.buttonSm,
    borderRadius: BorderRadius.sm + 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm - 2,
  },
  aiActionTitle: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.text,
  },
  aiActionSubtitle: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: Spacing.xxs,
  },

  // Quick Actions Row
  quickActionsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  quickActionCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md + 2,
    padding: Spacing.md + 2,
    alignItems: 'center',
  },
  quickActionIcon: {
    width: ComponentHeight.iconButton,
    height: ComponentHeight.iconButton,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  quickActionTitle: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.text,
  },
  quickActionSubtitle: {
    fontSize: FontSize.xs + 1,
    color: Colors.textSecondary,
    marginTop: Spacing.xxs,
  },

  // Section
  section: {
    marginBottom: Spacing.xxl,
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
  addText: {
    fontSize: FontSize.md,
    color: Colors.accent,
    fontWeight: '600',
  },

  // Allocation Card
  allocationCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
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

  // Empty State
  emptyStateContainer: {
    gap: Spacing.md,
  },
  // Gemini 3 Scan Card - Prominent for Hackathon
  scanCard: {
    backgroundColor: 'rgba(66, 133, 244, 0.08)',
    borderRadius: BorderRadius.xl,
    padding: Spacing.xxl,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(66, 133, 244, 0.3)',
    marginBottom: Spacing.xs,
  },
  scanCardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: 'rgba(66, 133, 244, 0.15)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
  },
  scanCardBadgeText: {
    fontSize: FontSize.xs + 1,
    fontWeight: '700',
    color: '#4285F4',
  },
  scanCardIcon: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.round,
    backgroundColor: 'rgba(66, 133, 244, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  scanCardTitle: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  scanCardSubtitle: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  scanCardFeatures: {
    alignSelf: 'flex-start',
    gap: Spacing.xs,
  },
  scanCardFeature: {
    fontSize: FontSize.sm,
    color: '#4285F4',
    fontWeight: '500',
  },
  emptyCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xxxl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptyCardTitle: {
    fontSize: FontSize.lg + 1,
    fontWeight: '600',
    color: Colors.text,
    marginTop: Spacing.lg,
  },
  emptyCardSubtitle: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.xs,
    lineHeight: 20,
  },
  importCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md + 2,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
    gap: Spacing.md,
  },
  importCardContent: {
    flex: 1,
  },
  importCardTitle: {
    fontSize: FontSize.lg - 1,
    fontWeight: '600',
    color: Colors.text,
  },
  importCardSubtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.xxs,
  },

  // Holding Card
  holdingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md + 2,
    padding: Spacing.md + 2,
    marginBottom: Spacing.md - 2,
  },
  holdingIcon: {
    width: ComponentHeight.iconButtonLg,
    height: ComponentHeight.iconButtonLg,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  holdingIconText: {
    fontSize: FontSize.sm + 1,
    fontWeight: '700',
    color: Colors.text,
  },
  holdingInfo: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  holdingChart: {
    width: 50,
    marginRight: Spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  holdingNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  holdingName: {
    fontSize: FontSize.lg - 1,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.xxs,
    flex: 1,
  },
  holdingMeta: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  holdingValue: {
    alignItems: 'flex-end',
    marginRight: Spacing.sm,
  },
  holdingAmount: {
    fontSize: FontSize.lg - 1,
    fontWeight: '600',
    color: Colors.text,
  },
  holdingChange: {
    fontSize: FontSize.sm,
    fontWeight: '500',
  },

  // Empty Container
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: Spacing.xxxl,
  },
  emptyTitle: {
    fontSize: FontSize.xl,
    fontWeight: '600',
    color: Colors.text,
    marginTop: Spacing.lg,
    textAlign: 'center',
  },
});
