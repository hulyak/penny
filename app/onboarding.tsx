import React, { useState, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  Dimensions,
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
import { Mascot } from '@/components/Mascot';
import { useApp } from '@/context/AppContext';
import Colors from '@/constants/colors';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const STEPS = [
  {
    id: 'welcome',
    title: 'Take Control of\nYour Finances',
    subtitle: 'Build better money habits with personalized insights and guidance',
    description: 'Answer a few quick questions to get started with your personalized financial dashboard.',
  },
  {
    id: 'income',
    title: 'Monthly Income',
    subtitle: 'Your take-home pay after taxes',
    field: 'monthlyIncome',
    icon: DollarSign,
    placeholder: '5500',
    description: 'Enter your net monthly income—the amount that lands in your account.',
  },
  {
    id: 'housing',
    title: 'Housing Costs',
    subtitle: 'Rent/mortgage, utilities, insurance',
    field: 'housingCost',
    icon: Home,
    placeholder: '1800',
    description: 'Include rent or mortgage, utilities, and home insurance.',
  },
  {
    id: 'transportation',
    title: 'Transportation',
    subtitle: 'Car payment, insurance, gas, transit',
    field: 'carCost',
    icon: Car,
    placeholder: '450',
    description: 'Car payments, insurance, gas, or public transit costs.',
  },
  {
    id: 'essentials',
    title: 'Other Essentials',
    subtitle: 'Groceries, healthcare, phone, etc.',
    field: 'essentialsCost',
    icon: ShoppingCart,
    placeholder: '800',
    description: 'Groceries, healthcare, phone, and other must-haves.',
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

  const step = STEPS[currentStep];
  const isWelcome = currentStep === 0;
  const isLastStep = currentStep === STEPS.length - 1;

  const animateTransition = (callback: () => void) => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -30,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      callback();
      slideAnim.setValue(30);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 8,
          tension: 40,
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

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Progress Dots */}
      <View style={styles.progressContainer}>
        {currentStep > 0 && (
          <Pressable style={styles.backButton} onPress={handleBack}>
            <ChevronLeft size={24} color={Colors.text} />
          </Pressable>
        )}
        <View style={styles.dotsContainer}>
          {STEPS.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                index === currentStep && styles.dotActive,
                index < currentStep && styles.dotComplete,
              ]}
            />
          ))}
        </View>
        <View style={styles.backButton} />
      </View>

      <KeyboardAvoidingView 
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Welcome Illustration */}
          {isWelcome && (
            <View style={styles.illustrationContainer}>
              <Mascot size="xlarge" showBubble={false} />
            </View>
          )}

          {/* Content */}
          <Animated.View 
            style={[
              styles.mainContent,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <Text style={styles.title}>{step.title}</Text>
            <Text style={styles.subtitle}>{step.subtitle}</Text>

            {/* Description */}
            {step.description && (
              <Text style={styles.description}>{step.description}</Text>
            )}

            {/* Input for non-welcome steps */}
            {!isWelcome && step.field && (
              <View style={styles.inputSection}>
                <View style={styles.inputCard}>
                  <View style={styles.inputIconContainer}>
                    {step.icon && <step.icon size={24} color={Colors.accent} />}
                  </View>
                  <View style={styles.inputWrapper}>
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
                    <Text style={styles.perMonth}>/month</Text>
                  </View>
                </View>
              </View>
            )}
          </Animated.View>

          {/* Footer */}
          <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
            <Pressable 
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.primaryButtonPressed,
              ]}
              onPress={handleNext}
            >
              <Text style={styles.primaryButtonText}>
                {isWelcome ? 'Get Started' : isLastStep ? "Let's Go!" : 'Continue'}
              </Text>
              <ArrowRight size={20} color="#fff" />
            </Pressable>

            {isWelcome && (
              <Pressable style={styles.skipButton} onPress={handleSkip}>
                <Text style={styles.skipButtonText}>Try with demo data</Text>
              </Pressable>
            )}

            {!isWelcome && (
              <Text style={styles.stepIndicator}>
                {currentStep} of {STEPS.length - 1}
              </Text>
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
    backgroundColor: Colors.mintMuted,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.border,
  },
  dotActive: {
    width: 24,
    backgroundColor: Colors.coral,
  },
  dotComplete: {
    backgroundColor: Colors.accent,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },
  illustrationContainer: {
    alignItems: 'center',
    marginTop: SCREEN_HEIGHT * 0.06,
    marginBottom: 32,
  },

  mainContent: {
    flex: 1,
    alignItems: 'center',
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
    marginBottom: 16,
  },
  description: {
    fontSize: 15,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  inputSection: {
    width: '100%',
    marginTop: 8,
  },
  inputCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  inputIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.accentMuted,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  currencySymbol: {
    fontSize: 28,
    fontWeight: '600',
    color: Colors.text,
    marginRight: 4,
  },
  input: {
    fontSize: 36,
    fontWeight: '700',
    color: Colors.text,
    padding: 0,
    minWidth: 100,
    textAlign: 'center',
  },
  perMonth: {
    fontSize: 16,
    color: Colors.textMuted,
    marginLeft: 8,
  },
  footer: {
    paddingTop: 24,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.accent,
    paddingVertical: 18,
    borderRadius: 16,
    gap: 8,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
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
  stepIndicator: {
    textAlign: 'center',
    fontSize: 14,
    color: Colors.textMuted,
    marginTop: 12,
  },
});
