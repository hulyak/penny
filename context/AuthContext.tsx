import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useCallback } from 'react';
import * as AppleAuthentication from 'expo-apple-authentication';
import { Platform } from 'react-native';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithCredential,
  OAuthProvider,
  User as FirebaseUser,
} from 'firebase/auth';
import { auth, isFirebaseConfigured, firestoreHelpers } from '@/lib/firebase';
import { User } from '@/types';
import portfolioService from '@/lib/portfolioService';
import logger from '@/lib/logger';

export const [AuthProvider, useAuth] = createContextHook(() => {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);

  const mapFirebaseUser = useCallback((fbUser: FirebaseUser): User => {
    const providerId = fbUser.providerData[0]?.providerId || 'password';
    let provider: 'email' | 'google' | 'apple' | 'demo' = 'email';
    if (providerId.includes('google')) provider = 'google';
    else if (providerId.includes('apple')) provider = 'apple';

    return {
      id: fbUser.uid,
      email: fbUser.email || '',
      displayName: fbUser.displayName || fbUser.email?.split('@')[0] || 'User',
      provider,
      photoUrl: fbUser.photoURL || undefined,
      createdAt: fbUser.metadata.creationTime || new Date().toISOString(),
    };
  }, []);

  useEffect(() => {
    logger.debug('AuthContext', 'Initializing Firebase auth listener...');
    logger.debug('AuthContext', `Firebase configured: ${isFirebaseConfigured}`);

    if (!isFirebaseConfigured) {
      logger.warn('AuthContext', 'Firebase not configured, skipping auth');
      setIsLoading(false);
      return;
    }

    const timeoutId = setTimeout(() => {
      logger.warn('AuthContext', 'Session check timed out');
      setIsLoading(false);
    }, 5000);

    if (!auth) {
      logger.warn('AuthContext', 'Firebase auth not initialized');
      setIsLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      clearTimeout(timeoutId);
      logger.debug('AuthContext', `Auth state changed: ${fbUser ? 'user exists' : 'no user'}`);

      setFirebaseUser(fbUser);
      if (fbUser) {
        setUser(mapFirebaseUser(fbUser));
        // Sync portfolio data with Firebase after login
        logger.debug('AuthContext', 'Triggering portfolio sync...');
        portfolioService.syncWithFirebase().catch((err) => {
          logger.warn('AuthContext', 'Portfolio sync failed', err);
        });
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => {
      clearTimeout(timeoutId);
      unsubscribe();
    };
  }, [mapFirebaseUser]);

  const handleAuthError = (err: any): string => {
    logger.error('AuthContext', 'Auth error', err);
    const code = err.code || '';
    const message = err.message || 'An error occurred';

    if (code === 'auth/invalid-email') {
      return 'Invalid email address';
    }
    if (code === 'auth/user-disabled') {
      return 'This account has been disabled';
    }
    if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
      return 'Invalid email or password';
    }
    if (code === 'auth/email-already-in-use') {
      return 'An account with this email already exists';
    }
    if (code === 'auth/weak-password') {
      return 'Password must be at least 6 characters';
    }
    if (code === 'auth/too-many-requests') {
      return 'Too many attempts. Please try again later';
    }
    if (code === 'auth/network-request-failed') {
      return 'Network error. Please check your connection';
    }

    return message;
  };

  const signUpWithEmail = useCallback(async (email: string, password: string, displayName: string) => {
    logger.info('AuthContext', `Signing up with email: ${email}`);
    setError(null);

    if (!email || !password || !displayName) {
      setError('Please fill in all fields');
      return false;
    }

    if (displayName.trim().length < 2) {
      setError('Display name must be at least 2 characters');
      return false;
    }

    if (!isFirebaseConfigured) {
      setError('Firebase not configured');
      return false;
    }

    if (!auth) {
      setError('Firebase not initialized');
      return false;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email.trim().toLowerCase(),
        password
      );

      // Update display name
      await updateProfile(userCredential.user, {
        displayName: displayName.trim(),
      });

      // Save initial user data to Firestore
      await firestoreHelpers.saveUserFinancials(userCredential.user.uid, {
        createdAt: new Date().toISOString(),
      });

      logger.info('AuthContext', 'Sign up successful');
      return true;
    } catch (err: any) {
      setError(handleAuthError(err));
      return false;
    }
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    logger.info('AuthContext', `Signing in with email: ${email}`);
    setError(null);

    if (!email || !password) {
      setError('Please enter email and password');
      return false;
    }

    if (!isFirebaseConfigured || !auth) {
      setError('Firebase not configured. Use Demo mode.');
      return false;
    }

    try {
      await signInWithEmailAndPassword(
        auth,
        email.trim().toLowerCase(),
        password
      );

      logger.info('AuthContext', 'Sign in successful');
      return true;
    } catch (err: any) {
      setError(handleAuthError(err));
      return false;
    }
  }, []);

  const signInWithGoogle = useCallback(async () => {
    logger.info('AuthContext', 'Starting Google sign in...');
    setError(null);

    if (!isFirebaseConfigured || !auth) {
      setError('Firebase not configured. Use Demo mode.');
      return false;
    }

    try {
      // For web, use Firebase popup
      if (Platform.OS === 'web') {
        const { signInWithPopup } = await import('firebase/auth');
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
        return true;
      }

      // For native iOS/Android, use expo-auth-session
      const AuthSession = await import('expo-auth-session');
      const { maybeCompleteAuthSession } = await import('expo-web-browser');

      // Complete any pending auth session
      maybeCompleteAuthSession();

      const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

      if (!webClientId) {
        logger.error('AuthContext', 'EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID not set');
        setError('Google Sign-In not configured. Use Demo mode.');
        return false;
      }

      // Create redirect URI
      const redirectUri = AuthSession.makeRedirectUri({
        scheme: 'penny',
      });

      logger.info('AuthContext', `Google redirect URI: ${redirectUri}`);
      logger.info('AuthContext', `Using client ID: ${webClientId.substring(0, 20)}...`);

      // Use Google's discovery document
      const discovery = {
        authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenEndpoint: 'https://oauth2.googleapis.com/token',
      };

      // Create auth request
      const request = new AuthSession.AuthRequest({
        clientId: webClientId,
        redirectUri,
        scopes: ['openid', 'profile', 'email'],
        responseType: AuthSession.ResponseType.IdToken,
        extraParams: {
          nonce: Math.random().toString(36).substring(7),
        },
      });

      // Prompt user for authorization
      const result = await request.promptAsync(discovery);

      logger.info('AuthContext', `Google auth result type: ${result.type}`);

      if (result.type === 'success' && result.params?.id_token) {
        // Sign in to Firebase with Google credential
        const credential = GoogleAuthProvider.credential(result.params.id_token);
        await signInWithCredential(auth, credential);
        logger.info('AuthContext', 'Google sign in successful');
        return true;
      }

      if (result.type === 'cancel' || result.type === 'dismiss') {
        logger.info('AuthContext', 'Google sign in cancelled by user');
        return false;
      }

      if (result.type === 'error') {
        logger.error('AuthContext', 'Google auth error', result.error);
        setError(`Google Sign-In failed: ${result.error?.message || 'Unknown error'}. Try Demo mode.`);
        return false;
      }

      logger.warn('AuthContext', 'Google sign in failed', result);
      setError('Google Sign-In failed. Try Demo mode.');
      return false;
    } catch (err: any) {
      logger.error('AuthContext', 'Google sign in error', err);
      setError(`Google Sign-In error: ${err.message || 'Unknown error'}. Try Demo mode.`);
      return false;
    }
  }, []);

  const signInWithApple = useCallback(async () => {
    logger.info('AuthContext', 'Starting Apple sign in...');
    setError(null);

    if (!isFirebaseConfigured || !auth) {
      setError('Firebase not configured. Use Demo mode.');
      return false;
    }

    try {
      if (Platform.OS === 'web') {
        const { signInWithPopup } = await import('firebase/auth');
        const provider = new OAuthProvider('apple.com');
        await signInWithPopup(auth, provider);
        return true;
      }

      if (Platform.OS === 'android') {
        setError('Apple Sign-In is only available on iOS. Use Demo mode.');
        return false;
      }

      // Check if Apple Auth is available (iOS only)
      const isAvailable = await AppleAuthentication.isAvailableAsync();
      logger.info('AuthContext', `Apple Auth available: ${isAvailable}`);

      if (!isAvailable) {
        setError('Apple Sign-In requires a custom build (not Expo Go). Use Demo mode.');
        return false;
      }

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (credential.identityToken) {
        // Create Firebase credential from Apple token
        const provider = new OAuthProvider('apple.com');
        const oAuthCredential = provider.credential({
          idToken: credential.identityToken,
          rawNonce: credential.authorizationCode || undefined,
        });

        const userCredential = await signInWithCredential(auth, oAuthCredential);

        // Update display name if provided by Apple
        if (credential.fullName && userCredential.user) {
          const displayName = credential.fullName.givenName
            ? `${credential.fullName.givenName} ${credential.fullName.familyName || ''}`
            : undefined;

          if (displayName) {
            await updateProfile(userCredential.user, {
              displayName: displayName.trim(),
            });
          }
        }

        logger.info('AuthContext', 'Apple sign in successful');
        return true;
      }

      setError('Failed to get Apple credentials. Try Demo mode.');
      return false;
    } catch (err: any) {
      if (err.code === 'ERR_REQUEST_CANCELED' || err.code === 'ERR_CANCELED') {
        logger.info('AuthContext', 'Apple sign in cancelled by user');
        return false;
      }
      logger.error('AuthContext', 'Apple sign in error', err);
      setError(`Apple Sign-In error: ${err.message || 'Unknown error'}. Try Demo mode.`);
      return false;
    }
  }, []);

  const signOut = useCallback(async () => {
    logger.info('AuthContext', 'Signing out...');
    try {
      if (!isDemoMode && isFirebaseConfigured && auth) {
        await firebaseSignOut(auth);
      }
      // Clear local portfolio data on logout
      await portfolioService.clearLocalData();
      setUser(null);
      setFirebaseUser(null);
      setError(null);
      setIsDemoMode(false);
    } catch (err) {
      logger.error('AuthContext', 'Sign out error', err);
    }
  }, [isDemoMode]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const updateUserProfile = useCallback(async (updates: Partial<Pick<User, 'displayName' | 'photoUrl'>>) => {
    if (!firebaseUser) return false;

    try {
      await updateProfile(firebaseUser, {
        displayName: updates.displayName,
        photoURL: updates.photoUrl,
      });

      setUser(prev => prev ? { ...prev, ...updates } : null);
      logger.info('AuthContext', 'Profile updated');
      return true;
    } catch (err) {
      logger.error('AuthContext', 'Profile update error', err);
      return false;
    }
  }, [firebaseUser]);

  const resetPassword = useCallback(async (email: string) => {
    logger.info('AuthContext', `Sending password reset email to: ${email}`);
    setError(null);

    if (!isFirebaseConfigured || !auth) {
      setError('Firebase not configured');
      return false;
    }

    try {
      await sendPasswordResetEmail(auth, email.trim().toLowerCase());
      return true;
    } catch (err: any) {
      setError(handleAuthError(err));
      return false;
    }
  }, []);

  const signInAsDemo = useCallback(async () => {
    logger.info('AuthContext', 'Signing in as demo user...');
    setError(null);

    const demoUser: User = {
      id: 'demo-user-' + Date.now(),
      email: 'demo@penny.app',
      displayName: 'Demo User',
      provider: 'demo',
      createdAt: new Date().toISOString(),
    };

    setUser(demoUser);
    setIsDemoMode(true);
    setIsLoading(false);
    logger.info('AuthContext', 'Demo sign in successful');
    return true;
  }, []);

  return {
    user,
    session: firebaseUser, // For compatibility
    isAuthenticated: !!firebaseUser || isDemoMode,
    isLoading,
    error,
    isDemoMode,
    signUpWithEmail,
    signInWithEmail,
    signInWithGoogle,
    signInWithApple,
    signInAsDemo,
    signOut,
    clearError,
    updateProfile: updateUserProfile,
    resetPassword,
  };
});
