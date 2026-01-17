import { generateText, generateObject } from '@rork-ai/toolkit-sdk';
import { z } from 'zod';

const AI_TIMEOUT = 15000;

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

const SYSTEM_CONTEXT = `You are a calm, supportive financial coach powered by Google Deepmind. 
You explain money concepts in plain language without jargon. 
You NEVER give investment advice, recommend specific assets, or tell users what to buy/sell.
You focus on education, awareness, and helping users understand their financial foundations.
Keep responses concise, warm, and actionable. Use simple language.`;

export interface AIGenerationParams {
  context: string;
  task: string;
  data?: Record<string, unknown>;
}

export async function generateAIText(params: AIGenerationParams): Promise<string> {
  const { context, task, data } = params;
  
  const prompt = `${SYSTEM_CONTEXT}

Context: ${context}
${data ? `Data: ${JSON.stringify(data, null, 2)}` : ''}

Task: ${task}

Respond concisely and helpfully.`;

  try {
    console.log('[AIService] Generating text...');
    const result = await withTimeout(
      generateText({ messages: [{ role: 'user', content: prompt }] }),
      AI_TIMEOUT
    );
    console.log('[AIService] Text generated successfully');
    return result;
  } catch (error) {
    console.log('[AIService] Text generation unavailable, using fallback');
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
    summary: z.string().describe('A 1-2 sentence plain-language summary of the financial health'),
    reasoning: z.string().describe('A brief explanation of how you assessed their situation'),
    whatWouldChange: z.array(z.string()).describe('2-3 specific things that would improve their situation'),
  });

  const prompt = `${SYSTEM_CONTEXT}

Analyze this financial snapshot and provide insights:

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

Generate a supportive, educational analysis. Be specific to their numbers.`;

  try {
    console.log('[AIService] Generating financial summary...');
    const result = await withTimeout(
      generateObject({
        messages: [{ role: 'user', content: prompt }],
        schema,
      }),
      AI_TIMEOUT
    );
    console.log('[AIService] Financial summary generated');
    return result;
  } catch {
    console.log('[AIService] Financial summary unavailable, using fallback');
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
    recommendation: z.string().describe('Which scenario approach might work best for their situation and why'),
    reasoning: z.string().describe('The logic behind this suggestion based on their specific numbers'),
  });

  const prompt = `${SYSTEM_CONTEXT}

Help choose between saving scenarios:

Current Runway: ${params.currentRunway.toFixed(1)} months
Emergency Fund Goal: $${params.emergencyGoal}
Monthly Disposable: $${params.disposableIncome}

Scenarios:
${params.scenarios.map(s => `- ${s.name}: $${s.monthlyContribution}/month, ${s.monthsToGoal} months to goal, ${s.riskLevel} intensity`).join('\n')}

Suggest which approach might fit their situation. Focus on sustainability, not speed.`;

  try {
    console.log('[AIService] Generating scenario insights...');
    const result = await withTimeout(
      generateObject({
        messages: [{ role: 'user', content: prompt }],
        schema,
      }),
      AI_TIMEOUT
    );
    console.log('[AIService] Scenario insights generated');
    return result;
  } catch {
    console.log('[AIService] Scenario insights unavailable, using fallback');
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
    weeklyMessage: z.string().describe('A brief, motivating message for this week'),
    focusArea: z.string().describe('The main area to focus on this week'),
    encouragement: z.string().describe('A supportive note about their progress'),
  });

  const prompt = `${SYSTEM_CONTEXT}

Generate a weekly coaching message:

Health Status: ${params.healthLabel}
Emergency Fund Progress: ${params.emergencyProgress.toFixed(0)}%
Runway: ${params.monthsOfRunway.toFixed(1)} months
Savings Rate: ${params.savingsRate.toFixed(0)}%
Weekly Available: $${(params.disposableIncome / 4).toFixed(0)}

Be warm and specific. Small wins matter.`;

  try {
    console.log('[AIService] Generating weekly coaching...');
    const result = await withTimeout(
      generateObject({
        messages: [{ role: 'user', content: prompt }],
        schema,
      }),
      AI_TIMEOUT
    );
    console.log('[AIService] Weekly coaching generated');
    return result;
  } catch {
    console.log('[AIService] Weekly coaching unavailable, using fallback');
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
    impact: z.string().describe('How this purchase affects their financial position'),
    tradeoffs: z.array(z.string()).describe('2-3 tradeoffs to consider'),
    alternatives: z.array(z.string()).describe('2-3 alternative approaches'),
  });

  const prompt = `${SYSTEM_CONTEXT}

Analyze this potential purchase:

Item: ${params.itemName}
Cost: $${params.cost}

Current Position:
- Savings: $${params.savings}
- Runway: ${params.monthsOfRunway.toFixed(1)} months
- After Purchase Runway: ${newRunway.toFixed(1)} months
- Emergency Goal: $${params.emergencyGoal}
- Monthly Disposable: $${params.disposableIncome}

Explain the impact objectively. No judgment - just help them see the tradeoffs.`;

  try {
    console.log('[AIService] Generating purchase analysis...');
    const result = await withTimeout(
      generateObject({
        messages: [{ role: 'user', content: prompt }],
        schema,
      }),
      AI_TIMEOUT
    );
    console.log('[AIService] Purchase analysis generated');
    return { ...result, newRunway };
  } catch {
    console.log('[AIService] Purchase analysis unavailable, using fallback');
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
    explanation: z.string().describe('Plain-language explanation of their investment readiness'),
    nextSteps: z.array(z.string()).describe('2-4 specific steps to improve readiness'),
    educationalNote: z.string().describe('A brief educational note about why foundations matter'),
  });

  const prompt = `${SYSTEM_CONTEXT}

Assess investment readiness (education only, NO specific investment advice):

Metrics:
- Emergency Runway: ${params.monthsOfRunway.toFixed(1)} months (goal: 6+)
- Emergency Fund Progress: ${params.emergencyProgress.toFixed(0)}% (goal: 100%)
- Debt-to-Income: ${params.debtToIncomeRatio.toFixed(0)}% (goal: <20%)
- Savings Rate: ${params.savingsRate.toFixed(0)}% (goal: 20%+)
- Readiness Score: ${readinessScore}/100

${isReady ? 'They have a solid foundation.' : 'They should focus on building foundations first.'}

Explain why these foundations matter BEFORE considering investments. This is education, not advice.`;

  try {
    console.log('[AIService] Generating investment readiness...');
    const result = await withTimeout(
      generateObject({
        messages: [{ role: 'user', content: prompt }],
        schema,
      }),
      AI_TIMEOUT
    );
    console.log('[AIService] Investment readiness generated');
    return { isReady, readinessScore, ...result };
  } catch {
    console.log('[AIService] Investment readiness unavailable, using fallback');
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

const marketContextFallback = {
  summary: 'Current conditions are steady. Focus on building your financial foundation.',
  educationalNote: 'Your personal financial readiness matters more than trying to time markets.',
  sentiment: 'neutral' as const,
};

export async function generateMarketContext(): Promise<{
  summary: string;
  educationalNote: string;
  sentiment: 'cautious' | 'neutral' | 'optimistic';
}> {
  const schema = z.object({
    summary: z.string().describe('A brief, educational summary of current economic conditions'),
    educationalNote: z.string().describe('An educational note about how market conditions relate to personal finance'),
    sentiment: z.enum(['cautious', 'neutral', 'optimistic']).describe('Overall market sentiment'),
  });

  const prompt = `${SYSTEM_CONTEXT}

Provide educational context about current economic conditions (January 2025):

Focus on:
- General economic trends (inflation, interest rates, job market)
- What this means for emergency funds and savings
- Why personal foundations matter more than market timing

This is purely educational context, not investment advice. Help users understand the environment they're saving in.`;

  try {
    console.log('[AIService] Generating market context...');
    const result = await withTimeout(
      generateObject({
        messages: [{ role: 'user', content: prompt }],
        schema,
      }),
      AI_TIMEOUT
    );
    console.log('[AIService] Market context generated successfully');
    return result;
  } catch (error) {
    console.log('[AIService] Market context unavailable, using fallback:', error instanceof Error ? error.message : 'Unknown error');
    return marketContextFallback;
  }
}
