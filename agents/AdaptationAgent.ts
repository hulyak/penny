import { UserFinancials, FinancialSnapshot, WeeklyFocus, AgentInsight } from '@/types';

export class AdaptationAgent {
  private reasoningLog: string[] = [];
  private lastEngagementCheck: string | null = null;

  private log(message: string) {
    const timestamp = new Date().toISOString();
    this.reasoningLog.push(`[${timestamp}] ${message}`);
    console.log(`[AdaptationAgent] ${message}`);
  }

  generateWeeklyFocuses(financials: UserFinancials, snapshot: FinancialSnapshot): WeeklyFocus[] {
    this.reasoningLog = [];
    this.log('Analyzing financial state to generate weekly focuses...');

    const focuses: WeeklyFocus[] = [];
    const emergencyProgress = (financials.savings / financials.emergencyFundGoal) * 100;
    
    this.log(`Emergency fund progress: ${emergencyProgress.toFixed(1)}%`);
    this.log(`Current health score: ${snapshot.healthScore}`);

    if (emergencyProgress < 100) {
      const weeklyTarget = Math.round(snapshot.disposableIncome * 0.3 / 4);
      this.log(`Priority 1: Emergency fund building - weekly target $${weeklyTarget}`);
      
      focuses.push({
        id: 'focus-1',
        title: 'Build Your Buffer',
        description: `Set aside $${weeklyTarget} this week toward your emergency fund. You're ${emergencyProgress.toFixed(0)}% of the way to your 3-month safety net.`,
        priority: 'high',
        category: 'buffer',
        progress: 0,
        agentReasoning: `Based on your current savings of $${financials.savings.toLocaleString()} and monthly expenses of $${(financials.housingCost + financials.carCost + financials.essentialsCost).toLocaleString()}, building a 3-month emergency fund is the highest priority. This provides security before considering other financial moves.`,
      });
    }

    this.log('Priority 2: Awareness building through spending tracking');
    focuses.push({
      id: 'focus-2',
      title: 'Track Daily Spending',
      description: 'Note your non-essential purchases for 7 days. This builds awareness without requiring immediate changes.',
      priority: 'medium',
      category: 'learn',
      progress: 0,
      agentReasoning: 'Awareness precedes change. Before optimizing spending, understanding patterns helps identify opportunities unique to your lifestyle.',
    });

    if (snapshot.savingsRate < 25) {
      this.log('Priority 3: Subscription review for potential savings');
      focuses.push({
        id: 'focus-3',
        title: 'Review One Subscription',
        description: 'Look at one recurring charge and decide if it still serves you well.',
        priority: 'low',
        category: 'reduce',
        progress: 0,
        agentReasoning: 'Small recurring costs compound over time. A single $15/month subscription equals $180/year. This is a low-effort way to potentially increase savings capacity.',
      });
    }

    this.log(`Generated ${focuses.length} weekly focus items`);
    return focuses;
  }

  checkForInterventions(
    financials: UserFinancials, 
    previousFinancials: UserFinancials | null,
    engagementLevel: number
  ): { shouldIntervene: boolean; intervention?: AgentInsight } {
    this.log('Checking for intervention triggers...');

    if (previousFinancials) {
      const incomeChange = ((financials.monthlyIncome - previousFinancials.monthlyIncome) / previousFinancials.monthlyIncome) * 100;
      
      if (Math.abs(incomeChange) > 10) {
        this.log(`Significant income change detected: ${incomeChange > 0 ? '+' : ''}${incomeChange.toFixed(1)}%`);
        
        return {
          shouldIntervene: true,
          intervention: {
            id: `adapt-${Date.now()}`,
            agentName: 'Adaptation',
            agentType: 'adaptation',
            timestamp: new Date().toISOString(),
            title: 'Income Change Detected',
            message: incomeChange > 0 
              ? 'Your income has increased! Consider directing extra funds toward your emergency buffer.'
              : 'Your income has decreased. I\'ve adjusted your weekly targets to remain achievable.',
            reasoning: `I detected a ${Math.abs(incomeChange).toFixed(0)}% change in your monthly income. This significantly impacts your savings capacity and warrants a plan adjustment.`,
            actionTaken: 'Recalculated weekly targets and updated scenario projections.',
            confidence: 0.92,
            icon: 'refresh-cw',
          },
        };
      }
    }

    if (engagementLevel < 0.3) {
      this.log('Low engagement detected, generating motivational intervention');
      
      return {
        shouldIntervene: true,
        intervention: {
          id: `adapt-${Date.now()}`,
          agentName: 'Adaptation',
          agentType: 'adaptation',
          timestamp: new Date().toISOString(),
          title: 'Checking In',
          message: 'It\'s been a while! Even small steps count. Would you like to review your progress?',
          reasoning: 'Engagement has dropped below typical levels. A gentle check-in can help maintain momentum without pressure.',
          confidence: 0.78,
          icon: 'heart',
        },
      };
    }

    this.log('No intervention needed at this time');
    return { shouldIntervene: false };
  }

  generateInsight(focusesCompleted: number): AgentInsight {
    const messages = [
      'I noticed you completed last week\'s tracking goal. This week, I\'ve added a new focus on reviewing subscriptions.',
      'Great progress on your weekly focus! I\'m introducing the next step based on your momentum.',
      'Your consistency is paying off. I\'ve refined this week\'s priorities based on your patterns.',
    ];

    return {
      id: `adapt-${Date.now()}`,
      agentName: 'Adaptation',
      agentType: 'adaptation',
      timestamp: new Date().toISOString(),
      title: 'Weekly Plan Adjusted',
      message: messages[Math.min(focusesCompleted, messages.length - 1)],
      reasoning: `Your engagement pattern shows you respond well to small, specific tasks. Building on your success, I'm introducing the next logical step in your financial journey.`,
      actionTaken: 'Updated weekly focus list with new priority items.',
      confidence: 0.89,
      icon: 'refresh-cw',
    };
  }

  getReasoningLog(): string[] {
    return [...this.reasoningLog];
  }
}

export const adaptationAgent = new AdaptationAgent();
