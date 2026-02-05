import { z } from 'zod';
import { trackAICall } from './analytics';
import {
  startTrace,
  endTrace,
  evaluateResponse,
  TraceContext,
} from './opikClient';
import {
  getExperimentForFeature,
  getAssignedVariant,
  recordExperimentResult,
} from './experiments';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const GEMINI_MODEL = 'gemini-3-flash-preview'; // Gemini 3 Flash - frontier intelligence at Flash speed

export type ThinkingLevel = 'minimal' | 'low' | 'medium' | 'high';

// Track the current trace for evaluation
let currentTraceId: string | null = null;
let currentTraceContext: TraceContext | null = null;

export function getCurrentTraceId(): string | null {
  return currentTraceId;
}

// Sample rate for evaluations (don't evaluate every single call)
const EVALUATION_SAMPLE_RATE = 0.3; // 30% of calls get evaluated

function shouldEvaluate(): boolean {
  return Math.random() < EVALUATION_SAMPLE_RATE;
}

interface GeminiMessage {
  role: 'user' | 'model';
  parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }>;
}

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{ text: string }>;
      role: string;
    };
    finishReason: string;
  }>;
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

const getApiKey = () => {
  const key = process.env.EXPO_PUBLIC_GOOGLE_AI_API_KEY;
  if (!key) {
    console.warn('[Gemini] API key not configured - get one at https://aistudio.google.com/app/apikey');
    return null;
  }
  return key;
};

// Retry configuration
const MAX_RETRIES = 3;
const INITIAL_DELAY_MS = 1000; // 1 second
const MAX_DELAY_MS = 30000; // 30 seconds

// Simple in-memory cache for repeated prompts
const responseCache = new Map<string, { response: string; timestamp: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function getCacheKey(prompt: string, feature: string): string {
  return `${feature}:${prompt.substring(0, 100)}`;
}

function getCachedResponse(key: string): string | null {
  const cached = responseCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    console.log('[Gemini] Using cached response');
    return cached.response;
  }
  responseCache.delete(key);
  return null;
}

function setCachedResponse(key: string, response: string): void {
  // Limit cache size
  if (responseCache.size > 50) {
    const firstKey = responseCache.keys().next().value;
    if (firstKey) responseCache.delete(firstKey);
  }
  responseCache.set(key, { response, timestamp: Date.now() });
}

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calculate exponential backoff delay with jitter
 */
function getBackoffDelay(attempt: number): number {
  // Exponential backoff: 1s, 2s, 4s, 8s, etc.
  const exponentialDelay = INITIAL_DELAY_MS * Math.pow(2, attempt);
  // Add random jitter (±25%) to prevent thundering herd
  const jitter = exponentialDelay * 0.25 * (Math.random() * 2 - 1);
  const delay = Math.min(exponentialDelay + jitter, MAX_DELAY_MS);
  return Math.round(delay);
}

/**
 * Check if error is retryable (rate limit or server error)
 */
function isRetryableError(status: number): boolean {
  // 429 = Rate limit, 500/502/503/504 = Server errors
  return status === 429 || status >= 500;
}

export async function generateWithGemini(params: {
  prompt: string;
  systemInstruction?: string;
  image?: string; // base64 image
  temperature?: number;
  maxTokens?: number;
  thinkingLevel?: ThinkingLevel;
  feature?: string; // For tracking which feature made the call
}): Promise<string> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('Gemini API key not configured');
  }

  const {
    prompt,
    systemInstruction,
    image,
    temperature = 0.7,
    maxTokens = 2048,
    thinkingLevel = 'medium', // Gemini 3 thinking level: minimal, low, medium, high
    feature = 'unknown',
  } = params;

  // Check cache first (skip for image prompts)
  const cacheKey = !image ? getCacheKey(prompt, feature) : null;
  if (cacheKey) {
    const cachedResponse = getCachedResponse(cacheKey);
    if (cachedResponse) {
      return cachedResponse;
    }
  }

  // Check for active experiment and get variant
  const experiment = getExperimentForFeature(feature);
  let experimentVariant = null;
  let experimentSystemPrompt = systemInstruction;

  if (experiment) {
    experimentVariant = await getAssignedVariant(experiment.id);
    if (experimentVariant?.systemPrompt) {
      experimentSystemPrompt = experimentVariant.systemPrompt;
    }
  }

  // Start tracing with new Opik client
  const startTime = Date.now();
  const traceContext = await startTrace({
    name: `gemini_${feature}`,
    feature,
    input: {
      prompt: prompt.substring(0, 500),
      hasImage: !!image,
      thinkingLevel,
      experimentVariant: experimentVariant?.name,
    },
    tags: ['gemini', feature, thinkingLevel],
  });
  currentTraceId = traceContext.traceId;
  currentTraceContext = traceContext;

  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];

  if (image) {
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
    parts.push({
      inlineData: {
        mimeType: 'image/jpeg',
        data: base64Data,
      },
    });
  }

  parts.push({ text: prompt });

  const requestBody: Record<string, unknown> = {
    contents: [{ role: 'user', parts }],
    generationConfig: {
      temperature,
      maxOutputTokens: maxTokens,
      topP: 0.95,
      topK: 40,
      thinkingConfig: {
        thinkingLevel,
      },
    },
  };

  // Use experiment system prompt if available, otherwise use provided systemInstruction
  const finalSystemPrompt = experimentSystemPrompt || systemInstruction;
  if (finalSystemPrompt) {
    requestBody.systemInstruction = {
      parts: [{ text: finalSystemPrompt }],
    };
  }

  console.log(`[Gemini] Sending request to Gemini 3 (thinking: ${thinkingLevel})...`);

  let success = false;
  let responseText = '';
  let tokensUsed = { prompt: 0, completion: 0, total: 0 };
  let lastError: Error | null = null;

  // Retry loop with exponential backoff
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      if (attempt > 0) {
        const delay = getBackoffDelay(attempt - 1);
        console.log(`[Gemini] Retry attempt ${attempt}/${MAX_RETRIES} after ${delay}ms delay...`);
        await sleep(delay);
      }

      const response = await fetch(
        `${GEMINI_API_URL}/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Gemini] API error (${response.status}):`, errorText);

        // Check if we should retry
        if (isRetryableError(response.status) && attempt < MAX_RETRIES) {
          console.log(`[Gemini] Rate limited or server error, will retry...`);
          lastError = new Error(`Gemini API error: ${response.status}`);
          continue; // Try again
        }

        throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
      }

      const data: GeminiResponse = await response.json();

      if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
        throw new Error('No response from Gemini');
      }

      responseText = data.candidates[0].content.parts[0].text;
      tokensUsed = {
        prompt: data.usageMetadata?.promptTokenCount || 0,
        completion: data.usageMetadata?.candidatesTokenCount || 0,
        total: data.usageMetadata?.totalTokenCount || 0,
      };
      success = true;

      console.log('[Gemini] Response received, tokens used:', tokensUsed.total);
      break; // Success! Exit the retry loop

    } catch (error) {
      lastError = error as Error;

      // If it's a retryable error and we have retries left, continue
      if (attempt < MAX_RETRIES) {
        console.log(`[Gemini] Error occurred, will retry: ${String(error)}`);
        continue;
      }

      // All retries exhausted, log and throw
      await endTrace({
        context: traceContext,
        output: { error: `Error after ${MAX_RETRIES + 1} attempts: ${String(error)}` },
        success: false,
        error: String(error),
      });
      throw error;
    }
  }

  // If we got here without success, throw the last error
  if (!success && lastError) {
    throw lastError;
  }

  const latencyMs = Date.now() - startTime;

  // End trace with new Opik client
  await endTrace({
    context: traceContext,
    output: { response: responseText.substring(0, 500) },
    tokensUsed,
    success,
  });

  // Track in analytics
  await trackAICall({
    traceId: traceContext.traceId,
    model: GEMINI_MODEL,
    feature,
    latencyMs,
    success,
    tokensUsed: tokensUsed.total,
  });

  // Run LLM-as-judge evaluation (sampled to reduce API calls)
  if (shouldEvaluate() && feature !== 'evaluation') {
    // Async evaluation - don't block the response
    (async () => {
      try {
        const evaluation = await evaluateResponse({
          traceId: traceContext.traceId,
          feature,
          prompt: prompt.substring(0, 1000),
          response: responseText.substring(0, 2000),
          model: GEMINI_MODEL,
          generateFn: async (evalPrompt) => {
            // Use a separate call for evaluation to avoid recursion
            const evalResponse = await generateWithGemini({
              prompt: evalPrompt,
              temperature: 0.1, // Low temperature for consistent evaluation
              thinkingLevel: 'low',
              feature: 'evaluation', // Mark as evaluation to prevent infinite recursion
            });
            return evalResponse;
          },
        });

        // Record experiment result if this was part of an experiment
        if (experiment && experimentVariant) {
          await recordExperimentResult({
            experimentId: experiment.id,
            variantId: experimentVariant.id,
            traceId: traceContext.traceId,
            scores: evaluation.criteria,
            overallScore: evaluation.overallScore,
            latencyMs,
            tokensUsed: tokensUsed.total,
          });
        }
      } catch (evalError) {
        console.error('[Gemini] Evaluation failed:', evalError);
      }
    })();
  }

  // Cache the successful response
  if (cacheKey) {
    setCachedResponse(cacheKey, responseText);
  }

  return responseText;
}

export async function generateStructuredWithGemini<T>(params: {
  prompt: string;
  systemInstruction?: string;
  schema: z.ZodType<T>;
  image?: string;
  temperature?: number;
  thinkingLevel?: ThinkingLevel;
}): Promise<T> {
  const { prompt, systemInstruction, schema, image, temperature = 0.3, thinkingLevel = 'medium' } = params;

  const schemaDescription = JSON.stringify(zodToJsonSchema(schema), null, 2);
  
  const structuredPrompt = `${prompt}

IMPORTANT: Respond with ONLY a valid JSON object matching this exact schema:
${schemaDescription}

Do not include any explanation, markdown formatting, or code blocks. Just the raw JSON object.`;

  const response = await generateWithGemini({
    prompt: structuredPrompt,
    systemInstruction,
    image,
    temperature,
    thinkingLevel,
  });

  try {
    const cleanedResponse = response
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    let parsed = JSON.parse(cleanedResponse);

    // Auto-fix common issues
    if (parsed && typeof parsed === 'object') {
      for (const key of Object.keys(parsed)) {
        // Lowercase enum fields (sentiment, priority, status, etc.)
        if (typeof parsed[key] === 'string' &&
            (key === 'sentiment' ||
             key === 'priority' ||
             key === 'status' ||
             key === 'type' ||
             key === 'category' ||
             key === 'level' ||
             key === 'risk' ||
             key === 'healthLabel')) {
          parsed[key] = parsed[key].toLowerCase();
        }

        // Convert string arrays to actual arrays
        if (typeof parsed[key] === 'string' &&
            (key.toLowerCase().includes('array') ||
             key === 'whatWouldChange' ||
             key === 'tradeoffs' ||
             key === 'alternatives' ||
             key === 'nextSteps' ||
             key === 'areasToReview')) {
          // Try to split numbered items like "1. item 2. item" or newline-separated
          const items = parsed[key]
            .split(/(?:\d+\.\s*|\n+|;\s*)/)
            .map((s: string) => s.trim())
            .filter((s: string) => s.length > 0);
          if (items.length > 1) {
            parsed[key] = items;
          } else {
            parsed[key] = [parsed[key]];
          }
        }
      }
    }

    return schema.parse(parsed);
  } catch (error) {
    console.error('[Gemini] Failed to parse structured response:', error);
    console.error('[Gemini] Raw response:', response);
    throw new Error('Failed to parse Gemini response as structured data');
  }
}

function zodToJsonSchema(schema: unknown): Record<string, unknown> {
  const s = schema as Record<string, unknown>;
  const def = s._def as Record<string, unknown> | undefined;
  const typeName = def?.typeName as string | undefined;
  
  if (typeName === 'ZodObject' || s.shape) {
    const shape = (s.shape || def?.shape || {}) as Record<string, unknown>;
    const properties: Record<string, unknown> = {};
    const required: string[] = [];

    for (const [key, value] of Object.entries(shape)) {
      properties[key] = zodToJsonSchema(value);
      const vDef = (value as Record<string, unknown>)?._def as Record<string, unknown> | undefined;
      if (vDef?.typeName !== 'ZodOptional') {
        required.push(key);
      }
    }

    return { type: 'object', properties, required };
  }

  if (typeName === 'ZodString') {
    return { type: 'string' };
  }

  if (typeName === 'ZodNumber') {
    return { type: 'number' };
  }

  if (typeName === 'ZodBoolean') {
    return { type: 'boolean' };
  }

  if (typeName === 'ZodArray') {
    const element = s.element || def?.type;
    return { type: 'array', items: zodToJsonSchema(element) };
  }

  if (typeName === 'ZodEnum') {
    const options = s.options || def?.values;
    return { type: 'string', enum: options };
  }

  if (typeName === 'ZodOptional') {
    const unwrap = s.unwrap as (() => unknown) | undefined;
    const inner = unwrap ? unwrap() : def?.innerType;
    return zodToJsonSchema(inner);
  }

  return { type: 'string' };
}

export async function streamWithGemini(params: {
  prompt: string;
  systemInstruction?: string;
  onChunk: (text: string) => void;
  onComplete?: (fullText: string) => void;
  thinkingLevel?: ThinkingLevel;
}): Promise<void> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('Gemini API key not configured');
  }

  const { prompt, systemInstruction, onChunk, onComplete, thinkingLevel = 'low' } = params;

  const requestBody: Record<string, unknown> = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 2048,
      thinkingConfig: {
        thinkingLevel,
      },
    },
  };

  if (systemInstruction) {
    requestBody.systemInstruction = {
      parts: [{ text: systemInstruction }],
    };
  }

  console.log(`[Gemini] Starting stream (thinking: ${thinkingLevel})...`);

  const response = await fetch(
    `${GEMINI_API_URL}/${GEMINI_MODEL}:streamGenerateContent?key=${apiKey}&alt=sse`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error('[Gemini] Stream error:', error);
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('No response body');
  }

  const decoder = new TextDecoder();
  let fullText = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    const lines = chunk.split('\n');

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6));
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            fullText += text;
            onChunk(text);
          }
        } catch {
          // Skip invalid JSON
        }
      }
    }
  }

  console.log('[Gemini] Stream complete');
  onComplete?.(fullText);
}

export const GEMINI_SYSTEM_PROMPT = `You are Penny, a calm and supportive financial coach powered by Google Gemini 3.
You leverage advanced reasoning capabilities to provide personalized, context-aware financial guidance.
You explain money concepts in plain language without jargon.
You NEVER give investment advice, recommend specific assets, or tell users what to buy/sell.
You focus on education, awareness, and helping users understand their financial foundations.
Keep responses concise, warm, and actionable. Use simple language.

Key principles:
- Emergency fund before investing
- Understand before acting
- Progress over perfection
- No shame, no judgment

Powered by Gemini 3 with enhanced reasoning for complex financial analysis.`;
