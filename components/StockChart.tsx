import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, Text, Pressable, Dimensions, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { LineChart } from 'react-native-chart-kit';
import Colors from '@/constants/colors';
import {
  fetchKlines,
  getKlineParams,
  formatKlineLabel,
  createPriceStream,
  KlineData,
} from '@/lib/binanceService';

const screenWidth = Dimensions.get('window').width;

// ─── Stock Chart (TradingView widget) ──────────────────────────────

interface StockChartProps {
  symbol: string;
  height?: number;
  interval?: 'D' | 'W' | 'M' | '1' | '5' | '15' | '60';
  showToolbar?: boolean;
  chartType?: 'line' | 'candle' | 'area';
}

const CHART_TYPE_MAP: Record<string, number> = {
  line: 2,
  candle: 1,
  area: 3,
};

export function StockChart({
  symbol,
  height = 300,
  interval = 'D',
  showToolbar = false,
  chartType = 'line',
}: StockChartProps) {
  const formattedSymbol = formatTradingViewSymbol(symbol);
  const tvStyle = CHART_TYPE_MAP[chartType] || 2;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            background: ${Colors.surface};
            overflow: hidden;
          }
          .tradingview-widget-container {
            width: 100%;
            height: 100%;
          }
        </style>
      </head>
      <body>
        <div class="tradingview-widget-container">
          <div id="tradingview_chart"></div>
          <script type="text/javascript" src="https://s3.tradingview.com/tv.js"></script>
          <script type="text/javascript">
            new TradingView.widget({
              "width": "100%",
              "height": ${height},
              "symbol": "${formattedSymbol}",
              "interval": "${interval}",
              "timezone": "Etc/UTC",
              "theme": "dark",
              "style": "${tvStyle}",
              "locale": "en",
              "toolbar_bg": "${Colors.surface}",
              "enable_publishing": false,
              "hide_top_toolbar": ${!showToolbar},
              "hide_legend": false,
              "hide_side_toolbar": true,
              "allow_symbol_change": false,
              "save_image": false,
              "backgroundColor": "${Colors.surface}",
              "gridColor": "${Colors.border}",
              "container_id": "tradingview_chart"
            });
          </script>
        </div>
      </body>
    </html>
  `;

  return (
    <View style={[styles.container, { height }]}>
      <WebView
        source={{ html }}
        style={[styles.webview, { height }]}
        scrollEnabled={false}
        bounces={false}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        renderLoading={() => (
          <View style={styles.loading}>
            <Text style={styles.loadingText}>Loading chart...</Text>
          </View>
        )}
      />
    </View>
  );
}

// ─── Crypto Chart (Binance klines + WebSocket) ─────────────────────

type CryptoPeriod = '1D' | '1W' | '1M' | '3M' | '1Y';

interface CryptoChartProps {
  symbol: string;
  height?: number;
}

const PERIODS: CryptoPeriod[] = ['1D', '1W', '1M', '3M', '1Y'];

/**
 * Format large price values for the Y-axis.
 */
function formatYLabel(value: string): string {
  const num = parseFloat(value);
  if (isNaN(num)) return value;
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `$${(num / 1_000).toFixed(1)}K`;
  if (num >= 1) return `$${num.toFixed(0)}`;
  return `$${num.toFixed(4)}`;
}

export function CryptoChart({ symbol, height = 280 }: CryptoChartProps) {
  const [period, setPeriod] = useState<CryptoPeriod>('1W');
  const [klines, setKlines] = useState<KlineData[]>([]);
  const [livePrice, setLivePrice] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  // Fetch historical kline data
  const loadKlines = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { interval, limit } = getKlineParams(period);
      const data = await fetchKlines(symbol, interval, limit);
      if (data.length === 0) {
        setError('No chart data available');
      } else {
        setKlines(data);
      }
    } catch {
      setError('Failed to load chart data');
    } finally {
      setIsLoading(false);
    }
  }, [symbol, period]);

  useEffect(() => {
    loadKlines();
  }, [loadKlines]);

  // Connect WebSocket for real-time price streaming
  useEffect(() => {
    if (cleanupRef.current) cleanupRef.current();

    const cleanup = createPriceStream([symbol], (event) => {
      setLivePrice(event.price);
    });

    cleanupRef.current = cleanup;
    return cleanup;
  }, [symbol]);

  // Build chart data from klines
  const closePrices = klines.map((k) => k.close);
  // Append live price as the latest point
  const chartValues =
    closePrices.length > 0 && livePrice
      ? [...closePrices.slice(0, -1), livePrice]
      : closePrices;

  // Build labels — show max 5 to prevent clutter
  const allLabels = klines.map((k) => formatKlineLabel(k.time, period));
  const maxLabels = 5;
  const displayLabels =
    allLabels.length <= maxLabels
      ? allLabels
      : allLabels.map((label, i) => {
          const step = Math.floor(allLabels.length / (maxLabels - 1));
          if (i === 0 || i === allLabels.length - 1 || i % step === 0) {
            return label;
          }
          return '';
        });

  // Determine gain/loss color
  const startPrice = chartValues.length > 0 ? chartValues[0] : 0;
  const endPrice = chartValues.length > 0 ? chartValues[chartValues.length - 1] : 0;
  const isPositive = endPrice >= startPrice;
  const changeAmount = endPrice - startPrice;
  const changePercent = startPrice > 0 ? (changeAmount / startPrice) * 100 : 0;

  const lineColor = isPositive
    ? (opacity = 1) => `rgba(16, 185, 129, ${opacity})`
    : (opacity = 1) => `rgba(239, 68, 68, ${opacity})`;

  const gradientColor = isPositive ? '#10B981' : '#EF4444';

  return (
    <View>
      {/* Period selector */}
      <View style={styles.periodSelector}>
        {PERIODS.map((p) => (
          <Pressable
            key={p}
            style={[styles.periodButton, period === p && styles.periodButtonActive]}
            onPress={() => setPeriod(p)}
          >
            <Text style={[styles.periodText, period === p && styles.periodTextActive]}>
              {p}
            </Text>
          </Pressable>
        ))}
        {livePrice && (
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        )}
      </View>

      {/* Price change summary */}
      {chartValues.length > 1 && (
        <View style={styles.changeSummary}>
          <Text style={[styles.changeAmount, { color: isPositive ? Colors.success : Colors.danger }]}>
            {isPositive ? '+' : ''}{changeAmount >= 1 ? `$${Math.abs(changeAmount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : `$${Math.abs(changeAmount).toFixed(4)}`}
          </Text>
          <Text style={[styles.changePercent, { color: isPositive ? Colors.success : Colors.danger }]}>
            ({isPositive ? '+' : ''}{changePercent.toFixed(2)}%) {period}
          </Text>
        </View>
      )}

      {/* Chart area */}
      <View style={[styles.chartArea, { height }]}>
        {isLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator size="small" color={Colors.primary} />
            <Text style={styles.loadingText}>Loading Binance data...</Text>
          </View>
        ) : error ? (
          <View style={styles.loading}>
            <Text style={styles.loadingText}>{error}</Text>
            <Pressable style={styles.retryButton} onPress={loadKlines}>
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        ) : chartValues.length > 1 ? (
          <LineChart
            data={{
              labels: displayLabels,
              datasets: [{ data: chartValues }],
            }}
            width={screenWidth - 40}
            height={height}
            formatYLabel={formatYLabel}
            chartConfig={{
              backgroundColor: 'transparent',
              backgroundGradientFrom: Colors.surface,
              backgroundGradientTo: Colors.surface,
              decimalPlaces: 0,
              color: lineColor,
              labelColor: () => Colors.textMuted,
              propsForDots: { r: '0' },
              propsForBackgroundLines: {
                strokeDasharray: '6,6',
                stroke: Colors.border,
                strokeWidth: 0.5,
              },
              fillShadowGradient: gradientColor,
              fillShadowGradientOpacity: 0.15,
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
        ) : (
          <View style={styles.loading}>
            <Text style={styles.loadingText}>No data available</Text>
          </View>
        )}
      </View>
    </View>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────

function formatTradingViewSymbol(symbol: string): string {
  const upperSymbol = symbol.toUpperCase();

  const cryptoSymbols = ['BTC', 'ETH', 'SOL', 'ADA', 'DOT', 'DOGE', 'XRP', 'AVAX', 'MATIC', 'LINK'];
  if (cryptoSymbols.includes(upperSymbol)) {
    return `COINBASE:${upperSymbol}USD`;
  }

  if (upperSymbol === 'GOLD' || upperSymbol === 'XAU') return 'TVC:GOLD';
  if (upperSymbol === 'SILVER' || upperSymbol === 'XAG') return 'TVC:SILVER';

  const etfSymbols = ['SPY', 'QQQ', 'VTI', 'VOO', 'VT', 'BND', 'VNQ', 'SCHD', 'IAU', 'GLD'];
  if (etfSymbols.includes(upperSymbol)) return upperSymbol;

  return upperSymbol;
}

// Keep for backward compatibility but no longer used by CryptoChart
export function getCoinGeckoId(symbol: string): string | null {
  const mapping: Record<string, string> = {
    BTC: 'bitcoin',
    ETH: 'ethereum',
    SOL: 'solana',
    ADA: 'cardano',
    DOT: 'polkadot',
    DOGE: 'dogecoin',
    XRP: 'ripple',
    AVAX: 'avalanche-2',
    MATIC: 'matic-network',
    LINK: 'chainlink',
    UNI: 'uniswap',
    ATOM: 'cosmos',
    LTC: 'litecoin',
    BNB: 'binancecoin',
    SHIB: 'shiba-inu',
  };

  return mapping[symbol.toUpperCase()] || null;
}

// ─── Styles ─────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: Colors.surface,
  },
  webview: {
    backgroundColor: Colors.surface,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    gap: 8,
  },
  loadingText: {
    color: Colors.textMuted,
    fontSize: 14,
  },
  periodSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 8,
    gap: 4,
  },
  periodButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  periodButtonActive: {
    backgroundColor: Colors.primary,
  },
  periodText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  periodTextActive: {
    color: Colors.text,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 'auto',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: Colors.successMuted,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.success,
  },
  liveText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.success,
  },
  changeSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 8,
    paddingBottom: 4,
  },
  changeAmount: {
    fontSize: 15,
    fontWeight: '700',
  },
  changePercent: {
    fontSize: 13,
    fontWeight: '500',
  },
  chartArea: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    overflow: 'hidden',
  },
  chart: {
    borderRadius: 12,
    marginLeft: -8,
  },
  retryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    marginTop: 8,
  },
  retryText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
});
