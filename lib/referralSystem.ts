import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

const REFERRAL_KEY = 'penny_referral_data';
const REFERRAL_REWARDS_KEY = 'penny_referral_rewards';

export interface ReferralData {
  code: string;
  referralLink: string;
  referralsCount: number;
  successfulReferrals: number;
  pendingReferrals: number;
  totalRewardDays: number;
  usedRewardDays: number;
  referredBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReferralReward {
  id: string;
  type: 'referral_bonus' | 'ambassador_tier' | 'milestone_bonus';
  title: string;
  description: string;
  premiumDays: number;
  earnedAt: string;
  expiresAt?: string;
  isUsed: boolean;
}

export interface ReferralTier {
  name: string;
  minReferrals: number;
  badge: string;
  perks: string[];
  premiumDaysPerReferral: number;
}

export const REFERRAL_TIERS: ReferralTier[] = [
  {
    name: 'Starter',
    minReferrals: 0,
    badge: '🌱',
    perks: ['7 days PRO per referral'],
    premiumDaysPerReferral: 7,
  },
  {
    name: 'Advocate',
    minReferrals: 3,
    badge: 'penny',
    perks: ['10 days PRO per referral', 'Early feature access'],
    premiumDaysPerReferral: 10,
  },
  {
    name: 'Champion',
    minReferrals: 5,
    badge: 'penny',
    perks: ['14 days PRO per referral', 'Priority support', 'Exclusive badge'],
    premiumDaysPerReferral: 14,
  },
  {
    name: 'Ambassador',
    minReferrals: 10,
    badge: 'penny',
    perks: ['30 days PRO per referral', 'Direct feedback channel', 'Beta tester'],
    premiumDaysPerReferral: 30,
  },
];

export async function generateReferralCode(userId: string): Promise<string> {
  // Generate a unique 8-character referral code
  const randomBytes = await Crypto.getRandomBytesAsync(4);
  const randomPart = Array.from(randomBytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()
    .slice(0, 6);

  return `PENNY${randomPart}`;
}

export async function getReferralData(): Promise<ReferralData | null> {
  try {
    const stored = await AsyncStorage.getItem(REFERRAL_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.error('[Referral] Error loading referral data:', error);
    return null;
  }
}

export async function initializeReferralData(userId: string): Promise<ReferralData> {
  const existingData = await getReferralData();
  if (existingData) return existingData;

  const code = await generateReferralCode(userId);
  const referralData: ReferralData = {
    code,
    referralLink: `https://penny.app/invite/${code}`,
    referralsCount: 0,
    successfulReferrals: 0,
    pendingReferrals: 0,
    totalRewardDays: 0,
    usedRewardDays: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await AsyncStorage.setItem(REFERRAL_KEY, JSON.stringify(referralData));
  return referralData;
}

export async function recordReferral(referredUserId: string): Promise<ReferralReward | null> {
  try {
    const data = await getReferralData();
    if (!data) return null;

    // Get current tier
    const tier = getCurrentTier(data.successfulReferrals);

    // Update referral counts
    data.referralsCount += 1;
    data.successfulReferrals += 1;
    data.totalRewardDays += tier.premiumDaysPerReferral;
    data.updatedAt = new Date().toISOString();

    await AsyncStorage.setItem(REFERRAL_KEY, JSON.stringify(data));

    // Create reward
    const reward: ReferralReward = {
      id: `reward_${Date.now()}`,
      type: 'referral_bonus',
      title: `Referral Bonus`,
      description: `${tier.premiumDaysPerReferral} days of PRO access earned!`,
      premiumDays: tier.premiumDaysPerReferral,
      earnedAt: new Date().toISOString(),
      isUsed: false,
    };

    // Save reward
    await saveReward(reward);

    // Check for tier milestone bonus
    const newTier = getCurrentTier(data.successfulReferrals);
    if (newTier.name !== tier.name && newTier.minReferrals === data.successfulReferrals) {
      // User just reached a new tier!
      const milestoneReward: ReferralReward = {
        id: `milestone_${Date.now()}`,
        type: 'milestone_bonus',
        title: `${newTier.badge} ${newTier.name} Unlocked!`,
        description: `Bonus 7 days PRO for reaching ${newTier.name} tier!`,
        premiumDays: 7,
        earnedAt: new Date().toISOString(),
        isUsed: false,
      };
      await saveReward(milestoneReward);
    }

    return reward;
  } catch (error) {
    console.error('[Referral] Error recording referral:', error);
    return null;
  }
}

export async function applyReferralCode(code: string): Promise<{
  success: boolean;
  message: string;
  bonusDays?: number;
}> {
  try {
    const data = await getReferralData();

    // Check if user already used a referral code
    if (data?.referredBy) {
      return {
        success: false,
        message: "You've already used a referral code.",
      };
    }

    // In a real app, validate the code against the backend
    // For now, we'll simulate validation
    if (!code.startsWith('PENNY') || code.length !== 11) {
      return {
        success: false,
        message: 'Invalid referral code. Please check and try again.',
      };
    }

    // Update local data
    const updatedData = data || (await initializeReferralData('user'));
    updatedData.referredBy = code;
    updatedData.updatedAt = new Date().toISOString();

    await AsyncStorage.setItem(REFERRAL_KEY, JSON.stringify(updatedData));

    // Award the new user bonus
    const welcomeReward: ReferralReward = {
      id: `welcome_${Date.now()}`,
      type: 'referral_bonus',
      title: 'Welcome Bonus',
      description: '7 days of PRO access for joining with a referral!',
      premiumDays: 7,
      earnedAt: new Date().toISOString(),
      isUsed: false,
    };
    await saveReward(welcomeReward);

    return {
      success: true,
      message: 'Referral code applied! You both get 7 days of PRO access.',
      bonusDays: 7,
    };
  } catch (error) {
    console.error('[Referral] Error applying referral code:', error);
    return {
      success: false,
      message: 'Something went wrong. Please try again.',
    };
  }
}

export function getCurrentTier(referralCount: number): ReferralTier {
  // Get the highest tier the user qualifies for
  const sortedTiers = [...REFERRAL_TIERS].sort((a, b) => b.minReferrals - a.minReferrals);
  for (const tier of sortedTiers) {
    if (referralCount >= tier.minReferrals) {
      return tier;
    }
  }
  return REFERRAL_TIERS[0];
}

export function getNextTier(referralCount: number): ReferralTier | null {
  const sortedTiers = [...REFERRAL_TIERS].sort((a, b) => a.minReferrals - b.minReferrals);
  for (const tier of sortedTiers) {
    if (tier.minReferrals > referralCount) {
      return tier;
    }
  }
  return null;
}

export function getReferralsToNextTier(referralCount: number): number {
  const nextTier = getNextTier(referralCount);
  if (!nextTier) return 0;
  return nextTier.minReferrals - referralCount;
}

async function saveReward(reward: ReferralReward): Promise<void> {
  try {
    const rewards = await getRewards();
    rewards.push(reward);
    await AsyncStorage.setItem(REFERRAL_REWARDS_KEY, JSON.stringify(rewards));
  } catch (error) {
    console.error('[Referral] Error saving reward:', error);
  }
}

export async function getRewards(): Promise<ReferralReward[]> {
  try {
    const stored = await AsyncStorage.getItem(REFERRAL_REWARDS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('[Referral] Error loading rewards:', error);
    return [];
  }
}

export async function getTotalAvailablePremiumDays(): Promise<number> {
  const rewards = await getRewards();
  return rewards
    .filter((r) => !r.isUsed)
    .reduce((total, r) => total + r.premiumDays, 0);
}

export function getShareMessage(referralCode: string, tier: ReferralTier): string {
  return `I'm tracking my investments with Penny and loving it!

Use my code ${referralCode} when you sign up and we both get free PRO access.

- Multi-asset tracking
- AI-powered insights
- Smart price alerts

Download: https://penny.app/invite/${referralCode}`;
}

export interface LeaderboardEntry {
  rank: number;
  name: string;
  referrals: number;
  tier: ReferralTier;
  isCurrentUser: boolean;
}

// Simulated leaderboard for motivation
export function getLeaderboard(currentUserReferrals: number): LeaderboardEntry[] {
  const leaderboard: LeaderboardEntry[] = [
    { rank: 1, name: 'Alex M.', referrals: 47, tier: REFERRAL_TIERS[3], isCurrentUser: false },
    { rank: 2, name: 'Sarah K.', referrals: 32, tier: REFERRAL_TIERS[3], isCurrentUser: false },
    { rank: 3, name: 'Mike R.', referrals: 28, tier: REFERRAL_TIERS[3], isCurrentUser: false },
    { rank: 4, name: 'Emma L.', referrals: 19, tier: REFERRAL_TIERS[3], isCurrentUser: false },
    { rank: 5, name: 'Chris P.', referrals: 14, tier: REFERRAL_TIERS[2], isCurrentUser: false },
  ];

  // Find where current user would rank
  let userRank = leaderboard.length + 1;
  for (let i = 0; i < leaderboard.length; i++) {
    if (currentUserReferrals >= leaderboard[i].referrals) {
      userRank = i + 1;
      break;
    }
  }

  const currentTier = getCurrentTier(currentUserReferrals);

  // Insert current user if they're in top 10
  if (userRank <= 10 && currentUserReferrals > 0) {
    const userEntry: LeaderboardEntry = {
      rank: userRank,
      name: 'You',
      referrals: currentUserReferrals,
      tier: currentTier,
      isCurrentUser: true,
    };

    // Adjust ranks and insert
    const result = [...leaderboard];
    result.splice(userRank - 1, 0, userEntry);
    result.forEach((entry, i) => {
      entry.rank = i + 1;
    });

    return result.slice(0, 10);
  }

  return leaderboard;
}
