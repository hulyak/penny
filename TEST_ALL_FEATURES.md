# Penny - Complete Feature Test Guide

Test every feature in the app.

---

## 1. Authentication

### 1.1 Demo Mode (Hackathon Judges)
**Location:** Login screen

- [ ] "HACKATHON JUDGES" section visible
- [ ] Tap "Enter Demo Mode"
- [ ] Auto-login without credentials
- [ ] Sample portfolio loaded (6 holdings)
- [ ] Premium features unlocked

### 1.2 Email/Password Login
**Location:** Login screen

- [ ] Email field accepts input
- [ ] Password field accepts input
- [ ] "Sign In" button works
- [ ] Error shown for invalid credentials

### 1.3 Email/Password Sign Up
**Location:** Login screen → "Sign up" link

- [ ] Name field accepts input
- [ ] Email field accepts input
- [ ] Password field accepts input
- [ ] Account created successfully
- [ ] Redirects to app after signup

### 1.4 Google Sign In
**Location:** Login screen

- [ ] Google button visible
- [ ] Opens Google auth flow
- [ ] Returns to app after auth

### 1.5 Apple Sign In (iOS only)
**Location:** Login screen

- [ ] Apple button visible on iOS
- [ ] Opens Apple auth flow
- [ ] Returns to app after auth

---

## 2. Onboarding

**Location:** After first login (new users)

- [ ] Onboarding screens appear
- [ ] Can swipe through slides
- [ ] "Get Started" completes onboarding
- [ ] Only shows once

---

## 3. Home Tab

### 3.1 Header
- [ ] Greeting shows user's first name
- [ ] Subtitle "Your portfolio at a glance"
- [ ] Bell icon opens alerts

### 3.2 Portfolio Coach Card
- [ ] Mascot image loads
- [ ] Personalized greeting based on portfolio
- [ ] Streak badge shows (if > 1 day)
- [ ] "Today's Focus" tip with Gemini badge
- [ ] Insights toggle expands/collapses
- [ ] Insight cards show with icons

### 3.3 Market Overview
- [ ] Shows market indices (S&P 500, Nasdaq, etc.)
- [ ] Shows gold price
- [ ] Shows crypto prices
- [ ] Prices update on refresh

### 3.4 Portfolio Value Card (if holdings exist)
- [ ] Total value displayed
- [ ] Gain/loss percentage
- [ ] Gain/loss amount
- [ ] Day change (if available)
- [ ] Tapping opens Portfolio tab

### 3.5 Empty State (if no holdings)
- [ ] "Start Your Portfolio" card shows
- [ ] "Add Holding" button works
- [ ] "Bulk Import" button works

### 3.6 Performance Chart
- [ ] Chart displays historical data
- [ ] Time period selector (1W, 1M, 3M, etc.)
- [ ] Chart updates on period change

### 3.7 Stats Grid
- [ ] Holdings count correct
- [ ] Asset classes count correct
- [ ] Return percentage correct

### 3.8 Creator Hub Banner
- [ ] "Josh's Model Portfolio" banner visible
- [ ] Tapping opens Creator Hub

### 3.9 Top Holdings
- [ ] Shows top 3 holdings by value
- [ ] Mini sparkline chart for each
- [ ] Tapping opens holding detail
- [ ] "See all" opens Portfolio tab

### 3.10 Allocation Preview
- [ ] Allocation bar shows asset classes
- [ ] Legend shows percentages
- [ ] Tapping opens Analysis screen

### 3.11 Agent Activity Card (if holdings exist)
- [ ] Shows recent agent interventions
- [ ] "Run Now" triggers agent
- [ ] "View All" opens agent activity screen

### 3.12 Quick Actions
- [ ] Voice button → Voice Coach screen
- [ ] Receipt button → Receipt Scan screen
- [ ] AI Coach button → AI Insights screen
- [ ] Add button → Add Holding screen

### 3.13 Pull to Refresh
- [ ] Pull down refreshes data
- [ ] Prices update

---

## 4. Portfolio Tab

### 4.1 Header
- [ ] "Portfolio" title
- [ ] Bell icon → Alerts
- [ ] Camera icon → Document Scan
- [ ] Plus icon → Add Holding

### 4.2 Portfolio Value Card
- [ ] Total value correct
- [ ] Gain/loss percentage
- [ ] Day change display
- [ ] "Updated X ago" timestamp
- [ ] Refresh button updates prices
- [ ] Loading indicator during update

### 4.3 Stats Row
- [ ] Holdings count
- [ ] Asset classes count
- [ ] Return percentage

### 4.4 Live Prices Badge
- [ ] Shows count of holdings with live prices

### 4.5 Creator Hub Card
- [ ] "Josh's Model Portfolio" card
- [ ] Tapping opens Creator Hub

### 4.6 Portfolio Insights Card
- [ ] Shows for 2+ holdings
- [ ] Premium badge for free users
- [ ] Tapping opens Analysis screen

### 4.7 AI Features Row
- [ ] Voice Coach → Voice screen
- [ ] Scan Receipt → Receipt scan screen
- [ ] Agent → Agent activity screen

### 4.8 Quick Actions Row
- [ ] Loans → Loans screen
- [ ] Dividends → Dividends screen

### 4.9 Allocation Section
- [ ] Allocation bar accurate
- [ ] Legend shows all asset classes
- [ ] Percentages sum to 100%

### 4.10 Holdings List
- [ ] All holdings displayed
- [ ] Each shows: name, symbol, quantity, value, gain %
- [ ] Mini sparkline chart
- [ ] Live price indicator (wifi icon)
- [ ] Tapping opens holding detail

### 4.11 Empty State
- [ ] "Scan Your Statement" card (Gemini Vision)
- [ ] "Add Manually" card
- [ ] "Import CSV" card

### 4.12 Pull to Refresh
- [ ] Refreshes holdings and prices

---

## 5. Add Holding

**Location:** Portfolio → Plus button

### 5.1 Asset Type Selection
- [ ] Stock option
- [ ] ETF option
- [ ] Mutual Fund option
- [ ] Bond option
- [ ] Gold option
- [ ] Crypto option
- [ ] Real Estate option
- [ ] Fixed Deposit option
- [ ] Other option

### 5.2 Form Fields
- [ ] Name field (required)
- [ ] Symbol field (optional for some types)
- [ ] Quantity field (required)
- [ ] Purchase price field (required)
- [ ] Purchase date picker
- [ ] Currency selector
- [ ] Notes field

### 5.3 Save
- [ ] "Add Holding" button saves
- [ ] Validation errors shown
- [ ] Returns to portfolio after save
- [ ] New holding appears in list

---

## 6. Holding Detail

**Location:** Portfolio → Tap any holding

### 6.1 Header
- [ ] Holding name
- [ ] Symbol
- [ ] Back button works

### 6.2 Value Display
- [ ] Current value
- [ ] Gain/loss amount
- [ ] Gain/loss percentage
- [ ] Purchase price shown

### 6.3 Details Section
- [ ] Quantity
- [ ] Purchase date
- [ ] Asset class
- [ ] Last price update

### 6.4 Actions
- [ ] Edit button → Edit screen
- [ ] Delete button → Confirmation → Deletes
- [ ] Add Alert button → Add alert screen

### 6.5 Price Alerts (if any)
- [ ] List of alerts for this holding
- [ ] Can toggle alerts on/off
- [ ] Can delete alerts

---

## 7. Document Scanning

**Location:** Portfolio → Camera icon

### 7.1 Camera Permission
- [ ] Permission prompt appears
- [ ] "Grant Permission" button works
- [ ] "Choose from Gallery" works without permission

### 7.2 Camera View
- [ ] Camera preview shows
- [ ] Scan frame overlay
- [ ] Gallery button (left)
- [ ] Capture button (center)
- [ ] Feature card at bottom

### 7.3 Capture
- [ ] Capture button takes photo
- [ ] Photo preview shows
- [ ] "Retake" button works

### 7.4 Analysis
- [ ] Agent reasoning steps appear
- [ ] "thinking: high" badge visible
- [ ] Document type detected
- [ ] Broker name extracted (if visible)
- [ ] Holdings extracted with confidence %

### 7.5 Import
- [ ] Can select/deselect holdings
- [ ] High confidence auto-selected
- [ ] "Import X Holdings" button
- [ ] Holdings added to portfolio

---

## 8. Receipt Scanning

**Location:** Home → Receipt button

### 8.1 Camera Permission
- [ ] Same as document scanning

### 8.2 Camera View
- [ ] Receipt-shaped scan frame
- [ ] Feature card explains expense tracking

### 8.3 Analysis
- [ ] Agent reasoning steps
- [ ] "thinking: high" badge
- [ ] Merchant name extracted
- [ ] Category detected
- [ ] Line items extracted
- [ ] Subtotal, tax, total calculated
- [ ] Budget insight generated

### 8.4 Save
- [ ] "Log Expense" button
- [ ] Confirmation message

---

## 9. Voice Coaching

**Location:** Home → Voice button

### 9.1 UI Elements
- [ ] Back button
- [ ] "Voice Coach" title
- [ ] Gemini badge
- [ ] Mute/unmute button
- [ ] Feature card with thinking level

### 9.2 Welcome
- [ ] Welcome message appears
- [ ] Welcome message spoken (if not muted)

### 9.3 Quick Questions
- [ ] "Portfolio health?" button
- [ ] "Am I diversified?" button
- [ ] "Asset allocation" button
- [ ] Tapping sends question

### 9.4 Conversation
- [ ] User messages appear right-aligned
- [ ] Assistant messages appear left-aligned
- [ ] Streaming text (word by word)
- [ ] Text-to-speech plays response

### 9.5 Microphone
- [ ] Hold mic button to record
- [ ] Release to process
- [ ] Processing indicator shows

---

## 10. AI Insights

**Location:** Home → AI Coach button

- [ ] Screen opens
- [ ] Gemini badge in header
- [ ] AI-generated insights display
- [ ] Premium gating for free users

---

## 11. Portfolio Analysis

**Location:** Portfolio → Insights card

### 11.1 Allocation Analysis
- [ ] Pie chart or bar showing allocation
- [ ] Breakdown by asset class
- [ ] Percentages displayed

### 11.2 Diversification Score
- [ ] Score calculated
- [ ] Explanation of score

### 11.3 AI Recommendations
- [ ] Recommendations generated
- [ ] Actionable suggestions

### 11.4 Premium Gating
- [ ] Free users see limited view
- [ ] Upgrade CTA shown

---

## 12. Autonomous Agent

**Location:** Home → Agent card OR Portfolio → Agent button

### 12.1 Agent Status
- [ ] "Active" status with green dot
- [ ] Gemini badge

### 12.2 Stats
- [ ] Weekly intervention count
- [ ] Response rate percentage
- [ ] Active types count

### 12.3 Activity Log
- [ ] Recent interventions listed
- [ ] Each has: icon, title, message, timestamp
- [ ] "Responded" badge if user responded

### 12.4 Run Now
- [ ] Button triggers agent check
- [ ] Loading state during run
- [ ] Log updates after run

### 12.5 Learning Card
- [ ] Explains adaptive learning

---

## 13. Alerts

**Location:** Portfolio → Bell icon

### 13.1 Alerts List
- [ ] All alerts displayed
- [ ] Price alerts show target price
- [ ] Maturity alerts show date
- [ ] Toggle to enable/disable
- [ ] Delete button

### 13.2 Add Alert
- [ ] "Add Alert" button
- [ ] Alert type selection
- [ ] Target value/date input
- [ ] Save creates alert

---

## 14. Add Alert

**Location:** Alerts → Add OR Holding detail → Add Alert

### 14.1 Price Alert
- [ ] Select holding
- [ ] Choose above/below
- [ ] Enter target price
- [ ] Save creates alert

### 14.2 Maturity Alert
- [ ] Enter description
- [ ] Select date
- [ ] Save creates alert

---

## 15. Loans

**Location:** Portfolio → Loans button

### 15.1 Loans List
- [ ] All loans displayed
- [ ] Shows principal, rate, term
- [ ] Shows remaining balance

### 15.2 Add Loan
- [ ] Can add new loan
- [ ] Fields: name, principal, rate, term, start date

### 15.3 Amortization
- [ ] View amortization schedule
- [ ] Shows payment breakdown

---

## 16. Dividends

**Location:** Portfolio → Dividends button

### 16.1 Dividend Income
- [ ] Total dividend income shown
- [ ] By holding breakdown

### 16.2 Add Dividend
- [ ] Can log dividend payment
- [ ] Fields: holding, amount, date

### 16.3 History
- [ ] Dividend history list
- [ ] Sorted by date

---

## 17. CSV Import

**Location:** Portfolio empty state → Import CSV OR Home → Import

### 17.1 Template
- [ ] Copy template button
- [ ] Template format shown

### 17.2 Paste CSV
- [ ] Text area for CSV
- [ ] Parse button

### 17.3 Preview
- [ ] Parsed holdings shown
- [ ] Can edit before import

### 17.4 Import
- [ ] Import button adds all holdings
- [ ] Success message

---

## 18. Creator Hub

**Location:** Home → Creator banner OR Portfolio → Creator card

### 18.1 Main Screen
- [ ] Josh's profile shown
- [ ] Model portfolio card
- [ ] Commentary card
- [ ] Q&A card

### 18.2 Portfolio View
- [ ] Model portfolio allocation
- [ ] Holdings breakdown

### 18.3 Commentary
- [ ] Market commentary posts
- [ ] Timestamps

### 18.4 Q&A
- [ ] Questions list
- [ ] Can submit question

---

## 19. Profile Tab

### 19.1 User Info
- [ ] Name displayed
- [ ] Email displayed
- [ ] Profile image (if set)

### 19.2 Subscription
- [ ] Current plan shown
- [ ] Upgrade button for free users
- [ ] Premium badge for subscribers

### 19.3 Settings
- [ ] Notification preferences
- [ ] Theme settings (if any)

### 19.4 Sign Out
- [ ] Sign out button
- [ ] Confirms sign out
- [ ] Returns to login screen

---

## 20. Premium Features (RevenueCat)

### 20.1 Paywall
- [ ] Paywall appears for premium features
- [ ] Shows pricing
- [ ] Purchase button works

### 20.2 Premium Access
- [ ] Premium users see all features
- [ ] No paywall interruptions
- [ ] Premium badge shown

### 20.3 Restore Purchases
- [ ] Restore button in Profile
- [ ] Restores previous purchases

---

## 21. Notifications

### 21.1 Permission
- [ ] Permission requested on first launch
- [ ] Can grant/deny

### 21.2 Price Alerts
- [ ] Notification when price target hit

### 21.3 Maturity Reminders
- [ ] 30 days before
- [ ] 7 days before
- [ ] 1 day before
- [ ] Day of maturity

### 21.4 Agent Notifications
- [ ] Drift alerts
- [ ] Contribution reminders
- [ ] Goal check-ins

---

## 22. Background Tasks

### 22.1 Price Refresh
- [ ] Prices update when app in background
- [ ] Updates every 30 minutes (if configured)

### 22.2 Agent Loop
- [ ] Agent runs periodically
- [ ] Sends notifications when needed

---

## 23. Offline Behavior

- [ ] App opens without internet
- [ ] Cached data displays
- [ ] Error message for network actions
- [ ] Syncs when back online

---

## 24. Pull to Refresh

- [ ] Home tab refreshes
- [ ] Portfolio tab refreshes
- [ ] Data updates after refresh

---

## 25. Error Handling

### 25.1 Network Errors
- [ ] Error message shown
- [ ] Retry option

### 25.2 API Errors
- [ ] Graceful fallback
- [ ] User-friendly message

### 25.3 Validation Errors
- [ ] Form validation messages
- [ ] Highlights invalid fields

---

## Test Summary Checklist

### Authentication
- [ ] Demo mode
- [ ] Email login
- [ ] Email signup
- [ ] Google login
- [ ] Apple login

### Portfolio Management
- [ ] Add holding (all types)
- [ ] Edit holding
- [ ] Delete holding
- [ ] View holding detail
- [ ] CSV import

### Price Updates
- [ ] Live prices for stocks
- [ ] Live prices for crypto
- [ ] Live prices for gold
- [ ] Manual pricing for others
- [ ] Background refresh

### Gemini AI Features
- [ ] Document scanning
- [ ] Receipt scanning
- [ ] Voice coaching
- [ ] Portfolio coach
- [ ] AI insights
- [ ] Autonomous agent

### Alerts
- [ ] Price alerts
- [ ] Maturity alerts
- [ ] Push notifications

### Premium
- [ ] Paywall displays
- [ ] Purchase works
- [ ] Premium features unlock
- [ ] Demo mode bypasses

### Other
- [ ] Creator Hub
- [ ] Loans tracking
- [ ] Dividend tracking
- [ ] Profile/settings
- [ ] Sign out
