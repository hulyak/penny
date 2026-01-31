import { z } from 'zod';
import { generateWithGemini, generateStructuredWithGemini, GEMINI_SYSTEM_PROMPT } from './gemini';

/**
 * Real-Time Teacher - Voice-Based Financial Coaching with Gemini Live API
 *
 * Features:
 * - Adaptive financial literacy lessons
 * - Real-time audio coaching
 * - Interactive voice-based learning
 * - Progress tracking and personalization
 */

const GEMINI_LIVE_API_URL = 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent';

// Lesson types
export type LessonTopic =
  | 'emergency_fund_basics'
  | 'budgeting_101'
  | 'debt_management'
  | 'savings_strategies'
  | 'compound_interest'
  | 'investing_foundations'
  | 'credit_score'
  | 'tax_basics';

export interface LessonProgress {
  lessonId: string;
  topic: LessonTopic;
  startedAt: string;
  completedAt?: string;
  questionsAsked: number;
  correctAnswers: number;
  comprehensionScore: number;
}

export interface TeacherSession {
  sessionId: string;
  userId: string;
  currentLesson: LessonTopic | null;
  lessonHistory: LessonProgress[];
  userLevel: 'beginner' | 'intermediate' | 'advanced';
  preferredPace: 'slow' | 'normal' | 'fast';
  financialContext: {
    healthScore: number;
    primaryGoal: string;
    weakAreas: string[];
  };
}

// Lesson content structure
interface LessonContent {
  title: string;
  objectives: string[];
  sections: {
    name: string;
    content: string;
    duration: string;
    interactiveElements: string[];
  }[];
  quiz: {
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  }[];
}

// Lesson curriculum
const LESSON_CURRICULUM: Record<LessonTopic, { title: string; prerequisites: LessonTopic[]; level: string }> = {
  emergency_fund_basics: {
    title: 'Building Your Emergency Fund',
    prerequisites: [],
    level: 'beginner',
  },
  budgeting_101: {
    title: 'Budgeting Fundamentals',
    prerequisites: [],
    level: 'beginner',
  },
  debt_management: {
    title: 'Managing and Reducing Debt',
    prerequisites: ['budgeting_101'],
    level: 'beginner',
  },
  savings_strategies: {
    title: 'Smart Savings Strategies',
    prerequisites: ['emergency_fund_basics', 'budgeting_101'],
    level: 'intermediate',
  },
  compound_interest: {
    title: 'The Power of Compound Interest',
    prerequisites: ['savings_strategies'],
    level: 'intermediate',
  },
  investing_foundations: {
    title: 'Introduction to Investing Concepts',
    prerequisites: ['compound_interest', 'emergency_fund_basics'],
    level: 'intermediate',
  },
  credit_score: {
    title: 'Understanding Your Credit Score',
    prerequisites: ['debt_management'],
    level: 'intermediate',
  },
  tax_basics: {
    title: 'Tax Basics for Everyone',
    prerequisites: [],
    level: 'advanced',
  },
};

// Generate adaptive lesson content
export async function generateLesson(
  topic: LessonTopic,
  session: TeacherSession
): Promise<LessonContent> {
  const curriculum = LESSON_CURRICULUM[topic];

  const lessonSchema = z.object({
    title: z.string(),
    objectives: z.array(z.string()),
    sections: z.array(z.object({
      name: z.string(),
      content: z.string(),
      duration: z.string(),
      interactiveElements: z.array(z.string()),
    })),
    quiz: z.array(z.object({
      question: z.string(),
      options: z.array(z.string()),
      correctIndex: z.number(),
      explanation: z.string(),
    })),
  });

  const paceInstructions = {
    slow: 'Use simple language, provide many examples, and break concepts into small steps.',
    normal: 'Balance explanation with examples, maintain a steady teaching pace.',
    fast: 'Be concise, focus on key concepts, assume some prior knowledge.',
  };

  const prompt = `Create an adaptive financial literacy lesson on "${curriculum.title}".

Student Profile:
- Level: ${session.userLevel}
- Preferred Pace: ${session.preferredPace}
- Financial Health Score: ${session.financialContext.healthScore}/100
- Primary Goal: ${session.financialContext.primaryGoal}
- Areas to Improve: ${session.financialContext.weakAreas.join(', ')}
- Previous Lessons Completed: ${session.lessonHistory.length}

Teaching Instructions:
${paceInstructions[session.preferredPace]}

Create a lesson with:
1. Clear learning objectives (3-4)
2. 3-4 sections with practical content
3. Interactive elements (reflection questions, calculations, scenarios)
4. 3-4 quiz questions to test understanding

Make it personal and relatable to their financial situation.
Use real-world examples and actionable advice.`;

  try {
    const lesson = await generateStructuredWithGemini({
      prompt,
      systemInstruction: `${GEMINI_SYSTEM_PROMPT}

You are Penny, an expert financial literacy teacher. Your teaching style is:
- Warm and encouraging
- Uses relatable everyday examples
- Breaks complex topics into digestible pieces
- Always connects concepts to practical application
- Celebrates small wins and progress`,
      schema: lessonSchema,
      thinkingLevel: 'high',
    });

    return lesson;
  } catch (error) {
    console.error('[RealtimeTeacher] Lesson generation error:', error);
    throw error;
  }
}

// Voice coaching response generator
export async function generateVoiceResponse(
  userInput: string,
  session: TeacherSession,
  currentLessonContext?: string
): Promise<{
  response: string;
  emotion: 'encouraging' | 'neutral' | 'celebratory' | 'concerned';
  suggestedFollowUp: string;
  shouldAskQuestion: boolean;
}> {
  const responseSchema = z.object({
    response: z.string(),
    emotion: z.enum(['encouraging', 'neutral', 'celebratory', 'concerned']),
    suggestedFollowUp: z.string(),
    shouldAskQuestion: z.boolean(),
  });

  const prompt = `You are having a voice conversation as a financial coach.

Student Context:
- Level: ${session.userLevel}
- Health Score: ${session.financialContext.healthScore}/100
- Primary Goal: ${session.financialContext.primaryGoal}
${currentLessonContext ? `\nCurrent Lesson: ${currentLessonContext}` : ''}

Student says: "${userInput}"

Generate a natural, conversational voice response.
- Keep it under 3 sentences for voice clarity
- Be warm and supportive
- If they seem confused, simplify
- If they show understanding, encourage deeper thinking`;

  try {
    const response = await generateStructuredWithGemini({
      prompt,
      systemInstruction: GEMINI_SYSTEM_PROMPT,
      schema: responseSchema,
      thinkingLevel: 'medium',
    });

    return response;
  } catch (error) {
    console.error('[RealtimeTeacher] Voice response error:', error);
    return {
      response: "I'm here to help you understand your finances better. What would you like to learn about?",
      emotion: 'encouraging',
      suggestedFollowUp: 'Would you like to start with the basics?',
      shouldAskQuestion: true,
    };
  }
}

// Live session handler for real-time audio
export class LiveTeacherSession {
  private ws: WebSocket | null = null;
  private session: TeacherSession;
  private onMessage: (text: string) => void;
  private onAudio: (audioData: ArrayBuffer) => void;
  private onError: (error: Error) => void;

  constructor(
    session: TeacherSession,
    callbacks: {
      onMessage: (text: string) => void;
      onAudio: (audioData: ArrayBuffer) => void;
      onError: (error: Error) => void;
    }
  ) {
    this.session = session;
    this.onMessage = callbacks.onMessage;
    this.onAudio = callbacks.onAudio;
    this.onError = callbacks.onError;
  }

  async connect(): Promise<void> {
    const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('Gemini API key not configured');
    }

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(`${GEMINI_LIVE_API_URL}?key=${apiKey}`);

        this.ws.onopen = () => {
          console.log('[LiveTeacher] WebSocket connected');

          // Send initial setup message
          this.sendSetupMessage();
          resolve();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        this.ws.onerror = (error) => {
          console.error('[LiveTeacher] WebSocket error:', error);
          this.onError(new Error('WebSocket connection error'));
          reject(error);
        };

        this.ws.onclose = () => {
          console.log('[LiveTeacher] WebSocket closed');
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  private sendSetupMessage(): void {
    if (!this.ws) return;

    const setupMessage = {
      setup: {
        model: 'models/gemini-3-flash-preview',
        generationConfig: {
          responseModalities: ['AUDIO', 'TEXT'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: 'Kore', // Friendly, warm voice
              },
            },
          },
        },
        systemInstruction: {
          parts: [{
            text: `${GEMINI_SYSTEM_PROMPT}

You are Penny, conducting a live voice coaching session.
Student Level: ${this.session.userLevel}
Health Score: ${this.session.financialContext.healthScore}/100
Primary Goal: ${this.session.financialContext.primaryGoal}

Guidelines for voice interaction:
- Speak naturally and conversationally
- Keep responses concise (2-3 sentences)
- Use encouraging language
- Ask follow-up questions to engage
- Adapt to the student's pace and understanding`
          }],
        },
      },
    };

    this.ws.send(JSON.stringify(setupMessage));
  }

  private handleMessage(data: string | ArrayBuffer): void {
    try {
      if (typeof data === 'string') {
        const message = JSON.parse(data);

        if (message.serverContent) {
          const content = message.serverContent;

          // Handle text response
          if (content.modelTurn?.parts) {
            for (const part of content.modelTurn.parts) {
              if (part.text) {
                this.onMessage(part.text);
              }
              if (part.inlineData?.mimeType?.startsWith('audio/')) {
                // Decode base64 audio
                const audioData = this.base64ToArrayBuffer(part.inlineData.data);
                this.onAudio(audioData);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('[LiveTeacher] Message handling error:', error);
    }
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }

  sendText(text: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.onError(new Error('WebSocket not connected'));
      return;
    }

    const message = {
      clientContent: {
        turns: [{
          role: 'user',
          parts: [{ text }],
        }],
        turnComplete: true,
      },
    };

    this.ws.send(JSON.stringify(message));
  }

  sendAudio(audioData: ArrayBuffer, mimeType: string = 'audio/pcm'): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.onError(new Error('WebSocket not connected'));
      return;
    }

    const base64Audio = this.arrayBufferToBase64(audioData);

    const message = {
      realtimeInput: {
        mediaChunks: [{
          mimeType,
          data: base64Audio,
        }],
      },
    };

    this.ws.send(JSON.stringify(message));
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

// Get recommended next lesson based on progress
export function getRecommendedLesson(session: TeacherSession): LessonTopic | null {
  const completedTopics = session.lessonHistory
    .filter(l => l.completedAt)
    .map(l => l.topic);

  // Find lessons where prerequisites are met
  for (const [topic, info] of Object.entries(LESSON_CURRICULUM)) {
    if (completedTopics.includes(topic as LessonTopic)) continue;

    const prerequisitesMet = info.prerequisites.every(prereq =>
      completedTopics.includes(prereq)
    );

    if (prerequisitesMet) {
      // Check if level is appropriate
      if (
        (session.userLevel === 'beginner' && info.level === 'beginner') ||
        (session.userLevel === 'intermediate' && ['beginner', 'intermediate'].includes(info.level)) ||
        session.userLevel === 'advanced'
      ) {
        return topic as LessonTopic;
      }
    }
  }

  return null;
}

// Assess comprehension after lesson
export async function assessComprehension(
  session: TeacherSession,
  lessonTopic: LessonTopic,
  quizResults: { questionIndex: number; correct: boolean }[]
): Promise<{
  score: number;
  passed: boolean;
  feedback: string;
  areasToReview: string[];
  nextRecommendation: LessonTopic | null;
}> {
  const assessmentSchema = z.object({
    feedback: z.string(),
    areasToReview: z.array(z.string()),
    encouragement: z.string(),
  });

  const correctCount = quizResults.filter(r => r.correct).length;
  const score = (correctCount / quizResults.length) * 100;
  const passed = score >= 70;

  const prompt = `A student just completed a quiz on "${LESSON_CURRICULUM[lessonTopic].title}".

Results:
- Score: ${score.toFixed(0)}%
- Correct: ${correctCount}/${quizResults.length}
- Passed: ${passed ? 'Yes' : 'No'}

Student Level: ${session.userLevel}
Health Score: ${session.financialContext.healthScore}/100

Provide:
1. Constructive feedback on their performance
2. Specific areas to review if they struggled
3. Encouraging words for their progress`;

  try {
    const assessment = await generateStructuredWithGemini({
      prompt,
      systemInstruction: GEMINI_SYSTEM_PROMPT,
      schema: assessmentSchema,
      thinkingLevel: 'medium',
    });

    return {
      score,
      passed,
      feedback: assessment.feedback,
      areasToReview: assessment.areasToReview,
      nextRecommendation: passed ? getRecommendedLesson({
        ...session,
        lessonHistory: [
          ...session.lessonHistory,
          {
            lessonId: `${lessonTopic}_${Date.now()}`,
            topic: lessonTopic,
            startedAt: new Date().toISOString(),
            completedAt: new Date().toISOString(),
            questionsAsked: quizResults.length,
            correctAnswers: correctCount,
            comprehensionScore: score,
          },
        ],
      }) : lessonTopic, // Retry same lesson if failed
    };
  } catch (error) {
    console.error('[RealtimeTeacher] Assessment error:', error);
    return {
      score,
      passed,
      feedback: passed
        ? 'Great job completing this lesson!'
        : 'Keep practicing - you\'re making progress!',
      areasToReview: passed ? [] : ['Review the lesson material'],
      nextRecommendation: passed ? getRecommendedLesson(session) : lessonTopic,
    };
  }
}

// Generate personalized study plan
export async function generateStudyPlan(
  session: TeacherSession,
  availableTimePerWeek: number // in minutes
): Promise<{
  weeklyPlan: { day: string; topic: LessonTopic; duration: number }[];
  estimatedCompletionWeeks: number;
  priorityAreas: string[];
}> {
  const studyPlanSchema = z.object({
    weeklySchedule: z.array(z.object({
      day: z.string(),
      topic: z.string(),
      duration: z.number(),
      rationale: z.string(),
    })),
    priorityAreas: z.array(z.string()),
    tips: z.array(z.string()),
  });

  const completedTopics = session.lessonHistory
    .filter(l => l.completedAt)
    .map(l => l.topic);

  const remainingTopics = Object.keys(LESSON_CURRICULUM).filter(
    t => !completedTopics.includes(t as LessonTopic)
  );

  const prompt = `Create a personalized financial literacy study plan.

Student Profile:
- Level: ${session.userLevel}
- Available Time: ${availableTimePerWeek} minutes per week
- Health Score: ${session.financialContext.healthScore}/100
- Primary Goal: ${session.financialContext.primaryGoal}
- Weak Areas: ${session.financialContext.weakAreas.join(', ')}

Completed Lessons: ${completedTopics.join(', ') || 'None'}
Remaining Lessons: ${remainingTopics.join(', ')}

Create a weekly schedule that:
1. Respects the time constraint
2. Prioritizes weak areas
3. Follows prerequisite order
4. Balances learning with review`;

  try {
    const plan = await generateStructuredWithGemini({
      prompt,
      systemInstruction: GEMINI_SYSTEM_PROMPT,
      schema: studyPlanSchema,
      thinkingLevel: 'high',
    });

    return {
      weeklyPlan: plan.weeklySchedule.map(s => ({
        day: s.day,
        topic: s.topic as LessonTopic,
        duration: s.duration,
      })),
      estimatedCompletionWeeks: Math.ceil(remainingTopics.length / (availableTimePerWeek / 30)),
      priorityAreas: plan.priorityAreas,
    };
  } catch (error) {
    console.error('[RealtimeTeacher] Study plan error:', error);
    throw error;
  }
}
