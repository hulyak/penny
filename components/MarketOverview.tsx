import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import {
  TrendingUp,
  TrendingDown,
  RefreshCw,
  DollarSign,
  BarChart2,
  Bitcoin,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { getMarketOverview, MarketOverviewData, PriceResult } from '@/lib/priceService';

interface MarketItemProps {
  label: string;
  symbol: string;
  data: PriceResult | null;
  icon: React.ReactNode;
  formatPrice?: (price: number) => string;
}

function MarketItem({ label, symbol, data, icon, formatPrice }: MarketItemProps) {
  const isPositive = (data?.changePercent ?? 0) >= 0;

  const displayPrice = data?.price
    ? (formatPrice ? formatPrice(data.price) : `$${data.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
    : '--';

  return (
    <View style={styles.marketItem}>
      <View style={styles.marketItemLeft}>
        <View style={[styles.iconWrapper, { backgroundColor: isPositive ? Colors.successMuted : Colors.dangerMuted }]}>
          {icon}
        </View>
        <View>
          <Text style={styles.marketLabel}>{label}</Text>
          <Text style={styles.marketSymbol}>{symbol}</Text>
        </View>
      </View>
      <View style={styles.marketItemRight}>
        <Text style={styles.marketPrice}>{displayPrice}</Text>
        {data?.changePercent !== undefined && (
          <View style={[styles.changeBadge, { backgroundColor: isPositive ? Colors.successMuted : Colors.dangerMuted }]}>
            {isPositive ? (
              <TrendingUp size={10} color={Colors.success} />
            ) : (
              <TrendingDown size={10} color={Colors.danger} />
            )}
            <Text style={[styles.changePercent, { color: isPositive ? Colors.success : Colors.danger }]}>
              {isPositive ? '+' : ''}{data.changePercent.toFixed(2)}%
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

interface MarketOverviewProps {
  onPress?: () => void;
}

export function MarketOverview({ onPress }: MarketOverviewProps) {
  const [marketData, setMarketData] = useState<MarketOverviewData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchMarketData = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getMarketOverview();
      setMarketData(data);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to fetch market data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMarketData();
    // Refresh every 5 minutes
    const interval = setInterval(fetchMarketData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchMarketData]);

  const formatIndexPrice = (price: number) => {
    return price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatCryptoPrice = (price: number) => {
    if (price >= 1000) {
      return `$${price.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    }
    return `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getRelativeTime = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    return `${diffHours}h ago`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Markets</Text>
        <Pressable
          onPress={fetchMarketData}
          style={styles.refreshButton}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={Colors.accent} />
          ) : (
            <RefreshCw size={16} color={Colors.accent} />
          )}
        </Pressable>
      </View>

      {lastUpdated && (
        <Text style={styles.lastUpdated}>Updated {getRelativeTime(lastUpdated)}</Text>
      )}

      <View style={styles.marketGrid}>
        {/* Indices (using ETF proxies for reliability) */}
        <MarketItem
          label="S&P 500"
          symbol="SPY"
          data={marketData?.indices.sp500 ?? null}
          icon={<BarChart2 size={16} color={marketData?.indices.sp500?.changePercent && marketData.indices.sp500.changePercent >= 0 ? Colors.success : Colors.danger} />}
          formatPrice={formatIndexPrice}
        />
        <MarketItem
          label="NASDAQ"
          symbol="QQQ"
          data={marketData?.indices.nasdaq ?? null}
          icon={<BarChart2 size={16} color={marketData?.indices.nasdaq?.changePercent && marketData.indices.nasdaq.changePercent >= 0 ? Colors.success : Colors.danger} />}
          formatPrice={formatIndexPrice}
        />

        {/* Commodities */}
        <MarketItem
          label="Gold"
          symbol="XAU/USD"
          data={marketData?.commodities.gold ?? null}
          icon={<DollarSign size={16} color={marketData?.commodities.gold?.changePercent && marketData.commodities.gold.changePercent >= 0 ? Colors.success : Colors.danger} />}
        />

        {/* Crypto */}
        <MarketItem
          label="Bitcoin"
          symbol="BTC"
          data={marketData?.crypto.bitcoin ?? null}
          icon={<Bitcoin size={16} color={marketData?.crypto.bitcoin?.changePercent && marketData.crypto.bitcoin.changePercent >= 0 ? Colors.success : Colors.danger} />}
          formatPrice={formatCryptoPrice}
        />
        <MarketItem
          label="Ethereum"
          symbol="ETH"
          data={marketData?.crypto.ethereum ?? null}
          icon={<Bitcoin size={16} color={marketData?.crypto.ethereum?.changePercent && marketData.crypto.ethereum.changePercent >= 0 ? Colors.success : Colors.danger} />}
          formatPrice={formatCryptoPrice}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 16,
    marginTop: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  refreshButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.accentMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lastUpdated: {
    fontSize: 11,
    color: Colors.textMuted,
    marginBottom: 12,
  },
  marketGrid: {
    gap: 8,
  },
  marketItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  marketItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  marketLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  marketSymbol: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  marketItemRight: {
    alignItems: 'flex-end',
  },
  marketPrice: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  changeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 4,
  },
  changePercent: {
    fontSize: 11,
    fontWeight: '600',
  },
});
