import React from 'react';
import { View, StyleSheet, Dimensions, Text } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import Colors from '@/constants/colors';

interface PortfolioChartProps {
  data: number[];
  labels: string[];
  height?: number;
  isPositive?: boolean;
}

const screenWidth = Dimensions.get('window').width;

/**
 * Format large numbers for Y-axis: $1.2K, $12.5K, $1.2M, etc.
 */
function formatYLabel(value: string): string {
  const num = parseFloat(value);
  if (isNaN(num)) return value;

  if (num >= 1_000_000) {
    return `$${(num / 1_000_000).toFixed(1)}M`;
  }
  if (num >= 1_000) {
    return `$${(num / 1_000).toFixed(1)}K`;
  }
  return `$${num.toFixed(0)}`;
}

export default function PortfolioChart({
  data,
  labels,
  height = 200,
  isPositive = true,
}: PortfolioChartProps) {
  // Ensure we have valid data
  const chartData = data.length > 0 ? data : [0];

  // Show max 4 X-axis labels to avoid clutter and overlap
  const maxLabels = 4;
  const chartLabels = labels.length > 0 ? labels : [''];
  const displayLabels = chartLabels.length <= maxLabels
    ? chartLabels
    : (() => {
        // Pick evenly spaced indices including first and last
        const indices = new Set<number>();
        indices.add(0);
        indices.add(chartLabels.length - 1);
        const innerCount = maxLabels - 2; // labels between first and last
        for (let j = 1; j <= innerCount; j++) {
          const idx = Math.round((j * (chartLabels.length - 1)) / (innerCount + 1));
          indices.add(idx);
        }
        // Ensure no two visible labels are adjacent (suppress the earlier one)
        const sorted = Array.from(indices).sort((a, b) => a - b);
        for (let k = sorted.length - 1; k > 0; k--) {
          if (sorted[k] - sorted[k - 1] <= 1 && k - 1 > 0) {
            indices.delete(sorted[k - 1]);
          }
        }
        return chartLabels.map((label, i) => indices.has(i) ? label : '');
      })();

  const lineColor = isPositive
    ? (opacity = 1) => `rgba(16, 185, 129, ${opacity})`   // green
    : (opacity = 1) => `rgba(239, 68, 68, ${opacity})`;    // red

  const gradientColor = isPositive ? '#10B981' : '#EF4444';

  return (
    <View style={styles.container}>
      <LineChart
        data={{
          labels: displayLabels,
          datasets: [{ data: chartData }],
        }}
        width={screenWidth - 40}
        height={height}
        formatYLabel={formatYLabel}
        chartConfig={{
          backgroundColor: 'transparent',
          backgroundGradientFrom: Colors.surfaceSecondary,
          backgroundGradientTo: Colors.surfaceSecondary,
          decimalPlaces: 0,
          color: lineColor,
          labelColor: () => Colors.textMuted,
          style: {
            borderRadius: 16,
          },
          propsForDots: {
            r: '0',
          },
          propsForBackgroundLines: {
            strokeDasharray: '6,6',
            stroke: Colors.border,
            strokeWidth: 0.5,
          },
          fillShadowGradient: gradientColor,
          fillShadowGradientOpacity: 0.15,
          fillShadowGradientFromOffset: 0,
          fillShadowGradientTo: 'transparent',
          propsForLabels: {
            fontSize: 10,
          },
        }}
        bezier
        style={styles.chart}
        xLabelsOffset={-4}
        withVerticalLines={false}
        withHorizontalLines={true}
        withInnerLines={true}
        withOuterLines={false}
        withVerticalLabels={true}
        withHorizontalLabels={true}
        segments={3}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 16,
    overflow: 'hidden',
    paddingTop: 8,
  },
  chart: {
    borderRadius: 16,
    marginLeft: -8,
  },
});
