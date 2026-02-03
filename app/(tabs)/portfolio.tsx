import React, { useState, useCallback, useMemo, useEffect } from 'react';
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
} from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import Colors from '@/constants/colors';
import {
  Holding,
  PortfolioSummary,
  ASSET_TYPE_CONFIG,
  ASSET_CLASS_COLORS,
  AssetClass,
} from '@/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { batchGetPrices, hasLivePricing } from '@/lib/priceService';

const STORAGE_KEY = 'penny_portfolio_holdings';

export default function PortfolioScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isPriceLoading, setIsPriceLoading] = useState(false);
  const [lastPriceUpdate, setLastPriceUpdate] = useState<Date | null>(null);

  // Load holdings from storage
  useEffect(() => {
    loadHoldings();
  }, []);

  // Refresh prices when returning to screen
  useEffect(() => {
    if (holdings.length > 0 && !isLoading) {
      updatePrices();
    }
  }, [holdings.length, isLoading]);

  const loadHoldings = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        setHoldings(JSON.parse(stored));
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

      // Update holdings with new prices
      const updatedHoldings = holdings.map((h) => {
        const priceData = prices[h.id];
        if (priceData) {
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

      // Save updated holdings
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedHoldings));
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
            style={styles.addButton}
            onPress={() => router.push('/portfolio/add' as any)}
          >
            <Plus size={20} color={Colors.textLight} />
          </Pressable>
        </View>
      </View>

      {/* Portfolio Value Card */}
      <View style={styles.valueCard}>
        <View style={styles.valueHeader}>
          <Text style={styles.valueLabel}>Total Portfolio Value</Text>
          {isPriceLoading ? (
            <ActivityIndicator size="small" color={Colors.textLight} />
          ) : liveHoldingsCount > 0 ? (
            <Pressable onPress={updatePrices} style={styles.refreshButton}>
              <RefreshCw size={16} color={Colors.textLight} />
            </Pressable>
          ) : null}
        </View>
        <Text style={styles.valueAmount}>
          ${summary.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </Text>
        <View style={styles.changeRow}>
          {isGain ? (
            <TrendingUp size={16} color={Colors.success} />
          ) : (
            <TrendingDown size={16} color={Colors.danger} />
          )}
          <Text style={[styles.changeText, { color: isGain ? Colors.success : Colors.danger }]}>
            {isGain ? '+' : ''}${summary.totalGain.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            {' '}({isGain ? '+' : ''}{summary.totalGainPercent.toFixed(2)}%)
          </Text>
          <Text style={styles.changeLabel}>All time</Text>
        </View>
        {lastPriceUpdate && (
          <View style={styles.lastUpdate}>
            <Wifi size={12} color={Colors.textLight} style={{ opacity: 0.6 }} />
            <Text style={styles.lastUpdateText}>
              Updated {lastPriceUpdate.toLocaleTimeString()}
            </Text>
          </View>
        )}
      </View>

      {/* Quick Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Briefcase size={20} color={Colors.accent} />
          <Text style={styles.statValue}>{summary.holdingsCount}</Text>
          <Text style={styles.statLabel}>Holdings</Text>
        </View>
        <View style={styles.statCard}>
          <PieChart size={20} color={Colors.lavender} />
          <Text style={styles.statValue}>{allocation.length}</Text>
          <Text style={styles.statLabel}>Asset Classes</Text>
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
            <Text style={styles.insightsTitle}>Portfolio Insights</Text>
            <Text style={styles.insightsSubtitle}>
              Get AI-powered analysis of your diversification and risk
            </Text>
          </View>
          <ChevronRight size={20} color={Colors.textMuted} />
        </Pressable>
      )}

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
          <Pressable
            style={styles.emptyCard}
            onPress={() => router.push('/portfolio/add' as any)}
          >
            <Plus size={32} color={Colors.accent} />
            <Text style={styles.emptyCardTitle}>Add your first investment</Text>
            <Text style={styles.emptyCardSubtitle}>
              Track stocks, ETFs, mutual funds, gold, real estate and more
            </Text>
          </Pressable>
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
    paddingTop: 60,
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
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  alertButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },

  valueCard: {
    backgroundColor: Colors.primary,
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
  },
  valueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  valueLabel: {
    fontSize: 14,
    color: Colors.textLight,
    opacity: 0.8,
    marginBottom: 4,
  },
  refreshButton: {
    padding: 8,
    opacity: 0.8,
  },
  valueAmount: {
    fontSize: 36,
    fontWeight: '700',
    color: Colors.textLight,
    marginBottom: 8,
  },
  changeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  changeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  changeLabel: {
    fontSize: 12,
    color: Colors.textLight,
    opacity: 0.7,
  },
  lastUpdate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 12,
  },
  lastUpdateText: {
    fontSize: 11,
    color: Colors.textLight,
    opacity: 0.6,
  },

  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
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

  insightsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: Colors.primaryLight + '30',
  },
  insightsIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.primaryLight + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  insightsContent: {
    flex: 1,
  },
  insightsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  insightsSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
  },

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

  allocationCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  allocationBar: {
    flexDirection: 'row',
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 16,
  },
  allocationSegment: {
    height: '100%',
  },
  allocationLegend: {
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
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

  emptyCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: 'dashed',
  },
  emptyCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 12,
  },
  emptyCardSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },

  holdingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
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
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  holdingInfo: {
    flex: 1,
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
