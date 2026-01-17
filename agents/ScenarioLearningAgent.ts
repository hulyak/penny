import { UserFinancials, FinancialSnapshot, Scenario, ScenarioOutput } from '@/types';
import { generateScenarioInsights } from '@/lib/aiService';

export class ScenarioLearningAgent {
  private reasoningLog: string[] = [];

  private log(message: string) {
    const timestamp = new Date().toISOString();
    this.reasoningLog.push(`[${timestamp}] ${message}`);
    console.log(`[ScenarioLearningAgent] ${message}`);
  }

  async analyze(financials: UserFinancials, snapshot: FinancialSnapshot): Promise<ScenarioOutput> {
    this.reasoningLog = [];
    this.log('Generating AI-powered scenarios...');

    const scenarios = this.generateScenarios(financials, snapshot);
    const aiInsights = await this.generateAIInsights(financials, snapshot, scenarios);

    return {
      summary: this.generateSummary(financials, snapshot),
      reasoning: aiInsights.reasoning,
      assumptions: this.getAssumptions(),
      whatWouldChange: this.getWhatWouldChange(snapshot),
      timestamp: new Date().toISOString(),
      confidence: 0.88,
      scenarios,
      recommendation: aiInsights.recommendation,
    };
  }

  analyzeSync(financials: UserFinancials, snapshot: FinancialSnapshot): ScenarioOutput {
    this.reasoningLog = [];
    this.log('Generating scenarios (sync)...');

    const scenarios = this.generateScenarios(financials, snapshot);
    const recommendation = this.getFallbackRecommendation(snapshot);

    return {
      summary: this.generateSummary(financials, snapshot),
      reasoning: this.getFallbackReasoning(financials, snapshot),
      assumptions: this.getAssumptions(),
      whatWouldChange: this.getWhatWouldChange(snapshot),
      timestamp: new Date().toISOString(),
      confidence: 0.88,
      scenarios,
      recommendation,
    };
  }

  private async generateAIInsights(
    financials: UserFinancials,
    snapshot: FinancialSnapshot,
    scenarios: Scenario[]
  ): Promise<{ recommendation: string; reasoning: string }> {
    try {
      this.log('Generating AI-powered scenario insights via Google Deepmind...');
      const result = await generateScenarioInsights({
        scenarios: scenarios.map(s => ({
          name: s.name,
          monthlyContribution: s.monthlyContribution,
          monthsToGoal: s.monthsToGoal,
          riskLevel: s.riskLevel,
        })),
        currentRunway: snapshot.monthsOfRunway,
        emergencyGoal: financials.emergencyFundGoal,
        disposableIncome: snapshot.disposableIncome,
      });
      this.log('AI scenario insights generated successfully');
      return result;
    } catch (error) {
      this.log(`AI generation failed, using fallback: ${error}`);
      return {
        recommendation: this.getFallbackRecommendation(snapshot),
        reasoning: this.getFallbackReasoning(financials, snapshot),
      };
    }
  }

  private generateScenarios(financials: UserFinancials, snapshot: FinancialSnapshot): Scenario[] {
    const availableForSaving = snapshot.disposableIncome;
    this.log(`Available monthly savings: $${availableForSaving.toFixed(0)}`);

    const emergencyGap = Math.max(0, financials.emergencyFundGoal - financials.savings);
    this.log(`Emergency fund gap: $${emergencyGap.toFixed(0)}`);

    const scenarios: Scenario[] = [];

    const conservativeContribution = Math.round(Math.min(availableForSaving * 0.3, 400));
    const conservativeMonths = conservativeContribution > 0 ? Math.ceil(emergencyGap / conservativeContribution) : 999;
    
    scenarios.push({
      id: 'conservative',
      name: 'Steady & Sustainable',
      description: 'A comfortable pace that leaves room for life\'s surprises and enjoyment.',
      monthlyContribution: conservativeContribution,
      duration: 36,
      projectedSavings: financials.savings + (conservativeContribution * 36),
      projectedOutcome: financials.savings + (conservativeContribution * 36),
      monthsToGoal: conservativeMonths,
      riskLevel: 'low',
      tradeoffs: [
        'Slower progress toward emergency fund goal',
        'More flexibility for unexpected expenses',
        'Less lifestyle sacrifice required',
      ],
      reasoning: `Contributing $${conservativeContribution}/month uses ${((conservativeContribution / availableForSaving) * 100).toFixed(0)}% of your disposable income. You'll reach your goal in ~${conservativeMonths} months while maintaining flexibility.`,
    });

    const balancedContribution = Math.round(Math.min(availableForSaving * 0.5, 600));
    const balancedMonths = balancedContribution > 0 ? Math.ceil(emergencyGap / balancedContribution) : 999;

    scenarios.push({
      id: 'balanced',
      name: 'Balanced Progress',
      description: 'A middle path that accelerates progress without major sacrifice.',
      monthlyContribution: balancedContribution,
      duration: 36,
      projectedSavings: financials.savings + (balancedContribution * 36),
      projectedOutcome: financials.savings + (balancedContribution * 36),
      monthsToGoal: balancedMonths,
      riskLevel: 'medium',
      tradeoffs: [
        'Moderate lifestyle adjustments needed',
        'Faster progress toward security',
        'Some buffer for small unexpected costs',
      ],
      reasoning: `At $${balancedContribution}/month, you're committing half your disposable income. Goal reached in ~${balancedMonths} months with moderate effort.`,
    });

    const aggressiveContribution = Math.round(Math.min(availableForSaving * 0.75, 900));
    const aggressiveMonths = aggressiveContribution > 0 ? Math.ceil(emergencyGap / aggressiveContribution) : 999;

    scenarios.push({
      id: 'aggressive',
      name: 'Accelerated Focus',
      description: 'Maximum focus on building your safety net as quickly as possible.',
      monthlyContribution: aggressiveContribution,
      duration: 36,
      projectedSavings: financials.savings + (aggressiveContribution * 36),
      projectedOutcome: financials.savings + (aggressiveContribution * 36),
      monthsToGoal: aggressiveMonths,
      riskLevel: 'high',
      tradeoffs: [
        'Significant lifestyle adjustments required',
        'Fastest path to financial security',
        'Little room for discretionary spending',
      ],
      reasoning: `Contributing $${aggressiveContribution}/month is ambitious—${((aggressiveContribution / availableForSaving) * 100).toFixed(0)}% of disposable income. Goal reached in just ~${aggressiveMonths} months.`,
    });

    this.log('All scenarios generated');
    return scenarios;
  }

  private getFallbackRecommendation(snapshot: FinancialSnapshot): string {
    if (snapshot.monthsOfRunway < 1) {
      return 'Given your current runway, the Balanced approach provides a good mix of urgency and sustainability.';
    }
    if (snapshot.monthsOfRunway >= 3) {
      return 'With your solid foundation, the Steady approach lets you build further while maintaining quality of life.';
    }
    return 'The Balanced approach typically works well for building an emergency fund while maintaining some flexibility.';
  }

  private generateSummary(financials: UserFinancials, snapshot: FinancialSnapshot): string {
    const monthsToGoal = Math.ceil((financials.emergencyFundGoal - financials.savings) / (snapshot.disposableIncome * 0.3));
    return `At your current pace, you'll reach your emergency fund goal in approximately ${monthsToGoal} months. I've modeled three paths with different intensity levels.`;
  }

  private getFallbackReasoning(financials: UserFinancials, snapshot: FinancialSnapshot): string {
    return `With $${snapshot.disposableIncome.toLocaleString()} monthly disposable income and a $${financials.emergencyFundGoal.toLocaleString()} emergency fund goal, I calculated three paths at 30%, 50%, and 75% of available income. Each path represents a different balance between speed and sustainability.`;
  }

  private getAssumptions(): string[] {
    return [
      'Income and expenses remain stable during the projection period',
      'No major unexpected expenses occur',
      'Contributions are made consistently each month',
      'Savings earn minimal interest (not factored into projections)',
    ];
  }

  private getWhatWouldChange(snapshot: FinancialSnapshot): string[] {
    return [
      'A $500/month income increase would significantly accelerate all timelines',
      'Reducing fixed costs would increase disposable income for saving',
      'An unexpected expense would extend the timeline proportionally',
      'Starting with more savings would reduce time to goal',
    ];
  }

  getReasoningLog(): string[] {
    return [...this.reasoningLog];
  }
}

export const scenarioLearningAgent = new ScenarioLearningAgent();
