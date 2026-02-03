import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '../create-context';

// Schema definitions
const AssetTypeSchema = z.enum([
  'stock', 'etf', 'mutual_fund', 'bond', 'gold',
  'real_estate', 'fixed_deposit', 'crypto', 'cash', 'other'
]);

const AssetClassSchema = z.enum(['equity', 'debt', 'commodity', 'real_asset', 'cash']);

const HoldingSchema = z.object({
  id: z.string(),
  type: AssetTypeSchema,
  name: z.string(),
  symbol: z.string().optional(),
  quantity: z.number(),
  purchasePrice: z.number(),
  purchaseDate: z.string(),
  currency: z.string(),
  currentPrice: z.number().optional(),
  currentValue: z.number().optional(),
  lastPriceUpdate: z.string().optional(),
  isManualPricing: z.boolean(),
  maturityDate: z.string().optional(),
  interestRate: z.number().optional(),
  sector: z.string().optional(),
  country: z.string().optional(),
  assetClass: AssetClassSchema,
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const TransactionSchema = z.object({
  id: z.string(),
  holdingId: z.string(),
  type: z.enum(['buy', 'sell', 'dividend', 'interest', 'split']),
  quantity: z.number(),
  price: z.number(),
  fees: z.number().optional(),
  date: z.string(),
  notes: z.string().optional(),
  createdAt: z.string(),
});

const AlertSchema = z.object({
  id: z.string(),
  holdingId: z.string().optional(),
  type: z.enum(['price_above', 'price_below', 'maturity', 'reminder']),
  targetValue: z.number().optional(),
  targetDate: z.string().optional(),
  message: z.string(),
  isActive: z.boolean(),
  lastTriggered: z.string().optional(),
  createdAt: z.string(),
});

// In-memory storage for demo mode
const portfolioStorage: Record<string, {
  holdings: z.infer<typeof HoldingSchema>[];
  transactions: z.infer<typeof TransactionSchema>[];
  alerts: z.infer<typeof AlertSchema>[];
}> = {};

function ensureUserStorage(userId: string) {
  if (!portfolioStorage[userId]) {
    portfolioStorage[userId] = {
      holdings: [],
      transactions: [],
      alerts: [],
    };
  }
  return portfolioStorage[userId];
}

export const portfolioRouter = createTRPCRouter({
  // === HOLDINGS ===
  getHoldings: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(({ input }) => {
      return ensureUserStorage(input.userId).holdings;
    }),

  getHolding: publicProcedure
    .input(z.object({ userId: z.string(), holdingId: z.string() }))
    .query(({ input }) => {
      const storage = ensureUserStorage(input.userId);
      return storage.holdings.find(h => h.id === input.holdingId) || null;
    }),

  addHolding: publicProcedure
    .input(z.object({
      userId: z.string(),
      holding: HoldingSchema,
    }))
    .mutation(({ input }) => {
      const storage = ensureUserStorage(input.userId);
      storage.holdings.push(input.holding);
      return { success: true, holding: input.holding };
    }),

  updateHolding: publicProcedure
    .input(z.object({
      userId: z.string(),
      holding: HoldingSchema,
    }))
    .mutation(({ input }) => {
      const storage = ensureUserStorage(input.userId);
      const index = storage.holdings.findIndex(h => h.id === input.holding.id);
      if (index >= 0) {
        storage.holdings[index] = input.holding;
        return { success: true, holding: input.holding };
      }
      return { success: false, error: 'Holding not found' };
    }),

  deleteHolding: publicProcedure
    .input(z.object({ userId: z.string(), holdingId: z.string() }))
    .mutation(({ input }) => {
      const storage = ensureUserStorage(input.userId);
      storage.holdings = storage.holdings.filter(h => h.id !== input.holdingId);
      // Also delete related transactions
      storage.transactions = storage.transactions.filter(t => t.holdingId !== input.holdingId);
      return { success: true };
    }),

  // === TRANSACTIONS ===
  getTransactions: publicProcedure
    .input(z.object({
      userId: z.string(),
      holdingId: z.string().optional(),
    }))
    .query(({ input }) => {
      const storage = ensureUserStorage(input.userId);
      if (input.holdingId) {
        return storage.transactions.filter(t => t.holdingId === input.holdingId);
      }
      return storage.transactions;
    }),

  addTransaction: publicProcedure
    .input(z.object({
      userId: z.string(),
      transaction: TransactionSchema,
    }))
    .mutation(({ input }) => {
      const storage = ensureUserStorage(input.userId);
      storage.transactions.push(input.transaction);

      // Update holding quantity and average price for buy/sell
      const holding = storage.holdings.find(h => h.id === input.transaction.holdingId);
      if (holding) {
        if (input.transaction.type === 'buy') {
          const totalCost = holding.quantity * holding.purchasePrice +
                           input.transaction.quantity * input.transaction.price;
          const newQuantity = holding.quantity + input.transaction.quantity;
          holding.quantity = newQuantity;
          holding.purchasePrice = totalCost / newQuantity;
        } else if (input.transaction.type === 'sell') {
          holding.quantity -= input.transaction.quantity;
        }
        holding.updatedAt = new Date().toISOString();
      }

      return { success: true, transaction: input.transaction };
    }),

  // === ALERTS ===
  getAlerts: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(({ input }) => {
      return ensureUserStorage(input.userId).alerts;
    }),

  addAlert: publicProcedure
    .input(z.object({
      userId: z.string(),
      alert: AlertSchema,
    }))
    .mutation(({ input }) => {
      const storage = ensureUserStorage(input.userId);
      storage.alerts.push(input.alert);
      return { success: true, alert: input.alert };
    }),

  updateAlert: publicProcedure
    .input(z.object({
      userId: z.string(),
      alert: AlertSchema,
    }))
    .mutation(({ input }) => {
      const storage = ensureUserStorage(input.userId);
      const index = storage.alerts.findIndex(a => a.id === input.alert.id);
      if (index >= 0) {
        storage.alerts[index] = input.alert;
        return { success: true };
      }
      return { success: false, error: 'Alert not found' };
    }),

  deleteAlert: publicProcedure
    .input(z.object({ userId: z.string(), alertId: z.string() }))
    .mutation(({ input }) => {
      const storage = ensureUserStorage(input.userId);
      storage.alerts = storage.alerts.filter(a => a.id !== input.alertId);
      return { success: true };
    }),

  // === PORTFOLIO SUMMARY ===
  getSummary: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(({ input }) => {
      const storage = ensureUserStorage(input.userId);
      const holdings = storage.holdings;

      let totalValue = 0;
      let totalInvested = 0;

      holdings.forEach(h => {
        const currentValue = h.currentValue || (h.quantity * (h.currentPrice || h.purchasePrice));
        const investedValue = h.quantity * h.purchasePrice;
        totalValue += currentValue;
        totalInvested += investedValue;
      });

      const totalGain = totalValue - totalInvested;
      const totalGainPercent = totalInvested > 0 ? (totalGain / totalInvested) * 100 : 0;

      return {
        totalValue,
        totalInvested,
        totalGain,
        totalGainPercent,
        dayChange: 0, // Would need price history
        dayChangePercent: 0,
        holdingsCount: holdings.length,
      };
    }),

  // === ALLOCATION ===
  getAllocation: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(({ input }) => {
      const storage = ensureUserStorage(input.userId);
      const holdings = storage.holdings;

      const byAssetClass: Record<string, number> = {};
      const bySector: Record<string, number> = {};
      const byCountry: Record<string, number> = {};
      let totalValue = 0;

      holdings.forEach(h => {
        const value = h.currentValue || (h.quantity * (h.currentPrice || h.purchasePrice));
        totalValue += value;

        byAssetClass[h.assetClass] = (byAssetClass[h.assetClass] || 0) + value;
        if (h.sector) {
          bySector[h.sector] = (bySector[h.sector] || 0) + value;
        }
        if (h.country) {
          byCountry[h.country] = (byCountry[h.country] || 0) + value;
        }
      });

      const toAllocationArray = (data: Record<string, number>) => {
        return Object.entries(data).map(([label, value]) => ({
          label,
          value,
          percent: totalValue > 0 ? (value / totalValue) * 100 : 0,
        }));
      };

      return {
        byAssetClass: toAllocationArray(byAssetClass),
        bySector: toAllocationArray(bySector),
        byCountry: toAllocationArray(byCountry),
        totalValue,
      };
    }),
});
