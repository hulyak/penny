import AsyncStorage from '@react-native-async-storage/async-storage';

const CREATOR_DATA_KEY = 'penny_creator_data';
const COMMENTARY_KEY = 'penny_market_commentary';
const QA_KEY = 'penny_community_qa';
const NOTIFICATIONS_KEY = 'penny_creator_notifications';

// Creator Profile
export interface Creator {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  bio: string;
  followers: number;
  verified: boolean;
  socialLinks: {
    youtube?: string;
    twitter?: string;
    instagram?: string;
  };
}

// Model Portfolio Types
export interface ModelHolding {
  id: string;
  name: string;
  symbol?: string;
  type: 'stock' | 'etf' | 'bond' | 'gold' | 'crypto' | 'real_estate' | 'cash';
  allocationPercent: number;
  reasoning: string;
  addedDate: string;
  performanceSinceAdded?: number;
}

export interface ModelPortfolio {
  id: string;
  creatorId: string;
  name: string;
  description: string;
  riskLevel: 'conservative' | 'moderate' | 'aggressive';
  holdings: ModelHolding[];
  lastUpdated: string;
  totalFollowers: number;
  ytdPerformance?: number;
  strategy: string;
  disclaimer: string;
}

// Market Commentary Types
export interface MarketCommentary {
  id: string;
  creatorId: string;
  title: string;
  content: string;
  summary: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  topics: string[];
  publishedAt: string;
  readTime: number;
  isRead: boolean;
  isPinned: boolean;
}

// Q&A Types
export interface Question {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  question: string;
  askedAt: string;
  upvotes: number;
  hasUpvoted: boolean;
  status: 'pending' | 'answered' | 'featured';
  answer?: {
    content: string;
    answeredAt: string;
    isVideoResponse: boolean;
    videoUrl?: string;
  };
}

// Notification Settings
export interface CreatorNotificationSettings {
  newCommentary: boolean;
  portfolioUpdates: boolean;
  qaAnswers: boolean;
  weeklyDigest: boolean;
}

// Josh's Creator Profile
export const JOSH_PROFILE: Creator = {
  id: 'josh_visualfaktory',
  name: 'Josh',
  handle: '@VisualPolitik',
  avatar: 'https://static.wikia.nocookie.net/youtube/images/c/cc/VisualPolitik_EN_icon.jpg/revision/latest?cb=20201202125245',
  bio: 'Finance educator and creator of VisualPolitik & VisualEconomik. Helping DIY investors understand markets through visual storytelling.',
  followers: 2400000,
  verified: true,
  socialLinks: {
    youtube: 'https://youtube.com/@visualfaktory',
    twitter: 'https://twitter.com/visualfaktory',
  },
};

// Josh's Model Portfolio (Sample Data)
export const JOSH_MODEL_PORTFOLIO: ModelPortfolio = {
  id: 'josh_diversified_2024',
  creatorId: 'josh_visualfaktory',
  name: "Josh's Diversified Portfolio",
  description: 'A balanced approach for DIY investors seeking long-term growth with managed risk across multiple asset classes.',
  riskLevel: 'moderate',
  lastUpdated: new Date().toISOString(),
  totalFollowers: 12450,
  ytdPerformance: 12.4,
  strategy: 'Geographic diversification + sector balance + alternative assets for inflation hedge',
  disclaimer: 'This is for educational purposes only. Not financial advice. Always do your own research and consult a financial advisor.',
  holdings: [
    {
      id: '1',
      name: 'Vanguard Total World Stock ETF',
      symbol: 'VT',
      type: 'etf',
      allocationPercent: 35,
      reasoning: 'Global equity exposure in one fund. Instant diversification across developed and emerging markets.',
      addedDate: '2024-01-15',
      performanceSinceAdded: 8.2,
    },
    {
      id: '2',
      name: 'Vanguard Total Bond Market ETF',
      symbol: 'BND',
      type: 'etf',
      allocationPercent: 20,
      reasoning: 'Fixed income stability. Balances equity volatility and provides steady income.',
      addedDate: '2024-01-15',
      performanceSinceAdded: 2.1,
    },
    {
      id: '3',
      name: 'iShares Gold Trust',
      symbol: 'IAU',
      type: 'gold',
      allocationPercent: 10,
      reasoning: 'Inflation hedge and crisis insurance. Gold tends to perform well during uncertainty.',
      addedDate: '2024-01-15',
      performanceSinceAdded: 15.3,
    },
    {
      id: '4',
      name: 'Vanguard Real Estate ETF',
      symbol: 'VNQ',
      type: 'real_estate',
      allocationPercent: 10,
      reasoning: 'Real asset exposure with dividend income. REITs provide inflation protection.',
      addedDate: '2024-01-15',
      performanceSinceAdded: 5.7,
    },
    {
      id: '5',
      name: 'Schwab US Dividend Equity ETF',
      symbol: 'SCHD',
      type: 'etf',
      allocationPercent: 15,
      reasoning: 'Quality dividend stocks for income and stability. Lower volatility than growth stocks.',
      addedDate: '2024-03-01',
      performanceSinceAdded: 6.8,
    },
    {
      id: '6',
      name: 'Cash / Money Market',
      type: 'cash',
      allocationPercent: 10,
      reasoning: 'Liquidity buffer for opportunities and emergencies. Currently earning 4.5%+ in money market.',
      addedDate: '2024-01-15',
      performanceSinceAdded: 4.5,
    },
  ],
};

// Sample Market Commentary
export const SAMPLE_COMMENTARY: MarketCommentary[] = [
  {
    id: 'comm_1',
    creatorId: 'josh_visualfaktory',
    title: 'Why Gold is Having a Moment',
    content: `Gold has surged past $2,400/oz this year, and many investors are wondering if they've missed the boat. Here's my take:

**What's driving the rally:**
1. Central bank buying (especially China and India)
2. Geopolitical tensions creating safe-haven demand
3. Anticipated Fed rate cuts making non-yielding assets more attractive

**Should you add gold now?**
If you have 0% allocation, consider a 5-10% position. Gold isn't about timing the market—it's about having insurance when you need it.

**My approach:**
I maintain a steady 10% allocation through IAU. I don't try to time gold—it's there for protection, not performance.

Remember: diversification means owning assets that don't all move together. Gold often zigs when stocks zag.`,
    summary: 'Gold is up 20%+ YTD. Here\'s why, and what it means for your portfolio.',
    sentiment: 'bullish',
    topics: ['Gold', 'Commodities', 'Diversification'],
    publishedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    readTime: 3,
    isRead: false,
    isPinned: true,
  },
  {
    id: 'comm_2',
    creatorId: 'josh_visualfaktory',
    title: 'The 60/40 Portfolio is Back',
    content: `Remember when everyone declared the 60/40 portfolio dead? Well, it's been quietly outperforming many complex strategies this year.

**Why 60/40 works:**
- Stocks provide growth
- Bonds provide stability and income
- Rebalancing forces you to buy low, sell high

**The death was exaggerated:**
2022 was an anomaly where both stocks AND bonds fell together. Historically rare. Normal correlation is returning.

**My evolution:**
I've moved from pure 60/40 to what I call "60/20/20"—adding alternatives like gold and real estate. Same principle, more diversification.

Don't let recency bias convince you that simple doesn't work.`,
    summary: 'The classic balanced portfolio is proving its worth again.',
    sentiment: 'neutral',
    topics: ['Asset Allocation', 'Bonds', 'Strategy'],
    publishedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    readTime: 4,
    isRead: true,
    isPinned: false,
  },
  {
    id: 'comm_3',
    creatorId: 'josh_visualfaktory',
    title: 'Emerging Markets: Time to Look Again?',
    content: `Emerging markets have underperformed US stocks for over a decade. But valuations are now at historic discounts.

**The case for EM:**
- P/E ratios 40% below US markets
- Growing middle class (billions of consumers)
- Less correlation with US tech

**The risks:**
- Currency volatility
- Political instability
- China uncertainty

**My position:**
I have EM exposure through VT (about 10% of the fund is EM). Not adding direct EM ETFs yet, but watching closely.

Patience often pays in investing. EM had a decade of outperformance before the 2010s.`,
    summary: 'Emerging markets are cheap. Is it a trap or an opportunity?',
    sentiment: 'neutral',
    topics: ['Emerging Markets', 'International', 'Valuations'],
    publishedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    readTime: 3,
    isRead: true,
    isPinned: false,
  },
];

// Sample Q&A
export const SAMPLE_QA: Question[] = [
  {
    id: 'qa_1',
    userId: 'user_1',
    userName: 'InvestorMike',
    question: 'Josh, what do you think about Bitcoin as part of a diversified portfolio? Should it replace gold?',
    askedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    upvotes: 234,
    hasUpvoted: false,
    status: 'answered',
    answer: {
      content: `Great question! I see Bitcoin and gold as different tools, not substitutes.

**Gold:** 5,000 years of history, central bank adoption, proven crisis performance
**Bitcoin:** 15 years old, high volatility, uncertain regulatory future

If you want crypto exposure, I'd suggest keeping it small (1-5%) and separate from your gold allocation. They behave very differently.

I personally don't hold Bitcoin in my model portfolio, but I understand why others do. The key is position sizing—don't bet more than you can afford to lose.`,
      answeredAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      isVideoResponse: false,
    },
  },
  {
    id: 'qa_2',
    userId: 'user_2',
    userName: 'SavvySaver22',
    question: 'How often do you rebalance your portfolio? Is there an optimal frequency?',
    askedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    upvotes: 189,
    hasUpvoted: true,
    status: 'answered',
    answer: {
      content: `I rebalance using a "threshold" approach rather than a calendar approach.

**My rules:**
- Check allocations quarterly
- Rebalance if any asset class drifts 5%+ from target
- Use new contributions to rebalance when possible (saves on taxes)

**Why not monthly?**
Transaction costs and taxes add up. Plus, letting winners run a bit can help performance.

**Why not yearly?**
You might miss significant drift and take on more risk than intended.

The threshold approach is a nice middle ground—you rebalance when needed, not on an arbitrary schedule.`,
      answeredAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
      isVideoResponse: false,
    },
  },
  {
    id: 'qa_3',
    userId: 'user_3',
    userName: 'NewbieInvestor',
    question: 'I\'m just starting with $1,000. Should I still try to diversify or just pick one ETF?',
    askedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    upvotes: 156,
    hasUpvoted: false,
    status: 'featured',
    answer: {
      content: `With $1,000, simplicity is your friend! Here's what I'd do:

**Option 1: One-fund portfolio**
Put it all in VT (Total World Stock). Instant global diversification. Add complexity later as you have more to invest.

**Option 2: Two-fund start**
80% VT + 20% BND gives you stocks + bonds. Simple and effective.

**Don't do:**
- Split into 10 different positions of $100 each
- Buy individual stocks (not enough to diversify)
- Wait for the "perfect" moment

The best thing a new investor can do is START. You'll learn more with money invested than reading another 10 articles. Your $1,000 is a great beginning!`,
      answeredAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
      isVideoResponse: true,
      videoUrl: 'https://youtube.com/watch?v=example',
    },
  },
  {
    id: 'qa_4',
    userId: 'user_4',
    userName: 'RetiredSoon',
    question: 'I\'m 5 years from retirement. Should I shift more to bonds now or wait?',
    askedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    upvotes: 98,
    hasUpvoted: false,
    status: 'pending',
  },
];

// Service Functions
export async function getCreatorData(): Promise<{
  profile: Creator;
  portfolio: ModelPortfolio;
  commentary: MarketCommentary[];
  questions: Question[];
}> {
  try {
    const stored = await AsyncStorage.getItem(CREATOR_DATA_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('[CreatorHub] Error loading data:', error);
  }

  // Return sample data
  return {
    profile: JOSH_PROFILE,
    portfolio: JOSH_MODEL_PORTFOLIO,
    commentary: SAMPLE_COMMENTARY,
    questions: SAMPLE_QA,
  };
}

export async function markCommentaryAsRead(commentaryId: string): Promise<void> {
  try {
    const data = await getCreatorData();
    const commentary = data.commentary.find((c) => c.id === commentaryId);
    if (commentary) {
      commentary.isRead = true;
      await AsyncStorage.setItem(CREATOR_DATA_KEY, JSON.stringify(data));
    }
  } catch (error) {
    console.error('[CreatorHub] Error marking as read:', error);
  }
}

export async function submitQuestion(question: string, userName: string): Promise<Question> {
  const newQuestion: Question = {
    id: `qa_${Date.now()}`,
    userId: `user_${Date.now()}`,
    userName,
    question,
    askedAt: new Date().toISOString(),
    upvotes: 0,
    hasUpvoted: false,
    status: 'pending',
  };

  try {
    const data = await getCreatorData();
    data.questions.unshift(newQuestion);
    await AsyncStorage.setItem(CREATOR_DATA_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('[CreatorHub] Error submitting question:', error);
  }

  return newQuestion;
}

export async function upvoteQuestion(questionId: string): Promise<void> {
  try {
    const data = await getCreatorData();
    const question = data.questions.find((q) => q.id === questionId);
    if (question && !question.hasUpvoted) {
      question.upvotes += 1;
      question.hasUpvoted = true;
      await AsyncStorage.setItem(CREATOR_DATA_KEY, JSON.stringify(data));
    }
  } catch (error) {
    console.error('[CreatorHub] Error upvoting:', error);
  }
}

export async function getNotificationSettings(): Promise<CreatorNotificationSettings> {
  try {
    const stored = await AsyncStorage.getItem(NOTIFICATIONS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('[CreatorHub] Error loading notification settings:', error);
  }

  return {
    newCommentary: true,
    portfolioUpdates: true,
    qaAnswers: true,
    weeklyDigest: false,
  };
}

export async function updateNotificationSettings(
  settings: CreatorNotificationSettings
): Promise<void> {
  try {
    await AsyncStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('[CreatorHub] Error saving notification settings:', error);
  }
}

export function formatFollowers(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(0)}K`;
  }
  return count.toString();
}

export function getTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}
