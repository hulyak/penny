import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { TrendingUp, TrendingDown } from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import Colors from '@/constants/colors';
import portfolioHistory, {
  PerformanceData,
  PerformanceSummary,
} from '@/lib/portfolioHistory';

interface PeriodChange {
  change: number;
  percent: number;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_HEIGHT = 220;

type Period = '1W' | '1M' | '3M' | '6M' | '1Y' | 'ALL';

interface PerformanceChartProps {
  onPeriodChange?: (period: Period) => void;
}

export function PerformanceChart({ onPeriodChange }: PerformanceChartProps) {
  const [period, setPeriod] = useState<Period>('1M');
  const [data, setData] = useState<PerformanceData | null>(null);
  const [summary, setSummary] = useState<PerformanceSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [periodChanges, setPeriodChanges] = useState<{
    week: PeriodChange | null;
    month: PeriodChange | null;
    year: PeriodChange | null;
    allTime: PeriodChange | null;
  } | null>(null);

  // Reload data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [period])
  );

  useEffect(() => {
    loadData();
  }, [period]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [perfData, perfSummary, weekSummary, monthSummary, yearSummary, allTimeSummary] = await Promise.all([
        portfolioHistory.getPerformanceData(period),
        portfolioHistory.getPerformanceSummary(period),
        portfolioHistory.getPerformanceSummary('1W'),
        portfolioHistory.getPerformanceSummary('1M'),
        portfolioHistory.getPerformanceSummary('1Y'),
        portfolioHistory.getPerformanceSummary('ALL'),
      ]);
      setData(perfData);
      setSummary(perfSummary);

      // Set period changes
      setPeriodChanges({
        week: weekSummary ? { change: weekSummary.absoluteReturn, percent: weekSummary.percentReturn } : null,
        month: monthSummary ? { change: monthSummary.absoluteReturn, percent: monthSummary.percentReturn } : null,
        year: yearSummary ? { change: yearSummary.absoluteReturn, percent: yearSummary.percentReturn } : null,
        allTime: allTimeSummary ? { change: allTimeSummary.absoluteReturn, percent: allTimeSummary.percentReturn } : null,
      });
    } catch (error) {
      console.error('Failed to load performance data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePeriodChange = (newPeriod: Period) => {
    setPeriod(newPeriod);
    onPeriodChange?.(newPeriod);
  };

  const periods: Period[] = ['1W', '1M', '3M', '6M', '1Y', 'ALL'];

  const renderChart = () => {
    if (!data || data.values.length === 0) {
      return (
        <View style={styles.emptyChart}>
          <Text style={styles.emptyText}>No data available</Text>
          <Text style={styles.emptySubtext}>
            Check back after tracking your portfolio for a few days
          </Text>
        </View>
      );
    }

    const isPositive = summary ? summary.percentReturn >= 0 : true;
    const chartColor = isPositive ? Colors.success : Colors.danger;

    // Prepare chart data - limit labels to avoid crowding
    const maxLabels = 6;
    const step = Math.ceil(data.labels.length / maxLabels);
    const displayLabels = data.labels.map((label, i) =>
      i % step === 0 ? label : ''
    );

    const chartData = {
      labels: displayLabels,
      datasets: [
        {
          data: data.values,
          color: () => chartColor,
          strokeWidth: 2,
        },
      ],
    };

    return (
      <View style={styles.chartWrapper}>
        <LineChart
          data={chartData}
          width={SCREEN_WIDTH - 48}
          height={CHART_HEIGHT}
          chartConfig={{
            backgroundColor: Colors.surface,
            backgroundGradientFrom: Colors.surface,
            backgroundGradientTo: Colors.surface,
            decimalPlaces: 0,
            color: () => chartColor,
            labelColor: () => Colors.textMuted,
            style: {
              borderRadius: 16,
            },
            propsForDots: {
              r: '3',
              strokeWidth: '1',
              stroke: chartColor,
            },
            propsForBackgroundLines: {
              strokeDasharray: '',
              stroke: Colors.border,
              strokeWidth: 1,
            },
          }}
          bezier
          style={styles.chart}
          withInnerLines={true}
          withOuterLines={false}
          withVerticalLines={false}
          withHorizontalLines={true}
          withVerticalLabels={true}
          withHorizontalLabels={true}
          fromZero={false}
          yAxisLabel="$"
          yAxisSuffix=""
          formatYLabel={(value) => {
            const num = parseFloat(value);
            if (num >= 1000) {
              return `${(num / 1000).toFixed(0)}k`;
            }
            return value;
          }}
        />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Performance</Text>
        {summary && (
          <View style={[
            styles.returnBadge,
            { backgroundColor: summary.percentReturn >= 0 ? Colors.successMuted : Colors.dangerMuted }
          ]}>
            {summary.percentReturn >= 0 ? (
              <TrendingUp size={14} color={Colors.success} />
            ) : (
              <TrendingDown size={14} color={Colors.danger} />
            )}
            <Text
              style={[
                styles.returnText,
                { color: summary.percentReturn >= 0 ? Colors.success : Colors.danger },
              ]}
            >
              {summary.percentReturn >= 0 ? '+' : ''}
              {summary.percentReturn.toFixed(2)}%
            </Text>
          </View>
        )}
      </View>

      {/* Summary Stats */}
      {summary && (
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Return</Text>
            <Text
              style={[
                styles.summaryValue,
                { color: summary.absoluteReturn >= 0 ? Colors.success : Colors.danger },
              ]}
            >
              {summary.absoluteReturn >= 0 ? '+' : ''}$
              {Math.abs(summary.absoluteReturn).toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>High</Text>
            <Text style={styles.summaryValue}>
              ${summary.highestValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Low</Text>
            <Text style={styles.summaryValue}>
              ${summary.lowestValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </Text>
          </View>
        </View>
      )}

      {/* Chart */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={Colors.accent} />
          <Text style={styles.loadingText}>Loading chart...</Text>
        </View>
      ) : (
        renderChart()
      )}

      {/* Period Selector */}
      <View style={styles.periodSelector}>
        {periods.map((p) => (
          <Pressable
            key={p}
            style={[styles.periodButton, period === p && styles.periodButtonActive]}
            onPress={() => handlePeriodChange(p)}
          >
            <Text
              style={[
                styles.periodText,
                period === p && styles.periodTextActive,
              ]}
            >
              {p}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Period Changes Summary */}
      {periodChanges && (
        <View style={styles.periodChangesContainer}>
          <PeriodChangeItem label="1W" data={periodChanges.week} />
          <PeriodChangeItem label="1M" data={periodChanges.month} />
          <PeriodChangeItem label="1Y" data={periodChanges.year} />
          <PeriodChangeItem label="All" data={periodChanges.allTime} />
        </View>
      )}
    </View>
  );
}

function PeriodChangeItem({ label, data }: { label: string; data: PeriodChange | null }) {
  if (!data) {
    return (
      <View style={styles.periodChangeItem}>
        <Text style={styles.periodChangeLabel}>{label}</Text>
        <Text style={styles.periodChangeValueEmpty}>--</Text>
      </View>
    );
  }

  const isPositive = data.percent >= 0;

  return (
    <View style={styles.periodChangeItem}>
      <Text style={styles.periodChangeLabel}>{label}</Text>
      <Text style={[styles.periodChangePercent, { color: isPositive ? Colors.success : Colors.danger }]}>
        {isPositive ? '+' : ''}{data.percent.toFixed(1)}%
      </Text>
      <Text style={[styles.periodChangeValue, { color: isPositive ? Colors.success : Colors.danger }]}>
        {isPositive ? '+' : ''}${Math.abs(data.change).toLocaleString(undefined, { maximumFractionDigits: 0 })}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    marginTop: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  returnBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  returnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  chartWrapper: {
    marginHorizontal: -8,
    marginBottom: 16,
  },
  chart: {
    borderRadius: 16,
  },
  periodSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 4,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  periodButtonActive: {
    backgroundColor: Colors.surface,
  },
  periodText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  periodTextActive: {
    color: Colors.text,
  },
  loadingContainer: {
    height: CHART_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  emptyChart: {
    height: CHART_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: Colors.background,
    borderRadius: 16,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  periodChangesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  periodChangeItem: {
    flex: 1,
    alignItems: 'center',
  },
  periodChangeLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
    marginBottom: 4,
  },
  periodChangePercent: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  periodChangeValue: {
    fontSize: 11,
    fontWeight: '500',
  },
  periodChangeValueEmpty: {
    fontSize: 14,
    color: Colors.textMuted,
  },
});
