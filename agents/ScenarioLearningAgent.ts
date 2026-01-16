import { UserFinancials, FinancialSnapshot, Scenario, AgentInsight } from '@/types';

export class ScenarioLearningAgent {
  private reasoningLog: string[] = [];

  private log(message: string) {
    const timestamp = new Date().toISOString();
    this.reasoningLog.push(`[${timestamp}] ${message}`);
    console.log(`[ScenarioLearningAgent] ${message}`);
  }

  generateScenarios(financials: UserFinancials, snapshot: FinancialSnapshot): Scenario[] {
    this.reasoningLog = [];
    this.log('Generating personalized scenarios based on financial snapshot...');

    const availableForSaving = snapshot.disposableIncome;
    this.log(`Available monthly savings capacity: $${availableForSaving.toFixed(0)}`);

    const emergencyGap = financials.emergencyFundGoal - financials.savings;
    this.log(`Emergency fund gap: $${emergencyGap.toFixed(0)}`);

    const scenarios: Scenario[] = [];

    const conservativeContribution = Math.min(availableForSaving * 0.3, 400);
    const conservativeMonths = Math.ceil(emergencyGap / conservativeContribution);
    this.log(`Conservative path: $${conservativeContribution}/month = ${conservativeMonths} months to goal`);

    scenarios.push({
      id: 'conservative',
      name: 'Steady & Safe',
      description: 'A comfortable pace that leaves room for life\'s surprises.',
      monthlyContribution: Math.round(conservativeContribution),
      duration: 36,
      projectedOutcome: financials.savings + (conservativeContribution * 36),
      riskLevel: 'low',
      reasoning: `Contributing $${Math.round(conservativeContribution)}/month uses about ${((conservativeContribution / availableForSaving) * 100).toFixed(0)}% of your disposable income. This sustainable pace means you'll reach your emergency fund goal in approximately ${conservativeMonths} months while maintaining flexibility.`,
    });

    const balancedContribution = Math.min(availableForSaving * 0.5, 600);
    const balancedMonths = Math.ceil(emergencyGap / balancedContribution);
    this.log(`Balanced path: $${balancedContribution}/month = ${balancedMonths} months to goal`);

    scenarios.push({
      id: 'balanced',
      name: 'Balanced Growth',
      description: 'A middle path that accelerates progress without major sacrifice.',
      monthlyContribution: Math.round(balancedContribution),
      duration: 36,
      projectedOutcome: financials.savings + (balancedContribution * 36),
      riskLevel: 'medium',
      reasoning: `At $${Math.round(balancedContribution)}/month, you're committing half your disposable income to savings. This gets you to your emergency fund in about ${balancedMonths} months. You'll feel the commitment but shouldn't feel squeezed.`,
    });

    const aggressiveContribution = Math.min(availableForSaving * 0.75, 900);
    const aggressiveMonths = Math.ceil(emergencyGap / aggressiveContribution);
    this.log(`Aggressive path: $${aggressiveContribution}/month = ${aggressiveMonths} months to goal`);

    scenarios.push({
      id: 'aggressive',
      name: 'Accelerated',
      description: 'Maximum focus on building your safety net quickly.',
      monthlyContribution: Math.round(aggressiveContribution),
      duration: 36,
      projectedOutcome: financials.savings + (aggressiveContribution * 36),
      riskLevel: 'high',
      reasoning: `Contributing $${Math.round(aggressiveContribution)}/month is ambitious—about ${((aggressiveContribution / availableForSaving) * 100).toFixed(0)}% of your disposable income. You'd reach your emergency fund goal in just ${aggressiveMonths} months, but this leaves little room for unexpected expenses or enjoyment.`,
    });

    this.log('All scenarios generated successfully');
    return scenarios;
  }

  compareScenarios(scenarios: Scenario[]): string {
    this.log('Comparing scenario outcomes...');
    
    const sorted = [...scenarios].sort((a, b) => b.projectedOutcome - a.projectedOutcome);
    const fastest = scenarios.reduce((min, s) => 
      s.monthlyContribution > 0 && s.projectedOutcome >= 16500 ? 
        (min.monthlyContribution > s.monthlyContribution ? s : min) : min
    , scenarios[0]);

    return `The "${sorted[0].name}" path projects the highest outcome at $${sorted[0].projectedOutcome.toLocaleString()}, while "${fastest.name}" offers the most sustainable approach at $${fastest.monthlyContribution}/month.`;
  }

  generateInsight(financials: UserFinancials, snapshot: FinancialSnapshot): AgentInsight {
    const emergencyGap = financials.emergencyFundGoal - financials.savings;
    const monthsToGoal = Math.ceil(emergencyGap / (snapshot.disposableIncome * 0.3));

    return {
      id: `sl-${Date.now()}`,
      agentName: 'Scenario & Learning',
      agentType: 'scenario-learning',
      timestamp: new Date().toISOString(),
      title: 'Projections Recalculated',
      message: `Based on your current pace, you'll reach your emergency fund goal in approximately ${monthsToGoal} months.`,
      reasoning: `With $${Math.round(snapshot.disposableIncome * 0.3)}/month toward savings and a $${financials.emergencyFundGoal.toLocaleString()} goal, simple arithmetic shows ${monthsToGoal} months. I've also modeled alternative paths if you adjust your contribution rate.`,
      actionTaken: 'Generated 3 scenario comparisons for your review.',
      confidence: 0.91,
      icon: 'git-branch',
    };
  }

  getReasoningLog(): string[] {
    return [...this.reasoningLog];
  }
}

export const scenarioLearningAgent = new ScenarioLearningAgent();
