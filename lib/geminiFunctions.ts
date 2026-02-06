/**
 * Function handlers for Gemini 3 function calling
 *
 * These handlers execute when Gemini calls the predefined functions,
 * enabling agentic workflows where the AI can fetch data and reason about it.
 */

import { getPrice, getCryptoPrice, PriceResult } from './priceService';
import { calculateMetrics, PortfolioMetrics } from './portfolioAnalysis';
import portfolioService from './portfolioService';
import { getNewsAnalysis } from './marketEvents';
import logger from './logger';
import { AssetClass, AssetType } from '@/types';

/**
 * Handler for get_current_price function
 * Fetches live market prices for stocks, crypto, or ETFs
 */
export async function handleGetCurrentPrice(args: Record<string, unknown>): Promise<unknown> {
  const symbol = args.symbol as string;
  const type = args.type as 'stock' | 'crypto' | 'etf';

  logger.debug('GeminiFunctions', `Fetching price for ${symbol} (${type})`);

  try {
    let priceResult: PriceResult | null = null;
    let source = '';

    switch (type) {
      case 'stock':
        priceResult = await getPrice('stock', symbol);
        source = 'Yahoo Finance / Finnhub';
        break;
      case 'etf':
        priceResult = await getPrice('etf', symbol);
        source = 'Yahoo Finance / Finnhub';
        break;
      case 'crypto':
        priceResult = await getCryptoPrice(symbol);
        source = 'CoinGecko';
        break;
      default:
        return { error: `Unknown asset type: ${type}` };
    }

    if (priceResult === null) {
      return {
        symbol,
        type,
        error: 'Price not available',
        suggestion: 'The symbol may be invalid or the market may be closed',
      };
    }

    return {
      symbol,
      type,
      price: priceResult.price,
      currency: 'USD',
      source,
      timestamp: priceResult.timestamp,
    };
  } catch (error) {
    logger.error('GeminiFunctions', `Failed to fetch price for ${symbol}`, error);
    return {
      symbol,
      type,
      error: `Failed to fetch price: ${String(error)}`,
    };
  }
}

/**
 * Handler for calculate_portfolio_metrics function
 * Analyzes the user's current portfolio for diversification and risk
 */
export async function handleCalculatePortfolioMetrics(args: Record<string, unknown>): Promise<unknown> {
  const includeRecommendations = args.includeRecommendations as boolean ?? true;

  logger.debug('GeminiFunctions', 'Calculating portfolio metrics');

  try {
    const holdings = await portfolioService.getHoldings();

    if (holdings.length === 0) {
      return {
        error: 'No holdings found',
        suggestion: 'Add some holdings to your portfolio first',
      };
    }

    const metrics = calculateMetrics(holdings);

    // Calculate a simple diversification score based on asset class distribution
    const assetClassCount = Object.keys(metrics.assetClassDistribution).length;
    const maxHoldingPercent = metrics.topHoldings[0]?.percent || 0;
    const diversificationScore = Math.min(100,
      (assetClassCount * 15) + // More asset classes = better
      (100 - maxHoldingPercent) // Less concentration = better
    );

    // Identify concentration risks
    const concentrationRisks: string[] = [];
    for (const [assetClass, data] of Object.entries(metrics.assetClassDistribution)) {
      if (data.percent > 50) {
        concentrationRisks.push(`${assetClass} (${data.percent.toFixed(1)}%)`);
      }
    }
    for (const holding of metrics.topHoldings) {
      if (holding.percent > 25) {
        concentrationRisks.push(`${holding.name} (${holding.percent.toFixed(1)}%)`);
      }
    }

    const result: Record<string, unknown> = {
      totalValue: metrics.totalValue,
      holdingsCount: metrics.holdingsCount,
      diversificationScore: Math.round(diversificationScore),
      assetClassDistribution: Object.entries(metrics.assetClassDistribution).map(
        ([className, data]) => ({
          assetClass: className,
          value: data.value,
          percentage: data.percent,
        })
      ),
      topHoldings: metrics.topHoldings.slice(0, 5).map((h) => ({
        name: h.name,
        value: h.value,
        percentage: h.percent,
      })),
      concentrationRisks,
    };

    if (includeRecommendations) {
      result.recommendations = generateRecommendations(metrics, diversificationScore, concentrationRisks);
    }

    return result;
  } catch (error) {
    logger.error('GeminiFunctions', 'Failed to calculate portfolio metrics', error);
    return {
      error: `Failed to calculate metrics: ${String(error)}`,
    };
  }
}

/**
 * Generate rebalancing recommendations based on metrics
 */
function generateRecommendations(
  metrics: PortfolioMetrics,
  diversificationScore: number,
  concentrationRisks: string[]
): string[] {
  const recommendations: string[] = [];

  // Check diversification score
  if (diversificationScore < 50) {
    recommendations.push(
      'Your portfolio has low diversification. Consider spreading investments across more asset classes.'
    );
  }

  // Check for concentration risks
  if (concentrationRisks.length > 0) {
    recommendations.push(
      `You have concentration risks in: ${concentrationRisks.join(', ')}. Consider reducing these positions.`
    );
  }

  // Check asset class distribution
  const distribution = metrics.assetClassDistribution;
  const stocks = distribution['stocks' as AssetClass];
  const crypto = distribution['crypto' as AssetClass];

  if (stocks && stocks.percent > 80) {
    recommendations.push(
      'Your portfolio is heavily weighted in stocks. Consider adding bonds or other asset classes for stability.'
    );
  }

  if (crypto && crypto.percent > 20) {
    recommendations.push(
      'Cryptocurrency makes up a significant portion of your portfolio. Consider the high volatility risk.'
    );
  }

  // Check number of holdings
  if (metrics.holdingsCount < 5) {
    recommendations.push(
      'With only a few holdings, your portfolio may be under-diversified. Consider adding more positions.'
    );
  }

  if (recommendations.length === 0) {
    recommendations.push(
      'Your portfolio appears well-balanced. Continue monitoring and rebalance periodically.'
    );
  }

  return recommendations;
}

/**
 * Handler for search_market_news function
 * Searches for recent market news about a topic
 */
export async function handleSearchMarketNews(args: Record<string, unknown>): Promise<unknown> {
  const query = args.query as string;
  const limit = (args.limit as number) || 5;

  logger.debug('GeminiFunctions', `Searching news for: ${query}`);

  try {
    // Get user's holdings to provide context for news
    const holdings = await portfolioService.getHoldings();

    // Get AI-generated news analysis
    const newsAnalysis = await getNewsAnalysis(holdings);

    if (!newsAnalysis.headlines || newsAnalysis.headlines.length === 0) {
      return {
        query,
        results: [],
        message: 'No recent news found',
      };
    }

    // Filter by query if provided (simple keyword match)
    const queryLower = query.toLowerCase();
    const filtered = newsAnalysis.headlines.filter((item) =>
      item.title.toLowerCase().includes(queryLower) ||
      item.summary.toLowerCase().includes(queryLower) ||
      item.relevantSymbols.some((s) => s.toLowerCase().includes(queryLower))
    );

    // Use filtered results if we have matches, otherwise return all headlines
    const relevantNews = filtered.length > 0 ? filtered : newsAnalysis.headlines;

    // Limit and format results
    const results = relevantNews.slice(0, limit).map((item) => ({
      headline: item.title,
      summary: item.summary,
      sentiment: item.impact,
      relatedSymbols: item.relevantSymbols,
    }));

    return {
      query,
      resultCount: results.length,
      results,
      marketSentiment: newsAnalysis.marketSentiment,
      keyTakeaway: newsAnalysis.keyTakeaway,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    logger.error('GeminiFunctions', `Failed to search news for ${query}`, error);
    return {
      query,
      error: `Failed to search news: ${String(error)}`,
    };
  }
}

/**
 * Map of function names to their handlers
 */
export const functionHandlers: Record<
  string,
  (args: Record<string, unknown>) => Promise<unknown>
> = {
  get_current_price: handleGetCurrentPrice,
  calculate_portfolio_metrics: handleCalculatePortfolioMetrics,
  search_market_news: handleSearchMarketNews,
};

/**
 * Execute a function call from Gemini
 */
export async function executeFunction(
  name: string,
  args: Record<string, unknown>
): Promise<unknown> {
  const handler = functionHandlers[name];
  if (!handler) {
    logger.warn('GeminiFunctions', `Unknown function: ${name}`);
    return { error: `Unknown function: ${name}` };
  }

  logger.info('GeminiFunctions', `Executing function: ${name}`, args);
  const result = await handler(args);
  logger.debug('GeminiFunctions', `Function ${name} completed`, result);

  return result;
}
