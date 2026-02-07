import { z } from 'zod';
import { trackAICall } from './analytics';
import {
  startTrace,
  endTrace,
  evaluateResponse,
  TraceContext,
} from './opik';
import {
  getExperimentForFeature,
  getAssignedVariant,
  recordExperimentResult,
} from './experiments';
import logger from './logger';

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
    logger.warn('Gemini', 'API key not configured - get one at https://aistudio.google.com/app/apikey');
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
    logger.debug('Gemini', 'Using cached response');
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
  audio?: string; // base64 audio (data:audio/m4a;base64,...)
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
    audio,
    temperature = 0.7,
    maxTokens = 2048,
    thinkingLevel = 'medium', // Gemini 3 thinking level: minimal, low, medium, high
    feature = 'unknown',
  } = params;

  // Check cache first (skip for image/audio prompts)
  const cacheKey = !image && !audio ? getCacheKey(prompt, feature) : null;
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
      hasAudio: !!audio,
      thinkingLevel,
      experimentVariant: experimentVariant?.name,
    },
    tags: ['gemini', feature, thinkingLevel],
  });
  currentTraceId = traceContext.traceId;
  currentTraceContext = traceContext;

  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];

  if (image) {
    const mimeMatch = image.match(/^data:([^;]+);base64,/);
    const detectedMime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    const base64Data = image.replace(/^data:[^;]+;base64,/, '');
    parts.push({
      inlineData: {
        mimeType: detectedMime,
        data: base64Data,
      },
    });
  }

  if (audio) {
    const mimeMatch = audio.match(/^data:(audio\/\w+);base64,/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'audio/mp4';
    const base64Data = audio.replace(/^data:audio\/\w+;base64,/, '');
    parts.push({
      inlineData: {
        mimeType,
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

  logger.debug('Gemini', `Sending request to Gemini 3 (thinking: ${thinkingLevel})...`);

  let success = false;
  let responseText = '';
  let tokensUsed = { prompt: 0, completion: 0, total: 0 };
  let lastError: Error | null = null;

  // Retry loop with exponential backoff
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      if (attempt > 0) {
        const delay = getBackoffDelay(attempt - 1);
        logger.debug('Gemini', `Retry attempt ${attempt}/${MAX_RETRIES} after ${delay}ms delay...`);
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
        logger.error('Gemini', `API error (${response.status}): ${errorText}`);

        // Check if we should retry
        if (isRetryableError(response.status) && attempt < MAX_RETRIES) {
          logger.debug('Gemini', 'Rate limited or server error, will retry...');
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

      logger.debug('Gemini', `Response received, tokens used: ${tokensUsed.total}`);
      break; // Success! Exit the retry loop

    } catch (error) {
      lastError = error as Error;

      // If it's a retryable error and we have retries left, continue
      if (attempt < MAX_RETRIES) {
        logger.debug('Gemini', `Error occurred, will retry: ${String(error)}`);
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
        logger.error('Gemini', 'Evaluation failed', evalError);
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
  maxTokens?: number;
}): Promise<T> {
  const { prompt, systemInstruction, schema, image, temperature = 0.3, thinkingLevel = 'medium', maxTokens = 4096 } = params;

  const schemaDescription = JSON.stringify(zodToJsonSchema(schema), null, 2);

  const structuredPrompt = `${prompt}

IMPORTANT: Respond with ONLY a valid JSON object matching this exact schema:
${schemaDescription}

CRITICAL: Keep your response concise to fit within token limits. Prioritize completeness of the JSON structure over lengthy content. Truncate long text fields if needed.

Do not include any explanation, markdown formatting, or code blocks. Just the raw JSON object.`;

  const response = await generateWithGemini({
    prompt: structuredPrompt,
    systemInstruction,
    image,
    temperature,
    thinkingLevel,
    maxTokens,
  });

  try {
    let cleanedResponse = response
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    // Try to fix truncated JSON by closing open brackets/braces
    cleanedResponse = tryFixTruncatedJson(cleanedResponse);

    let parsed = JSON.parse(cleanedResponse);

    // Auto-fix common issues
    parsed = fixParsedResponse(parsed);

    return schema.parse(parsed);
  } catch (error) {
    logger.error('Gemini', 'Failed to parse structured response', error);
    logger.error('Gemini', `Raw response (first 500 chars): ${response.substring(0, 500)}`);
    throw new Error('Failed to parse Gemini response as structured data');
  }
}

/**
 * Fix common issues in parsed JSON response
 */
function fixParsedResponse(parsed: unknown): unknown {
  if (!parsed || typeof parsed !== 'object') return parsed;

  const obj = parsed as Record<string, unknown>;

  // Fields that should be numbers
  const numericFields = ['diversificationScore', 'score', 'rating', 'percent', 'percentage', 'value', 'amount', 'count', 'total'];

  // Fields that should be arrays
  const arrayFields = [
    'headlines', 'strengths', 'concerns', 'recommendations', 'risks',
    'whatWouldChange', 'tradeoffs', 'alternatives', 'nextSteps',
    'areasToReview', 'relevantSymbols', 'concentrationRisks', 'items',
    'suggestions', 'tips', 'actions', 'steps', 'points', 'considerations',
    'pros', 'cons', 'benefits', 'drawbacks', 'factors', 'reasons'
  ];

  // Enum fields that should be lowercase
  const enumFields = [
    'sentiment', 'priority', 'status', 'type', 'category', 'level',
    'risk', 'riskLevel', 'healthLabel', 'marketSentiment', 'impact'
  ];

  for (const key of Object.keys(obj)) {
    const value = obj[key];

    // Convert string numbers to actual numbers
    if (typeof value === 'string' && numericFields.some(f => key.toLowerCase().includes(f.toLowerCase()))) {
      const numValue = parseFloat(value);
      if (!isNaN(numValue)) {
        obj[key] = numValue;
        continue;
      }
    }

    // Lowercase enum fields
    if (typeof value === 'string' && enumFields.includes(key)) {
      obj[key] = value.toLowerCase();
      continue;
    }

    // Handle fields that should be arrays but came as strings
    if (typeof value === 'string' && arrayFields.includes(key)) {
      obj[key] = stringToArray(value);
      continue;
    }

    // Recursively fix nested objects
    if (Array.isArray(value)) {
      obj[key] = value.map(item => fixParsedResponse(item));
    } else if (typeof value === 'object' && value !== null) {
      obj[key] = fixParsedResponse(value);
    }
  }

  return obj;
}

/**
 * Convert a string that should be an array into an actual array
 */
function stringToArray(value: string): string[] {
  // Try to parse as numbered list: "1. item 2. item"
  const numberedItems = value.match(/\d+\.\s*[^0-9]+(?=\d+\.|$)/g);
  if (numberedItems && numberedItems.length > 1) {
    return numberedItems.map(item => item.replace(/^\d+\.\s*/, '').trim());
  }

  // Try to split by common delimiters
  const delimiters = [/\n+/, /;\s*/, /\.\s+(?=[A-Z])/, /,\s*(?=[A-Z])/];
  for (const delimiter of delimiters) {
    const items = value.split(delimiter).map(s => s.trim()).filter(s => s.length > 0);
    if (items.length > 1) {
      return items;
    }
  }

  // Single item becomes array
  return [value];
}

/**
 * Attempts to fix truncated JSON by closing unclosed brackets and braces
 */
function tryFixTruncatedJson(json: string): string {
  // If it already parses, return as-is
  try {
    JSON.parse(json);
    return json;
  } catch {
    // Continue with fix attempt
  }

  let fixed = json.trim();

  // Remove markdown code blocks if present
  fixed = fixed.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '');

  // First pass: detect if we're in an unclosed string by counting quotes
  let quoteCount = 0;
  let escapeNext = false;
  for (const char of fixed) {
    if (escapeNext) {
      escapeNext = false;
      continue;
    }
    if (char === '\\') {
      escapeNext = true;
      continue;
    }
    if (char === '"') {
      quoteCount++;
    }
  }

  // If odd number of quotes, we have an unclosed string
  if (quoteCount % 2 === 1) {
    // Find the last quote and truncate to close cleanly
    const lastQuoteIndex = fixed.lastIndexOf('"');
    if (lastQuoteIndex > 0) {
      // Find what comes before this quote to determine context
      const beforeQuote = fixed.substring(0, lastQuoteIndex).trim();

      // If it's a key-value pair, close the string value
      if (beforeQuote.endsWith(':')) {
        fixed = fixed.substring(0, lastQuoteIndex + 1) + '..."';
      } else if (beforeQuote.match(/,\s*$/)) {
        // Array item - close it
        fixed = fixed.substring(0, lastQuoteIndex + 1) + '..."';
      } else {
        // Just close the string
        fixed += '"';
      }
    } else {
      fixed += '"';
    }
  }

  // Remove trailing incomplete patterns (with multiline support)
  // Remove trailing incomplete string (ends with unclosed quote and content)
  fixed = fixed.replace(/:\s*"[^"]*$/s, ': "..."');

  // Remove trailing incomplete array item
  fixed = fixed.replace(/,\s*"[^"]*$/s, '');

  // Remove trailing incomplete object/array
  fixed = fixed.replace(/,\s*$/s, '');

  // Remove incomplete key (key without value)
  fixed = fixed.replace(/,\s*"[^"]+"\s*$/s, '');
  fixed = fixed.replace(/{\s*"[^"]+"\s*$/s, '{');

  // Count brackets and braces after fixes
  let openBraces = 0;
  let openBrackets = 0;
  let inString = false;
  escapeNext = false;

  for (const char of fixed) {
    if (escapeNext) {
      escapeNext = false;
      continue;
    }
    if (char === '\\') {
      escapeNext = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;

    if (char === '{') openBraces++;
    if (char === '}') openBraces--;
    if (char === '[') openBrackets++;
    if (char === ']') openBrackets--;
  }

  // Close any unclosed strings (safety check)
  if (inString) {
    fixed += '"';
  }

  // Only add closing brackets/braces if there are more opens than closes
  // Don't add anything if counts are negative (malformed JSON)
  if (openBrackets > 0) {
    fixed += ']'.repeat(openBrackets);
  }
  if (openBraces > 0) {
    fixed += '}'.repeat(openBraces);
  }

  // Validate the fix worked
  try {
    JSON.parse(fixed);
    return fixed;
  } catch {
    // Try more aggressive truncation - find the last complete object/array item
    try {
      // Find last complete item in array (ends with })
      const lastCompleteItem = fixed.lastIndexOf('},');
      if (lastCompleteItem > 0) {
        let truncated = fixed.substring(0, lastCompleteItem + 1);
        // Close remaining brackets
        openBrackets = (truncated.match(/\[/g) || []).length - (truncated.match(/\]/g) || []).length;
        openBraces = (truncated.match(/\{/g) || []).length - (truncated.match(/\}/g) || []).length;
        if (openBrackets > 0) truncated += ']'.repeat(openBrackets);
        if (openBraces > 0) truncated += '}'.repeat(openBraces);
        JSON.parse(truncated);
        return truncated;
      }
    } catch {
      // Still failed
    }

    // Fix didn't work, return original to get better error message
    return json;
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

  logger.debug('Gemini', `Starting stream (thinking: ${thinkingLevel})...`);

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
    logger.error('Gemini', 'Stream error', error);
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

  logger.debug('Gemini', 'Stream complete');
  onComplete?.(fullText);
}

/**
 * Function calling support for Gemini 3
 * Allows the model to call predefined functions and get results
 */
export interface GeminiFunctionDeclaration {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description: string;
      enum?: string[];
    }>;
    required?: string[];
  };
}

export interface GeminiFunctionCall {
  name: string;
  args: Record<string, unknown>;
}

export interface GeminiFunctionResponse {
  name: string;
  response: unknown;
}

export async function generateWithFunctions(params: {
  prompt: string;
  systemInstruction?: string;
  functions: GeminiFunctionDeclaration[];
  functionHandlers: Record<string, (args: Record<string, unknown>) => Promise<unknown>>;
  maxFunctionCalls?: number;
  thinkingLevel?: ThinkingLevel;
}): Promise<{ text: string; functionCalls: GeminiFunctionCall[] }> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('Gemini API key not configured');
  }

  const {
    prompt,
    systemInstruction,
    functions,
    functionHandlers,
    maxFunctionCalls = 5,
    thinkingLevel = 'medium',
  } = params;

  const messages: GeminiMessage[] = [
    { role: 'user', parts: [{ text: prompt }] }
  ];

  const allFunctionCalls: GeminiFunctionCall[] = [];
  let iterations = 0;

  while (iterations < maxFunctionCalls) {
    iterations++;

    const requestBody: Record<string, unknown> = {
      contents: messages,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048,
        thinkingConfig: { thinkingLevel },
      },
      tools: [{
        functionDeclarations: functions,
      }],
    };

    if (systemInstruction) {
      requestBody.systemInstruction = {
        parts: [{ text: systemInstruction }],
      };
    }

    const response = await fetch(
      `${GEMINI_API_URL}/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const candidate = data.candidates?.[0];

    if (!candidate?.content?.parts) {
      throw new Error('No response from Gemini');
    }

    // Check for function calls in the response
    const functionCallPart = candidate.content.parts.find(
      (p: Record<string, unknown>) => p.functionCall
    );

    if (functionCallPart?.functionCall) {
      const functionCall = functionCallPart.functionCall as GeminiFunctionCall;
      allFunctionCalls.push(functionCall);

      // Execute the function
      const handler = functionHandlers[functionCall.name];
      if (!handler) {
        throw new Error(`No handler for function: ${functionCall.name}`);
      }

      const result = await handler(functionCall.args);

      // Add function call and result to conversation
      messages.push({
        role: 'model',
        parts: [{ functionCall } as unknown as { text: string }],
      });
      messages.push({
        role: 'user',
        parts: [{
          functionResponse: {
            name: functionCall.name,
            response: result,
          },
        } as unknown as { text: string }],
      });

      continue; // Let the model process the result
    }

    // No function call - return the text response
    const textPart = candidate.content.parts.find(
      (p: Record<string, unknown>) => p.text
    );

    return {
      text: textPart?.text || '',
      functionCalls: allFunctionCalls,
    };
  }

  throw new Error(`Max function calls (${maxFunctionCalls}) exceeded`);
}

/**
 * Predefined functions for portfolio analysis
 */
export const PORTFOLIO_FUNCTIONS: GeminiFunctionDeclaration[] = [
  {
    name: 'get_current_price',
    description: 'Get the current market price for a stock or crypto symbol',
    parameters: {
      type: 'object',
      properties: {
        symbol: {
          type: 'string',
          description: 'The ticker symbol (e.g., AAPL, BTC)',
        },
        type: {
          type: 'string',
          description: 'Asset type',
          enum: ['stock', 'crypto', 'etf'],
        },
      },
      required: ['symbol', 'type'],
    },
  },
  {
    name: 'calculate_portfolio_metrics',
    description: 'Calculate diversification and risk metrics for current portfolio',
    parameters: {
      type: 'object',
      properties: {
        includeRecommendations: {
          type: 'boolean',
          description: 'Whether to include rebalancing recommendations',
        },
      },
    },
  },
  {
    name: 'search_market_news',
    description: 'Search for recent market news about a topic or symbol',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query for market news',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results',
        },
      },
      required: ['query'],
    },
  },
];

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
