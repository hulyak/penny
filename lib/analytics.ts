/**
 * Analytics System for Penny Financial Coach
 *
 * Tracks user interactions, engagement metrics, and provides
 * data for the observability dashboard.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { opik, UserFeedback } from './opik';

const ANALYTICS_KEY = 'penny_analytics';
const SESSIONS_KEY = 'penny_sessions';
const INTERACTIONS_KEY = 'penny_interactions';

// Event types
export type InteractionType =
  | 'chat_message'
  | 'coach_tip_viewed'
  | 'coach_tip_dismissed'
  | 'milestone_achieved'
  | 'milestone_celebrated'
  | 'alert_shown'
  | 'alert_clicked'
  | 'alert_dismissed'
  | 'reminder_shown'
  | 'reminder_clicked'
  | 'reminder_dismissed'
  | 'mood_check_in'
  | 'health_card_expanded'
  | 'scenario_created'
  | 'goal_created'
  | 'goal_completed'
  | 'lesson_started'
  | 'lesson_completed'
  | 'feedback_given';

export interface InteractionEvent {
  id: string;
  type: InteractionType;
  timestamp: string;
  sessionId: string;
  traceId?: string;
  metadata?: Record<string, unknown>;
  context?: {
    screen?: string;
    healthScore?: number;
    feature?: string;
  };
}

export interface SessionData {
  id: string;
  startTime: string;
  endTime?: string;
  interactions: number;
  screens: string[];
  aiCalls: number;
  feedbackGiven: number;
}

export interface AnalyticsSummary {
  totalInteractions: number;
  interactionsByType: Record<InteractionType, number>;
  averageSessionDuration: number;
  totalSessions: number;
  feedbackStats: {
    helpful: number;
    notHelpful: number;
    neutral: number;
  };
  aiCallStats: {
    total: number;
    averageLatency: number;
    errorRate: number;
  };
  engagementTrend: Array<{ date: string; interactions: number }>;
  featureUsage: Record<string, number>;
}

// Generate unique IDs
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Current session tracking
let currentSession: SessionData | null = null;

/**
 * Start a new analytics session
 */
export async function startSession(): Promise<string> {
  const sessionId = generateId();
  currentSession = {
    id: sessionId,
    startTime: new Date().toISOString(),
    interactions: 0,
    screens: [],
    aiCalls: 0,
    feedbackGiven: 0,
  };

  console.log('[Analytics] Started session:', sessionId);
  return sessionId;
}

/**
 * End the current session
 */
export async function endSession(): Promise<void> {
  // Capture and clear current session to prevent race conditions
  const session = currentSession;
  if (!session) return;
  currentSession = null;

  session.endTime = new Date().toISOString();

  // Save session
  try {
    const stored = await AsyncStorage.getItem(SESSIONS_KEY);
    const rawSessions = stored ? JSON.parse(stored) : [];
    // Filter out any null sessions that might have been saved
    const sessions: SessionData[] = rawSessions.filter((s: SessionData | null) => s != null);
    sessions.push(session);

    // Keep last 100 sessions
    if (sessions.length > 100) {
      sessions.shift();
    }

    await AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
    console.log('[Analytics] Ended session:', session.id);
  } catch (error) {
    console.error('[Analytics] Error saving session:', error);
  }

  currentSession = null;
}

/**
 * Get current session ID
 */
export function getCurrentSessionId(): string | null {
  return currentSession?.id || null;
}

/**
 * Track an interaction event
 */
export async function trackInteraction(
  type: InteractionType,
  metadata?: Record<string, unknown>,
  traceId?: string
): Promise<void> {
  const sessionId = currentSession?.id || 'no_session';

  const event: InteractionEvent = {
    id: generateId(),
    type,
    timestamp: new Date().toISOString(),
    sessionId,
    traceId,
    metadata,
  };

  // Update session stats
  if (currentSession) {
    currentSession.interactions++;
    if (type.includes('feedback')) {
      currentSession.feedbackGiven++;
    }
  }

  // Store event
  try {
    const stored = await AsyncStorage.getItem(INTERACTIONS_KEY);
    const interactions: InteractionEvent[] = stored ? JSON.parse(stored) : [];
    interactions.push(event);

    // Keep last 1000 interactions
    if (interactions.length > 1000) {
      interactions.shift();
    }

    await AsyncStorage.setItem(INTERACTIONS_KEY, JSON.stringify(interactions));
  } catch (error) {
    console.error('[Analytics] Error tracking interaction:', error);
  }

  console.log('[Analytics] Tracked:', type, metadata);
}

/**
 * Track screen view
 */
export async function trackScreenView(screenName: string): Promise<void> {
  if (currentSession && !currentSession.screens.includes(screenName)) {
    currentSession.screens.push(screenName);
  }

  await trackInteraction('coach_tip_viewed', { screen: screenName });
}

/**
 * Track AI call
 */
export async function trackAICall(params: {
  traceId: string;
  model: string;
  feature: string;
  latencyMs: number;
  success: boolean;
  tokensUsed?: number;
}): Promise<void> {
  if (currentSession) {
    currentSession.aiCalls++;
  }

  const stored = await AsyncStorage.getItem(ANALYTICS_KEY);
  const analytics = stored ? JSON.parse(stored) : { aiCalls: [] };

  analytics.aiCalls.push({
    ...params,
    timestamp: new Date().toISOString(),
  });

  // Keep last 500 AI calls
  if (analytics.aiCalls.length > 500) {
    analytics.aiCalls.shift();
  }

  await AsyncStorage.setItem(ANALYTICS_KEY, JSON.stringify(analytics));
}

/**
 * Track user feedback with Opik integration
 */
export async function trackFeedback(params: {
  traceId: string;
  rating: 'helpful' | 'not_helpful' | 'neutral';
  feature: string;
  comment?: string;
}): Promise<void> {
  const feedback: UserFeedback = {
    traceId: params.traceId,
    rating: params.rating,
    comment: params.comment,
    timestamp: new Date().toISOString(),
  };

  // Log to Opik
  await opik.logFeedback(feedback);

  // Track locally
  await trackInteraction('feedback_given', {
    rating: params.rating,
    feature: params.feature,
    comment: params.comment,
  }, params.traceId);
}

/**
 * Get analytics summary for dashboard
 */
export async function getAnalyticsSummary(): Promise<AnalyticsSummary> {
  try {
    const [interactionsStr, sessionsStr, analyticsStr] = await Promise.all([
      AsyncStorage.getItem(INTERACTIONS_KEY),
      AsyncStorage.getItem(SESSIONS_KEY),
      AsyncStorage.getItem(ANALYTICS_KEY),
    ]);

    const interactions: InteractionEvent[] = interactionsStr ? JSON.parse(interactionsStr) : [];
    const rawSessions = sessionsStr ? JSON.parse(sessionsStr) : [];
    // Filter out null/undefined sessions
    const sessions: SessionData[] = rawSessions.filter((s: SessionData | null) => s != null);
    const analytics = analyticsStr ? JSON.parse(analyticsStr) : { aiCalls: [] };

    // Count interactions by type
    const interactionsByType: Record<string, number> = {};
    for (const event of interactions) {
      if (event) {
        interactionsByType[event.type] = (interactionsByType[event.type] || 0) + 1;
      }
    }

    // Calculate session stats
    let totalDuration = 0;
    for (const session of sessions) {
      if (session && session.endTime && session.startTime) {
        const duration = new Date(session.endTime).getTime() - new Date(session.startTime).getTime();
        totalDuration += duration;
      }
    }
    const validSessions = sessions.filter(s => s && s.endTime && s.startTime);
    const averageSessionDuration = validSessions.length > 0 ? totalDuration / validSessions.length : 0;

    // Feedback stats from Opik
    const feedback = await opik.getFeedback();
    const feedbackStats = {
      helpful: feedback.filter(f => f.rating === 'helpful').length,
      notHelpful: feedback.filter(f => f.rating === 'not_helpful').length,
      neutral: feedback.filter(f => f.rating === 'neutral').length,
    };

    // AI call stats
    const aiCalls = analytics.aiCalls || [];
    const successfulCalls = aiCalls.filter((c: { success: boolean }) => c.success);
    const aiCallStats = {
      total: aiCalls.length,
      averageLatency: aiCalls.length > 0
        ? aiCalls.reduce((sum: number, c: { latencyMs: number }) => sum + c.latencyMs, 0) / aiCalls.length
        : 0,
      errorRate: aiCalls.length > 0
        ? (aiCalls.length - successfulCalls.length) / aiCalls.length
        : 0,
    };

    // Engagement trend (last 7 days)
    const now = new Date();
    const engagementTrend: Array<{ date: string; interactions: number }> = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const dayInteractions = interactions.filter(e =>
        e.timestamp.startsWith(dateStr)
      ).length;

      engagementTrend.push({ date: dateStr, interactions: dayInteractions });
    }

    // Feature usage
    const featureUsage: Record<string, number> = {};
    for (const call of aiCalls) {
      if (call.feature) {
        featureUsage[call.feature] = (featureUsage[call.feature] || 0) + 1;
      }
    }

    return {
      totalInteractions: interactions.length,
      interactionsByType: interactionsByType as Record<InteractionType, number>,
      averageSessionDuration,
      totalSessions: sessions.length,
      feedbackStats,
      aiCallStats,
      engagementTrend,
      featureUsage,
    };
  } catch (error) {
    console.error('[Analytics] Error getting summary:', error);
    return {
      totalInteractions: 0,
      interactionsByType: {} as Record<InteractionType, number>,
      averageSessionDuration: 0,
      totalSessions: 0,
      feedbackStats: { helpful: 0, notHelpful: 0, neutral: 0 },
      aiCallStats: { total: 0, averageLatency: 0, errorRate: 0 },
      engagementTrend: [],
      featureUsage: {},
    };
  }
}

/**
 * Get evaluation metrics for dashboard
 */
export async function getEvaluationMetrics(): Promise<{
  averageScores: Record<string, number>;
  scoreDistribution: Record<string, number[]>;
  recentEvaluations: Array<{ timestamp: string; metric: string; score: number }>;
}> {
  const metrics = await opik.getMetrics();
  const scores = (metrics.scores || []) as Array<{ metricName: string; score: number; timestamp: string }>;

  // Calculate average scores by metric
  const scoresByMetric: Record<string, number[]> = {};
  for (const score of scores) {
    if (!scoresByMetric[score.metricName]) {
      scoresByMetric[score.metricName] = [];
    }
    scoresByMetric[score.metricName].push(score.score);
  }

  const averageScores: Record<string, number> = {};
  const scoreDistribution: Record<string, number[]> = {};
  for (const [metric, values] of Object.entries(scoresByMetric)) {
    averageScores[metric] = values.reduce((a, b) => a + b, 0) / values.length;
    scoreDistribution[metric] = values;
  }

  // Recent evaluations
  const recentEvaluations = scores.slice(-20).map(s => ({
    timestamp: s.timestamp,
    metric: s.metricName,
    score: s.score,
  }));

  return { averageScores, scoreDistribution, recentEvaluations };
}

/**
 * Clear analytics data (for testing/privacy)
 */
export async function clearAnalytics(): Promise<void> {
  await AsyncStorage.multiRemove([
    ANALYTICS_KEY,
    SESSIONS_KEY,
    INTERACTIONS_KEY,
  ]);
  console.log('[Analytics] Cleared all analytics data');
}

export default {
  startSession,
  endSession,
  getCurrentSessionId,
  trackInteraction,
  trackScreenView,
  trackAICall,
  trackFeedback,
  getAnalyticsSummary,
  getEvaluationMetrics,
  clearAnalytics,
};
