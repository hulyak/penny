import { UserFinancials, FinancialSnapshot, AgentInsight } from '@/types';

export class FinancialRealityAgent {
  private reasoningLog: string[] = [];

  private log(message: string) {
    const timestamp = new Date().toISOString();
    this.reasoningLog.push(`[${timestamp}] ${message}`);
    console.log(`[FinancialRealityAgent] ${message}`);
  }

  calculateSnapshot(financials: UserFinancials): FinancialSnapshot {
    this.reasoningLog = [];
    this.log('Starting financial snapshot calculation...');

    const totalExpenses = financials.housingCost + financials.carCost + financials.essentialsCost;
    this.log(`Total monthly expenses: $${totalExpenses}`);

    const disposableIncome = financials.monthlyIncome - totalExpenses;
    this.log(`Disposable income calculated: $${disposableIncome}`);

    const savingsRate = (disposableIncome / financials.monthlyIncome) * 100;
    this.log(`Savings rate: ${savingsRate.toFixed(1)}%`);

    const monthsOfRunway = totalExpenses > 0 ? financials.savings / totalExpenses : 0;
    this.log(`Emergency runway: ${monthsOfRunway.toFixed(1)} months`);

    const debtToIncomeRatio = (financials.debts / (financials.monthlyIncome * 12)) * 100;
    this.log(`Debt-to-income ratio: ${debtToIncomeRatio.toFixed(1)}%`);

    const healthScore = this.calculateHealthScore(savingsRate, monthsOfRunway, debtToIncomeRatio);
    this.log(`Health score computed: ${healthScore}/100`);

    const healthLabel = this.getHealthLabel(healthScore);
    this.log(`Financial health categorized as: ${healthLabel}`);

    return {
      disposableIncome,
      savingsRate,
      monthsOfRunway,
      debtToIncomeRatio,
      healthScore,
      healthLabel,
    };
  }

  private calculateHealthScore(savingsRate: number, monthsOfRunway: number, debtToIncomeRatio: number): number {
    let score = 0;

    if (savingsRate >= 20) score += 35;
    else if (savingsRate >= 10) score += 25;
    else if (savingsRate >= 5) score += 15;
    else if (savingsRate > 0) score += 5;

    if (monthsOfRunway >= 6) score += 35;
    else if (monthsOfRunway >= 3) score += 25;
    else if (monthsOfRunway >= 1) score += 15;
    else score += 5;

    if (debtToIncomeRatio <= 10) score += 30;
    else if (debtToIncomeRatio <= 20) score += 25;
    else if (debtToIncomeRatio <= 35) score += 15;
    else score += 5;

    return Math.min(100, score);
  }

  private getHealthLabel(score: number): FinancialSnapshot['healthLabel'] {
    if (score >= 85) return 'Excellent';
    if (score >= 70) return 'Strong';
    if (score >= 50) return 'Stable';
    if (score >= 30) return 'Needs Attention';
    return 'Critical';
  }

  generateInsight(financials: UserFinancials, snapshot: FinancialSnapshot): AgentInsight {
    const opportunities: string[] = [];
    
    if (snapshot.monthsOfRunway < 3) {
      opportunities.push('building your emergency buffer');
    }
    if (snapshot.debtToIncomeRatio > 20) {
      opportunities.push('reducing debt burden');
    }
    if (snapshot.savingsRate < 15) {
      opportunities.push('increasing your savings rate');
    }

    const mainOpportunity = opportunities[0] || 'maintaining your current progress';

    return {
      id: `fr-${Date.now()}`,
      agentName: 'Financial Reality',
      agentType: 'financial-reality',
      timestamp: new Date().toISOString(),
      title: 'Snapshot Updated',
      message: `Your financial health score is ${snapshot.healthScore}/100, categorized as "${snapshot.healthLabel}". Your biggest opportunity is ${mainOpportunity}.`,
      reasoning: `I calculated your health score using: savings rate (${snapshot.savingsRate.toFixed(0)}%), debt-to-income ratio (${snapshot.debtToIncomeRatio.toFixed(0)}%), and emergency fund progress (${((snapshot.monthsOfRunway / 3) * 100).toFixed(0)}% of 3-month goal). The weighted average indicates ${snapshot.healthLabel.toLowerCase()} financial health.`,
      actionTaken: 'Updated dashboard metrics and recalculated weekly priorities.',
      confidence: 0.94,
      icon: 'wallet',
    };
  }

  getReasoningLog(): string[] {
    return [...this.reasoningLog];
  }
}

export const financialRealityAgent = new FinancialRealityAgent();
