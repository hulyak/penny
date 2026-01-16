import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { 
  ArrowRight,
  DollarSign,
  Home,
  Car,
  ShoppingCart,
  ChevronLeft,
} from 'lucide-react-native';
import { useApp } from '@/context/AppContext';
import Colors from '@/constants/colors';

const STEPS = [
  {
    id: 'welcome',
    title: 'Welcome to ClearPath',
    subtitle: 'Get clarity on your finances in just a few steps.',
  },
  {
    id: 'income',
    title: 'Monthly Income',
    subtitle: 'Your take-home pay after taxes',
    field: 'monthlyIncome',
    icon: DollarSign,
    placeholder: '5500',
  },
  {
    id: 'housing',
    title: 'Housing Costs',
    subtitle: 'Rent/mortgage, utilities, insurance',
    field: 'housingCost',
    icon: Home,
    placeholder: '1800',
  },
  {
    id: 'transportation',
    title: 'Transportation',
    subtitle: 'Car payment, insurance, gas, transit',
    field: 'carCost',
    icon: Car,
    placeholder: '450',
  },
  {
    id: 'essentials',
    title: 'Other Essentials',
    subtitle: 'Groceries, healthcare, phone, etc.',
    field: 'essentialsCost',
    icon: ShoppingCart,
    placeholder: '800',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { completeOnboarding } = useApp();
  
  const [currentStep, setCurrentStep] = useState(0);
  const [values, setValues] = useState({
    monthlyIncome: '',
    housingCost: '',
    carCost: '',
    essentialsCost: '',
  });

  const step = STEPS[currentStep];
  const isWelcome = currentStep === 0;
  const isLastStep = currentStep === STEPS.length - 1;
  const progress = ((currentStep) / (STEPS.length - 1)) * 100;

  const handleNext = () => {
    if (isLastStep) {
      const financials = {
        monthlyIncome: parseInt(values.monthlyIncome, 10) || 5500,
        housingCost: parseInt(values.housingCost, 10) || 1800,
        carCost: parseInt(values.carCost, 10) || 450,
        essentialsCost: parseInt(values.essentialsCost, 10) || 800,
        savings: 3200,
        debts: 12000,
        emergencyFundGoal: 
          ((parseInt(values.housingCost, 10) || 1800) +
          (parseInt(values.carCost, 10) || 450) +
          (parseInt(values.essentialsCost, 10) || 800)) * 3,
      };
      completeOnboarding(financials);
      router.replace('/(tabs)');
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    completeOnboarding({
      monthlyIncome: 5500,
      housingCost: 1800,
      carCost: 450,
      essentialsCost: 800,
      savings: 3200,
      debts: 12000,
      emergencyFundGoal: 9150,
    });
    router.replace('/(tabs)');
  };

  const updateValue = (field: string, value: string) => {
    setValues(prev => ({ ...prev, [field]: value.replace(/[^0-9]/g, '') }));
  };

  const currentValue = step.field ? values[step.field as keyof typeof values] : '';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
        <Text style={styles.progressText}>
          {currentStep} of {STEPS.length - 1}
        </Text>
      </View>

      <KeyboardAvoidingView 
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            {currentStep > 0 && (
              <Pressable style={styles.backButton} onPress={handleBack}>
                <ChevronLeft size={24} color={Colors.text} />
              </Pressable>
            )}
          </View>

          {/* Content */}
          <View style={styles.mainContent}>
            {isWelcome ? (
              <View style={styles.welcomeContent}>
                <View style={styles.logo}>
                  <Text style={styles.logoText}>CP</Text>
                </View>
                <Text style={styles.welcomeTitle}>ClearPath</Text>
                <Text style={styles.welcomeSubtitle}>
                  Financial clarity, simplified
                </Text>
                
                <View style={styles.features}>
                  <View style={styles.feature}>
                    <View style={styles.featureDot} />
                    <Text style={styles.featureText}>Track your financial health</Text>
                  </View>
                  <View style={styles.feature}>
                    <View style={styles.featureDot} />
                    <Text style={styles.featureText}>Explore different scenarios</Text>
                  </View>
                  <View style={styles.feature}>
                    <View style={styles.featureDot} />
                    <Text style={styles.featureText}>Get personalized weekly plans</Text>
                  </View>
                  <View style={styles.feature}>
                    <View style={styles.featureDot} />
                    <Text style={styles.featureText}>Learn financial basics</Text>
                  </View>
                </View>

                <View style={styles.disclaimer}>
                  <Text style={styles.disclaimerText}>
                    ClearPath is an educational tool. It does not provide 
                    financial advice or recommendations.
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.inputContent}>
                {step.icon && (
                  <View style={styles.iconContainer}>
                    <step.icon size={32} color={Colors.accent} />
                  </View>
                )}
                
                <Text style={styles.stepTitle}>{step.title}</Text>
                <Text style={styles.stepSubtitle}>{step.subtitle}</Text>

                <View style={styles.inputContainer}>
                  <Text style={styles.currencySymbol}>$</Text>
                  <TextInput
                    style={styles.input}
                    value={currentValue}
                    onChangeText={(text) => updateValue(step.field!, text)}
                    placeholder={step.placeholder}
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="numeric"
                    autoFocus
                  />
                  <Text style={styles.perMonth}>/mo</Text>
                </View>
              </View>
            )}
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Pressable 
              style={styles.primaryButton}
              onPress={handleNext}
            >
              <Text style={styles.primaryButtonText}>
                {isWelcome ? 'Get Started' : isLastStep ? 'Finish' : 'Continue'}
              </Text>
              <ArrowRight size={20} color="#fff" />
            </Pressable>

            {isWelcome && (
              <Pressable style={styles.skipButton} onPress={handleSkip}>
                <Text style={styles.skipButtonText}>Use Demo Data</Text>
              </Pressable>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    marginRight: 12,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.accent,
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    color: Colors.textMuted,
    width: 40,
    textAlign: 'right',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
  },
  header: {
    height: 44,
    justifyContent: 'center',
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: -12,
  },
  mainContent: {
    flex: 1,
    justifyContent: 'center',
  },
  welcomeContent: {
    alignItems: 'center',
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: Colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  logoText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
  },
  welcomeTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: 32,
  },
  features: {
    alignSelf: 'stretch',
    marginBottom: 24,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.success,
    marginRight: 12,
  },
  featureText: {
    fontSize: 15,
    color: Colors.text,
  },
  disclaimer: {
    backgroundColor: Colors.surfaceSecondary,
    padding: 16,
    borderRadius: 12,
    alignSelf: 'stretch',
  },
  disclaimerText: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  inputContent: {
    alignItems: 'center',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: Colors.accent + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  stepSubtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    marginBottom: 32,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.accent,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: '600',
    color: Colors.text,
    marginRight: 4,
  },
  input: {
    flex: 1,
    fontSize: 32,
    fontWeight: '700',
    color: Colors.text,
    padding: 0,
  },
  perMonth: {
    fontSize: 16,
    color: Colors.textMuted,
    marginLeft: 8,
  },
  footer: {
    paddingVertical: 20,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.accent,
    paddingVertical: 16,
    borderRadius: 12,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginRight: 8,
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: 16,
    marginTop: 8,
  },
  skipButtonText: {
    fontSize: 15,
    color: Colors.textSecondary,
  },
});
