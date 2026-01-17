export interface User {
  id: string;
  email: string;
  displayName: string;
  photoUrl?: string;
  provider: 'email' | 'google' | 'apple';
  createdAt: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

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
  fixedCostRatio: number;
  healthScore: number;
  healthLabel: 'Critical' | 'Needs Attention' | 'Stable' | 'Strong' | 'Excellent';
}

export interface AgentOutput {
  summary: string;
  reasoning: string;
  assumptions: string[];
  whatWouldChange: string[];
  timestamp: string;
  confidence: number;
}

export interface FinancialRealityOutput extends AgentOutput {
  snapshot: FinancialSnapshot;
  keyMetrics: {
    label: string;
    value: string;
    status: 'positive' | 'neutral' | 'negative';
  }[];
}

export interface MarketIndicator {
  name: string;
  description: string;
  trend: 'up' | 'stable' | 'down';
}

export interface MarketContextOutput extends AgentOutput {
  sentiment: 'cautious' | 'neutral' | 'optimistic';
  indicators: MarketIndicator[];
  educationalNote: string;
}

// Legacy MarketContext type for backwards compatibility
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
  projectedSavings: number;
  projectedOutcome: number;
  monthsToGoal: number;
  riskLevel: 'low' | 'medium' | 'high';
  tradeoffs: string[];
  reasoning: string;
}

export interface ScenarioOutput extends AgentOutput {
  scenarios: Scenario[];
  recommendation: string;
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

export interface WeeklyAction {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  category: 'save' | 'reduce' | 'learn' | 'buffer';
  targetAmount?: number;
  completed: boolean;
  reasoning: string;
}

export interface Intervention {
  id: string;
  type: 'income_change' | 'goal_reached' | 'low_engagement' | 'disruption';
  title: string;
  message: string;
  actionRequired: boolean;
}

export interface AdaptationOutput extends AgentOutput {
  weeklyPlan: WeeklyAction[];
  interventions: Intervention[];
}

export interface AgentInsight {
  id: string;
  agentName: string;
  agentType: AgentType;
  timestamp: string;
  title: string;
  message: string;
  reasoning: string;
  actionTaken?: string;
  confidence: number;
  icon: string;
}

export interface LearningCard {
  id: string;
  title: string;
  summary: string;
  content: string;
  category: 'basics' | 'saving' | 'budgeting' | 'planning';
  readTime: number;
  completed: boolean;
}

export interface AgentState {
  financialReality: FinancialRealityOutput | null;
  marketContext: MarketContextOutput | null;
  scenarios: ScenarioOutput | null;
  adaptation: AdaptationOutput | null;
  lastOrchestration: string | null;
  isProcessing: boolean;
}

export interface DemoState {
  isActive: boolean;
  currentDisruption: 'none' | 'income_drop' | 'expense_spike' | 'goal_reached';
  disruptionApplied: boolean;
}

export type AgentType = 'financial-reality' | 'market-context' | 'scenario-learning' | 'adaptation';

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
