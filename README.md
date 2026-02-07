# PENNY - Portfolio Aggregation & Intelligence Platform

A unified portfolio tracking app for investors who manage assets across multiple platforms. Built with React Native, Expo, and Gemini 3.

## What is PENNY?

PENNY brings all your investments into one place — stocks, bonds, ETFs, crypto, gold, real estate, and alternatives — and surfaces the insights that matter.

### Features

- **Document Scanning** — Photograph brokerage statements and extract holdings automatically using Gemini 3 Vision
- **Universal Portfolio** — Track all asset classes in a single dashboard with real-time pricing
- **AI Financial Advisor** — Ask Penny questions about your portfolio via text or voice
- **Diversification Analysis** — Country exposure, sector breakdown, concentration risk detection
- **Voice Coaching** — Real-time streaming voice responses powered by Gemini 3
- **Background Agent** — Proactive portfolio monitoring with drift alerts and push notifications
- **Tax Loss Harvesting** — Identify opportunities to harvest losses for tax efficiency
- **Rebalancing Alerts** — Get notified when your portfolio drifts from target allocation
- **Loan & Dividend Tracking** — Track loans against holdings and dividend income
- **PDF Reports** — Export portfolio reports as PDF
- **AI Observability** — Opik integration for monitoring all AI calls

## Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend | React Native + Expo |
| Routing | Expo Router (file-based) |
| AI Engine | Gemini 3 Flash Preview |
| Monetization | RevenueCat |
| Authentication | Firebase Authentication |
| Storage | AsyncStorage + Firebase |
| Background Tasks | expo-background-fetch + expo-task-manager |
| Voice | ElevenLabs TTS |
| Observability | Opik |
| Schema Validation | Zod |

## Gemini 3 Integration

PENNY uses five Gemini 3 capabilities:

1. **Vision API** — Document and receipt scanning with semantic understanding
2. **Configurable Thinking Levels** — Minimal, low, medium, high reasoning depth matched to task
3. **Structured Output** — Type-safe JSON responses with Zod schema validation
4. **Streaming Responses** — Real-time voice coaching
5. **Background Agent** — Autonomous portfolio monitoring and proactive notifications

## Project Structure

```
app/                          # Screens (Expo Router)
├── (tabs)/                   # Tab navigation
│   ├── index.tsx             # Home / Overview
│   ├── portfolio.tsx         # Portfolio dashboard
│   ├── profile.tsx           # User profile
│   └── creator/              # Creator Hub
├── portfolio/
│   ├── [id].tsx              # Holding detail
│   ├── ai-insights.tsx       # AI portfolio insights
│   ├── analysis.tsx          # Portfolio analysis
│   ├── receipt-scan.tsx      # Receipt scanning
│   ├── statement-parse.tsx   # Statement parsing
│   ├── voice-coach.tsx       # Voice coaching
│   ├── tax-loss.tsx          # Tax loss harvesting
│   ├── loans.tsx             # Loan tracking
│   ├── subscription.tsx      # Subscription management
│   └── add-dividend.tsx      # Dividend tracking
├── ask-penny.tsx             # AI chat
├── auth.tsx                  # Authentication
└── _layout.tsx               # Root layout

lib/                          # Services
├── gemini.ts                 # Gemini 3 integration
├── portfolioService.ts       # Portfolio data management
├── priceService.ts           # Real-time price feeds
├── agentLoop.ts              # Background agent
├── portfolioCoach.ts         # AI coaching
├── rebalanceService.ts       # Rebalancing logic
├── taxLossHarvesting.ts      # Tax loss harvesting
├── pdfExport.ts              # PDF report generation
├── elevenLabs.ts             # Voice TTS
├── binanceService.ts         # Crypto pricing
├── marketEvents.ts           # Market event tracking
└── opik.ts                   # AI observability

components/                   # Reusable components
├── PaywallModal.tsx          # Subscription paywall
├── CelebrationModal.tsx      # Achievement celebrations
├── PortfolioCoachCard.tsx    # Coach recommendations
├── RebalanceCard.tsx         # Rebalancing suggestions
├── StockChart.tsx            # Price charts
└── ui/                       # UI primitives

context/
└── PurchasesContext.tsx       # RevenueCat subscription state
```

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npx expo start

# Run on iOS simulator
npx expo start --ios

# Build for web
npx expo export --platform web
```
