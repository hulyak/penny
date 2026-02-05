import React, { useState, useRef, useCallback } from 'react';
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
  ActivityIndicator,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  ChevronLeft,
  AlertCircle,
  Sparkles,
} from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import Colors from '@/constants/colors';
import { MASCOT_IMAGE_URL } from '@/constants/images';

type AuthMode = 'welcome' | 'signin' | 'signup';

// Josh's avatar for branding
const JOSH_AVATAR = 'https://pbs.twimg.com/profile_images/1745526817684033536/CKhbsnRa_400x400.jpg';

export default function AuthScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    signInWithApple,
    signInAsDemo,
    error,
    clearError,
  } = useAuth();

  const [mode, setMode] = useState<AuthMode>('welcome');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

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
      clearError();
      slideAnim.setValue(20);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
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

  const handleEmailAuth = useCallback(async () => {
    if (!email.trim() || !password) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    if (mode === 'signup' && !displayName.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    setIsLoading(true);
    let success = false;

    try {
      if (mode === 'signin') {
        success = await signInWithEmail(email.trim(), password);
      } else if (mode === 'signup') {
        success = await signUpWithEmail(email.trim(), password, displayName.trim());
      }

      if (success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace('/(tabs)');
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch (err) {
      console.error('[Auth] Error during auth:', err);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
    }
  }, [email, password, displayName, mode, signInWithEmail, signUpWithEmail, router]);

  const handleGoogleAuth = useCallback(async () => {
    setIsLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const success = await signInWithGoogle();
      if (success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace('/(tabs)');
      }
    } catch (err) {
      console.error('[Auth] Google auth error:', err);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
    }
  }, [signInWithGoogle, router]);

  const handleAppleAuth = useCallback(async () => {
    setIsLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const success = await signInWithApple();
      if (success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace('/(tabs)');
      }
    } catch (err) {
      console.error('[Auth] Apple auth error:', err);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
    }
  }, [signInWithApple, router]);

  const renderWelcome = () => (
    <Animated.View
      style={[
        styles.contentContainer,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      {/* App Logo */}
      <View style={styles.logoContainer}>
        <Image
          source={{ uri: MASCOT_IMAGE_URL }}
          style={styles.mascotLogo}
        />
        <Text style={styles.logoText}>Penny</Text>
        <Text style={styles.logoTagline}>Your Portfolio Companion</Text>
      </View>

      {/* Subtitle */}
      <Text style={styles.welcomeSubtitle}>
        Add assets in your portfolio
      </Text>

      {/* Decorative asset chip */}
      <View style={styles.assetChip}>
        <View style={styles.assetChipIcon}>
          <Text style={styles.btcIcon}>₿</Text>
        </View>
        <Text style={styles.assetChipText}>Bitcoin</Text>
        <Text style={styles.assetChipPlus}>+</Text>
      </View>

      {/* Social buttons */}
      <View style={styles.socialButtons}>
        <Pressable
          style={({ pressed }) => [
            styles.socialButton,
            styles.appleButton,
            pressed && styles.buttonPressed,
          ]}
          onPress={handleAppleAuth}
          disabled={isLoading}
        >
          <Text style={styles.appleIcon}></Text>
          <Text style={styles.appleButtonText}>Continue with Apple</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.socialButton,
            styles.googleButton,
            pressed && styles.buttonPressed,
          ]}
          onPress={handleGoogleAuth}
          disabled={isLoading}
        >
          <Image
            source={{ uri: 'https://www.google.com/favicon.ico' }}
            style={styles.socialIcon}
          />
          <Text style={styles.googleButtonText}>Continue with Google</Text>
        </Pressable>
      </View>

      {/* Divider */}
      <View style={styles.dividerContainer}>
        <View style={styles.divider} />
      </View>

      {/* Email options */}
      <View style={styles.emailOptions}>
        <Pressable
          style={({ pressed }) => [
            styles.emailLink,
            pressed && { opacity: 0.7 },
          ]}
          onPress={() => animateTransition(() => setMode('signin'))}
        >
          <Text style={styles.emailLinkText}>Sign in with Email</Text>
        </Pressable>
        <Text style={styles.emailDot}>·</Text>
        <Pressable
          style={({ pressed }) => [
            styles.emailLink,
            pressed && { opacity: 0.7 },
          ]}
          onPress={() => animateTransition(() => setMode('signup'))}
        >
          <Text style={styles.emailLinkText}>Create Account</Text>
        </Pressable>
      </View>

      {/* Demo mode */}
      <Pressable
        style={({ pressed }) => [
          styles.demoButton,
          pressed && styles.demoButtonPressed,
        ]}
        onPress={async () => {
          setIsLoading(true);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          const success = await signInAsDemo();
          if (success) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            router.replace('/(tabs)');
          }
          setIsLoading(false);
        }}
        disabled={isLoading}
      >
        <Text style={styles.demoButtonText}>Try Demo Mode</Text>
      </Pressable>
    </Animated.View>
  );

  const renderEmailForm = () => (
    <Animated.View
      style={[
        styles.formContainer,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <Pressable
        style={styles.backButton}
        onPress={() => animateTransition(() => setMode('welcome'))}
      >
        <ChevronLeft size={24} color={Colors.text} />
        <Text style={styles.backText}>Back</Text>
      </Pressable>

      <Text style={styles.formTitle}>
        {mode === 'signin' ? 'Welcome back' : 'Create account'}
      </Text>
      <Text style={styles.formSubtitle}>
        {mode === 'signin'
          ? 'Sign in to continue tracking your portfolio'
          : 'Start your wealth-building journey'}
      </Text>

      {error && (
        <View style={styles.errorContainer}>
          <AlertCircle size={18} color={Colors.danger} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {mode === 'signup' && (
        <View style={styles.inputContainer}>
          <View style={styles.inputIcon}>
            <User size={20} color={Colors.textMuted} />
          </View>
          <TextInput
            style={styles.input}
            placeholder="Your name"
            placeholderTextColor={Colors.textMuted}
            value={displayName}
            onChangeText={setDisplayName}
            autoCapitalize="words"
          />
        </View>
      )}

      <View style={styles.inputContainer}>
        <View style={styles.inputIcon}>
          <Mail size={20} color={Colors.textMuted} />
        </View>
        <TextInput
          style={styles.input}
          placeholder="Email address"
          placeholderTextColor={Colors.textMuted}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
        />
      </View>

      <View style={styles.inputContainer}>
        <View style={styles.inputIcon}>
          <Lock size={20} color={Colors.textMuted} />
        </View>
        <TextInput
          style={[styles.input, styles.passwordInput]}
          placeholder="Password"
          placeholderTextColor={Colors.textMuted}
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
          autoComplete="password"
        />
        <Pressable
          style={styles.eyeButton}
          onPress={() => setShowPassword(!showPassword)}
        >
          {showPassword ? (
            <EyeOff size={20} color={Colors.textMuted} />
          ) : (
            <Eye size={20} color={Colors.textMuted} />
          )}
        </Pressable>
      </View>

      <Pressable
        style={({ pressed }) => [
          styles.submitButton,
          pressed && styles.submitButtonPressed,
          isLoading && styles.submitButtonDisabled,
        ]}
        onPress={handleEmailAuth}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#000" />
        ) : (
          <Text style={styles.submitButtonText}>
            {mode === 'signin' ? 'Sign In' : 'Create Account'}
          </Text>
        )}
      </Pressable>

      <Pressable
        style={styles.switchModeLink}
        onPress={() => animateTransition(() => setMode(mode === 'signin' ? 'signup' : 'signin'))}
      >
        <Text style={styles.switchModeText}>
          {mode === 'signin'
            ? "Don't have an account? "
            : "Already have an account? "}
          <Text style={styles.linkText}>
            {mode === 'signin' ? 'Sign up' : 'Sign in'}
          </Text>
        </Text>
      </Pressable>
    </Animated.View>
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#2d3a1f', '#1a2f1a', '#0f200f']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {mode === 'welcome' ? renderWelcome() : renderEmailForm()}
        </ScrollView>
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
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },
  contentContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Logo
  logoContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoIcon: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 208, 156, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'rgba(0, 208, 156, 0.3)',
  },
  mascotLogo: {
    width: 100,
    height: 100,
    marginBottom: 16,
  },
  logoText: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.5,
  },
  logoTagline: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },

  welcomeSubtitle: {
    fontSize: 18,
    color: Colors.textSecondary,
    marginBottom: 24,
  },

  // Asset chip decoration
  assetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 30,
    gap: 10,
    marginBottom: 48,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  assetChipIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F7931A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  btcIcon: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  assetChipText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  assetChipPlus: {
    fontSize: 20,
    color: Colors.primary,
    fontWeight: '500',
  },

  // Social buttons
  socialButtons: {
    width: '100%',
    gap: 12,
    marginBottom: 24,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    gap: 12,
  },
  appleButton: {
    backgroundColor: '#fff',
  },
  googleButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  buttonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  socialIcon: {
    width: 20,
    height: 20,
  },
  appleIcon: {
    fontSize: 20,
    color: '#000',
  },
  appleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },

  // Divider
  dividerContainer: {
    width: '100%',
    marginBottom: 20,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },

  // Email options
  emailOptions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
  },
  emailLink: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  emailLinkText: {
    fontSize: 15,
    color: Colors.textSecondary,
  },
  emailDot: {
    fontSize: 15,
    color: Colors.textMuted,
    marginHorizontal: 8,
  },

  // Demo button
  demoButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderStyle: 'dashed',
  },
  demoButtonPressed: {
    opacity: 0.7,
  },
  demoButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textSecondary,
  },

  // Form container
  formContainer: {
    flex: 1,
    paddingTop: 20,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
    marginLeft: -8,
  },
  backText: {
    fontSize: 16,
    color: Colors.text,
    marginLeft: 4,
  },
  formTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
  },
  formSubtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: 32,
    lineHeight: 22,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dangerMuted,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 16,
    gap: 10,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: Colors.danger,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: Colors.text,
  },
  passwordInput: {
    paddingRight: 44,
  },
  eyeButton: {
    position: 'absolute',
    right: 16,
    padding: 4,
  },
  submitButton: {
    backgroundColor: '#fff',
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
  },
  switchModeLink: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  switchModeText: {
    fontSize: 15,
    color: Colors.textSecondary,
  },
  linkText: {
    color: Colors.primary,
    fontWeight: '600',
  },
});
