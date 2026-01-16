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
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { 
  ArrowRight, 
  Sparkles, 
  DollarSign, 
  Home, 
  Car, 
  ShoppingBag,
  Bot,
} from 'lucide-react-native';
import { useApp } from '@/context/AppContext';
import Colors from '@/constants/colors';
import { ONBOARDING_TIPS, DEMO_FINANCIALS } from '@/constants/mockData';

const STEPS = [
  { 
    key: 'welcome', 
    title: 'Welcome to ClearPath',
    subtitle: 'Your AI-powered financial clarity companion',
  },
  { 
    key: 'income', 
    title: 'Monthly Income',
    subtitle: ONBOARDING_TIPS.income,
    field: 'monthlyIncome',
    icon: DollarSign,
    placeholder: '5500',
  },
  { 
    key: 'housing', 
    title: 'Housing Costs',
    subtitle: ONBOARDING_TIPS.housing,
    field: 'housingCost',
    icon: Home,
    placeholder: '1800',
  },
  { 
    key: 'car', 
    title: 'Transportation',
    subtitle: ONBOARDING_TIPS.car,
    field: 'carCost',
    icon: Car,
    placeholder: '450',
  },
  { 
    key: 'essentials', 
    title: 'Essential Expenses',
    subtitle: ONBOARDING_TIPS.essentials,
    field: 'essentialsCost',
    icon: ShoppingBag,
    placeholder: '800',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { completeOnboarding } = useApp();
  const [step, setStep] = useState(0);
  const [values, setValues] = useState({
    monthlyIncome: '',
    housingCost: '',
    carCost: '',
    essentialsCost: '',
  });

  const currentStep = STEPS[step];
  const isWelcome = step === 0;
  const isLastStep = step === STEPS.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      const financials = {
        monthlyIncome: parseInt(values.monthlyIncome, 10) || DEMO_FINANCIALS.monthlyIncome,
        housingCost: parseInt(values.housingCost, 10) || DEMO_FINANCIALS.housingCost,
        carCost: parseInt(values.carCost, 10) || DEMO_FINANCIALS.carCost,
        essentialsCost: parseInt(values.essentialsCost, 10) || DEMO_FINANCIALS.essentialsCost,
        savings: DEMO_FINANCIALS.savings,
        debts: DEMO_FINANCIALS.debts,
        emergencyFundGoal: (parseInt(values.housingCost, 10) || DEMO_FINANCIALS.housingCost) * 3 + 
                          (parseInt(values.carCost, 10) || DEMO_FINANCIALS.carCost) * 3 + 
                          (parseInt(values.essentialsCost, 10) || DEMO_FINANCIALS.essentialsCost) * 3,
      };
      completeOnboarding(financials);
      router.replace('/(tabs)');
    } else {
      setStep(step + 1);
    }
  };

  const handleSkip = () => {
    completeOnboarding(DEMO_FINANCIALS);
    router.replace('/(tabs)');
  };

  const updateValue = (field: string, value: string) => {
    setValues({ ...values, [field]: value.replace(/[^0-9]/g, '') });
  };

  return (
    <LinearGradient
      colors={[Colors.primary, Colors.primaryLight]}
      style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <View style={styles.progressContainer}>
              {STEPS.map((_, index) => (
                <View 
                  key={index}
                  style={[
                    styles.progressDot,
                    index <= step && styles.progressDotActive,
                  ]}
                />
              ))}
            </View>
            
            {!isWelcome && (
              <Pressable onPress={handleSkip}>
                <Text style={styles.skipText}>Use Demo Data</Text>
              </Pressable>
            )}
          </View>

          <View style={styles.content}>
            {isWelcome ? (
              <>
                <View style={styles.welcomeIcon}>
                  <Sparkles size={48} color={Colors.warning} />
                </View>
                <Text style={styles.welcomeTitle}>{currentStep.title}</Text>
                <Text style={styles.welcomeSubtitle}>{currentStep.subtitle}</Text>
                
                <View style={styles.agentsPreview}>
                  <Text style={styles.agentsTitle}>Meet Your AI Agents</Text>
                  
                  <View style={styles.agentRow}>
                    <View style={[styles.agentDot, { backgroundColor: Colors.agents.financialReality }]} />
                    <Text style={styles.agentName}>Financial Reality Agent</Text>
                  </View>
                  <View style={styles.agentRow}>
                    <View style={[styles.agentDot, { backgroundColor: Colors.agents.marketContext }]} />
                    <Text style={styles.agentName}>Market Context Agent</Text>
                  </View>
                  <View style={styles.agentRow}>
                    <View style={[styles.agentDot, { backgroundColor: Colors.agents.scenarioLearning }]} />
                    <Text style={styles.agentName}>Scenario & Learning Agent</Text>
                  </View>
                  <View style={styles.agentRow}>
                    <View style={[styles.agentDot, { backgroundColor: Colors.agents.adaptation }]} />
                    <Text style={styles.agentName}>Adaptation Agent</Text>
                  </View>
                </View>

                <View style={styles.disclaimerBox}>
                  <Text style={styles.disclaimerTitle}>Important Note</Text>
                  <Text style={styles.disclaimerText}>
                    ClearPath is an educational tool. It does not provide financial advice 
                    or investment recommendations.
                  </Text>
                </View>
              </>
            ) : (
              <>
                <View style={[styles.inputIcon, { backgroundColor: Colors.secondary + '30' }]}>
                  {currentStep.icon && <currentStep.icon size={32} color={Colors.secondary} />}
                </View>
                
                <Text style={styles.inputTitle}>{currentStep.title}</Text>
                <Text style={styles.inputSubtitle}>{currentStep.subtitle}</Text>
                
                <View style={styles.inputContainer}>
                  <Text style={styles.currencySymbol}>$</Text>
                  <TextInput
                    style={styles.input}
                    value={values[currentStep.field as keyof typeof values]}
                    onChangeText={(text) => updateValue(currentStep.field!, text)}
                    placeholder={currentStep.placeholder}
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="numeric"
                    autoFocus
                  />
                  <Text style={styles.perMonth}>/month</Text>
                </View>
              </>
            )}
          </View>

          <View style={styles.footer}>
            <Pressable 
              style={styles.nextButton}
              onPress={handleNext}
            >
              <Text style={styles.nextButtonText}>
                {isWelcome ? 'Get Started' : isLastStep ? 'See My Dashboard' : 'Continue'}
              </Text>
              <ArrowRight size={20} color="#fff" />
            </Pressable>
            
            {isWelcome && (
              <Pressable style={styles.demoButton} onPress={handleSkip}>
                <Bot size={18} color={Colors.textLight} />
                <Text style={styles.demoButtonText}>Try Demo Mode</Text>
              </Pressable>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  progressContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  progressDotActive: {
    backgroundColor: Colors.secondary,
    width: 24,
  },
  skipText: {
    fontSize: 14,
    color: Colors.textLight,
    opacity: 0.8,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  welcomeIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  welcomeTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.textLight,
    textAlign: 'center',
    marginBottom: 12,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: Colors.textLight,
    opacity: 0.8,
    textAlign: 'center',
    marginBottom: 32,
  },
  agentsPreview: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    marginBottom: 24,
  },
  agentsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textLight,
    marginBottom: 16,
    textAlign: 'center',
  },
  agentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  agentDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
  },
  agentName: {
    fontSize: 14,
    color: Colors.textLight,
    opacity: 0.9,
  },
  disclaimerBox: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 12,
    padding: 16,
    width: '100%',
  },
  disclaimerTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.warning,
    marginBottom: 4,
  },
  disclaimerText: {
    fontSize: 13,
    color: Colors.textLight,
    opacity: 0.7,
    lineHeight: 18,
  },
  inputIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  inputTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.textLight,
    textAlign: 'center',
    marginBottom: 12,
  },
  inputSubtitle: {
    fontSize: 15,
    color: Colors.textLight,
    opacity: 0.8,
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 20,
    lineHeight: 22,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  currencySymbol: {
    fontSize: 32,
    fontWeight: '600',
    color: Colors.textLight,
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 32,
    fontWeight: '700',
    color: Colors.textLight,
    minWidth: 100,
  },
  perMonth: {
    fontSize: 16,
    color: Colors.textLight,
    opacity: 0.6,
    marginLeft: 8,
  },
  footer: {
    paddingTop: 24,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.secondary,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  demoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    paddingVertical: 14,
    gap: 8,
  },
  demoButtonText: {
    fontSize: 15,
    color: Colors.textLight,
    opacity: 0.8,
  },
});
