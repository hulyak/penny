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
import { useApp } from '@/context/AppContext';
import Colors from '@/constants/colors';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const MASCOT_URL = 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/fdjbtnwfjkonpwmwero75';

const STEPS = [
  {
    id: 'welcome',
    title: 'Meet Penny',
    subtitle: 'Your friendly finance companion',
    coachMessage: "Hi there! I'm Penny, your fuzzy little finance buddy. I'm here to help you understand your money and make smarter decisions—no judgment, just guidance!",
  },
  {
    id: 'income',
    title: 'Monthly Income',
    subtitle: 'Your take-home pay after taxes',
    field: 'monthlyIncome',
    icon: DollarSign,
    placeholder: '5500',
    coachMessage: "Let's start with your monthly income. How much lands in your account each month?",
  },
  {
    id: 'housing',
    title: 'Housing Costs',
    subtitle: 'Rent/mortgage, utilities, insurance',
    field: 'housingCost',
    icon: Home,
    placeholder: '1800',
    coachMessage: "Now for the big one—housing! Include rent or mortgage, utilities, and insurance.",
  },
  {
    id: 'transportation',
    title: 'Transportation',
    subtitle: 'Car payment, insurance, gas, transit',
    field: 'carCost',
    icon: Car,
    placeholder: '450',
    coachMessage: "How do you get around? Include car payments, insurance, gas, or transit costs.",
  },
  {
    id: 'essentials',
    title: 'Other Essentials',
    subtitle: 'Groceries, healthcare, phone, etc.',
    field: 'essentialsCost',
    icon: ShoppingCart,
    placeholder: '800',
    coachMessage: "Almost done! What about groceries, healthcare, phone—the must-haves?",
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
  const mascotScale = useRef(new Animated.Value(1)).current;
  const mascotFloat = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(mascotFloat, {
          toValue: -12,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(mascotFloat, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [mascotFloat]);

  useEffect(() => {
    Animated.spring(mascotScale, {
      toValue: currentStep === 0 ? 1 : 0.5,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();
  }, [currentStep, mascotScale]);

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
          {/* Mascot Section */}
          <Animated.View 
            style={[
              styles.mascotContainer,
              isWelcome && styles.mascotContainerLarge,
              {
                transform: [
                  { translateY: mascotFloat },
                  { scale: mascotScale },
                ],
              },
            ]}
          >
            <View style={isWelcome ? styles.mascotGlow : undefined}>
              <Image 
                source={{ uri: MASCOT_URL }} 
                style={[
                  styles.mascot,
                  isWelcome && styles.mascotLarge,
                ]} 
                resizeMode="contain"
              />
            </View>
          </Animated.View>

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

            {/* Coach Message Bubble */}
            <View style={styles.messageBubble}>
              <Text style={styles.messageText}>{step.coachMessage}</Text>
            </View>

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
  mascotContainer: {
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  mascotContainerLarge: {
    marginTop: SCREEN_HEIGHT * 0.04,
    marginBottom: 24,
  },
  mascot: {
    width: 120,
    height: 120,
  },
  mascotLarge: {
    width: SCREEN_WIDTH * 0.75,
    height: SCREEN_WIDTH * 0.75,
    maxWidth: 340,
    maxHeight: 340,
  },
  mascotGlow: {
    shadowColor: Colors.coral,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 8,
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
    marginBottom: 24,
  },
  messageBubble: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    width: '100%',
  },
  messageText: {
    fontSize: 16,
    color: Colors.text,
    lineHeight: 24,
    textAlign: 'center',
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
