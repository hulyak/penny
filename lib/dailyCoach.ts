import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateWithGemini, generateStructuredWithGemini } from './gemini';
import { z } from 'zod';

const DAILY_COACH_KEY = 'penny_daily_coach';
const STREAK_KEY = 'penny_streak';
const INSIGHTS_HISTORY_KEY = 'penny_insights_history';

export interface DailyCoachState {
  lastCheckIn: string | null;
  morningMessageShown: boolean;
  eveningReflectionShown: boolean;
  todaysTip: string | null;
  streak: number;
  longestStreak: number;
  totalCheckIns: number;
  lastInsightDate: string | null;
  userMood: 'great' | 'good' | 'okay' | 'stressed' | null;
}

export interface PersonalizedInsight {
  id: string;
  type: 'celebration' | 'tip' | 'warning' | 'motivation' | 'education';
  title: string;
  message: string;
  actionLabel?: string;
  actionRoute?: string;
  priority: 'high' | 'medium' | 'low';
  expiresAt?: string;
  createdAt: string;
}

export interface FinancialContext {
  monthlyIncome: number;
  monthlyExpenses: number;
  currentSavings: number;
  savingsGoal: number;
  healthScore: number;
  healthLabel: string;
  savingsRate: number;
  monthsOfRunway: number;
  recentTransactions?: { amount: number; category: string; date: string }[];
}

const getTimeOfDay = (): 'morning' | 'afternoon' | 'evening' | 'night' => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
};

const getDayOfWeek = (): string => {
  return new Date().toLocaleDateString('en-US', { weekday: 'long' });
};

export async function getDailyCoachState(): Promise<DailyCoachState> {
  try {
    const stored = await AsyncStorage.getItem(DAILY_COACH_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('[DailyCoach] Error loading state:', error);
  }

  return {
    lastCheckIn: null,
    morningMessageShown: false,
    eveningReflectionShown: false,
    todaysTip: null,
    streak: 0,
    longestStreak: 0,
    totalCheckIns: 0,
    lastInsightDate: null,
    userMood: null,
  };
}

export async function saveDailyCoachState(state: DailyCoachState): Promise<void> {
  try {
    await AsyncStorage.setItem(DAILY_COACH_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('[DailyCoach] Error saving state:', error);
  }
}

export async function recordCheckIn(): Promise<{ isNewDay: boolean; streak: number }> {
  const state = await getDailyCoachState();
  const today = new Date().toDateString();
  const lastCheckIn = state.lastCheckIn ? new Date(state.lastCheckIn).toDateString() : null;

  const isNewDay = lastCheckIn !== today;

  if (isNewDay) {
    // Check if yesterday was a check-in (for streak)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const wasYesterday = lastCheckIn === yesterday.toDateString();

    state.streak = wasYesterday ? state.streak + 1 : 1;
    state.longestStreak = Math.max(state.longestStreak, state.streak);
    state.totalCheckIns += 1;
    state.morningMessageShown = false;
    state.eveningReflectionShown = false;
    state.todaysTip = null;
  }

  state.lastCheckIn = new Date().toISOString();
  await saveDailyCoachState(state);

  return { isNewDay, streak: state.streak };
}

export async function generateMorningGreeting(
  userName: string,
  context: FinancialContext
): Promise<string> {
  const state = await getDailyCoachState();
  const timeOfDay = getTimeOfDay();
  const dayOfWeek = getDayOfWeek();

  const greetingPrompts: Record<string, string> = {
    morning: `Good morning${userName ? `, ${userName}` : ''}!`,
    afternoon: `Good afternoon${userName ? `, ${userName}` : ''}!`,
    evening: `Good evening${userName ? `, ${userName}` : ''}!`,
    night: `Hey${userName ? ` ${userName}` : ''}, burning the midnight oil?`,
  };

  const baseGreeting = greetingPrompts[timeOfDay];

  try {
    const prompt = `You are Penny, a warm and supportive financial coach. Generate a brief, personalized greeting for the user.

Context:
- Time: ${timeOfDay} on ${dayOfWeek}
- User's streak: ${state.streak} days
- Health score: ${context.healthScore}/100 (${context.healthLabel})
- Savings rate: ${context.savingsRate.toFixed(1)}%
- Emergency runway: ${context.monthsOfRunway.toFixed(1)} months

Generate a 1-2 sentence greeting that:
1. Is warm and personal
2. Acknowledges their streak if > 1 day
3. Gives one small, actionable insight or encouragement based on their situation
4. Feels like a friend checking in, not a robot

Keep it under 40 words. Be genuine and supportive.`;

    const response = await generateWithGemini({
      prompt,
      temperature: 0.8,
      maxTokens: 100,
      thinkingLevel: 'low',
    });

    state.morningMessageShown = true;
    await saveDailyCoachState(state);

    return response.trim();
  } catch (error) {
    console.error('[DailyCoach] Error generating greeting:', error);

    // Fallback greeting
    if (state.streak > 1) {
      return `${baseGreeting} ${state.streak} days strong! Let's keep building those healthy money habits.`;
    }
    return `${baseGreeting} Ready to take control of your finances today?`;
  }
}

export async function generateEveningReflection(
  context: FinancialContext
): Promise<string> {
  const state = await getDailyCoachState();

  try {
    const prompt = `You are Penny, a supportive financial coach. Generate a brief evening reflection message.

Context:
- Health score: ${context.healthScore}/100
- Today's status: User checked in
- Savings progress: ${((context.currentSavings / context.savingsGoal) * 100).toFixed(0)}% of goal

Generate a 1-2 sentence evening message that:
1. Acknowledges their effort today
2. Offers a gentle reminder or encouragement for tomorrow
3. Feels calming and supportive

Keep it under 30 words.`;

    const response = await generateWithGemini({
      prompt,
      temperature: 0.7,
      maxTokens: 80,
      thinkingLevel: 'low',
    });

    state.eveningReflectionShown = true;
    await saveDailyCoachState(state);

    return response.trim();
  } catch (error) {
    console.error('[DailyCoach] Error generating reflection:', error);
    return "Great job checking in today! Rest well, and remember - small steps lead to big changes.";
  }
}

export async function generateDailyTip(
  context: FinancialContext
): Promise<string> {
  const state = await getDailyCoachState();

  if (state.todaysTip) {
    return state.todaysTip;
  }

  try {
    const prompt = `You are Penny, a financial coach. Generate ONE specific, actionable tip for today.

User's situation:
- Health score: ${context.healthScore}/100 (${context.healthLabel})
- Monthly income: $${context.monthlyIncome}
- Monthly expenses: $${context.monthlyExpenses}
- Savings: $${context.currentSavings}
- Savings rate: ${context.savingsRate.toFixed(1)}%
- Emergency fund runway: ${context.monthsOfRunway.toFixed(1)} months

Generate a tip that:
1. Is specific to their situation (not generic)
2. Can be done TODAY
3. Is small and achievable
4. Has a clear benefit

Format: Start with an action verb. Keep under 25 words.`;

    const tip = await generateWithGemini({
      prompt,
      temperature: 0.7,
      maxTokens: 60,
      thinkingLevel: 'low',
    });

    state.todaysTip = tip.trim();
    await saveDailyCoachState(state);

    return state.todaysTip;
  } catch (error) {
    console.error('[DailyCoach] Error generating tip:', error);
    return "Review one subscription today and ask yourself: 'Do I really use this?'";
  }
}

const InsightSchema = z.object({
  type: z.enum(['celebration', 'tip', 'warning', 'motivation', 'education']),
  title: z.string(),
  message: z.string(),
  priority: z.enum(['high', 'medium', 'low']),
  actionLabel: z.string().optional(),
});

export async function generatePersonalizedInsights(
  context: FinancialContext,
  count: number = 3
): Promise<PersonalizedInsight[]> {
  try {
    const prompt = `You are Penny, analyzing a user's financial situation to provide personalized insights.

User's Financial Snapshot:
- Health Score: ${context.healthScore}/100 (${context.healthLabel})
- Monthly Income: $${context.monthlyIncome.toLocaleString()}
- Monthly Expenses: $${context.monthlyExpenses.toLocaleString()}
- Current Savings: $${context.currentSavings.toLocaleString()}
- Savings Goal: $${context.savingsGoal.toLocaleString()}
- Savings Rate: ${context.savingsRate.toFixed(1)}%
- Emergency Runway: ${context.monthsOfRunway.toFixed(1)} months

Generate ${count} personalized insights. Mix of types based on their situation:
- celebration: If they've achieved something (good savings rate, milestone reached)
- tip: Actionable advice specific to their numbers
- warning: Only if there's a real concern (low runway, high expenses)
- motivation: Encouragement based on their progress
- education: Teach something relevant to their stage

Each insight should feel personal and reference their specific numbers.`;

    const insights: PersonalizedInsight[] = [];

    for (let i = 0; i < count; i++) {
      try {
        const result = await generateStructuredWithGemini({
          prompt: `${prompt}\n\nGenerate insight #${i + 1}:`,
          schema: InsightSchema,
          temperature: 0.7,
          thinkingLevel: 'medium',
        });

        insights.push({
          id: `insight_${Date.now()}_${i}`,
          ...result,
          createdAt: new Date().toISOString(),
        });
      } catch (e) {
        console.error('[DailyCoach] Error generating insight:', e);
      }
    }

    // Save to history
    await saveInsightsHistory(insights);

    return insights;
  } catch (error) {
    console.error('[DailyCoach] Error generating insights:', error);
    return getDefaultInsights(context);
  }
}

function getDefaultInsights(context: FinancialContext): PersonalizedInsight[] {
  const insights: PersonalizedInsight[] = [];

  // Add relevant default insights based on context
  if (context.savingsRate >= 20) {
    insights.push({
      id: 'default_1',
      type: 'celebration',
      title: 'Great Savings Rate!',
      message: `You're saving ${context.savingsRate.toFixed(0)}% of your income. That's above the recommended 20%!`,
      priority: 'medium',
      createdAt: new Date().toISOString(),
    });
  } else {
    insights.push({
      id: 'default_1',
      type: 'tip',
      title: 'Boost Your Savings',
      message: `Try increasing your savings rate by just 1% this month. Small changes add up!`,
      priority: 'medium',
      actionLabel: 'See how',
      createdAt: new Date().toISOString(),
    });
  }

  if (context.monthsOfRunway < 3) {
    insights.push({
      id: 'default_2',
      type: 'warning',
      title: 'Build Your Safety Net',
      message: `You have ${context.monthsOfRunway.toFixed(1)} months of runway. Aim for 3-6 months for peace of mind.`,
      priority: 'high',
      createdAt: new Date().toISOString(),
    });
  }

  insights.push({
    id: 'default_3',
    type: 'education',
    title: 'Did You Know?',
    message: 'Automating your savings removes the temptation to spend. Set up a transfer for the day after payday.',
    priority: 'low',
    createdAt: new Date().toISOString(),
  });

  return insights;
}

async function saveInsightsHistory(insights: PersonalizedInsight[]): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(INSIGHTS_HISTORY_KEY);
    const history: PersonalizedInsight[] = stored ? JSON.parse(stored) : [];

    // Keep last 50 insights
    const updated = [...insights, ...history].slice(0, 50);
    await AsyncStorage.setItem(INSIGHTS_HISTORY_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('[DailyCoach] Error saving insights history:', error);
  }
}

export async function getInsightsHistory(): Promise<PersonalizedInsight[]> {
  try {
    const stored = await AsyncStorage.getItem(INSIGHTS_HISTORY_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('[DailyCoach] Error loading insights history:', error);
    return [];
  }
}

export async function recordUserMood(mood: DailyCoachState['userMood']): Promise<void> {
  const state = await getDailyCoachState();
  state.userMood = mood;
  await saveDailyCoachState(state);
}

export async function generateMoodBasedResponse(
  mood: DailyCoachState['userMood'],
  context: FinancialContext
): Promise<string> {
  if (!mood) return '';

  const moodPrompts: Record<string, string> = {
    great: "User is feeling great about their finances",
    good: "User is feeling good, positive outlook",
    okay: "User is feeling neutral, might need encouragement",
    stressed: "User is feeling stressed about money, needs support and reassurance",
  };

  try {
    const prompt = `You are Penny, an empathetic financial coach. The user just shared how they're feeling.

Mood: ${moodPrompts[mood]}
Health Score: ${context.healthScore}/100
Savings Rate: ${context.savingsRate.toFixed(1)}%

Respond with empathy and provide:
1. Acknowledgment of their feelings
2. One supportive statement related to their finances
3. If stressed, focus on what's going well; if great, celebrate with them

Keep it warm, personal, and under 40 words.`;

    return await generateWithGemini({
      prompt,
      temperature: 0.8,
      maxTokens: 100,
      thinkingLevel: 'low',
    });
  } catch (error) {
    const defaults: Record<string, string> = {
      great: "That's wonderful! Your positive energy will help you make great financial decisions. Keep it up!",
      good: "Glad to hear it! Every day you're building better habits. That's something to be proud of.",
      okay: "Thanks for being honest. Remember, every small step counts. You're doing better than you think!",
      stressed: "I hear you, and money stress is real. But look - you're here, taking action. That takes courage. One step at a time.",
    };
    return defaults[mood] || defaults.okay;
  }
}

export async function getWeeklySummary(
  context: FinancialContext
): Promise<{
  summary: string;
  wins: string[];
  focusAreas: string[];
  nextWeekTip: string;
}> {
  try {
    const prompt = `You are Penny, creating a weekly financial summary for the user.

This Week's Snapshot:
- Health Score: ${context.healthScore}/100 (${context.healthLabel})
- Savings Rate: ${context.savingsRate.toFixed(1)}%
- Emergency Runway: ${context.monthsOfRunway.toFixed(1)} months
- Monthly Income: $${context.monthlyIncome}
- Monthly Expenses: $${context.monthlyExpenses}

Generate a JSON response with:
{
  "summary": "2-3 sentence overview of their week (encouraging tone)",
  "wins": ["1-2 specific wins to celebrate"],
  "focusAreas": ["1-2 areas to focus on next week"],
  "nextWeekTip": "One specific tip for next week"
}`;

    const response = await generateWithGemini({
      prompt,
      temperature: 0.6,
      maxTokens: 300,
      thinkingLevel: 'medium',
    });

    // Parse JSON response
    const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned);
  } catch (error) {
    console.error('[DailyCoach] Error generating weekly summary:', error);
    return {
      summary: `Your health score is ${context.healthScore}/100. Keep focusing on building your financial foundation!`,
      wins: ['You checked in this week - consistency matters!'],
      focusAreas: ['Review your subscriptions', 'Track daily expenses'],
      nextWeekTip: 'Try the 24-hour rule: wait a day before non-essential purchases over $50.',
    };
  }
}

export const PENNY_PERSONALITY = {
  name: 'Penny',
  traits: [
    'Warm and supportive',
    'Knowledgeable but not preachy',
    'Celebrates small wins',
    'Uses simple language',
    'Empathetic about money stress',
    'Encouraging without being pushy',
  ],
  voice: {
    greeting: 'friendly and personal',
    advice: 'gentle and actionable',
    celebration: 'genuine and enthusiastic',
    warning: 'caring and supportive, never scary',
  },
  principles: [
    'Progress over perfection',
    'Small steps matter',
    'No shame, no judgment',
    'Education before action',
    'Emergency fund first',
  ],
};
