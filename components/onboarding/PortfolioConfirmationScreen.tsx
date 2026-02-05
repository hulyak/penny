import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Plus, TrendingUp, TrendingDown } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useOnboarding } from '@/context/OnboardingContext';
import { SparklineChart, generateMockChartData } from './SparklineChart';

interface Props {
  onContinue: () => void;
  onBack: () => void;
  onAddMore: () => void;
}

export function PortfolioConfirmationScreen({ onContinue, onBack, onAddMore }: Props) {
  const insets = useSafeAreaInsets();
  const { selectedAssets, totalPortfolioValue } = useOnboarding();

  const formatCurrency = (value: number) => {
    return value.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const formatPrice = (price: number) => {
    if (price >= 1000) {
      return price.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    }
    return price.toFixed(2);
  };

  const formatChange = (change: number) => {
    const prefix = change >= 0 ? '+' : '';
    return `${prefix}${change.toFixed(2)}%`;
  };

  // Calculate allocation by asset type
  const allocation = selectedAssets.reduce((acc, asset) => {
    const type = asset.type;
    const value = asset.value || 0;
    acc[type] = (acc[type] || 0) + value;
    return acc;
  }, {} as Record<string, number>);

  const allocationItems = Object.entries(allocation)
    .map(([type, value]) => ({
      type,
      value,
      percent: totalPortfolioValue > 0 ? (value / totalPortfolioValue) * 100 : 0,
    }))
    .sort((a, b) => b.value - a.value);

  const getTypeColor = (type: string): string => {
    const colors: Record<string, string> = {
      stock: '#4299E1',
      etf: '#9F7AEA',
      crypto: '#F7931A',
      gold: '#F7B955',
      real_estate: '#00D09C',
      cash: '#A0AEC0',
      other: '#718096',
    };
    return colors[type] || '#4299E1';
  };

  const getTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      stock: 'Stocks',
      etf: 'ETFs',
      crypto: 'Crypto',
      gold: 'Gold',
      real_estate: 'Real Estate',
      cash: 'Cash',
      other: 'Other',
    };
    return labels[type] || type;
  };

  const getUnitLabel = (type: string) => {
    switch (type) {
      case 'stock':
      case 'etf':
        return 'shares';
      case 'crypto':
        return 'coins';
      case 'gold':
        return 'oz';
      default:
        return 'units';
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <ArrowLeft size={22} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Portfolio</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Value Card */}
        <View style={styles.valueCard}>
          <View style={styles.valueHeader}>
            <Text style={styles.valueLabel}>Net Liquidation Value</Text>
          </View>
          <Text style={styles.valueAmount}>
            {formatCurrency(totalPortfolioValue)}
          </Text>
        </View>

        {/* Allocation Section */}
        {allocationItems.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Allocation</Text>
            </View>

            {/* Allocation Bar */}
            <View style={styles.allocationBar}>
              {allocationItems.map((item, index) => (
                <View
                  key={item.type}
                  style={[
                    styles.allocationSegment,
                    {
                      flex: item.percent,
                      backgroundColor: getTypeColor(item.type),
                      borderTopLeftRadius: index === 0 ? 4 : 0,
                      borderBottomLeftRadius: index === 0 ? 4 : 0,
                      borderTopRightRadius: index === allocationItems.length - 1 ? 4 : 0,
                      borderBottomRightRadius: index === allocationItems.length - 1 ? 4 : 0,
                    },
                  ]}
                />
              ))}
            </View>

            {/* Legend */}
            <View style={styles.legend}>
              {allocationItems.map((item) => (
                <View key={item.type} style={styles.legendItem}>
                  <View
                    style={[styles.legendDot, { backgroundColor: getTypeColor(item.type) }]}
                  />
                  <Text style={styles.legendLabel}>{getTypeLabel(item.type)}</Text>
                  <Text style={styles.legendPercent}>{item.percent.toFixed(1)}%</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Positions Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Positions</Text>
          </View>

          {/* Table Header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, { flex: 1 }]}>Instrument</Text>
            <Text style={[styles.tableHeaderText, styles.colChart]}>Chart</Text>
            <Text style={[styles.tableHeaderText, styles.colPrice]}>Last</Text>
            <Text style={[styles.tableHeaderText, styles.colQty]}>Pos</Text>
            <Text style={[styles.tableHeaderText, styles.colValue]}>Value</Text>
          </View>

          {/* Positions */}
          {selectedAssets.map((asset) => {
            const isPositive = asset.changePercent >= 0;
            const chartData = generateMockChartData(asset.currentPrice, asset.changePercent);
            return (
              <View key={asset.id} style={styles.positionRow}>
                <View style={styles.positionMain}>
                  <Text style={styles.positionSymbol}>{asset.symbol}</Text>
                  <View style={styles.changeRow}>
                    {isPositive ? (
                      <TrendingUp size={10} color="#00D09C" />
                    ) : (
                      <TrendingDown size={10} color="#FF6B6B" />
                    )}
                    <Text style={[
                      styles.changeText,
                      { color: isPositive ? '#00D09C' : '#FF6B6B' }
                    ]}>
                      {formatChange(asset.changePercent)}
                    </Text>
                  </View>
                </View>
                <View style={styles.colChart}>
                  <SparklineChart
                    data={chartData}
                    width={50}
                    height={24}
                    color={isPositive ? '#00D09C' : '#FF6B6B'}
                    showGradient={true}
                  />
                </View>
                <View style={styles.colPrice}>
                  <Text style={styles.positionPrice}>${formatPrice(asset.currentPrice)}</Text>
                </View>
                <View style={styles.colQty}>
                  <Text style={styles.positionQty}>{asset.quantity}</Text>
                  <Text style={styles.positionUnit}>{getUnitLabel(asset.type)}</Text>
                </View>
                <View style={styles.colValue}>
                  <Text style={styles.positionValue}>${formatCurrency(asset.value || 0)}</Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Add More Button */}
        <Pressable style={styles.addMoreButton} onPress={onAddMore}>
          <Plus size={18} color={Colors.primary} />
          <Text style={styles.addMoreText}>Add more positions</Text>
        </Pressable>
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <Pressable style={styles.ctaButton} onPress={onContinue}>
          <Text style={styles.ctaText}>Start Tracking</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0E17',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1C2333',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.text,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingBottom: 100,
  },
  valueCard: {
    margin: 16,
    padding: 20,
    backgroundColor: '#1C2333',
    borderRadius: 12,
  },
  valueHeader: {
    marginBottom: 8,
  },
  valueLabel: {
    fontSize: 13,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  valueAmount: {
    fontSize: 36,
    fontWeight: '700',
    color: Colors.text,
    fontVariant: ['tabular-nums'],
  },
  section: {
    marginBottom: 16,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#0F1419',
    borderBottomWidth: 1,
    borderBottomColor: '#1C2333',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  allocationBar: {
    flexDirection: 'row',
    height: 8,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 4,
    overflow: 'hidden',
  },
  allocationSegment: {
    minWidth: 4,
  },
  legend: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
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
    fontVariant: ['tabular-nums'],
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#0F1419',
    borderBottomWidth: 1,
    borderBottomColor: '#1C2333',
  },
  tableHeaderText: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  colChart: {
    width: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colPrice: {
    width: 60,
    alignItems: 'flex-end',
  },
  colQty: {
    width: 45,
    alignItems: 'flex-end',
  },
  colValue: {
    width: 70,
    alignItems: 'flex-end',
  },
  positionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1C2333',
  },
  positionMain: {
    flex: 1,
  },
  positionSymbol: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  positionPrice: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.text,
    fontVariant: ['tabular-nums'],
  },
  changeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 2,
  },
  changeText: {
    fontSize: 11,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  positionQty: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.text,
    fontVariant: ['tabular-nums'],
  },
  positionUnit: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 1,
  },
  positionValue: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
    fontVariant: ['tabular-nums'],
  },
  addMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#1C2333',
    marginTop: 8,
  },
  addMoreText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: '#0A0E17',
    borderTopWidth: 1,
    borderTopColor: '#1C2333',
  },
  ctaButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  ctaText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
});
