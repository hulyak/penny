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
const OPIK_BASE_URL = process.env.EXPO_PUBLIC_OPIK_URL || 'https://www.comet.com/opik/api';

// Storage keys for offline support
const TRACES_QUEUE_KEY = 'opik_traces_queue';
const METRICS_KEY = 'opik_metrics';
const FEEDBACK_KEY = 'opik_feedback';

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
 * OpikClient - Main client for Opik integration
 */
class OpikClient {
  private projectName: string;
  private isConfigured: boolean;
  private tracesQueue: Array<{trace: TraceInput; spans: SpanInput[]; scores: EvaluationScore[]}> = [];

  constructor() {
    this.projectName = OPIK_PROJECT_NAME;
    this.isConfigured = isOpikConfigured();
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
        console.warn('[Opik] Failed to send trace, queuing locally:', error);
        this.tracesQueue.push({ trace: input, spans: [], scores: [] });
        await this.saveQueuedTraces();
      }
    } else {
      // Store locally for later analysis
      this.tracesQueue.push({ trace: input, spans: [], scores: [] });
      await this.saveQueuedTraces();
    }

    console.log('[Opik] Created trace:', traceId, input.name);
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
        console.warn('[Opik] Failed to send span:', error);
      }
    }

    console.log('[Opik] Created span:', spanId, input.name);
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
        console.warn('[Opik] Failed to update span:', error);
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
        console.warn('[Opik] Failed to send score:', error);
      }
    }

    // Always store locally for analytics
    await this.storeMetric('scores', scoreData);
    console.log('[Opik] Logged score:', score.metricName, score.score);
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
        console.warn('[Opik] Failed to send feedback:', error);
      }
    }

    // Always store locally
    await this.storeFeedback(feedbackData);
    console.log('[Opik] Logged feedback:', feedback.rating);
  }

  /**
   * Send data to Opik API
   */
  private async sendToOpik(endpoint: string, data: unknown, method: string = 'POST'): Promise<unknown> {
    const response = await fetch(`${OPIK_BASE_URL}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPIK_API_KEY}`,
        'Comet-Workspace': OPIK_WORKSPACE,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Opik API error: ${response.status}`);
    }

    return response.json();
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

    console.log('[Opik] Flushing', this.tracesQueue.length, 'queued traces');

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
        console.warn('[Opik] Failed to flush trace:', error);
        return; // Stop if we hit an error
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

export default opik;
