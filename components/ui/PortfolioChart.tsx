import React from 'react';
import { View, StyleSheet, Dimensions, Text } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import Colors from '@/constants/colors';

interface PortfolioChartProps {
  data: number[];
  labels: string[];
  height?: number;
}

const screenWidth = Dimensions.get('window').width;

export default function PortfolioChart({ 
  data, 
  labels, 
  height = 220 
}: PortfolioChartProps) {
  // Ensure we have valid data
  const chartData = data.length > 0 ? data : [0];
  const chartLabels = labels.length > 0 ? labels : [''];

  return (
    <View style={styles.container}>
      <LineChart
        data={{
          labels: chartLabels,
          datasets: [{
            data: chartData,
          }],
        }}
        width={screenWidth - 64} // Account for card padding
        height={height}
        chartConfig={{
          backgroundColor: Colors.surfaceSecondary,
          backgroundGradientFrom: Colors.surfaceSecondary,
          backgroundGradientTo: Colors.surfaceSecondary,
          decimalPlaces: 2,
          color: (opacity = 1) => `rgba(20, 184, 166, ${opacity})`,
          labelColor: (opacity = 1) => `rgba(160, 160, 160, ${opacity})`,
          style: {
            borderRadius: 16,
          },
          propsForDots: {
            r: '0',
          },
          propsForBackgroundLines: {
            strokeDasharray: '',
            stroke: Colors.chart.grid,
            strokeWidth: 1,
          },
          fillShadowGradient: Colors.chart.gradientStart,
          fillShadowGradientOpacity: 0.3,
        }}
        bezier
        style={styles.chart}
        withVerticalLines={true}
        withHorizontalLines={true}
        withInnerLines={true}
        withOuterLines={false}
        withVerticalLabels={true}
        withHorizontalLabels={true}
        segments={4}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 16,
    overflow: 'hidden',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
});
