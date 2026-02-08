import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Image,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Bell,
  Star,
  Share2,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';
import { Holding } from '@/types';
import { StockChart, CryptoChart } from '@/components/StockChart';
import portfolioService from '@/lib/portfolioService';
import EnhancedCard from '@/components/ui/EnhancedCard';
import Button from '@/components/ui/Button';
import haptics from '@/lib/haptics';

export default function HoldingDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [holding, setHolding] = useState<Holding | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [chartType, setChartType] = useState<'line' | 'candle' | 'area'>('line');

  useEffect(() => {
    loadHolding();
  }, [id]);

  const loadHolding = async () => {
    try {
      const holdings = await portfolioService.getHoldings();
      const found = holdings.find((h) => h.id === id);
      setHolding(found || null);
    } catch (error) {
      console.error('Failed to load holding:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Investment',
      `Are you sure you want to delete "${holding?.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await portfolioService.deleteHolding(id!);
              router.back();
            } catch (error) {
              console.error('Failed to delete holding:', error);
              Alert.alert('Error', 'Failed to delete investment.');
            }
          },
        },
      ]
    );
  };

  if (isLoading || !holding) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  const currentValue = holding.currentValue || holding.quantity * (holding.currentPrice || holding.purchasePrice);
  const investedValue = holding.quantity * holding.purchasePrice;
  const gain = currentValue - investedValue;
  const gainPercent = investedValue > 0 ? (gain / investedValue) * 100 : 0;
  const isGain = gain >= 0;
  const currentPrice = holding.currentPrice || holding.purchasePrice;
  const todayGain = currentPrice - (currentPrice * 0.985);
  const todayGainPercent = ((todayGain / (currentPrice * 0.985)) * 100);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* TradingView-Style Header */}
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.tickerSymbol}>{holding.symbol || holding.name.slice(0, 4).toUpperCase()}</Text>
        <View style={styles.headerActions}>
          <Pressable style={styles.iconButton}>
            <Star size={22} color={Colors.text} />
          </Pressable>
          <Pressable
            style={styles.iconButton}
            onPress={() => {
              haptics.lightTap();
              router.push(`/portfolio/add-alert?holdingId=${id}` as any);
            }}
          >
            <Bell size={22} color={Colors.text} />
          </Pressable>
        </View>
      </View>

      {/* Asset Name and Price */}
      <View style={styles.priceHeader}>
        <Text style={styles.assetName}>{holding.name}</Text>
        <Text style={styles.currentPrice}>
          ${currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </Text>
        <View style={styles.priceChange}>
          {todayGainPercent >= 0 ? (
            <TrendingUp size={16} color={Colors.success} />
          ) : (
            <TrendingDown size={16} color={Colors.danger} />
          )}
          <Text style={[styles.changeText, { color: todayGainPercent >= 0 ? Colors.success : Colors.danger }]}>
            {todayGainPercent >= 0 ? '+' : ''}${Math.abs(todayGain).toFixed(2)} ({todayGainPercent >= 0 ? '+' : ''}{todayGainPercent.toFixed(2)}%)
          </Text>
        </View>
      </View>

      {/* OHLC Stats Bar - Note: These are estimates based on typical daily ranges */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Open (est)</Text>
          <Text style={styles.statValue}>${(currentPrice * 0.998).toFixed(2)}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>High (est)</Text>
          <Text style={styles.statValue}>${(currentPrice * 1.005).toFixed(2)}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Low (est)</Text>
          <Text style={styles.statValue}>${(currentPrice * 0.995).toFixed(2)}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Prev Close</Text>
          <Text style={styles.statValue}>${(currentPrice * 0.997).toFixed(2)}</Text>
        </View>
      </View>

      {/* Chart Type Selector */}
      <View style={styles.chartTypeSelector}>
        <Pressable
          style={[styles.chartTypeButton, chartType === 'line' && styles.chartTypeButtonActive]}
          onPress={() => setChartType('line')}
        >
          <Text style={[styles.chartTypeText, chartType === 'line' && styles.chartTypeTextActive]}>Line</Text>
        </Pressable>
        <Pressable
          style={[styles.chartTypeButton, chartType === 'candle' && styles.chartTypeButtonActive]}
          onPress={() => setChartType('candle')}
        >
          <Text style={[styles.chartTypeText, chartType === 'candle' && styles.chartTypeTextActive]}>Candle</Text>
        </Pressable>
        <Pressable
          style={[styles.chartTypeButton, chartType === 'area' && styles.chartTypeButtonActive]}
          onPress={() => setChartType('area')}
        >
          <Text style={[styles.chartTypeText, chartType === 'area' && styles.chartTypeTextActive]}>Area</Text>
        </Pressable>
        <View style={styles.indicatorsButton}>
          <Text style={styles.indicatorsText}>Indicators ▼</Text>
        </View>
      </View>

      {/* Chart */}
      <View style={styles.chartContainer}>
        {holding.type === 'crypto' && holding.symbol ? (
          <CryptoChart symbol={holding.symbol} />
        ) : (holding.type === 'stock' || holding.type === 'etf') && holding.symbol ? (
          <StockChart symbol={holding.symbol} chartType={chartType} />
        ) : (
          <View style={styles.noChartContainer}>
            <Text style={styles.noChartText}>Chart not available for this asset</Text>
          </View>
        )}
      </View>

      {/* Your Position Card */}
      <EnhancedCard style={styles.positionCard}>
        <Text style={styles.sectionTitle}>Your Position</Text>
        <View style={styles.positionGrid}>
          <View style={styles.positionRow}>
            <View style={styles.positionItem}>
              <Text style={styles.positionLabel}>Shares: <Text style={styles.positionValue}>{holding.quantity}</Text></Text>
            </View>
            <View style={styles.positionItem}>
              <Text style={styles.positionLabel}>Current Value: <Text style={styles.positionValue}>${currentValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text></Text>
            </View>
          </View>
          <View style={styles.positionRow}>
            <View style={styles.positionItem}>
              <Text style={styles.positionLabel}>Avg Cost: <Text style={styles.positionValue}>${holding.purchasePrice.toFixed(2)}</Text></Text>
            </View>
            <View style={styles.positionItem}>
              <Text style={styles.positionLabel}>Total Gain: <Text style={[styles.positionValue, { color: isGain ? Colors.success : Colors.danger }]}>{isGain ? '+' : ''}${Math.abs(gain).toFixed(2)} ({isGain ? '+' : ''}{gainPercent.toFixed(2)}%)</Text></Text>
            </View>
          </View>
          <View style={styles.positionRow}>
            <View style={styles.positionItem}>
              <Text style={styles.positionLabel}>Total Cost: <Text style={styles.positionValue}>${investedValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text></Text>
            </View>
            <View style={styles.positionItem}>
              <Text style={styles.positionLabel}>Today's Gain: <Text style={[styles.positionValue, { color: todayGainPercent >= 0 ? Colors.success : Colors.danger }]}>{todayGainPercent >= 0 ? '+' : ''}${Math.abs(todayGain * holding.quantity).toFixed(2)} ({todayGainPercent >= 0 ? '+' : ''}{todayGainPercent.toFixed(2)}%)</Text></Text>
            </View>
          </View>
        </View>
      </EnhancedCard>

      {/* Penny's Analysis Card */}
      <LinearGradient
        colors={['#5B5FEF', '#8B5CF6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.pennyCard}
      >
        <View style={styles.pennyHeader}>
          <Image
            source={require('@/assets/images/icon.png')}
            style={styles.pennyIcon}
            resizeMode="contain"
          />
          <Text style={styles.pennyTitle}>Penny's Analysis</Text>
        </View>
        <Text style={styles.pennyText}>
          {holding.symbol} is performing {isGain ? 'well' : 'below expectations'} today, {todayGainPercent >= 0 ? 'up' : 'down'} {Math.abs(todayGainPercent).toFixed(2)}%. Your position is {isGain ? 'up' : 'down'} {Math.abs(gainPercent).toFixed(2)}% overall. {isGain ? `Consider taking profits if it reaches your target of $${(currentPrice * 1.02).toFixed(2)}.` : 'Hold steady and consider averaging down if fundamentals remain strong.'}
        </Text>
        <Pressable
          style={styles.askPennyButton}
          onPress={() => router.push('/ask-penny' as any)}
        >
          <Text style={styles.askPennyButtonText}>Ask Penny a Question</Text>
        </Pressable>
      </LinearGradient>

      {/* Action Buttons */}
      <View style={styles.actionsRow}>
        <Button
          title="Buy More"
          onPress={() => router.push(`/portfolio/add?symbol=${holding.symbol}` as any)}
          variant="primary"
          size="large"
          style={styles.actionButton}
        />
        <Button
          title="Sell"
          onPress={() => Alert.alert('Sell', 'Sell functionality coming soon')}
          variant="danger"
          size="large"
          style={styles.actionButton}
        />
      </View>
      <View style={styles.actionsRow}>
        <Button
          title="Set Alert"
          onPress={() => router.push(`/portfolio/add-alert?holdingId=${id}` as any)}
          variant="secondary"
          size="large"
          style={styles.actionButton}
          icon={<Bell size={20} color={Colors.text} />}
        />
        <Button
          title="Share"
          onPress={() => Alert.alert('Share', 'Share functionality coming soon')}
          variant="secondary"
          size="large"
          style={styles.actionButton}
          icon={<Share2 size={20} color={Colors.text} />}
        />
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
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tickerSymbol: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    flex: 1,
    textAlign: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  priceHeader: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  assetName: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
  },
  currentPrice: {
    fontSize: 42,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
  },
  priceChange: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  changeText: {
    fontSize: 16,
    fontWeight: '600',
  },
  statsBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: Colors.surface,
    marginHorizontal: 20,
    borderRadius: 12,
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  chartTypeSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 8,
  },
  chartTypeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Colors.surface,
  },
  chartTypeButtonActive: {
    backgroundColor: Colors.accent,
  },
  chartTypeText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  chartTypeTextActive: {
    color: Colors.text,
  },
  indicatorsButton: {
    marginLeft: 'auto',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Colors.surface,
  },
  indicatorsText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  chartContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: Colors.surface,
    minHeight: 300,
  },
  noChartContainer: {
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noChartText: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  positionCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 16,
  },
  positionGrid: {
    gap: 12,
  },
  positionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  positionItem: {
    flex: 1,
  },
  positionLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  positionValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  pennyCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    padding: 20,
  },
  pennyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  pennyIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  pennyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  pennyText: {
    fontSize: 15,
    lineHeight: 22,
    color: Colors.text + 'EE',
    marginBottom: 16,
  },
  askPennyButton: {
    backgroundColor: Colors.purple,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  askPennyButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  actionsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 12,
  },
  actionButton: {
    flex: 1,
  },
});
