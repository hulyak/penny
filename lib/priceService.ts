import AsyncStorage from '@react-native-async-storage/async-storage';
import { AssetType } from '@/types';

const FINNHUB_API_KEY = process.env.EXPO_PUBLIC_FINNHUB_API_KEY;
const METALS_API_KEY = process.env.EXPO_PUBLIC_METALS_API_KEY;

const CACHE_KEY = 'penny_price_cache';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

interface PriceCache {
  [symbol: string]: {
    price: number;
    change: number;
    changePercent: number;
    timestamp: number;
  };
}

interface PriceResult {
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
 * Fetch stock price from Finnhub
 */
async function fetchStockPrice(symbol: string): Promise<PriceResult | null> {
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

/**
 * Fetch gold price from free API
 */
async function fetchGoldPrice(): Promise<PriceResult | null> {
  try {
    // Using a free gold price API
    const response = await fetch(
      'https://api.goldapi.io/v1/XAU/USD',
      {
        headers: METALS_API_KEY ? { 'x-access-token': METALS_API_KEY } : {},
      }
    );

    if (!response.ok) {
      // Fallback to hardcoded approximate price if API fails
      return {
        price: 2000, // Approximate gold price per oz
        source: 'fallback',
        timestamp: new Date().toISOString(),
      };
    }

    const data = await response.json();

    if (data.price) {
      cachePrice('GOLD', data.price, data.ch, data.chp);
      return {
        price: data.price,
        change: data.ch,
        changePercent: data.chp,
        source: 'goldapi',
        timestamp: new Date().toISOString(),
      };
    }

    return null;
  } catch (error) {
    console.error('[PriceService] Gold price error:', error);
    // Return fallback price
    return {
      price: 2000,
      source: 'fallback',
      timestamp: new Date().toISOString(),
    };
  }
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

  // Gold (single request for all)
  if (golds.length > 0) {
    const goldPrice = await getPrice('gold');
    if (goldPrice) {
      for (const holding of golds) {
        results[holding.id] = goldPrice;
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
  return ['stock', 'etf', 'crypto', 'gold'].includes(assetType);
}

/**
 * Get the price source for an asset type
 */
export function getPriceSource(assetType: AssetType): string {
  switch (assetType) {
    case 'stock':
    case 'etf':
      return FINNHUB_API_KEY ? 'Finnhub' : 'Manual';
    case 'crypto':
      return 'CoinGecko';
    case 'gold':
      return 'Gold API';
    default:
      return 'Manual';
  }
}
