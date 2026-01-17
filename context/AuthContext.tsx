import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useCallback } from 'react';
import * as AppleAuthentication from 'expo-apple-authentication';
import { Platform } from 'react-native';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { User } from '@/types';
import { Session, AuthError } from '@supabase/supabase-js';

export const [AuthProvider, useAuth] = createContextHook(() => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const mapSupabaseUser = useCallback((supabaseUser: any): User => {
    return {
      id: supabaseUser.id,
      email: supabaseUser.email || '',
      displayName: supabaseUser.user_metadata?.display_name || 
                   supabaseUser.user_metadata?.full_name ||
                   supabaseUser.email?.split('@')[0] || 
                   'User',
      provider: supabaseUser.app_metadata?.provider || 'email',
      photoUrl: supabaseUser.user_metadata?.avatar_url,
      createdAt: supabaseUser.created_at,
    };
  }, []);

  useEffect(() => {
    console.log('[AuthContext] Initializing Supabase auth listener...');
    console.log('[AuthContext] Supabase configured:', isSupabaseConfigured);
    
    if (!isSupabaseConfigured) {
      console.warn('[AuthContext] Supabase not configured, skipping auth');
      setIsLoading(false);
      return;
    }

    const timeoutId = setTimeout(() => {
      console.warn('[AuthContext] Session check timed out');
      setIsLoading(false);
    }, 5000);

    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        clearTimeout(timeoutId);
        console.log('[AuthContext] Initial session:', session ? 'exists' : 'none');
        setSession(session);
        if (session?.user) {
          setUser(mapSupabaseUser(session.user));
        }
        setIsLoading(false);
      })
      .catch((err) => {
        clearTimeout(timeoutId);
        console.error('[AuthContext] Failed to get session:', err);
        setIsLoading(false);
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[AuthContext] Auth state changed:', event);
        setSession(session);
        if (session?.user) {
          setUser(mapSupabaseUser(session.user));
        } else {
          setUser(null);
        }
        setIsLoading(false);
      }
    );

    return () => {
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, [mapSupabaseUser]);

  const handleAuthError = (err: AuthError | Error): string => {
    console.error('[AuthContext] Auth error:', err);
    const message = err.message || 'An error occurred';
    
    if (message.includes('Invalid login credentials')) {
      return 'Invalid email or password';
    }
    if (message.includes('User already registered')) {
      return 'An account with this email already exists';
    }
    if (message.includes('Email not confirmed')) {
      return 'Please check your email to confirm your account';
    }
    if (message.includes('Password should be at least')) {
      return 'Password must be at least 6 characters';
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

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            display_name: displayName.trim(),
            full_name: displayName.trim(),
          },
        },
      });

      if (signUpError) {
        setError(handleAuthError(signUpError));
        return false;
      }

      if (data.user && !data.session) {
        console.log('[AuthContext] Sign up successful, email confirmation required');
        setError('Please check your email to confirm your account');
        return false;
      }

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

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (signInError) {
        setError(handleAuthError(signInError));
        return false;
      }

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

    try {
      const { data, error: googleError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: Platform.OS === 'web' 
            ? window.location.origin 
            : 'clearpath://auth/callback',
          skipBrowserRedirect: Platform.OS !== 'web',
        },
      });

      if (googleError) {
        setError(handleAuthError(googleError));
        return false;
      }

      if (Platform.OS !== 'web' && data.url) {
        const WebBrowser = await import('expo-web-browser');
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          'clearpath://auth/callback'
        );
        
        if (result.type === 'success' && 'url' in result) {
          const url = new URL(result.url);
          const accessToken = url.searchParams.get('access_token');
          const refreshToken = url.searchParams.get('refresh_token');
          
          if (accessToken && refreshToken) {
            await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
          }
        }
      }

      return true;
    } catch (err: any) {
      console.error('[AuthContext] Google sign in error:', err);
      setError('Failed to sign in with Google');
      return false;
    }
  }, []);

  const signInWithApple = useCallback(async () => {
    console.log('[AuthContext] Starting Apple sign in...');
    setError(null);

    try {
      if (Platform.OS === 'web') {
        const { error: appleError } = await supabase.auth.signInWithOAuth({
          provider: 'apple',
          options: {
            redirectTo: window.location.origin,
          },
        });

        if (appleError) {
          setError(handleAuthError(appleError));
          return false;
        }
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

      if (credential.identityToken) {
        const { data, error: signInError } = await supabase.auth.signInWithIdToken({
          provider: 'apple',
          token: credential.identityToken,
        });

        if (signInError) {
          setError(handleAuthError(signInError));
          return false;
        }

        if (credential.fullName && data.user) {
          const displayName = credential.fullName.givenName 
            ? `${credential.fullName.givenName} ${credential.fullName.familyName || ''}`
            : undefined;
          
          if (displayName) {
            await supabase.auth.updateUser({
              data: {
                display_name: displayName.trim(),
                full_name: displayName.trim(),
              },
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
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) {
        console.error('[AuthContext] Sign out error:', signOutError);
      }
      setUser(null);
      setSession(null);
      setError(null);
    } catch (err) {
      console.error('[AuthContext] Sign out error:', err);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const updateProfile = useCallback(async (updates: Partial<Pick<User, 'displayName' | 'photoUrl'>>) => {
    if (!user) return false;
    
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          display_name: updates.displayName,
          avatar_url: updates.photoUrl,
        },
      });

      if (updateError) {
        console.error('[AuthContext] Profile update error:', updateError);
        return false;
      }

      setUser(prev => prev ? { ...prev, ...updates } : null);
      console.log('[AuthContext] Profile updated');
      return true;
    } catch (err) {
      console.error('[AuthContext] Profile update error:', err);
      return false;
    }
  }, [user]);

  const resetPassword = useCallback(async (email: string) => {
    console.log('[AuthContext] Sending password reset email to:', email);
    setError(null);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        {
          redirectTo: Platform.OS === 'web' 
            ? `${window.location.origin}/auth/reset-password`
            : 'clearpath://auth/reset-password',
        }
      );

      if (resetError) {
        setError(handleAuthError(resetError));
        return false;
      }

      return true;
    } catch (err: any) {
      setError(handleAuthError(err));
      return false;
    }
  }, []);

  return {
    user,
    session,
    isAuthenticated: !!session,
    isLoading,
    error,
    signUpWithEmail,
    signInWithEmail,
    signInWithGoogle,
    signInWithApple,
    signOut,
    clearError,
    updateProfile,
    resetPassword,
  };
});
