import AsyncStorage from '@react-native-async-storage/async-storage';
import { Holding } from '@/types';

const PORTFOLIO_MILESTONES_KEY = 'penny_portfolio_milestones';
const CELEBRATED_MILESTONES_KEY = 'penny_portfolio_celebrated';

export interface PortfolioMilestone {
  id: string;
  type: 'value' | 'holdings' | 'diversification' | 'streak' | 'performance';
  title: string;
  description: string;
  target: number;
  current: number;
  unit: string;
  icon: string;
  badge?: string;
  isAchieved: boolean;
  achievedAt?: string;
}

export interface PortfolioCelebration {
  milestone: PortfolioMilestone;
  message: string;
  badge?: string;
  confettiColors: string[];
}

export const DEFAULT_PORTFOLIO_MILESTONES: Omit<PortfolioMilestone, 'current' | 'isAchieved' | 'achievedAt'>[] = [
  // Value milestones
  {
    id: 'first_1k_tracked',
    type: 'value',
    title: 'First $1K Tracked',
    description: 'Track your first $1,000 in investments',
    target: 1000,
    unit: 'dollars',
    icon: '💰',
    badge: '🌱',
  },
  {
    id: 'first_10k_tracked',
    type: 'value',
    title: 'Five-Figure Investor',
    description: 'Track $10,000+ in investments',
    target: 10000,
    unit: 'dollars',
    icon: '💵',
    badge: '⭐',
  },
  {
    id: 'first_50k_tracked',
    type: 'value',
    title: 'Serious Investor',
    description: 'Track $50,000+ in investments',
    target: 50000,
    unit: 'dollars',
    icon: '🏆',
    badge: '💎',
  },
  {
    id: 'first_100k_tracked',
    type: 'value',
    title: 'Six-Figure Club',
    description: 'Track $100,000+ in investments',
    target: 100000,
    unit: 'dollars',
    icon: '👑',
    badge: '🏅',
  },

  // Holdings milestones
  {
    id: 'first_holding',
    type: 'holdings',
    title: 'First Investment',
    description: 'Add your first holding to track',
    target: 1,
    unit: 'holdings',
    icon: '🎯',
    badge: '📈',
  },
  {
    id: 'five_holdings',
    type: 'holdings',
    title: 'Building Diversity',
    description: 'Track 5 different investments',
    target: 5,
    unit: 'holdings',
    icon: '📊',
    badge: '🌟',
  },
  {
    id: 'ten_holdings',
    type: 'holdings',
    title: 'Diversified Portfolio',
    description: 'Track 10+ different investments',
    target: 10,
    unit: 'holdings',
    icon: '🎨',
    badge: '🏆',
  },

  // Diversification milestones
  {
    id: 'two_asset_classes',
    type: 'diversification',
    title: 'Asset Explorer',
    description: 'Invest across 2 asset classes',
    target: 2,
    unit: 'asset classes',
    icon: '🔀',
    badge: '🌈',
  },
  {
    id: 'four_asset_classes',
    type: 'diversification',
    title: 'Balanced Investor',
    description: 'Invest across 4+ asset classes',
    target: 4,
    unit: 'asset classes',
    icon: '⚖️',
    badge: '🎖️',
  },
  {
    id: 'high_diversification_score',
    type: 'diversification',
    title: 'Diversification Master',
    description: 'Achieve a 75+ diversification score',
    target: 75,
    unit: 'score',
    icon: '🛡️',
    badge: '💎',
  },

  // Performance milestones
  {
    id: 'first_gain',
    type: 'performance',
    title: 'In The Green',
    description: 'See your first positive return',
    target: 1,
    unit: 'percent',
    icon: '📈',
    badge: '🍀',
  },
  {
    id: 'ten_percent_gain',
    type: 'performance',
    title: 'Double Digits',
    description: 'Achieve 10%+ total returns',
    target: 10,
    unit: 'percent',
    icon: '🚀',
    badge: '🔥',
  },

  // Streak milestones
  {
    id: 'week_tracking_streak',
    type: 'streak',
    title: 'Consistent Tracker',
    description: 'Check portfolio for 7 days straight',
    target: 7,
    unit: 'days',
    icon: '🔥',
    badge: '📅',
  },
  {
    id: 'month_tracking_streak',
    type: 'streak',
    title: 'Portfolio Devotee',
    description: 'Track for 30 days straight',
    target: 30,
    unit: 'days',
    icon: '🌟',
    badge: '🏆',
  },
];

export async function getPortfolioMilestones(): Promise<PortfolioMilestone[]> {
  try {
    const stored = await AsyncStorage.getItem(PORTFOLIO_MILESTONES_KEY);
    if (stored) {
      return JSON.parse(stored);
    }

    // Initialize with defaults
    const milestones: PortfolioMilestone[] = DEFAULT_PORTFOLIO_MILESTONES.map((m) => ({
      ...m,
      current: 0,
      isAchieved: false,
    }));
    await AsyncStorage.setItem(PORTFOLIO_MILESTONES_KEY, JSON.stringify(milestones));
    return milestones;
  } catch (error) {
    console.error('[PortfolioMilestones] Error loading:', error);
    return [];
  }
}

export async function checkPortfolioMilestones(context: {
  totalValue: number;
  holdingsCount: number;
  assetClassCount: number;
  diversificationScore: number;
  totalGainPercent: number;
  trackingStreak: number;
}): Promise<PortfolioCelebration[]> {
  const milestones = await getPortfolioMilestones();
  const celebrated = await getCelebratedMilestones();
  const celebrations: PortfolioCelebration[] = [];

  for (const milestone of milestones) {
    if (milestone.isAchieved || celebrated.includes(milestone.id)) continue;

    let currentValue = 0;

    switch (milestone.id) {
      case 'first_1k_tracked':
      case 'first_10k_tracked':
      case 'first_50k_tracked':
      case 'first_100k_tracked':
        currentValue = context.totalValue;
        break;
      case 'first_holding':
      case 'five_holdings':
      case 'ten_holdings':
        currentValue = context.holdingsCount;
        break;
      case 'two_asset_classes':
      case 'four_asset_classes':
        currentValue = context.assetClassCount;
        break;
      case 'high_diversification_score':
        currentValue = context.diversificationScore;
        break;
      case 'first_gain':
      case 'ten_percent_gain':
        currentValue = context.totalGainPercent;
        break;
      case 'week_tracking_streak':
      case 'month_tracking_streak':
        currentValue = context.trackingStreak;
        break;
    }

    milestone.current = currentValue;

    if (currentValue >= milestone.target) {
      milestone.isAchieved = true;
      milestone.achievedAt = new Date().toISOString();

      // Mark as celebrated
      celebrated.push(milestone.id);
      await AsyncStorage.setItem(CELEBRATED_MILESTONES_KEY, JSON.stringify(celebrated));

      // Create celebration
      const celebration = createCelebration(milestone);
      celebrations.push(celebration);
    }
  }

  await AsyncStorage.setItem(PORTFOLIO_MILESTONES_KEY, JSON.stringify(milestones));
  return celebrations;
}

function createCelebration(milestone: PortfolioMilestone): PortfolioCelebration {
  const messages: Record<string, string> = {
    first_1k_tracked: "You're officially tracking your investments! This is the first step to financial clarity.",
    first_10k_tracked: "Five figures! You're building serious wealth. Keep up the great work!",
    first_50k_tracked: "Wow! Your portfolio is growing impressively. You're a dedicated investor.",
    first_100k_tracked: "Welcome to the six-figure club! This is an incredible milestone.",
    first_holding: "You've taken the first step! Tracking your investments is key to growing them.",
    five_holdings: "Nice diversification! Multiple investments help spread your risk.",
    ten_holdings: "You're a diversification pro! A well-spread portfolio is a resilient one.",
    two_asset_classes: "Smart move! Investing across asset classes reduces overall risk.",
    four_asset_classes: "Impressive! True diversification across multiple asset types.",
    high_diversification_score: "You've mastered diversification! Your portfolio is well-balanced.",
    first_gain: "Congratulations on your first positive return! Here's to many more!",
    ten_percent_gain: "Double-digit returns! Your investment strategy is paying off.",
    week_tracking_streak: "A week of tracking! Consistent monitoring leads to better decisions.",
    month_tracking_streak: "A full month of tracking! You're truly committed to your financial future.",
  };

  const confettiColors: Record<string, string[]> = {
    value: ['#10B981', '#34D399', '#6EE7B7', '#FFD700'],
    holdings: ['#3B82F6', '#60A5FA', '#93C5FD', '#10B981'],
    diversification: ['#8B5CF6', '#A78BFA', '#C4B5FD', '#F472B6'],
    performance: ['#F97316', '#FB923C', '#FDBA74', '#FCD34D'],
    streak: ['#EC4899', '#F472B6', '#F9A8D4', '#FCD34D'],
  };

  return {
    milestone,
    message: messages[milestone.id] || `Amazing! You've achieved "${milestone.title}"!`,
    badge: milestone.badge,
    confettiColors: confettiColors[milestone.type] || confettiColors.value,
  };
}

async function getCelebratedMilestones(): Promise<string[]> {
  try {
    const stored = await AsyncStorage.getItem(CELEBRATED_MILESTONES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    return [];
  }
}

export async function getNextPortfolioMilestones(limit: number = 3): Promise<PortfolioMilestone[]> {
  const milestones = await getPortfolioMilestones();
  return milestones
    .filter((m) => !m.isAchieved)
    .sort((a, b) => {
      const progressA = a.target > 0 ? a.current / a.target : 0;
      const progressB = b.target > 0 ? b.current / b.target : 0;
      return progressB - progressA;
    })
    .slice(0, limit);
}

export async function getAchievedPortfolioMilestones(): Promise<PortfolioMilestone[]> {
  const milestones = await getPortfolioMilestones();
  return milestones
    .filter((m) => m.isAchieved)
    .sort((a, b) => {
      return new Date(b.achievedAt!).getTime() - new Date(a.achievedAt!).getTime();
    });
}

export function getMilestoneProgress(milestone: PortfolioMilestone): number {
  return Math.min(100, (milestone.current / milestone.target) * 100);
}
