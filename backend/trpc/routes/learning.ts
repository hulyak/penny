import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '../create-context';

// Learning card schema
const LearningCardSchema = z.object({
  id: z.string(),
  title: z.string(),
  summary: z.string(),
  content: z.string(),
  category: z.enum(['basics', 'budgeting', 'saving', 'debt', 'investing', 'planning']),
  readTime: z.number(),
  order: z.number(),
});

// All learning content - could be moved to a database later
const LEARNING_CONTENT = [
  // Basics
  {
    id: 'basics-1',
    title: 'Emergency Fund Basics',
    summary: 'Why 3-6 months of savings matters',
    content: 'An emergency fund gives you peace of mind. It covers unexpected expenses like job loss, medical bills, or car repairs without going into debt. Start with a goal of $1,000, then build toward 3-6 months of essential expenses.',
    category: 'basics' as const,
    readTime: 3,
    order: 1,
  },
  {
    id: 'basics-2',
    title: 'Understanding Your Net Worth',
    summary: 'The big picture of your finances',
    content: 'Net worth = what you own minus what you owe. Track it monthly to see your progress. Even if it\'s negative (common with student loans), watching it grow is motivating!',
    category: 'basics' as const,
    readTime: 3,
    order: 2,
  },
  {
    id: 'basics-3',
    title: 'Good Debt vs Bad Debt',
    summary: 'Not all debt is created equal',
    content: 'Good debt can build wealth (mortgages, education). Bad debt costs you money (credit cards, payday loans). Focus on eliminating high-interest debt first while making minimum payments on lower-interest debt.',
    category: 'basics' as const,
    readTime: 4,
    order: 3,
  },

  // Budgeting
  {
    id: 'budget-1',
    title: 'The 50/30/20 Rule',
    summary: 'A simple way to budget your money',
    content: '50% for needs (rent, food, utilities), 30% for wants (fun stuff), and 20% for savings. It\'s a starting point—adjust it to fit your life! If your needs exceed 50%, focus on reducing housing or transportation costs.',
    category: 'budgeting' as const,
    readTime: 4,
    order: 4,
  },
  {
    id: 'budget-2',
    title: 'Tracking Your Spending',
    summary: 'Know where your money goes',
    content: 'Most people underestimate spending by 20-30%. Track everything for one month—you\'ll find surprising patterns. Small daily purchases (coffee, snacks) add up to hundreds monthly.',
    category: 'budgeting' as const,
    readTime: 3,
    order: 5,
  },
  {
    id: 'budget-3',
    title: 'The Envelope Method',
    summary: 'A tangible way to control spending',
    content: 'Allocate cash to physical or digital "envelopes" for each category. When an envelope is empty, stop spending in that category. Great for controlling discretionary spending.',
    category: 'budgeting' as const,
    readTime: 3,
    order: 6,
  },
  {
    id: 'budget-4',
    title: 'Needs vs Wants',
    summary: 'Making smarter spending decisions',
    content: 'Before buying, wait 24-48 hours for purchases over $50. Ask: "Do I need this, or do I want this?" Needs keep you alive and working. Wants make life enjoyable—but balance is key.',
    category: 'budgeting' as const,
    readTime: 3,
    order: 7,
  },

  // Saving
  {
    id: 'saving-1',
    title: 'Power of Compound Growth',
    summary: 'How small amounts grow big over time',
    content: 'When your money earns returns, and those returns earn more returns, that\'s compounding! $200/month at 7% becomes $240,000 in 30 years. Starting early—even with small amounts—makes a huge difference.',
    category: 'saving' as const,
    readTime: 4,
    order: 8,
  },
  {
    id: 'saving-2',
    title: 'Pay Yourself First',
    summary: 'Automate your savings success',
    content: 'Set up automatic transfers to savings on payday, before you can spend it. Even $25/week adds up to $1,300/year. Treat savings like a bill you must pay.',
    category: 'saving' as const,
    readTime: 3,
    order: 9,
  },
  {
    id: 'saving-3',
    title: 'High-Yield Savings Accounts',
    summary: 'Make your emergency fund work harder',
    content: 'Traditional banks pay 0.01% interest. Online banks often pay 4-5%. On a $10,000 emergency fund, that\'s $500/year vs $1. Your money should grow while it waits.',
    category: 'saving' as const,
    readTime: 3,
    order: 10,
  },
  {
    id: 'saving-4',
    title: 'The Savings Rate Secret',
    summary: 'The most powerful number in personal finance',
    content: 'Your savings rate (% of income saved) matters more than investment returns. Saving 20% of your income? You can retire in ~37 years. Saving 50%? ~17 years. Every percentage point counts.',
    category: 'saving' as const,
    readTime: 4,
    order: 11,
  },

  // Debt
  {
    id: 'debt-1',
    title: 'The Debt Avalanche Method',
    summary: 'Pay off debt faster with math',
    content: 'List debts by interest rate. Pay minimums on all, then put extra money toward the highest rate. This saves the most money over time. Best for disciplined savers.',
    category: 'debt' as const,
    readTime: 4,
    order: 12,
  },
  {
    id: 'debt-2',
    title: 'The Debt Snowball Method',
    summary: 'Pay off debt with quick wins',
    content: 'List debts by balance (smallest first). Pay minimums on all, then attack the smallest. The quick wins build momentum. Best if you need motivation to stay on track.',
    category: 'debt' as const,
    readTime: 4,
    order: 13,
  },
  {
    id: 'debt-3',
    title: 'Credit Card Interest Explained',
    summary: 'Why minimum payments are dangerous',
    content: 'A $5,000 balance at 22% APR with minimum payments takes 22 years to pay off and costs $8,000 in interest. Always pay more than the minimum when possible.',
    category: 'debt' as const,
    readTime: 4,
    order: 14,
  },
  {
    id: 'debt-4',
    title: 'When to Consider Balance Transfers',
    summary: 'Using 0% APR offers wisely',
    content: 'Balance transfer cards offer 0% APR for 12-21 months. Calculate the transfer fee (usually 3-5%) vs interest savings. Make a plan to pay it off before the promotional period ends.',
    category: 'debt' as const,
    readTime: 4,
    order: 15,
  },

  // Investing fundamentals (educational, not advice)
  {
    id: 'invest-1',
    title: 'Why Start Learning About Investing',
    summary: 'Building wealth beyond savings',
    content: 'Savings accounts protect money. Investments grow it. Over decades, the stock market has averaged ~10% annual returns vs ~4% for savings. But first: build your emergency fund and pay off high-interest debt.',
    category: 'investing' as const,
    readTime: 4,
    order: 16,
  },
  {
    id: 'invest-2',
    title: 'What is Diversification?',
    summary: 'Don\'t put all eggs in one basket',
    content: 'Diversification means spreading money across different types of investments. If one goes down, others might go up. Index funds automatically diversify across hundreds of companies.',
    category: 'investing' as const,
    readTime: 4,
    order: 17,
  },
  {
    id: 'invest-3',
    title: 'Understanding Risk and Reward',
    summary: 'Higher returns mean higher risk',
    content: 'Safe investments (bonds, savings) = lower returns. Risky investments (stocks) = higher potential returns but can lose value. Your timeline matters: longer timelines can handle more risk.',
    category: 'investing' as const,
    readTime: 4,
    order: 18,
  },
  {
    id: 'invest-4',
    title: 'The Magic of Dollar-Cost Averaging',
    summary: 'Consistent investing beats timing',
    content: 'Instead of timing the market, invest the same amount regularly. You buy more shares when prices are low, fewer when high. Over time, this smooths out volatility and removes emotion from investing.',
    category: 'investing' as const,
    readTime: 4,
    order: 19,
  },

  // Financial planning
  {
    id: 'plan-1',
    title: 'Setting SMART Financial Goals',
    summary: 'Goals that actually work',
    content: 'Specific, Measurable, Achievable, Relevant, Time-bound. Not "save more money" but "save $5,000 for emergency fund by December by setting aside $420/month." Write it down!',
    category: 'planning' as const,
    readTime: 4,
    order: 20,
  },
  {
    id: 'plan-2',
    title: 'The Importance of Insurance',
    summary: 'Protecting what you\'ve built',
    content: 'Insurance protects against financial catastrophe. Health, auto, and renters/homeowners insurance are essential. The right coverage prevents one bad event from wiping out years of savings.',
    category: 'planning' as const,
    readTime: 4,
    order: 21,
  },
  {
    id: 'plan-3',
    title: 'Building Multiple Income Streams',
    summary: 'Don\'t rely on just one paycheck',
    content: 'Side hustles, freelancing, or passive income add security. Even an extra $500/month accelerates debt payoff and savings. Start with skills you already have.',
    category: 'planning' as const,
    readTime: 4,
    order: 22,
  },
  {
    id: 'plan-4',
    title: 'Financial Independence Basics',
    summary: 'When work becomes optional',
    content: 'Financial independence = your investments cover your expenses. The 4% rule suggests you need 25x your annual expenses saved. It\'s a marathon, not a sprint—but every step counts.',
    category: 'planning' as const,
    readTime: 5,
    order: 23,
  },
];

export const learningRouter = createTRPCRouter({
  // Get all learning cards
  getAll: publicProcedure.query(() => {
    return LEARNING_CONTENT.sort((a, b) => a.order - b.order);
  }),

  // Get cards by category
  getByCategory: publicProcedure
    .input(z.object({ category: z.string() }))
    .query(({ input }) => {
      return LEARNING_CONTENT
        .filter(card => card.category === input.category)
        .sort((a, b) => a.order - b.order);
    }),

  // Get a single card
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(({ input }) => {
      return LEARNING_CONTENT.find(card => card.id === input.id) || null;
    }),

  // Get categories with counts
  getCategories: publicProcedure.query(() => {
    const categories = [
      { id: 'basics', label: 'Basics', color: '#10B981' },
      { id: 'budgeting', label: 'Budgeting', color: '#8B5CF6' },
      { id: 'saving', label: 'Saving', color: '#F59E0B' },
      { id: 'debt', label: 'Debt', color: '#EF4444' },
      { id: 'investing', label: 'Investing', color: '#3B82F6' },
      { id: 'planning', label: 'Planning', color: '#EC4899' },
    ];

    return categories.map(cat => ({
      ...cat,
      count: LEARNING_CONTENT.filter(c => c.category === cat.id).length,
    }));
  }),
});

// Export the content for direct import in the app
export { LEARNING_CONTENT };
