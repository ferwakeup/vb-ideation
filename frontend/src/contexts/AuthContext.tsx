/**
 * Authentication Context
 * Provides authentication state and methods throughout the app using Supabase Auth
 */
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '../clients/supabase';
import type { User, LoginRequest, RegisterRequest, RegisterResponse } from '../types/index';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (request: LoginRequest) => Promise<void>;
  register: (request: RegisterRequest) => Promise<RegisterResponse>;
  logout: () => Promise<void>;
  resendVerification: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Convert Supabase user to our User type
function supabaseUserToUser(supabaseUser: SupabaseUser, profile?: { full_name?: string; is_admin?: boolean; is_active?: boolean }): User {
  return {
    id: supabaseUser.id as unknown as number, // Keep compatibility with existing code expecting number
    email: supabaseUser.email || '',
    full_name: profile?.full_name || supabaseUser.user_metadata?.full_name || '',
    is_active: profile?.is_active ?? true,
    is_verified: !!supabaseUser.email_confirmed_at,
    is_admin: profile?.is_admin ?? false,
    created_at: supabaseUser.created_at,
    updated_at: supabaseUser.updated_at || undefined,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch user profile from database
  const fetchUserProfile = useCallback(async (supabaseUser: SupabaseUser): Promise<User> => {
    try {
      const { data: profile, error } = await supabase
        .from('users')
        .select('full_name, is_admin, is_active')
        .eq('id', supabaseUser.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching user profile:', error);
      }

      return supabaseUserToUser(supabaseUser, profile || undefined);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return supabaseUserToUser(supabaseUser);
    }
  }, []);

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Get initial session
        const { data: { session: initialSession } } = await supabase.auth.getSession();

        if (initialSession?.user) {
          setSession(initialSession);
          const userProfile = await fetchUserProfile(initialSession.user);
          setUser(userProfile);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      setSession(newSession);

      if (newSession?.user) {
        const userProfile = await fetchUserProfile(newSession.user);
        setUser(userProfile);
      } else {
        setUser(null);
      }

      if (event === 'SIGNED_OUT') {
        setUser(null);
        setSession(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchUserProfile]);

  const login = useCallback(async (request: LoginRequest) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: request.email,
      password: request.password,
    });

    if (error) {
      // Handle specific error cases
      if (error.message.includes('Email not confirmed')) {
        throw new Error('Please verify your email before logging in. Check your inbox for a verification link.');
      }
      if (error.message.includes('Invalid login credentials')) {
        throw new Error('Invalid email or password.');
      }
      throw new Error(error.message);
    }

    if (!data.user) {
      throw new Error('Login failed. Please try again.');
    }

    // Session will be handled by onAuthStateChange
  }, []);

  const register = useCallback(async (request: RegisterRequest): Promise<RegisterResponse> => {
    const { data, error } = await supabase.auth.signUp({
      email: request.email,
      password: request.password,
      options: {
        data: {
          full_name: request.full_name,
        },
        emailRedirectTo: `${window.location.origin}/verify-email`,
      },
    });

    if (error) {
      if (error.message.includes('User already registered')) {
        throw new Error('An account with this email already exists.');
      }
      throw new Error(error.message);
    }

    // Create user profile in our users table
    if (data.user) {
      const { error: profileError } = await supabase
        .from('users')
        .insert({
          id: data.user.id,
          email: request.email,
          full_name: request.full_name,
          is_active: true,
          is_verified: false,
          is_admin: false,
        });

      if (profileError && !profileError.message.includes('duplicate')) {
        console.error('Error creating user profile:', profileError);
      }
    }

    return {
      message: 'Registration successful! Please check your email to verify your account.',
      email: request.email,
      requires_verification: true,
    };
  }, []);

  const logout = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error);
    }
    setUser(null);
    setSession(null);
  }, []);

  const resendVerification = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/verify-email`,
      },
    });

    if (error) {
      throw new Error(error.message);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token: session?.access_token || null,
        isAuthenticated: !!user && !!session,
        isLoading,
        login,
        register,
        logout,
        resendVerification,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
