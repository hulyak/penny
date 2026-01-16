export interface UserFinancials {
  monthlyIncome: number;
  housingCost: number;
  carCost: number;
  essentialsCost: number;
  savings: number;
  debts: number;
  emergencyFundGoal: number;
}

export interface FinancialSnapshot {
  disposableIncome: number;
  savingsRate: number;
  monthsOfRunway: number;
  debtToIncomeRatio: number;
  healthScore: number;
  healthLabel: 'Critical' | 'Needs Attention' | 'Stable' | 'Strong' | 'Excellent';
}

export interface WeeklyFocus {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  category: 'save' | 'reduce' | 'learn' | 'buffer';
  progress: number;
  agentReasoning: string;
}

export interface MarketContext {
  overallSentiment: 'cautious' | 'neutral' | 'optimistic';
  stocksDescription: string;
  bondsDescription: string;
  inflationDescription: string;
  goldDescription: string;
  lastUpdated: string;
  educationalNote: string;
}

export interface Scenario {
  id: string;
  name: string;
  description: string;
  monthlyContribution: number;
  duration: number;
  projectedOutcome: number;
  riskLevel: 'low' | 'medium' | 'high';
  reasoning: string;
}

export interface AgentInsight {
  id: string;
  agentName: string;
  agentType: 'financial-reality' | 'market-context' | 'scenario-learning' | 'adaptation';
  timestamp: string;
  title: string;
  message: string;
  reasoning: string;
  actionTaken?: string;
  confidence: number;
  icon: string;
}

export interface OnboardingData {
  step: number;
  completed: boolean;
  monthlyIncome: number;
  housingCost: number;
  carCost: number;
  essentialsCost: number;
  savings: number;
  debts: number;
}

export type AgentType = 'financial-reality' | 'market-context' | 'scenario-learning' | 'adaptation';

export interface AgentState {
  isProcessing: boolean;
  lastRun: string | null;
  reasoningLog: string[];
}
