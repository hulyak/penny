# RevenueCat Configuration Guide

This document outlines how to configure RevenueCat offerings and entitlements for the PENNY app.

## Subscription Tiers

### Free Tier
- Basic portfolio tracking
- Manual entry
- CSV import
- Basic alerts

### Pro Tier - $4.99/month or $49.99/year
**Entitlements:**
- `real_time_pricing` - Real-time price updates for stocks, crypto, commodities
- `advanced_alerts` - Advanced price target and rebalancing alerts
- `receipt_scanning` - AI-powered receipt scanning with Gemini Vision

**Features:**
- Real-time portfolio value updates
- Advanced alert customization
- Receipt scanning and expense tracking
- Priority support

### Premium Tier - $9.99/month or $99.99/year
**Entitlements:**
- All Pro tier entitlements
- `premium_analytics` - Advanced diversification and risk analysis
- `statement_parsing` - Automatic brokerage statement parsing
- `ai_insights` - AI-powered portfolio insights and recommendations

**Features:**
- Everything in Pro
- Advanced diversification analysis
- Automatic statement parsing
- AI-powered insights and recommendations
- Tax loss harvesting alerts
- Peer comparison and benchmarking

## RevenueCat Dashboard Setup

### Step 1: Create Products

#### iOS (App Store Connect)
1. Create in-app purchase products:
   - `penny_pro_monthly` - $4.99/month auto-renewable subscription
   - `penny_pro_annual` - $49.99/year auto-renewable subscription
   - `penny_premium_monthly` - $9.99/month auto-renewable subscription
   - `penny_premium_annual` - $99.99/year auto-renewable subscription

#### Android (Google Play Console)
1. Create subscription products:
   - `penny_pro_monthly` - $4.99/month
   - `penny_pro_annual` - $49.99/year
   - `penny_premium_monthly` - $9.99/month
   - `penny_premium_annual` - $99.99/year

### Step 2: Configure Entitlements in RevenueCat

1. Go to RevenueCat Dashboard → Entitlements
2. Create the following entitlements:

**Pro Tier Entitlements:**
- `real_time_pricing`
- `advanced_alerts`
- `receipt_scanning`

**Premium Tier Entitlements:**
- `premium_analytics`
- `statement_parsing`
- `ai_insights`

**Legacy Entitlement (for backward compatibility):**
- `coach_plus` - Maps to all premium features

### Step 3: Create Offerings

#### Pro Offering
1. Create offering with identifier: `pro`
2. Add packages:
   - Package ID: `pro_monthly`
     - Product: `penny_pro_monthly` (iOS) / `penny_pro_monthly` (Android)
     - Entitlements: `real_time_pricing`, `advanced_alerts`, `receipt_scanning`
   - Package ID: `pro_annual`
     - Product: `penny_pro_annual` (iOS) / `penny_pro_annual` (Android)
     - Entitlements: `real_time_pricing`, `advanced_alerts`, `receipt_scanning`

#### Premium Offering
1. Create offering with identifier: `premium`
2. Add packages:
   - Package ID: `premium_monthly`
     - Product: `penny_premium_monthly` (iOS) / `penny_premium_monthly` (Android)
     - Entitlements: All Pro entitlements + `premium_analytics`, `statement_parsing`, `ai_insights`
   - Package ID: `premium_annual`
     - Product: `penny_premium_annual` (iOS) / `penny_premium_annual` (Android)
     - Entitlements: All Pro entitlements + `premium_analytics`, `statement_parsing`, `ai_insights`

### Step 4: Set Current Offering

1. In RevenueCat Dashboard, set `premium` as the current offering
2. This will be the default offering shown in the paywall

### Step 5: Configure Trial Period

1. In App Store Connect / Google Play Console:
   - Set 7-day free trial for Premium tier
   - Configure trial eligibility rules

### Step 6: Test with Sandbox

1. Enable sandbox mode in RevenueCat
2. Create test users in App Store Connect / Google Play Console
3. Test purchase flows for both tiers
4. Verify entitlements are granted correctly

## Feature Gating Implementation

The app uses the following hooks for feature gating:

### `useRequirePremium()`
Checks if user has any paid subscription (Pro or Premium).

```typescript
const { isPremium, checkPremium } = useRequirePremium();

checkPremium(() => {
  // Feature code here
});
```

### `useRequireEntitlement(entitlement)`
Checks if user has a specific entitlement.

```typescript
const { hasAccess, checkEntitlement } = useRequireEntitlement(ENTITLEMENTS.REAL_TIME_PRICING);

checkEntitlement(() => {
  // Feature code here
});
```

### `useRequireTier(tier)`
Checks if user has a specific subscription tier.

```typescript
const { hasAccess, checkTier } = useRequireTier('premium');

checkTier(() => {
  // Feature code here
});
```

## Demo Mode for Hackathon

The app includes a demo mode that grants full premium access without payment:

```typescript
const { enableDemoMode, disableDemoMode, isDemoMode } = usePurchases();

// Enable demo mode for judges
await enableDemoMode();
```

Demo mode is stored in AsyncStorage and persists across app restarts.

## Trial Period

Users get a 7-day free trial of Premium tier:

```typescript
const { isTrialActive, trialDaysRemaining, startTrial } = usePurchases();

// Start trial
await startTrial();

// Check trial status
if (isTrialActive) {
  console.log(`${trialDaysRemaining} days remaining`);
}
```

## Environment Variables

Ensure these environment variables are set:

```bash
EXPO_PUBLIC_REVENUECAT_IOS_API_KEY=your_ios_key
EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY=your_android_key
EXPO_PUBLIC_REVENUECAT_TEST_API_KEY=your_test_key
```

## Testing Checklist

- [ ] Offerings load correctly
- [ ] Pro monthly purchase works
- [ ] Pro annual purchase works
- [ ] Premium monthly purchase works
- [ ] Premium annual purchase works
- [ ] Entitlements are granted after purchase
- [ ] Feature gating works for each tier
- [ ] Trial period starts correctly
- [ ] Trial period expires correctly
- [ ] Restore purchases works
- [ ] Demo mode works
- [ ] Subscription management UI displays correct tier
- [ ] Upgrade/downgrade flows work

## Support

For RevenueCat configuration issues, refer to:
- [RevenueCat Documentation](https://docs.revenuecat.com/)
- [RevenueCat Dashboard](https://app.revenuecat.com/)
