import AsyncStorage from '@react-native-async-storage/async-storage';
import { AssetType } from '@/types';

const FINNHUB_API_KEY = process.env.EXPO_PUBLIC_FINNHUB_API_KEY;
const GOLD_API_KEY = process.env.EXPO_PUBLIC_GOLD_API_KEY;

const CACHE_KEY = 'penny_price_cache';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const COMMODITY_CACHE_DURATION = 60 * 60 * 1000; // 1 hour for commodities

// Retry configuration
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second

interface PriceCache {
  [symbol: string]: {
    price: number;
    change: number;
    changePercent: number;
    timestamp: number;
  };
}

export interface PriceResult {
  price: number;
  change?: number;
  changePercent?: number;
  source: string;
  timestamp: string;
}

// In-memory cache for current session
let priceCache: PriceCache = {};

// Load cache from storage
async function loadCache(): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(CACHE_KEY);
    if (stored) {
      priceCache = JSON.parse(stored);
    }
  } catch (error) {
    console.error('[PriceService] Failed to load cache:', error);
  }
}

// Save cache to storage
async function saveCache(): Promise<void> {
  try {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(priceCache));
  } catch (error) {
    console.error('[PriceService] Failed to save cache:', error);
  }
}

// Check if cache is valid
function isCacheValid(symbol: string): boolean {
  const cached = priceCache[symbol];
  if (!cached) return false;
  return Date.now() - cached.timestamp < CACHE_DURATION;
}

// Get cached price
function getCachedPrice(symbol: string): PriceResult | null {
  const cached = priceCache[symbol];
  if (!cached || !isCacheValid(symbol)) return null;
  return {
    price: cached.price,
    change: cached.change,
    changePercent: cached.changePercent,
    source: 'cache',
    timestamp: new Date(cached.timestamp).toISOString(),
  };
}

// Cache a price
function cachePrice(symbol: string, price: number, change?: number, changePercent?: number): void {
  priceCache[symbol] = {
    price,
    change: change || 0,
    changePercent: changePercent || 0,
    timestamp: Date.now(),
  };
  saveCache();
}

/**
 * Retry with exponential backoff
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  retries: number = MAX_RETRIES,
  delay: number = INITIAL_RETRY_DELAY
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (retries <= 1) {
      throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, delay));
    return retryWithBackoff(fn, retries - 1, delay * 2);
  }
}

/**
 * Fetch stock price from Yahoo Finance (primary for US stocks)
 */
async function fetchYahooFinancePrice(symbol: string): Promise<PriceResult | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`,
      { signal: controller.signal }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Yahoo Finance API error: ${response.status}`);
    }

    const data = await response.json();
    const result = data.chart?.result?.[0];

    if (result && result.meta?.regularMarketPrice) {
      const price = result.meta.regularMarketPrice;
      const previousClose = result.meta.previousClose || result.meta.chartPreviousClose || price;
      const change = price - previousClose;
      const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0;

      cachePrice(symbol, price, change, changePercent);

      return {
        price,
        change,
        changePercent,
        source: 'yahoo',
        timestamp: new Date().toISOString(),
      };
    }

    return null;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.warn(`[PriceService] Yahoo Finance timeout for ${symbol}`);
    } else {
      console.warn(`[PriceService] Yahoo Finance error for ${symbol}:`, error.message || error);
    }
    return null;
  }
}

/**
 * Fetch stock price from Finnhub (fallback)
 */
async function fetchFinnhubPrice(symbol: string): Promise<PriceResult | null> {
  if (!FINNHUB_API_KEY) {
    console.warn('[PriceService] Finnhub API key not configured');
    return null;
  }

  try {
    const response = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${FINNHUB_API_KEY}`
    );

    if (!response.ok) {
      throw new Error(`Finnhub API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.c && data.c > 0) {
      const price = data.c; // Current price
      const change = data.d; // Change
      const changePercent = data.dp; // Change percent

      cachePrice(symbol, price, change, changePercent);

      return {
        price,
        change,
        changePercent,
        source: 'finnhub',
        timestamp: new Date().toISOString(),
      };
    }

    return null;
  } catch (error) {
    console.error(`[PriceService] Finnhub error for ${symbol}:`, error);
    return null;
  }
}

/**
 * Fetch stock price with Yahoo Finance as primary and Finnhub as fallback
 */
async function fetchStockPrice(symbol: string): Promise<PriceResult | null> {
  const upperSymbol = symbol.toUpperCase();
  const fallbackPrice = STOCK_FALLBACK_PRICES[upperSymbol];

  // Try Yahoo Finance first (primary)
  try {
    const yahooResult = await retryWithBackoff(() => fetchYahooFinancePrice(symbol), 2);
    if (yahooResult) {
      return yahooResult;
    }
  } catch (error) {
    console.warn(`[PriceService] Yahoo Finance failed for ${symbol}, trying Finnhub`);
  }

  // Fallback to Finnhub
  try {
    const finnhubResult = await retryWithBackoff(() => fetchFinnhubPrice(symbol), 2);
    if (finnhubResult) {
      return finnhubResult;
    }
  } catch (error) {
    console.warn(`[PriceService] Finnhub failed for ${symbol}`);
  }

  // Use fallback price if available
  if (fallbackPrice) {
    console.warn(`[PriceService] Using fallback price for ${symbol}`);
    return {
      price: fallbackPrice,
      source: 'fallback',
      timestamp: new Date().toISOString(),
    };
  }

  console.error(`[PriceService] All sources failed for ${symbol}, no fallback available`);
  return null;
}

// Fallback crypto prices (approximate, updated periodically)
const CRYPTO_FALLBACK_PRICES: Record<string, number> = {
  BTC: 95000,
  ETH: 3200,
  USDT: 1,
  BNB: 600,
  XRP: 2.5,
  ADA: 0.9,
  DOGE: 0.35,
  SOL: 200,
  DOT: 7,
  MATIC: 0.5,
  SHIB: 0.00002,
  LTC: 120,
  AVAX: 35,
  LINK: 20,
  UNI: 12,
};

/**
 * Fetch cryptocurrency price from Binance public API (no API key required)
 * Uses the /api/v3/ticker/24hr endpoint for price + 24h change data
 */
async function fetchBinancePrice(symbol: string): Promise<PriceResult | null> {
  const upperSymbol = symbol.toUpperCase();
  // Binance uses trading pairs like BTCUSDT
  const binanceSymbol = `${upperSymbol}USDT`;

  // USDT is always $1
  if (upperSymbol === 'USDT') {
    return {
      price: 1,
      change: 0,
      changePercent: 0,
      source: 'binance',
      timestamp: new Date().toISOString(),
    };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(
      `https://api.binance.com/api/v3/ticker/24hr?symbol=${binanceSymbol}`,
      { signal: controller.signal }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Binance API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.lastPrice) {
      const price = parseFloat(data.lastPrice);
      const change = parseFloat(data.priceChange) || 0;
      const changePercent = parseFloat(data.priceChangePercent) || 0;

      cachePrice(symbol, price, change, changePercent);

      return {
        price,
        change,
        changePercent,
        source: 'binance',
        timestamp: new Date().toISOString(),
      };
    }

    return null;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.warn(`[PriceService] Binance timeout for ${symbol}`);
    } else {
      console.warn(`[PriceService] Binance error for ${symbol}:`, error.message || error);
    }
    return null;
  }
}

/**
 * Fetch cryptocurrency price from CoinGecko (fallback)
 */
async function fetchCoinGeckoPrice(symbol: string): Promise<PriceResult | null> {
  // Map common symbols to CoinGecko IDs
  const symbolToId: Record<string, string> = {
    BTC: 'bitcoin',
    ETH: 'ethereum',
    USDT: 'tether',
    BNB: 'binancecoin',
    XRP: 'ripple',
    ADA: 'cardano',
    DOGE: 'dogecoin',
    SOL: 'solana',
    DOT: 'polkadot',
    MATIC: 'matic-network',
    SHIB: 'shiba-inu',
    LTC: 'litecoin',
    AVAX: 'avalanche-2',
    LINK: 'chainlink',
    UNI: 'uniswap',
  };

  const upperSymbol = symbol.toUpperCase();
  const coinId = symbolToId[upperSymbol] || symbol.toLowerCase();

  try {
    const response = await retryWithBackoff(async () => {
      const res = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd&include_24hr_change=true`
      );

      if (res.status === 429) {
        console.warn(`[PriceService] CoinGecko rate limited, will retry...`);
        throw new Error('Rate limited');
      }

      if (!res.ok) {
        throw new Error(`CoinGecko API error: ${res.status}`);
      }

      return res;
    }, 2, 2000);

    const data = await response.json();
    const coinData = data[coinId];

    if (coinData && coinData.usd) {
      const price = coinData.usd;
      const changePercent = coinData.usd_24h_change || 0;
      const change = (price * changePercent) / 100;

      cachePrice(symbol, price, change, changePercent);

      return {
        price,
        change,
        changePercent,
        source: 'coingecko',
        timestamp: new Date().toISOString(),
      };
    }

    return null;
  } catch (error) {
    const errorMessage = String(error);
    if (!errorMessage.includes('Rate limited')) {
      console.warn(`[PriceService] CoinGecko error for ${symbol}:`, error);
    }
    return null;
  }
}

/**
 * Fetch cryptocurrency price with Binance as primary and CoinGecko as fallback
 */
async function fetchCryptoPrice(symbol: string): Promise<PriceResult | null> {
  const upperSymbol = symbol.toUpperCase();
  const fallbackPrice = CRYPTO_FALLBACK_PRICES[upperSymbol];

  // Try Binance first (primary — no API key needed, high rate limits)
  try {
    const binanceResult = await retryWithBackoff(() => fetchBinancePrice(symbol), 2);
    if (binanceResult) {
      return binanceResult;
    }
  } catch (error) {
    console.warn(`[PriceService] Binance failed for ${symbol}, trying CoinGecko`);
  }

  // Fallback to CoinGecko
  try {
    const coinGeckoResult = await fetchCoinGeckoPrice(symbol);
    if (coinGeckoResult) {
      return coinGeckoResult;
    }
  } catch (error) {
    console.warn(`[PriceService] CoinGecko failed for ${symbol}`);
  }

  // Use hardcoded fallback price if available
  if (fallbackPrice) {
    console.warn(`[PriceService] Using fallback price for ${symbol}`);
    return {
      price: fallbackPrice,
      source: 'fallback',
      timestamp: new Date().toISOString(),
    };
  }

  console.error(`[PriceService] All crypto sources failed for ${symbol}`);
  return null;
}

// Fallback prices for commodities (approximate - updated Feb 2025)
const COMMODITY_FALLBACK_PRICES: Record<string, number> = {
  GOLD: 2850,   // Gold per oz
  SILVER: 32,   // Silver per oz
  PLATINUM: 1000, // Platinum per oz
};

// Fallback prices for common stocks/ETFs (approximate - updated Feb 2025)
const STOCK_FALLBACK_PRICES: Record<string, number> = {
  AAPL: 230,
  MSFT: 410,
  GOOGL: 185,
  AMZN: 225,
  NVDA: 130,
  TSLA: 380,
  META: 600,
  SPY: 600,
  QQQ: 520,
  VTI: 290,
  VOO: 550,
  DIA: 440,
  JPM: 250,
  V: 320,
  JNJ: 155,
  WMT: 95,
};

/**
 * Fetch commodity price (gold, silver, platinum)
 */
async function fetchCommodityPrice(commodity: 'GOLD' | 'SILVER' | 'PLATINUM'): Promise<PriceResult | null> {
  const symbolMap: Record<string, string> = {
    GOLD: 'XAU',
    SILVER: 'XAG',
    PLATINUM: 'XPT',
  };

  const metalSymbol = symbolMap[commodity];
  const fallbackPrice = COMMODITY_FALLBACK_PRICES[commodity];

  // Try Yahoo Finance first (more reliable without API key)
  try {
    const yahooSymbol = commodity === 'GOLD' ? 'GC=F' : commodity === 'SILVER' ? 'SI=F' : 'PL=F';
    const yahooResult = await fetchYahooFinancePrice(yahooSymbol);
    if (yahooResult) {
      cachePrice(commodity, yahooResult.price, yahooResult.change, yahooResult.changePercent);
      return {
        ...yahooResult,
        source: 'yahoo',
      };
    }
  } catch (yahooError) {
    console.warn(`[PriceService] Yahoo failed for ${commodity}`);
  }

  // Try Gold API as secondary (requires API key)
  if (GOLD_API_KEY) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(
        `https://www.goldapi.io/api/${metalSymbol}/USD`,
        {
          headers: { 'x-access-token': GOLD_API_KEY },
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        if (data.price) {
          cachePrice(commodity, data.price, data.ch, data.chp);
          return {
            price: data.price,
            change: data.ch,
            changePercent: data.chp,
            source: 'goldapi',
            timestamp: new Date().toISOString(),
          };
        }
      }
    } catch (error) {
      // Silently handle - will use fallback
    }
  }

  // Return fallback price
  console.warn(`[PriceService] Using fallback price for ${commodity}`);
  return {
    price: fallbackPrice,
    source: 'fallback',
    timestamp: new Date().toISOString(),
  };
}

/**
 * Fetch gold price
 */
async function fetchGoldPrice(): Promise<PriceResult | null> {
  return fetchCommodityPrice('GOLD');
}

/**
 * Fetch silver price
 */
async function fetchSilverPrice(): Promise<PriceResult | null> {
  return fetchCommodityPrice('SILVER');
}

/**
 * Fetch platinum price
 */
async function fetchPlatinumPrice(): Promise<PriceResult | null> {
  return fetchCommodityPrice('PLATINUM');
}

/**
 * Search for stock symbols using Finnhub
 */
export async function searchSymbols(query: string): Promise<{ symbol: string; description: string }[]> {
  if (!FINNHUB_API_KEY || query.length < 1) {
    return [];
  }

  try {
    const response = await fetch(
      `https://finnhub.io/api/v1/search?q=${encodeURIComponent(query)}&token=${FINNHUB_API_KEY}`
    );

    if (!response.ok) {
      throw new Error(`Finnhub search error: ${response.status}`);
    }

    const data = await response.json();

    if (data.result) {
      return data.result
        .filter((item: any) => item.type === 'Common Stock' || item.type === 'ETF')
        .slice(0, 10)
        .map((item: any) => ({
          symbol: item.symbol,
          description: item.description,
        }));
    }

    return [];
  } catch (error) {
    console.error('[PriceService] Symbol search error:', error);
    return [];
  }
}

/**
 * Search for cryptocurrency symbols
 */
export async function searchCrypto(query: string): Promise<{ symbol: string; name: string }[]> {
  if (query.length < 2) return [];

  // Common cryptos for offline/fallback search
  const commonCryptos = [
    { symbol: 'BTC', name: 'Bitcoin' },
    { symbol: 'ETH', name: 'Ethereum' },
    { symbol: 'USDT', name: 'Tether' },
    { symbol: 'BNB', name: 'BNB' },
    { symbol: 'XRP', name: 'XRP' },
    { symbol: 'ADA', name: 'Cardano' },
    { symbol: 'DOGE', name: 'Dogecoin' },
    { symbol: 'SOL', name: 'Solana' },
    { symbol: 'DOT', name: 'Polkadot' },
    { symbol: 'MATIC', name: 'Polygon' },
    { symbol: 'LTC', name: 'Litecoin' },
    { symbol: 'AVAX', name: 'Avalanche' },
    { symbol: 'LINK', name: 'Chainlink' },
    { symbol: 'UNI', name: 'Uniswap' },
  ];

  try {
    const response = await retryWithBackoff(async () => {
      const res = await fetch(
        `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(query)}`
      );

      if (res.status === 429) {
        throw new Error('Rate limited');
      }

      if (!res.ok) {
        throw new Error(`CoinGecko search error: ${res.status}`);
      }

      return res;
    }, 2, 1000);

    const data = await response.json();

    if (data.coins) {
      return data.coins.slice(0, 10).map((coin: any) => ({
        symbol: coin.symbol.toUpperCase(),
        name: coin.name,
      }));
    }

    return [];
  } catch (error) {
    console.warn('[PriceService] Crypto search failed, using local list');
    // Fallback to local search
    const lowerQuery = query.toLowerCase();
    return commonCryptos.filter(
      (c) =>
        c.symbol.toLowerCase().includes(lowerQuery) ||
        c.name.toLowerCase().includes(lowerQuery)
    );
  }
}

/**
 * Get price for a holding based on its type and symbol
 */
export async function getPrice(
  assetType: AssetType,
  symbol?: string
): Promise<PriceResult | null> {
  // Initialize cache on first call
  if (Object.keys(priceCache).length === 0) {
    await loadCache();
  }

  // Check cache first
  const cacheKey = symbol || assetType;
  const cached = getCachedPrice(cacheKey);
  if (cached) {
    return cached;
  }

  // Fetch based on asset type
  switch (assetType) {
    case 'stock':
    case 'etf':
      if (symbol) {
        return fetchStockPrice(symbol);
      }
      break;

    case 'crypto':
      if (symbol) {
        return fetchCryptoPrice(symbol);
      }
      break;

    case 'gold':
      return fetchGoldPrice();

    case 'silver':
      return fetchSilverPrice();

    case 'platinum':
      return fetchPlatinumPrice();

    case 'mutual_fund':
    case 'bond':
    case 'real_estate':
    case 'fixed_deposit':
    case 'cash':
    case 'other':
      // These require manual pricing
      return null;
  }

  return null;
}

/**
 * Batch fetch prices for multiple holdings
 */
export async function batchGetPrices(
  holdings: { id: string; type: AssetType; symbol?: string }[]
): Promise<Record<string, PriceResult>> {
  const results: Record<string, PriceResult> = {};

  // Group by type for efficient batching
  const stocks = holdings.filter((h) => ['stock', 'etf'].includes(h.type) && h.symbol);
  const cryptos = holdings.filter((h) => h.type === 'crypto' && h.symbol);
  const golds = holdings.filter((h) => h.type === 'gold');

  // Fetch in parallel with rate limiting
  const promises: Promise<void>[] = [];

  // Stocks (rate limited to not exceed Finnhub limits)
  for (const holding of stocks) {
    promises.push(
      (async () => {
        const price = await getPrice(holding.type, holding.symbol);
        if (price) {
          results[holding.id] = price;
        }
      })()
    );
    // Add small delay to respect rate limits
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  // Cryptos
  for (const holding of cryptos) {
    promises.push(
      (async () => {
        const price = await getPrice(holding.type, holding.symbol);
        if (price) {
          results[holding.id] = price;
        }
      })()
    );
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  // Commodities (gold, silver, platinum)
  const commodityTypes = ['gold', 'silver', 'platinum'] as const;
  for (const commodityType of commodityTypes) {
    const commodityHoldings = holdings.filter((h) => h.type === commodityType);
    if (commodityHoldings.length > 0) {
      const commodityPrice = await getPrice(commodityType);
      if (commodityPrice) {
        for (const holding of commodityHoldings) {
          results[holding.id] = commodityPrice;
        }
      }
    }
  }

  await Promise.all(promises);

  return results;
}

/**
 * Clear the price cache
 */
export async function clearPriceCache(): Promise<void> {
  priceCache = {};
  await AsyncStorage.removeItem(CACHE_KEY);
}

/**
 * Check if live pricing is available for an asset type
 */
export function hasLivePricing(assetType: AssetType): boolean {
  return ['stock', 'etf', 'crypto', 'gold', 'silver', 'platinum'].includes(assetType);
}

/**
 * Get the price source for an asset type
 */
export function getPriceSource(assetType: AssetType): string {
  switch (assetType) {
    case 'stock':
    case 'etf':
      return 'Yahoo Finance';
    case 'crypto':
      return 'Binance';
    case 'gold':
    case 'silver':
    case 'platinum':
      return 'Gold API';
    default:
      return 'Manual';
  }
}

/**
 * Get commodity price by type (exported for direct access)
 */
export async function getCommodityPrice(commodity: 'gold' | 'silver' | 'platinum'): Promise<PriceResult | null> {
  const commodityMap = {
    gold: fetchGoldPrice,
    silver: fetchSilverPrice,
    platinum: fetchPlatinumPrice,
  };
  return commodityMap[commodity]();
}

/**
 * Market overview data structure
 */
export interface MarketOverviewData {
  indices: {
    sp500: PriceResult | null;
    nasdaq: PriceResult | null;
    dow: PriceResult | null;
  };
  commodities: {
    gold: PriceResult | null;
    silver: PriceResult | null;
  };
  crypto: {
    bitcoin: PriceResult | null;
    ethereum: PriceResult | null;
  };
  lastUpdated: string;
}

/**
 * Fetch index price - uses ETF proxies (SPY, QQQ, DIA) which are more reliable
 * than direct index symbols with free APIs
 */
async function fetchIndexPrice(index: 'sp500' | 'nasdaq' | 'dow'): Promise<PriceResult | null> {
  // Use ETF proxies for indices - more reliable with free APIs
  const etfMap = {
    sp500: 'SPY',   // SPDR S&P 500 ETF
    nasdaq: 'QQQ',  // Invesco QQQ (NASDAQ-100)
    dow: 'DIA',     // SPDR Dow Jones Industrial Average ETF
  };

  const etfSymbol = etfMap[index];

  // Try Yahoo Finance first
  let result = await fetchYahooFinancePrice(etfSymbol);

  // Fallback to Finnhub if Yahoo fails
  if (!result) {
    result = await fetchFinnhubPrice(etfSymbol);
  }

  return result;
}

/**
 * Fetch market overview data (indices, commodities, crypto)
 * This provides a snapshot of current market conditions
 */
export async function getMarketOverview(): Promise<MarketOverviewData> {
  // Initialize cache on first call
  if (Object.keys(priceCache).length === 0) {
    await loadCache();
  }

  // Fetch all data in parallel for speed
  // Using ETF proxies for indices (SPY, QQQ, DIA) for better API reliability
  const [
    sp500,
    nasdaq,
    dow,
    gold,
    silver,
    bitcoin,
    ethereum,
  ] = await Promise.all([
    fetchIndexPrice('sp500'),   // SPY ETF as S&P 500 proxy
    fetchIndexPrice('nasdaq'),  // QQQ ETF as NASDAQ proxy
    fetchIndexPrice('dow'),     // DIA ETF as DOW proxy
    fetchGoldPrice(),
    fetchSilverPrice(),
    fetchCryptoPrice('BTC'),
    fetchCryptoPrice('ETH'),
  ]);

  return {
    indices: {
      sp500,
      nasdaq,
      dow,
    },
    commodities: {
      gold,
      silver,
    },
    crypto: {
      bitcoin,
      ethereum,
    },
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Get a single index price
 */
export async function getIndexPrice(index: 'sp500' | 'nasdaq' | 'dow'): Promise<PriceResult | null> {
  const symbolMap = {
    sp500: '^GSPC',
    nasdaq: '^IXIC',
    dow: '^DJI',
  };
  return fetchYahooFinancePrice(symbolMap[index]);
}

/**
 * Get crypto price by symbol
 */
export async function getCryptoPrice(symbol: string): Promise<PriceResult | null> {
  return fetchCryptoPrice(symbol);
}
