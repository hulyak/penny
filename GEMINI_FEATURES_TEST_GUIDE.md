# Gemini 3 Features - Test Guide

Use this guide to test every Gemini 3 feature in Penny.

---

## Quick Start

1. Open the app
2. Tap **"Demo Mode"** on login screen (loads sample portfolio, unlocks premium)
3. Follow the tests below

---

## Feature 1: Document Scanning (Vision API + Thinking Level: High)

**Location:** Portfolio tab → Camera icon in header (or empty state "Scan Your Statement" card)

**How to test:**
1. Go to Portfolio tab
2. Tap the camera icon (blue, top right)
3. Either take a photo of a brokerage statement OR pick an image from gallery
4. Watch the "Agent Reasoning" card show steps:
   - "Analyzing document type..."
   - "Extracting text and tables..."
   - "Gemini 3 reasoning (thinking: high)..."
5. See extracted holdings with confidence scores
6. Select holdings and tap "Import"

**What to verify:**
- [ ] Camera opens
- [ ] Image can be captured or selected from gallery
- [ ] Agent reasoning steps appear
- [ ] "thinking: high" badge is visible
- [ ] Holdings are extracted with confidence percentages
- [ ] Import adds holdings to portfolio

---

## Feature 2: Receipt Scanning (Vision API + Thinking Level: High)

**Location:** Home tab → Quick Actions → "Receipt" button

**How to test:**
1. Go to Home tab
2. Scroll to Quick Actions row
3. Tap "Receipt" (gold icon)
4. Take a photo of any receipt OR pick from gallery
5. Watch agent reasoning steps
6. See extracted merchant, items, totals, category

**What to verify:**
- [ ] Camera opens
- [ ] Agent reasoning shows "thinking: high"
- [ ] Merchant name extracted
- [ ] Category detected (groceries, dining, etc.)
- [ ] Line items extracted with prices
- [ ] Budget insight generated
- [ ] "Log Expense" button works

---

## Feature 3: Voice Coaching (Streaming + Thinking Level: Medium)

**Location:** Home tab → Quick Actions → "Voice" button

**How to test:**
1. Go to Home tab
2. Tap "Voice" (blue mic icon)
3. See Gemini 3 feature card with "Thinking: medium"
4. Try quick question buttons: "Portfolio health?", "Am I diversified?", "Asset allocation"
5. Or hold the mic button to speak (simulated in demo)
6. Watch streaming response appear word by word
7. Hear response spoken aloud (if not muted)

**What to verify:**
- [ ] Welcome message appears and speaks
- [ ] Quick question buttons work
- [ ] Response streams in real-time (not all at once)
- [ ] Text-to-speech plays response
- [ ] Mute button stops speech
- [ ] Portfolio context is used in responses

---

## Feature 4: AI Portfolio Coach (Thinking Level: Medium + Low)

**Location:** Home tab → Portfolio Coach Card (top of screen)

**How to test:**
1. Go to Home tab (with holdings loaded via demo mode)
2. See the coach card with mascot
3. Check for:
   - Personalized greeting based on portfolio
   - Daily tip with "Gemini 3" badge
   - Insights count (tap to expand)

**What to verify:**
- [ ] Greeting mentions portfolio value or holdings
- [ ] "Today's Focus" tip appears
- [ ] Gemini 3 badge visible on tip card
- [ ] Insights toggle shows/hides insight cards
- [ ] Each insight has appropriate icon

---

## Feature 5: AI Insights Screen (Thinking Level: Medium)

**Location:** Home tab → Quick Actions → "AI Coach" button

**How to test:**
1. Tap "AI Coach" (purple sparkle icon)
2. View dedicated AI insights page
3. See Gemini 3 branding in header

**What to verify:**
- [ ] Screen opens
- [ ] Gemini 3 badge in header
- [ ] AI-generated insights display

---

## Feature 6: Autonomous Agent + Activity Log

**Location:** Home tab → "Agent Activity" card (if holdings exist) OR Portfolio tab → "Agent" button

**How to test:**
1. Go to Home tab (agent card appears below coach card if you have holdings)
2. Or go to Portfolio tab → AI Features row → "Agent" button
3. See agent status: "Active" with green dot
4. View recent interventions (drift alerts, reminders, etc.)
5. Tap "Run Now" to trigger agent check manually

**What to verify:**
- [ ] Agent shows "Active" status
- [ ] "Run Now" button triggers agent loop
- [ ] Activity log shows past interventions
- [ ] Each intervention has type icon and timestamp
- [ ] Stats show: weekly count, response rate, active types
- [ ] "Adaptive Learning" card explains agent behavior

---

## Feature 7: Portfolio Analysis (Thinking Level: High)

**Location:** Portfolio tab → "Portfolio Insights" card → tap to open

**How to test:**
1. Go to Portfolio tab
2. Tap "Portfolio Insights" card
3. View diversification analysis
4. See AI-generated recommendations

**What to verify:**
- [ ] Allocation breakdown displays
- [ ] Diversification score calculated
- [ ] AI recommendations appear
- [ ] Premium badge shows for non-premium users

---

## Feature 8: Structured Output (Throughout App)

**Where it's used:**
- Document scanning → holdings extracted as JSON
- Receipt scanning → items extracted as JSON
- Portfolio coach → insights returned as typed objects
- Agent loop → intervention decisions structured

**How to verify:**
- Check console logs for `[Gemini]` entries
- Extracted data appears in UI correctly (not as raw text)
- Confidence scores are numbers (0-1)

---

## Feature 9: Configurable Thinking Levels

**Where each level is used:**

| Level | Feature | Location |
|-------|---------|----------|
| `high` | Document scan | Portfolio → Camera |
| `high` | Receipt scan | Home → Receipt |
| `high` | Portfolio analysis | Portfolio → Insights |
| `medium` | Voice coaching | Home → Voice |
| `medium` | Portfolio greeting | Home → Coach card |
| `low` | Daily tips | Home → Coach card |
| `minimal` | Agent notifications | Background |

**How to verify:**
- Look for "thinking: high/medium/low" badges in UI
- Check Agent Reasoning cards during scans

---

## Feature 10: Demo Mode (Judge Access)

**Location:** Login screen

**How to test:**
1. Open app (logged out)
2. See "HACKATHON JUDGES" section with sparkle icon
3. Tap "Enter Demo Mode"
4. Verify: auto-login, sample portfolio loaded, premium unlocked

**What to verify:**
- [ ] Demo button is prominent
- [ ] One tap loads everything
- [ ] No signup/login required
- [ ] Sample holdings appear (AAPL, VOO, BTC, GOLD, etc.)
- [ ] Premium features unlocked

---

## Test Checklist Summary

### Vision API
- [ ] Document scanning works
- [ ] Receipt scanning works
- [ ] Confidence scores appear

### Thinking Levels
- [ ] "thinking: high" shown on scans
- [ ] "thinking: medium" shown on voice
- [ ] Different tasks use different levels

### Structured Output
- [ ] Holdings import correctly
- [ ] Receipt items parse correctly
- [ ] No raw JSON shown to user

### Streaming
- [ ] Voice responses stream word-by-word
- [ ] Text-to-speech works

### Autonomous Agent
- [ ] Agent runs in background
- [ ] Activity log shows history
- [ ] "Run Now" triggers check
- [ ] Learns from responses

### Demo Mode
- [ ] One-tap access
- [ ] No paywall
- [ ] Sample data loaded

---

## Console Logs to Watch

Open developer tools and filter for:
- `[Gemini]` - API calls and responses
- `[AgentLoop]` - Autonomous agent activity
- `[BackgroundRefresh]` - Price updates
- `[PortfolioCoach]` - Coach content generation

---

## Troubleshooting

**"Gemini API key not configured"**
- Add `EXPO_PUBLIC_GOOGLE_AI_API_KEY` to `.env`

**Camera not working**
- Grant camera permissions
- Try "Choose from Gallery" instead

**Voice not speaking**
- Check device is not on silent
- Tap unmute button in voice coach

**Agent not showing activity**
- Need holdings in portfolio first
- Tap "Run Now" to force a check
