import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { X, Sparkles, Crown, Zap, MessageCircle, BarChart3, FileText, TrendingUp, Check } from 'lucide-react-native';
import { usePurchases } from '@/context/PurchasesContext';
import { Mascot } from '@/components/Mascot';
import Colors from '@/constants/colors';

const PRO_FEATURES = [
  { icon: TrendingUp, text: 'Real-time price updates' },
  { icon: Zap, text: 'Advanced alerts & notifications' },
  { icon: FileText, text: 'AI receipt scanning' },
  { icon: MessageCircle, text: 'Priority support' },
];

const PREMIUM_FEATURES = [
  { icon: BarChart3, text: 'Advanced diversification analysis' },
  { icon: FileText, text: 'Automatic statement parsing' },
  { icon: Sparkles, text: 'AI-powered insights' },
  { icon: TrendingUp, text: 'Tax loss harvesting alerts' },
  { icon: MessageCircle, text: 'Peer comparison & benchmarking' },
];

type PlanType = 'pro_monthly' | 'pro_annual' | 'premium_monthly' | 'premium_annual';

export function PaywallModal() {
  const {
    isPaywallVisible,
    hidePaywall,
    isPurchasing,
    isRestoring,
    proMonthlyPackage,
    proAnnualPackage,
    premiumMonthlyPackage,
    premiumAnnualPackage,
    purchase,
    restore,
    purchaseError,
    subscriptionTier,
    isTrialActive,
    trialDaysRemaining,
  } = usePurchases();

  const [selectedTier, setSelectedTier] = useState<'pro' | 'premium'>('premium');
  const [selectedPeriod, setSelectedPeriod] = useState<'monthly' | 'annual'>('annual');

  const handlePurchase = () => {
    let pkg = null;
    
    if (selectedTier === 'pro') {
      pkg = selectedPeriod === 'annual' ? proAnnualPackage : proMonthlyPackage;
    } else {
      pkg = selectedPeriod === 'annual' ? premiumAnnualPackage : premiumMonthlyPackage;
    }
    
    if (pkg) {
      purchase(pkg);
    }
  };

  const proMonthlyPrice = proMonthlyPackage?.product.priceString ?? '$4.99';
  const proAnnualPrice = proAnnualPackage?.product.priceString ?? '$49.99';
  const proAnnualMonthly = proAnnualPackage?.product.price 
    ? `$${(proAnnualPackage.product.price / 12).toFixed(2)}`
    : '$4.17';

  const premiumMonthlyPrice = premiumMonthlyPackage?.product.priceString ?? '$9.99';
  const premiumAnnualPrice = premiumAnnualPackage?.product.priceString ?? '$99.99';
  const premiumAnnualMonthly = premiumAnnualPackage?.product.price 
    ? `$${(premiumAnnualPackage.product.price / 12).toFixed(2)}`
    : '$8.33';

  const isProcessing = isPurchasing || isRestoring;

  const features = selectedTier === 'pro' ? PRO_FEATURES : PREMIUM_FEATURES;
  const tierColor = selectedTier === 'pro' ? Colors.primary : Colors.gold;

  return (
    <Modal
      visible={isPaywallVisible}
      animationType="slide"
      transparent
      onRequestClose={hidePaywall}
    >
      <BlurView intensity={20} style={styles.overlay}>
        <View style={styles.container}>
          <TouchableOpacity 
            style={styles.closeButton} 
            onPress={hidePaywall}
            disabled={isProcessing}
          >
            <X size={24} color={Colors.textSecondary} />
          </TouchableOpacity>

          <ScrollView 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            <View style={styles.header}>
              <View style={styles.mascotContainer}>
                <Mascot size="medium" mood="happy" />
              </View>
              <View style={styles.crownBadge}>
                {selectedTier === 'premium' ? (
                  <Crown size={16} color={Colors.gold} />
                ) : (
                  <Zap size={16} color={Colors.primary} />
                )}
              </View>
            </View>

            <Text style={styles.title}>
              {selectedTier === 'premium' ? 'Unlock Premium' : 'Upgrade to Pro'}
            </Text>
            <Text style={styles.subtitle}>
              {selectedTier === 'premium' 
                ? 'Get the most powerful financial insights and automation'
                : 'Get real-time updates and advanced features'}
            </Text>

            {/* Tier Selection */}
            <View style={styles.tierSelector}>
              <TouchableOpacity
                style={[
                  styles.tierOption,
                  selectedTier === 'pro' && styles.tierOptionSelected,
                ]}
                onPress={() => setSelectedTier('pro')}
                disabled={isProcessing}
              >
                <Zap size={18} color={selectedTier === 'pro' ? Colors.primary : Colors.textMuted} />
                <Text style={[
                  styles.tierOptionText,
                  selectedTier === 'pro' && styles.tierOptionTextSelected,
                ]}>
                  Pro
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.tierOption,
                  selectedTier === 'premium' && styles.tierOptionSelected,
                ]}
                onPress={() => setSelectedTier('premium')}
                disabled={isProcessing}
              >
                <Crown size={18} color={selectedTier === 'premium' ? Colors.gold : Colors.textMuted} />
                <Text style={[
                  styles.tierOptionText,
                  selectedTier === 'premium' && styles.tierOptionTextSelected,
                ]}>
                  Premium
                </Text>
                <View style={styles.popularBadge}>
                  <Text style={styles.popularBadgeText}>POPULAR</Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Features */}
            <View style={styles.featuresContainer}>
              {features.map((feature, index) => (
                <View key={index} style={styles.featureRow}>
                  <View style={[styles.featureIcon, { backgroundColor: `${tierColor}15` }]}>
                    <feature.icon size={18} color={tierColor} />
                  </View>
                  <Text style={styles.featureText}>{feature.text}</Text>
                </View>
              ))}
              {selectedTier === 'premium' && (
                <View style={styles.proIncludedNote}>
                  <Check size={14} color={Colors.success} />
                  <Text style={styles.proIncludedText}>Plus all Pro features</Text>
                </View>
              )}
            </View>

            {/* Trial Notice */}
            {!isTrialActive && subscriptionTier === 'free' && selectedTier === 'premium' && (
              <View style={styles.trialNotice}>
                <Sparkles size={16} color={Colors.success} />
                <Text style={styles.trialNoticeText}>
                  Start with a 7-day free trial
                </Text>
              </View>
            )}

            {/* Plan Selection */}
            <View style={styles.plansContainer}>
              <TouchableOpacity
                style={[
                  styles.planCard,
                  selectedPeriod === 'annual' && styles.planCardSelected,
                ]}
                onPress={() => setSelectedPeriod('annual')}
                disabled={isProcessing}
              >
                <View style={styles.saveBadge}>
                  <Text style={styles.saveBadgeText}>
                    {selectedTier === 'pro' ? 'SAVE 17%' : 'SAVE 17%'}
                  </Text>
                </View>
                <View style={styles.planHeader}>
                  <View style={[
                    styles.radioOuter,
                    selectedPeriod === 'annual' && styles.radioOuterSelected,
                  ]}>
                    {selectedPeriod === 'annual' && (
                      <View style={[styles.radioInner, { backgroundColor: tierColor }]} />
                    )}
                  </View>
                  <Text style={styles.planName}>Annual</Text>
                </View>
                <Text style={styles.planPrice}>
                  {selectedTier === 'pro' ? proAnnualPrice : premiumAnnualPrice}
                </Text>
                <Text style={styles.planPeriod}>
                  {selectedTier === 'pro' ? proAnnualMonthly : premiumAnnualMonthly}/month
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.planCard,
                  selectedPeriod === 'monthly' && styles.planCardSelected,
                ]}
                onPress={() => setSelectedPeriod('monthly')}
                disabled={isProcessing}
              >
                <View style={styles.planHeader}>
                  <View style={[
                    styles.radioOuter,
                    selectedPeriod === 'monthly' && styles.radioOuterSelected,
                  ]}>
                    {selectedPeriod === 'monthly' && (
                      <View style={[styles.radioInner, { backgroundColor: tierColor }]} />
                    )}
                  </View>
                  <Text style={styles.planName}>Monthly</Text>
                </View>
                <Text style={styles.planPrice}>
                  {selectedTier === 'pro' ? proMonthlyPrice : premiumMonthlyPrice}
                </Text>
                <Text style={styles.planPeriod}>per month</Text>
              </TouchableOpacity>
            </View>

            {purchaseError && (
              <Text style={styles.errorText}>{purchaseError}</Text>
            )}

            <TouchableOpacity
              style={[
                styles.purchaseButton,
                { backgroundColor: tierColor },
                isProcessing && styles.buttonDisabled,
              ]}
              onPress={handlePurchase}
              disabled={isProcessing}
            >
              {isPurchasing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  {selectedTier === 'premium' ? (
                    <Crown size={20} color="#fff" />
                  ) : (
                    <Zap size={20} color="#fff" />
                  )}
                  <Text style={styles.purchaseButtonText}>
                    {!isTrialActive && subscriptionTier === 'free' && selectedTier === 'premium'
                      ? 'Start Free Trial'
                      : `Subscribe to ${selectedTier === 'pro' ? 'Pro' : 'Premium'}`}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.restoreButton}
              onPress={restore}
              disabled={isProcessing}
            >
              {isRestoring ? (
                <ActivityIndicator color={Colors.textSecondary} size="small" />
              ) : (
                <Text style={styles.restoreButtonText}>Restore Purchases</Text>
              )}
            </TouchableOpacity>

            <Text style={styles.legalText}>
              {!isTrialActive && subscriptionTier === 'free' && selectedTier === 'premium'
                ? 'Free for 7 days, then '
                : ''}
              Cancel anytime. Subscription auto-renews unless cancelled at least 24 hours before the end of the current period.
            </Text>
          </ScrollView>
        </View>
      </BlurView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '92%',
    paddingTop: 16,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  mascotContainer: {
    position: 'relative',
  },
  crownBadge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  tierSelector: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  tierOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.background,
    borderRadius: 12,
    paddingVertical: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  tierOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: `${Colors.primary}08`,
  },
  tierOptionText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.textMuted,
  },
  tierOptionTextSelected: {
    color: Colors.text,
  },
  popularBadge: {
    position: 'absolute',
    top: -8,
    right: 8,
    backgroundColor: Colors.gold,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  popularBadgeText: {
    fontSize: 8,
    fontWeight: '700' as const,
    color: '#fff',
  },
  featuresContainer: {
    backgroundColor: Colors.background,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  featureText: {
    fontSize: 15,
    color: Colors.text,
    fontWeight: '500' as const,
  },
  proIncludedNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  proIncludedText: {
    fontSize: 13,
    color: Colors.success,
    fontWeight: '600' as const,
  },
  trialNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.successMuted,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  trialNoticeText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.success,
  },
  plansContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  planCard: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  planCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: `${Colors.primary}08`,
  },
  saveBadge: {
    position: 'absolute',
    top: -10,
    right: 12,
    backgroundColor: Colors.success,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  saveBadgeText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: '#fff',
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  radioOuterSelected: {
    borderColor: Colors.primary,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  planName: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  planPrice: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 2,
  },
  planPeriod: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  errorText: {
    color: Colors.danger,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  purchaseButton: {
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  purchaseButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600' as const,
  },
  restoreButton: {
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  restoreButtonText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '500' as const,
  },
  legalText: {
    fontSize: 11,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
  },
});
