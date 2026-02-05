export interface User {
  id: string;
  email: string;
  displayName: string;
  photoUrl?: string;
  provider: 'email' | 'google' | 'apple' | 'demo';
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
  longTermGoals?: LongTermGoal[];
}

export interface LongTermGoal {
  id: string;
  title: string;
  targetAmount?: number;
  currentAmount?: number;
  deadline?: string;
  status: 'active' | 'completed' | 'paused';
  progress: number;
  milestones: { title: string; completed: boolean }[];
  agentNotes: string;
}

export interface FinancialVisionOutput extends AgentOutput {
  analysis: {
    productName: string;
    estimatedCost: number;
    category: string;
    necessityScore: number;
    budgetImpact: 'low' | 'medium' | 'high' | 'critical';
    recommendation: string;
    reasoning: string;
    alternative?: string;
  };
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

// Portfolio Types
export type AssetType =
  | 'stock'
  | 'etf'
  | 'mutual_fund'
  | 'bond'
  | 'gold'
  | 'silver'
  | 'platinum'
  | 'real_estate'
  | 'fixed_deposit'
  | 'crypto'
  | 'cash'
  | 'other';

export type AssetClass = 'equity' | 'debt' | 'commodity' | 'real_asset' | 'cash';

export type InterestFrequency = 'monthly' | 'quarterly' | 'semi-annual' | 'annual' | 'at-maturity';

export interface Holding {
  id: string;
  type: AssetType;
  name: string;
  symbol?: string;
  quantity: number;
  purchasePrice: number;
  purchaseDate: string;
  currency: string;

  currentPrice?: number;
  currentValue?: number;
  lastPriceUpdate?: string;
  isManualPricing: boolean;

  maturityDate?: string;
  interestRate?: number;
  interestFrequency?: InterestFrequency;
  nextInterestDate?: string;

  sector?: string;
  country?: string;
  assetClass: AssetClass;

  notes?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  id: string;
  holdingId: string;
  type: 'buy' | 'sell' | 'dividend' | 'interest' | 'split';
  quantity: number;
  price: number;
  fees?: number;
  date: string;
  notes?: string;
  createdAt: string;
}

export interface PriceAlert {
  id: string;
  holdingId?: string;
  type: 'price_above' | 'price_below' | 'maturity' | 'reminder' | 'earnings' | 'fed_decision' | 'news';
  targetValue?: number;
  targetDate?: string;
  message: string;
  isActive: boolean;
  lastTriggered?: string;
  createdAt: string;
  // News-based alert fields
  newsSource?: string;
  eventType?: 'earnings' | 'fed' | 'economic' | 'company';
  symbol?: string;
}

// Rebalancing Action Types
export interface RebalanceAction {
  id: string;
  type: 'buy' | 'sell' | 'hold';
  holdingId?: string;
  holdingName: string;
  symbol?: string;
  currentAllocation: number;
  targetAllocation: number;
  currentValue: number;
  targetValue: number;
  actionAmount: number;
  actionShares?: number;
  reason: string;
  priority: 'high' | 'medium' | 'low';
  assetClass: AssetClass;
}

export interface RebalancePlan {
  id: string;
  createdAt: string;
  totalPortfolioValue: number;
  actions: RebalanceAction[];
  estimatedTrades: number;
  estimatedCost: number;
  summary: string;
  targetAllocation: Record<AssetClass, number>;
  currentAllocation: Record<AssetClass, number>;
}

// Community Benchmark Types
export interface CommunityBenchmark {
  category: string;
  userValue: number;
  communityAverage: number;
  communityMedian: number;
  percentile: number;
  trend: 'above' | 'at' | 'below';
}

export interface PeerComparison {
  ageGroup: string;
  incomeRange: string;
  totalParticipants: number;
  benchmarks: CommunityBenchmark[];
  insights: string[];
  lastUpdated: string;
}

// Market Event Types
export interface MarketEvent {
  id: string;
  type: 'earnings' | 'fed_decision' | 'economic_data' | 'dividend' | 'split';
  title: string;
  description: string;
  date: string;
  time?: string;
  symbol?: string;
  impact: 'high' | 'medium' | 'low';
  relevantHoldings?: string[];
}

export interface PortfolioSettings {
  defaultCurrency: string;
  riskTolerance: 'conservative' | 'moderate' | 'aggressive';
  notifications: {
    priceAlerts: boolean;
    reminders: boolean;
  };
  premiumTier: 'free' | 'premium';
  createdAt: string;
  updatedAt: string;
}

export interface PortfolioSnapshot {
  date: string;
  totalValue: number;
  holdings: Record<string, { value: number; quantity: number }>;
  allocation: {
    byAssetClass: Record<AssetClass, number>;
    bySector: Record<string, number>;
    byCountry: Record<string, number>;
  };
  createdAt: string;
}

export interface PortfolioSummary {
  totalValue: number;
  totalInvested: number;
  totalGain: number;
  totalGainPercent: number;
  dayChange: number;
  dayChangePercent: number;
  holdingsCount: number;
}

export interface AllocationItem {
  label: string;
  value: number;
  percent: number;
  color: string;
}

export interface PortfolioAnalysis {
  summary: PortfolioSummary;
  allocation: {
    byAssetClass: AllocationItem[];
    bySector: AllocationItem[];
    byCountry: AllocationItem[];
  };
  riskMetrics: {
    diversificationScore: number;
    concentrationRisk: string[];
    countryExposure: string[];
    sectorExposure: string[];
  };
  recommendations: string[];
}

export const ASSET_TYPE_CONFIG: Record<AssetType, { label: string; icon: string; assetClass: AssetClass }> = {
  stock: { label: 'Stock', icon: 'trending-up', assetClass: 'equity' },
  etf: { label: 'ETF', icon: 'layers', assetClass: 'equity' },
  mutual_fund: { label: 'Mutual Fund', icon: 'pie-chart', assetClass: 'equity' },
  bond: { label: 'Bond', icon: 'file-text', assetClass: 'debt' },
  gold: { label: 'Gold', icon: 'award', assetClass: 'commodity' },
  silver: { label: 'Silver', icon: 'circle', assetClass: 'commodity' },
  platinum: { label: 'Platinum', icon: 'hexagon', assetClass: 'commodity' },
  real_estate: { label: 'Real Estate', icon: 'home', assetClass: 'real_asset' },
  fixed_deposit: { label: 'Fixed Deposit', icon: 'lock', assetClass: 'debt' },
  crypto: { label: 'Cryptocurrency', icon: 'cpu', assetClass: 'equity' },
  cash: { label: 'Cash', icon: 'dollar-sign', assetClass: 'cash' },
  other: { label: 'Other', icon: 'box', assetClass: 'other' as AssetClass },
};

export const ASSET_CLASS_COLORS: Record<AssetClass | 'other', string> = {
  equity: '#4CAF50',
  debt: '#2196F3',
  commodity: '#FFC107',
  real_asset: '#9C27B0',
  cash: '#607D8B',
  other: '#795548',
};
