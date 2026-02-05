import { Holding, AssetClass, CommunityBenchmark, PeerComparison, ASSET_CLASS_COLORS } from '@/types';

// Simulated community data (in a real app, this would come from a backend)
// Based on typical retail investor distributions
const COMMUNITY_DATA = {
  portfolioSize: {
    '18-25': { avg: 8500, median: 3200, p25: 1000, p75: 12000, p90: 25000 },
    '26-35': { avg: 45000, median: 28000, p25: 8000, p75: 65000, p90: 120000 },
    '36-45': { avg: 125000, median: 85000, p25: 35000, p75: 180000, p90: 350000 },
    '46-55': { avg: 280000, median: 175000, p25: 75000, p75: 400000, p90: 750000 },
    '56+': { avg: 420000, median: 250000, p25: 100000, p75: 600000, p90: 1200000 },
  },
  diversificationScore: {
    '18-25': { avg: 42, median: 38, p25: 25, p75: 55, p90: 70 },
    '26-35': { avg: 52, median: 48, p25: 35, p75: 65, p90: 78 },
    '36-45': { avg: 61, median: 58, p25: 45, p75: 72, p90: 85 },
    '46-55': { avg: 68, median: 65, p25: 52, p75: 78, p90: 88 },
    '56+': { avg: 72, median: 70, p25: 58, p75: 82, p90: 92 },
  },
  holdingsCount: {
    '18-25': { avg: 4, median: 3, p25: 1, p75: 6, p90: 12 },
    '26-35': { avg: 8, median: 6, p25: 3, p75: 12, p90: 20 },
    '36-45': { avg: 12, median: 10, p25: 5, p75: 18, p90: 30 },
    '46-55': { avg: 15, median: 12, p25: 7, p75: 22, p90: 35 },
    '56+': { avg: 14, median: 11, p25: 6, p75: 20, p90: 32 },
  },
  equityAllocation: {
    '18-25': { avg: 78, median: 85, p25: 60, p75: 95, p90: 100 },
    '26-35': { avg: 72, median: 75, p25: 55, p75: 88, p90: 95 },
    '36-45': { avg: 65, median: 65, p25: 50, p75: 78, p90: 88 },
    '46-55': { avg: 55, median: 55, p25: 40, p75: 68, p90: 80 },
    '56+': { avg: 42, median: 40, p25: 28, p75: 55, p90: 68 },
  },
  cryptoAllocation: {
    '18-25': { avg: 22, median: 15, p25: 5, p75: 35, p90: 55 },
    '26-35': { avg: 12, median: 8, p25: 2, p75: 18, p90: 30 },
    '36-45': { avg: 6, median: 3, p25: 0, p75: 10, p90: 18 },
    '46-55': { avg: 3, median: 1, p25: 0, p75: 5, p90: 10 },
    '56+': { avg: 1, median: 0, p25: 0, p75: 2, p90: 5 },
  },
  participants: {
    '18-25': 12500,
    '26-35': 28400,
    '36-45': 18200,
    '46-55': 9800,
    '56+': 6100,
  },
};

type AgeGroup = keyof typeof COMMUNITY_DATA.participants;

/**
 * Determine age group from age
 */
function getAgeGroup(age: number): AgeGroup {
  if (age < 26) return '18-25';
  if (age < 36) return '26-35';
  if (age < 46) return '36-45';
  if (age < 56) return '46-55';
  return '56+';
}

/**
 * Calculate percentile
 */
function calculatePercentile(value: number, data: { avg: number; median: number; p25: number; p75: number; p90: number }): number {
  if (value <= data.p25) return Math.round((value / data.p25) * 25);
  if (value <= data.median) return 25 + Math.round(((value - data.p25) / (data.median - data.p25)) * 25);
  if (value <= data.p75) return 50 + Math.round(((value - data.median) / (data.p75 - data.median)) * 25);
  if (value <= data.p90) return 75 + Math.round(((value - data.p75) / (data.p90 - data.p75)) * 15);
  return Math.min(90 + Math.round(((value - data.p90) / data.p90) * 10), 99);
}

/**
 * Get trend indicator
 */
function getTrend(percentile: number): 'above' | 'at' | 'below' {
  if (percentile >= 60) return 'above';
  if (percentile >= 40) return 'at';
  return 'below';
}

/**
 * Calculate portfolio metrics for benchmarking
 */
function calculatePortfolioMetrics(holdings: Holding[]): {
  totalValue: number;
  holdingsCount: number;
  equityAllocation: number;
  cryptoAllocation: number;
  diversificationScore: number;
} {
  let totalValue = 0;
  let equityValue = 0;
  let cryptoValue = 0;

  holdings.forEach((h) => {
    const value = h.currentValue || h.quantity * (h.currentPrice || h.purchasePrice);
    totalValue += value;
    if (h.assetClass === 'equity' && h.type !== 'crypto') equityValue += value;
    if (h.type === 'crypto') cryptoValue += value;
  });

  const equityAllocation = totalValue > 0 ? (equityValue / totalValue) * 100 : 0;
  const cryptoAllocation = totalValue > 0 ? (cryptoValue / totalValue) * 100 : 0;

  // Simple diversification score
  const uniqueAssetClasses = new Set(holdings.map((h) => h.assetClass)).size;
  const uniqueSectors = new Set(holdings.map((h) => h.sector).filter(Boolean)).size;
  const maxHoldingPct = holdings.reduce((max, h) => {
    const pct = totalValue > 0 ? ((h.currentValue || h.quantity * (h.currentPrice || h.purchasePrice)) / totalValue) * 100 : 0;
    return Math.max(max, pct);
  }, 0);

  let diversificationScore = 0;
  diversificationScore += Math.min(uniqueAssetClasses * 15, 30);
  diversificationScore += Math.min(holdings.length * 3, 25);
  diversificationScore += Math.min(uniqueSectors * 5, 25);
  diversificationScore += maxHoldingPct < 20 ? 20 : maxHoldingPct < 40 ? 10 : 0;

  return {
    totalValue,
    holdingsCount: holdings.length,
    equityAllocation,
    cryptoAllocation,
    diversificationScore: Math.min(diversificationScore, 100),
  };
}

/**
 * Get peer comparison for a user's portfolio
 */
export function getPeerComparison(
  holdings: Holding[],
  userAge: number = 30
): PeerComparison {
  const ageGroup = getAgeGroup(userAge);
  const metrics = calculatePortfolioMetrics(holdings);

  const benchmarks: CommunityBenchmark[] = [];

  // Portfolio Size
  const sizeData = COMMUNITY_DATA.portfolioSize[ageGroup];
  const sizePercentile = calculatePercentile(metrics.totalValue, sizeData);
  benchmarks.push({
    category: 'Portfolio Size',
    userValue: metrics.totalValue,
    communityAverage: sizeData.avg,
    communityMedian: sizeData.median,
    percentile: sizePercentile,
    trend: getTrend(sizePercentile),
  });

  // Holdings Count
  const holdingsData = COMMUNITY_DATA.holdingsCount[ageGroup];
  const holdingsPercentile = calculatePercentile(metrics.holdingsCount, holdingsData);
  benchmarks.push({
    category: 'Number of Holdings',
    userValue: metrics.holdingsCount,
    communityAverage: holdingsData.avg,
    communityMedian: holdingsData.median,
    percentile: holdingsPercentile,
    trend: getTrend(holdingsPercentile),
  });

  // Diversification Score
  const divData = COMMUNITY_DATA.diversificationScore[ageGroup];
  const divPercentile = calculatePercentile(metrics.diversificationScore, divData);
  benchmarks.push({
    category: 'Diversification Score',
    userValue: metrics.diversificationScore,
    communityAverage: divData.avg,
    communityMedian: divData.median,
    percentile: divPercentile,
    trend: getTrend(divPercentile),
  });

  // Equity Allocation
  const equityData = COMMUNITY_DATA.equityAllocation[ageGroup];
  const equityPercentile = calculatePercentile(metrics.equityAllocation, equityData);
  benchmarks.push({
    category: 'Equity Allocation',
    userValue: metrics.equityAllocation,
    communityAverage: equityData.avg,
    communityMedian: equityData.median,
    percentile: equityPercentile,
    trend: getTrend(equityPercentile),
  });

  // Crypto Allocation (only if user has crypto)
  if (metrics.cryptoAllocation > 0) {
    const cryptoData = COMMUNITY_DATA.cryptoAllocation[ageGroup];
    const cryptoPercentile = calculatePercentile(metrics.cryptoAllocation, cryptoData);
    benchmarks.push({
      category: 'Crypto Allocation',
      userValue: metrics.cryptoAllocation,
      communityAverage: cryptoData.avg,
      communityMedian: cryptoData.median,
      percentile: cryptoPercentile,
      trend: getTrend(cryptoPercentile),
    });
  }

  // Generate insights
  const insights = generateInsights(benchmarks, ageGroup);

  return {
    ageGroup: ageGroup.replace('-', ' to '),
    incomeRange: 'All income levels',
    totalParticipants: COMMUNITY_DATA.participants[ageGroup],
    benchmarks,
    insights,
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Generate personalized insights from benchmarks
 */
function generateInsights(benchmarks: CommunityBenchmark[], ageGroup: AgeGroup): string[] {
  const insights: string[] = [];

  const sizeB = benchmarks.find((b) => b.category === 'Portfolio Size');
  const divB = benchmarks.find((b) => b.category === 'Diversification Score');
  const equityB = benchmarks.find((b) => b.category === 'Equity Allocation');
  const cryptoB = benchmarks.find((b) => b.category === 'Crypto Allocation');

  // Portfolio size insight
  if (sizeB) {
    if (sizeB.percentile >= 75) {
      insights.push(`Your portfolio is larger than ${sizeB.percentile}% of investors in your age group. Great job building wealth!`);
    } else if (sizeB.percentile <= 25) {
      insights.push(`Your portfolio is still growing. Consider setting up automatic investments to build wealth consistently.`);
    }
  }

  // Diversification insight
  if (divB) {
    if (divB.percentile >= 70) {
      insights.push(`Your diversification is excellent - better than ${divB.percentile}% of peers. This helps manage risk.`);
    } else if (divB.percentile <= 30) {
      insights.push(`Consider diversifying more. Most peers your age have more variety in their portfolios.`);
    }
  }

  // Equity allocation insight
  if (equityB) {
    if (equityB.userValue > equityB.communityMedian + 15) {
      insights.push(`Your equity allocation (${equityB.userValue.toFixed(0)}%) is higher than most peers. Good for growth, but watch your risk tolerance.`);
    } else if (equityB.userValue < equityB.communityMedian - 15) {
      insights.push(`Your equity allocation is lower than peers. If you have a long time horizon, stocks historically provide better returns.`);
    }
  }

  // Crypto insight
  if (cryptoB && cryptoB.userValue > 20) {
    insights.push(`Your crypto allocation (${cryptoB.userValue.toFixed(0)}%) is higher than ${100 - cryptoB.percentile}% of peers. High reward potential, but also high volatility.`);
  }

  // Add general insight if we don't have many
  if (insights.length < 2) {
    insights.push(`You're part of a community of ${COMMUNITY_DATA.participants[ageGroup].toLocaleString()} investors in your age group.`);
  }

  return insights.slice(0, 4);
}

/**
 * Get anonymous leaderboard data
 */
export function getLeaderboard(holdings: Holding[], userAge: number = 30): {
  userRank: number;
  totalUsers: number;
  topPerformers: { percentile: number; avgReturn: number; avgDiversification: number }[];
} {
  const ageGroup = getAgeGroup(userAge);
  const metrics = calculatePortfolioMetrics(holdings);
  const sizeData = COMMUNITY_DATA.portfolioSize[ageGroup];
  const percentile = calculatePercentile(metrics.totalValue, sizeData);
  const totalUsers = COMMUNITY_DATA.participants[ageGroup];

  return {
    userRank: Math.round(totalUsers * (1 - percentile / 100)),
    totalUsers,
    topPerformers: [
      { percentile: 90, avgReturn: 15.2, avgDiversification: 78 },
      { percentile: 75, avgReturn: 11.8, avgDiversification: 68 },
      { percentile: 50, avgReturn: 8.5, avgDiversification: 55 },
    ],
  };
}
