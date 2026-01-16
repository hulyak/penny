import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  UserFinancials, 
  FinancialSnapshot, 
  WeeklyFocus, 
  MarketContext, 
  Scenario, 
  AgentInsight 
} from '@/types';
import { 
  financialRealityAgent, 
  marketContextAgent, 
  scenarioLearningAgent, 
  adaptationAgent 
} from '@/agents';
import { 
  DEMO_FINANCIALS, 
  DEMO_MARKET_CONTEXT, 
  DEMO_WEEKLY_FOCUSES, 
  DEMO_AGENT_INSIGHTS 
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

  useEffect(() => {
    loadStoredData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadStoredData = async () => {
    try {
      console.log('[AppContext] Loading stored data...');
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
  };

  const runAgentPipeline = useCallback((currentFinancials: UserFinancials) => {
    console.log('[AppContext] Running agent pipeline...');
    setAgentsProcessing(true);

    try {
      console.log('[FinancialRealityAgent] Calculating snapshot...');
      const newSnapshot = financialRealityAgent.calculateSnapshot(currentFinancials);
      setSnapshot(newSnapshot);

      console.log('[MarketContextAgent] Generating market context...');
      const newMarketContext = marketContextAgent.generateMarketContext();
      setMarketContext(newMarketContext);

      console.log('[ScenarioLearningAgent] Generating scenarios...');
      const newScenarios = scenarioLearningAgent.generateScenarios(currentFinancials, newSnapshot);
      setScenarios(newScenarios);

      console.log('[AdaptationAgent] Generating weekly focuses...');
      const newFocuses = adaptationAgent.generateWeeklyFocuses(currentFinancials, newSnapshot);
      setWeeklyFocuses(newFocuses);

      const newInsights: AgentInsight[] = [
        financialRealityAgent.generateInsight(currentFinancials, newSnapshot),
        marketContextAgent.generateInsight(newMarketContext),
        scenarioLearningAgent.generateInsight(currentFinancials, newSnapshot),
        adaptationAgent.generateInsight(0),
      ];
      setAgentInsights(newInsights);

      console.log('[AppContext] Agent pipeline completed');
    } catch (error) {
      console.error('[AppContext] Agent pipeline error:', error);
    } finally {
      setAgentsProcessing(false);
    }
  }, []);

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
    updateFinancials,
    completeOnboarding,
    updateFocusProgress,
    resetDemo,
  };
});
