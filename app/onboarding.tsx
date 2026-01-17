import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  Animated,
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
  Sparkles,
  Shield,
  TrendingUp,
  PiggyBank,
} from 'lucide-react-native';
import { useApp } from '@/context/AppContext';
import Colors from '@/constants/colors';

const MASCOT_URL = 'https://r2-pub.rork.com/generated-images/27789a4a-5f4b-41c7-8590-21b6ef0e91a2.png';

const STEPS = [
  {
    id: 'welcome',
    title: 'Welcome to ClearPath',
    subtitle: 'Get clarity on your finances in just a few steps.',
    coachMessage: "Hey! I'm your financial coach. Let's get to know your money situation so I can help you make smarter decisions.",
  },
  {
    id: 'income',
    title: 'Monthly Income',
    subtitle: 'Your take-home pay after taxes',
    field: 'monthlyIncome',
    icon: DollarSign,
    placeholder: '5500',
    coachMessage: "First things first—how much do you bring home each month? This helps me understand your starting point.",
  },
  {
    id: 'housing',
    title: 'Housing Costs',
    subtitle: 'Rent/mortgage, utilities, insurance',
    field: 'housingCost',
    icon: Home,
    placeholder: '1800',
    coachMessage: "Housing is usually the biggest expense. Include rent or mortgage, plus utilities and insurance.",
  },
  {
    id: 'transportation',
    title: 'Transportation',
    subtitle: 'Car payment, insurance, gas, transit',
    field: 'carCost',
    icon: Car,
    placeholder: '450',
    coachMessage: "Getting around costs money! Include car payments, insurance, gas, or transit passes.",
  },
  {
    id: 'essentials',
    title: 'Other Essentials',
    subtitle: 'Groceries, healthcare, phone, etc.',
    field: 'essentialsCost',
    icon: ShoppingCart,
    placeholder: '800',
    coachMessage: "Last one! Think groceries, healthcare, phone bill—the stuff you can't skip.",
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
  
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const mascotBounce = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(mascotBounce, {
          toValue: -8,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(mascotBounce, {
          toValue: 0,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [mascotBounce]);

  const step = STEPS[currentStep];
  const isWelcome = currentStep === 0;
  const isLastStep = currentStep === STEPS.length - 1;
  const progress = ((currentStep) / (STEPS.length - 1)) * 100;

  const animateTransition = (callback: () => void) => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -20,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      callback();
      slideAnim.setValue(20);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

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
      animateTransition(() => setCurrentStep(currentStep + 1));
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      animateTransition(() => setCurrentStep(currentStep - 1));
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

  const getInputFeedback = (stepId: string, value: number): string => {
    if (!value) return '';
    switch (stepId) {
      case 'income':
        if (value < 2000) return "Every dollar counts. Let's make the most of it.";
        if (value < 5000) return "Solid foundation to work with!";
        return "Great income! Let's optimize it.";
      case 'housing':
        const incomeVal = parseInt(values.monthlyIncome, 10) || 5500;
        const housingRatio = (value / incomeVal) * 100;
        if (housingRatio > 40) return `That's ${housingRatio.toFixed(0)}% of income—on the higher side.`;
        if (housingRatio > 30) return `${housingRatio.toFixed(0)}% of income—pretty typical.`;
        return `Nice! Only ${housingRatio.toFixed(0)}% of income.`;
      case 'transportation':
        if (value > 800) return "That's significant—we'll factor this in.";
        if (value > 400) return "Standard transportation costs.";
        return "Low transport costs—that's a plus!";
      case 'essentials':
        return "Got it! I'll crunch the numbers now.";
      default:
        return '';
    }
  };

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

          {/* Coach Message */}
          <Animated.View 
            style={[
              styles.coachSection,
              { 
                opacity: fadeAnim,
                transform: [{ translateX: slideAnim }]
              }
            ]}
          >
            <Animated.View style={{ transform: [{ translateY: mascotBounce }] }}>
              <Image source={{ uri: MASCOT_URL }} style={styles.mascot} />
            </Animated.View>
            <View style={styles.coachBubble}>
              <Text style={styles.coachMessage}>{step.coachMessage}</Text>
            </View>
          </Animated.View>

          {/* Content */}
          <Animated.View 
            style={[
              styles.mainContent,
              {
                opacity: fadeAnim,
                transform: [{ translateX: slideAnim }]
              }
            ]}
          >
            {isWelcome ? (
              <View style={styles.welcomeContent}>
                <View style={styles.featuresGrid}>
                  <View style={styles.featureCard}>
                    <View style={[styles.featureIcon, { backgroundColor: Colors.accentMuted }]}>
                      <PiggyBank size={22} color={Colors.accent} />
                    </View>
                    <Text style={styles.featureTitle}>Track Health</Text>
                    <Text style={styles.featureDesc}>See your financial snapshot</Text>
                  </View>
                  <View style={styles.featureCard}>
                    <View style={[styles.featureIcon, { backgroundColor: Colors.successMuted }]}>
                      <TrendingUp size={22} color={Colors.success} />
                    </View>
                    <Text style={styles.featureTitle}>Plan Ahead</Text>
                    <Text style={styles.featureDesc}>Weekly actions that work</Text>
                  </View>
                  <View style={styles.featureCard}>
                    <View style={[styles.featureIcon, { backgroundColor: Colors.warningMuted }]}>
                      <Sparkles size={22} color={Colors.warning} />
                    </View>
                    <Text style={styles.featureTitle}>Explore</Text>
                    <Text style={styles.featureDesc}>Compare scenarios</Text>
                  </View>
                  <View style={styles.featureCard}>
                    <View style={[styles.featureIcon, { backgroundColor: '#E8F4F8' }]}>
                      <Shield size={22} color="#4A9DAD" />
                    </View>
                    <Text style={styles.featureTitle}>Learn</Text>
                    <Text style={styles.featureDesc}>Build money skills</Text>
                  </View>
                </View>

                <View style={styles.disclaimer}>
                  <Shield size={14} color={Colors.textMuted} />
                  <Text style={styles.disclaimerText}>
                    Educational tool only. Not financial advice.
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.inputContent}>
                {step.icon && (
                  <View style={styles.iconContainer}>
                    <step.icon size={28} color={Colors.accent} />
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

                {currentValue && (
                  <View style={styles.inputFeedback}>
                    <Text style={styles.feedbackText}>
                      {getInputFeedback(step.id, parseInt(currentValue, 10) || 0)}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </Animated.View>

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
  coachSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 24,
    paddingTop: 8,
  },
  mascot: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  coachBubble: {
    flex: 1,
    marginLeft: 12,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderTopLeftRadius: 4,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  coachMessage: {
    fontSize: 15,
    color: Colors.text,
    lineHeight: 22,
  },
  welcomeContent: {
    alignItems: 'center',
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  featureCard: {
    width: '47%',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  featureDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceSecondary,
    padding: 12,
    borderRadius: 10,
    alignSelf: 'stretch',
    gap: 8,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  inputContent: {
    alignItems: 'center',
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: Colors.accentMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  inputFeedback: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: Colors.successMuted,
    borderRadius: 10,
  },
  feedbackText: {
    fontSize: 13,
    color: Colors.success,
    textAlign: 'center',
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
