/**
 * Agentic Background Loop
 *
 * This is the core "agent" that makes the app truly agentic:
 * - Monitors portfolio health autonomously
 * - Decides when to intervene (not just respond)
 * - Takes action via push notifications
 * - Learns from user responses to optimize interventions
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { opik } from './opik';
import { generateWithGemini } from './gemini';
import { Holding, AssetClass } from '@/types';
import { getPortfolioGoals, PortfolioGoals } from './portfolioCoach';
import portfolioService from './portfolioService';

const AGENT_STATE_KEY = 'penny_agent_state';
const INTERVENTION_LOG_KEY = 'penny_interventions';

// Agent configuration
const AGENT_CONFIG = {
  // How much drift triggers an intervention (percentage points)
  allocationDriftThreshold: 10,
  // Minimum hours between interventions (to avoid spam)
  minInterventionGapHours: 12,
  // Max interventions per week
  maxWeeklyInterventions: 5,
  // Contribution reminder day (0 = Sunday, 5 = Friday)
  contributionReminderDay: 5,
};

export interface AgentState {
  lastCheck: string;
  lastIntervention: string | null;
  weeklyInterventionCount: number;
  weekStartDate: string;
  userResponseRate: number; // 0-1, how often user responds to nudges
  preferredInterventionHour: number; // 0-23, learned optimal time
  effectiveInterventionTypes: string[]; // Which types work for this user
}

export interface Intervention {
  id: string;
  type: 'drift_alert' | 'contribution_reminder' | 'milestone' | 'rebalance_suggestion' | 'goal_check';
  title: string;
  message: string;
  timestamp: string;
  responded: boolean;
  responseTimestamp?: string;
  actionTaken?: string;
}

const DEFAULT_AGENT_STATE: AgentState = {
  lastCheck: new Date().toISOString(),
  lastIntervention: null,
  weeklyInterventionCount: 0,
  weekStartDate: getWeekStart(),
  userResponseRate: 0.5,
  preferredInterventionHour: 9, // Default to 9 AM
  effectiveInterventionTypes: ['drift_alert', 'contribution_reminder'],
};

function getWeekStart(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day;
  return new Date(now.setDate(diff)).toISOString().split('T')[0];
}

/**
 * Load agent state from storage
 */
async function loadAgentState(): Promise<AgentState> {
  try {
    const stored = await AsyncStorage.getItem(AGENT_STATE_KEY);
    if (stored) {
      const state = JSON.parse(stored);
      // Reset weekly count if new week
      const currentWeekStart = getWeekStart();
      if (state.weekStartDate !== currentWeekStart) {
        state.weeklyInterventionCount = 0;
        state.weekStartDate = currentWeekStart;
      }
      return state;
    }
  } catch (error) {
    console.error('[AgentLoop] Error loading state:', error);
  }
  return DEFAULT_AGENT_STATE;
}

/**
 * Save agent state
 */
async function saveAgentState(state: AgentState): Promise<void> {
  try {
    await AsyncStorage.setItem(AGENT_STATE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('[AgentLoop] Error saving state:', error);
  }
}

/**
 * Log an intervention
 */
async function logIntervention(intervention: Intervention): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(INTERVENTION_LOG_KEY);
    const interventions: Intervention[] = stored ? JSON.parse(stored) : [];
    interventions.push(intervention);
    // Keep only last 100 interventions
    if (interventions.length > 100) {
      interventions.shift();
    }
    await AsyncStorage.setItem(INTERVENTION_LOG_KEY, JSON.stringify(interventions));

    // Log to Opik for observability
    await opik.createTrace({
      name: 'agent_intervention',
      input: {
        type: intervention.type,
        title: intervention.title,
        message: intervention.message,
        timestamp: intervention.timestamp,
      },
      tags: ['agent', 'intervention', intervention.type],
    });
  } catch (error) {
    console.error('[AgentLoop] Error logging intervention:', error);
  }
}

/**
 * Mark an intervention as responded to (called when user opens app after notification)
 */
export async function markInterventionResponded(interventionId: string, actionTaken?: string): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(INTERVENTION_LOG_KEY);
    if (!stored) return;

    const interventions: Intervention[] = JSON.parse(stored);
    const intervention = interventions.find((i) => i.id === interventionId);

    if (intervention && !intervention.responded) {
      intervention.responded = true;
      intervention.responseTimestamp = new Date().toISOString();
      intervention.actionTaken = actionTaken;

      await AsyncStorage.setItem(INTERVENTION_LOG_KEY, JSON.stringify(interventions));

      // Update agent learning
      const state = await loadAgentState();
      const recentInterventions = interventions.slice(-20);
      const respondedCount = recentInterventions.filter((i) => i.responded).length;
      state.userResponseRate = respondedCount / recentInterventions.length;

      // Learn which intervention types are effective
      const effectiveTypes = new Set<string>();
      recentInterventions
        .filter((i) => i.responded)
        .forEach((i) => effectiveTypes.add(i.type));
      state.effectiveInterventionTypes = Array.from(effectiveTypes);

      await saveAgentState(state);

      // Log learning to Opik
      await opik.logScore({
        traceId: interventionId,
        metricName: 'intervention_response',
        score: 1,
        reason: actionTaken || 'User responded',
        evaluatedBy: 'human',
      });
    }
  } catch (error) {
    console.error('[AgentLoop] Error marking intervention:', error);
  }
}

/**
 * Get recent intervention history for analytics
 */
export async function getInterventionHistory(): Promise<Intervention[]> {
  try {
    const stored = await AsyncStorage.getItem(INTERVENTION_LOG_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('[AgentLoop] Error getting history:', error);
    return [];
  }
}

/**
 * Check if we should intervene (rate limiting + learning)
 */
async function shouldIntervene(state: AgentState, interventionType: string): Promise<boolean> {
  // Check weekly limit
  if (state.weeklyInterventionCount >= AGENT_CONFIG.maxWeeklyInterventions) {
    console.log('[AgentLoop] Weekly intervention limit reached');
    return false;
  }

  // Check time since last intervention
  if (state.lastIntervention) {
    const hoursSinceLastIntervention =
      (Date.now() - new Date(state.lastIntervention).getTime()) / (1000 * 60 * 60);
    if (hoursSinceLastIntervention < AGENT_CONFIG.minInterventionGapHours) {
      console.log('[AgentLoop] Too soon since last intervention');
      return false;
    }
  }

  // Check if this type is effective for this user (learned behavior)
  if (state.userResponseRate < 0.2 && !state.effectiveInterventionTypes.includes(interventionType)) {
    console.log('[AgentLoop] User rarely responds to this intervention type');
    return false;
  }

  return true;
}

/**
 * Send a push notification intervention
 */
async function sendIntervention(
  type: Intervention['type'],
  title: string,
  message: string,
  state: AgentState
): Promise<void> {
  const intervention: Intervention = {
    id: `intervention_${Date.now()}`,
    type,
    title,
    message,
    timestamp: new Date().toISOString(),
    responded: false,
  };

  // Send push notification
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body: message,
      data: { interventionId: intervention.id, type },
    },
    trigger: null, // Immediate
  });

  // Log intervention
  await logIntervention(intervention);

  // Update state
  state.lastIntervention = intervention.timestamp;
  state.weeklyInterventionCount++;
  await saveAgentState(state);

  console.log(`[AgentLoop] Sent intervention: ${type} - ${title}`);
}

/**
 * Calculate allocation drift from target
 */
function calculateAllocationDrift(
  holdings: Holding[],
  targetAllocation?: Partial<Record<AssetClass, number>>
): { drifted: boolean; driftDetails: string[] } {
  if (!targetAllocation) {
    return { drifted: false, driftDetails: [] };
  }

  const currentAllocation: Record<AssetClass, number> = {
    equity: 0,
    debt: 0,
    commodity: 0,
    real_asset: 0,
    cash: 0,
  };

  let totalValue = 0;
  holdings.forEach((h) => {
    const value = h.currentValue || h.quantity * (h.currentPrice || h.purchasePrice);
    totalValue += value;
    currentAllocation[h.assetClass] += value;
  });

  if (totalValue === 0) return { drifted: false, driftDetails: [] };

  // Convert to percentages
  Object.keys(currentAllocation).forEach((key) => {
    currentAllocation[key as AssetClass] = (currentAllocation[key as AssetClass] / totalValue) * 100;
  });

  const driftDetails: string[] = [];
  let drifted = false;

  // Check each asset class that has a target
  Object.entries(targetAllocation).forEach(([assetClass, target]) => {
    if (target === undefined) return;
    const current = currentAllocation[assetClass as AssetClass] || 0;
    const drift = Math.abs(current - target);
    if (drift > AGENT_CONFIG.allocationDriftThreshold) {
      drifted = true;
      const direction = current > target ? 'overweight' : 'underweight';
      driftDetails.push(`${assetClass.replace('_', ' ')} is ${direction} by ${drift.toFixed(1)}%`);
    }
  });

  return { drifted, driftDetails };
}

/**
 * The main agent decision loop - this is where the "agentic" magic happens
 */
async function runAgentLoop(): Promise<void> {
  console.log('[AgentLoop] Running agent check...');

  const traceId = await opik.createTrace({
    name: 'agent_loop_run',
    input: { timestamp: new Date().toISOString() },
    tags: ['agent', 'background'],
  });

  try {
    const state = await loadAgentState();
    const goals = await getPortfolioGoals();

    // Load holdings
    const holdings = await portfolioService.getLocalHoldings();

    if (holdings.length === 0) {
      console.log('[AgentLoop] No holdings, skipping');
      return;
    }

    // DECISION 1: Check for allocation drift
    const { drifted, driftDetails } = calculateAllocationDrift(holdings, goals.targetAllocation);
    if (drifted && await shouldIntervene(state, 'drift_alert')) {
      // Use AI to craft personalized message
      const aiMessage = await generateWithGemini({
        prompt: `You are a friendly investment coach. The user's portfolio has drifted from their target allocation:
${driftDetails.join('\n')}

Write a short, encouraging push notification message (max 100 chars) that:
1. Acknowledges the drift without being alarming
2. Suggests they review their portfolio
3. Ends with an emoji

Just respond with the message, nothing else.`,
        thinkingLevel: 'minimal',
        feature: 'agent_drift_notification',
      });

      await sendIntervention(
        'drift_alert',
        'Portfolio Drift Detected',
        aiMessage.trim(),
        state
      );
    }

    // DECISION 2: Monthly contribution reminder (if it's the right day)
    const today = new Date();
    const monthlyTarget = goals.monthlyInvestmentTarget || 0;
    if (
      today.getDay() === AGENT_CONFIG.contributionReminderDay &&
      monthlyTarget > 0 &&
      await shouldIntervene(state, 'contribution_reminder')
    ) {
      await sendIntervention(
        'contribution_reminder',
        'Investment Day!',
        `Time for your $${monthlyTarget} monthly contribution. Small steps lead to big gains!`,
        state
      );
    }

    // DECISION 3: Goal check-in (weekly)
    const daysSinceLastCheck = state.lastCheck
      ? (Date.now() - new Date(state.lastCheck).getTime()) / (1000 * 60 * 60 * 24)
      : 7;

    if (daysSinceLastCheck >= 7 && await shouldIntervene(state, 'goal_check')) {
      const totalValue = holdings.reduce((sum, h) => {
        return sum + (h.currentValue || h.quantity * (h.currentPrice || h.purchasePrice));
      }, 0);

      await sendIntervention(
        'goal_check',
        'Weekly Check-in',
        `Your portfolio is at $${totalValue.toLocaleString()}. Take 2 min to review your progress!`,
        state
      );
    }

    // Update last check time
    state.lastCheck = new Date().toISOString();
    await saveAgentState(state);

    // Log success to Opik
    await opik.logScore({
      traceId,
      metricName: 'agent_loop_success',
      score: 1,
      reason: 'Agent loop completed successfully',
      evaluatedBy: 'heuristic',
    });

  } catch (error) {
    console.error('[AgentLoop] Error in agent loop:', error);
    await opik.logScore({
      traceId,
      metricName: 'agent_loop_error',
      score: 0,
      reason: String(error),
      evaluatedBy: 'heuristic',
    });
  }
}

// Interval ID for the agent loop
let agentLoopInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Register the agent loop - runs checks periodically when app is active
 */
export async function registerAgentLoop(): Promise<void> {
  try {
    // Request notification permissions
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      console.log('[AgentLoop] Notification permissions not granted');
      return;
    }

    // Configure notifications
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });

    console.log('[AgentLoop] Agent registered');

    // Run initial check
    await runAgentLoop();

    // Set up periodic check every hour when app is active
    if (agentLoopInterval) {
      clearInterval(agentLoopInterval);
    }
    agentLoopInterval = setInterval(async () => {
      console.log('[AgentLoop] Periodic check triggered');
      await runAgentLoop();
    }, 60 * 60 * 1000); // 1 hour

  } catch (error) {
    console.error('[AgentLoop] Error registering agent:', error);
  }
}

/**
 * Unregister the agent loop
 */
export async function unregisterAgentLoop(): Promise<void> {
  if (agentLoopInterval) {
    clearInterval(agentLoopInterval);
    agentLoopInterval = null;
    console.log('[AgentLoop] Agent unregistered');
  }
}

/**
 * Manually trigger an agent check (for testing/demo)
 */
export async function triggerAgentCheck(): Promise<void> {
  await runAgentLoop();
}

/**
 * Get agent analytics
 */
export async function getAgentAnalytics(): Promise<{
  state: AgentState;
  recentInterventions: Intervention[];
  responseRate: number;
  effectiveTypes: string[];
}> {
  const state = await loadAgentState();
  const interventions = await getInterventionHistory();
  const recent = interventions.slice(-20);
  const responded = recent.filter((i) => i.responded).length;

  return {
    state,
    recentInterventions: recent,
    responseRate: recent.length > 0 ? responded / recent.length : 0,
    effectiveTypes: state.effectiveInterventionTypes,
  };
}
