import { z } from 'zod';
import { generateStructuredWithGemini, GEMINI_SYSTEM_PROMPT } from './gemini';
import { Holding, AssetClass, PortfolioAnalysis, ASSET_TYPE_CONFIG } from '@/types';

const AI_TIMEOUT = 30000;

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout>;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('Analysis timeout')), ms);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutId!);
    return result;
  } catch (err) {
    clearTimeout(timeoutId!);
    throw err;
  }
}

export interface PortfolioMetrics {
  totalValue: number;
  totalInvested: number;
  holdingsCount: number;
  assetClassDistribution: Record<AssetClass, { value: number; percent: number }>;
  sectorDistribution: Record<string, { value: number; percent: number }>;
  countryDistribution: Record<string, { value: number; percent: number }>;
  topHoldings: { name: string; value: number; percent: number }[];
}

export interface AIAnalysisResult {
  diversificationScore: number;
  riskLevel: 'low' | 'moderate' | 'high' | 'very_high';
  summary: string;
  strengths: string[];
  concerns: string[];
  recommendations: string[];
  concentrationRisks: {
    type: 'holding' | 'sector' | 'country' | 'asset_class';
    name: string;
    percent: number;
    warning: string;
  }[];
}

/**
 * Calculate portfolio metrics from holdings
 */
export function calculateMetrics(holdings: Holding[]): PortfolioMetrics {
  let totalValue = 0;
  let totalInvested = 0;

  const assetClassTotals: Record<string, number> = {};
  const sectorTotals: Record<string, number> = {};
  const countryTotals: Record<string, number> = {};
  const holdingValues: { name: string; value: number }[] = [];

  holdings.forEach((h) => {
    const value = h.currentValue || h.quantity * (h.currentPrice || h.purchasePrice);
    const invested = h.quantity * h.purchasePrice;

    totalValue += value;
    totalInvested += invested;

    // Asset class
    assetClassTotals[h.assetClass] = (assetClassTotals[h.assetClass] || 0) + value;

    // Sector
    const sector = h.sector || 'Uncategorized';
    sectorTotals[sector] = (sectorTotals[sector] || 0) + value;

    // Country
    const country = h.country || 'Unknown';
    countryTotals[country] = (countryTotals[country] || 0) + value;

    // Holding value
    holdingValues.push({ name: h.name, value });
  });

  const toDistribution = (totals: Record<string, number>) => {
    const result: Record<string, { value: number; percent: number }> = {};
    Object.entries(totals).forEach(([key, value]) => {
      result[key] = {
        value,
        percent: totalValue > 0 ? (value / totalValue) * 100 : 0,
      };
    });
    return result;
  };

  // Top holdings by value
  const topHoldings = holdingValues
    .sort((a, b) => b.value - a.value)
    .slice(0, 5)
    .map((h) => ({
      ...h,
      percent: totalValue > 0 ? (h.value / totalValue) * 100 : 0,
    }));

  return {
    totalValue,
    totalInvested,
    holdingsCount: holdings.length,
    assetClassDistribution: toDistribution(assetClassTotals) as Record<
      AssetClass,
      { value: number; percent: number }
    >,
    sectorDistribution: toDistribution(sectorTotals),
    countryDistribution: toDistribution(countryTotals),
    topHoldings,
  };
}

/**
 * Calculate basic diversification score without AI
 */
export function calculateBasicDiversificationScore(metrics: PortfolioMetrics): number {
  let score = 0;

  // Asset class diversity (max 30 points)
  const assetClasses = Object.keys(metrics.assetClassDistribution).length;
  score += Math.min(assetClasses * 10, 30);

  // No single holding dominates (max 25 points)
  const maxHoldingPercent = metrics.topHoldings[0]?.percent || 0;
  if (maxHoldingPercent < 10) score += 25;
  else if (maxHoldingPercent < 20) score += 20;
  else if (maxHoldingPercent < 30) score += 15;
  else if (maxHoldingPercent < 50) score += 10;
  else score += 5;

  // Sector diversity (max 25 points)
  const sectors = Object.keys(metrics.sectorDistribution).length;
  score += Math.min(sectors * 5, 25);

  // Country diversity (max 20 points)
  const countries = Object.keys(metrics.countryDistribution).length;
  score += Math.min(countries * 5, 20);

  return Math.min(score, 100);
}

/**
 * Identify concentration risks
 */
export function identifyConcentrationRisks(
  metrics: PortfolioMetrics
): AIAnalysisResult['concentrationRisks'] {
  const risks: AIAnalysisResult['concentrationRisks'] = [];

  // Check top holdings
  metrics.topHoldings.forEach((h) => {
    if (h.percent > 25) {
      risks.push({
        type: 'holding',
        name: h.name,
        percent: h.percent,
        warning: `${h.name} represents ${h.percent.toFixed(1)}% of your portfolio - consider reducing exposure`,
      });
    }
  });

  // Check sector concentration
  Object.entries(metrics.sectorDistribution).forEach(([sector, data]) => {
    if (data.percent > 40 && sector !== 'Uncategorized') {
      risks.push({
        type: 'sector',
        name: sector,
        percent: data.percent,
        warning: `${data.percent.toFixed(1)}% exposure to ${sector} sector - consider diversifying`,
      });
    }
  });

  // Check country concentration
  Object.entries(metrics.countryDistribution).forEach(([country, data]) => {
    if (data.percent > 60 && country !== 'Unknown') {
      risks.push({
        type: 'country',
        name: country,
        percent: data.percent,
        warning: `${data.percent.toFixed(1)}% exposure to ${country} - consider international diversification`,
      });
    }
  });

  // Check asset class concentration
  Object.entries(metrics.assetClassDistribution).forEach(([assetClass, data]) => {
    if (data.percent > 70) {
      risks.push({
        type: 'asset_class',
        name: assetClass,
        percent: data.percent,
        warning: `${data.percent.toFixed(1)}% in ${assetClass} assets - consider adding other asset classes`,
      });
    }
  });

  return risks;
}

/**
 * Get AI-powered portfolio analysis
 */
export async function getAIAnalysis(holdings: Holding[]): Promise<AIAnalysisResult> {
  const metrics = calculateMetrics(holdings);
  const basicScore = calculateBasicDiversificationScore(metrics);
  const concentrationRisks = identifyConcentrationRisks(metrics);

  // Prepare holdings summary for AI
  const holdingsSummary = holdings.map((h) => ({
    name: h.name,
    type: ASSET_TYPE_CONFIG[h.type].label,
    assetClass: h.assetClass,
    value: h.currentValue || h.quantity * (h.currentPrice || h.purchasePrice),
    sector: h.sector || 'Unknown',
    country: h.country || 'Unknown',
  }));

  const schema = z.object({
    diversificationScore: z.number().min(0).max(100),
    riskLevel: z.enum(['low', 'moderate', 'high', 'very_high']),
    summary: z.string(),
    strengths: z.array(z.string()),
    concerns: z.array(z.string()),
    recommendations: z.array(z.string()),
  });

  const prompt = `Analyze this investment portfolio and provide insights:

PORTFOLIO OVERVIEW:
- Total Value: $${metrics.totalValue.toLocaleString()}
- Number of Holdings: ${metrics.holdingsCount}
- Basic Diversification Score: ${basicScore}/100

HOLDINGS:
${holdingsSummary.map((h) => `- ${h.name} (${h.type}): $${h.value.toLocaleString()} | Sector: ${h.sector} | Country: ${h.country}`).join('\n')}

ASSET CLASS DISTRIBUTION:
${Object.entries(metrics.assetClassDistribution)
  .map(([cls, data]) => `- ${cls}: ${data.percent.toFixed(1)}%`)
  .join('\n')}

SECTOR DISTRIBUTION:
${Object.entries(metrics.sectorDistribution)
  .map(([sector, data]) => `- ${sector}: ${data.percent.toFixed(1)}%`)
  .join('\n')}

COUNTRY DISTRIBUTION:
${Object.entries(metrics.countryDistribution)
  .map(([country, data]) => `- ${country}: ${data.percent.toFixed(1)}%`)
  .join('\n')}

IDENTIFIED CONCENTRATION RISKS:
${concentrationRisks.length > 0 ? concentrationRisks.map((r) => `- ${r.warning}`).join('\n') : 'None identified'}

Please analyze this portfolio and provide a JSON response with:
1. "diversificationScore": A score from 0-100 based on how well-diversified the portfolio is
2. "riskLevel": Overall risk level ("low", "moderate", "high", or "very_high")
3. "summary": A 2-3 sentence summary of the portfolio's health and balance
4. "strengths": Array of 2-3 positive aspects of the portfolio
5. "concerns": Array of 2-3 areas of concern or improvement
6. "recommendations": Array of 3-4 specific, actionable recommendations

Consider factors like:
- Asset class balance (equity, debt, commodities, real assets, cash)
- Geographic diversification
- Sector concentration
- Individual holding weights
- Overall risk profile`;

  try {
    console.log('[PortfolioAnalysis] Getting AI analysis...');
    const result = await withTimeout(
      generateStructuredWithGemini({
        prompt,
        systemInstruction: `${GEMINI_SYSTEM_PROMPT}\n\nYou are a portfolio analysis expert. Provide balanced, actionable insights for retail investors. Be specific but not overly technical.`,
        schema,
        feature: 'portfolio_analysis',
      }),
      AI_TIMEOUT
    );

    console.log('[PortfolioAnalysis] AI analysis complete');
    return {
      ...result,
      concentrationRisks,
    };
  } catch (error) {
    console.error('[PortfolioAnalysis] AI analysis failed:', error);
    // Return fallback analysis
    return {
      diversificationScore: basicScore,
      riskLevel: basicScore > 70 ? 'low' : basicScore > 50 ? 'moderate' : basicScore > 30 ? 'high' : 'very_high',
      summary: `Your portfolio has ${metrics.holdingsCount} holdings across ${Object.keys(metrics.assetClassDistribution).length} asset classes. ${concentrationRisks.length > 0 ? 'Some concentration risks were identified.' : 'No major concentration risks detected.'}`,
      strengths: [
        metrics.holdingsCount >= 5 ? 'Good number of holdings' : 'Focused portfolio',
        Object.keys(metrics.assetClassDistribution).length >= 2 ? 'Multiple asset classes' : 'Clear investment focus',
      ],
      concerns: concentrationRisks.slice(0, 2).map((r) => r.warning),
      recommendations: [
        'Review your portfolio allocation quarterly',
        'Consider rebalancing if any position exceeds 25% of portfolio',
        'Ensure you have adequate emergency funds before investing more',
      ],
      concentrationRisks,
    };
  }
}

/**
 * Get quick analysis without AI (for free tier)
 */
export function getQuickAnalysis(holdings: Holding[]): AIAnalysisResult {
  const metrics = calculateMetrics(holdings);
  const basicScore = calculateBasicDiversificationScore(metrics);
  const concentrationRisks = identifyConcentrationRisks(metrics);

  const riskLevel: AIAnalysisResult['riskLevel'] =
    basicScore > 70 ? 'low' : basicScore > 50 ? 'moderate' : basicScore > 30 ? 'high' : 'very_high';

  const strengths: string[] = [];
  const concerns: string[] = [];

  // Analyze strengths
  if (Object.keys(metrics.assetClassDistribution).length >= 3) {
    strengths.push('Good asset class diversification');
  }
  if (metrics.holdingsCount >= 10) {
    strengths.push('Well-diversified number of holdings');
  } else if (metrics.holdingsCount >= 5) {
    strengths.push('Reasonable number of holdings');
  }
  if (Object.keys(metrics.countryDistribution).length >= 2) {
    strengths.push('Some geographic diversification');
  }
  if (metrics.topHoldings[0]?.percent < 20) {
    strengths.push('No single holding dominates the portfolio');
  }

  // Analyze concerns
  if (Object.keys(metrics.assetClassDistribution).length === 1) {
    concerns.push('Portfolio concentrated in single asset class');
  }
  if (metrics.holdingsCount < 5) {
    concerns.push('Consider adding more holdings for better diversification');
  }
  if (metrics.topHoldings[0]?.percent > 30) {
    concerns.push(`${metrics.topHoldings[0].name} is ${metrics.topHoldings[0].percent.toFixed(0)}% of portfolio`);
  }
  concentrationRisks.slice(0, 2).forEach((risk) => {
    if (!concerns.includes(risk.warning)) {
      concerns.push(risk.warning);
    }
  });

  return {
    diversificationScore: basicScore,
    riskLevel,
    summary: `Your portfolio contains ${metrics.holdingsCount} holdings worth $${metrics.totalValue.toLocaleString()}. Diversification score: ${basicScore}/100.`,
    strengths: strengths.slice(0, 3),
    concerns: concerns.slice(0, 3),
    recommendations: [
      basicScore < 50 ? 'Consider diversifying across more asset classes' : 'Maintain your current diversification strategy',
      metrics.holdingsCount < 10 ? 'Consider adding more holdings to reduce concentration risk' : 'Review holdings quarterly for rebalancing opportunities',
      'Keep emergency fund separate from investments',
      'Review sector exposure to avoid over-concentration',
    ],
    concentrationRisks,
  };
}
