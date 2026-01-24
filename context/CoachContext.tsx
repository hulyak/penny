import createContextHook from '@nkzw/create-context-hook';
import { useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useApp } from './AppContext';
import { financialVisionAgent } from '@/agents/FinancialVisionAgent';
import { FinancialVisionOutput } from '@/types';

export interface CoachMessage {
  id: string;
  type: 'greeting' | 'tip' | 'check-in' | 'weekly-review' | 'purchase-analysis' | 'readiness' | 'insight';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actionable?: boolean;
  actions?: CoachAction[];
}

export interface CoachAction {
  id: string;
  label: string;
  type: 'navigate' | 'dismiss' | 'custom';
  target?: string;
}

export interface PurchaseAnalysis {
  itemName: string;
  cost: number;
  runwayImpact: number;
  bufferImpact: number;
  weeklyBudgetImpact: number;
  recommendation: 'proceed' | 'reconsider' | 'delay';
  reasoning: string;
  adjustedPlan?: string;
}

export interface InvestmentReadiness {
  score: number;
  isReady: boolean;
  factors: {
    name: string;
    status: 'met' | 'partial' | 'not-met';
    description: string;
  }[];
  recommendation: string;
  nextSteps: string[];
}

const STORAGE_KEY = 'clearpath_coach_messages';
const LAST_CHECKIN_KEY = 'clearpath_last_checkin';
const LAST_WEEKLY_REVIEW_KEY = 'clearpath_last_weekly_review';

export const [CoachProvider, useCoach] = createContextHook(() => {
  const { snapshot, financials, weeklyFocuses } = useApp();
  
  const [messages, setMessages] = useState<CoachMessage[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showReadinessModal, setShowReadinessModal] = useState(false);
  const [currentAnalysis, setCurrentAnalysis] = useState<PurchaseAnalysis | null>(null);
  const [currentReadiness, setCurrentReadiness] = useState<InvestmentReadiness | null>(null);
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  const [currentVisualAnalysis, setCurrentVisualAnalysis] = useState<FinancialVisionOutput['analysis'] | null>(null);

  useEffect(() => {
    loadMessages();
    checkAndTriggerScheduledMessages();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkAndTriggerScheduledMessages = async () => {
    try {
      const lastCheckIn = await AsyncStorage.getItem(LAST_CHECKIN_KEY);
      const lastWeeklyReview = await AsyncStorage.getItem(LAST_WEEKLY_REVIEW_KEY);
      const now = new Date();
      const today = now.toDateString();
      
      if (lastCheckIn !== today && snapshot) {
        await AsyncStorage.setItem(LAST_CHECKIN_KEY, today);
      }
      
      const dayOfWeek = now.getDay();
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - dayOfWeek);
      const weekKey = weekStart.toDateString();
      
      if (dayOfWeek === 0 && lastWeeklyReview !== weekKey && snapshot) {
        await AsyncStorage.setItem(LAST_WEEKLY_REVIEW_KEY, weekKey);
      }
    } catch (error) {
      console.error('[CoachContext] Error checking scheduled messages:', error);
    }
  };

  const loadMessages = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setMessages(parsed.map((m: CoachMessage) => ({
          ...m,
          timestamp: new Date(m.timestamp)
        })));
      } else {
        const welcomeMessage: CoachMessage = {
          id: 'welcome-' + Date.now(),
          type: 'greeting',
          title: 'Welcome!',
          message: "Hi there! I'm your financial coach. I'm here to help you build healthy money habits. Tap me anytime for tips or to check something before you buy!",
          timestamp: new Date(),
          read: false,
        };
        setMessages([welcomeMessage]);
        saveMessages([welcomeMessage]);
      }
    } catch (error) {
      console.error('[CoachContext] Error loading messages:', error);
    }
  };

  const saveMessages = async (msgs: CoachMessage[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(msgs));
    } catch (error) {
      console.error('[CoachContext] Error saving messages:', error);
    }
  };

  const addMessage = useCallback((message: Omit<CoachMessage, 'id' | 'timestamp' | 'read'>) => {
    const newMessage: CoachMessage = {
      ...message,
      id: `msg-${Date.now()}`,
      timestamp: new Date(),
      read: false,
    };
    
    setMessages(prev => {
      const updated = [newMessage, ...prev].slice(0, 20);
      saveMessages(updated);
      return updated;
    });
    
    return newMessage;
  }, []);

  const markAsRead = useCallback((messageId: string) => {
    setMessages(prev => {
      const updated = prev.map(m => 
        m.id === messageId ? { ...m, read: true } : m
      );
      saveMessages(updated);
      return updated;
    });
  }, []);

  const markAllAsRead = useCallback(() => {
    setMessages(prev => {
      const updated = prev.map(m => ({ ...m, read: true }));
      saveMessages(updated);
      return updated;
    });
  }, []);

  const getDailyCheckIn = useCallback(() => {
    if (!snapshot) return null;
    
    const questions = [
      "Did you stick to your spending plan today?",
      "Any unexpected expenses pop up?",
      "Did you make progress on this week's focus?",
      "Feeling confident about your finances today?",
    ];
    
    const randomQuestion = questions[Math.floor(Math.random() * questions.length)];
    
    return {
      question: randomQuestion,
      context: `Your current health score is ${snapshot.healthScore}. You have ${snapshot.monthsOfRunway.toFixed(1)} months of runway.`,
    };
  }, [snapshot]);

  const getWeeklyReview = useCallback(() => {
    if (!snapshot || !weeklyFocuses) return null;
    
    const completedTasks = weeklyFocuses.filter(f => f.progress === 100).length;
    const totalTasks = weeklyFocuses.length;
    const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
    
    let summary = '';
    let adjustments: string[] = [];
    
    if (completionRate >= 80) {
      summary = "Great week! You crushed your goals. Let's keep this momentum going.";
      adjustments = ["Consider adding a stretch goal for next week", "Maybe increase your savings target slightly"];
    } else if (completionRate >= 50) {
      summary = "Solid progress this week. A few things slipped, but that's okay.";
      adjustments = ["Let's focus on fewer tasks next week", "Consider what blocked you from completing tasks"];
    } else {
      summary = "This week was tough. Let's adjust the plan to be more realistic.";
      adjustments = ["Reducing next week's tasks to 2-3 priorities", "Breaking larger tasks into smaller steps"];
    }
    
    return {
      summary,
      completionRate,
      completedTasks,
      totalTasks,
      adjustments,
      healthChange: 0,
    };
  }, [snapshot, weeklyFocuses]);

  const analyzePurchase = useCallback((itemName: string, cost: number): PurchaseAnalysis => {
    if (!snapshot || !financials) {
      return {
        itemName,
        cost,
        runwayImpact: 0,
        bufferImpact: 0,
        weeklyBudgetImpact: 0,
        recommendation: 'reconsider',
        reasoning: 'Unable to analyze without financial data.',
      };
    }
    
    const monthlyDisposable = snapshot.disposableIncome;
    const weeklyBudget = monthlyDisposable / 4;
    const currentSavings = financials.savings;
    const monthlyExpenses = financials.housingCost + financials.carCost + financials.essentialsCost;
    
    const runwayImpactMonths = cost / monthlyExpenses;
    const bufferImpactPercent = (cost / currentSavings) * 100;
    const weeklyImpactPercent = (cost / weeklyBudget) * 100;
    
    let recommendation: 'proceed' | 'reconsider' | 'delay';
    let reasoning: string;
    let adjustedPlan: string | undefined;
    
    if (cost <= weeklyBudget * 0.25 && bufferImpactPercent < 5) {
      recommendation = 'proceed';
      reasoning = `This fits comfortably in your budget. It's ${(cost / weeklyBudget * 100).toFixed(0)}% of your weekly discretionary spending.`;
    } else if (cost <= weeklyBudget && bufferImpactPercent < 15) {
      recommendation = 'proceed';
      reasoning = `This is a significant but manageable expense. It would use ${(cost / weeklyBudget * 100).toFixed(0)}% of your weekly budget.`;
      adjustedPlan = `Consider reducing discretionary spending by $${(cost * 0.3).toFixed(0)} this week to offset.`;
    } else if (bufferImpactPercent > 20) {
      recommendation = 'delay';
      reasoning = `This would impact ${bufferImpactPercent.toFixed(0)}% of your emergency fund. I'd suggest waiting until you've built more buffer.`;
      adjustedPlan = `Save $${(cost / 4).toFixed(0)}/week for ${Math.ceil(cost / (weeklyBudget * 0.3))} weeks to afford this comfortably.`;
    } else {
      recommendation = 'reconsider';
      reasoning = `This is a significant expense at ${(cost / weeklyBudget * 100).toFixed(0)}% of your weekly budget. It would reduce your runway by ${runwayImpactMonths.toFixed(1)} months.`;
      adjustedPlan = `If this is important, spread the cost: save $${(cost / 3).toFixed(0)}/week for 3 weeks first.`;
    }
    
    return {
      itemName,
      cost,
      runwayImpact: runwayImpactMonths,
      bufferImpact: bufferImpactPercent,
      weeklyBudgetImpact: weeklyImpactPercent,
      recommendation,
      reasoning,
      adjustedPlan,
    };
  }, [snapshot, financials]);

  const checkInvestmentReadiness = useCallback((): InvestmentReadiness => {
    if (!snapshot || !financials) {
      return {
        score: 0,
        isReady: false,
        factors: [],
        recommendation: 'Complete your financial profile first.',
        nextSteps: ['Set up your profile', 'Enter your income and expenses'],
      };
    }
    
    const factors: InvestmentReadiness['factors'] = [];
    let score = 0;
    
    // Emergency Fund Check (3-6 months)
    const emergencyMonths = financials.savings / (financials.housingCost + financials.carCost + financials.essentialsCost);
    if (emergencyMonths >= 6) {
      factors.push({ name: 'Emergency Fund', status: 'met', description: `${emergencyMonths.toFixed(1)} months saved (goal: 3-6 months)` });
      score += 30;
    } else if (emergencyMonths >= 3) {
      factors.push({ name: 'Emergency Fund', status: 'partial', description: `${emergencyMonths.toFixed(1)} months saved. Consider building to 6 months.` });
      score += 15;
    } else {
      factors.push({ name: 'Emergency Fund', status: 'not-met', description: `Only ${emergencyMonths.toFixed(1)} months saved. Build to at least 3 months first.` });
    }
    
    // High-Interest Debt Check
    const debtToIncome = (financials.debts / financials.monthlyIncome) * 100;
    if (debtToIncome === 0) {
      factors.push({ name: 'High-Interest Debt', status: 'met', description: 'No debt - great position!' });
      score += 25;
    } else if (debtToIncome < 20) {
      factors.push({ name: 'High-Interest Debt', status: 'partial', description: `Debt is ${debtToIncome.toFixed(0)}% of monthly income. Manageable, but consider paying down.` });
      score += 15;
    } else {
      factors.push({ name: 'High-Interest Debt', status: 'not-met', description: `Debt is ${debtToIncome.toFixed(0)}% of income. Focus on paying this down first.` });
    }
    
    // Savings Rate Check
    if (snapshot.savingsRate >= 20) {
      factors.push({ name: 'Savings Rate', status: 'met', description: `${snapshot.savingsRate.toFixed(0)}% savings rate - excellent!` });
      score += 25;
    } else if (snapshot.savingsRate >= 10) {
      factors.push({ name: 'Savings Rate', status: 'partial', description: `${snapshot.savingsRate.toFixed(0)}% savings rate. Try to reach 20%.` });
      score += 12;
    } else {
      factors.push({ name: 'Savings Rate', status: 'not-met', description: `${snapshot.savingsRate.toFixed(0)}% savings rate. Build this up before investing.` });
    }
    
    // Consistency Check (simplified - based on health score)
    if (snapshot.healthScore >= 70) {
      factors.push({ name: 'Financial Stability', status: 'met', description: 'Your finances look stable and consistent.' });
      score += 20;
    } else if (snapshot.healthScore >= 50) {
      factors.push({ name: 'Financial Stability', status: 'partial', description: 'Some room for improvement in overall stability.' });
      score += 10;
    } else {
      factors.push({ name: 'Financial Stability', status: 'not-met', description: 'Focus on building stability before investing.' });
    }
    
    const isReady = score >= 70;
    
    let recommendation: string;
    let nextSteps: string[];
    
    if (score >= 85) {
      recommendation = "You're in a strong position! Your financial foundation is solid. Learning about investing could be your next step.";
      nextSteps = [
        "Research low-cost index funds",
        "Learn about retirement account options (401k, IRA)",
        "Consider consulting a fee-only financial advisor",
      ];
    } else if (score >= 70) {
      recommendation = "You're nearly there! A few areas could use attention, but you have a good foundation.";
      nextSteps = [
        factors.find(f => f.status !== 'met')?.name === 'Emergency Fund' 
          ? "Continue building your emergency fund" 
          : "Keep improving your savings rate",
        "Start learning about investment basics",
        "Consider your long-term financial goals",
      ];
    } else if (score >= 50) {
      recommendation = "You're making progress, but focus on strengthening your foundation first. Investing works best when you have a stable base.";
      nextSteps = factors
        .filter(f => f.status !== 'met')
        .map(f => `Work on: ${f.name}`)
        .slice(0, 3);
    } else {
      recommendation = "Let's focus on building your financial foundation first. Investing can wait until you have more stability.";
      nextSteps = [
        "Build an emergency fund (at least 3 months)",
        "Pay down high-interest debt",
        "Establish consistent saving habits",
      ];
    }
    
    return {
      score,
      isReady,
      factors,
      recommendation,
      nextSteps,
    };
  }, [snapshot, financials]);

  const openPurchaseAnalysis = useCallback((itemName: string, cost: number) => {
    const analysis = analyzePurchase(itemName, cost);
    setCurrentAnalysis(analysis);
    setShowPurchaseModal(true);
  }, [analyzePurchase]);

  const openReadinessCheck = useCallback(() => {
    const readiness = checkInvestmentReadiness();
    setCurrentReadiness(readiness);
    setShowReadinessModal(true);
  }, [checkInvestmentReadiness]);

  const triggerDailyCheckIn = useCallback(() => {
    const checkIn = getDailyCheckIn();
    if (checkIn) {
      addMessage({
        type: 'check-in',
        title: 'Daily Check-in',
        message: checkIn.question,
        actionable: true,
        actions: [
          { id: 'yes', label: 'Yes', type: 'custom' },
          { id: 'no', label: 'Not quite', type: 'custom' },
        ],
      });
    }
  }, [getDailyCheckIn, addMessage]);

  const triggerWeeklyReview = useCallback(() => {
    const review = getWeeklyReview();
    if (review) {
      addMessage({
        type: 'weekly-review',
        title: 'Weekly Review',
        message: `${review.summary}\n\nYou completed ${review.completedTasks} of ${review.totalTasks} tasks (${review.completionRate.toFixed(0)}%).`,
        actionable: true,
        actions: [
          { id: 'view-plan', label: 'View Plan', type: 'navigate', target: '/plan' },
          { id: 'dismiss', label: 'Got it', type: 'dismiss' },
        ],
      });
    }
  }, [getWeeklyReview, addMessage]);

  const unreadCount = messages.filter(m => !m.read).length;
  const recentMessages = messages.slice(0, 3);

  const analyzeImage = useCallback(async (imageUrl: string) => {
    if (!snapshot || !financials) return;
    
    setIsAnalyzingImage(true);
    try {
      // In a real app, we might need to fetch the image and convert to base64 if the URL isn't supported directly.
      // For now, we'll pass the URL directly assuming the agent/SDK handles it or we're using a data URI.
      const result = await financialVisionAgent.analyze(imageUrl, financials, snapshot);
      setCurrentVisualAnalysis(result.analysis);
      
      // Add a message from the coach with the result
      addMessage({
        type: 'purchase-analysis',
        title: 'Visual Analysis Complete',
        message: `I've analyzed the ${result.analysis.productName}. \n\nVerdict: ${result.analysis.recommendation}\n\nReasoning: ${result.analysis.reasoning}`,
        actionable: true,
        actions: [
          { id: 'view-details', label: 'View Details', type: 'custom' },
        ],
      });
      
      // Also open the purchase modal with this data adapted to PurchaseAnalysis format
      const adaptedAnalysis: PurchaseAnalysis = {
        itemName: result.analysis.productName,
        cost: result.analysis.estimatedCost,
        runwayImpact: result.analysis.estimatedCost / (financials.housingCost + financials.carCost + financials.essentialsCost),
        bufferImpact: (result.analysis.estimatedCost / financials.savings) * 100,
        weeklyBudgetImpact: (result.analysis.estimatedCost / (snapshot.disposableIncome / 4)) * 100,
        recommendation: result.analysis.budgetImpact === 'critical' || result.analysis.budgetImpact === 'high' ? 'reconsider' : result.analysis.budgetImpact === 'medium' ? 'delay' : 'proceed',
        reasoning: result.analysis.reasoning,
        adjustedPlan: result.analysis.alternative ? `Consider: ${result.analysis.alternative}` : undefined,
      };
      
      setCurrentAnalysis(adaptedAnalysis);
      setShowPurchaseModal(true);
      
    } catch (error) {
      console.error('[CoachContext] Image analysis failed:', error);
      addMessage({
        type: 'tip',
        title: 'Analysis Failed',
        message: "I couldn't analyze that image. Please try again or type the details manually.",
      });
    } finally {
      setIsAnalyzingImage(false);
    }
  }, [snapshot, financials, addMessage]);

  return {
    messages,
    recentMessages,
    unreadCount,
    isDrawerOpen,
    setIsDrawerOpen,
    showPurchaseModal,
    setShowPurchaseModal,
    showReadinessModal,
    setShowReadinessModal,
    currentAnalysis,
    currentReadiness,
    isAnalyzingImage,
    currentVisualAnalysis,
    addMessage,
    markAsRead,
    markAllAsRead,
    getDailyCheckIn,
    getWeeklyReview,
    analyzePurchase,
    checkInvestmentReadiness,
    openPurchaseAnalysis,
    openReadinessCheck,
    triggerDailyCheckIn,
    triggerWeeklyReview,
    analyzeImage,
  };
});
