/**
 * Binance Public API Service
 * Provides historical kline (candlestick) data and real-time WebSocket price streaming.
 * No API key required.
 */

const BINANCE_REST = 'https://api.binance.com';
const BINANCE_WS = 'wss://stream.binance.com:9443';

export interface KlineData {
  time: number;       // Open time (ms)
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type KlineInterval = '1m' | '5m' | '15m' | '1h' | '4h' | '1d' | '1w';

/**
 * Fetch historical kline (candlestick) data from Binance REST API.
 * GET /api/v3/klines
 */
export async function fetchKlines(
  symbol: string,
  interval: KlineInterval = '1h',
  limit: number = 168
): Promise<KlineData[]> {
  const pair = `${symbol.toUpperCase()}USDT`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(
      `${BINANCE_REST}/api/v3/klines?symbol=${pair}&interval=${interval}&limit=${limit}`,
      { signal: controller.signal }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Binance klines error: ${response.status}`);
    }

    const raw: any[][] = await response.json();

    return raw.map((k) => ({
      time: k[0],
      open: parseFloat(k[1]),
      high: parseFloat(k[2]),
      low: parseFloat(k[3]),
      close: parseFloat(k[4]),
      volume: parseFloat(k[5]),
    }));
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      console.warn(`[BinanceService] Klines timeout for ${symbol}`);
    } else {
      console.warn(`[BinanceService] Klines error for ${symbol}:`, error.message);
    }
    return [];
  }
}

/**
 * Get kline data for a chart time period.
 * Returns appropriate interval + limit for each period.
 */
export function getKlineParams(period: '1D' | '1W' | '1M' | '3M' | '1Y'): {
  interval: KlineInterval;
  limit: number;
} {
  switch (period) {
    case '1D':
      return { interval: '5m', limit: 288 };   // 5-min candles, 24h
    case '1W':
      return { interval: '1h', limit: 168 };   // 1h candles, 7 days
    case '1M':
      return { interval: '4h', limit: 180 };   // 4h candles, 30 days
    case '3M':
      return { interval: '1d', limit: 90 };    // daily candles, 90 days
    case '1Y':
      return { interval: '1w', limit: 52 };    // weekly candles, 1 year
    default:
      return { interval: '1h', limit: 168 };
  }
}

/**
 * Format kline timestamps into readable labels based on period.
 */
export function formatKlineLabel(timestamp: number, period: '1D' | '1W' | '1M' | '3M' | '1Y'): string {
  const date = new Date(timestamp);

  switch (period) {
    case '1D':
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    case '1W':
      return date.toLocaleDateString('en-US', { weekday: 'short', hour: 'numeric', hour12: true });
    case '1M':
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    case '3M':
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    case '1Y':
      return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    default:
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
}

export interface PriceStreamEvent {
  symbol: string;
  price: number;
  timestamp: number;
}

/**
 * Create a WebSocket connection for real-time price streaming.
 * Uses Binance combined streams: wss://stream.binance.com:9443/stream?streams=...
 *
 * @param symbols Array of crypto symbols (e.g. ['BTC', 'ETH'])
 * @param onPrice Callback fired on each price update
 * @returns Cleanup function to close the WebSocket
 */
export function createPriceStream(
  symbols: string[],
  onPrice: (event: PriceStreamEvent) => void
): () => void {
  if (symbols.length === 0) return () => {};

  // Build combined stream URL: btcusdt@trade/ethusdt@trade/...
  const streams = symbols
    .map((s) => `${s.toLowerCase()}usdt@trade`)
    .join('/');

  const url = `${BINANCE_WS}/stream?streams=${streams}`;

  let ws: WebSocket | null = null;
  let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  let closed = false;

  function connect() {
    if (closed) return;

    try {
      ws = new WebSocket(url);

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          const data = msg.data;
          if (data && data.p && data.s) {
            // Extract symbol from pair (BTCUSDT -> BTC)
            const pairSymbol = data.s.replace('USDT', '');
            onPrice({
              symbol: pairSymbol,
              price: parseFloat(data.p),
              timestamp: data.T || Date.now(),
            });
          }
        } catch {
          // Ignore parse errors
        }
      };

      ws.onerror = () => {
        // Will trigger onclose, which handles reconnection
      };

      ws.onclose = () => {
        if (!closed) {
          // Reconnect after 3 seconds
          reconnectTimeout = setTimeout(connect, 3000);
        }
      };
    } catch {
      if (!closed) {
        reconnectTimeout = setTimeout(connect, 3000);
      }
    }
  }

  connect();

  // Return cleanup function
  return () => {
    closed = true;
    if (reconnectTimeout) clearTimeout(reconnectTimeout);
    if (ws) {
      ws.onclose = null;
      ws.close();
    }
  };
}

export default {
  fetchKlines,
  getKlineParams,
  formatKlineLabel,
  createPriceStream,
};
