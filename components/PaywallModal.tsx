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
import { X, Crown, Zap, Brain, PieChart, Bell, TrendingUp, Shield, Check } from 'lucide-react-native';
import { usePurchases } from '@/context/PurchasesContext';
import Colors from '@/constants/colors';
import { LinearGradient } from 'expo-linear-gradient';

const FEATURES = [
  { icon: Zap, text: 'Real-time price updates' },
  { icon: Brain, text: 'AI-powered insights' },
  { icon: PieChart, text: 'Diversification analysis' },
  { icon: Bell, text: 'Smart alerts & notifications' },
  { icon: TrendingUp, text: 'Tax loss harvesting alerts' },
  { icon: Shield, text: 'Priority support' },
];

export function PaywallModal() {
  const {
    isPaywallVisible,
    hidePaywall,
    isPurchasing,
    isRestoring,
    proMonthlyPackage,
    proAnnualPackage,
    purchase,
    restore,
    purchaseError,
  } = usePurchases();

  const [selectedPeriod, setSelectedPeriod] = useState<'monthly' | 'annual'>('annual');

  const handlePurchase = () => {
    const pkg = selectedPeriod === 'annual' ? proAnnualPackage : proMonthlyPackage;
    if (pkg) {
      purchase(pkg);
    }
  };

  const monthlyPrice = proMonthlyPackage?.product.priceString ?? '$6.99';
  const annualPrice = proAnnualPackage?.product.priceString ?? '$69.99';
  const annualMonthly = proAnnualPackage?.product.price
    ? `$${(proAnnualPackage.product.price / 12).toFixed(2)}`
    : '$5.83';

  const isProcessing = isPurchasing || isRestoring;

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
            {/* Header */}
            <View style={styles.header}>
              <LinearGradient
                colors={['rgba(139, 92, 246, 0.2)', 'rgba(139, 92, 246, 0.05)']}
                style={styles.iconGlow}
              >
                <Crown size={40} color="#FFD700" />
              </LinearGradient>
            </View>

            <Text style={styles.title}>Unlock Penny Pro</Text>
            <Text style={styles.subtitle}>
              Get the complete portfolio intelligence experience
            </Text>

            {/* Features */}
            <View style={styles.featuresContainer}>
              {FEATURES.map((feature, index) => (
                <View key={index} style={styles.featureRow}>
                  <View style={styles.featureIcon}>
                    <feature.icon size={18} color="#8B5CF6" />
                  </View>
                  <Text style={styles.featureText}>{feature.text}</Text>
                  <Check size={18} color="#10B981" />
                </View>
              ))}
            </View>

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
                  <Text style={styles.saveBadgeText}>SAVE 17%</Text>
                </View>
                <View style={styles.planHeader}>
                  <View style={[
                    styles.radioOuter,
                    selectedPeriod === 'annual' && styles.radioOuterSelected,
                  ]}>
                    {selectedPeriod === 'annual' && (
                      <View style={styles.radioInner} />
                    )}
                  </View>
                  <View>
                    <Text style={styles.planName}>Annual</Text>
                    <Text style={styles.planSubtext}>{annualMonthly}/month</Text>
                  </View>
                </View>
                <Text style={styles.planPrice}>{annualPrice}</Text>
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
                      <View style={styles.radioInner} />
                    )}
                  </View>
                  <View>
                    <Text style={styles.planName}>Monthly</Text>
                    <Text style={styles.planSubtext}>Flexible billing</Text>
                  </View>
                </View>
                <Text style={styles.planPrice}>{monthlyPrice}</Text>
              </TouchableOpacity>
            </View>

            {purchaseError && (
              <Text style={styles.errorText}>
                Something went wrong. Please try again.
              </Text>
            )}

            <TouchableOpacity
              style={[
                styles.purchaseButton,
                isProcessing && styles.buttonDisabled,
              ]}
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
                    <Crown size={20} color="#fff" />
                    <Text style={styles.purchaseButtonText}>
                      Subscribe to Penny Pro
                    </Text>
                  </>
                )}
              </LinearGradient>
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
    maxHeight: '85%',
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
    marginBottom: 20,
  },
  iconGlow: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  featuresContainer: {
    backgroundColor: Colors.background,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  featureText: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    fontWeight: '500',
  },
  plansContainer: {
    gap: 12,
    marginBottom: 20,
  },
  planCard: {
    backgroundColor: Colors.background,
    borderRadius: 16,
    padding: 16,
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
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  radioOuterSelected: {
    borderColor: '#8B5CF6',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#8B5CF6',
  },
  planName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  planSubtext: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  planPrice: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  errorText: {
    color: Colors.danger,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  purchaseButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
  },
  purchaseButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 18,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  purchaseButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  restoreButton: {
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  restoreButtonText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  legalText: {
    fontSize: 11,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 16,
  },
});
