import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft,
  DollarSign,
  Home,
  Car,
  ShoppingCart,
  PiggyBank,
  CreditCard,
  Target,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { validateBudgetAmount, MAX_BUDGET_AMOUNT } from '@/lib/validation';

interface BudgetData {
  monthlyIncome: number;
  housingCost: number;
  carCost: number;
  essentialsCost: number;
  savings: number;
  debts: number;
}

interface BudgetEntryScreenProps {
  onContinue: (data: BudgetData) => void;
  onBack: () => void;
  onSkip: () => void;
}

const BUDGET_FIELDS = [
  {
    key: 'monthlyIncome',
    label: 'Monthly Income',
    placeholder: '5000',
    icon: DollarSign,
    color: Colors.success,
    description: 'Your take-home pay after taxes',
  },
  {
    key: 'housingCost',
    label: 'Housing',
    placeholder: '1500',
    icon: Home,
    color: Colors.accent,
    description: 'Rent or mortgage payment',
  },
  {
    key: 'carCost',
    label: 'Transportation',
    placeholder: '400',
    icon: Car,
    color: Colors.warning,
    description: 'Car payment, gas, insurance',
  },
  {
    key: 'essentialsCost',
    label: 'Essentials',
    placeholder: '600',
    icon: ShoppingCart,
    color: Colors.lavender,
    description: 'Groceries, utilities, phone',
  },
  {
    key: 'savings',
    label: 'Current Savings',
    placeholder: '3000',
    icon: PiggyBank,
    color: Colors.primary,
    description: 'Emergency fund, savings accounts',
  },
  {
    key: 'debts',
    label: 'Total Debt',
    placeholder: '10000',
    icon: CreditCard,
    color: Colors.coral,
    description: 'Credit cards, loans, etc.',
  },
];

export function BudgetEntryScreen({ onContinue, onBack, onSkip }: BudgetEntryScreenProps) {
  const insets = useSafeAreaInsets();
  const [budgetData, setBudgetData] = useState<BudgetData>({
    monthlyIncome: 0,
    housingCost: 0,
    carCost: 0,
    essentialsCost: 0,
    savings: 0,
    debts: 0,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateField = (key: string, value: string) => {
    const { isValid, numValue, error } = validateBudgetAmount(value);

    setBudgetData(prev => ({ ...prev, [key]: numValue }));

    if (!isValid && error) {
      setErrors(prev => ({ ...prev, [key]: error }));
    } else {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[key];
        return newErrors;
      });
    }
  };

  const formatValue = (value: number): string => {
    if (value === 0) return '';
    return value.toLocaleString();
  };

  const handleContinue = () => {
    // Calculate emergency fund goal (3 months of expenses)
    const monthlyExpenses = budgetData.housingCost + budgetData.carCost + budgetData.essentialsCost;
    const emergencyFundGoal = monthlyExpenses * 3;

    onContinue({
      ...budgetData,
    });
  };

  const monthlyExpenses = budgetData.housingCost + budgetData.carCost + budgetData.essentialsCost;
  const monthlySurplus = budgetData.monthlyIncome - monthlyExpenses;
  const hasValidData = budgetData.monthlyIncome > 0;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0f172a', '#1e293b', '#334155']}
        style={StyleSheet.absoluteFill}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <Pressable onPress={onBack} style={styles.backButton}>
            <ArrowLeft size={24} color={Colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Your Budget</Text>
          <Pressable onPress={onSkip} style={styles.skipButton}>
            <Text style={styles.skipText}>Skip</Text>
          </Pressable>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Intro */}
          <View style={styles.intro}>
            <Target size={32} color={Colors.accent} />
            <Text style={styles.introTitle}>Let's understand your finances</Text>
            <Text style={styles.introSubtitle}>
              This helps Penny give you personalized insights and recommendations.
            </Text>
          </View>

          {/* Budget Fields */}
          <View style={styles.fieldsContainer}>
            {BUDGET_FIELDS.map((field) => {
              const Icon = field.icon;
              const value = budgetData[field.key as keyof BudgetData];
              return (
                <View key={field.key} style={styles.fieldCard}>
                  <View style={styles.fieldHeader}>
                    <View style={[styles.fieldIcon, { backgroundColor: field.color + '20' }]}>
                      <Icon size={20} color={field.color} />
                    </View>
                    <View style={styles.fieldInfo}>
                      <Text style={styles.fieldLabel}>{field.label}</Text>
                      <Text style={styles.fieldDescription}>{field.description}</Text>
                    </View>
                  </View>
                  <View style={styles.inputContainer}>
                    <Text style={styles.dollarSign}>$</Text>
                    <TextInput
                      style={styles.input}
                      value={formatValue(value)}
                      onChangeText={(text) => updateField(field.key, text)}
                      keyboardType="numeric"
                      placeholder={field.placeholder}
                      placeholderTextColor={Colors.textMuted}
                    />
                  </View>
                </View>
              );
            })}
          </View>

          {/* Summary Card */}
          {hasValidData && (
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Monthly Overview</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Income</Text>
                <Text style={styles.summaryValue}>${budgetData.monthlyIncome.toLocaleString()}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Expenses</Text>
                <Text style={styles.summaryValue}>-${monthlyExpenses.toLocaleString()}</Text>
              </View>
              <View style={[styles.summaryRow, styles.summaryRowTotal]}>
                <Text style={styles.summaryLabelTotal}>Monthly Surplus</Text>
                <Text style={[
                  styles.summaryValueTotal,
                  { color: monthlySurplus >= 0 ? Colors.success : Colors.danger }
                ]}>
                  ${monthlySurplus.toLocaleString()}
                </Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Footer */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + 24 }]}>
          <Pressable
            style={({ pressed }) => [
              styles.continueButton,
              pressed && styles.continueButtonPressed,
            ]}
            onPress={handleContinue}
          >
            <Text style={styles.continueText}>Continue</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  skipButton: {
    padding: 8,
  },
  skipText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 32,
  },
  intro: {
    alignItems: 'center',
    marginBottom: 32,
  },
  introTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 16,
    textAlign: 'center',
  },
  introSubtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 22,
  },
  fieldsContainer: {
    gap: 16,
  },
  fieldCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  fieldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  fieldIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  fieldInfo: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  fieldDescription: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 2,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  dollarSign: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginRight: 4,
  },
  input: {
    flex: 1,
    fontSize: 24,
    fontWeight: '600',
    color: Colors.text,
    paddingVertical: 14,
  },
  summaryCard: {
    backgroundColor: 'rgba(0, 208, 156, 0.1)',
    borderRadius: 16,
    padding: 20,
    marginTop: 24,
    borderWidth: 1,
    borderColor: 'rgba(0, 208, 156, 0.2)',
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  summaryRowTotal: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    marginTop: 8,
    paddingTop: 16,
  },
  summaryLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  summaryLabelTotal: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  summaryValueTotal: {
    fontSize: 20,
    fontWeight: '700',
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  continueButton: {
    backgroundColor: '#fff',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
  },
  continueButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  continueText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
});
