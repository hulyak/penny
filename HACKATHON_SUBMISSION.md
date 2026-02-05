# Penny - Gemini 3 Hackathon Submission

---

## REQUIRED: Gemini Integration Description (~200 words)

Penny uses five Gemini 3 features together:

**1. Vision API + Multimodal Understanding** - Users photograph brokerage statements and receipts. Gemini 3 extracts holdings from tables, charts, and text—parsing document structure, not running OCR. Each extraction includes confidence scores.

**2. Configurable Thinking Levels** - I set `thinkingLevel: high` for document analysis, `medium` for voice coaching, and `low`/`minimal` for quick tips. The UI shows which level is active.

**3. Structured Output with Schema Validation** - Gemini returns type-safe JSON validated against Zod schemas. Holdings, confidence scores, and reasoning are programmatically reliable.

**4. Streaming Responses** - Voice coaching streams text generation to text-to-speech, so users hear responses as they generate.

**5. Autonomous Marathon Agent** - A background agent monitors portfolios 24/7, detects allocation drift, and sends push notifications without user prompting. It learns from response patterns to adjust intervention timing. All actions appear in an Activity Feed.

Penny follows Google's "Action Era" concept: AI that sees (camera), reasons at variable depth (thinking levels), and acts without prompting (imports holdings, sends alerts). Not a chatbot wrapper—a background copilot.

---

## Inspiration

Most AI apps are chat wrappers. Text in, text out. I built an app where Gemini 3 watches documents, reasons at different depths, and takes actions without being asked.

I picked personal finance because it needs:
- **Multimodal input** - statements, receipts, charts require vision
- **Variable reasoning** - risk analysis needs depth; market updates need speed
- **Autonomous action** - the AI should do things, not just explain

Penny is a financial copilot that uses Gemini 3 for more than conversation.

## What it does

Penny combines five Gemini 3 features:

### 1. Multimodal Vision + Document Understanding

Users photograph brokerage statements. Gemini 3 Vision extracts holdings from tables, text, and charts by parsing document structure.

```
Input: Photo of Fidelity statement
Output: Structured JSON with holdings, quantities, prices, confidence scores
```

### 2. Configurable Thinking Levels

I adjust `thinkingLevel` by task:

| Task | Thinking Level | Reason |
|------|----------------|--------|
| Document analysis | `high` | Table extraction needs deep reasoning |
| Risk analysis | `high` | Diversification scoring needs careful evaluation |
| Voice coaching | `medium` | Conversational depth without latency |
| Daily tips | `low` | Fast contextual suggestions |
| Market updates | `minimal` | Speed matters more than depth |

The UI shows which level is active.

### 3. Structured Output with Confidence Scores

Gemini returns type-safe JSON validated against Zod schemas:

```typescript
const DocumentAnalysisSchema = z.object({
  holdings: z.array(z.object({
    name: z.string(),
    symbol: z.string().optional(),
    quantity: z.number(),
    price: z.number(),
    confidence: z.number().min(0).max(1),
  })),
  reasoning: z.string(),
});
```

This is schema-validated integration, not string parsing.

### 4. Autonomous Marathon Agent

The AI runs without user prompts:
- Monitors portfolios in background
- Detects allocation drift from user goals
- Sends proactive push notifications
- Learns from user response patterns to adjust timing
- Logs every action in an Activity Feed

This follows Google's "Action Era" framing—AI that acts, not just responds.

### 5. Real-Time Voice Coaching

Streaming Gemini responses play through text-to-speech. Users speak to the app and hear coaching based on their portfolio data.

## How I built it

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
- **Observability**: Opik for LLM tracing
- **Auth**: Firebase Authentication
- **Storage**: AsyncStorage + Firebase
- **Background Tasks**: expo-background-fetch + expo-task-manager

### Gemini 3 API Integration

```typescript
// Dynamic thinking level selection
const result = await generateStructuredWithGemini({
  prompt: documentAnalysisPrompt,
  schema: DocumentAnalysisSchema,
  image: base64Image,
  thinkingLevel: 'high',
  temperature: 0.2,
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
async function runAgentLoop() {
  const holdings = await loadPortfolio();
  const goals = await getUserGoals();

  const drift = calculateDrift(holdings, goals.targetAllocation);
  if (drift > THRESHOLD && shouldIntervene(state)) {
    const message = await generateWithGemini({
      prompt: `Portfolio drifted: ${drift}. Write encouraging notification.`,
      thinkingLevel: 'minimal',
    });
    await sendPushNotification('Portfolio Drift', message);
    await logIntervention({ type: 'drift_alert', message });
  }

  state.userResponseRate = calculateResponseRate(recentInterventions);
}
```

## Challenges I ran into

1. **Thinking level trade-offs** - `high` improves document extraction but adds latency. I benchmarked each task and picked levels that balance quality and speed.

2. **Structured output reliability** - Gemini sometimes returns malformed JSON. I added auto-correction for common issues (case normalization, array parsing) before Zod validation.

3. **Autonomous trust** - Users distrust AI acting without permission. The Activity Log shows every agent decision with reasoning.

4. **Multimodal prompt tuning** - Document extraction needed prompt iteration. Adding "extract EVERY holding, even if partially visible" improved recall.

## Accomplishments

### Not a chatbot wrapper

| Typical AI App | Penny |
|----------------|-------|
| Text → Text | Camera → Structured Data → Portfolio Import |
| Single reasoning mode | 4 thinking levels per task |
| Reactive (waits for input) | Proactive (autonomous monitoring) |
| Generic responses | Type-safe JSON with confidence scores |
| Opaque | Transparent agent activity log |

### Gemini 3 Features Used

- Vision API (document + receipt scanning)
- Configurable Thinking Levels (minimal → high)
- Structured Output with schema validation
- Streaming responses (voice coaching)
- Autonomous agent behavior

### Production Details

- Exponential backoff retry logic
- Response caching (5 min TTL)
- LLM observability via Opik
- Parallel API calls
- Demo mode for judge access

## What I learned

1. **Thinking levels change architecture** - Variable reasoning depth lets you match compute to task. Document analysis needs `high`; tips work with `low`.

2. **Multimodal is underused** - Most projects treat Gemini as text-only. Vision + structured output enables scan-to-import flows.

3. **Autonomous AI needs logs** - The Activity Log started as a debug tool. It became the main trust mechanism.

4. **Structured output beats text parsing** - For action-oriented AI, typed JSON is more reliable than parsing prose.

## What's next for Penny

- **Gemini Live API** - Full duplex voice for conversational coaching
- **Multi-agent architecture** - Separate agents for spending, investing, risk
- **Video analysis** - Process portfolio review recordings
- **Fine-tuning** - Domain-specific model for financial documents

---

## Judging Criteria Alignment

| Criteria | Weight | How Penny Addresses It |
|----------|--------|------------------------|
| **Technical Execution** | 40% | 5 Gemini 3 features, Zod schemas, Opik observability |
| **Innovation** | 30% | Autonomous agent, configurable thinking, multimodal import |
| **Potential Impact** | 20% | Solves portfolio fragmentation for any investor |
| **Presentation** | 10% | Demo mode, architecture diagram, visible AI reasoning |

---

## Demo Access

Tap "Demo Mode" on the login screen. Pre-loaded portfolio, all features unlocked, no signup.
