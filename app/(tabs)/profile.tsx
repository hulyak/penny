import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  Image,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  DollarSign,
  Home,
  Car,
  ShoppingCart,
  PiggyBank,
  CreditCard,
  RefreshCw,
  Save,
  Edit3,
  LogOut,
  User,
  Mail,
  BarChart2,
  ChevronRight,
  X,
  Shield,
  Crown,
  Zap,
  Sparkles,
  Check,
  Trash2,
  FileText,
} from 'lucide-react-native';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { usePurchases } from '@/context/PurchasesContext';
import { useRouter } from 'expo-router';
import { Card } from '@/components/Card';
import { ObservabilityDashboard } from '@/components/ObservabilityDashboard';
import { ReferralCard } from '@/components/ReferralCard';
import Colors from '@/constants/colors';
import { validateBudgetAmount } from '@/lib/validation';

import { PENNY_MASCOT } from '@/constants/images';

export default function ProfileScreen() {
  const router = useRouter();
  const { financials, updateFinancials, resetDemo } = useApp();
  const { user, signOut } = useAuth();
  const { subscriptionTier, isTrialActive, trialDaysRemaining, showPaywall } = usePurchases();
  const [isEditing, setIsEditing] = useState(false);
  const [editedFinancials, setEditedFinancials] = useState({ ...financials });
  const [showDashboard, setShowDashboard] = useState(false);

  const handleSave = () => {
    updateFinancials(editedFinancials);
    setIsEditing(false);
  };

  const handleReset = () => {
    Alert.alert(
      'Reset to Demo',
      'This will reset all your data to demo values. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Reset', 
          style: 'destructive',
          onPress: () => {
            resetDemo();
            setIsEditing(false);
          },
        },
      ]
    );
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await signOut();
            router.replace('/auth' as any);
          },
        },
      ]
    );
  };

  const handleDeleteProfile = () => {
    Alert.alert(
      'Delete Profile',
      'Are you sure you want to delete your profile? This action cannot be undone. All your data will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            // Clear all local data
            resetDemo();
            await signOut();
            router.replace('/auth' as any);
          },
        },
      ]
    );
  };

  const updateField = (field: string, value: string) => {
    const { numValue } = validateBudgetAmount(value);
    setEditedFinancials(prev => ({ ...prev, [field]: numValue }));
  };

  const renderField = (
    label: string,
    field: string,
    icon: React.ReactNode
  ) => {
    const value = isEditing 
      ? editedFinancials[field as keyof typeof editedFinancials]
      : financials[field as keyof typeof financials];

    return (
      <View style={styles.fieldRow}>
        <View style={styles.fieldLeft}>
          {icon}
          <Text style={styles.fieldLabel}>{label}</Text>
        </View>
        {isEditing ? (
          <TextInput
            style={styles.input}
            value={String(value)}
            onChangeText={(text) => updateField(field, text)}
            keyboardType="numeric"
            placeholder="0"
          />
        ) : (
          <Text style={styles.fieldValue}>
            ${(value as number).toLocaleString()}
          </Text>
        )}
      </View>
    );
  };

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* User Profile Card */}
      {user && (
        <View style={styles.userCardWrapper}>
          <LinearGradient
            colors={[Colors.primary, Colors.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.userCardGradient}
          >
            <View style={styles.userDecor1} />
            <View style={styles.userDecor2} />
            <View style={styles.userAvatarContainer}>
              {user.photoUrl ? (
                <Image source={{ uri: user.photoUrl }} style={styles.userAvatar} />
              ) : (
                <View style={styles.userAvatarPlaceholder}>
                  <User size={28} color={Colors.primary} />
                </View>
              )}
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{user.displayName}</Text>
              <View style={styles.userEmailRow}>
                <Mail size={14} color="rgba(255,255,255,0.6)" />
                <Text style={styles.userEmail}>{user.email}</Text>
              </View>
            </View>
          </LinearGradient>
          <View style={styles.userCardBottom}>
            <View style={styles.providerBadge}>
              <Text style={styles.providerText}>
                {user.provider === 'google' ? 'Google Account' :
                 user.provider === 'apple' ? 'Apple Account' : 'Email Account'}
              </Text>
            </View>
            <Pressable style={styles.signOutButton} onPress={handleSignOut}>
              <LogOut size={18} color={Colors.danger} />
              <Text style={styles.signOutText}>Sign Out</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Referral Card - Virality Feature */}
      <ReferralCard userId={user?.id || 'guest'} compact />

      {/* Penny Pro Subscription Card */}
      <Pressable
        style={styles.subscriptionCard}
        onPress={() => router.push('/portfolio/subscription' as any)}
      >
        <View style={styles.subscriptionHeader}>
          <View style={[
            styles.subscriptionIconContainer,
            {
              backgroundColor: subscriptionTier === 'pro' ? `${Colors.primary}20` :
                               Colors.surfaceSecondary,
            },
          ]}>
            {subscriptionTier === 'pro' ? (
              <Zap size={22} color={Colors.primary} />
            ) : (
              <Sparkles size={22} color={Colors.textMuted} />
            )}
          </View>
          <View style={styles.subscriptionInfo}>
            <Text style={styles.subscriptionTitle}>
              Penny {subscriptionTier === 'pro' ? 'Pro' : 'Free'}
            </Text>
            {isTrialActive ? (
              <Text style={styles.subscriptionSubtitle}>
                Trial: {trialDaysRemaining} days remaining
              </Text>
            ) : subscriptionTier === 'free' ? (
              <Text style={styles.subscriptionSubtitle}>
                Upgrade to unlock all features
              </Text>
            ) : (
              <Text style={styles.subscriptionSubtitle}>Active subscription</Text>
            )}
          </View>
          <ChevronRight size={20} color={Colors.textMuted} />
        </View>

        {subscriptionTier === 'free' && (
          <View style={styles.subscriptionPricing}>
            <View style={styles.pricingOption}>
              <View style={styles.pricingBadge}>
                <Zap size={12} color={Colors.primary} />
                <Text style={styles.pricingBadgeText}>PRO</Text>
              </View>
              <Text style={styles.pricingAmount}>$4.99</Text>
              <Text style={styles.pricingPeriod}>/month</Text>
            </View>
            <View style={styles.pricingDivider} />
            <View style={styles.pricingOption}>
              <View style={[styles.pricingBadge, { backgroundColor: `${Colors.gold}20` }]}>
                <Crown size={12} color={Colors.gold} />
                <Text style={[styles.pricingBadgeText, { color: Colors.gold }]}>PREMIUM</Text>
              </View>
              <Text style={styles.pricingAmount}>$9.99</Text>
              <Text style={styles.pricingPeriod}>/month</Text>
            </View>
          </View>
        )}

        {subscriptionTier === 'free' && (
          <View style={styles.subscriptionFeatures}>
            {['Real-time prices', 'AI insights', 'Statement parsing'].map((feature) => (
              <View key={feature} style={styles.subscriptionFeature}>
                <Check size={14} color={Colors.success} />
                <Text style={styles.subscriptionFeatureText}>{feature}</Text>
              </View>
            ))}
          </View>
        )}

        {subscriptionTier === 'free' && (
          <Pressable
            style={styles.upgradeCtaButton}
            onPress={(e) => {
              e.stopPropagation();
              showPaywall();
            }}
          >
            <Text style={styles.upgradeCtaText}>Upgrade Now</Text>
          </Pressable>
        )}

        {subscriptionTier === 'pro' && (
          <View style={styles.subscriptionFeatures}>
            <View style={styles.subscriptionFeature}>
              <Crown size={14} color={Colors.gold} />
              <Text style={styles.subscriptionFeatureText}>
                Upgrade to Premium for AI insights & statement parsing
              </Text>
            </View>
          </View>
        )}
      </Pressable>

      {/* Income & Expenses Card */}
      <Card style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Income & Expenses</Text>
          {!isEditing ? (
            <Pressable 
              style={styles.editButton}
              onPress={() => setIsEditing(true)}
            >
              <Edit3 size={16} color={Colors.accent} />
              <Text style={styles.editButtonText}>Edit</Text>
            </Pressable>
          ) : (
            <Pressable 
              style={styles.saveButton}
              onPress={handleSave}
            >
              <Save size={16} color="#fff" />
              <Text style={styles.saveButtonText}>Save</Text>
            </Pressable>
          )}
        </View>

        {renderField('Monthly Income', 'monthlyIncome', 
          <DollarSign size={18} color={Colors.success} />
        )}
        {renderField('Housing', 'housingCost', 
          <Home size={18} color={Colors.accent} />
        )}
        {renderField('Transportation', 'carCost', 
          <Car size={18} color={Colors.warning} />
        )}
        {renderField('Essentials', 'essentialsCost', 
          <ShoppingCart size={18} color={Colors.textSecondary} />
        )}
      </Card>

      {/* Savings & Goals Card */}
      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Savings & Goals</Text>
        
        {renderField('Current Savings', 'savings', 
          <PiggyBank size={18} color={Colors.success} />
        )}
        {renderField('Total Debt', 'debts', 
          <CreditCard size={18} color={Colors.danger} />
        )}
        {renderField('Emergency Goal', 'emergencyFundGoal', 
          <DollarSign size={18} color={Colors.accent} />
        )}
      </Card>

      {/* AI Performance */}
      <Pressable
        style={styles.dashboardButton}
        onPress={() => router.push('/portfolio/opik-dashboard' as any)}
      >
        <View style={styles.dashboardIcon}>
          <BarChart2 size={20} color={Colors.primary} />
        </View>
        <View style={styles.dashboardInfo}>
          <Text style={styles.dashboardTitle}>AI Performance</Text>
          <Text style={styles.dashboardSubtitle}>See how well Penny's AI is doing</Text>
        </View>
        <ChevronRight size={20} color={Colors.textMuted} />
      </Pressable>

      {/* Usage Stats */}
      <Pressable style={styles.dashboardButton} onPress={() => setShowDashboard(true)}>
        <View style={styles.dashboardIcon}>
          <BarChart2 size={20} color={Colors.accent} />
        </View>
        <View style={styles.dashboardInfo}>
          <Text style={styles.dashboardTitle}>App Activity</Text>
          <Text style={styles.dashboardSubtitle}>Your usage and feedback history</Text>
        </View>
        <ChevronRight size={20} color={Colors.textMuted} />
      </Pressable>

      {/* Reset Button */}
      <Pressable style={styles.resetButton} onPress={handleReset}>
        <RefreshCw size={18} color={Colors.danger} />
        <Text style={styles.resetText}>Reset to Demo Data</Text>
      </Pressable>

      {/* Delete Profile Button */}
      <Pressable style={styles.deleteButton} onPress={handleDeleteProfile}>
        <Trash2 size={18} color={Colors.danger} />
        <Text style={styles.deleteText}>Delete Profile</Text>
      </Pressable>

      {/* Legal Links */}
      <View style={styles.legalSection}>
        <Pressable
          style={styles.legalButton}
          onPress={() => router.push('/legal/terms' as any)}
        >
          <FileText size={18} color={Colors.textSecondary} />
          <Text style={styles.legalButtonText}>Terms of Use</Text>
          <ChevronRight size={18} color={Colors.textMuted} />
        </Pressable>
        <Pressable
          style={styles.legalButton}
          onPress={() => router.push('/legal/privacy' as any)}
        >
          <Shield size={18} color={Colors.textSecondary} />
          <Text style={styles.legalButtonText}>Privacy Policy</Text>
          <ChevronRight size={18} color={Colors.textMuted} />
        </Pressable>
      </View>

      {/* Observability Dashboard Modal */}
      <Modal
        visible={showDashboard}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDashboard(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>AI Performance</Text>
            <Pressable style={styles.modalClose} onPress={() => setShowDashboard(false)}>
              <X size={24} color={Colors.text} />
            </Pressable>
          </View>
          <ObservabilityDashboard />
        </View>
      </Modal>

      {/* Tip Card */}
      <View style={styles.tipCard}>
        <View style={styles.tipIconWrapper}>
          <Shield size={20} color={Colors.accent} />
        </View>
        <View style={styles.tipContent}>
          <Text style={styles.tipTitle}>Your Data is Private</Text>
          <Text style={styles.tipText}>
            Everything stays on your device. This is an educational tool, not financial advice.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },

  card: {
    padding: 16,
    marginTop: 16,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: Colors.accent + '15',
    borderRadius: 8,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.accent,
    marginLeft: 6,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: Colors.success,
    borderRadius: 8,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 6,
  },
  fieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  fieldLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fieldLabel: {
    fontSize: 15,
    color: Colors.text,
    marginLeft: 12,
  },
  fieldValue: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  input: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    backgroundColor: Colors.surfaceSecondary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 100,
    textAlign: 'right',
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 12,
  },
  resetText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginLeft: 8,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    backgroundColor: Colors.danger + '10',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.danger + '30',
    marginBottom: 16,
  },
  deleteText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.danger,
    marginLeft: 8,
  },
  legalSection: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  legalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  legalButtonText: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    marginLeft: 12,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.accentMuted,
  },
  tipIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.accentMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  tipText: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },

  // User Card
  userCardWrapper: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 8,
  },
  userCardGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  userDecor1: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  userDecor2: {
    position: 'absolute',
    bottom: -20,
    left: -20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  userCardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 14,
    paddingHorizontal: 16,
  },
  userAvatarContainer: {
    marginRight: 14,
  },
  userAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  userAvatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  userEmailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  userEmail: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
  },
  providerBadge: {
    backgroundColor: Colors.surfaceSecondary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  providerText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: Colors.dangerMuted,
  },
  signOutText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.danger,
  },
  dashboardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  dashboardIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.accentMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  dashboardInfo: {
    flex: 1,
  },
  dashboardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  dashboardSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  modalClose: {
    padding: 4,
  },

  // Subscription Card
  subscriptionCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  subscriptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  subscriptionIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  subscriptionInfo: {
    flex: 1,
  },
  subscriptionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text,
  },
  subscriptionSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  subscriptionPricing: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  pricingOption: {
    flex: 1,
    alignItems: 'center',
  },
  pricingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: `${Colors.primary}15`,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 8,
  },
  pricingBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.primary,
  },
  pricingAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
  },
  pricingPeriod: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  pricingDivider: {
    width: 1,
    height: 50,
    backgroundColor: Colors.border,
  },
  subscriptionFeatures: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  subscriptionFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  subscriptionFeatureText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  upgradeCtaButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 14,
  },
  upgradeCtaText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
});
