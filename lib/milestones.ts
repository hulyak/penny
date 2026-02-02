import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateWithGemini } from './gemini';

const MILESTONES_KEY = 'penny_milestones';
const CELEBRATED_KEY = 'penny_celebrated_milestones';

export interface Milestone {
  id: string;
  type: 'savings' | 'streak' | 'budget' | 'learning' | 'habit' | 'custom';
  title: string;
  description: string;
  target: number;
  current: number;
  unit: string;
  icon: string;
  celebrationMessage?: string;
  rewardBadge?: string;
  achievedAt?: string;
  isAchieved: boolean;
}

export interface CelebrationData {
  milestone: Milestone;
  message: string;
  badge?: string;
  confettiColors: string[];
}

// Default milestones users can achieve
export const DEFAULT_MILESTONES: Omit<Milestone, 'current' | 'isAchieved' | 'achievedAt'>[] = [
  // Savings milestones
  {
    id: 'first_100_saved',
    type: 'savings',
    title: 'First $100 Saved',
    description: 'Save your first $100 in your emergency fund',
    target: 100,
    unit: 'dollars',
    icon: '💰',
    rewardBadge: '🌱',
  },
  {
    id: 'first_1000_saved',
    type: 'savings',
    title: 'Four-Figure Saver',
    description: 'Reach $1,000 in savings',
    target: 1000,
    unit: 'dollars',
    icon: '💵',
    rewardBadge: '⭐',
  },
  {
    id: 'one_month_runway',
    type: 'savings',
    title: 'One Month Cushion',
    description: 'Build one month of emergency runway',
    target: 1,
    unit: 'months',
    icon: '🛡️',
    rewardBadge: '🥉',
  },
  {
    id: 'three_month_runway',
    type: 'savings',
    title: 'Safety Net Hero',
    description: 'Build three months of emergency runway',
    target: 3,
    unit: 'months',
    icon: '🦸',
    rewardBadge: '🥈',
  },
  {
    id: 'six_month_runway',
    type: 'savings',
    title: 'Financial Fortress',
    description: 'Build six months of emergency runway',
    target: 6,
    unit: 'months',
    icon: '🏰',
    rewardBadge: '🥇',
  },

  // Streak milestones
  {
    id: 'week_streak',
    type: 'streak',
    title: 'Week Warrior',
    description: 'Check in for 7 days in a row',
    target: 7,
    unit: 'days',
    icon: '🔥',
    rewardBadge: '📅',
  },
  {
    id: 'month_streak',
    type: 'streak',
    title: 'Monthly Master',
    description: 'Check in for 30 days in a row',
    target: 30,
    unit: 'days',
    icon: '🌟',
    rewardBadge: '🏆',
  },

  // Budget milestones
  {
    id: 'first_under_budget',
    type: 'budget',
    title: 'Budget Boss',
    description: 'Stay under budget for a full month',
    target: 1,
    unit: 'months',
    icon: '📊',
    rewardBadge: '✅',
  },
  {
    id: 'savings_rate_20',
    type: 'budget',
    title: 'Super Saver',
    description: 'Achieve a 20% savings rate',
    target: 20,
    unit: 'percent',
    icon: '📈',
    rewardBadge: '💎',
  },

  // Learning milestones
  {
    id: 'first_lesson',
    type: 'learning',
    title: 'Knowledge Seeker',
    description: 'Complete your first financial lesson',
    target: 1,
    unit: 'lessons',
    icon: '📚',
    rewardBadge: '🎓',
  },
  {
    id: 'five_lessons',
    type: 'learning',
    title: 'Quick Learner',
    description: 'Complete 5 financial lessons',
    target: 5,
    unit: 'lessons',
    icon: '🧠',
    rewardBadge: '🌟',
  },
];

export async function getMilestones(): Promise<Milestone[]> {
  try {
    const stored = await AsyncStorage.getItem(MILESTONES_KEY);
    if (stored) {
      return JSON.parse(stored);
    }

    // Initialize with default milestones
    const milestones: Milestone[] = DEFAULT_MILESTONES.map(m => ({
      ...m,
      current: 0,
      isAchieved: false,
    }));
    await AsyncStorage.setItem(MILESTONES_KEY, JSON.stringify(milestones));
    return milestones;
  } catch (error) {
    console.error('[Milestones] Error loading milestones:', error);
    return [];
  }
}

export async function saveMilestones(milestones: Milestone[]): Promise<void> {
  try {
    await AsyncStorage.setItem(MILESTONES_KEY, JSON.stringify(milestones));
  } catch (error) {
    console.error('[Milestones] Error saving milestones:', error);
  }
}

export async function updateMilestoneProgress(
  milestoneId: string,
  currentValue: number
): Promise<CelebrationData | null> {
  const milestones = await getMilestones();
  const milestone = milestones.find(m => m.id === milestoneId);

  if (!milestone || milestone.isAchieved) return null;

  milestone.current = currentValue;

  // Check if milestone is achieved
  if (currentValue >= milestone.target) {
    milestone.isAchieved = true;
    milestone.achievedAt = new Date().toISOString();

    await saveMilestones(milestones);
    return await generateCelebration(milestone);
  }

  await saveMilestones(milestones);
  return null;
}

export async function checkAllMilestones(context: {
  savings: number;
  monthsOfRunway: number;
  streak: number;
  savingsRate: number;
  lessonsCompleted: number;
  monthsUnderBudget: number;
}): Promise<CelebrationData[]> {
  const milestones = await getMilestones();
  const celebrations: CelebrationData[] = [];

  for (const milestone of milestones) {
    if (milestone.isAchieved) continue;

    let currentValue = 0;

    switch (milestone.id) {
      case 'first_100_saved':
      case 'first_1000_saved':
        currentValue = context.savings;
        break;
      case 'one_month_runway':
      case 'three_month_runway':
      case 'six_month_runway':
        currentValue = context.monthsOfRunway;
        break;
      case 'week_streak':
      case 'month_streak':
        currentValue = context.streak;
        break;
      case 'savings_rate_20':
        currentValue = context.savingsRate;
        break;
      case 'first_lesson':
      case 'five_lessons':
        currentValue = context.lessonsCompleted;
        break;
      case 'first_under_budget':
        currentValue = context.monthsUnderBudget;
        break;
    }

    milestone.current = currentValue;

    if (currentValue >= milestone.target) {
      milestone.isAchieved = true;
      milestone.achievedAt = new Date().toISOString();

      const celebration = await generateCelebration(milestone);
      celebrations.push(celebration);
    }
  }

  await saveMilestones(milestones);
  return celebrations;
}

async function generateCelebration(milestone: Milestone): Promise<CelebrationData> {
  // Mark as celebrated
  const celebrated = await getCelebratedMilestones();
  celebrated.push(milestone.id);
  await AsyncStorage.setItem(CELEBRATED_KEY, JSON.stringify(celebrated));

  // Generate personalized celebration message
  let message = '';
  try {
    const prompt = `You are Penny, celebrating a user's financial milestone!

Milestone: ${milestone.title}
Description: ${milestone.description}
What they achieved: ${milestone.current} ${milestone.unit}

Generate a short, enthusiastic celebration message (2-3 sentences). Be warm, specific, and encouraging. End with motivation to keep going.`;

    message = await generateWithGemini({
      prompt,
      temperature: 0.8,
      maxTokens: 100,
      thinkingLevel: 'low',
    });
  } catch (error) {
    message = `Amazing! You've achieved "${milestone.title}"! ${milestone.icon} Your hard work is paying off. Keep building those great financial habits!`;
  }

  // Confetti colors based on milestone type
  const confettiColors = getConfettiColors(milestone.type);

  return {
    milestone,
    message,
    badge: milestone.rewardBadge,
    confettiColors,
  };
}

function getConfettiColors(type: Milestone['type']): string[] {
  switch (type) {
    case 'savings':
      return ['#10B981', '#34D399', '#6EE7B7', '#FFD700']; // Greens + gold
    case 'streak':
      return ['#F97316', '#FB923C', '#FDBA74', '#FCD34D']; // Oranges + yellow
    case 'budget':
      return ['#3B82F6', '#60A5FA', '#93C5FD', '#10B981']; // Blues + green
    case 'learning':
      return ['#8B5CF6', '#A78BFA', '#C4B5FD', '#F472B6']; // Purples + pink
    default:
      return ['#10B981', '#3B82F6', '#8B5CF6', '#F97316']; // Mix
  }
}

async function getCelebratedMilestones(): Promise<string[]> {
  try {
    const stored = await AsyncStorage.getItem(CELEBRATED_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    return [];
  }
}

export async function getNextMilestones(limit: number = 3): Promise<Milestone[]> {
  const milestones = await getMilestones();
  return milestones
    .filter(m => !m.isAchieved)
    .sort((a, b) => {
      // Sort by progress percentage
      const progressA = a.current / a.target;
      const progressB = b.current / b.target;
      return progressB - progressA;
    })
    .slice(0, limit);
}

export async function getAchievedMilestones(): Promise<Milestone[]> {
  const milestones = await getMilestones();
  return milestones
    .filter(m => m.isAchieved)
    .sort((a, b) => {
      // Sort by achievement date, newest first
      return new Date(b.achievedAt!).getTime() - new Date(a.achievedAt!).getTime();
    });
}

export function getMilestoneProgress(milestone: Milestone): number {
  return Math.min(100, (milestone.current / milestone.target) * 100);
}
