import { UserFinancials, FinancialSnapshot, AdaptationOutput, WeeklyAction, Intervention, LongTermGoal } from '@/types';
import { generateWeeklyCoaching } from '@/lib/aiService';

export class AdaptationAgent {
  private reasoningLog: string[] = [];

  private log(message: string) {
    const timestamp = new Date().toISOString();
    this.reasoningLog.push(`[${timestamp}] ${message}`);
    console.log(`[AdaptationAgent] ${message}`);
  }

  async analyze(
    financials: UserFinancials, 
    snapshot: FinancialSnapshot,
    previousFinancials?: UserFinancials,
    engagementLevel: number = 0.7
  ): Promise<AdaptationOutput> {
    this.reasoningLog = [];
    this.log('Generating AI-powered weekly plan...');

    const weeklyPlan = this.generateWeeklyPlan(financials, snapshot);
    const interventions = this.checkForInterventions(financials, previousFinancials, engagementLevel);
    const aiCoaching = await this.generateAICoaching(financials, snapshot);
    const longTermGoals = this.generateLongTermGoals(financials, snapshot);

    return {
      summary: aiCoaching.weeklyMessage || this.getFallbackSummary(weeklyPlan, interventions),
      reasoning: this.generateReasoning(financials, snapshot),
      assumptions: this.getAssumptions(),
      whatWouldChange: this.getWhatWouldChange(snapshot),
      timestamp: new Date().toISOString(),
      confidence: 0.85,
      weeklyPlan,
      interventions,
      longTermGoals,
    };
  }

  analyzeSync(
    financials: UserFinancials, 
    snapshot: FinancialSnapshot,
    previousFinancials?: UserFinancials,
    engagementLevel: number = 0.7
  ): AdaptationOutput {
    this.reasoningLog = [];
    this.log('Generating weekly plan (sync)...');

    const weeklyPlan = this.generateWeeklyPlan(financials, snapshot);
    const interventions = this.checkForInterventions(financials, previousFinancials, engagementLevel);
    const longTermGoals = this.generateLongTermGoals(financials, snapshot);

    return {
      summary: this.getFallbackSummary(weeklyPlan, interventions),
      reasoning: this.generateReasoning(financials, snapshot),
      assumptions: this.getAssumptions(),
      whatWouldChange: this.getWhatWouldChange(snapshot),
      timestamp: new Date().toISOString(),
      confidence: 0.85,
      weeklyPlan,
      interventions,
      longTermGoals,
    };
  }

  private generateLongTermGoals(financials: UserFinancials, snapshot: FinancialSnapshot): LongTermGoal[] {
    this.log('Evaluating long-term goals...');
    const goals: LongTermGoal[] = [];

    // Emergency Fund Goal
    const emergencyProgress = (financials.savings / financials.emergencyFundGoal) * 100;
    if (emergencyProgress < 100) {
      goals.push({
        id: 'goal-emergency',
        title: 'Fully Funded Emergency Fund',
        targetAmount: financials.emergencyFundGoal,
        currentAmount: financials.savings,
        status: 'active',
        progress: emergencyProgress,
        milestones: [
          { title: '1 Month Expenses', completed: snapshot.monthsOfRunway >= 1 },
          { title: '3 Months Expenses', completed: snapshot.monthsOfRunway >= 3 },
          { title: '6 Months Expenses', completed: snapshot.monthsOfRunway >= 6 },
        ],
        agentNotes: `At current savings rate of ${snapshot.savingsRate.toFixed(0)}%, projected completion in ${Math.ceil((financials.emergencyFundGoal - financials.savings) / (snapshot.disposableIncome || 1))} months.`,
      });
    }

    // Debt Freedom Goal
    if (financials.debts > 0) {
      goals.push({
        id: 'goal-debt',
        title: 'Debt Freedom',
        targetAmount: 0,
        currentAmount: financials.debts,
        status: 'active',
        progress: 0,
        milestones: [
          { title: 'Pay off high interest', completed: false },
          { title: 'Reduce DTI < 10%', completed: snapshot.debtToIncomeRatio < 10 },
        ],
        agentNotes: 'High priority goal. Suggest "Snowball" or "Avalanche" method once emergency buffer is established.',
      });
    }

    // Investment Goal
    if (snapshot.healthScore > 70 && emergencyProgress >= 100 && financials.debts === 0) {
      goals.push({
        id: 'goal-invest',
        title: 'First Investment Portfolio',
        targetAmount: 10000,
        currentAmount: 0,
        status: 'active',
        progress: 0,
        milestones: [
          { title: 'Open Brokerage Account', completed: false },
          { title: 'First $1,000 Invested', completed: false },
        ],
        agentNotes: 'User is ready for wealth accumulation phase.',
      });
    }

    return goals;
  }

  private async generateAICoaching(
    financials: UserFinancials,
    snapshot: FinancialSnapshot
  ): Promise<{ weeklyMessage: string; focusArea: string; encouragement: string }> {
    try {
      this.log('Generating AI-powered coaching via Google Deepmind...');
      const emergencyProgress = (financials.savings / financials.emergencyFundGoal) * 100;
      const result = await generateWeeklyCoaching({
        healthLabel: snapshot.healthLabel,
        monthsOfRunway: snapshot.monthsOfRunway,
        savingsRate: snapshot.savingsRate,
        disposableIncome: snapshot.disposableIncome,
        emergencyProgress,
      });
      this.log('AI coaching generated successfully');
      return result;
    } catch (error) {
      this.log(`AI generation failed, using fallback: ${error}`);
      return {
        weeklyMessage: 'Focus on consistent small steps this week.',
        focusArea: 'Building your emergency buffer',
        encouragement: 'Every dollar saved is progress toward security.',
      };
    }
  }

  private generateWeeklyPlan(financials: UserFinancials, snapshot: FinancialSnapshot): WeeklyAction[] {
    this.log('Generating weekly action plan...');
    const actions: WeeklyAction[] = [];

    const emergencyProgress = (financials.savings / financials.emergencyFundGoal) * 100;
    this.log(`Emergency fund progress: ${emergencyProgress.toFixed(1)}%`);

    if (emergencyProgress < 100) {
      const weeklyTarget = Math.round((snapshot.disposableIncome * 0.3) / 4);
      actions.push({
        id: 'action-1',
        title: 'Weekly Savings Transfer',
        description: `Move $${weeklyTarget} to your emergency fund this week.`,
        priority: 'high',
        category: 'buffer',
        targetAmount: weeklyTarget,
        completed: false,
        reasoning: `At ${emergencyProgress.toFixed(0)}% of your emergency fund goal, consistent weekly transfers will build your safety net steadily.`,
      });
    }

    actions.push({
      id: 'action-2',
      title: 'Track Daily Spending',
      description: 'Note your discretionary purchases for the next 7 days.',
      priority: 'medium',
      category: 'learn',
      completed: false,
      reasoning: 'Awareness precedes change. Understanding your spending patterns helps identify opportunities unique to your lifestyle.',
    });

    if (snapshot.savingsRate < 25) {
      actions.push({
        id: 'action-3',
        title: 'Review One Subscription',
        description: 'Evaluate one recurring charge and decide if it still serves you.',
        priority: 'low',
        category: 'reduce',
        completed: false,
        reasoning: 'Small recurring costs compound over time. A $15/month subscription equals $180/year.',
      });
    }

    if (snapshot.monthsOfRunway < 1) {
      actions.unshift({
        id: 'action-urgent',
        title: 'Emergency Buffer Priority',
        description: 'Focus all available funds on building a minimum 1-month buffer.',
        priority: 'high',
        category: 'buffer',
        completed: false,
        reasoning: 'Without at least one month of expenses saved, any unexpected event could cause significant stress.',
      });
    }

    this.log(`Generated ${actions.length} weekly actions`);
    return actions;
  }

  private checkForInterventions(
    financials: UserFinancials,
    previousFinancials?: UserFinancials,
    engagementLevel: number = 0.7
  ): Intervention[] {
    this.log('Checking for intervention triggers...');
    const interventions: Intervention[] = [];

    if (previousFinancials) {
      const incomeChange = ((financials.monthlyIncome - previousFinancials.monthlyIncome) / previousFinancials.monthlyIncome) * 100;
      
      if (Math.abs(incomeChange) > 10) {
        this.log(`Income change detected: ${incomeChange > 0 ? '+' : ''}${incomeChange.toFixed(1)}%`);
        interventions.push({
          id: 'int-income',
          type: 'income_change',
          title: incomeChange > 0 ? 'Income Increased' : 'Income Decreased',
          message: incomeChange > 0 
            ? 'Great news! Consider directing additional income toward your emergency fund.'
            : 'I\'ve adjusted your weekly targets to remain achievable with your new income.',
          actionRequired: true,
        });
      }
    }

    if (engagementLevel < 0.3) {
      this.log('Low engagement detected');
      interventions.push({
        id: 'int-engagement',
        type: 'low_engagement',
        title: 'Welcome Back',
        message: 'It\'s been a while! Even small, consistent steps make a difference. Ready to check in?',
        actionRequired: false,
      });
    }

    return interventions;
  }

  private getFallbackSummary(weeklyPlan: WeeklyAction[], interventions: Intervention[]): string {
    const highPriority = weeklyPlan.filter(a => a.priority === 'high').length;
    if (interventions.length > 0) {
      return `${interventions.length} update(s) need your attention. Your weekly plan has ${weeklyPlan.length} actions, ${highPriority} high priority.`;
    }
    return `This week's plan includes ${weeklyPlan.length} actions to keep you on track, with ${highPriority} high-priority items.`;
  }

  private generateReasoning(financials: UserFinancials, snapshot: FinancialSnapshot): string {
    return `Based on your ${snapshot.healthLabel.toLowerCase()} financial health and ${snapshot.monthsOfRunway.toFixed(1)} months of runway, I've prioritized actions that will have the most impact. Your disposable income of $${snapshot.disposableIncome.toLocaleString()}/month determines achievable weekly targets.`;
  }

  private getAssumptions(): string[] {
    return [
      'Your financial situation remains relatively stable week-to-week',
      'You have approximately 30 minutes per week for financial tasks',
      'Smaller, consistent actions are more sustainable than large changes',
      'Building habits matters more than perfect execution',
    ];
  }

  private getWhatWouldChange(snapshot: FinancialSnapshot): string[] {
    return [
      'Significant income changes would trigger an immediate plan revision',
      'Completing weekly actions builds positive momentum for larger goals',
      'Missing several weeks would prompt a check-in and plan simplification',
      'Reaching milestones (like 1 month runway) would shift priorities',
    ];
  }

  getReasoningLog(): string[] {
    return [...this.reasoningLog];
  }
}

export const adaptationAgent = new AdaptationAgent();
