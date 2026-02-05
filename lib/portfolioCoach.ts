/**
 * Portfolio Coach - AI-powered coaching to help users stick to their investment goals
 */

import AsyncStorage from "@react-native-async-storage/async-storage"
import { z } from "zod"
import { generateStructuredWithGemini, generateWithGemini } from "./gemini"
import { opik, traceLLMCall } from "./opik"
import { Holding, AssetClass } from "@/types"
import {
  calculateMetrics,
  identifyConcentrationRisks,
} from "./portfolioAnalysis"

const PORTFOLIO_GOALS_KEY = "penny_portfolio_goals"
const PORTFOLIO_COACH_STATE_KEY = "penny_portfolio_coach_state"

/**
 * User's investment strategy and goals
 */
export interface PortfolioGoals {
  // Target total portfolio value
  targetValue?: number
  targetDate?: string // ISO date string

  // Target allocation by asset class (percentages that sum to 100)
  targetAllocation?: Partial<Record<AssetClass, number>>

  // Risk tolerance
  riskTolerance: "conservative" | "moderate" | "aggressive"

  // Investment strategy
  strategy: "growth" | "income" | "balanced" | "preservation"

  // Monthly investment goal
  monthlyInvestmentTarget?: number

  // Rebalancing preference
  rebalanceFrequency: "monthly" | "quarterly" | "yearly" | "never"

  // Notes/custom rules
  notes?: string

  updatedAt: string
}

export interface CoachState {
  lastCoachingDate: string | null
  lastInsightId: string | null
  streak: number
  totalCheckIns: number
  dismissedInsights: string[]
}

export interface PortfolioInsight {
  id: string
  type:
    | "goal_progress"
    | "rebalance_needed"
    | "concentration_warning"
    | "milestone"
    | "strategy_drift"
    | "action_reminder"
    | "market_context"
    | "diversification"
    | "performance"
    | "risk_alert"
  priority: "high" | "medium" | "low"
  title: string
  message: string
  actionLabel?: string
  actionRoute?: string
  data?: Record<string, unknown>
  createdAt: string
}

export interface PortfolioCoachingContext {
  holdings: Holding[]
  goals: PortfolioGoals | null
  totalValue: number
  totalGain: number
  totalGainPercent: number
  allocation: Record<AssetClass, number>
  userName?: string
}

const DEFAULT_GOALS: PortfolioGoals = {
  riskTolerance: "moderate",
  strategy: "balanced",
  rebalanceFrequency: "quarterly",
  updatedAt: new Date().toISOString(),
}

/**
 * Get or create portfolio goals
 */
export async function getPortfolioGoals(): Promise<PortfolioGoals> {
  try {
    const stored = await AsyncStorage.getItem(PORTFOLIO_GOALS_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (error) {
    console.error("[PortfolioCoach] Error loading goals:", error)
  }
  return DEFAULT_GOALS
}

/**
 * Save portfolio goals
 */
export async function savePortfolioGoals(goals: PortfolioGoals): Promise<void> {
  try {
    goals.updatedAt = new Date().toISOString()
    await AsyncStorage.setItem(PORTFOLIO_GOALS_KEY, JSON.stringify(goals))
  } catch (error) {
    console.error("[PortfolioCoach] Error saving goals:", error)
  }
}

/**
 * Get coach state
 */
export async function getCoachState(): Promise<CoachState> {
  try {
    const stored = await AsyncStorage.getItem(PORTFOLIO_COACH_STATE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (error) {
    console.error("[PortfolioCoach] Error loading coach state:", error)
  }
  return {
    lastCoachingDate: null,
    lastInsightId: null,
    streak: 0,
    totalCheckIns: 0,
    dismissedInsights: [],
  }
}

/**
 * Save coach state
 */
async function saveCoachState(state: CoachState): Promise<void> {
  try {
    await AsyncStorage.setItem(PORTFOLIO_COACH_STATE_KEY, JSON.stringify(state))
  } catch (error) {
    console.error("[PortfolioCoach] Error saving coach state:", error)
  }
}

/**
 * Record a portfolio check-in
 */
export async function recordPortfolioCheckIn(): Promise<{
  streak: number
  isNewDay: boolean
}> {
  const state = await getCoachState()
  const today = new Date().toDateString()
  const lastCheckIn = state.lastCoachingDate
    ? new Date(state.lastCoachingDate).toDateString()
    : null

  const isNewDay = lastCheckIn !== today

  if (isNewDay) {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const wasYesterday = lastCheckIn === yesterday.toDateString()

    state.streak = wasYesterday ? state.streak + 1 : 1
    state.totalCheckIns += 1
  }

  state.lastCoachingDate = new Date().toISOString()
  await saveCoachState(state)

  return { streak: state.streak, isNewDay }
}

/**
 * Calculate allocation deviation from target
 */
function calculateAllocationDeviation(
  current: Record<AssetClass, number>,
  target: Partial<Record<AssetClass, number>>,
): {
  assetClass: AssetClass
  current: number
  target: number
  deviation: number
}[] {
  const deviations: {
    assetClass: AssetClass
    current: number
    target: number
    deviation: number
  }[] = []

  const allClasses: AssetClass[] = [
    "equity",
    "debt",
    "commodity",
    "real_asset",
    "cash",
  ]

  allClasses.forEach((assetClass) => {
    const currentPercent = current[assetClass] || 0
    const targetPercent = target[assetClass] || 0
    const deviation = currentPercent - targetPercent

    if (Math.abs(deviation) > 5 || targetPercent > 0) {
      deviations.push({
        assetClass,
        current: currentPercent,
        target: targetPercent,
        deviation,
      })
    }
  })

  return deviations.sort(
    (a, b) => Math.abs(b.deviation) - Math.abs(a.deviation),
  )
}

/**
 * Generate portfolio greeting with context
 */
export async function generatePortfolioGreeting(
  context: PortfolioCoachingContext,
): Promise<string> {
  const { streak } = await recordPortfolioCheckIn()
  const traceId = await opik.createTrace({
    name: "portfolio_greeting",
    input: {
      holdingsCount: context.holdings.length,
      totalValue: context.totalValue,
      hasGoals: !!context.goals,
    },
    tags: ["coaching", "greeting"],
  })

  const timeOfDay = getTimeOfDay()
  const metrics =
    context.holdings.length > 0 ? calculateMetrics(context.holdings) : null

  // Check for notable conditions
  const conditions: string[] = []
  if (context.totalGainPercent > 5) conditions.push("portfolio is up nicely")
  if (context.totalGainPercent < -5) conditions.push("portfolio has dipped")
  if (context.holdings.length === 0) conditions.push("no holdings yet")
  if (metrics && metrics.topHoldings[0]?.percent > 30)
    conditions.push("concentrated position")

  const greetingBase = {
    morning: `Good morning${context.userName ? `, ${context.userName}` : ""}!`,
    afternoon: `Good afternoon${context.userName ? `, ${context.userName}` : ""}!`,
    evening: `Good evening${context.userName ? `, ${context.userName}` : ""}!`,
    night: `Good night${context.userName ? `, ${context.userName}` : ""}!`,
  }[timeOfDay]

  const prompt = `You are Penny, a supportive investment coach. Generate a brief, personalized greeting.

CONTEXT:
- Time: ${timeOfDay}
- User's streak: ${streak} days checking portfolio
- Portfolio value: $${context.totalValue.toLocaleString()}
- Total gain/loss: ${context.totalGainPercent >= 0 ? "+" : ""}${context.totalGainPercent.toFixed(1)}%
- Number of holdings: ${context.holdings.length}
- Notable conditions: ${conditions.length > 0 ? conditions.join(", ") : "none"}
- Has set investment goals: ${context.goals ? "yes" : "no"}
- Risk tolerance: ${context.goals?.riskTolerance || "not set"}
- Strategy: ${context.goals?.strategy || "not set"}

Generate a 1-2 sentence greeting that:
1. Is warm and encouraging
2. References their portfolio status briefly
3. If they have a streak > 1, acknowledge consistency
4. Helps them stay focused on long-term goals (don't panic about short-term)
5. Feels like a knowledgeable friend, not a robot

Keep under 35 words. Be genuine.`

  const startTime = Date.now()

  try {
    const response = await generateWithGemini({
      prompt,
      temperature: 0.8,
      maxTokens: 100,
      thinkingLevel: "minimal", // Fast response for greetings
    })

    await traceLLMCall({
      traceId,
      model: "gemini-2.0-flash",
      prompt,
      response,
      latencyMs: Date.now() - startTime,
      metadata: { feature: "portfolio_greeting" },
    })

    await opik.logScore({
      traceId,
      metricName: "greeting_generated",
      score: 1,
      evaluatedBy: "heuristic",
    })

    return response.trim()
  } catch (error) {
    console.error("[PortfolioCoach] Error generating greeting:", error)

    await opik.logScore({
      traceId,
      metricName: "greeting_generated",
      score: 0,
      reason: String(error),
      evaluatedBy: "heuristic",
    })

    // Fallback greeting
    if (context.holdings.length === 0) {
      return `${greetingBase} Ready to start building your investment portfolio?`
    }
    if (streak > 1) {
      return `${greetingBase} ${streak} days strong! Your portfolio is at $${context.totalValue.toLocaleString()}.`
    }
    return `${greetingBase} Your portfolio is at $${context.totalValue.toLocaleString()}. Let's check in on your investments.`
  }
}

/**
 * Generate portfolio insights based on current state
 */
export async function generatePortfolioInsights(
  context: PortfolioCoachingContext,
  maxInsights: number = 3,
): Promise<PortfolioInsight[]> {
  const insights: PortfolioInsight[] = []
  const traceId = await opik.createTrace({
    name: "portfolio_insights",
    input: {
      holdingsCount: context.holdings.length,
      totalValue: context.totalValue,
      hasGoals: !!context.goals,
    },
    tags: ["coaching", "insights"],
  })

  if (context.holdings.length === 0) {
    insights.push({
      id: "empty_portfolio",
      type: "action_reminder",
      priority: "high",
      title: "Start Your Journey",
      message:
        "Add your first investment to begin tracking your portfolio and get personalized insights.",
      actionLabel: "Add Holding",
      actionRoute: "/portfolio/add",
      createdAt: new Date().toISOString(),
    })
    return insights
  }

  const metrics = calculateMetrics(context.holdings)
  const concentrationRisks = identifyConcentrationRisks(metrics)

  // Calculate current allocation percentages
  const currentAllocation: Record<AssetClass, number> = {
    equity: 0,
    debt: 0,
    commodity: 0,
    real_asset: 0,
    cash: 0,
  }
  Object.entries(metrics.assetClassDistribution).forEach(([cls, data]) => {
    currentAllocation[cls as AssetClass] = data.percent
  })

  // 1. Check goal progress
  if (context.goals?.targetValue && context.totalValue > 0) {
    const progressPercent =
      (context.totalValue / context.goals.targetValue) * 100

    if (progressPercent >= 100) {
      insights.push({
        id: `goal_achieved_${Date.now()}`,
        type: "milestone",
        priority: "high",
        title: "Goal Achieved! 🎉",
        message: `You've reached your target of $${context.goals.targetValue.toLocaleString()}! Time to set a new goal?`,
        actionLabel: "Update Goal",
        actionRoute: "/portfolio/goals",
        data: { progressPercent },
        createdAt: new Date().toISOString(),
      })
    } else if (progressPercent >= 75) {
      insights.push({
        id: `goal_progress_75_${Date.now()}`,
        type: "goal_progress",
        priority: "medium",
        title: "Almost There!",
        message: `You're ${progressPercent.toFixed(0)}% of the way to your $${context.goals.targetValue.toLocaleString()} goal. Keep it up!`,
        data: { progressPercent },
        createdAt: new Date().toISOString(),
      })
    }
  }

  // 2. Check allocation drift
  if (context.goals?.targetAllocation) {
    const deviations = calculateAllocationDeviation(
      currentAllocation,
      context.goals.targetAllocation,
    )
    const significantDeviations = deviations.filter(
      (d) => Math.abs(d.deviation) > 10,
    )

    if (significantDeviations.length > 0) {
      const worst = significantDeviations[0]
      insights.push({
        id: `rebalance_${Date.now()}`,
        type: "rebalance_needed",
        priority: "medium",
        title: "Consider Rebalancing",
        message: `Your ${worst.assetClass} allocation is ${worst.current.toFixed(0)}% vs your ${worst.target.toFixed(0)}% target. ${worst.deviation > 0 ? "Consider trimming." : "Consider adding."}`,
        actionLabel: "View Analysis",
        actionRoute: "/portfolio/analysis",
        data: { deviations: significantDeviations },
        createdAt: new Date().toISOString(),
      })
    }
  }

  // 3. Concentration warnings
  if (concentrationRisks.length > 0) {
    const topRisk = concentrationRisks[0]
    insights.push({
      id: `concentration_${Date.now()}`,
      type: "concentration_warning",
      priority: topRisk.percent > 40 ? "high" : "medium",
      title: "Concentration Alert",
      message: topRisk.warning,
      actionLabel: "View Details",
      actionRoute: "/portfolio/analysis",
      data: { risk: topRisk },
      createdAt: new Date().toISOString(),
    })
  }

  // 4. Strategy adherence check using AI
  if (insights.length < maxInsights && context.holdings.length >= 2) {
    try {
      const aiInsight = await generateAIInsight(context, traceId)
      if (aiInsight) {
        insights.push(aiInsight)
      }
    } catch (error) {
      console.error("[PortfolioCoach] Error generating AI insight:", error)
    }
  }

  // Log metrics
  await opik.logScore({
    traceId,
    metricName: "insights_generated",
    score: insights.length,
    evaluatedBy: "heuristic",
  })

  return insights.slice(0, maxInsights)
}

/**
 * Generate a single AI-powered insight
 */
async function generateAIInsight(
  context: PortfolioCoachingContext,
  traceId: string,
): Promise<PortfolioInsight | null> {
  // Valid insight types
  const validTypes = [
    "strategy_drift",
    "action_reminder",
    "market_context",
    "goal_progress",
    "diversification",
    "rebalance_needed",
    "concentration_warning",
    "milestone",
    "performance",
    "risk_alert",
  ] as const;

  const schema = z.object({
    // Handle Gemini returning invalid types like "insight" by falling back to "diversification"
    type: z.string().transform((val) => {
      if (validTypes.includes(val as any)) {
        return val as typeof validTypes[number];
      }
      // Map common invalid responses to appropriate types
      if (val === "insight" || val === "tip" || val === "suggestion") {
        return "diversification";
      }
      return "market_context"; // Default fallback
    }),
    priority: z.enum(["high", "medium", "low"]),
    title: z.string(),
    message: z.string(),
    actionLabel: z.string().optional(),
  })

  const holdingsSummary = context.holdings.slice(0, 10).map((h) => ({
    name: h.name,
    type: h.type,
    value: h.currentValue || h.quantity * (h.currentPrice || h.purchasePrice),
    gainPercent:
      h.purchasePrice > 0
        ? (((h.currentPrice || h.purchasePrice) - h.purchasePrice) /
            h.purchasePrice) *
          100
        : 0,
  }))

  const prompt = `You are Penny, an investment coach. Analyze this portfolio and provide ONE actionable insight.

PORTFOLIO:
- Total Value: $${context.totalValue.toLocaleString()}
- Total Gain: ${context.totalGainPercent >= 0 ? "+" : ""}${context.totalGainPercent.toFixed(1)}%
- Holdings: ${context.holdings.length}

TOP HOLDINGS:
${holdingsSummary.map((h) => `- ${h.name}: $${h.value.toLocaleString()} (${h.gainPercent >= 0 ? "+" : ""}${h.gainPercent.toFixed(1)}%)`).join("\n")}

USER'S STRATEGY:
- Risk Tolerance: ${context.goals?.riskTolerance || "moderate"}
- Strategy: ${context.goals?.strategy || "balanced"}
- Target Value: ${context.goals?.targetValue ? `$${context.goals.targetValue.toLocaleString()}` : "not set"}

Generate ONE insight that:
1. Helps them stick to their strategy
2. Is specific to their holdings (reference actual names/numbers)
3. Encourages long-term thinking
4. Is actionable but not pushy

IMPORTANT: Return JSON with these EXACT fields. The "type" field MUST be exactly one of these strings (do NOT use "insight" or any other value):
- "concentration_warning" - if portfolio is too concentrated in one asset
- "diversification" - if portfolio needs more diversification
- "rebalance_needed" - if portfolio needs rebalancing
- "strategy_drift" - if portfolio has drifted from stated strategy
- "goal_progress" - about progress toward goals
- "performance" - about portfolio performance
- "risk_alert" - about risk concerns
- "milestone" - celebrating achievements
- "action_reminder" - reminders to take action
- "market_context" - market-related context

JSON format:
{
  "type": "<one of the exact strings above>",
  "priority": "high" | "medium" | "low",
  "title": "<under 25 chars>",
  "message": "<under 100 chars>",
  "actionLabel": "<optional, under 15 chars>"
}`

  const startTime = Date.now()

  try {
    const result = await generateStructuredWithGemini({
      prompt,
      schema,
      temperature: 0.7,
      thinkingLevel: "low", // Balance between speed and quality for insights
    })

    await traceLLMCall({
      traceId,
      model: "gemini-2.0-flash",
      prompt,
      response: JSON.stringify(result),
      latencyMs: Date.now() - startTime,
      metadata: { feature: "portfolio_ai_insight" },
    })

    // Map insight types to appropriate routes
    const routeMap: Record<string, string> = {
      action_reminder: "/portfolio/add",
      diversification: "/portfolio/analysis",
      rebalance_needed: "/portfolio/analysis",
      concentration_warning: "/portfolio/analysis",
      strategy_drift: "/portfolio/analysis",
      goal_progress: "/portfolio/goals",
      milestone: "/portfolio/goals",
      market_context: "/(tabs)/portfolio",
      performance: "/(tabs)/portfolio",
      risk_alert: "/portfolio/analysis",
    }

    return {
      id: `ai_insight_${Date.now()}`,
      ...result,
      actionRoute: routeMap[result.type] || "/portfolio/analysis",
      createdAt: new Date().toISOString(),
    }
  } catch (error) {
    console.error("[PortfolioCoach] AI insight generation failed:", error)
    return null
  }
}

/**
 * Generate a daily tip focused on the user's strategy
 */
export async function generateDailyTip(
  context: PortfolioCoachingContext,
): Promise<string> {
  const traceId = await opik.createTrace({
    name: "portfolio_daily_tip",
    input: {
      strategy: context.goals?.strategy,
      riskTolerance: context.goals?.riskTolerance,
    },
    tags: ["coaching", "tip"],
  })

  const tips: Record<string, string[]> = {
    conservative: [
      "Review your bond allocation quarterly to ensure stability.",
      "Consider dividend-paying stocks for steady income.",
      "Keep 6-12 months expenses in cash before investing more.",
    ],
    moderate: [
      "Rebalance when any position drifts 10% from target.",
      "Dollar-cost averaging reduces timing risk.",
      "Review your portfolio monthly but avoid daily checking.",
    ],
    aggressive: [
      "High growth comes with volatility - stay the course.",
      "Consider taking some profits when positions double.",
      "Diversify across sectors even in an aggressive portfolio.",
    ],
  }

  const strategyTips = tips[context.goals?.riskTolerance || "moderate"]
  const randomTip =
    strategyTips[Math.floor(Math.random() * strategyTips.length)]

  // Try to generate a personalized tip
  try {
    const prompt = `You are Penny, an investment coach. Generate ONE short, actionable tip.

User's Profile:
- Risk Tolerance: ${context.goals?.riskTolerance || "moderate"}
- Strategy: ${context.goals?.strategy || "balanced"}
- Portfolio Size: $${context.totalValue.toLocaleString()}
- Holdings Count: ${context.holdings.length}

Generate a tip that:
1. Helps them stick to their ${context.goals?.strategy || "balanced"} strategy
2. Is specific and actionable TODAY
3. Under 20 words
4. Starts with an action verb`

    const response = await generateWithGemini({
      prompt,
      temperature: 0.7,
      maxTokens: 50,
      thinkingLevel: "minimal", // Fast response for tips
    })

    await opik.logScore({
      traceId,
      metricName: "tip_generated",
      score: 1,
      evaluatedBy: "heuristic",
    })

    return response.trim()
  } catch (error) {
    await opik.logScore({
      traceId,
      metricName: "tip_generated",
      score: 0,
      reason: "fallback used",
      evaluatedBy: "heuristic",
    })
    return randomTip
  }
}

function getTimeOfDay(): "morning" | "afternoon" | "evening" | "night" {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 12) return "morning"
  if (hour >= 12 && hour < 17) return "afternoon"
  if (hour >= 17 && hour < 21) return "evening"
  return "night"
}
