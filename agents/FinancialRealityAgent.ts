import { UserFinancials, FinancialSnapshot, FinancialRealityOutput } from '@/types';
import { generateFinancialSummary } from '@/lib/aiService';

export class FinancialRealityAgent {
  private reasoningLog: string[] = [];

  private log(message: string) {
    const timestamp = new Date().toISOString();
    this.reasoningLog.push(`[${timestamp}] ${message}`);
    console.log(`[FinancialRealityAgent] ${message}`);
  }

  async analyze(financials: UserFinancials): Promise<FinancialRealityOutput> {
    this.reasoningLog = [];
    this.log('Starting AI-powered financial analysis...');

    const snapshot = this.calculateSnapshot(financials);
    const keyMetrics = this.generateKeyMetrics(snapshot);

    const aiInsights = await this.generateAIInsights(financials, snapshot);

    const assumptions = this.getAssumptions();

    return {
      summary: aiInsights.summary,
      reasoning: aiInsights.reasoning,
      assumptions,
      whatWouldChange: aiInsights.whatWouldChange,
      timestamp: new Date().toISOString(),
      confidence: 0.94,
      snapshot,
      keyMetrics,
    };
  }

  analyzeSync(financials: UserFinancials): FinancialRealityOutput {
    this.reasoningLog = [];
    this.log('Starting sync financial analysis...');

    const snapshot = this.calculateSnapshot(financials);
    const keyMetrics = this.generateKeyMetrics(snapshot);

    const summary = this.generateFallbackSummary(snapshot);
    const reasoning = this.generateFallbackReasoning(financials, snapshot);
    const whatWouldChange = this.getFallbackWhatWouldChange(snapshot);

    return {
      summary,
      reasoning,
      assumptions: this.getAssumptions(),
      whatWouldChange,
      timestamp: new Date().toISOString(),
      confidence: 0.94,
      snapshot,
      keyMetrics,
    };
  }

  private async generateAIInsights(
    financials: UserFinancials, 
    snapshot: FinancialSnapshot
  ): Promise<{ summary: string; reasoning: string; whatWouldChange: string[] }> {
    try {
      this.log('Generating AI-powered insights via Google Deepmind...');
      const result = await generateFinancialSummary({
        snapshot: {
          disposableIncome: snapshot.disposableIncome,
          savingsRate: snapshot.savingsRate,
          monthsOfRunway: snapshot.monthsOfRunway,
          fixedCostRatio: snapshot.fixedCostRatio,
          healthScore: snapshot.healthScore,
          healthLabel: snapshot.healthLabel,
        },
        financials: {
          monthlyIncome: financials.monthlyIncome,
          housingCost: financials.housingCost,
          carCost: financials.carCost,
          essentialsCost: financials.essentialsCost,
          savings: financials.savings,
          debts: financials.debts,
        },
      });
      this.log('AI insights generated successfully');
      return result;
    } catch (error) {
      this.log(`AI generation failed, using fallback: ${error}`);
      return {
        summary: this.generateFallbackSummary(snapshot),
        reasoning: this.generateFallbackReasoning(financials, snapshot),
        whatWouldChange: this.getFallbackWhatWouldChange(snapshot),
      };
    }
  }

  private calculateSnapshot(financials: UserFinancials): FinancialSnapshot {
    const totalExpenses = financials.housingCost + financials.carCost + financials.essentialsCost;
    this.log(`Total monthly expenses: $${totalExpenses}`);

    const disposableIncome = Math.max(0, financials.monthlyIncome - totalExpenses);
    this.log(`Disposable income: $${disposableIncome}`);

    const savingsRate = financials.monthlyIncome > 0 
      ? (disposableIncome / financials.monthlyIncome) * 100 
      : 0;
    this.log(`Savings rate: ${savingsRate.toFixed(1)}%`);

    const fixedCostRatio = financials.monthlyIncome > 0
      ? (totalExpenses / financials.monthlyIncome) * 100
      : 100;
    this.log(`Fixed cost ratio: ${fixedCostRatio.toFixed(1)}%`);

    const monthsOfRunway = totalExpenses > 0 ? financials.savings / totalExpenses : 0;
    this.log(`Emergency runway: ${monthsOfRunway.toFixed(1)} months`);

    const debtToIncomeRatio = financials.monthlyIncome > 0
      ? (financials.debts / (financials.monthlyIncome * 12)) * 100
      : 0;
    this.log(`Debt-to-income ratio: ${debtToIncomeRatio.toFixed(1)}%`);

    const healthScore = this.calculateHealthScore(savingsRate, monthsOfRunway, debtToIncomeRatio);
    const healthLabel = this.getHealthLabel(healthScore);
    this.log(`Health score: ${healthScore}/100 (${healthLabel})`);

    return {
      disposableIncome,
      savingsRate,
      monthsOfRunway,
      debtToIncomeRatio,
      fixedCostRatio,
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

  private generateKeyMetrics(snapshot: FinancialSnapshot): FinancialRealityOutput['keyMetrics'] {
    return [
      {
        label: 'Monthly Disposable',
        value: `$${snapshot.disposableIncome.toLocaleString()}`,
        status: snapshot.disposableIncome > 500 ? 'positive' : snapshot.disposableIncome > 0 ? 'neutral' : 'negative',
      },
      {
        label: 'Savings Rate',
        value: `${snapshot.savingsRate.toFixed(0)}%`,
        status: snapshot.savingsRate >= 20 ? 'positive' : snapshot.savingsRate >= 10 ? 'neutral' : 'negative',
      },
      {
        label: 'Emergency Runway',
        value: `${snapshot.monthsOfRunway.toFixed(1)} mo`,
        status: snapshot.monthsOfRunway >= 3 ? 'positive' : snapshot.monthsOfRunway >= 1 ? 'neutral' : 'negative',
      },
      {
        label: 'Fixed Costs',
        value: `${snapshot.fixedCostRatio.toFixed(0)}%`,
        status: snapshot.fixedCostRatio <= 50 ? 'positive' : snapshot.fixedCostRatio <= 70 ? 'neutral' : 'negative',
      },
    ];
  }

  private generateFallbackSummary(snapshot: FinancialSnapshot): string {
    const healthDescriptions: Record<string, string> = {
      'Excellent': 'Your finances are in excellent shape with strong fundamentals across all areas.',
      'Strong': 'You have a solid financial foundation with room for continued growth.',
      'Stable': 'Your finances are stable. Focus on building your emergency buffer.',
      'Needs Attention': 'There are areas that need attention. Small consistent steps will help.',
      'Critical': 'Your financial situation needs immediate focus on essentials first.',
    };
    return healthDescriptions[snapshot.healthLabel];
  }

  private generateFallbackReasoning(financials: UserFinancials, snapshot: FinancialSnapshot): string {
    return `I analyzed your monthly income of $${financials.monthlyIncome.toLocaleString()} against fixed expenses of $${(financials.housingCost + financials.carCost + financials.essentialsCost).toLocaleString()}. Your ${snapshot.savingsRate.toFixed(0)}% savings rate and ${snapshot.monthsOfRunway.toFixed(1)} months of runway are the primary factors in your ${snapshot.healthLabel.toLowerCase()} health score of ${snapshot.healthScore}/100.`;
  }

  private getAssumptions(): string[] {
    return [
      'Income and expenses remain relatively stable month-to-month',
      'Emergency fund target is 3 months of essential expenses',
      'Debt payments are included in reported expenses',
      'No major unexpected expenses in the near term',
    ];
  }

  private getFallbackWhatWouldChange(snapshot: FinancialSnapshot): string[] {
    const changes: string[] = [];
    
    if (snapshot.savingsRate < 20) {
      changes.push('Increasing income or reducing expenses by $200/month would improve your savings rate significantly');
    }
    if (snapshot.monthsOfRunway < 3) {
      changes.push('Reaching 3 months of runway would move you to the next health tier');
    }
    if (snapshot.debtToIncomeRatio > 20) {
      changes.push('Paying down debt would reduce monthly obligations and free up more disposable income');
    }
    if (changes.length === 0) {
      changes.push('Maintaining current habits will continue to strengthen your position');
    }
    
    return changes;
  }

  getReasoningLog(): string[] {
    return [...this.reasoningLog];
  }
}

export const financialRealityAgent = new FinancialRealityAgent();
