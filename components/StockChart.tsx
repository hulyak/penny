import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { WebView } from 'react-native-webview';
import Colors from '@/constants/colors';

interface StockChartProps {
  symbol: string;
  height?: number;
  interval?: 'D' | 'W' | 'M' | '1' | '5' | '15' | '60';
  showToolbar?: boolean;
}

export function StockChart({
  symbol,
  height = 300,
  interval = 'D',
  showToolbar = false
}: StockChartProps) {
  // Format symbol for TradingView (e.g., AAPL -> NASDAQ:AAPL)
  const formattedSymbol = formatTradingViewSymbol(symbol);

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
              "style": "2",
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

// Crypto chart using CoinGecko widget
interface CryptoChartProps {
  coinId: string;
  height?: number;
}

export function CryptoChart({ coinId, height = 300 }: CryptoChartProps) {
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
            display: flex;
            justify-content: center;
            align-items: center;
          }
        </style>
      </head>
      <body>
        <coingecko-coin-price-chart-widget
          coin-id="${coinId}"
          currency="usd"
          height="${height}"
          width="100%"
          locale="en"
          background-color="${Colors.surface}"
        ></coingecko-coin-price-chart-widget>
        <script src="https://widgets.coingecko.com/coingecko-coin-price-chart-widget.js"></script>
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

// Helper to format symbols for TradingView
function formatTradingViewSymbol(symbol: string): string {
  const upperSymbol = symbol.toUpperCase();

  // Common crypto symbols
  const cryptoSymbols = ['BTC', 'ETH', 'SOL', 'ADA', 'DOT', 'DOGE', 'XRP', 'AVAX', 'MATIC', 'LINK'];
  if (cryptoSymbols.includes(upperSymbol)) {
    return `COINBASE:${upperSymbol}USD`;
  }

  // Gold and commodities
  if (upperSymbol === 'GOLD' || upperSymbol === 'XAU') {
    return 'TVC:GOLD';
  }
  if (upperSymbol === 'SILVER' || upperSymbol === 'XAG') {
    return 'TVC:SILVER';
  }

  // Common ETFs - use their standard symbols
  const etfSymbols = ['SPY', 'QQQ', 'VTI', 'VOO', 'VT', 'BND', 'VNQ', 'SCHD', 'IAU', 'GLD'];
  if (etfSymbols.includes(upperSymbol)) {
    return upperSymbol;
  }

  // Default: assume it's a US stock
  return upperSymbol;
}

// Map common crypto symbols to CoinGecko IDs
export function getCoinGeckoId(symbol: string): string | null {
  const mapping: Record<string, string> = {
    'BTC': 'bitcoin',
    'ETH': 'ethereum',
    'SOL': 'solana',
    'ADA': 'cardano',
    'DOT': 'polkadot',
    'DOGE': 'dogecoin',
    'XRP': 'ripple',
    'AVAX': 'avalanche-2',
    'MATIC': 'matic-network',
    'LINK': 'chainlink',
    'UNI': 'uniswap',
    'ATOM': 'cosmos',
    'LTC': 'litecoin',
  };

  return mapping[symbol.toUpperCase()] || null;
}

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
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.surface,
  },
  loadingText: {
    color: Colors.textMuted,
    fontSize: 14,
  },
});
