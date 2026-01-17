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
import { X, Sparkles, Crown, Zap, MessageCircle, BarChart3 } from 'lucide-react-native';
import { usePurchases } from '@/context/PurchasesContext';
import { Mascot } from '@/components/Mascot';
import Colors from '@/constants/colors';



const FEATURES = [
  { icon: MessageCircle, text: 'Unlimited coaching sessions' },
  { icon: BarChart3, text: 'Advanced scenario planning' },
  { icon: Zap, text: 'Unlimited "Ask Before I Buy"' },
  { icon: Sparkles, text: 'Priority weekly insights' },
];

export function PaywallModal() {
  const {
    isPaywallVisible,
    hidePaywall,
    isPurchasing,
    isRestoring,
    monthlyPackage,
    annualPackage,
    purchase,
    restore,
    purchaseError,
  } = usePurchases();

  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'annual'>('annual');

  const handlePurchase = () => {
    const pkg = selectedPlan === 'annual' ? annualPackage : monthlyPackage;
    if (pkg) {
      purchase(pkg);
    }
  };

  const monthlyPrice = monthlyPackage?.product.priceString ?? '$4.99';
  const annualPrice = annualPackage?.product.priceString ?? '$29.99';
  const annualMonthly = annualPackage?.product.price 
    ? `$${(annualPackage.product.price / 12).toFixed(2)}`
    : '$2.50';

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
            <View style={styles.header}>
              <View style={styles.mascotContainer}>
                <Mascot size="medium" mood="happy" />
              </View>
              <View style={styles.crownBadge}>
                <Crown size={16} color="#FFD700" />
              </View>
            </View>

            <Text style={styles.title}>Unlock Coach Plus</Text>
            <Text style={styles.subtitle}>
              Get unlimited access to your personal financial coach
            </Text>

            <View style={styles.featuresContainer}>
              {FEATURES.map((feature, index) => (
                <View key={index} style={styles.featureRow}>
                  <View style={styles.featureIcon}>
                    <feature.icon size={18} color={Colors.primary} />
                  </View>
                  <Text style={styles.featureText}>{feature.text}</Text>
                </View>
              ))}
            </View>

            <View style={styles.plansContainer}>
              <TouchableOpacity
                style={[
                  styles.planCard,
                  selectedPlan === 'annual' && styles.planCardSelected,
                ]}
                onPress={() => setSelectedPlan('annual')}
                disabled={isProcessing}
              >
                <View style={styles.saveBadge}>
                  <Text style={styles.saveBadgeText}>SAVE 50%</Text>
                </View>
                <View style={styles.planHeader}>
                  <View style={[
                    styles.radioOuter,
                    selectedPlan === 'annual' && styles.radioOuterSelected,
                  ]}>
                    {selectedPlan === 'annual' && (
                      <View style={styles.radioInner} />
                    )}
                  </View>
                  <Text style={styles.planName}>Annual</Text>
                </View>
                <Text style={styles.planPrice}>{annualPrice}</Text>
                <Text style={styles.planPeriod}>{annualMonthly}/month</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.planCard,
                  selectedPlan === 'monthly' && styles.planCardSelected,
                ]}
                onPress={() => setSelectedPlan('monthly')}
                disabled={isProcessing}
              >
                <View style={styles.planHeader}>
                  <View style={[
                    styles.radioOuter,
                    selectedPlan === 'monthly' && styles.radioOuterSelected,
                  ]}>
                    {selectedPlan === 'monthly' && (
                      <View style={styles.radioInner} />
                    )}
                  </View>
                  <Text style={styles.planName}>Monthly</Text>
                </View>
                <Text style={styles.planPrice}>{monthlyPrice}</Text>
                <Text style={styles.planPeriod}>per month</Text>
              </TouchableOpacity>
            </View>

            {purchaseError && (
              <Text style={styles.errorText}>{purchaseError}</Text>
            )}

            <TouchableOpacity
              style={[styles.purchaseButton, isProcessing && styles.buttonDisabled]}
              onPress={handlePurchase}
              disabled={isProcessing}
            >
              {isPurchasing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Sparkles size={20} color="#fff" />
                  <Text style={styles.purchaseButtonText}>
                    Start Coach Plus
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
    marginBottom: 24,
    lineHeight: 22,
  },
  featuresContainer: {
    backgroundColor: Colors.background,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
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
    backgroundColor: `${Colors.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  featureText: {
    fontSize: 15,
    color: Colors.text,
    fontWeight: '500' as const,
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
    backgroundColor: Colors.primary,
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
    backgroundColor: Colors.primary,
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
