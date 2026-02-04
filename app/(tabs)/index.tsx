import React, { useState, useEffect, useMemo } from 'react';
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
  PieChart,
  Bell,
  BarChart3,
} from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { PortfolioCoachCard } from '@/components/PortfolioCoachCard';
import { CelebrationModal, type CelebrationData } from '@/components/CelebrationModal';
import Colors from '@/constants/colors';
import { MASCOT_IMAGE_URL } from '@/constants/images';
import { Holding, ASSET_CLASS_COLORS, AssetClass } from '@/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { hasLivePricing, batchGetPrices } from '@/lib/priceService';

const STORAGE_KEY = 'penny_portfolio_holdings';

export default function HomeScreen() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();

  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [celebration, setCelebration] = useState<CelebrationData | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/auth' as any);
    }
  }, [authLoading, isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      loadHoldings();
    }
  }, [isAuthenticated]);

  const loadHoldings = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const loadedHoldings = JSON.parse(stored);
        setHoldings(loadedHoldings);

        // Update prices for live holdings
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

      const updatedHoldings = currentHoldings.map((h) => {
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
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedHoldings));
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

  if (isLoading || authLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Image source={{ uri: MASCOT_IMAGE_URL }} style={styles.loadingMascot} />
        <Text style={styles.loadingText}>Loading your portfolio...</Text>
      </View>
    );
  }

  const isGain = summary.totalGain >= 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />
      }
    >
      {/* AI Coach Card */}
      <PortfolioCoachCard
        holdings={holdings}
        totalValue={summary.totalValue}
        totalGain={summary.totalGain}
        totalGainPercent={summary.totalGainPercent}
        userName={user?.displayName?.split(' ')[0]}
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
        <Pressable
          style={styles.valueCard}
          onPress={() => router.push('/(tabs)/portfolio' as any)}
        >
          <View style={styles.valueHeader}>
            <Text style={styles.valueLabel}>Portfolio Value</Text>
            <View style={styles.headerButtons}>
              <Pressable
                style={styles.iconButton}
                onPress={() => router.push('/portfolio/alerts' as any)}
              >
                <Bell size={18} color={Colors.textLight} />
              </Pressable>
            </View>
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
              {isGain ? '+' : ''}${Math.abs(summary.totalGain).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              {' '}({isGain ? '+' : ''}{summary.totalGainPercent.toFixed(2)}%)
            </Text>
            <Text style={styles.changeLabel}>All time</Text>
          </View>
        </Pressable>
      ) : (
        <Pressable
          style={styles.emptyCard}
          onPress={() => router.push('/portfolio/add' as any)}
        >
          <Plus size={32} color={Colors.accent} />
          <Text style={styles.emptyTitle}>Start Your Portfolio</Text>
          <Text style={styles.emptySubtitle}>
            Add your investments to track performance and get personalized AI coaching
          </Text>
        </Pressable>
      )}

      {/* Quick Stats */}
      {holdings.length > 0 && (
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{holdings.length}</Text>
            <Text style={styles.statLabel}>Holdings</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{allocation.length}</Text>
            <Text style={styles.statLabel}>Asset Classes</Text>
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
              <PieChart size={18} color={Colors.accent} />
              <Text style={styles.allocationTitle}>Allocation</Text>
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
          <View style={styles.allocationLegend}>
            {allocation.slice(0, 3).map((item) => (
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
          <Text style={styles.quickLabel}>Add Holding</Text>
        </Pressable>

        <Pressable
          style={styles.quickAction}
          onPress={() => router.push('/portfolio/analysis' as any)}
        >
          <View style={[styles.quickIconWrapper, { backgroundColor: Colors.lavenderMuted }]}>
            <BarChart3 size={22} color={Colors.lavender} />
          </View>
          <Text style={styles.quickLabel}>Analysis</Text>
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
    paddingTop: 60,
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

  valueCard: {
    backgroundColor: Colors.primary,
    borderRadius: 24,
    padding: 24,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
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
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    padding: 4,
    opacity: 0.8,
  },
  valueAmount: {
    fontSize: 36,
    fontWeight: '700',
    color: Colors.textLight,
    marginTop: 4,
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

  emptyCard: {
    backgroundColor: Colors.surface,
    borderRadius: 24,
    padding: 32,
    marginTop: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: 'dashed',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },

  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
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
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
  },

  allocationCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 20,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
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
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
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

  quickActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  quickAction: {
    flex: 1,
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  quickIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
});
