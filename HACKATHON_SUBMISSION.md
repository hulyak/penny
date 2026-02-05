# Penny - Gemini 3 Hackathon Submission

---

## REQUIRED: Gemini Integration Description (~200 words)

Penny demonstrates Gemini 3's full capabilities beyond simple chat through five deeply integrated features:

**1. Vision API + Multimodal Understanding** - Users photograph brokerage statements and receipts. Gemini 3 extracts holdings from complex tables, charts, and text using genuine document understanding—not basic OCR. Each extraction includes confidence scores for reliability.

**2. Configurable Thinking Levels** - We dynamically adjust reasoning depth per task: `thinkingLevel: high` for document analysis requiring deep reasoning, `medium` for personalized voice coaching, and `low`/`minimal` for quick market tips. Users see which level is active, making AI reasoning fully transparent.

**3. Structured Output with Schema Validation** - Gemini returns type-safe JSON validated against Zod schemas. Holdings, confidence scores, and reasoning are programmatically reliable—production-grade integration, not prompt hacking.

**4. Streaming Responses** - Voice coaching uses streaming text generation spoken aloud via text-to-speech, creating fluid real-time conversational experiences with the AI.

**5. Autonomous Marathon Agent** - A background agent monitors portfolios 24/7, detecting allocation drift and sending proactive push notifications without user prompting. It learns from user response patterns to optimize future interventions. All agent actions are logged in a transparent Activity Feed.

Penny embodies Google's "Action Era" philosophy: AI that sees (camera), reasons at appropriate depth (thinking levels), and acts autonomously (imports holdings, sends alerts). It's not a chatbot wrapper—it's a true AI copilot.

---

## Inspiration

Most "AI apps" are chatbot wrappers. Text in, text out. We wanted to build something that showcases what Gemini 3 actually unlocks: **an AI that sees, reasons at different depths, and acts autonomously**.

The challenge we set ourselves: Can we build an app where Gemini 3 isn't just answering questions, but actively **watching**, **understanding documents**, and **taking actions** on behalf of users—without being asked?

We chose personal finance as our domain because it's:
- **Multimodal by nature** - statements, receipts, charts need vision
- **Reasoning-intensive** - risk analysis requires deep thinking
- **Action-oriented** - the AI should do things, not just explain

The result is Penny: an autonomous financial copilot that demonstrates Gemini 3's capabilities beyond chat.

## What it does

Penny showcases **five distinct Gemini 3 capabilities** working together:

### 1. Multimodal Vision + Document Understanding

Users photograph brokerage statements. Gemini 3 Vision extracts holdings from complex tables, text, and charts—understanding document structure, not just performing OCR.

```
Input: Photo of Fidelity statement
Output: Structured JSON with holdings, quantities, prices, confidence scores
```

### 2. Configurable Thinking Levels

We dynamically adjust `thinkingLevel` based on task complexity:

| Task | Thinking Level | Why |
|------|----------------|-----|
| Document analysis | `high` | Complex table extraction requires deep reasoning |
| Risk analysis | `high` | Portfolio diversification needs careful consideration |
| Voice coaching | `medium` | Balanced depth for conversational responses |
| Daily tips | `low` | Quick, contextual suggestions |
| Market updates | `minimal` | Speed over depth |

**Users see which level is active**, making AI reasoning transparent.

### 3. Structured Output with Confidence Scores

Gemini returns type-safe JSON validated against Zod schemas:

```typescript
const DocumentAnalysisSchema = z.object({
  holdings: z.array(z.object({
    name: z.string(),
    symbol: z.string().optional(),
    quantity: z.number(),
    price: z.number(),
    confidence: z.number().min(0).max(1), // AI's certainty
  })),
  reasoning: z.string(), // Explanation of extraction logic
});
```

This isn't prompt engineering—it's **production-grade AI integration**.

### 4. Autonomous Marathon Agent

The AI doesn't wait for user prompts. It:
- Monitors portfolios continuously in background
- Detects allocation drift from user goals
- Sends proactive push notifications
- Learns from user response patterns to optimize intervention timing
- Logs every action in a transparent Activity Feed

This embodies Google's "**Action Era**" philosophy—AI that acts, not just responds.

### 5. Real-Time Voice Coaching

Streaming Gemini responses are spoken aloud via text-to-speech. Users literally "talk to their money" and hear personalized coaching based on their actual portfolio data.

## How we built it

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         PENNY APP                           │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Camera    │  │ Voice Input │  │  Background Agent   │  │
│  │  (Vision)   │  │  (Audio)    │  │   (Autonomous)      │  │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘  │
│         │                │                     │             │
│         ▼                ▼                     ▼             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              GEMINI 3 INTEGRATION LAYER                │ │
│  │  ┌──────────────────────────────────────────────────┐  │ │
│  │  │  thinkingLevel: 'minimal'|'low'|'medium'|'high'  │  │ │
│  │  └──────────────────────────────────────────────────┘  │ │
│  │  • Vision API (document/receipt analysis)              │ │
│  │  • Structured Output (Zod schema validation)           │ │
│  │  • Streaming (voice coaching)                          │ │
│  │  • Retry with exponential backoff                      │ │
│  └────────────────────────────────────────────────────────┘ │
│         │                │                     │             │
│         ▼                ▼                     ▼             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  Portfolio  │  │   Alerts    │  │   Agent Activity    │  │
│  │   Import    │  │   & Tips    │  │       Log           │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Tech Stack

- **Frontend**: React Native + Expo (iOS/Android)
- **AI**: Gemini 3 Flash Preview (`gemini-3-flash-preview`)
- **Observability**: Opik for LLM tracing and evaluation
- **Auth**: Firebase Authentication
- **Storage**: AsyncStorage + Firebase
- **Background Tasks**: expo-background-fetch + expo-task-manager

### Gemini 3 API Integration

```typescript
// Dynamic thinking level selection
const result = await generateStructuredWithGemini({
  prompt: documentAnalysisPrompt,
  schema: DocumentAnalysisSchema,
  image: base64Image,           // Multimodal input
  thinkingLevel: 'high',        // Deep reasoning for complex docs
  temperature: 0.2,             // Low temp for accuracy
});

// Streaming for voice responses
await streamWithGemini({
  prompt: coachingPrompt,
  thinkingLevel: 'medium',
  onChunk: (text) => appendToUI(text),
  onComplete: (full) => speakAloud(full),
});
```

### Autonomous Agent Loop

```typescript
// Runs every hour when app is active + background fetch
async function runAgentLoop() {
  const holdings = await loadPortfolio();
  const goals = await getUserGoals();

  // Decision 1: Check allocation drift
  const drift = calculateDrift(holdings, goals.targetAllocation);
  if (drift > THRESHOLD && shouldIntervene(state)) {
    const message = await generateWithGemini({
      prompt: `Portfolio drifted: ${drift}. Write encouraging notification.`,
      thinkingLevel: 'minimal', // Quick generation
    });
    await sendPushNotification('Portfolio Drift', message);
    await logIntervention({ type: 'drift_alert', message });
  }

  // Learn from user responses to optimize future interventions
  state.userResponseRate = calculateResponseRate(recentInterventions);
}
```

## Challenges we ran into

1. **Thinking level trade-offs** - `high` gives better document extraction but is slower. We benchmarked each task and chose levels that balance quality/speed appropriately.

2. **Structured output reliability** - Gemini occasionally returns malformed JSON. We built auto-correction logic for common issues (case normalization, array parsing) before Zod validation.

3. **Making autonomy trustworthy** - Users fear AI acting without permission. The Activity Log shows every agent decision with full reasoning, building trust through transparency.

4. **Multimodal prompt engineering** - Document extraction required iterative prompt refinement. Adding "extract EVERY holding, even if partially visible" dramatically improved recall.

## Accomplishments that we're proud of

### This is NOT a chatbot wrapper

| Typical AI App | Penny |
|----------------|-------|
| Text → Text | Camera → Structured Data → Portfolio Import |
| Single reasoning mode | 4 thinking levels, task-appropriate |
| Reactive (waits for input) | Proactive (autonomous monitoring) |
| Generic responses | Type-safe JSON with confidence scores |
| Opaque | Transparent agent activity log |

### Gemini 3 Features Demonstrated

- ✅ Vision API (document + receipt scanning)
- ✅ Configurable Thinking Levels (minimal → high)
- ✅ Structured Output with schema validation
- ✅ Streaming responses (voice coaching)
- ✅ Autonomous agent behavior

### Production Quality

- Exponential backoff retry logic
- Response caching (5 min TTL)
- LLM observability via Opik tracing
- Parallel API calls for speed
- Demo mode for instant judge access

## What we learned

1. **Thinking levels are transformative** - The ability to dial reasoning depth per task unlocks new architectures. Document analysis *needs* `high`; quick tips work fine with `low`.

2. **Multimodal is underexplored** - Most hackathon projects treat Gemini as a text API. Vision + structured output creates "magical" UX (scan → import).

3. **Autonomous AI needs transparency** - The Activity Log was initially an afterthought. It became essential for user trust. Show users what the AI did and why.

4. **Structured output > free-form text** - For any action-oriented AI, typed JSON beats parsing prose. Gemini 3 handles schemas remarkably well.

## What's next for Penny

- **Gemini Live API** - Full duplex voice for true conversational coaching
- **Multi-agent architecture** - Specialized agents for spending, investing, risk
- **Deeper multimodal** - Video analysis of portfolio review sessions
- **Fine-tuning** - Domain-specific model for financial document extraction

---

## Judging Criteria Alignment

| Criteria | Weight | How Penny Delivers |
|----------|--------|-------------------|
| **Technical Execution** | 40% | 5 Gemini 3 features, production-quality code, Zod schemas, observability |
| **Innovation / Wow Factor** | 30% | Autonomous agent, configurable thinking, multimodal document import |
| **Potential Impact** | 20% | Real problem (fragmented portfolios), broad market (any investor) |
| **Presentation / Demo** | 10% | Demo mode, architecture diagram, transparent AI reasoning |

---

## Gemini 3 Integration Summary (~200 words)

Penny demonstrates Gemini 3's capabilities beyond simple chat through five integrated features:

**1. Vision API** - Users photograph brokerage statements and receipts. Gemini 3 extracts holdings from complex tables and text using genuine document understanding, not OCR. Each extraction includes confidence scores.

**2. Configurable Thinking Levels** - We use `thinkingLevel: high` for document analysis requiring deep reasoning, `medium` for voice coaching, and `low`/`minimal` for quick tips. Users see which level is active, making AI reasoning transparent.

**3. Structured Output** - Gemini returns type-safe JSON validated against Zod schemas. Holdings, confidence scores, and reasoning are programmatically reliable—not prompt hacking.

**4. Streaming** - Voice coaching uses streaming responses spoken via text-to-speech, creating real-time conversational experiences.

**5. Autonomous Agent** - A background agent monitors portfolios 24/7, detecting drift and sending proactive alerts without user prompting. It learns from response patterns to optimize interventions. All actions are logged transparently.

Penny embodies the "Action Era" philosophy: AI that sees (camera), reasons (thinking levels), and acts (imports holdings, sends alerts) autonomously. It's not a chatbot wrapper—it's a copilot.

---

## Demo Access

**For Hackathon Judges**: Tap "Demo Mode" on the login screen to instantly access a pre-loaded portfolio with all features unlocked. No signup required.
