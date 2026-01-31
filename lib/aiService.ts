import { z } from 'zod';
import { generateWithGemini, generateStructuredWithGemini, GEMINI_SYSTEM_PROMPT } from './gemini';

const AI_TIMEOUT = 20000;

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout>;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('Request timeout')), ms);
  });
  
  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutId!);
    return result;
  } catch (err) {
    clearTimeout(timeoutId!);
    throw err;
  }
}

export interface AIGenerationParams {
  context: string;
  task: string;
  data?: Record<string, unknown>;
}

export async function generateAIText(params: AIGenerationParams): Promise<string> {
  const { context, task, data } = params;
  
  const prompt = `Context: ${context}
${data ? `Data: ${JSON.stringify(data, null, 2)}` : ''}

Task: ${task}

Respond concisely and helpfully.`;

  try {
    console.log('[AIService] Generating text with Gemini 3...');
    const result = await withTimeout(
      generateWithGemini({
        prompt,
        systemInstruction: GEMINI_SYSTEM_PROMPT,
      }),
      AI_TIMEOUT
    );
    console.log('[AIService] Text generated successfully via Gemini 3');
    return result;
  } catch (error) {
    console.log('[AIService] Gemini 3 text generation error:', error);
    throw error;
  }
}

export async function generateFinancialSummary(params: {
  snapshot: {
    disposableIncome: number;
    savingsRate: number;
    monthsOfRunway: number;
    fixedCostRatio: number;
    healthScore: number;
    healthLabel: string;
  };
  financials: {
    monthlyIncome: number;
    housingCost: number;
    carCost: number;
    essentialsCost: number;
    savings: number;
    debts: number;
  };
}): Promise<{ summary: string; reasoning: string; whatWouldChange: string[] }> {
  const schema = z.object({
    summary: z.string(),
    reasoning: z.string(),
    whatWouldChange: z.array(z.string()),
  });

  const prompt = `Analyze this financial snapshot and provide insights:

Monthly Income: $${params.financials.monthlyIncome}
Housing Cost: $${params.financials.housingCost}
Car Cost: $${params.financials.carCost}
Essentials: $${params.financials.essentialsCost}
Current Savings: $${params.financials.savings}
Debts: $${params.financials.debts}

Calculated Metrics:
- Disposable Income: $${params.snapshot.disposableIncome}/month
- Savings Rate: ${params.snapshot.savingsRate.toFixed(1)}%
- Emergency Runway: ${params.snapshot.monthsOfRunway.toFixed(1)} months
- Fixed Cost Ratio: ${params.snapshot.fixedCostRatio.toFixed(1)}%
- Health Score: ${params.snapshot.healthScore}/100 (${params.snapshot.healthLabel})

Provide:
- summary: A 1-2 sentence plain-language summary of the financial health
- reasoning: A brief explanation of how you assessed their situation
- whatWouldChange: 2-3 specific things that would improve their situation`;

  try {
    console.log('[AIService] Generating financial summary with Gemini 3...');
    const result = await withTimeout(
      generateStructuredWithGemini({
        prompt,
        systemInstruction: GEMINI_SYSTEM_PROMPT,
        schema,
      }),
      AI_TIMEOUT
    );
    console.log('[AIService] Financial summary generated via Gemini 3');
    return result;
  } catch (error) {
    console.log('[AIService] Gemini 3 financial summary error, using fallback:', error);
    return {
      summary: `Your finances show a ${params.snapshot.healthLabel.toLowerCase()} foundation with ${params.snapshot.monthsOfRunway.toFixed(1)} months of runway.`,
      reasoning: `Based on your ${params.snapshot.savingsRate.toFixed(0)}% savings rate and $${params.snapshot.disposableIncome} monthly disposable income.`,
      whatWouldChange: [
        'Increasing income or reducing expenses would improve your savings rate',
        'Building toward 3+ months of runway provides more security',
      ],
    };
  }
}

export async function generateScenarioInsights(params: {
  scenarios: {
    name: string;
    monthlyContribution: number;
    monthsToGoal: number;
    riskLevel: string;
  }[];
  currentRunway: number;
  emergencyGoal: number;
  disposableIncome: number;
}): Promise<{ recommendation: string; reasoning: string }> {
  const schema = z.object({
    recommendation: z.string(),
    reasoning: z.string(),
  });

  const prompt = `Help choose between saving scenarios:

Current Runway: ${params.currentRunway.toFixed(1)} months
Emergency Fund Goal: $${params.emergencyGoal}
Monthly Disposable: $${params.disposableIncome}

Scenarios:
${params.scenarios.map(s => `- ${s.name}: $${s.monthlyContribution}/month, ${s.monthsToGoal} months to goal, ${s.riskLevel} intensity`).join('\n')}

Provide:
- recommendation: Which scenario approach might work best for their situation and why
- reasoning: The logic behind this suggestion based on their specific numbers

Focus on sustainability, not speed.`;

  try {
    console.log('[AIService] Generating scenario insights with Gemini 3...');
    const result = await withTimeout(
      generateStructuredWithGemini({
        prompt,
        systemInstruction: GEMINI_SYSTEM_PROMPT,
        schema,
      }),
      AI_TIMEOUT
    );
    console.log('[AIService] Scenario insights generated via Gemini 3');
    return result;
  } catch (error) {
    console.log('[AIService] Gemini 3 scenario insights error, using fallback:', error);
    return {
      recommendation: 'The Balanced approach typically works well for building an emergency fund while maintaining quality of life.',
      reasoning: `With ${params.currentRunway.toFixed(1)} months of runway, a moderate approach balances urgency with sustainability.`,
    };
  }
}

export async function generateWeeklyCoaching(params: {
  healthLabel: string;
  monthsOfRunway: number;
  savingsRate: number;
  disposableIncome: number;
  emergencyProgress: number;
}): Promise<{ weeklyMessage: string; focusArea: string; encouragement: string }> {
  const schema = z.object({
    weeklyMessage: z.string(),
    focusArea: z.string(),
    encouragement: z.string(),
  });

  const prompt = `Generate a weekly coaching message:

Health Status: ${params.healthLabel}
Emergency Fund Progress: ${params.emergencyProgress.toFixed(0)}%
Runway: ${params.monthsOfRunway.toFixed(1)} months
Savings Rate: ${params.savingsRate.toFixed(0)}%
Weekly Available: $${(params.disposableIncome / 4).toFixed(0)}

Provide:
- weeklyMessage: A brief, motivating message for this week
- focusArea: The main area to focus on this week
- encouragement: A supportive note about their progress

Be warm and specific. Small wins matter.`;

  try {
    console.log('[AIService] Generating weekly coaching with Gemini 3...');
    const result = await withTimeout(
      generateStructuredWithGemini({
        prompt,
        systemInstruction: GEMINI_SYSTEM_PROMPT,
        schema,
      }),
      AI_TIMEOUT
    );
    console.log('[AIService] Weekly coaching generated via Gemini 3');
    return result;
  } catch (error) {
    console.log('[AIService] Gemini 3 weekly coaching error, using fallback:', error);
    return {
      weeklyMessage: 'Focus on consistent small steps this week.',
      focusArea: 'Building your emergency buffer',
      encouragement: 'Every dollar saved is progress toward security.',
    };
  }
}

export async function generatePurchaseAnalysis(params: {
  itemName: string;
  cost: number;
  monthsOfRunway: number;
  disposableIncome: number;
  savings: number;
  emergencyGoal: number;
}): Promise<{ 
  impact: string; 
  tradeoffs: string[]; 
  alternatives: string[];
  newRunway: number;
}> {
  const newSavings = params.savings - params.cost;
  const monthlyExpenses = params.savings / params.monthsOfRunway;
  const newRunway = monthlyExpenses > 0 ? newSavings / monthlyExpenses : 0;

  const schema = z.object({
    impact: z.string(),
    tradeoffs: z.array(z.string()),
    alternatives: z.array(z.string()),
  });

  const prompt = `Analyze this potential purchase:

Item: ${params.itemName}
Cost: $${params.cost}

Current Position:
- Savings: $${params.savings}
- Runway: ${params.monthsOfRunway.toFixed(1)} months
- After Purchase Runway: ${newRunway.toFixed(1)} months
- Emergency Goal: $${params.emergencyGoal}
- Monthly Disposable: $${params.disposableIncome}

Provide:
- impact: How this purchase affects their financial position
- tradeoffs: 2-3 tradeoffs to consider
- alternatives: 2-3 alternative approaches

Explain objectively. No judgment - just help them see the tradeoffs.`;

  try {
    console.log('[AIService] Generating purchase analysis with Gemini 3...');
    const result = await withTimeout(
      generateStructuredWithGemini({
        prompt,
        systemInstruction: GEMINI_SYSTEM_PROMPT,
        schema,
      }),
      AI_TIMEOUT
    );
    console.log('[AIService] Purchase analysis generated via Gemini 3');
    return { ...result, newRunway };
  } catch (error) {
    console.log('[AIService] Gemini 3 purchase analysis error, using fallback:', error);
    return {
      impact: `This $${params.cost} purchase would reduce your runway from ${params.monthsOfRunway.toFixed(1)} to ${newRunway.toFixed(1)} months.`,
      tradeoffs: [
        'Reduces your emergency buffer',
        'May delay reaching your savings goal',
      ],
      alternatives: [
        'Wait until you reach your emergency fund goal',
        'Save for it over a few months instead',
      ],
      newRunway,
    };
  }
}

export async function generateInvestmentReadiness(params: {
  monthsOfRunway: number;
  emergencyProgress: number;
  debtToIncomeRatio: number;
  savingsRate: number;
  healthScore: number;
}): Promise<{
  isReady: boolean;
  readinessScore: number;
  explanation: string;
  nextSteps: string[];
  educationalNote: string;
}> {
  const readinessScore = Math.min(100, Math.round(
    (params.monthsOfRunway >= 6 ? 30 : params.monthsOfRunway * 5) +
    (params.emergencyProgress >= 100 ? 30 : params.emergencyProgress * 0.3) +
    (params.debtToIncomeRatio <= 20 ? 20 : Math.max(0, 20 - params.debtToIncomeRatio * 0.5)) +
    (params.savingsRate >= 20 ? 20 : params.savingsRate)
  ));

  const isReady = readinessScore >= 70;

  const schema = z.object({
    explanation: z.string(),
    nextSteps: z.array(z.string()),
    educationalNote: z.string(),
  });

  const prompt = `Assess investment readiness (education only, NO specific investment advice):

Metrics:
- Emergency Runway: ${params.monthsOfRunway.toFixed(1)} months (goal: 6+)
- Emergency Fund Progress: ${params.emergencyProgress.toFixed(0)}% (goal: 100%)
- Debt-to-Income: ${params.debtToIncomeRatio.toFixed(0)}% (goal: <20%)
- Savings Rate: ${params.savingsRate.toFixed(0)}% (goal: 20%+)
- Readiness Score: ${readinessScore}/100

${isReady ? 'They have a solid foundation.' : 'They should focus on building foundations first.'}

Provide:
- explanation: Plain-language explanation of their investment readiness
- nextSteps: 2-4 specific steps to improve readiness
- educationalNote: A brief educational note about why foundations matter

Explain why these foundations matter BEFORE considering investments. This is education, not advice.`;

  try {
    console.log('[AIService] Generating investment readiness with Gemini 3...');
    const result = await withTimeout(
      generateStructuredWithGemini({
        prompt,
        systemInstruction: GEMINI_SYSTEM_PROMPT,
        schema,
      }),
      AI_TIMEOUT
    );
    console.log('[AIService] Investment readiness generated via Gemini 3');
    return { isReady, readinessScore, ...result };
  } catch (error) {
    console.log('[AIService] Gemini 3 investment readiness error, using fallback:', error);
    return {
      isReady,
      readinessScore,
      explanation: isReady 
        ? 'You have built a solid financial foundation with adequate emergency savings and manageable debt.'
        : 'Focus on building your emergency fund and reducing debt before considering investments.',
      nextSteps: isReady
        ? ['Continue maintaining your emergency fund', 'Learn about different investment concepts']
        : ['Build 6 months of emergency runway', 'Focus on consistent saving habits'],
      educationalNote: 'A strong financial foundation provides security that allows you to handle market volatility without being forced to sell at bad times.',
    };
  }
}

export async function analyzeProductImage(params: {
  image: string;
  monthlyDisposable: number;
  currentSavings: number;
}): Promise<{
  productName: string;
  estimatedCost: number;
  category: string;
  necessityScore: number;
  budgetImpact: 'low' | 'medium' | 'high' | 'critical';
  recommendation: string;
  reasoning: string;
  alternative?: string;
}> {
  const schema = z.object({
    productName: z.string(),
    estimatedCost: z.number(),
    category: z.string(),
    necessityScore: z.number(),
    budgetImpact: z.enum(['low', 'medium', 'high', 'critical']),
    recommendation: z.string(),
    reasoning: z.string(),
    alternative: z.string().optional(),
  });

  const prompt = `Analyze this product image for financial impact:

Context:
- Monthly Disposable Income: $${params.monthlyDisposable}
- Current Savings: $${params.currentSavings}

Identify the product, estimate its cost, and analyze if it's a wise purchase.

Provide:
- productName: Name of the product identified
- estimatedCost: Estimated cost in USD
- category: Product category (Electronics, Clothing, Home, etc.)
- necessityScore: 1-10 score of how essential this item likely is
- budgetImpact: Impact on budget (low/medium/high/critical)
- recommendation: Advice on whether to buy, wait, or avoid
- reasoning: Why this recommendation was made
- alternative: A cheaper or better alternative if applicable`;

  try {
    console.log('[AIService] Analyzing product image with Gemini 3 Vision...');
    const result = await withTimeout(
      generateStructuredWithGemini({
        prompt,
        systemInstruction: GEMINI_SYSTEM_PROMPT,
        schema,
        image: params.image,
      }),
      AI_TIMEOUT
    );
    console.log('[AIService] Image analysis generated via Gemini 3');
    return result;
  } catch (error) {
    console.log('[AIService] Gemini 3 image analysis error, using fallback:', error);
    return {
      productName: 'Identified Item',
      estimatedCost: 50,
      category: 'General',
      necessityScore: 5,
      budgetImpact: 'low',
      recommendation: 'Consider if this aligns with your current goals.',
      reasoning: 'Unable to perform visual analysis at the moment.',
    };
  }
}

export async function generateMarketContext(): Promise<{
  summary: string;
  educationalNote: string;
  sentiment: 'cautious' | 'neutral' | 'optimistic';
}> {
  const schema = z.object({
    summary: z.string(),
    educationalNote: z.string(),
    sentiment: z.enum(['cautious', 'neutral', 'optimistic']),
  });

  const prompt = `Provide educational context about current economic conditions (February 2026):

Focus on:
- General economic trends (inflation, interest rates, job market)
- What this means for emergency funds and savings
- Why personal foundations matter more than market timing

Provide:
- summary: A brief, educational summary of current economic conditions
- educationalNote: An educational note about how market conditions relate to personal finance
- sentiment: Overall market sentiment (cautious/neutral/optimistic)

This is purely educational context, not investment advice.`;

  try {
    console.log('[AIService] Generating market context with Gemini 3...');
    const result = await withTimeout(
      generateStructuredWithGemini({
        prompt,
        systemInstruction: GEMINI_SYSTEM_PROMPT,
        schema,
      }),
      AI_TIMEOUT
    );
    console.log('[AIService] Market context generated via Gemini 3');
    return result;
  } catch (error) {
    console.log('[AIService] Gemini 3 market context error, using fallback:', error);
    return {
      summary: 'Current conditions are steady. Focus on building your financial foundation.',
      educationalNote: 'Your personal financial readiness matters more than trying to time markets.',
      sentiment: 'neutral',
    };
  }
}

export async function generateCoachResponse(params: {
  userMessage: string;
  financialContext: {
    healthScore: number;
    healthLabel: string;
    monthsOfRunway: number;
    savingsRate: number;
    emergencyProgress: number;
    disposableIncome: number;
  };
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
}): Promise<string> {
  const contextSummary = `
User's Financial Snapshot:
- Health Score: ${params.financialContext.healthScore}/100 (${params.financialContext.healthLabel})
- Emergency Runway: ${params.financialContext.monthsOfRunway.toFixed(1)} months
- Savings Rate: ${params.financialContext.savingsRate.toFixed(0)}%
- Emergency Fund Progress: ${params.financialContext.emergencyProgress.toFixed(0)}%
- Monthly Disposable: $${params.financialContext.disposableIncome}`;

  const historyContext = params.conversationHistory?.length 
    ? `\nRecent conversation:\n${params.conversationHistory.slice(-4).map(m => `${m.role}: ${m.content}`).join('\n')}`
    : '';

  const prompt = `${contextSummary}
${historyContext}

User asks: ${params.userMessage}

Respond as their supportive financial coach. Be warm, specific to their numbers, and educational. Keep response under 150 words.`;

  try {
    console.log('[AIService] Generating coach response with Gemini 3...');
    const result = await withTimeout(
      generateWithGemini({
        prompt,
        systemInstruction: GEMINI_SYSTEM_PROMPT,
        temperature: 0.7,
      }),
      AI_TIMEOUT
    );
    console.log('[AIService] Coach response generated via Gemini 3');
    return result;
  } catch (error) {
    console.log('[AIService] Gemini 3 coach response error:', error);
    return "I'm here to help with your financial journey. What would you like to know about building your financial foundation?";
  }
}
