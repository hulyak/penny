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
} from 'lucide-react-native';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'expo-router';
import { Card } from '@/components/Card';
import { ScreenCoachCard } from '@/components/CoachCard';
import { ObservabilityDashboard } from '@/components/ObservabilityDashboard';
import Colors from '@/constants/colors';

import { MASCOT_IMAGE_URL } from '@/constants/images';

const MASCOT_URL = MASCOT_IMAGE_URL;

export default function ProfileScreen() {
  const router = useRouter();
  const { financials, updateFinancials, resetDemo } = useApp();
  const { user, signOut } = useAuth();
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

  const updateField = (field: string, value: string) => {
    const numValue = parseInt(value.replace(/[^0-9]/g, ''), 10) || 0;
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
        <View style={styles.userCard}>
          <View style={styles.userAvatarContainer}>
            {user.photoUrl ? (
              <Image source={{ uri: user.photoUrl }} style={styles.userAvatar} />
            ) : (
              <View style={styles.userAvatarPlaceholder}>
                <User size={28} color={Colors.accent} />
              </View>
            )}
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user.displayName}</Text>
            <View style={styles.userEmailRow}>
              <Mail size={14} color={Colors.textMuted} />
              <Text style={styles.userEmail}>{user.email}</Text>
            </View>
            <View style={styles.providerBadge}>
              <Text style={styles.providerText}>
                {user.provider === 'google' ? 'Google Account' : 
                 user.provider === 'apple' ? 'Apple Account' : 'Email Account'}
              </Text>
            </View>
          </View>
          <Pressable style={styles.signOutButton} onPress={handleSignOut}>
            <LogOut size={20} color={Colors.danger} />
          </Pressable>
        </View>
      )}

      {/* Coach Card */}
      <ScreenCoachCard screenName="profile" />

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

      {/* AI Observability Dashboard */}
      <Pressable style={styles.dashboardButton} onPress={() => setShowDashboard(true)}>
        <View style={styles.dashboardIcon}>
          <BarChart2 size={20} color={Colors.accent} />
        </View>
        <View style={styles.dashboardInfo}>
          <Text style={styles.dashboardTitle}>AI Observability</Text>
          <Text style={styles.dashboardSubtitle}>View metrics, evaluations & feedback</Text>
        </View>
        <ChevronRight size={20} color={Colors.textMuted} />
      </Pressable>

      {/* Reset Button */}
      <Pressable style={styles.resetButton} onPress={handleReset}>
        <RefreshCw size={18} color={Colors.danger} />
        <Text style={styles.resetText}>Reset to Demo Data</Text>
      </Pressable>

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
        <Image source={{ uri: MASCOT_URL }} style={styles.tipMascot} />
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
    backgroundColor: Colors.danger + '10',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.danger + '30',
    marginBottom: 16,
  },
  resetText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.danger,
    marginLeft: 8,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.accentMuted,
    padding: 16,
    borderRadius: 12,
  },
  tipMascot: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.accent,
    marginBottom: 2,
  },
  tipText: {
    fontSize: 13,
    color: Colors.text,
    lineHeight: 18,
  },

  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  userAvatarContainer: {
    marginRight: 14,
  },
  userAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  userAvatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.accentMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  userEmailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  userEmail: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  providerBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.surfaceSecondary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  providerText: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  signOutButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.dangerMuted,
    justifyContent: 'center',
    alignItems: 'center',
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
});
