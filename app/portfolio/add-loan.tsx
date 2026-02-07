import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  Home,
  Car,
  GraduationCap,
  User,
  CreditCard,
  DollarSign,
  Percent,
  Calendar,
  Check,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import loanService from '@/lib/loanService';
import { calculateMonthlyPayment } from '@/lib/loanService';

type LoanType = 'mortgage' | 'auto' | 'personal' | 'student' | 'other';

const LOAN_TYPES: { type: LoanType; label: string; icon: any }[] = [
  { type: 'mortgage', label: 'Mortgage', icon: Home },
  { type: 'auto', label: 'Auto', icon: Car },
  { type: 'student', label: 'Student', icon: GraduationCap },
  { type: 'personal', label: 'Personal', icon: User },
  { type: 'other', label: 'Other', icon: CreditCard },
];

export default function AddLoanScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [name, setName] = useState('');
  const [lender, setLender] = useState('');
  const [principal, setPrincipal] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [termMonths, setTermMonths] = useState('');
  const [paymentDay, setPaymentDay] = useState('1');
  const [loanType, setLoanType] = useState<LoanType>('mortgage');
  const [isSaving, setIsSaving] = useState(false);

  const principalNum = parseFloat(principal) || 0;
  const rateNum = parseFloat(interestRate) || 0;
  const termNum = parseInt(termMonths) || 0;

  const monthlyPayment = principalNum > 0 && rateNum >= 0 && termNum > 0
    ? calculateMonthlyPayment(principalNum, rateNum, termNum)
    : 0;

  const totalInterest = monthlyPayment > 0
    ? (monthlyPayment * termNum) - principalNum
    : 0;

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Missing Info', 'Please enter a loan name.');
      return;
    }
    if (principalNum <= 0) {
      Alert.alert('Missing Info', 'Please enter the loan principal amount.');
      return;
    }
    if (termNum <= 0) {
      Alert.alert('Missing Info', 'Please enter the loan term in months.');
      return;
    }

    setIsSaving(true);
    try {
      await loanService.addLoan({
        name: name.trim(),
        lender: lender.trim() || 'Unknown',
        principal: principalNum,
        interestRate: rateNum,
        termMonths: termNum,
        startDate: new Date().toISOString().split('T')[0],
        paymentDay: Math.min(28, Math.max(1, parseInt(paymentDay) || 1)),
        type: loanType,
      });

      router.back();
    } catch (error) {
      console.error('Failed to save loan:', error);
      Alert.alert('Error', 'Failed to save the loan. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <ChevronLeft size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Add Loan</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Loan Type */}
        <Text style={styles.sectionTitle}>Loan Type</Text>
        <View style={styles.typeGrid}>
          {LOAN_TYPES.map(({ type, label, icon: Icon }) => (
            <Pressable
              key={type}
              style={[styles.typeCard, loanType === type && styles.typeCardSelected]}
              onPress={() => setLoanType(type)}
            >
              <Icon
                size={20}
                color={loanType === type ? Colors.primary : Colors.textMuted}
              />
              <Text style={[
                styles.typeLabel,
                loanType === type && styles.typeLabelSelected,
              ]}>
                {label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Loan Details */}
        <Text style={styles.sectionTitle}>Loan Details</Text>
        <View style={styles.formCard}>
          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>Loan Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Home Mortgage"
              placeholderTextColor={Colors.textMuted}
            />
          </View>

          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>Lender</Text>
            <TextInput
              style={styles.input}
              value={lender}
              onChangeText={setLender}
              placeholder="e.g. Chase Bank"
              placeholderTextColor={Colors.textMuted}
            />
          </View>

          <View style={styles.inputRow}>
            <View style={styles.inputIcon}>
              <DollarSign size={16} color={Colors.textSecondary} />
            </View>
            <Text style={styles.inputLabel}>Principal Amount</Text>
            <TextInput
              style={styles.input}
              value={principal}
              onChangeText={setPrincipal}
              placeholder="250,000"
              placeholderTextColor={Colors.textMuted}
              keyboardType="decimal-pad"
            />
          </View>

          <View style={styles.inputRow}>
            <View style={styles.inputIcon}>
              <Percent size={16} color={Colors.textSecondary} />
            </View>
            <Text style={styles.inputLabel}>Annual Interest Rate (%)</Text>
            <TextInput
              style={styles.input}
              value={interestRate}
              onChangeText={setInterestRate}
              placeholder="6.5"
              placeholderTextColor={Colors.textMuted}
              keyboardType="decimal-pad"
            />
          </View>

          <View style={styles.inputRow}>
            <View style={styles.inputIcon}>
              <Calendar size={16} color={Colors.textSecondary} />
            </View>
            <Text style={styles.inputLabel}>Term (months)</Text>
            <TextInput
              style={styles.input}
              value={termMonths}
              onChangeText={setTermMonths}
              placeholder="360"
              placeholderTextColor={Colors.textMuted}
              keyboardType="number-pad"
            />
          </View>

          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>Payment Day of Month</Text>
            <TextInput
              style={styles.input}
              value={paymentDay}
              onChangeText={setPaymentDay}
              placeholder="1"
              placeholderTextColor={Colors.textMuted}
              keyboardType="number-pad"
            />
          </View>
        </View>

        {/* Preview */}
        {monthlyPayment > 0 && (
          <View style={styles.previewCard}>
            <Text style={styles.previewTitle}>Payment Preview</Text>
            <View style={styles.previewRow}>
              <Text style={styles.previewLabel}>Monthly Payment</Text>
              <Text style={styles.previewValue}>
                ${monthlyPayment.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
            </View>
            <View style={styles.previewRow}>
              <Text style={styles.previewLabel}>Total Interest</Text>
              <Text style={[styles.previewValue, { color: Colors.warning }]}>
                ${totalInterest.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
            </View>
            <View style={styles.previewRow}>
              <Text style={styles.previewLabel}>Total Cost</Text>
              <Text style={styles.previewValue}>
                ${(principalNum + totalInterest).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
            </View>
          </View>
        )}

        {/* Save Button */}
        <Pressable
          style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={isSaving}
        >
          <Check size={20} color="#fff" />
          <Text style={styles.saveButtonText}>
            {isSaving ? 'Saving...' : 'Add Loan'}
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
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
    padding: 16,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
    marginTop: 8,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  typeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  typeCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: `${Colors.primary}10`,
  },
  typeLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  typeLabelSelected: {
    color: Colors.primary,
    fontWeight: '600',
  },
  formCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  inputIcon: {
    marginRight: 8,
  },
  inputLabel: {
    flex: 1,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  input: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'right',
    minWidth: 120,
    paddingVertical: 4,
  },
  previewCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 14,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  previewLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  previewValue: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
