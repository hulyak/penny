import { z } from 'zod';
import { opik, traceLLMCall } from './opik';
import { trackAICall } from './analytics';
import { quickEvaluate, runFullEvaluation, EvaluationContext } from './evaluation';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const GEMINI_MODEL = 'gemini-3-flash-preview'; // Gemini 3 Flash - frontier intelligence at Flash speed

export type ThinkingLevel = 'minimal' | 'low' | 'medium' | 'high';

// Track the current trace for evaluation
let currentTraceId: string | null = null;

export function getCurrentTraceId(): string | null {
  return currentTraceId;
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

export async function generateWithGemini(params: {
  prompt: string;
  systemInstruction?: string;
  image?: string; // base64 image
  temperature?: number;
  maxTokens?: number;
  thinkingLevel?: ThinkingLevel;
  feature?: string; // For tracking which feature made the call
  skipEvaluation?: boolean; // Skip evaluation for internal calls
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
    skipEvaluation = false,
  } = params;

  // Start tracing
  const startTime = Date.now();
  const traceId = await opik.createTrace({
    name: `gemini_${feature}`,
    input: {
      prompt: prompt.substring(0, 500), // Truncate for storage
      hasImage: !!image,
      thinkingLevel,
      feature,
    },
    tags: ['gemini', feature, thinkingLevel],
  });
  currentTraceId = traceId;

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

  if (systemInstruction) {
    requestBody.systemInstruction = {
      parts: [{ text: systemInstruction }],
    };
  }

  console.log(`[Gemini] Sending request to Gemini 3 (thinking: ${thinkingLevel})...`);

  let success = false;
  let responseText = '';
  let tokensUsed = { prompt: 0, completion: 0, total: 0 };

  try {
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
      const error = await response.text();
      console.error('[Gemini] API error:', error);
      throw new Error(`Gemini API error: ${response.status}`);
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

  } catch (error) {
    // Log error to trace
    await traceLLMCall({
      traceId,
      model: GEMINI_MODEL,
      prompt: prompt.substring(0, 500),
      response: `Error: ${String(error)}`,
      latencyMs: Date.now() - startTime,
      metadata: { error: true },
    });
    throw error;
  }

  const latencyMs = Date.now() - startTime;

  // Log LLM call to Opik
  await traceLLMCall({
    traceId,
    model: GEMINI_MODEL,
    prompt: prompt.substring(0, 500),
    response: responseText.substring(0, 500),
    tokensUsed,
    latencyMs,
    metadata: { feature, thinkingLevel },
  });

  // Track in analytics
  await trackAICall({
    traceId,
    model: GEMINI_MODEL,
    feature,
    latencyMs,
    success,
    tokensUsed: tokensUsed.total,
  });

  // Run quick evaluation (heuristics only, no additional LLM call)
  if (!skipEvaluation && feature !== 'evaluation') {
    const evalResult = quickEvaluate({
      userInput: prompt,
      assistantResponse: responseText,
    });

    // Log quick eval score
    await opik.logScore({
      traceId,
      metricName: 'quick_quality',
      score: evalResult.score,
      reason: evalResult.flags.join('; ') || 'Passed all checks',
      evaluatedBy: 'heuristic',
    });

    // Log any flags
    if (evalResult.flags.length > 0) {
      console.log('[Gemini] Quality flags:', evalResult.flags);
    }
  }

  return responseText;
}

/**
 * Run full LLM-as-judge evaluation on a response
 * Call this for important interactions that warrant deeper analysis
 */
export async function evaluateResponse(
  userInput: string,
  assistantResponse: string,
  financialContext?: EvaluationContext['financialContext']
): Promise<{ overallScore: number; details: unknown }> {
  const traceId = currentTraceId || await opik.createTrace({
    name: 'manual_evaluation',
    input: { userInput: userInput.substring(0, 200) },
    tags: ['evaluation'],
  });

  const result = await runFullEvaluation(traceId, {
    userInput,
    assistantResponse,
    financialContext,
  }, {
    useLLM: true,
    llmMetrics: ['helpfulness', 'financial_accuracy', 'safety', 'actionability'],
  });

  return {
    overallScore: result.overallScore,
    details: {
      heuristic: result.heuristicResults,
      llm: result.llmResults,
    },
  };
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

    // Auto-fix common issues: convert string arrays to actual arrays
    if (parsed && typeof parsed === 'object') {
      for (const key of Object.keys(parsed)) {
        // If a field should be an array but is a string, try to split it
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
