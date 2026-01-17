import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  UserFinancials, 
  FinancialSnapshot, 
  WeeklyFocus, 
  MarketContext,
  Scenario,
  AgentInsight,
  FinancialRealityOutput,
  MarketContextOutput,
  ScenarioOutput,
  AdaptationOutput,
} from '@/types';
import { 
  financialRealityAgent,
  marketContextAgent,
  scenarioLearningAgent,
  adaptationAgent,
} from '@/agents';
import { 
  DEMO_FINANCIALS, 
  DEMO_MARKET_CONTEXT,
  DEMO_WEEKLY_FOCUSES,
  DEMO_AGENT_INSIGHTS,
} from '@/constants/mockData';

const STORAGE_KEYS = {
  FINANCIALS: 'clearpath_financials',
  ONBOARDED: 'clearpath_onboarded',
};

export const [AppProvider, useApp] = createContextHook(() => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasOnboarded, setHasOnboarded] = useState(false);
  const [financials, setFinancials] = useState<UserFinancials>(DEMO_FINANCIALS);
  const [snapshot, setSnapshot] = useState<FinancialSnapshot | null>(null);
  const [weeklyFocuses, setWeeklyFocuses] = useState<WeeklyFocus[]>(DEMO_WEEKLY_FOCUSES);
  const [marketContext, setMarketContext] = useState<MarketContext>(DEMO_MARKET_CONTEXT);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [agentInsights, setAgentInsights] = useState<AgentInsight[]>(DEMO_AGENT_INSIGHTS);
  const [agentsProcessing, setAgentsProcessing] = useState(false);
  
  const [financialRealityOutput, setFinancialRealityOutput] = useState<FinancialRealityOutput | null>(null);
  const [marketContextOutput, setMarketContextOutput] = useState<MarketContextOutput | null>(null);
  const [scenarioOutput, setScenarioOutput] = useState<ScenarioOutput | null>(null);
  const [adaptationOutput, setAdaptationOutput] = useState<AdaptationOutput | null>(null);

  const runSyncFallback = useCallback((currentFinancials: UserFinancials) => {
    console.log('[AppContext] Running sync fallback...');
    try {
      const frOutput = financialRealityAgent.analyzeSync(currentFinancials);
      setFinancialRealityOutput(frOutput);
      setSnapshot(frOutput.snapshot);

      const mcOutput = marketContextAgent.analyzeSync();
      setMarketContextOutput(mcOutput);

      const legacyMarketContext: MarketContext = {
        overallSentiment: mcOutput.sentiment,
        stocksDescription: mcOutput.indicators.find(i => i.name === 'Stock Markets')?.description || '',
        bondsDescription: mcOutput.indicators.find(i => i.name === 'Bond Yields')?.description || '',
        inflationDescription: mcOutput.indicators.find(i => i.name === 'Inflation')?.description || '',
        goldDescription: mcOutput.indicators.find(i => i.name === 'Precious Metals')?.description || '',
        lastUpdated: mcOutput.timestamp,
        educationalNote: mcOutput.educationalNote,
      };
      setMarketContext(legacyMarketContext);

      const slOutput = scenarioLearningAgent.analyzeSync(currentFinancials, frOutput.snapshot);
      setScenarioOutput(slOutput);
      setScenarios(slOutput.scenarios);

      const adOutput = adaptationAgent.analyzeSync(currentFinancials, frOutput.snapshot);
      setAdaptationOutput(adOutput);

      const newWeeklyFocuses: WeeklyFocus[] = adOutput.weeklyPlan.map(action => ({
        id: action.id,
        title: action.title,
        description: action.description,
        priority: action.priority,
        category: action.category,
        progress: action.completed ? 100 : 0,
        agentReasoning: action.reasoning,
      }));
      setWeeklyFocuses(newWeeklyFocuses);

      const insights: AgentInsight[] = [
        {
          id: `fr-${Date.now()}`,
          agentName: 'Financial Reality',
          agentType: 'financial-reality',
          timestamp: frOutput.timestamp,
          title: 'Snapshot Updated',
          message: frOutput.summary,
          reasoning: frOutput.reasoning,
          actionTaken: 'Updated dashboard metrics.',
          confidence: frOutput.confidence,
          icon: 'wallet',
        },
        {
          id: `mc-${Date.now()}`,
          agentName: 'Market Context',
          agentType: 'market-context',
          timestamp: mcOutput.timestamp,
          title: 'Context Refreshed',
          message: mcOutput.summary,
          reasoning: mcOutput.reasoning,
          confidence: mcOutput.confidence,
          icon: 'trending-up',
        },
        {
          id: `sl-${Date.now()}`,
          agentName: 'Scenario & Learning',
          agentType: 'scenario-learning',
          timestamp: slOutput.timestamp,
          title: 'Projections Updated',
          message: slOutput.summary,
          reasoning: slOutput.reasoning,
          confidence: slOutput.confidence,
          icon: 'git-branch',
        },
        {
          id: `ad-${Date.now()}`,
          agentName: 'Adaptation',
          agentType: 'adaptation',
          timestamp: adOutput.timestamp,
          title: 'Plan Updated',
          message: adOutput.summary,
          reasoning: adOutput.reasoning,
          confidence: adOutput.confidence,
          icon: 'refresh-cw',
        },
      ];
      setAgentInsights(insights);
    } catch (error) {
      console.error('[AppContext] Sync fallback error:', error);
    }
  }, []);

  const runAgentPipeline = useCallback(async (currentFinancials: UserFinancials) => {
    console.log('[AppContext] Running AI-powered agent pipeline...');
    setAgentsProcessing(true);

    try {
      console.log('[FinancialRealityAgent] Analyzing with AI...');
      const frOutput = await financialRealityAgent.analyze(currentFinancials);
      setFinancialRealityOutput(frOutput);
      setSnapshot(frOutput.snapshot);

      console.log('[MarketContextAgent] Analyzing with AI...');
      const mcOutput = await marketContextAgent.analyze();
      setMarketContextOutput(mcOutput);
      
      const legacyMarketContext: MarketContext = {
        overallSentiment: mcOutput.sentiment,
        stocksDescription: mcOutput.indicators.find(i => i.name === 'Stock Markets')?.description || '',
        bondsDescription: mcOutput.indicators.find(i => i.name === 'Bond Yields')?.description || '',
        inflationDescription: mcOutput.indicators.find(i => i.name === 'Inflation')?.description || '',
        goldDescription: mcOutput.indicators.find(i => i.name === 'Precious Metals')?.description || '',
        lastUpdated: mcOutput.timestamp,
        educationalNote: mcOutput.educationalNote,
      };
      setMarketContext(legacyMarketContext);

      console.log('[ScenarioLearningAgent] Analyzing with AI...');
      const slOutput = await scenarioLearningAgent.analyze(currentFinancials, frOutput.snapshot);
      setScenarioOutput(slOutput);
      setScenarios(slOutput.scenarios);

      console.log('[AdaptationAgent] Analyzing with AI...');
      const adOutput = await adaptationAgent.analyze(currentFinancials, frOutput.snapshot);
      setAdaptationOutput(adOutput);
      
      const newWeeklyFocuses: WeeklyFocus[] = adOutput.weeklyPlan.map(action => ({
        id: action.id,
        title: action.title,
        description: action.description,
        priority: action.priority,
        category: action.category,
        progress: action.completed ? 100 : 0,
        agentReasoning: action.reasoning,
      }));
      setWeeklyFocuses(newWeeklyFocuses);

      const insights: AgentInsight[] = [
        {
          id: `fr-${Date.now()}`,
          agentName: 'Financial Reality',
          agentType: 'financial-reality',
          timestamp: frOutput.timestamp,
          title: 'Snapshot Updated',
          message: frOutput.summary,
          reasoning: frOutput.reasoning,
          actionTaken: 'Updated dashboard metrics and recalculated weekly priorities.',
          confidence: frOutput.confidence,
          icon: 'wallet',
        },
        {
          id: `mc-${Date.now()}`,
          agentName: 'Market Context',
          agentType: 'market-context',
          timestamp: mcOutput.timestamp,
          title: 'Economic Context Refreshed',
          message: mcOutput.summary,
          reasoning: mcOutput.reasoning,
          confidence: mcOutput.confidence,
          icon: 'trending-up',
        },
        {
          id: `sl-${Date.now()}`,
          agentName: 'Scenario & Learning',
          agentType: 'scenario-learning',
          timestamp: slOutput.timestamp,
          title: 'Projections Recalculated',
          message: slOutput.summary,
          reasoning: slOutput.reasoning,
          actionTaken: 'Generated 3 scenario comparisons for review.',
          confidence: slOutput.confidence,
          icon: 'git-branch',
        },
        {
          id: `ad-${Date.now()}`,
          agentName: 'Adaptation',
          agentType: 'adaptation',
          timestamp: adOutput.timestamp,
          title: 'Weekly Plan Updated',
          message: adOutput.summary,
          reasoning: adOutput.reasoning,
          actionTaken: 'Generated personalized weekly action plan.',
          confidence: adOutput.confidence,
          icon: 'refresh-cw',
        },
      ];
      setAgentInsights(insights);

      console.log('[AppContext] AI agent pipeline completed');
    } catch (error) {
      console.error('[AppContext] Agent pipeline error:', error);
      runSyncFallback(currentFinancials);
    } finally {
      setAgentsProcessing(false);
    }
  }, [runSyncFallback]);

  const loadStoredData = useCallback(async () => {
    try {
      const [storedFinancials, storedOnboarded] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.FINANCIALS),
        AsyncStorage.getItem(STORAGE_KEYS.ONBOARDED),
      ]);

      if (storedOnboarded === 'true') {
        setHasOnboarded(true);
      }

      if (storedFinancials) {
        const parsed = JSON.parse(storedFinancials);
        setFinancials(parsed);
        runAgentPipeline(parsed);
      } else {
        runAgentPipeline(DEMO_FINANCIALS);
      }
    } catch (error) {
      console.error('[AppContext] Error loading stored data:', error);
      runAgentPipeline(DEMO_FINANCIALS);
    } finally {
      setIsLoading(false);
    }
  }, [runAgentPipeline]);

  useEffect(() => {
    loadStoredData();
  }, [loadStoredData]);

  const updateFinancials = useCallback(async (newFinancials: UserFinancials) => {
    console.log('[AppContext] Updating financials...');
    setFinancials(newFinancials);
    
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.FINANCIALS, JSON.stringify(newFinancials));
    } catch (error) {
      console.error('[AppContext] Error saving financials:', error);
    }

    runAgentPipeline(newFinancials);
  }, [runAgentPipeline]);

  const completeOnboarding = useCallback(async (onboardingFinancials: UserFinancials) => {
    console.log('[AppContext] Completing onboarding...');
    setHasOnboarded(true);
    
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDED, 'true');
      await AsyncStorage.setItem(STORAGE_KEYS.FINANCIALS, JSON.stringify(onboardingFinancials));
    } catch (error) {
      console.error('[AppContext] Error saving onboarding data:', error);
    }

    setFinancials(onboardingFinancials);
    runAgentPipeline(onboardingFinancials);
  }, [runAgentPipeline]);

  const updateFocusProgress = useCallback((focusId: string, progress: number) => {
    setWeeklyFocuses(prev => 
      prev.map(f => f.id === focusId ? { ...f, progress } : f)
    );
  }, []);

  const resetDemo = useCallback(async () => {
    console.log('[AppContext] Resetting to demo mode...');
    try {
      await AsyncStorage.multiRemove([STORAGE_KEYS.FINANCIALS, STORAGE_KEYS.ONBOARDED]);
    } catch (error) {
      console.error('[AppContext] Error resetting:', error);
    }
    
    setHasOnboarded(false);
    setFinancials(DEMO_FINANCIALS);
    runAgentPipeline(DEMO_FINANCIALS);
  }, [runAgentPipeline]);

  return {
    isLoading,
    hasOnboarded,
    financials,
    snapshot,
    weeklyFocuses,
    marketContext,
    scenarios,
    agentInsights,
    agentsProcessing,
    financialRealityOutput,
    marketContextOutput,
    scenarioOutput,
    adaptationOutput,
    updateFinancials,
    completeOnboarding,
    updateFocusProgress,
    resetDemo,
  };
});
