import { z } from 'zod';
import { generateStructuredWithGemini, GEMINI_SYSTEM_PROMPT } from './gemini';
import { Holding, AssetClass, RebalanceAction, RebalancePlan, ASSET_CLASS_COLORS } from '@/types';

// Target allocations based on risk tolerance
const TARGET_ALLOCATIONS: Record<string, Record<AssetClass, number>> = {
  conservative: {
    equity: 30,
    debt: 45,
    commodity: 10,
    real_asset: 10,
    cash: 5,
  },
  moderate: {
    equity: 50,
    debt: 25,
    commodity: 10,
    real_asset: 10,
    cash: 5,
  },
  aggressive: {
    equity: 70,
    debt: 10,
    commodity: 10,
    real_asset: 5,
    cash: 5,
  },
};

/**
 * Calculate current allocation by asset class
 */
function calculateCurrentAllocation(holdings: Holding[]): { allocation: Record<AssetClass, number>; totalValue: number } {
  let totalValue = 0;
  const valueByClass: Record<string, number> = {};

  holdings.forEach((h) => {
    const value = h.currentValue || h.quantity * (h.currentPrice || h.purchasePrice);
    totalValue += value;
    valueByClass[h.assetClass] = (valueByClass[h.assetClass] || 0) + value;
  });

  const allocation: Record<AssetClass, number> = {
    equity: 0,
    debt: 0,
    commodity: 0,
    real_asset: 0,
    cash: 0,
  };

  Object.keys(allocation).forEach((key) => {
    const assetClass = key as AssetClass;
    allocation[assetClass] = totalValue > 0 ? ((valueByClass[assetClass] || 0) / totalValue) * 100 : 0;
  });

  return { allocation, totalValue };
}

/**
 * Generate rebalancing actions
 */
export function generateRebalanceActions(
  holdings: Holding[],
  riskTolerance: 'conservative' | 'moderate' | 'aggressive' = 'moderate'
): RebalancePlan {
  const { allocation: currentAllocation, totalValue } = calculateCurrentAllocation(holdings);
  const targetAllocation = TARGET_ALLOCATIONS[riskTolerance];

  const actions: RebalanceAction[] = [];
  let actionId = 1;

  // Calculate differences for each asset class
  const differences: { assetClass: AssetClass; diff: number; currentPct: number; targetPct: number }[] = [];

  Object.keys(targetAllocation).forEach((key) => {
    const assetClass = key as AssetClass;
    const currentPct = currentAllocation[assetClass] || 0;
    const targetPct = targetAllocation[assetClass];
    const diff = targetPct - currentPct;

    if (Math.abs(diff) >= 3) { // Only act on 3%+ differences
      differences.push({ assetClass, diff, currentPct, targetPct });
    }
  });

  // Sort by absolute difference (largest first)
  differences.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));

  // Generate specific actions
  differences.forEach((d) => {
    const actionAmount = Math.abs((d.diff / 100) * totalValue);
    const currentValue = (d.currentPct / 100) * totalValue;
    const targetValue = (d.targetPct / 100) * totalValue;

    if (d.diff > 0) {
      // Need to buy more of this asset class
      const suggestedHoldings = getSuggestedHoldings(d.assetClass, holdings);

      actions.push({
        id: `rebalance_${actionId++}`,
        type: 'buy',
        holdingName: suggestedHoldings.length > 0 ? suggestedHoldings[0].name : getDefaultSuggestion(d.assetClass),
        holdingId: suggestedHoldings[0]?.id,
        symbol: suggestedHoldings[0]?.symbol,
        currentAllocation: d.currentPct,
        targetAllocation: d.targetPct,
        currentValue,
        targetValue,
        actionAmount,
        reason: `Increase ${d.assetClass} allocation from ${d.currentPct.toFixed(1)}% to ${d.targetPct}%`,
        priority: Math.abs(d.diff) >= 10 ? 'high' : Math.abs(d.diff) >= 5 ? 'medium' : 'low',
        assetClass: d.assetClass,
      });
    } else {
      // Need to sell some of this asset class
      const holdingsInClass = holdings.filter((h) => h.assetClass === d.assetClass);
      const largestHolding = holdingsInClass.sort((a, b) => {
        const aVal = a.currentValue || a.quantity * (a.currentPrice || a.purchasePrice);
        const bVal = b.currentValue || b.quantity * (b.currentPrice || b.purchasePrice);
        return bVal - aVal;
      })[0];

      if (largestHolding) {
        const shares = largestHolding.currentPrice
          ? Math.floor(actionAmount / largestHolding.currentPrice)
          : undefined;

        actions.push({
          id: `rebalance_${actionId++}`,
          type: 'sell',
          holdingId: largestHolding.id,
          holdingName: largestHolding.name,
          symbol: largestHolding.symbol,
          currentAllocation: d.currentPct,
          targetAllocation: d.targetPct,
          currentValue,
          targetValue,
          actionAmount,
          actionShares: shares,
          reason: `Reduce ${d.assetClass} allocation from ${d.currentPct.toFixed(1)}% to ${d.targetPct}%`,
          priority: Math.abs(d.diff) >= 10 ? 'high' : Math.abs(d.diff) >= 5 ? 'medium' : 'low',
          assetClass: d.assetClass,
        });
      }
    }
  });

  // Generate summary
  const buyActions = actions.filter((a) => a.type === 'buy');
  const sellActions = actions.filter((a) => a.type === 'sell');

  let summary = '';
  if (actions.length === 0) {
    summary = 'Your portfolio is well-balanced! No rebalancing needed at this time.';
  } else {
    const totalBuy = buyActions.reduce((sum, a) => sum + a.actionAmount, 0);
    const totalSell = sellActions.reduce((sum, a) => sum + a.actionAmount, 0);
    summary = `To achieve your ${riskTolerance} target allocation: `;
    if (sellActions.length > 0) {
      summary += `Sell ~$${totalSell.toLocaleString(undefined, { maximumFractionDigits: 0 })} from ${sellActions.length} position${sellActions.length > 1 ? 's' : ''}. `;
    }
    if (buyActions.length > 0) {
      summary += `Buy ~$${totalBuy.toLocaleString(undefined, { maximumFractionDigits: 0 })} across ${buyActions.length} asset class${buyActions.length > 1 ? 'es' : ''}.`;
    }
  }

  return {
    id: `plan_${Date.now()}`,
    createdAt: new Date().toISOString(),
    totalPortfolioValue: totalValue,
    actions,
    estimatedTrades: actions.length,
    estimatedCost: actions.length * 0, // Assume commission-free trading
    summary,
    targetAllocation,
    currentAllocation,
  };
}

/**
 * Get AI-powered rebalancing recommendations
 */
export async function getAIRebalanceRecommendations(
  holdings: Holding[],
  riskTolerance: 'conservative' | 'moderate' | 'aggressive' = 'moderate',
  investmentGoal?: string
): Promise<RebalancePlan> {
  const basicPlan = generateRebalanceActions(holdings, riskTolerance);

  if (holdings.length < 2) {
    return basicPlan;
  }

  const schema = z.object({
    summary: z.string(),
    recommendations: z.array(z.object({
      action: z.enum(['buy', 'sell', 'hold']),
      asset: z.string(),
      amount: z.number(),
      reason: z.string(),
      priority: z.enum(['high', 'medium', 'low']),
    })),
    marketConsiderations: z.string(),
  });

  const holdingsSummary = holdings.map((h) => ({
    name: h.name,
    symbol: h.symbol,
    type: h.type,
    assetClass: h.assetClass,
    value: h.currentValue || h.quantity * (h.currentPrice || h.purchasePrice),
  }));

  const prompt = `As a portfolio advisor, analyze this portfolio and provide specific rebalancing actions:

PORTFOLIO:
${holdingsSummary.map((h) => `- ${h.name} (${h.symbol || h.type}): $${h.value.toLocaleString()} [${h.assetClass}]`).join('\n')}

CURRENT ALLOCATION:
${Object.entries(basicPlan.currentAllocation).map(([cls, pct]) => `- ${cls}: ${pct.toFixed(1)}%`).join('\n')}

TARGET ALLOCATION (${riskTolerance}):
${Object.entries(basicPlan.targetAllocation).map(([cls, pct]) => `- ${cls}: ${pct}%`).join('\n')}

${investmentGoal ? `INVESTMENT GOAL: ${investmentGoal}` : ''}

TOTAL VALUE: $${basicPlan.totalPortfolioValue.toLocaleString()}

Provide specific rebalancing recommendations with exact dollar amounts. Consider:
1. Tax implications of selling
2. Transaction costs
3. Market timing (avoid selling at lows)
4. Minimum trade sizes

Return JSON with:
- summary: Brief explanation of recommended changes
- recommendations: Array of specific actions (action, asset, amount, reason, priority)
- marketConsiderations: Current market factors to consider`;

  try {
    const result = await generateStructuredWithGemini({
      prompt,
      systemInstruction: `${GEMINI_SYSTEM_PROMPT}\n\nYou are a portfolio rebalancing expert. Provide specific, actionable recommendations with exact amounts.`,
      schema,
    });

    // Merge AI recommendations with basic plan
    return {
      ...basicPlan,
      summary: result.summary,
      actions: basicPlan.actions.map((action, i) => ({
        ...action,
        reason: result.recommendations[i]?.reason || action.reason,
      })),
    };
  } catch (error) {
    console.error('[RebalanceService] AI recommendations failed:', error);
    return basicPlan;
  }
}

/**
 * Get suggested holdings for an asset class
 */
function getSuggestedHoldings(assetClass: AssetClass, existingHoldings: Holding[]): Holding[] {
  return existingHoldings
    .filter((h) => h.assetClass === assetClass)
    .sort((a, b) => {
      const aVal = a.currentValue || a.quantity * (a.currentPrice || a.purchasePrice);
      const bVal = b.currentValue || b.quantity * (b.currentPrice || b.purchasePrice);
      return bVal - aVal;
    });
}

/**
 * Get default suggestion for asset class
 */
function getDefaultSuggestion(assetClass: AssetClass): string {
  const suggestions: Record<AssetClass, string> = {
    equity: 'Broad Market ETF (e.g., VTI, SPY)',
    debt: 'Bond ETF (e.g., BND, AGG)',
    commodity: 'Gold ETF (e.g., GLD, IAU)',
    real_asset: 'Real Estate ETF (e.g., VNQ, SCHH)',
    cash: 'High-Yield Savings or Money Market',
  };
  return suggestions[assetClass] || 'Diversified Fund';
}

/**
 * Calculate rebalance urgency score
 */
export function calculateRebalanceUrgency(holdings: Holding[], riskTolerance: string = 'moderate'): number {
  const { allocation } = calculateCurrentAllocation(holdings);
  const target = TARGET_ALLOCATIONS[riskTolerance] || TARGET_ALLOCATIONS.moderate;

  let totalDeviation = 0;
  Object.keys(target).forEach((key) => {
    const assetClass = key as AssetClass;
    const diff = Math.abs((allocation[assetClass] || 0) - target[assetClass]);
    totalDeviation += diff;
  });

  // Score from 0-100 (100 = urgent rebalance needed)
  return Math.min(totalDeviation * 2, 100);
}
