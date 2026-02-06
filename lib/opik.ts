/**
 * Opik Integration for Penny Financial Coach
 *
 * Provides comprehensive observability, tracing, and evaluation
 * for all AI interactions in the app.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const OPIK_API_KEY = process.env.EXPO_PUBLIC_OPIK_API_KEY || '';
const OPIK_WORKSPACE = process.env.EXPO_PUBLIC_OPIK_WORKSPACE || 'default';
const OPIK_PROJECT_NAME = 'penny-financial-coach';
// Opik Cloud API URL (endpoints use /v1/private/ paths)
const OPIK_BASE_URL = process.env.EXPO_PUBLIC_OPIK_URL || 'https://www.comet.com/opik/api';

// Storage keys for offline support
const TRACES_QUEUE_KEY = 'opik_traces_queue';
const METRICS_KEY = 'opik_metrics';
const FEEDBACK_KEY = 'opik_feedback';
const EVALUATIONS_KEY = 'opik_evaluations';
const EXPERIMENTS_KEY = 'opik_experiments';

export interface TraceInput {
  name: string;
  input: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  tags?: string[];
}

export interface SpanInput {
  traceId: string;
  name: string;
  type: 'llm' | 'tool' | 'chain' | 'retrieval' | 'agent';
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  startTime?: number;
  endTime?: number;
  model?: string;
  tokensUsed?: {
    prompt: number;
    completion: number;
    total: number;
  };
}

export interface EvaluationScore {
  traceId: string;
  spanId?: string;
  metricName: string;
  score: number;
  reason?: string;
  evaluatedBy: 'llm' | 'human' | 'heuristic';
}

export interface UserFeedback {
  traceId: string;
  spanId?: string;
  rating: 'helpful' | 'not_helpful' | 'neutral';
  comment?: string;
  timestamp: string;
  userId?: string;
}

// Generate unique IDs
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Check if Opik is configured
export function isOpikConfigured(): boolean {
  return Boolean(OPIK_API_KEY);
}

/**
 * Test Opik connection - call this to verify your setup works
 */
export async function testOpikConnection(): Promise<{ success: boolean; message: string; details?: string }> {
  if (!OPIK_API_KEY) {
    return { success: false, message: 'EXPO_PUBLIC_OPIK_API_KEY not set in .env' };
  }

  if (!OPIK_WORKSPACE || OPIK_WORKSPACE === 'default') {
    return { success: false, message: 'EXPO_PUBLIC_OPIK_WORKSPACE not set in .env' };
  }

  try {
    // Try to list projects to verify connection
    const response = await fetch(`${OPIK_BASE_URL}/v1/private/projects`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'authorization': OPIK_API_KEY,
        'Comet-Workspace': OPIK_WORKSPACE,
      },
    });

    const responseText = await response.text();

    if (response.ok) {
      return {
        success: true,
        message: `Connected to Opik!`,
        details: `Workspace: ${OPIK_WORKSPACE}, Project: ${OPIK_PROJECT_NAME}, URL: ${OPIK_BASE_URL}`
      };
    } else if (response.status === 401) {
      return { success: false, message: 'Invalid API key', details: responseText };
    } else if (response.status === 403) {
      return { success: false, message: 'API key lacks permissions or workspace not found', details: responseText };
    } else {
      return { success: false, message: `Opik API error: ${response.status}`, details: responseText };
    }
  } catch (error) {
    return { success: false, message: `Connection failed: ${String(error)}` };
  }
}

/**
 * OpikClient - Main client for Opik integration
 */
class OpikClient {
  private projectName: string;
  private isConfigured: boolean;
  private hasLoggedNotConfigured: boolean = false;
  private tracesQueue: Array<{trace: TraceInput; spans: SpanInput[]; scores: EvaluationScore[]}> = [];

  constructor() {
    this.projectName = OPIK_PROJECT_NAME;
    this.isConfigured = isOpikConfigured();
    if (!this.isConfigured && !this.hasLoggedNotConfigured) {
      // Only log once that Opik is not configured
      this.hasLoggedNotConfigured = true;
    }
    this.loadQueuedTraces();
  }

  private async loadQueuedTraces() {
    try {
      const stored = await AsyncStorage.getItem(TRACES_QUEUE_KEY);
      if (stored) {
        this.tracesQueue = JSON.parse(stored);
      }
    } catch (error) {
      console.error('[Opik] Error loading queued traces:', error);
    }
  }

  private async saveQueuedTraces() {
    try {
      await AsyncStorage.setItem(TRACES_QUEUE_KEY, JSON.stringify(this.tracesQueue));
    } catch (error) {
      console.error('[Opik] Error saving queued traces:', error);
    }
  }

  /**
   * Create a new trace for tracking an AI interaction
   */
  async createTrace(input: TraceInput): Promise<string> {
    const traceId = generateId();
    const trace = {
      id: traceId,
      projectName: this.projectName,
      name: input.name,
      input: input.input,
      metadata: {
        ...input.metadata,
        timestamp: new Date().toISOString(),
        platform: 'react-native',
        appVersion: '1.0.0',
      },
      tags: input.tags || [],
      startTime: Date.now(),
    };

    if (this.isConfigured) {
      try {
        await this.sendToOpik('/traces', trace);
      } catch (error) {
        // Silently queue - no need to warn for every failed request
        this.tracesQueue.push({ trace: input, spans: [], scores: [] });
        await this.saveQueuedTraces();
      }
    } else {
      // Store locally for later analysis
      this.tracesQueue.push({ trace: input, spans: [], scores: [] });
      await this.saveQueuedTraces();
    }

    // Only log in development when debugging
    // console.log('[Opik] Created trace:', traceId, input.name);
    return traceId;
  }

  /**
   * Create a span within a trace
   */
  async createSpan(input: SpanInput): Promise<string> {
    const spanId = generateId();
    const span = {
      id: spanId,
      ...input,
      startTime: input.startTime || Date.now(),
    };

    if (this.isConfigured) {
      try {
        await this.sendToOpik('/spans', span);
      } catch (error) {
        // Silently fail - telemetry shouldn't affect app functionality
      }
    }

    return spanId;
  }

  /**
   * End a span with output
   */
  async endSpan(spanId: string, output: Record<string, unknown>, metadata?: Record<string, unknown>) {
    const update = {
      id: spanId,
      output,
      metadata,
      endTime: Date.now(),
    };

    if (this.isConfigured) {
      try {
        await this.sendToOpik(`/spans/${spanId}`, update, 'PATCH');
      } catch (error) {
        // Silently fail
      }
    }
  }

  /**
   * Log an evaluation score
   */
  async logScore(score: EvaluationScore): Promise<void> {
    const scoreData = {
      ...score,
      timestamp: new Date().toISOString(),
      projectName: this.projectName,
    };

    if (this.isConfigured) {
      try {
        await this.sendToOpik('/scores', scoreData);
      } catch (error) {
        // Silently fail
      }
    }

    // Always store locally for analytics
    await this.storeMetric('scores', scoreData);
  }

  /**
   * Log user feedback
   */
  async logFeedback(feedback: UserFeedback): Promise<void> {
    const feedbackData = {
      ...feedback,
      projectName: this.projectName,
    };

    if (this.isConfigured) {
      try {
        await this.sendToOpik('/feedback', feedbackData);
      } catch (error) {
        // Silently fail
      }
    }

    // Always store locally
    await this.storeFeedback(feedbackData);
  }

  /**
   * Send data to Opik API
   */
  private async sendToOpik(endpoint: string, data: unknown, method: string = 'POST'): Promise<unknown> {
    // Opik REST API uses /v1/private/ prefix for endpoints
    const fullUrl = `${OPIK_BASE_URL}/v1/private${endpoint}`;
    const response = await fetch(fullUrl, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'authorization': OPIK_API_KEY,  // Opik uses lowercase, no Bearer prefix
        'Comet-Workspace': OPIK_WORKSPACE,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`Opik API error: ${response.status} ${errorText}`);
    }

    // Handle empty responses
    const text = await response.text();
    return text ? JSON.parse(text) : {};
  }

  /**
   * Store metric locally
   */
  private async storeMetric(type: string, data: unknown): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(METRICS_KEY);
      const metrics = stored ? JSON.parse(stored) : {};
      if (!metrics[type]) metrics[type] = [];
      metrics[type].push(data);
      // Keep last 1000 metrics
      if (metrics[type].length > 1000) {
        metrics[type] = metrics[type].slice(-1000);
      }
      await AsyncStorage.setItem(METRICS_KEY, JSON.stringify(metrics));
    } catch (error) {
      console.error('[Opik] Error storing metric:', error);
    }
  }

  /**
   * Store feedback locally
   */
  private async storeFeedback(feedback: UserFeedback): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(FEEDBACK_KEY);
      const feedbackList = stored ? JSON.parse(stored) : [];
      feedbackList.push(feedback);
      // Keep last 500 feedback entries
      if (feedbackList.length > 500) {
        feedbackList.shift();
      }
      await AsyncStorage.setItem(FEEDBACK_KEY, JSON.stringify(feedbackList));
    } catch (error) {
      console.error('[Opik] Error storing feedback:', error);
    }
  }

  /**
   * Get stored metrics for dashboard
   */
  async getMetrics(): Promise<Record<string, unknown[]>> {
    try {
      const stored = await AsyncStorage.getItem(METRICS_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('[Opik] Error getting metrics:', error);
      return {};
    }
  }

  /**
   * Get stored feedback for analysis
   */
  async getFeedback(): Promise<UserFeedback[]> {
    try {
      const stored = await AsyncStorage.getItem(FEEDBACK_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('[Opik] Error getting feedback:', error);
      return [];
    }
  }

  /**
   * Flush queued traces (call when online)
   */
  async flushQueue(): Promise<void> {
    if (!this.isConfigured || this.tracesQueue.length === 0) return;

    for (const item of this.tracesQueue) {
      try {
        await this.sendToOpik('/traces', item.trace);
        for (const span of item.spans) {
          await this.sendToOpik('/spans', span);
        }
        for (const score of item.scores) {
          await this.sendToOpik('/scores', score);
        }
      } catch (error) {
        // Stop if we hit an error - will retry later
        return;
      }
    }

    this.tracesQueue = [];
    await this.saveQueuedTraces();
  }
}

// Singleton instance
export const opik = new OpikClient();

/**
 * Higher-order function to trace an async function
 */
export function withTrace<T extends (...args: unknown[]) => Promise<unknown>>(
  name: string,
  fn: T,
  options?: {
    extractInput?: (...args: Parameters<T>) => Record<string, unknown>;
    extractOutput?: (result: Awaited<ReturnType<T>>) => Record<string, unknown>;
    tags?: string[];
  }
): T {
  return (async (...args: Parameters<T>) => {
    const input = options?.extractInput?.(...args) || { args };
    const traceId = await opik.createTrace({
      name,
      input,
      tags: options?.tags,
    });

    const spanId = await opik.createSpan({
      traceId,
      name: `${name}_execution`,
      type: 'chain',
      input,
    });

    try {
      const result = await fn(...args);
      const output = options?.extractOutput?.(result as Awaited<ReturnType<T>>) || { result };
      await opik.endSpan(spanId, output);
      return result;
    } catch (error) {
      await opik.endSpan(spanId, { error: String(error) });
      throw error;
    }
  }) as T;
}

/**
 * Trace an LLM call specifically
 */
export async function traceLLMCall(params: {
  traceId: string;
  model: string;
  prompt: string;
  response: string;
  tokensUsed?: { prompt: number; completion: number; total: number };
  latencyMs: number;
  metadata?: Record<string, unknown>;
}): Promise<string> {
  const spanId = await opik.createSpan({
    traceId: params.traceId,
    name: 'llm_generation',
    type: 'llm',
    input: { prompt: params.prompt },
    output: { response: params.response },
    model: params.model,
    tokensUsed: params.tokensUsed,
    metadata: {
      ...params.metadata,
      latencyMs: params.latencyMs,
    },
    startTime: Date.now() - params.latencyMs,
    endTime: Date.now(),
  });

  return spanId;
}

// ============================================
// SIMPLIFIED TRACE API (compatible with opikClient interface)
// ============================================

export interface TraceContext {
  traceId: string;
  spanId?: string;
  startTime: number;
}

/**
 * Start a new trace - simplified API for gemini.ts
 */
export async function startTrace(params: {
  name: string;
  feature: string;
  input: Record<string, unknown>;
  tags?: string[];
}): Promise<TraceContext> {
  const traceId = await opik.createTrace({
    name: params.name,
    input: params.input,
    metadata: { feature: params.feature },
    tags: params.tags,
  });

  return {
    traceId,
    startTime: Date.now(),
  };
}

/**
 * End a trace with output - simplified API for gemini.ts
 */
export async function endTrace(params: {
  context: TraceContext;
  output: Record<string, unknown>;
  tokensUsed?: { prompt: number; completion: number; total: number };
  success: boolean;
  error?: string;
}): Promise<void> {
  const latencyMs = Date.now() - params.context.startTime;

  // Create an LLM span with the results
  await opik.createSpan({
    traceId: params.context.traceId,
    name: 'llm_call',
    type: 'llm',
    input: {},
    output: params.output,
    tokensUsed: params.tokensUsed,
    metadata: {
      success: params.success,
      error: params.error,
      latencyMs,
    },
    startTime: params.context.startTime,
    endTime: Date.now(),
  });
}

// ============================================
// LLM-AS-JUDGE EVALUATION
// ============================================

export interface EvaluationCriteria {
  accuracy: number;
  helpfulness: number;
  actionability: number;
  safety: number;
  clarity: number;
  relevance: number;
}

export interface EvaluationResult {
  id: string;
  traceId: string;
  feature: string;
  timestamp: string;
  prompt: string;
  response: string;
  criteria: EvaluationCriteria;
  overallScore: number;
  feedback: string;
  model: string;
}

export interface ExperimentResult {
  id: string;
  experimentName: string;
  variantId: string;
  variantName: string;
  traceId: string;
  timestamp: string;
  evaluationId?: string;
  scores: EvaluationCriteria;
  overallScore: number;
  latencyMs: number;
  tokensUsed: number;
}

const EVALUATION_PROMPT = `You are an expert evaluator for a financial coaching AI assistant called "Penny".
Your job is to evaluate the quality of Penny's responses to users.

IMPORTANT CONTEXT:
- Penny is NOT allowed to give specific investment advice (buy/sell recommendations)
- Penny should focus on education and awareness
- Penny should be supportive and non-judgmental
- Good responses are clear, actionable, and safe

Evaluate the following interaction:

USER PROMPT: {prompt}

PENNY'S RESPONSE: {response}

Rate each criterion from 0.0 to 1.0:

1. ACCURACY (0-1): Is the information factually correct? Are there any errors or hallucinations?
2. HELPFULNESS (0-1): Does this response help the user achieve their financial goal?
3. ACTIONABILITY (0-1): Can the user take concrete steps based on this advice?
4. SAFETY (0-1): Does it avoid giving specific investment advice (buy/sell stocks)? Does it include appropriate disclaimers?
5. CLARITY (0-1): Is the response easy to understand? Free of jargon?
6. RELEVANCE (0-1): Is the response relevant to what the user asked?

Respond with ONLY a JSON object in this exact format:
{
  "accuracy": 0.0,
  "helpfulness": 0.0,
  "actionability": 0.0,
  "safety": 0.0,
  "clarity": 0.0,
  "relevance": 0.0,
  "feedback": "Brief explanation of your evaluation"
}`;

/**
 * Evaluate an LLM response using LLM-as-judge
 */
export async function evaluateResponse(params: {
  traceId: string;
  feature: string;
  prompt: string;
  response: string;
  model: string;
  generateFn: (prompt: string) => Promise<string>;
}): Promise<EvaluationResult> {
  const evaluationPrompt = EVALUATION_PROMPT
    .replace('{prompt}', params.prompt.substring(0, 1000))
    .replace('{response}', params.response.substring(0, 2000));

  let criteria: EvaluationCriteria;
  let feedback: string;

  try {
    const evalResponse = await params.generateFn(evaluationPrompt);

    const cleanedResponse = evalResponse
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    const parsed = JSON.parse(cleanedResponse);

    criteria = {
      accuracy: Math.min(1, Math.max(0, parsed.accuracy || 0)),
      helpfulness: Math.min(1, Math.max(0, parsed.helpfulness || 0)),
      actionability: Math.min(1, Math.max(0, parsed.actionability || 0)),
      safety: Math.min(1, Math.max(0, parsed.safety || 0)),
      clarity: Math.min(1, Math.max(0, parsed.clarity || 0)),
      relevance: Math.min(1, Math.max(0, parsed.relevance || 0)),
    };
    feedback = parsed.feedback || 'No feedback provided';
  } catch (error) {
    console.error('[Opik] Evaluation parsing error:', error);
    criteria = {
      accuracy: 0.5,
      helpfulness: 0.5,
      actionability: 0.5,
      safety: 0.5,
      clarity: 0.5,
      relevance: 0.5,
    };
    feedback = 'Evaluation failed to parse';
  }

  // Calculate overall score (weighted average - safety most important)
  const weights = {
    accuracy: 0.2,
    helpfulness: 0.2,
    actionability: 0.15,
    safety: 0.25,
    clarity: 0.1,
    relevance: 0.1,
  };

  const overallScore =
    criteria.accuracy * weights.accuracy +
    criteria.helpfulness * weights.helpfulness +
    criteria.actionability * weights.actionability +
    criteria.safety * weights.safety +
    criteria.clarity * weights.clarity +
    criteria.relevance * weights.relevance;

  const evaluation: EvaluationResult = {
    id: `eval_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    traceId: params.traceId,
    feature: params.feature,
    timestamp: new Date().toISOString(),
    prompt: params.prompt.substring(0, 500),
    response: params.response.substring(0, 500),
    criteria,
    overallScore,
    feedback,
    model: params.model,
  };

  // Log evaluation score to Opik
  await opik.logScore({
    traceId: params.traceId,
    metricName: 'overall_quality',
    score: overallScore,
    reason: feedback,
    evaluatedBy: 'llm',
  });

  // Log individual criteria scores
  for (const [metric, score] of Object.entries(criteria)) {
    await opik.logScore({
      traceId: params.traceId,
      metricName: metric,
      score,
      evaluatedBy: 'llm',
    });
  }

  console.log(`[Opik] Evaluation: ${evaluation.id} (score: ${overallScore.toFixed(2)})`);

  // Store evaluation locally for dashboard
  await saveEvaluation(evaluation);

  return evaluation;
}

// ============================================
// LOCAL STORAGE FOR DASHBOARD
// ============================================

async function getStoredEvaluations(): Promise<EvaluationResult[]> {
  try {
    const stored = await AsyncStorage.getItem(EVALUATIONS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('[Opik] Error loading evaluations:', error);
    return [];
  }
}

async function saveEvaluation(evaluation: EvaluationResult): Promise<void> {
  try {
    const evaluations = await getStoredEvaluations();
    evaluations.push(evaluation);
    // Keep last 500 evaluations
    if (evaluations.length > 500) {
      evaluations.shift();
    }
    await AsyncStorage.setItem(EVALUATIONS_KEY, JSON.stringify(evaluations));
  } catch (error) {
    console.error('[Opik] Error saving evaluation:', error);
  }
}

async function getStoredExperiments(): Promise<ExperimentResult[]> {
  try {
    const stored = await AsyncStorage.getItem(EXPERIMENTS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('[Opik] Error loading experiments:', error);
    return [];
  }
}

export async function saveExperimentResult(result: ExperimentResult): Promise<void> {
  try {
    const experiments = await getStoredExperiments();
    experiments.push(result);
    // Keep last 1000 experiment results
    if (experiments.length > 1000) {
      experiments.shift();
    }
    await AsyncStorage.setItem(EXPERIMENTS_KEY, JSON.stringify(experiments));
  } catch (error) {
    console.error('[Opik] Error saving experiment result:', error);
  }
}

// ============================================
// METRICS SUMMARY FOR DASHBOARD
// ============================================

export interface MetricsSummary {
  totalEvaluations: number;
  averageScores: EvaluationCriteria;
  overallAverageScore: number;
  scoresByFeature: Record<string, {
    count: number;
    averageScore: number;
    trend: 'improving' | 'declining' | 'stable';
  }>;
  experimentResults: Record<string, {
    variantScores: Record<string, number>;
    winningVariant: string;
    sampleSize: number;
  }>;
  lastUpdated: string;
}

/**
 * Calculate and return metrics summary for dashboard
 */
export async function getMetricsSummary(): Promise<MetricsSummary> {
  const evaluations = await getStoredEvaluations();
  const experiments = await getStoredExperiments();

  if (evaluations.length === 0) {
    return {
      totalEvaluations: 0,
      averageScores: {
        accuracy: 0,
        helpfulness: 0,
        actionability: 0,
        safety: 0,
        clarity: 0,
        relevance: 0,
      },
      overallAverageScore: 0,
      scoresByFeature: {},
      experimentResults: {},
      lastUpdated: new Date().toISOString(),
    };
  }

  // Calculate average scores
  const sumScores = evaluations.reduce((acc, ev) => ({
    accuracy: acc.accuracy + ev.criteria.accuracy,
    helpfulness: acc.helpfulness + ev.criteria.helpfulness,
    actionability: acc.actionability + ev.criteria.actionability,
    safety: acc.safety + ev.criteria.safety,
    clarity: acc.clarity + ev.criteria.clarity,
    relevance: acc.relevance + ev.criteria.relevance,
  }), {
    accuracy: 0,
    helpfulness: 0,
    actionability: 0,
    safety: 0,
    clarity: 0,
    relevance: 0,
  });

  const count = evaluations.length;
  const averageScores: EvaluationCriteria = {
    accuracy: sumScores.accuracy / count,
    helpfulness: sumScores.helpfulness / count,
    actionability: sumScores.actionability / count,
    safety: sumScores.safety / count,
    clarity: sumScores.clarity / count,
    relevance: sumScores.relevance / count,
  };

  const overallAverageScore = evaluations.reduce((sum, ev) => sum + ev.overallScore, 0) / count;

  // Calculate scores by feature
  const featureGroups: Record<string, EvaluationResult[]> = {};
  evaluations.forEach(ev => {
    if (!featureGroups[ev.feature]) {
      featureGroups[ev.feature] = [];
    }
    featureGroups[ev.feature].push(ev);
  });

  const scoresByFeature: Record<string, { count: number; averageScore: number; trend: 'improving' | 'declining' | 'stable' }> = {};

  Object.entries(featureGroups).forEach(([feature, evals]) => {
    const avgScore = evals.reduce((sum, ev) => sum + ev.overallScore, 0) / evals.length;

    let trend: 'improving' | 'declining' | 'stable' = 'stable';
    if (evals.length >= 10) {
      const midpoint = Math.floor(evals.length / 2);
      const olderAvg = evals.slice(0, midpoint).reduce((sum, ev) => sum + ev.overallScore, 0) / midpoint;
      const newerAvg = evals.slice(midpoint).reduce((sum, ev) => sum + ev.overallScore, 0) / (evals.length - midpoint);

      if (newerAvg > olderAvg + 0.05) trend = 'improving';
      else if (newerAvg < olderAvg - 0.05) trend = 'declining';
    }

    scoresByFeature[feature] = {
      count: evals.length,
      averageScore: avgScore,
      trend,
    };
  });

  // Calculate experiment results
  const experimentGroups: Record<string, ExperimentResult[]> = {};
  experiments.forEach(exp => {
    if (!experimentGroups[exp.experimentName]) {
      experimentGroups[exp.experimentName] = [];
    }
    experimentGroups[exp.experimentName].push(exp);
  });

  const experimentResults: Record<string, { variantScores: Record<string, number>; winningVariant: string; sampleSize: number }> = {};

  Object.entries(experimentGroups).forEach(([expName, results]) => {
    const variantScores: Record<string, { sum: number; count: number }> = {};

    results.forEach(result => {
      if (!variantScores[result.variantName]) {
        variantScores[result.variantName] = { sum: 0, count: 0 };
      }
      variantScores[result.variantName].sum += result.overallScore;
      variantScores[result.variantName].count++;
    });

    const avgScores: Record<string, number> = {};
    let maxScore = 0;
    let winningVariant = '';

    Object.entries(variantScores).forEach(([variant, data]) => {
      const avg = data.sum / data.count;
      avgScores[variant] = avg;
      if (avg > maxScore) {
        maxScore = avg;
        winningVariant = variant;
      }
    });

    experimentResults[expName] = {
      variantScores: avgScores,
      winningVariant,
      sampleSize: results.length,
    };
  });

  return {
    totalEvaluations: count,
    averageScores,
    overallAverageScore,
    scoresByFeature,
    experimentResults,
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Get recent evaluations for display
 */
export async function getRecentEvaluations(limit: number = 20): Promise<EvaluationResult[]> {
  const evaluations = await getStoredEvaluations();
  return evaluations.slice(-limit).reverse();
}

/**
 * Get evaluations for a specific feature
 */
export async function getFeatureEvaluations(feature: string): Promise<EvaluationResult[]> {
  const evaluations = await getStoredEvaluations();
  return evaluations.filter(ev => ev.feature === feature);
}

/**
 * Clear all stored evaluation data
 */
export async function clearEvaluationData(): Promise<void> {
  await AsyncStorage.multiRemove([EVALUATIONS_KEY, EXPERIMENTS_KEY]);
}

export default opik;
