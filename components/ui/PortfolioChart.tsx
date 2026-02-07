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

  // Show max 5 X-axis labels to avoid clutter
  const maxLabels = 5;
  const chartLabels = labels.length > 0 ? labels : [''];
  const displayLabels = chartLabels.length <= maxLabels
    ? chartLabels
    : chartLabels.map((label, i) => {
        const step = Math.floor(chartLabels.length / (maxLabels - 1));
        if (i === 0 || i === chartLabels.length - 1 || i % step === 0) {
          return label;
        }
        return '';
      });

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
        }}
        bezier
        style={styles.chart}
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
