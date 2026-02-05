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
  Star,
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
            <View style={[styles.changeBadge, { backgroundColor: isGain ? 'rgba(0,208,156,0.2)' : 'rgba(255,107,107,0.2)' }]}>
              {isGain ? (
                <TrendingUp size={14} color="#4ADE80" />
              ) : (
                <TrendingDown size={14} color="#FF8A8A" />
              )}
              <Text style={[styles.changePercent, { color: isGain ? '#4ADE80' : '#FF8A8A' }]}>
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

      {/* Creator Hub Card - Josh's Model Portfolio */}
      <Pressable
        style={styles.creatorCardWrapper}
        onPress={() => router.push('/creator' as any)}
      >
        <LinearGradient
          colors={['#5B5FEF', '#8B5CF6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.creatorCard}
        >
          <View style={styles.creatorIconWrapper}>
            <Star size={20} color="#FFD700" fill="#FFD700" />
          </View>
          <View style={styles.creatorContent}>
            <View style={styles.creatorTitleRow}>
              <Text style={styles.creatorTitle}>Josh's Model Portfolio</Text>
              <View style={styles.creatorBadge}>
                <Text style={styles.creatorBadgeText}>NEW</Text>
              </View>
            </View>
            <Text style={styles.creatorSubtitle}>
              View allocations, market insights & Q&A from @VisualFaktory
            </Text>
          </View>
          <ChevronRight size={20} color="rgba(255,255,255,0.6)" />
        </LinearGradient>
      </Pressable>

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
    padding: 16,
    paddingBottom: 32,
    paddingTop: 56,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.5,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  alertButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
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
    borderRadius: 21,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Value Card
  valueCardWrapper: {
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 16,
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
  refreshButton: {
    padding: 8,
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
  changePercent: {
    fontSize: 14,
    fontWeight: '700',
  },
  changeText: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.6)',
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
  lastUpdate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 12,
  },
  lastUpdateText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
  },
  updatingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  updatingText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
  },

  // Stats Row
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
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

  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.successMuted,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginBottom: 16,
  },
  liveBadgeText: {
    fontSize: 12,
    color: Colors.success,
    fontWeight: '500',
  },

  // Creator Card
  creatorCardWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
  },
  creatorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  creatorIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  creatorContent: {
    flex: 1,
  },
  creatorTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  creatorTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  creatorBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  creatorBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  creatorSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },
  // Insights Card
  insightsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.accentMuted,
  },
  insightsIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.accentMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  insightsContent: {
    flex: 1,
  },
  insightsTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  insightsTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  insightsSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
  },

  // AI Actions Row (Voice, Receipt, Agent)
  aiActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  aiActionCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(66, 133, 244, 0.1)',
  },
  aiActionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  aiActionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text,
  },
  aiActionSubtitle: {
    fontSize: 10,
    color: Colors.textSecondary,
    marginTop: 2,
  },

  // Quick Actions Row
  quickActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  quickActionCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
  },
  quickActionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  quickActionSubtitle: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },

  // Section
  section: {
    marginBottom: 24,
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
  addText: {
    fontSize: 14,
    color: Colors.accent,
    fontWeight: '600',
  },

  // Allocation Card
  allocationCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
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

  // Empty State
  emptyStateContainer: {
    gap: 12,
  },
  // Gemini 3 Scan Card - Prominent for Hackathon
  scanCard: {
    backgroundColor: 'rgba(66, 133, 244, 0.08)',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(66, 133, 244, 0.3)',
    marginBottom: 4,
  },
  scanCardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(66, 133, 244, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 16,
  },
  scanCardBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4285F4',
  },
  scanCardIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(66, 133, 244, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  scanCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
  },
  scanCardSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  scanCardFeatures: {
    alignSelf: 'flex-start',
    gap: 4,
  },
  scanCardFeature: {
    fontSize: 12,
    color: '#4285F4',
    fontWeight: '500',
  },
  emptyCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptyCardTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 16,
  },
  emptyCardSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 20,
  },
  importCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
    gap: 12,
  },
  importCardContent: {
    flex: 1,
  },
  importCardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  importCardSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },

  // Holding Card
  holdingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  holdingIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  holdingIconText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
  },
  holdingInfo: {
    flex: 1,
    marginRight: 8,
  },
  holdingChart: {
    width: 50,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  holdingNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  holdingName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
    flex: 1,
  },
  holdingMeta: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  holdingValue: {
    alignItems: 'flex-end',
    marginRight: 8,
  },
  holdingAmount: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  holdingChange: {
    fontSize: 12,
    fontWeight: '500',
  },

  // Empty Container
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 16,
    textAlign: 'center',
  },
});
