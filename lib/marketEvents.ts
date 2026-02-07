import { z } from 'zod';
import { generateStructuredWithGemini, GEMINI_SYSTEM_PROMPT } from './gemini';
import { Holding, MarketEvent, PriceAlert } from '@/types';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import logger from './logger';

const EVENTS_STORAGE_KEY = 'penny_market_events';
const EVENTS_CACHE_KEY = 'penny_events_cache';
const CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 hours

// Major economic events calendar (simplified - in production, use an API)
const ECONOMIC_CALENDAR: Omit<MarketEvent, 'id' | 'relevantHoldings'>[] = [
  // Fed Meetings 2025 (approximate dates)
  { type: 'fed_decision', title: 'FOMC Meeting', description: 'Federal Reserve interest rate decision', date: '2025-01-29', impact: 'high' },
  { type: 'fed_decision', title: 'FOMC Meeting', description: 'Federal Reserve interest rate decision', date: '2025-03-19', impact: 'high' },
  { type: 'fed_decision', title: 'FOMC Meeting', description: 'Federal Reserve interest rate decision', date: '2025-05-07', impact: 'high' },
  { type: 'fed_decision', title: 'FOMC Meeting', description: 'Federal Reserve interest rate decision', date: '2025-06-18', impact: 'high' },
  { type: 'fed_decision', title: 'FOMC Meeting', description: 'Federal Reserve interest rate decision', date: '2025-07-30', impact: 'high' },
  { type: 'fed_decision', title: 'FOMC Meeting', description: 'Federal Reserve interest rate decision', date: '2025-09-17', impact: 'high' },
  { type: 'fed_decision', title: 'FOMC Meeting', description: 'Federal Reserve interest rate decision', date: '2025-11-05', impact: 'high' },
  { type: 'fed_decision', title: 'FOMC Meeting', description: 'Federal Reserve interest rate decision', date: '2025-12-17', impact: 'high' },
  // Economic Reports
  { type: 'economic_data', title: 'Jobs Report', description: 'Monthly non-farm payrolls data', date: '2025-02-07', impact: 'high' },
  { type: 'economic_data', title: 'CPI Report', description: 'Consumer Price Index inflation data', date: '2025-02-12', impact: 'high' },
  { type: 'economic_data', title: 'GDP Report', description: 'Quarterly GDP growth data', date: '2025-02-27', impact: 'medium' },
];

// Sample earnings dates for popular stocks
const EARNINGS_CALENDAR: Record<string, { date: string; time: string }[]> = {
  AAPL: [{ date: '2025-02-06', time: 'After Market Close' }, { date: '2025-05-01', time: 'After Market Close' }],
  MSFT: [{ date: '2025-01-30', time: 'After Market Close' }, { date: '2025-04-24', time: 'After Market Close' }],
  GOOGL: [{ date: '2025-02-04', time: 'After Market Close' }, { date: '2025-04-29', time: 'After Market Close' }],
  AMZN: [{ date: '2025-02-06', time: 'After Market Close' }, { date: '2025-05-01', time: 'After Market Close' }],
  NVDA: [{ date: '2025-02-26', time: 'After Market Close' }, { date: '2025-05-21', time: 'After Market Close' }],
  TSLA: [{ date: '2025-01-29', time: 'After Market Close' }, { date: '2025-04-23', time: 'After Market Close' }],
  META: [{ date: '2025-02-05', time: 'After Market Close' }, { date: '2025-04-30', time: 'After Market Close' }],
  JPM: [{ date: '2025-01-15', time: 'Before Market Open' }, { date: '2025-04-11', time: 'Before Market Open' }],
  V: [{ date: '2025-01-30', time: 'After Market Close' }, { date: '2025-04-22', time: 'After Market Close' }],
  JNJ: [{ date: '2025-01-22', time: 'Before Market Open' }, { date: '2025-04-15', time: 'Before Market Open' }],
  WMT: [{ date: '2025-02-20', time: 'Before Market Open' }, { date: '2025-05-15', time: 'Before Market Open' }],
  DIS: [{ date: '2025-02-05', time: 'After Market Close' }, { date: '2025-05-07', time: 'After Market Close' }],
  // ETFs don't have earnings
  SPY: [],
  QQQ: [],
  VTI: [],
  VOO: [],
};

/**
 * Get upcoming market events relevant to user's holdings
 */
export function getUpcomingEvents(holdings: Holding[], daysAhead: number = 30): MarketEvent[] {
  const events: MarketEvent[] = [];
  const now = new Date();
  const cutoff = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

  let eventId = 1;

  // Add earnings events for held stocks
  holdings.forEach((holding) => {
    if (holding.symbol && EARNINGS_CALENDAR[holding.symbol]) {
      EARNINGS_CALENDAR[holding.symbol].forEach((earning) => {
        const eventDate = new Date(earning.date);
        if (eventDate >= now && eventDate <= cutoff) {
          events.push({
            id: `event_${eventId++}`,
            type: 'earnings',
            title: `${holding.symbol} Earnings`,
            description: `${holding.name} reports quarterly earnings`,
            date: earning.date,
            time: earning.time,
            symbol: holding.symbol,
            impact: 'high',
            relevantHoldings: [holding.id],
          });
        }
      });
    }
  });

  // Add economic events
  ECONOMIC_CALENDAR.forEach((event) => {
    const eventDate = new Date(event.date);
    if (eventDate >= now && eventDate <= cutoff) {
      events.push({
        id: `event_${eventId++}`,
        ...event,
        relevantHoldings: holdings.map((h) => h.id), // All holdings affected by macro events
      });
    }
  });

  // Sort by date
  events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return events;
}

/**
 * Get AI-generated market news analysis
 */
export async function getNewsAnalysis(holdings: Holding[]): Promise<{
  headlines: { title: string; summary: string; impact: 'positive' | 'neutral' | 'negative'; relevantSymbols: string[] }[];
  marketSentiment: 'bullish' | 'neutral' | 'bearish';
  keyTakeaway: string;
}> {
  // Check cache first
  const cached = await getCachedNews();
  if (cached) return cached;

  const symbols = holdings
    .filter((h) => h.symbol)
    .map((h) => h.symbol!)
    .slice(0, 10);

  if (symbols.length === 0) {
    return {
      headlines: [],
      marketSentiment: 'neutral',
      keyTakeaway: 'Add stocks to your portfolio to get personalized news analysis.',
    };
  }

  const schema = z.object({
    headlines: z.array(z.object({
      title: z.string(),
      summary: z.string(),
      impact: z.enum(['positive', 'neutral', 'negative']),
      relevantSymbols: z.array(z.string()),
    })),
    marketSentiment: z.enum(['bullish', 'neutral', 'bearish']),
    keyTakeaway: z.string(),
  });

  const prompt = `Generate 2 market headlines for: ${symbols.slice(0, 3).join(', ')}.

Return JSON: {"headlines":[{"title":"Title","summary":"Brief","impact":"positive","relevantSymbols":["SYM"]}],"marketSentiment":"neutral","keyTakeaway":"Brief"}`;

  try {
    const result = await generateStructuredWithGemini({
      prompt,
      systemInstruction: 'Return ONLY valid JSON. Very brief text. Max 30 chars per field.',
      schema,
      maxTokens: 1200,
      temperature: 0.2,
    });

    // Cache the result
    await cacheNews(result);

    return result;
  } catch (error) {
    logger.error('MarketEvents', 'News analysis failed', error);
    return {
      headlines: [
        {
          title: 'Market Update',
          summary: 'Markets are trading mixed as investors assess economic data.',
          impact: 'neutral',
          relevantSymbols: symbols.slice(0, 3),
        },
      ],
      marketSentiment: 'neutral',
      keyTakeaway: 'Stay diversified and focus on your long-term investment goals.',
    };
  }
}

/**
 * Create alerts for upcoming events
 */
export async function createEventAlerts(holdings: Holding[]): Promise<PriceAlert[]> {
  const events = getUpcomingEvents(holdings, 14); // Next 2 weeks
  const alerts: PriceAlert[] = [];

  // Only create alerts for high-impact events
  const highImpactEvents = events.filter((e) => e.impact === 'high');

  for (const event of highImpactEvents.slice(0, 5)) { // Limit to 5 alerts
    const alert: PriceAlert = {
      id: `news_alert_${event.id}`,
      type: event.type === 'earnings' ? 'earnings' : event.type === 'fed_decision' ? 'fed_decision' : 'news',
      targetDate: event.date,
      message: `${event.title}: ${event.description}`,
      isActive: true,
      createdAt: new Date().toISOString(),
      newsSource: 'Market Calendar',
      eventType: event.type === 'earnings' ? 'earnings' : event.type === 'fed_decision' ? 'fed' : 'economic',
      symbol: event.symbol,
      holdingId: event.relevantHoldings?.[0],
    };
    alerts.push(alert);
  }

  return alerts;
}

/**
 * Schedule notification for market event
 */
export async function scheduleEventNotification(event: MarketEvent): Promise<void> {
  const eventDate = new Date(event.date);
  const reminderDate = new Date(eventDate);
  reminderDate.setDate(reminderDate.getDate() - 1); // Day before
  reminderDate.setHours(9, 0, 0, 0); // 9 AM

  if (reminderDate <= new Date()) return; // Don't schedule past events

  await Notifications.scheduleNotificationAsync({
    identifier: `event_${event.id}`,
    content: {
      title: `📅 Tomorrow: ${event.title}`,
      body: event.description,
      data: { eventId: event.id, type: 'market_event' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: reminderDate,
    },
  });
}

/**
 * Get days until next major event
 */
export function getDaysUntilNextEvent(holdings: Holding[]): { event: MarketEvent; days: number } | null {
  const events = getUpcomingEvents(holdings, 60);
  if (events.length === 0) return null;

  const nextEvent = events[0];
  const now = new Date();
  const eventDate = new Date(nextEvent.date);
  const days = Math.ceil((eventDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));

  return { event: nextEvent, days };
}

/**
 * Cache helpers
 */
async function getCachedNews(): Promise<any | null> {
  try {
    const cached = await AsyncStorage.getItem(EVENTS_CACHE_KEY);
    if (!cached) return null;

    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp > CACHE_DURATION) return null;

    // Validate cached data structure
    if (!data || !data.headlines || !Array.isArray(data.headlines)) {
      logger.warn('MarketEvents', 'Invalid cached news structure, clearing cache');
      await AsyncStorage.removeItem(EVENTS_CACHE_KEY);
      return null;
    }

    // Validate each headline has required fields
    for (const headline of data.headlines) {
      if (!headline.title || !headline.summary || !headline.impact) {
        logger.warn('MarketEvents', 'Incomplete headline in cache, clearing');
        await AsyncStorage.removeItem(EVENTS_CACHE_KEY);
        return null;
      }
    }

    return data;
  } catch (error) {
    logger.warn('MarketEvents', 'Cache read failed, clearing', { error });
    await AsyncStorage.removeItem(EVENTS_CACHE_KEY);
    return null;
  }
}

async function cacheNews(data: any): Promise<void> {
  try {
    await AsyncStorage.setItem(EVENTS_CACHE_KEY, JSON.stringify({
      data,
      timestamp: Date.now(),
    }));
  } catch (error) {
    logger.warn('MarketEvents', 'Failed to cache news', { error });
  }
}

/**
 * Get event impact explanation
 */
export function getEventImpactExplanation(eventType: MarketEvent['type']): string {
  const explanations: Record<MarketEvent['type'], string> = {
    earnings: 'Earnings reports can cause significant price movements. Stocks often move 5-10% after earnings surprises.',
    fed_decision: 'Fed rate decisions affect all markets. Higher rates typically pressure stocks, while lower rates support them.',
    economic_data: 'Economic data like jobs reports and inflation numbers influence Fed policy and market sentiment.',
    dividend: 'Dividend announcements can attract income investors and signal company financial health.',
    split: 'Stock splits make shares more accessible but don\'t change the company\'s value.',
  };
  return explanations[eventType] || 'This event may impact your portfolio.';
}
