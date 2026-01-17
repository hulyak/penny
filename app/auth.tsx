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
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { 
  Mail, 
  Lock, 
  User, 
  Eye, 
  EyeOff,
  ChevronLeft,
  AlertCircle,
} from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import Colors from '@/constants/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const MASCOT_URL = 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/vgkftarej1um5e3yfmz34';

type AuthMode = 'welcome' | 'signin' | 'signup';

export default function AuthScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { 
    signInWithEmail, 
    signUpWithEmail, 
    signInWithGoogle, 
    signInWithApple,
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
  const mascotFloat = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(mascotFloat, {
          toValue: -10,
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

  const handleEmailAuth = async () => {
    if (!email || !password) return;
    if (mode === 'signup' && !displayName) return;

    setIsLoading(true);
    let success = false;

    if (mode === 'signin') {
      success = await signInWithEmail(email, password);
    } else if (mode === 'signup') {
      success = await signUpWithEmail(email, password, displayName);
    }

    setIsLoading(false);
    if (success) {
      router.replace('/(tabs)');
    }
  };

  const handleGoogleAuth = async () => {
    setIsLoading(true);
    const success = await signInWithGoogle();
    setIsLoading(false);
    if (success) {
      router.replace('/(tabs)');
    }
  };

  const handleAppleAuth = async () => {
    setIsLoading(true);
    const success = await signInWithApple();
    setIsLoading(false);
    if (success) {
      router.replace('/(tabs)');
    }
  };

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
      <Text style={styles.welcomeTitle}>Welcome to ClearPath</Text>
      <Text style={styles.welcomeSubtitle}>
        Your personal finance companion powered by AI
      </Text>

      <View style={styles.socialButtons}>
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
          <Text style={styles.socialButtonText}>Continue with Google</Text>
        </Pressable>

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
      </View>

      <View style={styles.dividerContainer}>
        <View style={styles.divider} />
        <Text style={styles.dividerText}>or</Text>
        <View style={styles.divider} />
      </View>

      <Pressable 
        style={({ pressed }) => [
          styles.emailButton,
          pressed && styles.buttonPressed,
        ]}
        onPress={() => animateTransition(() => setMode('signin'))}
      >
        <Mail size={20} color={Colors.text} />
        <Text style={styles.emailButtonText}>Continue with Email</Text>
      </Pressable>

      <Pressable 
        style={styles.createAccountLink}
        onPress={() => animateTransition(() => setMode('signup'))}
      >
        <Text style={styles.createAccountText}>
          Don&apos;t have an account? <Text style={styles.linkText}>Sign up</Text>
        </Text>
      </Pressable>
    </Animated.View>
  );

  const renderEmailForm = () => (
    <Animated.View 
      style={[
        styles.contentContainer,
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
        {mode === 'signin' ? 'Welcome back' : 'Create your account'}
      </Text>
      <Text style={styles.formSubtitle}>
        {mode === 'signin' 
          ? 'Sign in to continue your financial journey'
          : 'Start your path to financial clarity'}
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
            placeholder="Display name"
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
          <ActivityIndicator color="#fff" />
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
            ? "Don&apos;t have an account? " 
            : "Already have an account? "}
          <Text style={styles.linkText}>
            {mode === 'signin' ? 'Sign up' : 'Sign in'}
          </Text>
        </Text>
      </Pressable>
    </Animated.View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View 
            style={[
              styles.mascotContainer,
              { transform: [{ translateY: mascotFloat }] },
            ]}
          >
            <View style={styles.mascotGlow}>
              <Image 
                source={{ uri: MASCOT_URL }} 
                style={styles.mascot} 
                resizeMode="contain"
              />
            </View>
          </Animated.View>

          {mode === 'welcome' ? renderWelcome() : renderEmailForm()}

          <View style={{ height: insets.bottom + 24 }} />
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
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },
  mascotContainer: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 16,
  },
  mascotGlow: {
    shadowColor: Colors.coral,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
  },
  mascot: {
    width: SCREEN_WIDTH * 0.45,
    height: SCREEN_WIDTH * 0.45,
    maxWidth: 200,
    maxHeight: 200,
  },
  contentContainer: {
    flex: 1,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  socialButtons: {
    gap: 12,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    gap: 12,
  },
  googleButton: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  appleButton: {
    backgroundColor: Colors.text,
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
    color: '#fff',
  },
  socialButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  appleButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#fff',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dividerText: {
    marginHorizontal: 16,
    color: Colors.textMuted,
    fontSize: 14,
  },
  emailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  emailButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  createAccountLink: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  createAccountText: {
    fontSize: 15,
    color: Colors.textSecondary,
  },
  linkText: {
    color: Colors.accent,
    fontWeight: '600' as const,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    marginLeft: -8,
  },
  backText: {
    fontSize: 16,
    color: Colors.text,
    marginLeft: 4,
  },
  formTitle: {
    fontSize: 26,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 8,
  },
  formSubtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    marginBottom: 24,
    lineHeight: 21,
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
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
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
    position: 'absolute' as const,
    right: 16,
    padding: 4,
  },
  submitButton: {
    backgroundColor: Colors.accent,
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
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
    fontWeight: '600' as const,
    color: '#fff',
  },
  switchModeLink: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  switchModeText: {
    fontSize: 15,
    color: Colors.textSecondary,
  },
});
