import { z } from 'zod';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateStructuredWithGemini, GEMINI_SYSTEM_PROMPT } from './gemini';

/**
 * Marathon Agent - Autonomous Financial Planning Agent
 *
 * Features:
 * - Multi-step financial analysis that runs over days/weeks
 * - Thought Signatures for maintaining reasoning context across sessions
 * - Self-correction without human supervision
 * - Persistent goal tracking and adjustment
 */

const AGENT_STORAGE_KEY = '@marathon_agent_state';
const THOUGHT_SIGNATURE_KEY = '@thought_signatures';

// Agent state schema
const AgentStateSchema = z.object({
  agentId: z.string(),
  createdAt: z.string(),
  lastRunAt: z.string(),
  currentPhase: z.enum(['analysis', 'planning', 'execution', 'review', 'adjustment']),
  goals: z.array(z.object({
    id: z.string(),
    name: z.string(),
    targetAmount: z.number(),
    currentAmount: z.number(),
    deadline: z.string(),
    priority: z.enum(['high', 'medium', 'low']),
    status: z.enum(['pending', 'in_progress', 'completed', 'adjusted']),
    milestones: z.array(z.object({
      week: z.number(),
      targetAmount: z.number(),
      achieved: z.boolean(),
      achievedAt: z.string().optional(),
    })),
  })),
  insights: z.array(z.object({
    timestamp: z.string(),
    type: z.enum(['observation', 'recommendation', 'correction', 'milestone']),
    content: z.string(),
    confidence: z.number(),
  })),
  thoughtSignature: z.string().optional(), // Encrypted reasoning context from Gemini 3
  conversationHistory: z.array(z.object({
    role: z.enum(['user', 'model']),
    content: z.string(),
    timestamp: z.string(),
  })),
  metrics: z.object({
    totalAnalysisRuns: z.number(),
    successfulPredictions: z.number(),
    corrections: z.number(),
    goalsCompleted: z.number(),
  }),
});

type AgentState = z.infer<typeof AgentStateSchema>;

// Financial context for analysis
interface FinancialContext {
  monthlyIncome: number;
  monthlyExpenses: number;
  currentSavings: number;
  debts: number;
  savingsRate: number;
  monthsOfRunway: number;
  healthScore: number;
}

// Initialize a new agent
export async function initializeMarathonAgent(
  userId: string,
  financialContext: FinancialContext
): Promise<AgentState> {
  const existingState = await getAgentState(userId);

  if (existingState) {
    console.log('[MarathonAgent] Resuming existing agent session');
    return existingState;
  }

  const newState: AgentState = {
    agentId: `agent_${userId}_${Date.now()}`,
    createdAt: new Date().toISOString(),
    lastRunAt: new Date().toISOString(),
    currentPhase: 'analysis',
    goals: [],
    insights: [],
    conversationHistory: [],
    metrics: {
      totalAnalysisRuns: 0,
      successfulPredictions: 0,
      corrections: 0,
      goalsCompleted: 0,
    },
  };

  // Run initial analysis
  const analyzedState = await runAnalysisPhase(newState, financialContext);
  await saveAgentState(userId, analyzedState);

  console.log('[MarathonAgent] New agent initialized');
  return analyzedState;
}

// Get stored agent state
async function getAgentState(userId: string): Promise<AgentState | null> {
  try {
    const stored = await AsyncStorage.getItem(`${AGENT_STORAGE_KEY}_${userId}`);
    if (stored) {
      return AgentStateSchema.parse(JSON.parse(stored));
    }
  } catch (error) {
    console.error('[MarathonAgent] Error loading state:', error);
  }
  return null;
}

// Save agent state
async function saveAgentState(userId: string, state: AgentState): Promise<void> {
  try {
    await AsyncStorage.setItem(
      `${AGENT_STORAGE_KEY}_${userId}`,
      JSON.stringify(state)
    );
  } catch (error) {
    console.error('[MarathonAgent] Error saving state:', error);
  }
}

// Analysis Phase - Understand current financial situation
async function runAnalysisPhase(
  state: AgentState,
  context: FinancialContext
): Promise<AgentState> {
  console.log('[MarathonAgent] Running analysis phase...');

  const analysisSchema = z.object({
    observations: z.array(z.object({
      category: z.string(),
      finding: z.string(),
      impact: z.enum(['positive', 'neutral', 'negative']),
      confidence: z.number(),
    })),
    riskFactors: z.array(z.string()),
    opportunities: z.array(z.string()),
    recommendedGoals: z.array(z.object({
      name: z.string(),
      targetAmount: z.number(),
      timeframeMonths: z.number(),
      priority: z.enum(['high', 'medium', 'low']),
      rationale: z.string(),
    })),
    thoughtSummary: z.string(), // This acts as our thought signature
  });

  const previousContext = state.thoughtSignature
    ? `\nPrevious Analysis Context: ${state.thoughtSignature}`
    : '';

  const prompt = `You are an autonomous financial planning agent conducting a comprehensive analysis.
${previousContext}

Current Financial Snapshot:
- Monthly Income: $${context.monthlyIncome}
- Monthly Expenses: $${context.monthlyExpenses}
- Current Savings: $${context.currentSavings}
- Total Debts: $${context.debts}
- Savings Rate: ${context.savingsRate.toFixed(1)}%
- Emergency Runway: ${context.monthsOfRunway.toFixed(1)} months
- Health Score: ${context.healthScore}/100

Previous Insights Count: ${state.insights.length}
Goals in Progress: ${state.goals.filter(g => g.status === 'in_progress').length}

Analyze this financial situation deeply. Consider:
1. Income stability and growth potential
2. Expense optimization opportunities
3. Debt management priorities
4. Emergency fund adequacy
5. Long-term wealth building readiness

Provide structured analysis with specific, actionable observations.
Include a thoughtSummary that captures your key reasoning for future sessions.`;

  try {
    const analysis = await generateStructuredWithGemini({
      prompt,
      systemInstruction: GEMINI_SYSTEM_PROMPT,
      schema: analysisSchema,
      thinkingLevel: 'high',
    });

    // Update state with analysis results
    const newInsights = analysis.observations.map(obs => ({
      timestamp: new Date().toISOString(),
      type: 'observation' as const,
      content: `[${obs.category}] ${obs.finding}`,
      confidence: obs.confidence,
    }));

    // Convert recommended goals to goal structure
    const newGoals = analysis.recommendedGoals.map((goal, index) => ({
      id: `goal_${Date.now()}_${index}`,
      name: goal.name,
      targetAmount: goal.targetAmount,
      currentAmount: 0,
      deadline: new Date(Date.now() + goal.timeframeMonths * 30 * 24 * 60 * 60 * 1000).toISOString(),
      priority: goal.priority,
      status: 'pending' as const,
      milestones: generateMilestones(goal.targetAmount, goal.timeframeMonths),
    }));

    return {
      ...state,
      currentPhase: 'planning',
      lastRunAt: new Date().toISOString(),
      goals: [...state.goals, ...newGoals],
      insights: [...state.insights, ...newInsights],
      thoughtSignature: analysis.thoughtSummary,
      metrics: {
        ...state.metrics,
        totalAnalysisRuns: state.metrics.totalAnalysisRuns + 1,
      },
    };
  } catch (error) {
    console.error('[MarathonAgent] Analysis phase error:', error);
    return state;
  }
}

// Generate weekly milestones for a goal
function generateMilestones(targetAmount: number, months: number): AgentState['goals'][0]['milestones'] {
  const weeks = months * 4;
  const weeklyTarget = targetAmount / weeks;

  return Array.from({ length: weeks }, (_, i) => ({
    week: i + 1,
    targetAmount: Math.round(weeklyTarget * (i + 1)),
    achieved: false,
  }));
}

// Planning Phase - Create actionable plan
export async function runPlanningPhase(
  userId: string,
  context: FinancialContext
): Promise<AgentState> {
  const state = await getAgentState(userId);
  if (!state) throw new Error('Agent not initialized');

  console.log('[MarathonAgent] Running planning phase...');

  const planningSchema = z.object({
    weeklyActions: z.array(z.object({
      week: z.number(),
      actions: z.array(z.string()),
      savingsTarget: z.number(),
      focusArea: z.string(),
    })),
    contingencyPlans: z.array(z.object({
      trigger: z.string(),
      response: z.string(),
    })),
    successMetrics: z.array(z.string()),
    thoughtSummary: z.string(),
  });

  const activeGoals = state.goals.filter(g => g.status === 'pending' || g.status === 'in_progress');

  const prompt = `You are an autonomous financial planning agent creating an execution plan.

Previous Context: ${state.thoughtSignature || 'New session'}

Active Goals:
${activeGoals.map(g => `- ${g.name}: $${g.targetAmount} by ${new Date(g.deadline).toLocaleDateString()} (${g.priority} priority)`).join('\n')}

Monthly Disposable Income: $${context.monthlyIncome - context.monthlyExpenses}
Current Savings: $${context.currentSavings}

Create a detailed weekly action plan for the next 4 weeks.
Include contingency plans for common obstacles.
Be specific and actionable.`;

  try {
    const plan = await generateStructuredWithGemini({
      prompt,
      systemInstruction: GEMINI_SYSTEM_PROMPT,
      schema: planningSchema,
      thinkingLevel: 'high',
    });

    const planInsight = {
      timestamp: new Date().toISOString(),
      type: 'recommendation' as const,
      content: `Weekly plan created with ${plan.weeklyActions.length} weeks of actions`,
      confidence: 0.85,
    };

    const updatedState: AgentState = {
      ...state,
      currentPhase: 'execution',
      lastRunAt: new Date().toISOString(),
      insights: [...state.insights, planInsight],
      thoughtSignature: plan.thoughtSummary,
      goals: state.goals.map(g =>
        activeGoals.find(ag => ag.id === g.id)
          ? { ...g, status: 'in_progress' as const }
          : g
      ),
    };

    await saveAgentState(userId, updatedState);
    return updatedState;
  } catch (error) {
    console.error('[MarathonAgent] Planning phase error:', error);
    return state;
  }
}

// Review Phase - Check progress and self-correct
export async function runReviewPhase(
  userId: string,
  context: FinancialContext,
  actualProgress: { goalId: string; currentAmount: number }[]
): Promise<AgentState> {
  const state = await getAgentState(userId);
  if (!state) throw new Error('Agent not initialized');

  console.log('[MarathonAgent] Running review phase with self-correction...');

  const reviewSchema = z.object({
    progressAssessment: z.object({
      onTrack: z.boolean(),
      percentageComplete: z.number(),
      trend: z.enum(['improving', 'stable', 'declining']),
    }),
    corrections: z.array(z.object({
      goalId: z.string(),
      issue: z.string(),
      correction: z.string(),
      newTargetAmount: z.number().optional(),
      newDeadline: z.string().optional(),
    })),
    encouragement: z.string(),
    nextActions: z.array(z.string()),
    thoughtSummary: z.string(),
  });

  // Update goals with actual progress
  const updatedGoals = state.goals.map(goal => {
    const progress = actualProgress.find(p => p.goalId === goal.id);
    if (progress) {
      return { ...goal, currentAmount: progress.currentAmount };
    }
    return goal;
  });

  const prompt = `You are an autonomous financial planning agent conducting a self-review.

Previous Context: ${state.thoughtSignature || 'No previous context'}

Goals Progress:
${updatedGoals.map(g => {
  const percentComplete = g.targetAmount > 0 ? (g.currentAmount / g.targetAmount * 100).toFixed(1) : 0;
  return `- ${g.name}: $${g.currentAmount}/$${g.targetAmount} (${percentComplete}%) - ${g.status}`;
}).join('\n')}

Current Financial State:
- Savings Rate: ${context.savingsRate.toFixed(1)}%
- Monthly Disposable: $${context.monthlyIncome - context.monthlyExpenses}

Total Analysis Runs: ${state.metrics.totalAnalysisRuns}
Previous Corrections: ${state.metrics.corrections}

Assess progress honestly. If goals are unrealistic or circumstances have changed:
1. Identify the specific issue
2. Propose a concrete correction
3. Adjust targets if needed

Be encouraging but realistic. Self-correct proactively.`;

  try {
    const review = await generateStructuredWithGemini({
      prompt,
      systemInstruction: GEMINI_SYSTEM_PROMPT,
      schema: reviewSchema,
      thinkingLevel: 'high',
    });

    // Apply corrections
    let correctedGoals = updatedGoals;
    for (const correction of review.corrections) {
      correctedGoals = correctedGoals.map(g => {
        if (g.id === correction.goalId) {
          return {
            ...g,
            status: 'adjusted' as const,
            targetAmount: correction.newTargetAmount || g.targetAmount,
            deadline: correction.newDeadline || g.deadline,
          };
        }
        return g;
      });
    }

    const reviewInsights = [
      {
        timestamp: new Date().toISOString(),
        type: 'observation' as const,
        content: `Progress: ${review.progressAssessment.percentageComplete.toFixed(0)}% complete, trend: ${review.progressAssessment.trend}`,
        confidence: 0.9,
      },
      ...review.corrections.map(c => ({
        timestamp: new Date().toISOString(),
        type: 'correction' as const,
        content: `[${c.goalId}] ${c.issue} -> ${c.correction}`,
        confidence: 0.85,
      })),
    ];

    const updatedState: AgentState = {
      ...state,
      currentPhase: review.progressAssessment.onTrack ? 'execution' : 'adjustment',
      lastRunAt: new Date().toISOString(),
      goals: correctedGoals,
      insights: [...state.insights, ...reviewInsights],
      thoughtSignature: review.thoughtSummary,
      metrics: {
        ...state.metrics,
        corrections: state.metrics.corrections + review.corrections.length,
      },
    };

    await saveAgentState(userId, updatedState);
    return updatedState;
  } catch (error) {
    console.error('[MarathonAgent] Review phase error:', error);
    return state;
  }
}

// Get agent status and insights
export async function getAgentStatus(userId: string): Promise<{
  isActive: boolean;
  currentPhase: string;
  goals: AgentState['goals'];
  recentInsights: AgentState['insights'];
  metrics: AgentState['metrics'];
  daysSinceLastRun: number;
} | null> {
  const state = await getAgentState(userId);
  if (!state) return null;

  const daysSinceLastRun = Math.floor(
    (Date.now() - new Date(state.lastRunAt).getTime()) / (1000 * 60 * 60 * 24)
  );

  return {
    isActive: true,
    currentPhase: state.currentPhase,
    goals: state.goals,
    recentInsights: state.insights.slice(-5),
    metrics: state.metrics,
    daysSinceLastRun,
  };
}

// Run autonomous check (called periodically)
export async function runAutonomousCheck(
  userId: string,
  context: FinancialContext
): Promise<{ action: string; message: string }> {
  const state = await getAgentState(userId);
  if (!state) {
    return { action: 'initialize', message: 'Agent not initialized' };
  }

  const daysSinceLastRun = Math.floor(
    (Date.now() - new Date(state.lastRunAt).getTime()) / (1000 * 60 * 60 * 24)
  );

  // Auto-trigger review if it's been more than 7 days
  if (daysSinceLastRun >= 7) {
    console.log('[MarathonAgent] Auto-triggering weekly review...');
    await runReviewPhase(userId, context, []);
    return {
      action: 'review_completed',
      message: 'Weekly review completed automatically'
    };
  }

  // Check for milestone dates
  const today = new Date();
  for (const goal of state.goals) {
    for (const milestone of goal.milestones) {
      if (!milestone.achieved) {
        const weekStart = new Date(state.createdAt);
        weekStart.setDate(weekStart.getDate() + (milestone.week - 1) * 7);

        if (today >= weekStart) {
          return {
            action: 'milestone_check',
            message: `Time to check progress on "${goal.name}" - Week ${milestone.week} milestone`,
          };
        }
      }
    }
  }

  return { action: 'none', message: 'All systems nominal' };
}

// Export agent state for backup/sync
export async function exportAgentState(userId: string): Promise<string | null> {
  const state = await getAgentState(userId);
  return state ? JSON.stringify(state, null, 2) : null;
}

// Import agent state from backup
export async function importAgentState(userId: string, stateJson: string): Promise<boolean> {
  try {
    const state = AgentStateSchema.parse(JSON.parse(stateJson));
    await saveAgentState(userId, state);
    return true;
  } catch (error) {
    console.error('[MarathonAgent] Import failed:', error);
    return false;
  }
}
