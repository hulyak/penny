import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
} from 'react-native';
import {
  Users,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronDown,
  ChevronUp,
  Award,
  Info,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { PeerComparison, CommunityBenchmark } from '@/types';

interface Props {
  comparison: PeerComparison | null;
  isLoading?: boolean;
}

export function CommunityBenchmarkCard({ comparison, isLoading }: Props) {
  const [expanded, setExpanded] = useState(false);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.iconWrapper}>
            <Users size={20} color={Colors.purple} />
          </View>
          <Text style={styles.title}>Community Comparison</Text>
        </View>
        <View style={styles.loadingPlaceholder}>
          <Text style={styles.loadingText}>Loading peer data...</Text>
        </View>
      </View>
    );
  }

  if (!comparison) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.iconWrapper}>
            <Users size={20} color={Colors.purple} />
          </View>
          <Text style={styles.title}>Community Comparison</Text>
        </View>
        <Text style={styles.emptyText}>Add holdings to compare with peers</Text>
      </View>
    );
  }

  // Find best performing metric
  const bestMetric = comparison.benchmarks.reduce((best, current) =>
    current.percentile > best.percentile ? current : best
  , comparison.benchmarks[0]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.iconWrapper}>
            <Users size={20} color={Colors.purple} />
          </View>
          <View>
            <Text style={styles.title}>Peer Comparison</Text>
            <Text style={styles.subtitle}>
              vs {comparison.totalParticipants.toLocaleString()} investors aged {comparison.ageGroup}
            </Text>
          </View>
        </View>
      </View>

      {/* Highlight Card */}
      <View style={styles.highlightCard}>
        <Award size={24} color={Colors.gold} />
        <View style={styles.highlightContent}>
          <Text style={styles.highlightTitle}>Your Best Ranking</Text>
          <Text style={styles.highlightText}>
            Top {100 - bestMetric.percentile}% in {bestMetric.category}
          </Text>
        </View>
      </View>

      {/* Quick Benchmarks */}
      <View style={styles.benchmarkGrid}>
        {comparison.benchmarks.slice(0, expanded ? undefined : 3).map((benchmark) => (
          <BenchmarkItem key={benchmark.category} benchmark={benchmark} />
        ))}
      </View>

      {comparison.benchmarks.length > 3 && (
        <Pressable style={styles.expandButton} onPress={() => setExpanded(!expanded)}>
          <Text style={styles.expandText}>
            {expanded ? 'Show Less' : `Show ${comparison.benchmarks.length - 3} More`}
          </Text>
          {expanded ? (
            <ChevronUp size={18} color={Colors.accent} />
          ) : (
            <ChevronDown size={18} color={Colors.accent} />
          )}
        </Pressable>
      )}

      {/* Insights */}
      {comparison.insights.length > 0 && (
        <View style={styles.insightsSection}>
          <Text style={styles.insightsTitle}>Insights</Text>
          {comparison.insights.slice(0, 2).map((insight, index) => (
            <View key={index} style={styles.insightRow}>
              <Info size={14} color={Colors.accent} style={styles.insightIcon} />
              <Text style={styles.insightText}>{insight}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Disclaimer */}
      <Text style={styles.disclaimer}>
        Based on anonymous community data. For educational purposes only.
      </Text>
    </View>
  );
}

function BenchmarkItem({ benchmark }: { benchmark: CommunityBenchmark }) {
  const getTrendIcon = () => {
    switch (benchmark.trend) {
      case 'above':
        return <TrendingUp size={14} color={Colors.success} />;
      case 'below':
        return <TrendingDown size={14} color={Colors.danger} />;
      default:
        return <Minus size={14} color={Colors.textSecondary} />;
    }
  };

  const getTrendColor = () => {
    switch (benchmark.trend) {
      case 'above':
        return Colors.success;
      case 'below':
        return Colors.danger;
      default:
        return Colors.textSecondary;
    }
  };

  const formatValue = (value: number, category: string) => {
    if (category.includes('Allocation') || category.includes('Score')) {
      return `${value.toFixed(0)}%`;
    }
    if (category.includes('Size')) {
      return `$${value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value.toFixed(0)}`;
    }
    return value.toFixed(0);
  };

  return (
    <View style={styles.benchmarkItem}>
      <View style={styles.benchmarkHeader}>
        <Text style={styles.benchmarkCategory}>{benchmark.category}</Text>
        {getTrendIcon()}
      </View>

      <Text style={styles.benchmarkValue}>
        {formatValue(benchmark.userValue, benchmark.category)}
      </Text>

      <View style={styles.percentileBar}>
        <View
          style={[
            styles.percentileFill,
            { width: `${benchmark.percentile}%`, backgroundColor: getTrendColor() }
          ]}
        />
        <View
          style={[
            styles.percentileMarker,
            { left: `${benchmark.percentile}%` }
          ]}
        />
      </View>

      <View style={styles.benchmarkMeta}>
        <Text style={[styles.percentileText, { color: getTrendColor() }]}>
          Top {100 - benchmark.percentile}%
        </Text>
        <Text style={styles.medianText}>
          Median: {formatValue(benchmark.communityMedian, benchmark.category)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.purpleMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  subtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  loadingPlaceholder: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingVertical: 16,
  },
  highlightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.goldMuted,
    borderRadius: 12,
    padding: 14,
    gap: 12,
    marginBottom: 16,
  },
  highlightContent: {
    flex: 1,
  },
  highlightTitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  highlightText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  benchmarkGrid: {
    gap: 12,
  },
  benchmarkItem: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 14,
  },
  benchmarkHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  benchmarkCategory: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  benchmarkValue: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 10,
  },
  percentileBar: {
    height: 6,
    backgroundColor: Colors.border,
    borderRadius: 3,
    position: 'relative',
    marginBottom: 8,
  },
  percentileFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 3,
  },
  percentileMarker: {
    position: 'absolute',
    top: -2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.text,
    marginLeft: -5,
    borderWidth: 2,
    borderColor: Colors.background,
  },
  benchmarkMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  percentileText: {
    fontSize: 13,
    fontWeight: '600',
  },
  medianText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  expandText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.accent,
  },
  insightsSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  insightsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  insightRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  insightIcon: {
    marginRight: 10,
    marginTop: 2,
  },
  insightText: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },
  disclaimer: {
    fontSize: 11,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 12,
  },
});
