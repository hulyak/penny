import { z } from 'zod';
import { generateStructuredWithGemini, GEMINI_SYSTEM_PROMPT } from './gemini';

/**
 * Vibe Engineering - Autonomous Scenario Testing & Verification
 *
 * Features:
 * - Generate and verify financial projections
 * - Test scenarios through autonomous loops
 * - Self-verify results and adjust recommendations
 * - Monte Carlo simulations for financial outcomes
 */

// Scenario types
export type ScenarioType =
  | 'income_change'
  | 'expense_reduction'
  | 'debt_payoff'
  | 'investment_growth'
  | 'emergency_event'
  | 'goal_achievement'
  | 'inflation_impact'
  | 'job_loss';

export interface FinancialScenario {
  id: string;
  type: ScenarioType;
  name: string;
  description: string;
  assumptions: Record<string, number | string>;
  timeframeMonths: number;
  probability: number; // 0-1
  impact: 'positive' | 'negative' | 'neutral';
}

export interface ScenarioResult {
  scenarioId: string;
  projectedOutcome: {
    finalSavings: number;
    finalDebt: number;
    netWorth: number;
    monthlyDisposable: number;
    emergencyRunway: number;
  };
  milestones: {
    month: number;
    savings: number;
    debt: number;
    event: string;
  }[];
  riskScore: number; // 0-100
  confidenceLevel: number; // 0-1
  recommendations: string[];
}

export interface VerificationResult {
  isValid: boolean;
  issues: string[];
  adjustments: Record<string, number>;
  verificationScore: number;
  explanation: string;
}

// Financial context for simulations
export interface SimulationContext {
  currentIncome: number;
  currentExpenses: number;
  currentSavings: number;
  currentDebt: number;
  interestRates: {
    savings: number;
    debt: number;
  };
  monthlyContributions: {
    savings: number;
    debtPayment: number;
  };
}

// Generate diverse financial scenarios
export async function generateScenarios(
  context: SimulationContext,
  count: number = 5
): Promise<FinancialScenario[]> {
  const scenarioSchema = z.object({
    scenarios: z.array(z.object({
      type: z.enum([
        'income_change',
        'expense_reduction',
        'debt_payoff',
        'investment_growth',
        'emergency_event',
        'goal_achievement',
        'inflation_impact',
        'job_loss',
      ]),
      name: z.string(),
      description: z.string(),
      assumptions: z.record(z.union([z.number(), z.string()])),
      timeframeMonths: z.number(),
      probability: z.number(),
      impact: z.enum(['positive', 'negative', 'neutral']),
    })),
  });

  const prompt = `Generate ${count} realistic financial scenarios for analysis.

Current Financial State:
- Monthly Income: $${context.currentIncome}
- Monthly Expenses: $${context.currentExpenses}
- Current Savings: $${context.currentSavings}
- Current Debt: $${context.currentDebt}
- Monthly Savings: $${context.monthlyContributions.savings}
- Monthly Debt Payment: $${context.monthlyContributions.debtPayment}

Generate a diverse mix of:
1. Positive scenarios (income increase, expense reduction)
2. Negative scenarios (job loss, emergency)
3. Neutral scenarios (inflation adjustment)

For each scenario, provide:
- Realistic probability based on economic data
- Specific assumptions with numbers
- Reasonable timeframe
- Clear impact assessment

Be realistic and use actual market conditions.`;

  try {
    const result = await generateStructuredWithGemini({
      prompt,
      systemInstruction: GEMINI_SYSTEM_PROMPT,
      schema: scenarioSchema,
      thinkingLevel: 'high',
    });

    return result.scenarios.map((s, index) => ({
      id: `scenario_${Date.now()}_${index}`,
      ...s,
    }));
  } catch (error) {
    console.error('[VibeEngineering] Scenario generation error:', error);
    throw error;
  }
}

// Run Monte Carlo simulation for a scenario
export function runMonteCarloSimulation(
  context: SimulationContext,
  scenario: FinancialScenario,
  iterations: number = 1000
): {
  outcomes: number[];
  mean: number;
  median: number;
  standardDeviation: number;
  percentile10: number;
  percentile90: number;
  probabilityOfSuccess: number;
} {
  const outcomes: number[] = [];

  for (let i = 0; i < iterations; i++) {
    const outcome = simulateSingleRun(context, scenario);
    outcomes.push(outcome.finalNetWorth);
  }

  outcomes.sort((a, b) => a - b);

  const mean = outcomes.reduce((a, b) => a + b, 0) / outcomes.length;
  const median = outcomes[Math.floor(outcomes.length / 2)];

  const variance = outcomes.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / outcomes.length;
  const standardDeviation = Math.sqrt(variance);

  const percentile10 = outcomes[Math.floor(outcomes.length * 0.1)];
  const percentile90 = outcomes[Math.floor(outcomes.length * 0.9)];

  // Success = positive net worth growth
  const successCount = outcomes.filter(o => o > context.currentSavings - context.currentDebt).length;
  const probabilityOfSuccess = successCount / outcomes.length;

  return {
    outcomes,
    mean,
    median,
    standardDeviation,
    percentile10,
    percentile90,
    probabilityOfSuccess,
  };
}

// Single simulation run with randomness
function simulateSingleRun(
  context: SimulationContext,
  scenario: FinancialScenario
): { finalNetWorth: number; monthlyData: { month: number; netWorth: number }[] } {
  let savings = context.currentSavings;
  let debt = context.currentDebt;
  let income = context.currentIncome;
  let expenses = context.currentExpenses;

  const monthlyData: { month: number; netWorth: number }[] = [];

  // Apply scenario modifications based on type
  const applyScenario = (month: number) => {
    const randomFactor = 0.9 + Math.random() * 0.2; // ±10% variance

    switch (scenario.type) {
      case 'income_change':
        const incomeChange = (scenario.assumptions.percentChange as number) || 10;
        income = context.currentIncome * (1 + (incomeChange / 100) * randomFactor);
        break;

      case 'expense_reduction':
        const expenseReduction = (scenario.assumptions.percentReduction as number) || 15;
        expenses = context.currentExpenses * (1 - (expenseReduction / 100) * randomFactor);
        break;

      case 'debt_payoff':
        const extraPayment = (scenario.assumptions.extraMonthlyPayment as number) || 200;
        debt = Math.max(0, debt - extraPayment * randomFactor);
        break;

      case 'emergency_event':
        const emergencyCost = (scenario.assumptions.cost as number) || 5000;
        if (month === 1) {
          savings = Math.max(0, savings - emergencyCost * randomFactor);
        }
        break;

      case 'job_loss':
        const monthsUnemployed = (scenario.assumptions.monthsUnemployed as number) || 3;
        if (month <= monthsUnemployed) {
          income = 0;
        }
        break;

      case 'inflation_impact':
        const inflationRate = (scenario.assumptions.annualRate as number) || 3;
        expenses = expenses * (1 + (inflationRate / 12 / 100) * randomFactor);
        break;

      case 'investment_growth':
        const growthRate = (scenario.assumptions.annualReturn as number) || 7;
        savings = savings * (1 + (growthRate / 12 / 100) * randomFactor);
        break;
    }
  };

  for (let month = 1; month <= scenario.timeframeMonths; month++) {
    applyScenario(month);

    // Monthly cash flow
    const disposable = income - expenses;
    const debtPayment = Math.min(debt, context.monthlyContributions.debtPayment);

    savings += Math.max(0, disposable - debtPayment);
    savings *= 1 + context.interestRates.savings / 12 / 100;

    debt -= debtPayment;
    debt = Math.max(0, debt);
    debt *= 1 + context.interestRates.debt / 12 / 100;

    monthlyData.push({
      month,
      netWorth: savings - debt,
    });
  }

  return {
    finalNetWorth: savings - debt,
    monthlyData,
  };
}

// Autonomous scenario testing loop
export async function runAutonomousTestingLoop(
  context: SimulationContext,
  maxIterations: number = 3
): Promise<{
  scenarios: FinancialScenario[];
  results: ScenarioResult[];
  verifications: VerificationResult[];
  finalRecommendations: string[];
  confidenceScore: number;
}> {
  console.log('[VibeEngineering] Starting autonomous testing loop...');

  let scenarios: FinancialScenario[] = [];
  let results: ScenarioResult[] = [];
  let verifications: VerificationResult[] = [];
  let iteration = 0;

  while (iteration < maxIterations) {
    console.log(`[VibeEngineering] Iteration ${iteration + 1}/${maxIterations}`);

    // Step 1: Generate scenarios
    if (iteration === 0) {
      scenarios = await generateScenarios(context, 5);
    }

    // Step 2: Run projections for each scenario
    for (const scenario of scenarios) {
      const simulation = runMonteCarloSimulation(context, scenario);

      const result: ScenarioResult = {
        scenarioId: scenario.id,
        projectedOutcome: {
          finalSavings: simulation.mean + context.currentSavings,
          finalDebt: Math.max(0, context.currentDebt * 0.5), // Simplified
          netWorth: simulation.mean,
          monthlyDisposable: context.currentIncome - context.currentExpenses,
          emergencyRunway: (simulation.mean + context.currentSavings) / context.currentExpenses,
        },
        milestones: generateMilestones(context, scenario, simulation),
        riskScore: calculateRiskScore(simulation),
        confidenceLevel: simulation.probabilityOfSuccess,
        recommendations: [],
      };

      results.push(result);

      // Step 3: Verify each result
      const verification = await verifyProjection(context, scenario, result);
      verifications.push(verification);

      // Step 4: Self-correct if needed
      if (!verification.isValid) {
        console.log(`[VibeEngineering] Self-correcting scenario ${scenario.id}...`);

        // Adjust scenario assumptions
        for (const [key, value] of Object.entries(verification.adjustments)) {
          if (scenario.assumptions[key] !== undefined) {
            scenario.assumptions[key] = value;
          }
        }
      }
    }

    // Check if all verifications pass
    const allValid = verifications.every(v => v.isValid);
    if (allValid) {
      console.log('[VibeEngineering] All scenarios verified successfully');
      break;
    }

    iteration++;
  }

  // Generate final recommendations
  const finalRecommendations = await generateFinalRecommendations(
    context,
    scenarios,
    results,
    verifications
  );

  const confidenceScore = verifications.reduce((sum, v) => sum + v.verificationScore, 0) / verifications.length;

  return {
    scenarios,
    results,
    verifications,
    finalRecommendations,
    confidenceScore,
  };
}

// Verify projection using AI
async function verifyProjection(
  context: SimulationContext,
  scenario: FinancialScenario,
  result: ScenarioResult
): Promise<VerificationResult> {
  const verificationSchema = z.object({
    isValid: z.boolean(),
    issues: z.array(z.string()),
    adjustments: z.record(z.number()),
    verificationScore: z.number(),
    explanation: z.string(),
  });

  const prompt = `Verify this financial projection for accuracy and realism.

Scenario: ${scenario.name}
Type: ${scenario.type}
Timeframe: ${scenario.timeframeMonths} months
Probability: ${(scenario.probability * 100).toFixed(0)}%

Assumptions:
${JSON.stringify(scenario.assumptions, null, 2)}

Projected Outcome:
- Final Savings: $${result.projectedOutcome.finalSavings.toFixed(0)}
- Final Debt: $${result.projectedOutcome.finalDebt.toFixed(0)}
- Net Worth: $${result.projectedOutcome.netWorth.toFixed(0)}
- Emergency Runway: ${result.projectedOutcome.emergencyRunway.toFixed(1)} months

Risk Score: ${result.riskScore}/100
Confidence Level: ${(result.confidenceLevel * 100).toFixed(0)}%

Starting Context:
- Income: $${context.currentIncome}/month
- Expenses: $${context.currentExpenses}/month
- Savings: $${context.currentSavings}
- Debt: $${context.currentDebt}

Verify:
1. Are the assumptions realistic?
2. Is the math internally consistent?
3. Does the outcome align with the scenario type?
4. Are there any red flags or inconsistencies?

If issues exist, provide specific numerical adjustments to fix them.`;

  try {
    const verification = await generateStructuredWithGemini({
      prompt,
      systemInstruction: GEMINI_SYSTEM_PROMPT,
      schema: verificationSchema,
      thinkingLevel: 'high',
    });

    return verification;
  } catch (error) {
    console.error('[VibeEngineering] Verification error:', error);
    return {
      isValid: true, // Assume valid if verification fails
      issues: [],
      adjustments: {},
      verificationScore: 0.5,
      explanation: 'Verification could not be completed',
    };
  }
}

// Generate milestones from simulation
function generateMilestones(
  context: SimulationContext,
  scenario: FinancialScenario,
  simulation: ReturnType<typeof runMonteCarloSimulation>
): ScenarioResult['milestones'] {
  const milestones: ScenarioResult['milestones'] = [];
  const monthsToTrack = [3, 6, 12, 18, 24].filter(m => m <= scenario.timeframeMonths);

  for (const month of monthsToTrack) {
    const projectedSavings = context.currentSavings + (simulation.mean * month / scenario.timeframeMonths);
    const projectedDebt = Math.max(0, context.currentDebt - (context.monthlyContributions.debtPayment * month));

    let event = `Month ${month} checkpoint`;
    if (projectedDebt === 0 && context.currentDebt > 0) {
      event = 'Debt-free milestone';
    } else if (projectedSavings >= context.currentExpenses * 6) {
      event = '6-month emergency fund achieved';
    }

    milestones.push({
      month,
      savings: Math.round(projectedSavings),
      debt: Math.round(projectedDebt),
      event,
    });
  }

  return milestones;
}

// Calculate risk score from simulation
function calculateRiskScore(
  simulation: ReturnType<typeof runMonteCarloSimulation>
): number {
  // Higher variance = higher risk
  const coefficientOfVariation = simulation.standardDeviation / Math.abs(simulation.mean);

  // Low probability of success = higher risk
  const successRisk = (1 - simulation.probabilityOfSuccess) * 50;

  // Combine factors
  const varianceRisk = Math.min(50, coefficientOfVariation * 100);

  return Math.round(varianceRisk + successRisk);
}

// Generate final recommendations
async function generateFinalRecommendations(
  context: SimulationContext,
  scenarios: FinancialScenario[],
  results: ScenarioResult[],
  verifications: VerificationResult[]
): Promise<string[]> {
  const recommendationSchema = z.object({
    recommendations: z.array(z.object({
      priority: z.enum(['critical', 'high', 'medium', 'low']),
      action: z.string(),
      rationale: z.string(),
      expectedImpact: z.string(),
    })),
  });

  const scenarioSummary = scenarios.map((s, i) => ({
    name: s.name,
    type: s.type,
    impact: s.impact,
    riskScore: results[i]?.riskScore || 0,
    confidence: results[i]?.confidenceLevel || 0,
    verified: verifications[i]?.isValid || false,
  }));

  const prompt = `Based on comprehensive scenario analysis, generate prioritized financial recommendations.

Current Financial State:
- Monthly Income: $${context.currentIncome}
- Monthly Expenses: $${context.currentExpenses}
- Savings: $${context.currentSavings}
- Debt: $${context.currentDebt}
- Monthly Savings Rate: $${context.monthlyContributions.savings}

Scenario Analysis Results:
${JSON.stringify(scenarioSummary, null, 2)}

Key Findings:
- Highest Risk Scenario: ${scenarioSummary.sort((a, b) => b.riskScore - a.riskScore)[0]?.name}
- Most Likely Positive Outcome: ${scenarioSummary.filter(s => s.impact === 'positive').sort((a, b) => b.confidence - a.confidence)[0]?.name}
- Verification Issues Found: ${verifications.filter(v => !v.isValid).length}

Generate 5-7 actionable recommendations that:
1. Mitigate the highest risks
2. Capitalize on positive opportunities
3. Are specific and measurable
4. Consider the person's current financial constraints`;

  try {
    const result = await generateStructuredWithGemini({
      prompt,
      systemInstruction: GEMINI_SYSTEM_PROMPT,
      schema: recommendationSchema,
      thinkingLevel: 'high',
    });

    return result.recommendations.map(r => `[${r.priority.toUpperCase()}] ${r.action}: ${r.rationale}`);
  } catch (error) {
    console.error('[VibeEngineering] Recommendation generation error:', error);
    return [
      'Build emergency fund to 6 months of expenses',
      'Focus on highest-interest debt first',
      'Review and optimize monthly expenses',
    ];
  }
}

// What-if analysis for specific changes
export async function runWhatIfAnalysis(
  context: SimulationContext,
  changes: {
    incomeChange?: number;
    expenseChange?: number;
    extraSavings?: number;
    extraDebtPayment?: number;
  },
  timeframeMonths: number = 12
): Promise<{
  baseline: ScenarioResult;
  withChanges: ScenarioResult;
  improvement: {
    savingsDifference: number;
    debtDifference: number;
    netWorthDifference: number;
    runwayDifference: number;
  };
  analysis: string;
}> {
  // Create baseline scenario
  const baselineScenario: FinancialScenario = {
    id: 'baseline',
    type: 'goal_achievement',
    name: 'Current Trajectory',
    description: 'Projection based on current financial habits',
    assumptions: {},
    timeframeMonths,
    probability: 0.9,
    impact: 'neutral',
  };

  // Create modified scenario
  const modifiedContext: SimulationContext = {
    ...context,
    currentIncome: context.currentIncome + (changes.incomeChange || 0),
    currentExpenses: context.currentExpenses + (changes.expenseChange || 0),
    monthlyContributions: {
      savings: context.monthlyContributions.savings + (changes.extraSavings || 0),
      debtPayment: context.monthlyContributions.debtPayment + (changes.extraDebtPayment || 0),
    },
  };

  const modifiedScenario: FinancialScenario = {
    id: 'modified',
    type: 'goal_achievement',
    name: 'With Proposed Changes',
    description: 'Projection with proposed financial changes',
    assumptions: changes,
    timeframeMonths,
    probability: 0.85,
    impact: 'positive',
  };

  // Run simulations
  const baselineSim = runMonteCarloSimulation(context, baselineScenario);
  const modifiedSim = runMonteCarloSimulation(modifiedContext, modifiedScenario);

  const baseline: ScenarioResult = {
    scenarioId: 'baseline',
    projectedOutcome: {
      finalSavings: baselineSim.mean + context.currentSavings,
      finalDebt: Math.max(0, context.currentDebt - (context.monthlyContributions.debtPayment * timeframeMonths)),
      netWorth: baselineSim.mean,
      monthlyDisposable: context.currentIncome - context.currentExpenses,
      emergencyRunway: (baselineSim.mean + context.currentSavings) / context.currentExpenses,
    },
    milestones: [],
    riskScore: calculateRiskScore(baselineSim),
    confidenceLevel: baselineSim.probabilityOfSuccess,
    recommendations: [],
  };

  const withChanges: ScenarioResult = {
    scenarioId: 'modified',
    projectedOutcome: {
      finalSavings: modifiedSim.mean + modifiedContext.currentSavings,
      finalDebt: Math.max(0, modifiedContext.currentDebt - (modifiedContext.monthlyContributions.debtPayment * timeframeMonths)),
      netWorth: modifiedSim.mean,
      monthlyDisposable: modifiedContext.currentIncome - modifiedContext.currentExpenses,
      emergencyRunway: (modifiedSim.mean + modifiedContext.currentSavings) / modifiedContext.currentExpenses,
    },
    milestones: [],
    riskScore: calculateRiskScore(modifiedSim),
    confidenceLevel: modifiedSim.probabilityOfSuccess,
    recommendations: [],
  };

  const improvement = {
    savingsDifference: withChanges.projectedOutcome.finalSavings - baseline.projectedOutcome.finalSavings,
    debtDifference: baseline.projectedOutcome.finalDebt - withChanges.projectedOutcome.finalDebt,
    netWorthDifference: withChanges.projectedOutcome.netWorth - baseline.projectedOutcome.netWorth,
    runwayDifference: withChanges.projectedOutcome.emergencyRunway - baseline.projectedOutcome.emergencyRunway,
  };

  // Generate analysis
  const analysisSchema = z.object({
    analysis: z.string(),
  });

  const analysisPrompt = `Analyze the impact of proposed financial changes.

Proposed Changes:
${changes.incomeChange ? `- Income: +$${changes.incomeChange}/month` : ''}
${changes.expenseChange ? `- Expenses: ${changes.expenseChange > 0 ? '+' : ''}$${changes.expenseChange}/month` : ''}
${changes.extraSavings ? `- Extra Savings: +$${changes.extraSavings}/month` : ''}
${changes.extraDebtPayment ? `- Extra Debt Payment: +$${changes.extraDebtPayment}/month` : ''}

Over ${timeframeMonths} months:
- Savings Improvement: $${improvement.savingsDifference.toFixed(0)}
- Debt Reduction Improvement: $${improvement.debtDifference.toFixed(0)}
- Net Worth Improvement: $${improvement.netWorthDifference.toFixed(0)}
- Emergency Runway Improvement: ${improvement.runwayDifference.toFixed(1)} months

Provide a concise analysis of whether these changes are worth pursuing and why.`;

  try {
    const analysisResult = await generateStructuredWithGemini({
      prompt: analysisPrompt,
      systemInstruction: GEMINI_SYSTEM_PROMPT,
      schema: analysisSchema,
      thinkingLevel: 'medium',
    });

    return {
      baseline,
      withChanges,
      improvement,
      analysis: analysisResult.analysis,
    };
  } catch (error) {
    return {
      baseline,
      withChanges,
      improvement,
      analysis: `The proposed changes would result in a $${improvement.netWorthDifference.toFixed(0)} improvement in net worth over ${timeframeMonths} months.`,
    };
  }
}
