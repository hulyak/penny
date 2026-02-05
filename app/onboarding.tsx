import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  Animated,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import portfolioService from '@/lib/portfolioService';
import {
  ArrowRight,
  Sparkles,
} from 'lucide-react-native';
import { useApp } from '@/context/AppContext';
import { MASCOT_IMAGE_URL } from '@/constants/images';
import {
  OnboardingProvider,
  useOnboarding,
} from '@/context/OnboardingContext';
import {
  AssetTypeSelectionScreen,
  AssetSelectionScreen,
  HoldingsEntryScreen,
  PortfolioConfirmationScreen,
} from '@/components/onboarding';
import Colors from '@/constants/colors';
import { Holding } from '@/types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Floating asset bubbles data
const ASSET_BUBBLES = [
  { symbol: 'AAPL', change: '+2.34%', color: '#00D09C', size: 90, top: '8%', left: '5%' },
  { symbol: 'BTC', change: '+5.12%', color: '#F7931A', size: 80, top: '15%', right: '10%' },
  { symbol: 'ETH', change: '+3.67%', color: '#627EEA', size: 70, top: '5%', left: '35%' },
  { symbol: 'NVDA', change: '+1.89%', color: '#76B900', size: 85, top: '30%', right: '5%' },
  { symbol: 'TSLA', change: '+0.95%', color: '#CC0000', size: 95, top: '35%', left: '15%' },
  { symbol: 'XAU', change: '+1.24%', color: '#FFD700', size: 75, top: '22%', left: '0%' },
];

// Josh's avatar URL
const JOSH_AVATAR = 'https://pbs.twimg.com/profile_images/1745526817684033536/CKhbsnRa_400x400.jpg';

// Intro slides (first 4 screens before asset selection)
const INTRO_SLIDES = [
  {
    id: 'welcome',
    gradient: ['#1a1a2e', '#16213e', '#0f3460'],
    title: 'Track Your\nWealth Journey',
    subtitle: 'The smart portfolio tracker for DIY investors who want to learn and grow.',
    highlight: 'wealth journey',
  },
  {
    id: 'assets',
    gradient: ['#ffeef8', '#fff0f5', '#ffe4ec'],
    title: 'Add your assets.',
    subtitle: 'Track everything you own and learn portfolio management principles.',
    highlight: 'your complete financial picture in one place.',
    darkText: true,
  },
  {
    id: 'learn',
    gradient: ['#1a1a2e', '#2d1b4e', '#1a1a2e'],
    title: 'Learn from\nJosh',
    subtitle: 'Get market insights, model portfolio ideas, and Q&A from @VisualFaktory.',
    highlight: 'educational insights',
  },
  {
    id: 'ai',
    gradient: ['#0f172a', '#1e1b4b', '#312e81'],
    title: 'AI-Powered\nInsights',
    subtitle: 'Get personalized portfolio analysis and recommendations powered by AI.',
    highlight: 'portfolio management and investing.',
  },
];

// Floating Asset Bubble Component
function AssetBubble({ symbol, change, color, size, style, animValue }: {
  symbol: string;
  change: string;
  color: string;
  size: number;
  style: any;
  animValue: Animated.Value;
}) {
  const isPositive = change.startsWith('+');

  return (
    <Animated.View
      style={[
        styles.assetBubble,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color + '20',
          borderColor: color + '40',
          transform: [
            { translateY: animValue.interpolate({
              inputRange: [0, 1],
              outputRange: [0, -10],
            })},
            { scale: animValue.interpolate({
              inputRange: [0, 0.5, 1],
              outputRange: [1, 1.05, 1],
            })},
          ],
        },
        style,
      ]}
    >
      <Text style={[styles.bubbleSymbol, { color }]}>{symbol}</Text>
      <Text style={[styles.bubbleChange, { color: isPositive ? Colors.success : Colors.danger }]}>
        {change}
      </Text>
    </Animated.View>
  );
}

// Add Button Bubble
function AddBubble({ animValue }: { animValue: Animated.Value }) {
  return (
    <Animated.View
      style={[
        styles.addBubble,
        {
          transform: [
            { scale: animValue.interpolate({
              inputRange: [0, 1],
              outputRange: [1, 1.1],
            })},
          ],
        },
      ]}
    >
      <Text style={styles.addBubbleIcon}>+</Text>
    </Animated.View>
  );
}

// Main onboarding content (wrapped with provider)
function OnboardingContent() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { completeOnboarding } = useApp();
  const {
    currentStep,
    setStep,
    selectedAssets,
  } = useOnboarding();

  const [introSlide, setIntroSlide] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const bubbleAnims = useRef(ASSET_BUBBLES.map(() => new Animated.Value(0))).current;

  const slide = INTRO_SLIDES[introSlide];
  const isLastIntroSlide = introSlide === INTRO_SLIDES.length - 1;

  // Animate bubbles
  useEffect(() => {
    const animations = bubbleAnims.map((anim, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: 1,
            duration: 2000 + index * 300,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 2000 + index * 300,
            useNativeDriver: true,
          }),
        ])
      )
    );
    animations.forEach(a => a.start());
    return () => animations.forEach(a => a.stop());
  }, []);

  const animateTransition = (callback: () => void) => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -30,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      callback();
      slideAnim.setValue(30);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
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

  // Save portfolio holdings from onboarding
  const savePortfolioHoldings = async () => {
    try {
      const holdings: Holding[] = selectedAssets.map(asset => ({
        id: asset.id,
        type: asset.type,
        name: asset.name,
        symbol: asset.symbol,
        quantity: asset.quantity || 0,
        purchasePrice: asset.currentPrice,
        purchaseDate: new Date().toISOString().split('T')[0],
        currency: 'USD',
        currentPrice: asset.currentPrice,
        currentValue: asset.value || 0,
        lastPriceUpdate: new Date().toISOString(),
        isManualPricing: false,
        assetClass: asset.type === 'stock' || asset.type === 'etf' ? 'equity' :
                    asset.type === 'crypto' ? 'equity' :
                    asset.type === 'gold' ? 'commodity' :
                    asset.type === 'real_estate' ? 'real_asset' :
                    asset.type === 'cash' ? 'cash' : 'equity',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));

      // Save holdings via portfolio service (will sync to Firebase after auth)
      for (const holding of holdings) {
        await portfolioService.saveHolding(holding);
      }
      console.log('[Onboarding] Saved portfolio holdings:', holdings.length);
    } catch (error) {
      console.error('[Onboarding] Failed to save holdings:', error);
    }
  };

  // Complete onboarding and navigate to auth
  const handleComplete = async () => {
    // Save portfolio holdings
    await savePortfolioHoldings();

    // Complete onboarding with default financials
    completeOnboarding({
      monthlyIncome: 5500,
      housingCost: 1800,
      carCost: 450,
      essentialsCost: 800,
      savings: 3200,
      debts: 12000,
      emergencyFundGoal: 9150,
    });

    router.replace('/auth' as any);
  };

  // Handle intro slide navigation
  const handleIntroNext = () => {
    if (isLastIntroSlide) {
      // Move to asset type selection
      setStep('asset-types');
    } else {
      animateTransition(() => setIntroSlide(introSlide + 1));
    }
  };

  const handleSkip = () => {
    // Skip to mentor selection (skip asset entry)
    setStep('mentor-selection');
  };

  const handleSkipToEnd = () => {
    // Skip entirely and complete
    handleComplete();
  };

  // Render intro slide content
  const renderIntroSlideContent = () => {
    switch (slide?.id) {
      case 'welcome':
        return (
          <View style={styles.slideContent}>
            <View style={styles.brandContainer}>
              <Image
                source={{ uri: MASCOT_IMAGE_URL }}
                style={styles.mascotLogo}
              />
              <Text style={styles.brandName}>Penny</Text>
              <Text style={styles.brandTagline}>Your Portfolio Companion</Text>
            </View>
          </View>
        );

      case 'assets':
        return (
          <View style={styles.slideContent}>
            <View style={styles.bubblesContainer}>
              {ASSET_BUBBLES.map((bubble, index) => (
                <AssetBubble
                  key={bubble.symbol}
                  {...bubble}
                  style={{
                    position: 'absolute',
                    top: bubble.top,
                    left: bubble.left,
                    right: bubble.right,
                  }}
                  animValue={bubbleAnims[index]}
                />
              ))}
              <AddBubble animValue={bubbleAnims[0]} />
            </View>
          </View>
        );

      case 'learn':
        return (
          <View style={styles.slideContent}>
            <View style={styles.mentorContainer}>
              <View style={styles.phoneMockup}>
                <View style={styles.mockupHeader}>
                  <Text style={styles.mockupTitle}>Portfolio</Text>
                  <Text style={styles.mockupTime}>7 days</Text>
                </View>
                <View style={styles.mockupValue}>
                  <Text style={styles.mockupLabel}>Net worth</Text>
                  <Text style={styles.mockupAmount}>$47,892.00</Text>
                  <Text style={styles.mockupChange}>+2.67% (7 days)</Text>
                </View>
              </View>
              <View style={styles.joshBanner}>
                <Image source={{ uri: JOSH_AVATAR }} style={styles.joshAvatar} />
                <Text style={styles.joshBannerText}>Get a portfolio review</Text>
                <ArrowRight size={16} color="#fff" />
              </View>
            </View>
          </View>
        );

      case 'ai':
        return (
          <View style={styles.slideContent}>
            <View style={styles.aiMentorsContainer}>
              <View style={styles.aiLogoContainer}>
                <View style={styles.aiLogo}>
                  <Sparkles size={40} color={Colors.primary} />
                </View>
              </View>
              <View style={styles.mentorAvatarsRow}>
                <Image
                  source={{ uri: JOSH_AVATAR }}
                  style={styles.mentorAvatar}
                />
              </View>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  // Render based on current step
  if (currentStep === 'asset-types') {
    return (
      <AssetTypeSelectionScreen
        onContinue={() => setStep('asset-selection')}
        onSkip={handleSkip}
      />
    );
  }

  if (currentStep === 'asset-selection') {
    return (
      <AssetSelectionScreen
        onContinue={() => setStep('holdings-entry')}
        onBack={() => setStep('asset-types')}
      />
    );
  }

  if (currentStep === 'holdings-entry') {
    return (
      <HoldingsEntryScreen
        onContinue={() => setStep('portfolio-confirmation')}
        onBack={() => setStep('asset-selection')}
      />
    );
  }

  if (currentStep === 'portfolio-confirmation') {
    return (
      <PortfolioConfirmationScreen
        onContinue={handleComplete}
        onBack={() => setStep('holdings-entry')}
        onAddMore={() => setStep('asset-selection')}
      />
    );
  }

  // Default: Render intro slides
  const textColor = slide?.darkText ? Colors.textInverse : Colors.text;
  const subtitleColor = slide?.darkText ? '#666' : Colors.textSecondary;
  const highlightColor = slide?.darkText ? Colors.textInverse : Colors.text;
  const dotColor = slide?.darkText ? 'rgba(0, 0, 0, 0.3)' : 'rgba(255, 255, 255, 0.3)';
  const dotActiveColor = slide?.darkText ? '#000' : '#fff';

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={slide?.gradient as any || ['#1a1a2e', '#16213e', '#0f3460']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Skip button */}
      <Pressable
        style={[styles.skipButton, { top: insets.top + 16 }]}
        onPress={handleSkipToEnd}
      >
        <Text style={[styles.skipText, { color: textColor }]}>Skip</Text>
      </Pressable>

      {/* Content */}
      <Animated.View
        style={[
          styles.content,
          {
            paddingTop: insets.top + 60,
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        {/* Visual content area */}
        <View style={styles.visualArea}>
          {renderIntroSlideContent()}
        </View>

        {/* Text content */}
        <View style={styles.textArea}>
          <Text style={[styles.title, { color: textColor }]}>
            {slide?.title}
          </Text>
          <Text style={[styles.subtitle, { color: subtitleColor }]}>
            {slide?.subtitle.split(slide?.highlight || '')[0]}
            {slide?.highlight && (
              <Text style={[styles.highlight, { color: highlightColor }]}>{slide?.highlight}</Text>
            )}
            {slide?.subtitle.split(slide?.highlight || '')[1]}
          </Text>
        </View>

        {/* Progress dots */}
        <View style={styles.dotsContainer}>
          {INTRO_SLIDES.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                { backgroundColor: dotColor },
                index === introSlide && [styles.dotActive, { backgroundColor: dotActiveColor }],
              ]}
            />
          ))}
        </View>

        {/* CTA Button */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + 24 }]}>
          <Pressable
            style={({ pressed }) => [
              styles.ctaButton,
              pressed && styles.ctaButtonPressed,
            ]}
            onPress={handleIntroNext}
          >
            <Text style={styles.ctaText}>
              {isLastIntroSlide ? 'Get Started' : 'Next'}
            </Text>
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}

// Export with provider wrapper
export default function OnboardingScreen() {
  return (
    <OnboardingProvider>
      <OnboardingContent />
    </OnboardingProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  skipButton: {
    position: 'absolute',
    right: 24,
    zIndex: 10,
    padding: 8,
  },
  skipText: {
    fontSize: 16,
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
  visualArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  slideContent: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Brand/Logo
  brandContainer: {
    alignItems: 'center',
  },
  mascotLogo: {
    width: 120,
    height: 120,
    marginBottom: 20,
  },
  logoIcon: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 208, 156, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  brandName: {
    fontSize: 36,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -1,
  },
  brandTagline: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 4,
  },

  // Asset Bubbles
  bubblesContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.45,
    position: 'relative',
  },
  assetBubble: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  bubbleSymbol: {
    fontSize: 14,
    fontWeight: '700',
  },
  bubbleChange: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  addBubble: {
    position: 'absolute',
    bottom: '15%',
    right: '20%',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1a1a2e',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  addBubbleIcon: {
    fontSize: 36,
    color: '#FF69B4',
    fontWeight: '300',
  },

  // Mentor/Phone mockup
  mentorContainer: {
    alignItems: 'center',
  },
  phoneMockup: {
    width: SCREEN_WIDTH * 0.6,
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
  },
  mockupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  mockupTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  mockupTime: {
    fontSize: 12,
    color: '#666',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  mockupValue: {
    marginBottom: 8,
  },
  mockupLabel: {
    fontSize: 12,
    color: '#999',
  },
  mockupAmount: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000',
    marginVertical: 4,
  },
  mockupChange: {
    fontSize: 14,
    color: Colors.success,
    fontWeight: '600',
  },
  joshBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 40,
    marginTop: -20,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  joshAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  joshBannerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },

  // AI Mentors
  aiMentorsContainer: {
    alignItems: 'center',
    gap: 24,
  },
  aiLogoContainer: {
    alignItems: 'center',
  },
  aiLogo: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(0, 208, 156, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(0, 208, 156, 0.3)',
  },
  mentorAvatarsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  mentorAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    borderColor: '#fff',
  },

  // Text area
  textArea: {
    paddingHorizontal: 32,
    marginBottom: 24,
  },
  title: {
    fontSize: 36,
    fontWeight: '700',
    lineHeight: 42,
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
  },
  highlight: {
    fontWeight: '700',
  },

  // Progress dots
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    width: 24,
  },

  // Footer/CTA
  footer: {
    paddingHorizontal: 24,
  },
  ctaButton: {
    backgroundColor: '#fff',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
  },
  ctaButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  ctaText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
});
