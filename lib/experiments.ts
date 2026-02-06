/**
 * Prompt Experiments / A/B Testing
 *
 * Allows comparing different prompt variants to find
 * the most effective coaching strategies.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { evaluateResponse, ExperimentResult, EvaluationCriteria } from './opik';

const ACTIVE_EXPERIMENTS_KEY = 'opik_active_experiments';
const EXPERIMENT_ASSIGNMENTS_KEY = 'opik_experiment_assignments';

// ============================================
// EXPERIMENT DEFINITIONS
// ============================================

export interface Experiment {
  id: string;
  name: string;
  description: string;
  feature: string;
  variants: ExperimentVariant[];
  isActive: boolean;
  startedAt: string;
  endedAt?: string;
}

export interface ExperimentVariant {
  id: string;
  name: string;
  weight: number; // 0-1, sum of all variants should be 1
  systemPrompt?: string;
  promptTemplate?: string;
  parameters?: Record<string, unknown>;
}

// ============================================
// PREDEFINED EXPERIMENTS
// ============================================

/**
 * Portfolio Coaching Prompt Experiment
 * Tests different coaching styles for portfolio analysis
 */
export const PORTFOLIO_COACHING_EXPERIMENT: Experiment = {
  id: 'portfolio_coaching_v1',
  name: 'Portfolio Coaching Style',
  description: 'Compare different coaching styles for portfolio analysis',
  feature: 'portfolio_insights',
  isActive: true,
  startedAt: new Date().toISOString(),
  variants: [
    {
      id: 'control',
      name: 'Control (Balanced)',
      weight: 0.33,
      systemPrompt: `You are Penny, a supportive financial coach.
Provide balanced, educational insights about the portfolio.
Focus on diversification and long-term thinking.
Never give specific buy/sell advice.`,
    },
    {
      id: 'empathetic',
      name: 'Empathetic Coach',
      weight: 0.33,
      systemPrompt: `You are Penny, a warm and empathetic financial coach.
Start by acknowledging the user's progress and effort.
Frame insights as gentle observations, not criticisms.
Use encouraging language and celebrate small wins.
Never give specific buy/sell advice.`,
    },
    {
      id: 'analytical',
      name: 'Analytical Coach',
      weight: 0.34,
      systemPrompt: `You are Penny, a data-driven financial coach.
Focus on metrics and numbers when analyzing the portfolio.
Provide specific percentages and comparisons.
Be precise and factual while remaining supportive.
Never give specific buy/sell advice.`,
    },
  ],
};

/**
 * Daily Tips Experiment
 * Tests different tip delivery styles
 */
export const DAILY_TIPS_EXPERIMENT: Experiment = {
  id: 'daily_tips_v1',
  name: 'Daily Tips Style',
  description: 'Compare different styles for daily financial tips',
  feature: 'daily_tip',
  isActive: true,
  startedAt: new Date().toISOString(),
  variants: [
    {
      id: 'short',
      name: 'Short & Punchy',
      weight: 0.5,
      promptTemplate: `Generate a brief financial tip (1-2 sentences max).
Context: {context}
Make it memorable and actionable.`,
    },
    {
      id: 'story',
      name: 'Story-based',
      weight: 0.5,
      promptTemplate: `Generate a financial tip using a brief relatable scenario or analogy.
Context: {context}
Keep it under 3 sentences but make it memorable through storytelling.`,
    },
  ],
};

/**
 * All available experiments
 */
export const ALL_EXPERIMENTS: Experiment[] = [
  PORTFOLIO_COACHING_EXPERIMENT,
  DAILY_TIPS_EXPERIMENT,
];

// ============================================
// EXPERIMENT MANAGEMENT
// ============================================

/**
 * Get active experiments
 */
export async function getActiveExperiments(): Promise<Experiment[]> {
  return ALL_EXPERIMENTS.filter(exp => exp.isActive);
}

/**
 * Get experiment for a specific feature
 */
export function getExperimentForFeature(feature: string): Experiment | null {
  return ALL_EXPERIMENTS.find(exp => exp.feature === feature && exp.isActive) || null;
}

/**
 * Select a variant based on weights (random weighted selection)
 */
export function selectVariant(experiment: Experiment): ExperimentVariant {
  const random = Math.random();
  let cumulativeWeight = 0;

  for (const variant of experiment.variants) {
    cumulativeWeight += variant.weight;
    if (random <= cumulativeWeight) {
      return variant;
    }
  }

  // Fallback to first variant
  return experiment.variants[0];
}

/**
 * Get or assign user to a variant (sticky assignment)
 */
export async function getVariantAssignment(experimentId: string): Promise<string> {
  try {
    const stored = await AsyncStorage.getItem(EXPERIMENT_ASSIGNMENTS_KEY);
    const assignments: Record<string, string> = stored ? JSON.parse(stored) : {};

    if (assignments[experimentId]) {
      return assignments[experimentId];
    }

    // Assign new variant
    const experiment = ALL_EXPERIMENTS.find(exp => exp.id === experimentId);
    if (!experiment) {
      throw new Error(`Experiment ${experimentId} not found`);
    }

    const variant = selectVariant(experiment);
    assignments[experimentId] = variant.id;

    await AsyncStorage.setItem(EXPERIMENT_ASSIGNMENTS_KEY, JSON.stringify(assignments));

    return variant.id;
  } catch (error) {
    console.error('[Experiments] Error getting assignment:', error);
    // Return first variant as fallback
    const experiment = ALL_EXPERIMENTS.find(exp => exp.id === experimentId);
    return experiment?.variants[0]?.id || 'control';
  }
}

/**
 * Get the actual variant object from assignment
 */
export async function getAssignedVariant(experimentId: string): Promise<ExperimentVariant | null> {
  const variantId = await getVariantAssignment(experimentId);
  const experiment = ALL_EXPERIMENTS.find(exp => exp.id === experimentId);

  if (!experiment) return null;

  return experiment.variants.find(v => v.id === variantId) || experiment.variants[0];
}

/**
 * Record experiment result
 */
export async function recordExperimentResult(params: {
  experimentId: string;
  variantId: string;
  traceId: string;
  scores: EvaluationCriteria;
  overallScore: number;
  latencyMs: number;
  tokensUsed: number;
}): Promise<void> {
  const experiment = ALL_EXPERIMENTS.find(exp => exp.id === params.experimentId);
  const variant = experiment?.variants.find(v => v.id === params.variantId);

  if (!experiment || !variant) {
    console.error('[Experiments] Invalid experiment or variant');
    return;
  }

  const result: ExperimentResult = {
    id: `exp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    experimentName: experiment.name,
    variantId: params.variantId,
    variantName: variant.name,
    traceId: params.traceId,
    timestamp: new Date().toISOString(),
    scores: params.scores,
    overallScore: params.overallScore,
    latencyMs: params.latencyMs,
    tokensUsed: params.tokensUsed,
  };

  // Store result
  try {
    const stored = await AsyncStorage.getItem('opik_experiments');
    const results: ExperimentResult[] = stored ? JSON.parse(stored) : [];
    results.push(result);

    // Keep last 1000 results
    if (results.length > 1000) {
      results.shift();
    }

    await AsyncStorage.setItem('opik_experiments', JSON.stringify(results));
  } catch (error) {
    console.error('[Experiments] Error saving result:', error);
  }
}

/**
 * Get experiment results summary
 */
export async function getExperimentSummary(experimentId: string): Promise<{
  experiment: Experiment | null;
  variantResults: Record<string, {
    count: number;
    averageScore: number;
    averageLatency: number;
    scores: EvaluationCriteria;
  }>;
  winningVariant: string | null;
  statisticalSignificance: boolean;
}> {
  const experiment = ALL_EXPERIMENTS.find(exp => exp.id === experimentId);
  if (!experiment) {
    return {
      experiment: null,
      variantResults: {},
      winningVariant: null,
      statisticalSignificance: false,
    };
  }

  try {
    const stored = await AsyncStorage.getItem('opik_experiments');
    const allResults: ExperimentResult[] = stored ? JSON.parse(stored) : [];

    // Filter to this experiment
    const results = allResults.filter(r => {
      const exp = ALL_EXPERIMENTS.find(e => e.name === r.experimentName);
      return exp?.id === experimentId;
    });

    const variantResults: Record<string, {
      count: number;
      totalScore: number;
      totalLatency: number;
      scores: EvaluationCriteria;
    }> = {};

    // Initialize for all variants
    experiment.variants.forEach(v => {
      variantResults[v.id] = {
        count: 0,
        totalScore: 0,
        totalLatency: 0,
        scores: {
          accuracy: 0,
          helpfulness: 0,
          actionability: 0,
          safety: 0,
          clarity: 0,
          relevance: 0,
        },
      };
    });

    // Aggregate results
    results.forEach(r => {
      const vr = variantResults[r.variantId];
      if (vr) {
        vr.count++;
        vr.totalScore += r.overallScore;
        vr.totalLatency += r.latencyMs;
        vr.scores.accuracy += r.scores.accuracy;
        vr.scores.helpfulness += r.scores.helpfulness;
        vr.scores.actionability += r.scores.actionability;
        vr.scores.safety += r.scores.safety;
        vr.scores.clarity += r.scores.clarity;
        vr.scores.relevance += r.scores.relevance;
      }
    });

    // Calculate averages
    const finalResults: Record<string, {
      count: number;
      averageScore: number;
      averageLatency: number;
      scores: EvaluationCriteria;
    }> = {};

    let maxScore = 0;
    let winningVariant: string | null = null;
    let minSampleSize = Infinity;

    Object.entries(variantResults).forEach(([variantId, data]) => {
      const count = data.count || 1;
      const avgScore = data.totalScore / count;

      finalResults[variantId] = {
        count: data.count,
        averageScore: avgScore,
        averageLatency: data.totalLatency / count,
        scores: {
          accuracy: data.scores.accuracy / count,
          helpfulness: data.scores.helpfulness / count,
          actionability: data.scores.actionability / count,
          safety: data.scores.safety / count,
          clarity: data.scores.clarity / count,
          relevance: data.scores.relevance / count,
        },
      };

      if (data.count < minSampleSize) {
        minSampleSize = data.count;
      }

      if (avgScore > maxScore && data.count > 0) {
        maxScore = avgScore;
        winningVariant = variantId;
      }
    });

    // Simple significance check (need at least 30 samples per variant)
    const statisticalSignificance = minSampleSize >= 30;

    return {
      experiment,
      variantResults: finalResults,
      winningVariant,
      statisticalSignificance,
    };
  } catch (error) {
    console.error('[Experiments] Error getting summary:', error);
    return {
      experiment,
      variantResults: {},
      winningVariant: null,
      statisticalSignificance: false,
    };
  }
}

/**
 * Reset user's experiment assignments (for testing)
 */
export async function resetExperimentAssignments(): Promise<void> {
  await AsyncStorage.removeItem(EXPERIMENT_ASSIGNMENTS_KEY);
}

export default {
  getActiveExperiments,
  getExperimentForFeature,
  selectVariant,
  getVariantAssignment,
  getAssignedVariant,
  recordExperimentResult,
  getExperimentSummary,
  resetExperimentAssignments,
  ALL_EXPERIMENTS,
  PORTFOLIO_COACHING_EXPERIMENT,
  DAILY_TIPS_EXPERIMENT,
};
