import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Crown,
  Check,
  Sparkles,
  Zap,
  TrendingUp,
  RefreshCw,
  AlertCircle,
  Calendar,
  DollarSign,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { usePurchases, ENTITLEMENTS } from '@/context/PurchasesContext';
import { LinearGradient } from 'expo-linear-gradient';

const TIER_FEATURES = {
  free: [
    'Basic portfolio tracking',
    'Manual entry & CSV import',
    'Basic alerts',
    'Portfolio dashboard',
  ],
  pro: [
    'Everything in Free',
    'Real-time price updates',
    'Advanced alerts & notifications',
    'Receipt scanning with AI',
    'Priority support',
  ],
  premium: [
    'Everything in Pro',
    'Advanced diversification analysis',
    'Automatic statement parsing',
    'AI-powered insights',
    'Tax loss harvesting alerts',
    'Peer comparison & benchmarking',
  ],
};

export default function SubscriptionScreen() {
  const router = useRouter();
  const {
    subscriptionTier,
    isPremium,
    isTrialActive,
    trialDaysRemaining,
    startTrial,
    showPaywall,
    restore,
    isRestoring,
    proMonthlyPackage,
    proAnnualPackage,
    premiumMonthlyPackage,
    premiumAnnualPackage,
    isDemoMode,
    enableDemoMode,
    disableDemoMode,
  } = usePurchases();

  const [selectedTier, setSelectedTier] = useState<'pro' | 'premium'>('premium');

  const handleUpgrade = () => {
    showPaywall();
  };

  const handleRestore = async () => {
    try {
      await restore();
      Alert.alert('Success', 'Your purchases have been restored.');
    } catch (error) {
      Alert.alert('Error', 'Failed to restore purchases. Please try again.');
    }
  };

  const handleStartTrial = async () => {
    try {
      await startTrial();
      Alert.alert(
        'Trial Started!',
        `You now have ${trialDaysRemaining} days of Premium access. Enjoy all features!`,
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to start trial. Please try again.');
    }
  };

  const proMonthlyPrice = proMonthlyPackage?.product.priceString ?? '$4.99';
  const proAnnualPrice = proAnnualPackage?.product.priceString ?? '$49.99';
  const premiumMonthlyPrice = premiumMonthlyPackage?.product.priceString ?? '$9.99';
  const premiumAnnualPrice = premiumAnnualPackage?.product.priceString ?? '$99.99';

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Subscription</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Current Subscription Status */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <View style={styles.statusIcon}>
              {subscriptionTier === 'premium' ? (
                <Crown size={24} color={Colors.gold} />
              ) : subscriptionTier === 'pro' ? (
                <Zap size={24} color={Colors.primary} />
              ) : (
                <Sparkles size={24} color={Colors.textMuted} />
              )}
            </View>
            <View style={styles.statusTextContainer}>
              <Text style={styles.statusTitle}>
                {subscriptionTier === 'premium' ? 'Premium' : 
                 subscriptionTier === 'pro' ? 'Pro' : 'Free'} Plan
              </Text>
              {isTrialActive && (
                <View style={styles.trialBadge}>
                  <Calendar size={12} color={Colors.success} />
                  <Text style={styles.trialBadgeText}>
                    {trialDaysRemaining} days trial remaining
                  </Text>
                </View>
              )}
              {isDemoMode && (
                <View style={[styles.trialBadge, { backgroundColor: Colors.goldMuted }]}>
                  <Sparkles size={12} color={Colors.gold} />
                  <Text style={[styles.trialBadgeText, { color: Colors.gold }]}>
                    Demo Mode Active
                  </Text>
                </View>
              )}
            </View>
          </View>

          {subscriptionTier === 'free' && !isTrialActive && (
            <Pressable style={styles.trialButton} onPress={handleStartTrial}>
              <Sparkles size={18} color="#fff" />
              <Text style={styles.trialButtonText}>Start 7-Day Free Trial</Text>
            </Pressable>
          )}

          {subscriptionTier !== 'premium' && (
            <View style={styles.upgradePrompt}>
              <AlertCircle size={16} color={Colors.primary} />
              <Text style={styles.upgradePromptText}>
                {subscriptionTier === 'free' 
                  ? 'Upgrade to unlock all features'
                  : 'Upgrade to Premium for advanced features'}
              </Text>
            </View>
          )}
        </View>

        {/* Subscription Tiers */}
        <View style={styles.tiersSection}>
          <Text style={styles.sectionTitle}>Choose Your Plan</Text>

          {/* Pro Tier */}
          <Pressable
            style={[
              styles.tierCard,
              selectedTier === 'pro' && styles.tierCardSelected,
              subscriptionTier === 'pro' && styles.tierCardCurrent,
            ]}
            onPress={() => setSelectedTier('pro')}
          >
            <View style={styles.tierHeader}>
              <View style={styles.tierIconContainer}>
                <Zap size={20} color={Colors.primary} />
              </View>
              <View style={styles.tierHeaderText}>
                <Text style={styles.tierName}>Pro</Text>
                {subscriptionTier === 'pro' && (
                  <View style={styles.currentBadge}>
                    <Text style={styles.currentBadgeText}>CURRENT</Text>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.tierPricing}>
              <Text style={styles.tierPrice}>{proMonthlyPrice}</Text>
              <Text style={styles.tierPeriod}>per month</Text>
              <Text style={styles.tierAnnual}>or {proAnnualPrice}/year</Text>
            </View>

            <View style={styles.tierFeatures}>
              {TIER_FEATURES.pro.map((feature, index) => (
                <View key={index} style={styles.tierFeature}>
                  <Check size={16} color={Colors.success} />
                  <Text style={styles.tierFeatureText}>{feature}</Text>
                </View>
              ))}
            </View>
          </Pressable>

          {/* Premium Tier */}
          <Pressable
            style={[
              styles.tierCard,
              styles.tierCardPremium,
              selectedTier === 'premium' && styles.tierCardSelected,
              subscriptionTier === 'premium' && styles.tierCardCurrent,
            ]}
            onPress={() => setSelectedTier('premium')}
          >
            <View style={styles.popularBadge}>
              <Text style={styles.popularBadgeText}>MOST POPULAR</Text>
            </View>

            <View style={styles.tierHeader}>
              <View style={[styles.tierIconContainer, { backgroundColor: `${Colors.gold}20` }]}>
                <Crown size={20} color={Colors.gold} />
              </View>
              <View style={styles.tierHeaderText}>
                <Text style={styles.tierName}>Premium</Text>
                {subscriptionTier === 'premium' && (
                  <View style={styles.currentBadge}>
                    <Text style={styles.currentBadgeText}>CURRENT</Text>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.tierPricing}>
              <Text style={styles.tierPrice}>{premiumMonthlyPrice}</Text>
              <Text style={styles.tierPeriod}>per month</Text>
              <Text style={styles.tierAnnual}>or {premiumAnnualPrice}/year (save 17%)</Text>
            </View>

            <View style={styles.tierFeatures}>
              {TIER_FEATURES.premium.map((feature, index) => (
                <View key={index} style={styles.tierFeature}>
                  <Check size={16} color={Colors.success} />
                  <Text style={styles.tierFeatureText}>{feature}</Text>
                </View>
              ))}
            </View>
          </Pressable>

          {/* Free Tier */}
          <View style={[styles.tierCard, subscriptionTier === 'free' && styles.tierCardCurrent]}>
            <View style={styles.tierHeader}>
              <View style={[styles.tierIconContainer, { backgroundColor: Colors.surfaceMuted }]}>
                <Sparkles size={20} color={Colors.textMuted} />
              </View>
              <View style={styles.tierHeaderText}>
                <Text style={styles.tierName}>Free</Text>
                {subscriptionTier === 'free' && (
                  <View style={styles.currentBadge}>
                    <Text style={styles.currentBadgeText}>CURRENT</Text>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.tierPricing}>
              <Text style={styles.tierPrice}>$0</Text>
              <Text style={styles.tierPeriod}>forever</Text>
            </View>

            <View style={styles.tierFeatures}>
              {TIER_FEATURES.free.map((feature, index) => (
                <View key={index} style={styles.tierFeature}>
                  <Check size={16} color={Colors.success} />
                  <Text style={styles.tierFeatureText}>{feature}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        {subscriptionTier !== 'premium' && (
          <Pressable style={styles.upgradeButton} onPress={handleUpgrade}>
            <Crown size={20} color="#fff" />
            <Text style={styles.upgradeButtonText}>
              {subscriptionTier === 'free' ? 'Upgrade Now' : 'Upgrade to Premium'}
            </Text>
          </Pressable>
        )}

        <Pressable
          style={styles.restoreButton}
          onPress={handleRestore}
          disabled={isRestoring}
        >
          {isRestoring ? (
            <ActivityIndicator size="small" color={Colors.textSecondary} />
          ) : (
            <>
              <RefreshCw size={18} color={Colors.textSecondary} />
              <Text style={styles.restoreButtonText}>Restore Purchases</Text>
            </>
          )}
        </Pressable>

        {/* Demo Mode Toggle (for development/hackathon) */}
        {__DEV__ && (
          <View style={styles.demoSection}>
            <Text style={styles.demoTitle}>Developer Options</Text>
            <Pressable
              style={styles.demoButton}
              onPress={isDemoMode ? disableDemoMode : enableDemoMode}
            >
              <Text style={styles.demoButtonText}>
                {isDemoMode ? 'Disable Demo Mode' : 'Enable Demo Mode'}
              </Text>
            </Pressable>
          </View>
        )}

        {/* Info Section */}
        <View style={styles.infoSection}>
          <Text style={styles.infoText}>
            • Subscriptions auto-renew unless cancelled 24 hours before the end of the current period
          </Text>
          <Text style={styles.infoText}>
            • Cancel anytime from your App Store or Google Play account settings
          </Text>
          <Text style={styles.infoText}>
            • 7-day free trial available for Premium tier
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  statusCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  statusTextContainer: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  trialBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.successMuted,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  trialBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.success,
  },
  trialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    marginBottom: 12,
  },
  trialButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  upgradePrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: `${Colors.primary}15`,
    padding: 12,
    borderRadius: 12,
  },
  upgradePromptText: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '500',
  },
  tiersSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 16,
  },
  tierCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  tierCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: `${Colors.primary}08`,
  },
  tierCardCurrent: {
    borderColor: Colors.success,
  },
  tierCardPremium: {
    borderWidth: 2,
    borderColor: `${Colors.gold}30`,
  },
  popularBadge: {
    position: 'absolute',
    top: -10,
    right: 20,
    backgroundColor: Colors.gold,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  popularBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  tierHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  tierIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${Colors.primary}20`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  tierHeaderText: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tierName: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  currentBadge: {
    backgroundColor: Colors.successMuted,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  currentBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.success,
  },
  tierPricing: {
    marginBottom: 16,
  },
  tierPrice: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.text,
  },
  tierPeriod: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  tierAnnual: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 4,
  },
  tierFeatures: {
    gap: 10,
  },
  tierFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tierFeatureText: {
    fontSize: 14,
    color: Colors.text,
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    marginBottom: 12,
  },
  upgradeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  restoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    marginBottom: 24,
  },
  restoreButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  demoSection: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  demoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  demoButton: {
    backgroundColor: Colors.gold,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  demoButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  infoSection: {
    gap: 8,
  },
  infoText: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
});
