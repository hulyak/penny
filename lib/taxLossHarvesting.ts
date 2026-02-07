import { Holding } from '@/types';

export interface TaxLossOpportunity {
  holding: Holding;
  currentValue: number;
  costBasis: number;
  unrealizedLoss: number;
  lossPercent: number;
  holdingPeriod: 'short_term' | 'long_term';
  daysSincepurchase: number;
  potentialTaxSavings: number;
}

export interface TaxLossSummary {
  opportunities: TaxLossOpportunity[];
  totalUnrealizedLosses: number;
  totalUnrealizedGains: number;
  netPosition: number;
  estimatedTaxSavings: number;
  harvestableCount: number;
}

const SHORT_TERM_TAX_RATE = 0.32; // Estimated marginal rate
const LONG_TERM_TAX_RATE = 0.15;

function getHoldingPeriod(purchaseDate: string): { period: 'short_term' | 'long_term'; days: number } {
  const purchase = new Date(purchaseDate);
  const now = new Date();
  const days = Math.floor((now.getTime() - purchase.getTime()) / (1000 * 60 * 60 * 24));
  return {
    period: days > 365 ? 'long_term' : 'short_term',
    days,
  };
}

export function analyzeTaxLossHarvesting(holdings: Holding[]): TaxLossSummary {
  const opportunities: TaxLossOpportunity[] = [];
  let totalUnrealizedLosses = 0;
  let totalUnrealizedGains = 0;

  for (const holding of holdings) {
    // Only analyze holdings with live pricing (stocks, ETFs, crypto)
    if (!holding.currentPrice || holding.currentPrice <= 0) continue;

    const currentValue = holding.quantity * holding.currentPrice;
    const costBasis = holding.quantity * holding.purchasePrice;
    const unrealizedGainLoss = currentValue - costBasis;

    if (unrealizedGainLoss >= 0) {
      totalUnrealizedGains += unrealizedGainLoss;
      continue;
    }

    // This holding has an unrealized loss
    const unrealizedLoss = Math.abs(unrealizedGainLoss);
    const lossPercent = costBasis > 0 ? (unrealizedGainLoss / costBasis) * 100 : 0;
    const { period, days } = getHoldingPeriod(holding.purchaseDate);
    const taxRate = period === 'short_term' ? SHORT_TERM_TAX_RATE : LONG_TERM_TAX_RATE;
    const potentialTaxSavings = unrealizedLoss * taxRate;

    totalUnrealizedLosses += unrealizedLoss;

    opportunities.push({
      holding,
      currentValue,
      costBasis,
      unrealizedLoss,
      lossPercent,
      holdingPeriod: period,
      daysSincepurchase: days,
      potentialTaxSavings,
    });
  }

  // Sort by largest loss first
  opportunities.sort((a, b) => b.unrealizedLoss - a.unrealizedLoss);

  // Estimate total tax savings (losses can offset gains, and up to $3000 of ordinary income)
  const offsetableAmount = Math.min(totalUnrealizedLosses, totalUnrealizedGains + 3000);
  const estimatedTaxSavings = opportunities.reduce((sum, o) => sum + o.potentialTaxSavings, 0);

  return {
    opportunities,
    totalUnrealizedLosses,
    totalUnrealizedGains,
    netPosition: totalUnrealizedGains - totalUnrealizedLosses,
    estimatedTaxSavings,
    harvestableCount: opportunities.length,
  };
}
