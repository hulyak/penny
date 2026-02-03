# Penny - Portfolio Tracker Expansion Plan

## Overview
Expand Penny from an AI Finance Coach to a comprehensive portfolio tracking and analysis platform.

---

## 1. Database Schema Design

### New Firestore Structure

```
users/{userId}/
├── data/
│   ├── financials (existing)
│   ├── learning (existing)
│   ├── goals (existing)
│   └── coach (existing)
│
└── portfolio/
    ├── settings (doc)
    │   {
    │     defaultCurrency: "USD",
    │     riskTolerance: "moderate",
    │     notifications: { priceAlerts: true, reminders: true },
    │     premiumTier: "free" | "premium",
    │     createdAt: timestamp,
    │     updatedAt: timestamp
    │   }
    │
    ├── holdings (subcollection)
    │   └── {holdingId}/
    │       {
    │         id: string,
    │         type: "stock" | "etf" | "mutual_fund" | "bond" | "gold" |
    │               "real_estate" | "fixed_deposit" | "crypto" | "cash" | "other",
    │
    │         // Common fields
    │         name: string,
    │         symbol?: string,          // For listed assets
    │         quantity: number,
    │         purchasePrice: number,
    │         purchaseDate: timestamp,
    │         currency: string,
    │
    │         // Current value (updated by system)
    │         currentPrice?: number,
    │         currentValue?: number,
    │         lastPriceUpdate?: timestamp,
    │
    │         // For non-listed assets (real estate, FD, etc.)
    │         isManualPricing: boolean,
    │         maturityDate?: timestamp,
    │         interestRate?: number,
    │
    │         // Categorization
    │         sector?: string,
    │         country?: string,
    │         assetClass: "equity" | "debt" | "commodity" | "real_asset" | "cash",
    │
    │         // Metadata
    │         notes?: string,
    │         tags?: string[],
    │         createdAt: timestamp,
    │         updatedAt: timestamp
    │       }
    │
    ├── transactions (subcollection)
    │   └── {transactionId}/
    │       {
    │         id: string,
    │         holdingId: string,
    │         type: "buy" | "sell" | "dividend" | "interest" | "split",
    │         quantity: number,
    │         price: number,
    │         fees?: number,
    │         date: timestamp,
    │         notes?: string,
    │         createdAt: timestamp
    │       }
    │
    ├── alerts (subcollection)
    │   └── {alertId}/
    │       {
    │         id: string,
    │         holdingId?: string,
    │         type: "price_above" | "price_below" | "maturity" | "reminder",
    │         targetValue?: number,
    │         targetDate?: timestamp,
    │         message: string,
    │         isActive: boolean,
    │         lastTriggered?: timestamp,
    │         createdAt: timestamp
    │       }
    │
    └── snapshots (subcollection)  // Daily portfolio snapshots for history
        └── {date}/
            {
              date: string,           // "2024-01-15"
              totalValue: number,
              holdings: { [holdingId]: { value: number, quantity: number } },
              allocation: { byAssetClass: {}, bySector: {}, byCountry: {} },
              createdAt: timestamp
            }
```

### TypeScript Types

```typescript
// types/portfolio.ts

export type AssetType =
  | 'stock'
  | 'etf'
  | 'mutual_fund'
  | 'bond'
  | 'gold'
  | 'real_estate'
  | 'fixed_deposit'
  | 'crypto'
  | 'cash'
  | 'other';

export type AssetClass = 'equity' | 'debt' | 'commodity' | 'real_asset' | 'cash';

export interface Holding {
  id: string;
  type: AssetType;
  name: string;
  symbol?: string;
  quantity: number;
  purchasePrice: number;
  purchaseDate: string;
  currency: string;

  // Pricing
  currentPrice?: number;
  currentValue?: number;
  lastPriceUpdate?: string;
  isManualPricing: boolean;

  // For fixed income / real estate
  maturityDate?: string;
  interestRate?: number;

  // Categorization
  sector?: string;
  country?: string;
  assetClass: AssetClass;

  // Metadata
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
  type: 'price_above' | 'price_below' | 'maturity' | 'reminder';
  targetValue?: number;
  targetDate?: string;
  message: string;
  isActive: boolean;
  lastTriggered?: string;
  createdAt: string;
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

export interface PortfolioAnalysis {
  totalValue: number;
  totalGain: number;
  totalGainPercent: number;
  dayChange: number;
  dayChangePercent: number;

  allocation: {
    byAssetClass: { class: AssetClass; value: number; percent: number }[];
    bySector: { sector: string; value: number; percent: number }[];
    byCountry: { country: string; value: number; percent: number }[];
  };

  riskMetrics: {
    diversificationScore: number;  // 0-100
    concentrationRisk: string[];   // Holdings > 20%
    countryExposure: string[];     // Countries > 30%
    sectorExposure: string[];      // Sectors > 30%
  };

  recommendations: string[];
}
```

---

## 2. API Integration Strategy

### Recommended APIs by Asset Type

| Asset Type | Primary API | Backup API | Cost |
|------------|-------------|------------|------|
| US/Global Stocks | Finnhub | Alpha Vantage | Free |
| Indian Stocks | - | - | Future |
| ETFs | Finnhub | MarketStack | Free |
| Mutual Funds (India) | MFapi.in | Captnemo | Free |
| Crypto | CoinGecko | CoinAPI | Free |
| Gold/Silver | Metals-API | GoldAPI.io | Free |
| Currency Rates | ExchangeRate-API | Fixer | Free |

### API Configuration

```typescript
// lib/priceService.ts

export const PRICE_APIS = {
  stocks: {
    provider: 'finnhub',
    apiKey: process.env.EXPO_PUBLIC_FINNHUB_API_KEY,
    baseUrl: 'https://finnhub.io/api/v1',
    rateLimit: 60, // calls per minute
    cacheDuration: 60000, // 1 minute
  },
  crypto: {
    provider: 'coingecko',
    baseUrl: 'https://api.coingecko.com/api/v3',
    rateLimit: 30,
    cacheDuration: 60000,
  },
  mutualFunds: {
    provider: 'mfapi',
    baseUrl: 'https://api.mfapi.in/mf',
    rateLimit: 100,
    cacheDuration: 86400000, // 24 hours (NAV updates daily)
  },
  metals: {
    provider: 'metals-api',
    apiKey: process.env.EXPO_PUBLIC_METALS_API_KEY,
    baseUrl: 'https://metals-api.com/api',
    rateLimit: 10,
    cacheDuration: 600000, // 10 minutes
  },
  forex: {
    provider: 'exchangerate-api',
    baseUrl: 'https://api.exchangerate-api.com/v4',
    rateLimit: 100,
    cacheDuration: 3600000, // 1 hour
  },
};
```

### Environment Variables to Add

```env
# Price APIs
EXPO_PUBLIC_FINNHUB_API_KEY=your_finnhub_key
EXPO_PUBLIC_METALS_API_KEY=your_metals_api_key

# Optional paid upgrades
EXPO_PUBLIC_EODHD_API_KEY=your_eodhd_key
EXPO_PUBLIC_COINGECKO_PRO_KEY=your_coingecko_pro_key
```

---

## 3. Feature Roadmap

### Phase 1: Core Portfolio Tracking (MVP)
**Timeline: 2-3 weeks**

- [ ] Database schema implementation
- [ ] Add holding CRUD operations
- [ ] Manual price entry for all assets
- [ ] Basic portfolio dashboard
  - Total value
  - Holdings list
  - Simple pie chart (by asset type)
- [ ] Transaction logging (buy/sell)

### Phase 2: Live Price Integration
**Timeline: 2 weeks**

- [ ] Finnhub integration (stocks/ETFs)
- [ ] CoinGecko integration (crypto)
- [ ] MFapi integration (mutual funds)
- [ ] Metals-API integration (gold/silver)
- [ ] Price caching layer
- [ ] Background price refresh
- [ ] Pull-to-refresh on dashboard

### Phase 3: Alerts & Reminders
**Timeline: 1-2 weeks**

- [ ] Price alerts (above/below threshold)
- [ ] Maturity reminders (FDs, bonds)
- [ ] Push notifications (Expo Notifications)
- [ ] Alert management UI

### Phase 4: Analysis & Insights (Premium)
**Timeline: 2-3 weeks**

- [ ] Diversification analysis
  - Asset class breakdown
  - Sector exposure
  - Country/region exposure
- [ ] Risk metrics
  - Concentration warnings
  - Correlation analysis
- [ ] AI-powered recommendations (Gemini)
- [ ] Historical performance charts
- [ ] Gain/loss reports

### Phase 5: Premium Features
**Timeline: 2 weeks**

- [ ] RevenueCat integration
- [ ] Premium tier gating
- [ ] Export reports (PDF/CSV)
- [ ] Multiple portfolios
- [ ] Family/shared portfolios
- [ ] Tax harvesting suggestions

---

## 4. New Screens & Components

### Screen Structure

```
app/
├── (tabs)/
│   ├── portfolio/
│   │   ├── index.tsx          # Portfolio dashboard
│   │   ├── add.tsx            # Add new holding
│   │   ├── [id].tsx           # Holding details
│   │   ├── edit/[id].tsx      # Edit holding
│   │   ├── analysis.tsx       # Diversification analysis (premium)
│   │   └── alerts.tsx         # Manage alerts
│   └── ...existing tabs
```

### Key Components

```
components/
├── portfolio/
│   ├── HoldingCard.tsx        # Single holding display
│   ├── HoldingsList.tsx       # Scrollable holdings
│   ├── AddHoldingForm.tsx     # Multi-step add form
│   ├── AssetTypePicker.tsx    # Asset type selector
│   ├── PriceDisplay.tsx       # Live/manual price
│   ├── AllocationChart.tsx    # Pie/donut chart
│   ├── PerformanceChart.tsx   # Line chart (history)
│   ├── RiskGauge.tsx          # Risk score visualization
│   ├── AlertItem.tsx          # Single alert
│   └── TransactionItem.tsx    # Single transaction
```

---

## 5. Premium Tier Structure

### Free Tier
- Up to 10 holdings
- Manual price entry
- Basic portfolio view
- 1 price alert

### Premium Tier ($4.99/month or $39.99/year)
- Unlimited holdings
- Real-time prices
- Unlimited alerts
- Diversification analysis
- Risk metrics
- AI recommendations
- Export reports
- Multiple portfolios
- Priority support

---

## 6. Technical Implementation Notes

### Price Update Strategy

```typescript
// Batched price updates to respect rate limits
async function updatePrices(holdings: Holding[]) {
  const batches = {
    stocks: holdings.filter(h => ['stock', 'etf'].includes(h.type)),
    crypto: holdings.filter(h => h.type === 'crypto'),
    funds: holdings.filter(h => h.type === 'mutual_fund'),
    metals: holdings.filter(h => h.type === 'gold'),
  };

  // Process in parallel with rate limiting
  await Promise.all([
    updateStockPrices(batches.stocks),
    updateCryptoPrices(batches.crypto),
    updateFundPrices(batches.funds),
    updateMetalPrices(batches.metals),
  ]);
}
```

### Caching Strategy

```typescript
// Use React Query with stale-while-revalidate
const { data: prices } = useQuery({
  queryKey: ['prices', holdingIds],
  queryFn: fetchPrices,
  staleTime: 60000,      // 1 minute
  cacheTime: 300000,     // 5 minutes
  refetchInterval: 60000, // Auto-refresh every minute
});
```

### Offline Support

```typescript
// Persist last known prices to AsyncStorage
async function cachePrices(prices: Record<string, number>) {
  await AsyncStorage.setItem('cached_prices', JSON.stringify({
    prices,
    timestamp: Date.now(),
  }));
}

// Load cached prices when offline
async function loadCachedPrices() {
  const cached = await AsyncStorage.getItem('cached_prices');
  if (cached) {
    const { prices, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp < 86400000) { // 24 hours
      return prices;
    }
  }
  return null;
}
```

---

## 7. AI Integration for Analysis

### Gemini Prompts

```typescript
// Risk analysis prompt
const riskAnalysisPrompt = `
Analyze this portfolio for risk and diversification:

Holdings:
${holdings.map(h => `- ${h.name}: ${h.currentValue} (${h.assetClass}, ${h.sector}, ${h.country})`).join('\n')}

Total Value: ${totalValue}

Provide:
1. Diversification score (0-100)
2. Top 3 concentration risks
3. 3 specific recommendations to improve the portfolio
4. Any red flags to watch

Format as JSON.
`;
```

---

## 8. Estimated Costs

### Development (Free Tier APIs)
- Finnhub: Free (60 calls/min)
- CoinGecko: Free (30 calls/min)
- MFapi.in: Free (unlimited)
- ExchangeRate-API: Free
- **Total: $0/month**

### Production (Moderate Usage)
- Finnhub: Free or $50/month
- CoinGecko: Free or $129/month
- Metals-API: $15/month
- **Total: $15-194/month**

### Revenue Potential
- 1000 premium users × $4.99 = $4,990/month
- Break-even at ~40 premium users

---

## Next Steps

1. [ ] Review and approve this plan
2. [ ] Set up Finnhub API key
3. [ ] Create portfolio types in `/types/portfolio.ts`
4. [ ] Implement Firestore helpers for portfolio
5. [ ] Build basic Add Holding screen
6. [ ] Build Portfolio Dashboard

Ready to start implementation?
