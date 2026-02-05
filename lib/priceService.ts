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
    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`
    );

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
  } catch (error) {
    console.error(`[PriceService] Yahoo Finance error for ${symbol}:`, error);
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
    console.error(`[PriceService] All sources failed for ${symbol}`);
  }

  return null;
}

/**
 * Fetch cryptocurrency price from CoinGecko
 */
async function fetchCryptoPrice(symbol: string): Promise<PriceResult | null> {
  try {
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

    const coinId = symbolToId[symbol.toUpperCase()] || symbol.toLowerCase();

    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd&include_24hr_change=true`
    );

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

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
    console.error(`[PriceService] CoinGecko error for ${symbol}:`, error);
    return null;
  }
}

// Fallback prices for commodities (approximate)
const COMMODITY_FALLBACK_PRICES: Record<string, number> = {
  GOLD: 2000,   // Gold per oz
  SILVER: 25,   // Silver per oz
  PLATINUM: 950, // Platinum per oz
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

  try {
    // Try Gold API first (goldapi.io)
    const response = await fetch(
      `https://www.goldapi.io/api/${metalSymbol}/USD`,
      {
        headers: GOLD_API_KEY ? { 'x-access-token': GOLD_API_KEY } : {},
      }
    );

    if (!response.ok) {
      throw new Error(`Gold API error: ${response.status}`);
    }

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

    throw new Error('No price data received');
  } catch (error) {
    console.error(`[PriceService] ${commodity} price error:`, error);

    // Try Yahoo Finance as fallback for commodities
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
      console.warn(`[PriceService] Yahoo fallback failed for ${commodity}`);
    }

    // Return fallback price
    return {
      price: fallbackPrice,
      source: 'fallback',
      timestamp: new Date().toISOString(),
    };
  }
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

  try {
    const response = await fetch(
      `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(query)}`
    );

    if (!response.ok) {
      throw new Error(`CoinGecko search error: ${response.status}`);
    }

    const data = await response.json();

    if (data.coins) {
      return data.coins.slice(0, 10).map((coin: any) => ({
        symbol: coin.symbol.toUpperCase(),
        name: coin.name,
      }));
    }

    return [];
  } catch (error) {
    console.error('[PriceService] Crypto search error:', error);
    return [];
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
      return 'CoinGecko';
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
