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

export const [AuthProvider, useAuth] = createContextHook(() => {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);

  const mapFirebaseUser = useCallback((fbUser: FirebaseUser): User => {
    return {
      id: fbUser.uid,
      email: fbUser.email || '',
      displayName: fbUser.displayName || fbUser.email?.split('@')[0] || 'User',
      provider: fbUser.providerData[0]?.providerId || 'email',
      photoUrl: fbUser.photoURL || undefined,
      createdAt: fbUser.metadata.creationTime || new Date().toISOString(),
    };
  }, []);

  useEffect(() => {
    console.log('[AuthContext] Initializing Firebase auth listener...');
    console.log('[AuthContext] Firebase configured:', isFirebaseConfigured);

    if (!isFirebaseConfigured) {
      console.warn('[AuthContext] Firebase not configured, skipping auth');
      setIsLoading(false);
      return;
    }

    const timeoutId = setTimeout(() => {
      console.warn('[AuthContext] Session check timed out');
      setIsLoading(false);
    }, 5000);

    const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
      clearTimeout(timeoutId);
      console.log('[AuthContext] Auth state changed:', fbUser ? 'user exists' : 'no user');

      setFirebaseUser(fbUser);
      if (fbUser) {
        setUser(mapFirebaseUser(fbUser));
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
    console.error('[AuthContext] Auth error:', err);
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
    console.log('[AuthContext] Signing up with email:', email);
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

      console.log('[AuthContext] Sign up successful');
      return true;
    } catch (err: any) {
      setError(handleAuthError(err));
      return false;
    }
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    console.log('[AuthContext] Signing in with email:', email);
    setError(null);

    if (!email || !password) {
      setError('Please enter email and password');
      return false;
    }

    if (!isFirebaseConfigured) {
      setError('Firebase not configured');
      return false;
    }

    try {
      await signInWithEmailAndPassword(
        auth,
        email.trim().toLowerCase(),
        password
      );

      console.log('[AuthContext] Sign in successful');
      return true;
    } catch (err: any) {
      setError(handleAuthError(err));
      return false;
    }
  }, []);

  const signInWithGoogle = useCallback(async () => {
    console.log('[AuthContext] Starting Google sign in...');
    setError(null);

    if (!isFirebaseConfigured) {
      setError('Firebase not configured');
      return false;
    }

    try {
      // For React Native, we need to use expo-auth-session or similar
      // This is a simplified version - you may need to add expo-auth-session
      if (Platform.OS === 'web') {
        const { signInWithPopup } = await import('firebase/auth');
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
        return true;
      }

      // For native, you'll need to configure Google Sign-In
      // Using expo-auth-session with Google OAuth
      const { makeRedirectUri, AuthRequest } = await import('expo-auth-session');
      const { maybeCompleteAuthSession } = await import('expo-web-browser');

      maybeCompleteAuthSession();

      const redirectUri = makeRedirectUri({
        scheme: 'penny',
        path: 'auth/callback',
      });

      // Note: You'll need to set up Google OAuth in Firebase Console
      // and add the client ID to your app config
      setError('Google Sign-In requires additional setup. Please use email/password or Apple Sign-In.');
      return false;
    } catch (err: any) {
      console.error('[AuthContext] Google sign in error:', err);
      setError('Failed to sign in with Google');
      return false;
    }
  }, []);

  const signInWithApple = useCallback(async () => {
    console.log('[AuthContext] Starting Apple sign in...');
    setError(null);

    if (!isFirebaseConfigured) {
      setError('Firebase not configured');
      return false;
    }

    try {
      if (Platform.OS === 'web') {
        const { signInWithPopup } = await import('firebase/auth');
        const provider = new OAuthProvider('apple.com');
        await signInWithPopup(auth, provider);
        return true;
      }

      // Check if Apple Auth is available (iOS only)
      const isAvailable = await AppleAuthentication.isAvailableAsync();
      if (!isAvailable) {
        setError('Apple Sign In is not available on this device');
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

        return true;
      }

      setError('Failed to get Apple credentials');
      return false;
    } catch (err: any) {
      if (err.code === 'ERR_REQUEST_CANCELED') {
        console.log('[AuthContext] Apple sign in cancelled');
        return false;
      }
      console.error('[AuthContext] Apple sign in error:', err);
      setError('Failed to sign in with Apple');
      return false;
    }
  }, []);

  const signOut = useCallback(async () => {
    console.log('[AuthContext] Signing out...');
    try {
      if (!isDemoMode && isFirebaseConfigured) {
        await firebaseSignOut(auth);
      }
      setUser(null);
      setFirebaseUser(null);
      setError(null);
      setIsDemoMode(false);
    } catch (err) {
      console.error('[AuthContext] Sign out error:', err);
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
      console.log('[AuthContext] Profile updated');
      return true;
    } catch (err) {
      console.error('[AuthContext] Profile update error:', err);
      return false;
    }
  }, [firebaseUser]);

  const resetPassword = useCallback(async (email: string) => {
    console.log('[AuthContext] Sending password reset email to:', email);
    setError(null);

    if (!isFirebaseConfigured) {
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
    console.log('[AuthContext] Signing in as demo user...');
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
    console.log('[AuthContext] Demo sign in successful');
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
