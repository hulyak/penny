import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  X,
  Crown,
  Check,
  Zap,
  PieChart,
  Bell,
  Brain,
  TrendingUp,
  Shield,
  Star,
  Wallet,
  Clock,
  FileText,
  Minus,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { usePurchases } from '@/context/PurchasesContext';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const FEATURES = [
  { icon: Zap, title: 'Real-time Prices', description: 'Live updates every 5 minutes during market hours' },
  { icon: Brain, title: 'AI Insights', description: 'Personalized recommendations powered by AI' },
  { icon: PieChart, title: 'Deep Analysis', description: 'Country, sector & concentration breakdown' },
  { icon: Bell, title: 'Smart Alerts', description: 'Price targets & rebalancing notifications' },
  { icon: TrendingUp, title: 'Tax Optimization', description: 'Tax loss harvesting opportunities' },
  { icon: Shield, title: 'Priority Support', description: 'Get help when you need it' },
];

const COMPARE_FEATURES = [
  { icon: Wallet, feature: 'Unlimited holdings', free: true, pro: true },
  { icon: FileText, feature: 'Document scanning', free: '3/month', pro: 'Unlimited' },
  { icon: Clock, feature: 'Price updates', free: 'Daily', pro: 'Real-time' },
  { icon: Brain, feature: 'AI insights', free: false, pro: true },
  { icon: PieChart, feature: 'Diversification analysis', free: false, pro: true },
  { icon: TrendingUp, feature: 'Tax loss alerts', free: false, pro: true },
  { icon: Bell, feature: 'Smart notifications', free: 'Basic', pro: 'Advanced' },
  { icon: Shield, feature: 'Priority support', free: false, pro: true },
];

export default function SubscriptionScreen() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const {
    subscriptionTier,
    isPremium,
    purchase,
    isPurchasing,
    restore,
    isRestoring,
    proMonthlyPackage,
    proAnnualPackage,
    isDemoMode,
    enableDemoMode,
    disableDemoMode,
  } = usePurchases();

  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('annual');

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handlePurchase = () => {
    const pkg = billingPeriod === 'annual' ? proAnnualPackage : proMonthlyPackage;
    if (pkg) {
      purchase(pkg);
    } else {
      Alert.alert('Error', 'Unable to load subscription. Please try again.');
    }
  };

  const handleRestore = async () => {
    try {
      await restore();
      Alert.alert('Success', 'Your purchases have been restored.');
    } catch (error) {
      Alert.alert('Error', 'Failed to restore purchases. Please try again.');
    }
  };

  const monthlyPrice = proMonthlyPackage?.product.priceString ?? '$6.99';
  const annualPrice = proAnnualPackage?.product.priceString ?? '$69.99';
  const annualMonthly = proAnnualPackage?.product.price
    ? `$${(proAnnualPackage.product.price / 12).toFixed(2)}`
    : '$5.83';
  const isSubscribed = isPremium || subscriptionTier === 'pro';
  const isProcessing = isPurchasing || isRestoring;

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <LinearGradient
          colors={['#0f0c29', '#302b63', '#24243e']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroGradient}
        >
          {/* Close Button */}
          <Pressable onPress={() => router.back()} style={styles.closeButton}>
            <X size={24} color="rgba(255,255,255,0.8)" />
          </Pressable>

          {/* Crown Icon */}
          <Animated.View style={[
            styles.iconContainer,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
          ]}>
            <View style={styles.glowOuter}>
              <View style={styles.glowInner}>
                <Crown size={44} color="#FFD700" />
              </View>
            </View>
          </Animated.View>

          {/* Hero Text */}
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            <Text style={styles.heroTitle}>Penny Pro</Text>
            <Text style={styles.heroSubtitle}>
              Unlock the full power of portfolio intelligence
            </Text>
          </Animated.View>

          {/* Status Badge */}
          {isSubscribed && (
            <View style={styles.subscribedBadge}>
              <Check size={16} color="#10B981" />
              <Text style={styles.subscribedText}>You're a Pro member!</Text>
            </View>
          )}

          {/* Decorative Elements */}
          <View style={styles.decorCircle1} />
          <View style={styles.decorCircle2} />
        </LinearGradient>

        {/* Features Section - MOVED TO TOP */}
        <View style={styles.featuresSection}>
          <Text style={styles.sectionTitle}>What You Get</Text>
          {FEATURES.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <View key={index} style={styles.featureRow}>
                <View style={styles.featureIconContainer}>
                  <Icon size={22} color="#8B5CF6" />
                </View>
                <View style={styles.featureContent}>
                  <Text style={styles.featureTitle}>{feature.title}</Text>
                  <Text style={styles.featureDescription}>{feature.description}</Text>
                </View>
                <Check size={20} color="#10B981" />
              </View>
            );
          })}
        </View>

        {/* Pricing Section */}
        <View style={styles.pricingSection}>
          <Text style={styles.sectionTitle}>Choose Your Plan</Text>

          {/* Plan Cards */}
          <View style={styles.plansContainer}>
            <Pressable
              style={[
                styles.planCard,
                billingPeriod === 'annual' && styles.planCardSelected,
              ]}
              onPress={() => setBillingPeriod('annual')}
              disabled={isProcessing}
            >
              <View style={styles.saveBadge}>
                <Text style={styles.saveBadgeText}>BEST VALUE</Text>
              </View>
              <View style={styles.planHeader}>
                <View style={[
                  styles.radioOuter,
                  billingPeriod === 'annual' && styles.radioOuterSelected,
                ]}>
                  {billingPeriod === 'annual' && <View style={styles.radioInner} />}
                </View>
                <View style={styles.planInfo}>
                  <Text style={styles.planName}>Annual</Text>
                  <Text style={styles.planSavings}>Save 17% • {annualMonthly}/month</Text>
                </View>
              </View>
              <Text style={styles.planPrice}>{annualPrice}</Text>
            </Pressable>

            <Pressable
              style={[
                styles.planCard,
                billingPeriod === 'monthly' && styles.planCardSelected,
              ]}
              onPress={() => setBillingPeriod('monthly')}
              disabled={isProcessing}
            >
              <View style={styles.planHeader}>
                <View style={[
                  styles.radioOuter,
                  billingPeriod === 'monthly' && styles.radioOuterSelected,
                ]}>
                  {billingPeriod === 'monthly' && <View style={styles.radioInner} />}
                </View>
                <View style={styles.planInfo}>
                  <Text style={styles.planName}>Monthly</Text>
                  <Text style={styles.planSavings}>Flexible, cancel anytime</Text>
                </View>
              </View>
              <Text style={styles.planPrice}>{monthlyPrice}</Text>
            </Pressable>
          </View>

          {/* Purchase Button - DIRECT PURCHASE */}
          <Pressable
            style={[styles.purchaseButton, isProcessing && styles.buttonDisabled]}
            onPress={handlePurchase}
            disabled={isProcessing}
          >
            <LinearGradient
              colors={['#8B5CF6', '#7C3AED', '#6D28D9']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.purchaseButtonGradient}
            >
              {isPurchasing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Crown size={20} color="#FFF" />
                  <Text style={styles.purchaseButtonText}>
                    Get Penny Pro - {billingPeriod === 'annual' ? annualPrice : monthlyPrice}
                  </Text>
                </>
              )}
            </LinearGradient>
          </Pressable>

          {/* Trust Badges */}
          <View style={styles.trustRow}>
            <View style={styles.trustItem}>
              <Shield size={14} color={Colors.textSecondary} />
              <Text style={styles.trustText}>Cancel anytime</Text>
            </View>
            <View style={styles.trustDivider} />
            <View style={styles.trustItem}>
              <Check size={14} color={Colors.textSecondary} />
              <Text style={styles.trustText}>Secure payment</Text>
            </View>
          </View>
        </View>

        {/* Social Proof */}
        <View style={styles.socialProofSection}>
          <View style={styles.ratingRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Star key={star} size={20} color="#FBBF24" fill="#FBBF24" />
            ))}
            <Text style={styles.ratingText}>4.9 on App Store</Text>
          </View>
        </View>

        {/* Compare Plans */}
        <View style={styles.compareSection}>
          <Text style={styles.sectionTitle}>Free vs Pro</Text>
          <View style={styles.compareTable}>
            {/* Header */}
            <View style={styles.compareHeader}>
              <Text style={styles.compareHeaderFeature}>Feature</Text>
              <View style={styles.compareHeaderPlan}>
                <Text style={styles.compareHeaderLabel}>Free</Text>
              </View>
              <View style={[styles.compareHeaderPlan, styles.compareHeaderPro]}>
                <Crown size={14} color="#FFD700" />
                <Text style={[styles.compareHeaderLabel, styles.proLabel]}>Pro</Text>
              </View>
            </View>

            {/* Feature Rows */}
            {COMPARE_FEATURES.map((item, index) => {
              const Icon = item.icon;
              return (
                <View key={index} style={[styles.compareRow, index === COMPARE_FEATURES.length - 1 && styles.compareRowLast]}>
                  <View style={styles.compareFeatureCell}>
                    <View style={styles.compareFeatureIcon}>
                      <Icon size={16} color={Colors.textSecondary} />
                    </View>
                    <Text style={styles.compareFeature}>{item.feature}</Text>
                  </View>
                  <View style={styles.compareValueCell}>
                    {item.free === true ? (
                      <View style={styles.checkBadge}>
                        <Check size={14} color="#10B981" />
                      </View>
                    ) : item.free === false ? (
                      <View style={styles.minusBadge}>
                        <Minus size={14} color={Colors.textMuted} />
                      </View>
                    ) : (
                      <Text style={styles.compareValueText}>{item.free}</Text>
                    )}
                  </View>
                  <View style={[styles.compareValueCell, styles.compareValuePro]}>
                    {item.pro === true ? (
                      <View style={styles.checkBadgePro}>
                        <Check size={14} color="#FFFFFF" />
                      </View>
                    ) : (
                      <Text style={styles.compareValueTextPro}>{item.pro}</Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Footer Actions */}
        <View style={styles.footerSection}>
          <Pressable style={styles.restoreButton} onPress={handleRestore} disabled={isRestoring}>
            {isRestoring ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <Text style={styles.restoreText}>Restore Purchases</Text>
            )}
          </Pressable>

          {/* Sandbox Test Account for Judges */}
          <View style={styles.sandboxCard}>
            <Text style={styles.sandboxTitle}>🧪 Sandbox Test Account</Text>
            <Text style={styles.sandboxLabel}>For testing purchases (FREE):</Text>
            <View style={styles.sandboxCredentials}>
              <Text style={styles.sandboxText}>Email: <Text style={styles.sandboxValue}>pennytester@gmail.com</Text></Text>
              <Text style={styles.sandboxText}>Password: <Text style={styles.sandboxValue}>PennyTest2024!</Text></Text>
            </View>
            <Text style={styles.sandboxNote}>Sign in with these credentials when prompted after tapping "Get Penny Pro"</Text>
          </View>

          {__DEV__ && (
            <Pressable
              style={styles.demoButton}
              onPress={isDemoMode ? disableDemoMode : enableDemoMode}
            >
              <Text style={styles.demoText}>
                {isDemoMode ? 'Exit Demo' : 'Demo Mode (Skip Purchase)'}
              </Text>
            </Pressable>
          )}

          <Text style={styles.legalText}>
            Subscription renews automatically. Cancel anytime in Settings.
          </Text>

          <View style={styles.legalLinks}>
            <Pressable onPress={() => router.push('/legal/terms')}>
              <Text style={styles.legalLink}>Terms of Use</Text>
            </Pressable>
            <Text style={styles.legalDivider}>•</Text>
            <Pressable onPress={() => router.push('/legal/privacy')}>
              <Text style={styles.legalLink}>Privacy Policy</Text>
            </Pressable>
          </View>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  heroGradient: {
    paddingTop: 60,
    paddingBottom: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  iconContainer: {
    marginBottom: 16,
  },
  glowOuter: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowInner: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255, 215, 0, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
  },
  subscribedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    marginTop: 16,
  },
  subscribedText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
  },
  decorCircle1: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
  },
  decorCircle2: {
    position: 'absolute',
    bottom: -30,
    left: -30,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
  },
  featuresSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 16,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  featureIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  featureDescription: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  pricingSection: {
    padding: 20,
    paddingTop: 0,
  },
  plansContainer: {
    gap: 12,
    marginBottom: 20,
  },
  planCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 18,
    borderWidth: 2,
    borderColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'relative',
  },
  planCardSelected: {
    borderColor: '#8B5CF6',
    backgroundColor: 'rgba(139, 92, 246, 0.08)',
  },
  saveBadge: {
    position: 'absolute',
    top: -10,
    right: 16,
    backgroundColor: '#10B981',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  saveBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#fff',
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  radioOuterSelected: {
    borderColor: '#8B5CF6',
  },
  radioInner: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#8B5CF6',
  },
  planInfo: {
    gap: 2,
  },
  planName: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.text,
  },
  planSavings: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  planPrice: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
  },
  purchaseButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  purchaseButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 18,
  },
  purchaseButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  trustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  trustItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  trustText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  trustDivider: {
    width: 1,
    height: 14,
    backgroundColor: Colors.border,
  },
  socialProofSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    alignItems: 'center',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginLeft: 8,
  },
  compareSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  compareTable: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    overflow: 'hidden',
  },
  compareHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.08)',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  compareHeaderFeature: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  compareHeaderPlan: {
    width: 70,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  compareHeaderPro: {
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  compareHeaderLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  proLabel: {
    color: '#8B5CF6',
  },
  compareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  compareRowLast: {
    borderBottomWidth: 0,
  },
  compareFeatureCell: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  compareFeatureIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  compareFeature: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
  },
  compareValueCell: {
    width: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compareValuePro: {
    backgroundColor: 'rgba(139, 92, 246, 0.05)',
    marginVertical: -14,
    paddingVertical: 14,
  },
  compareValueText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  compareValueTextPro: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8B5CF6',
  },
  checkBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBadgePro: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#8B5CF6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  minusBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerSection: {
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 12,
  },
  restoreButton: {
    paddingVertical: 12,
  },
  restoreText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.primary,
  },
  sandboxCard: {
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.3)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    width: '100%',
  },
  sandboxTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FBBF24',
    marginBottom: 8,
    textAlign: 'center',
  },
  sandboxLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 8,
    textAlign: 'center',
  },
  sandboxCredentials: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  sandboxText: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  sandboxValue: {
    fontWeight: '600',
    color: Colors.text,
    fontFamily: 'monospace',
  },
  sandboxNote: {
    fontSize: 11,
    color: Colors.textMuted,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  demoButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: Colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  demoText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  legalText: {
    fontSize: 11,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 20,
  },
  legalLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
  },
  legalLink: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '500',
  },
  legalDivider: {
    fontSize: 12,
    color: Colors.textMuted,
  },
});
