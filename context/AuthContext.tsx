import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';
import { User } from '@/types';

WebBrowser.maybeCompleteAuthSession();

const STORAGE_KEYS = {
  USER: 'clearpath_user',
  USERS_DB: 'clearpath_users_db',
};

interface StoredUser {
  email: string;
  password: string;
  displayName: string;
  id: string;
  createdAt: string;
}

export const [AuthProvider, useAuth] = createContextHook(() => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [, googleResponse, promptGoogleAsync] = Google.useAuthRequest({
    webClientId: '000000000000-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com',
    iosClientId: '000000000000-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com',
    androidClientId: '000000000000-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com',
  });

  const loadStoredUser = useCallback(async () => {
    try {
      console.log('[AuthContext] Loading stored user...');
      const storedUser = await AsyncStorage.getItem(STORAGE_KEYS.USER);
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        setUser(parsed);
        console.log('[AuthContext] User restored:', parsed.email);
      }
    } catch (err) {
      console.error('[AuthContext] Error loading user:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStoredUser();
  }, [loadStoredUser]);

  const saveUser = async (userData: User) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userData));
      setUser(userData);
      setError(null);
      console.log('[AuthContext] User saved:', userData.email);
    } catch (err) {
      console.error('[AuthContext] Error saving user:', err);
    }
  };

  const hashPassword = async (password: string): Promise<string> => {
    const hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      password
    );
    return hash;
  };

  const signUpWithEmail = useCallback(async (email: string, password: string, displayName: string) => {
    console.log('[AuthContext] Signing up with email:', email);
    setError(null);
    
    try {
      const usersDb = await AsyncStorage.getItem(STORAGE_KEYS.USERS_DB);
      const users: StoredUser[] = usersDb ? JSON.parse(usersDb) : [];
      
      if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
        setError('An account with this email already exists');
        return false;
      }

      const hashedPassword = await hashPassword(password);
      const newUser: StoredUser = {
        id: `user_${Date.now()}`,
        email: email.toLowerCase(),
        password: hashedPassword,
        displayName,
        createdAt: new Date().toISOString(),
      };

      users.push(newUser);
      await AsyncStorage.setItem(STORAGE_KEYS.USERS_DB, JSON.stringify(users));

      const userData: User = {
        id: newUser.id,
        email: newUser.email,
        displayName: newUser.displayName,
        provider: 'email',
        createdAt: newUser.createdAt,
      };

      await saveUser(userData);
      return true;
    } catch (err) {
      console.error('[AuthContext] Sign up error:', err);
      setError('Failed to create account. Please try again.');
      return false;
    }
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    console.log('[AuthContext] Signing in with email:', email);
    setError(null);

    try {
      const usersDb = await AsyncStorage.getItem(STORAGE_KEYS.USERS_DB);
      const users: StoredUser[] = usersDb ? JSON.parse(usersDb) : [];
      
      const storedUser = users.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (!storedUser) {
        setError('No account found with this email');
        return false;
      }

      const hashedPassword = await hashPassword(password);
      if (storedUser.password !== hashedPassword) {
        setError('Incorrect password');
        return false;
      }

      const userData: User = {
        id: storedUser.id,
        email: storedUser.email,
        displayName: storedUser.displayName,
        provider: 'email',
        createdAt: storedUser.createdAt,
      };

      await saveUser(userData);
      return true;
    } catch (err) {
      console.error('[AuthContext] Sign in error:', err);
      setError('Failed to sign in. Please try again.');
      return false;
    }
  }, []);

  const signInWithGoogle = useCallback(async () => {
    console.log('[AuthContext] Starting Google sign in...');
    setError(null);

    try {
      if (Platform.OS === 'web') {
        const mockUser: User = {
          id: `google_${Date.now()}`,
          email: 'user@gmail.com',
          displayName: 'Google User',
          provider: 'google',
          createdAt: new Date().toISOString(),
        };
        await saveUser(mockUser);
        return true;
      }

      const result = await promptGoogleAsync();
      if (result?.type === 'success') {
        return true;
      }
      return false;
    } catch (err) {
      console.error('[AuthContext] Google sign in error:', err);
      setError('Failed to sign in with Google');
      return false;
    }
  }, [promptGoogleAsync]);

  const handleGoogleSuccess = useCallback(async (accessToken: string) => {
    try {
      const response = await fetch('https://www.googleapis.com/userinfo/v2/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const userInfo = await response.json();

      const userData: User = {
        id: userInfo.id || `google_${Date.now()}`,
        email: userInfo.email,
        displayName: userInfo.name || userInfo.email.split('@')[0],
        photoUrl: userInfo.picture,
        provider: 'google',
        createdAt: new Date().toISOString(),
      };

      await saveUser(userData);
    } catch (err) {
      console.error('[AuthContext] Google user info error:', err);
      setError('Failed to get Google user info');
    }
  }, []);

  useEffect(() => {
    if (googleResponse?.type === 'success') {
      handleGoogleSuccess(googleResponse.authentication?.accessToken || '');
    }
  }, [googleResponse, handleGoogleSuccess]);

  const signInWithApple = useCallback(async () => {
    console.log('[AuthContext] Starting Apple sign in...');
    setError(null);

    try {
      if (Platform.OS === 'web') {
        const mockUser: User = {
          id: `apple_${Date.now()}`,
          email: 'user@icloud.com',
          displayName: 'Apple User',
          provider: 'apple',
          createdAt: new Date().toISOString(),
        };
        await saveUser(mockUser);
        return true;
      }

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

      const userData: User = {
        id: credential.user,
        email: credential.email || `${credential.user}@privaterelay.appleid.com`,
        displayName: credential.fullName?.givenName 
          ? `${credential.fullName.givenName} ${credential.fullName.familyName || ''}`
          : 'Apple User',
        provider: 'apple',
        createdAt: new Date().toISOString(),
      };

      await saveUser(userData);
      return true;
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
      await AsyncStorage.removeItem(STORAGE_KEYS.USER);
      setUser(null);
      setError(null);
    } catch (err) {
      console.error('[AuthContext] Sign out error:', err);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    user,
    isAuthenticated: !!user,
    isLoading,
    error,
    signUpWithEmail,
    signInWithEmail,
    signInWithGoogle,
    signInWithApple,
    signOut,
    clearError,
  };
});
