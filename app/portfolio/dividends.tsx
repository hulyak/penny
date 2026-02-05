import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  Plus,
  DollarSign,
  Calendar,
  TrendingUp,
  Clock,
  Check,
  RotateCcw,
  ChevronRight,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import dividendService, {
  DividendSummary,
  DividendPayment,
  DividendSchedule,
} from '@/lib/dividendService';
import portfolioService from '@/lib/portfolioService';
import { Holding } from '@/types';

export default function DividendsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [summary, setSummary] = useState<DividendSummary | null>(null);
  const [history, setHistory] = useState<{ month: string; amount: number }[]>([]);
  const [schedules, setSchedules] = useState<DividendSchedule[]>([]);
  const [recentDividends, setRecentDividends] = useState<DividendPayment[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const holdings = await portfolioService.getHoldings();
      const [loadedSummary, loadedHistory, loadedSchedules, allDividends] = await Promise.all([
        dividendService.getDividendSummary(),
        dividendService.getDividendHistory(6),
        dividendService.getDividendSchedules(holdings),
        dividendService.getDividends(),
      ]);

      setSummary(loadedSummary);
      setHistory(loadedHistory);
      setSchedules(loadedSchedules.filter(s => s.annualAmount && s.annualAmount > 0));
      setRecentDividends(
        allDividends
          .sort((a, b) => b.paymentDate.localeCompare(a.paymentDate))
          .slice(0, 10)
      );
    } catch (error) {
      console.error('Failed to load dividend data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { month: 'short' });
  };

  const getStatusIcon = (status: DividendPayment['status']) => {
    switch (status) {
      case 'received':
        return <Check size={14} color={Colors.success} />;
      case 'reinvested':
        return <RotateCcw size={14} color={Colors.accent} />;
      case 'pending':
        return <Clock size={14} color={Colors.warning} />;
      default:
        return <Calendar size={14} color={Colors.textMuted} />;
    }
  };

  const maxHistoryAmount = Math.max(...history.map(h => h.amount), 1);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <ChevronLeft size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Dividends</Text>
        <Pressable
          style={styles.addButton}
          onPress={() => router.push('/portfolio/add-dividend' as any)}
        >
          <Plus size={20} color={Colors.textLight} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />
        }
      >
        {/* Summary Card */}
        {summary && (
          <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <View style={styles.summaryIconWrapper}>
                <DollarSign size={24} color={Colors.success} />
              </View>
              <View>
                <Text style={styles.summaryLabel}>YTD Dividends</Text>
                <Text style={styles.summaryAmount}>{formatCurrency(summary.ytdDividends)}</Text>
              </View>
            </View>

            <View style={styles.summaryGrid}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryItemLabel}>Monthly Avg</Text>
                <Text style={styles.summaryItemValue}>{formatCurrency(summary.monthlyAverage)}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryItemLabel}>Projected Annual</Text>
                <Text style={styles.summaryItemValue}>{formatCurrency(summary.annualProjection)}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryItemLabel}>Pending</Text>
                <Text style={[styles.summaryItemValue, { color: Colors.warning }]}>
                  {formatCurrency(summary.totalPending)}
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryItemLabel}>Reinvested</Text>
                <Text style={[styles.summaryItemValue, { color: Colors.accent }]}>
                  {formatCurrency(summary.totalReinvested)}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Monthly Chart */}
        {history.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Monthly History</Text>
            <View style={styles.chartContainer}>
              {history.map((item, index) => (
                <View key={item.month} style={styles.chartBar}>
                  <View
                    style={[
                      styles.chartBarFill,
                      {
                        height: `${(item.amount / maxHistoryAmount) * 100}%`,
                        backgroundColor: item.amount > 0 ? Colors.success : Colors.border,
                      },
                    ]}
                  />
                  <Text style={styles.chartBarLabel}>{formatMonth(item.month)}</Text>
                  {item.amount > 0 && (
                    <Text style={styles.chartBarValue}>${item.amount.toFixed(0)}</Text>
                  )}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Upcoming Dividends */}
        {summary && summary.upcomingDividends.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Upcoming</Text>
            {summary.upcomingDividends.map((dividend) => (
              <View key={dividend.id} style={styles.dividendCard}>
                <View style={styles.dividendInfo}>
                  <Text style={styles.dividendName}>{dividend.holdingName}</Text>
                  <Text style={styles.dividendDate}>
                    {formatDate(dividend.paymentDate)} · {dividend.shares} shares
                  </Text>
                </View>
                <View style={styles.dividendRight}>
                  <Text style={styles.dividendAmount}>{formatCurrency(dividend.totalAmount)}</Text>
                  <View style={styles.statusBadge}>
                    {getStatusIcon(dividend.status)}
                    <Text style={styles.statusText}>{dividend.status}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Dividend-Paying Holdings */}
        {schedules.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Dividend Holdings</Text>
            {schedules.map((schedule) => (
              <Pressable
                key={schedule.holdingId}
                style={styles.scheduleCard}
                onPress={() => router.push(`/portfolio/${schedule.holdingId}` as any)}
              >
                <View style={styles.scheduleInfo}>
                  <Text style={styles.scheduleName}>{schedule.holdingName}</Text>
                  <Text style={styles.scheduleSymbol}>{schedule.symbol}</Text>
                </View>
                <View style={styles.scheduleDetails}>
                  <View style={styles.scheduleDetail}>
                    <Text style={styles.scheduleDetailLabel}>Yield</Text>
                    <Text style={styles.scheduleDetailValue}>{schedule.annualYield?.toFixed(2)}%</Text>
                  </View>
                  <View style={styles.scheduleDetail}>
                    <Text style={styles.scheduleDetailLabel}>Annual</Text>
                    <Text style={styles.scheduleDetailValue}>
                      {formatCurrency(schedule.annualAmount || 0)}
                    </Text>
                  </View>
                  <View style={styles.scheduleDetail}>
                    <Text style={styles.scheduleDetailLabel}>Frequency</Text>
                    <Text style={styles.scheduleDetailValue}>
                      {schedule.frequency.charAt(0).toUpperCase() + schedule.frequency.slice(1)}
                    </Text>
                  </View>
                </View>
                <ChevronRight size={18} color={Colors.textMuted} />
              </Pressable>
            ))}
          </View>
        )}

        {/* Recent Dividends */}
        {recentDividends.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            {recentDividends.map((dividend) => (
              <View key={dividend.id} style={styles.recentCard}>
                <View style={styles.recentIcon}>
                  {getStatusIcon(dividend.status)}
                </View>
                <View style={styles.recentInfo}>
                  <Text style={styles.recentName}>{dividend.holdingName}</Text>
                  <Text style={styles.recentDate}>
                    {formatDate(dividend.paymentDate)} · ${dividend.amount.toFixed(4)}/share
                  </Text>
                </View>
                <Text style={styles.recentAmount}>{formatCurrency(dividend.totalAmount)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Empty State */}
        {!isLoading && recentDividends.length === 0 && schedules.length === 0 && (
          <View style={styles.emptyCard}>
            <TrendingUp size={32} color={Colors.accent} />
            <Text style={styles.emptyTitle}>No dividends yet</Text>
            <Text style={styles.emptySubtitle}>
              Add dividend payments to track your passive income
            </Text>
            <Pressable
              style={styles.emptyButton}
              onPress={() => router.push('/portfolio/add-dividend' as any)}
            >
              <Plus size={18} color={Colors.textLight} />
              <Text style={styles.emptyButtonText}>Add Dividend</Text>
            </Pressable>
          </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  summaryCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  summaryIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: Colors.successMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  summaryAmount: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.5,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  summaryItem: {
    width: '47%',
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 12,
  },
  summaryItemLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryItemValue: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  chartContainer: {
    flexDirection: 'row',
    height: 120,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    gap: 8,
    alignItems: 'flex-end',
  },
  chartBar: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },
  chartBarFill: {
    width: '70%',
    borderRadius: 4,
    minHeight: 4,
  },
  chartBarLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 4,
  },
  chartBarValue: {
    fontSize: 9,
    color: Colors.success,
    fontWeight: '600',
    position: 'absolute',
    top: 0,
  },
  dividendCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  dividendInfo: {
    flex: 1,
  },
  dividendName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  dividendDate: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  dividendRight: {
    alignItems: 'flex-end',
  },
  dividendAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.success,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  statusText: {
    fontSize: 10,
    color: Colors.textSecondary,
    textTransform: 'capitalize',
  },
  scheduleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
  },
  scheduleInfo: {
    flex: 1,
  },
  scheduleName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  scheduleSymbol: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  scheduleDetails: {
    flexDirection: 'row',
    gap: 16,
    marginRight: 8,
  },
  scheduleDetail: {
    alignItems: 'flex-end',
  },
  scheduleDetailLabel: {
    fontSize: 10,
    color: Colors.textMuted,
  },
  scheduleDetailValue: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text,
  },
  recentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 6,
  },
  recentIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  recentInfo: {
    flex: 1,
  },
  recentName: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.text,
  },
  recentDate: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  recentAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  emptyCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    marginTop: 24,
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
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 20,
  },
  emptyButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textLight,
  },
});
