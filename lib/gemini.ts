import { z } from 'zod';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const GEMINI_MODEL = 'gemini-2.0-flash'; // Gemini 3 model

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
  const key = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  if (!key) {
    console.warn('[Gemini] API key not configured');
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
}): Promise<string> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('Gemini API key not configured');
  }

  const { prompt, systemInstruction, image, temperature = 0.7, maxTokens = 2048 } = params;

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
    },
  };

  if (systemInstruction) {
    requestBody.systemInstruction = {
      parts: [{ text: systemInstruction }],
    };
  }

  console.log('[Gemini] Sending request to Gemini 3...');
  
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

  console.log('[Gemini] Response received, tokens used:', data.usageMetadata?.totalTokenCount);
  
  return data.candidates[0].content.parts[0].text;
}

export async function generateStructuredWithGemini<T>(params: {
  prompt: string;
  systemInstruction?: string;
  schema: z.ZodType<T>;
  image?: string;
  temperature?: number;
}): Promise<T> {
  const { prompt, systemInstruction, schema, image, temperature = 0.3 } = params;

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
  });

  try {
    const cleanedResponse = response
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();
    
    const parsed = JSON.parse(cleanedResponse);
    return schema.parse(parsed);
  } catch (error) {
    console.error('[Gemini] Failed to parse structured response:', error);
    console.error('[Gemini] Raw response:', response);
    throw new Error('Failed to parse Gemini response as structured data');
  }
}

function zodToJsonSchema(schema: z.ZodTypeAny): Record<string, unknown> {
  if (schema instanceof z.ZodObject) {
    const shape = schema.shape;
    const properties: Record<string, unknown> = {};
    const required: string[] = [];

    for (const [key, value] of Object.entries(shape)) {
      properties[key] = zodToJsonSchema(value as z.ZodTypeAny);
      if (!(value instanceof z.ZodOptional)) {
        required.push(key);
      }
    }

    return { type: 'object', properties, required };
  }

  if (schema instanceof z.ZodString) {
    return { type: 'string' };
  }

  if (schema instanceof z.ZodNumber) {
    return { type: 'number' };
  }

  if (schema instanceof z.ZodBoolean) {
    return { type: 'boolean' };
  }

  if (schema instanceof z.ZodArray) {
    return { type: 'array', items: zodToJsonSchema(schema.element as z.ZodTypeAny) };
  }

  if (schema instanceof z.ZodEnum) {
    return { type: 'string', enum: schema.options };
  }

  if (schema instanceof z.ZodOptional) {
    return zodToJsonSchema(schema.unwrap() as z.ZodTypeAny);
  }

  return { type: 'string' };
}

export async function streamWithGemini(params: {
  prompt: string;
  systemInstruction?: string;
  onChunk: (text: string) => void;
  onComplete?: (fullText: string) => void;
}): Promise<void> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('Gemini API key not configured');
  }

  const { prompt, systemInstruction, onChunk, onComplete } = params;

  const requestBody: Record<string, unknown> = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 2048,
    },
  };

  if (systemInstruction) {
    requestBody.systemInstruction = {
      parts: [{ text: systemInstruction }],
    };
  }

  console.log('[Gemini] Starting stream...');

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

export const GEMINI_SYSTEM_PROMPT = `You are a calm, supportive financial coach powered by Google Gemini 3.
You explain money concepts in plain language without jargon.
You NEVER give investment advice, recommend specific assets, or tell users what to buy/sell.
You focus on education, awareness, and helping users understand their financial foundations.
Keep responses concise, warm, and actionable. Use simple language.

Key principles:
- Emergency fund before investing
- Understand before acting
- Progress over perfection
- No shame, no judgment`;
