import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Users, TrendingUp, TrendingDown, Minus } from 'lucide-react-native';
import Colors from '@/constants/colors';

export interface BenchmarkMetric {
  label: string;
  userValue: number;
  peerAverage: number;
  percentile: number;
}

interface PeerBenchmarkProps {
  metrics: BenchmarkMetric[];
}

export function generateBenchmarkMetrics(
  userAllocation: {
    equity: number;
    debt: number;
    commodity: number;
    realAsset: number;
    cash: number;
  },
  holdingsCount: number,
  sectorCount: number,
  countryCount: number
): BenchmarkMetric[] {
  // Simulated peer averages for comparison
  const peerAverages = {
    equity: 60,
    debt: 25,
    commodity: 5,
    realAsset: 5,
    cash: 5,
    holdings: 12,
    sectors: 5,
    countries: 3,
  };

  return [
    {
      label: 'Holdings',
      userValue: holdingsCount,
      peerAverage: peerAverages.holdings,
      percentile: Math.min(100, (holdingsCount / peerAverages.holdings) * 50 + 25),
    },
    {
      label: 'Sectors',
      userValue: sectorCount,
      peerAverage: peerAverages.sectors,
      percentile: Math.min(100, (sectorCount / peerAverages.sectors) * 50 + 25),
    },
    {
      label: 'Countries',
      userValue: countryCount,
      peerAverage: peerAverages.countries,
      percentile: Math.min(100, (countryCount / peerAverages.countries) * 50 + 25),
    },
    {
      label: 'Equity %',
      userValue: userAllocation.equity,
      peerAverage: peerAverages.equity,
      percentile: 50 + (userAllocation.equity - peerAverages.equity) / 2,
    },
  ];
}

export function PeerBenchmark({ metrics }: PeerBenchmarkProps) {
  const getTrendIcon = (percentile: number) => {
    if (percentile > 60) return <TrendingUp size={14} color={Colors.success} />;
    if (percentile < 40) return <TrendingDown size={14} color={Colors.warning} />;
    return <Minus size={14} color={Colors.textMuted} />;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Users size={18} color={Colors.accent} />
        <Text style={styles.title}>Peer Comparison</Text>
      </View>
      <Text style={styles.subtitle}>How you compare to similar investors</Text>

      <View style={styles.metricsContainer}>
        {metrics.map((metric, index) => (
          <View key={index} style={styles.metricRow}>
            <View style={styles.metricInfo}>
              <Text style={styles.metricLabel}>{metric.label}</Text>
              <Text style={styles.metricValue}>
                {typeof metric.userValue === 'number'
                  ? metric.label.includes('%')
                    ? `${metric.userValue.toFixed(0)}%`
                    : metric.userValue
                  : metric.userValue}
              </Text>
            </View>
            <View style={styles.metricComparison}>
              {getTrendIcon(metric.percentile)}
              <Text style={styles.percentileText}>
                Top {Math.max(1, 100 - Math.round(metric.percentile))}%
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 16,
  },
  metricsContainer: {
    gap: 12,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  metricInfo: {
    flex: 1,
  },
  metricLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  metricComparison: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  percentileText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
});
