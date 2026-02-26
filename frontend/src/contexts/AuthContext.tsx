/**
 * Authentication Context
 * Provides authentication state and methods throughout the app
 */
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { api } from '../services/api';
import type { User, LoginRequest, RegisterRequest, RegisterResponse } from '../types/index';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (request: LoginRequest) => Promise<void>;
  register: (request: RegisterRequest) => Promise<RegisterResponse>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'vb_auth_token';
const USER_KEY = 'vb_auth_user';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing token on mount
  useEffect(() => {
    const checkAuth = async () => {
      const storedToken = localStorage.getItem(TOKEN_KEY);
      const storedUser = localStorage.getItem(USER_KEY);

      if (storedToken) {
        // First, restore cached user data for immediate display
        if (storedUser) {
          try {
            const cachedUser = JSON.parse(storedUser) as User;
            setUser(cachedUser);
            setToken(storedToken);
          } catch {
            // Invalid cached user data, ignore
          }
        }

        // Then validate token with backend
        try {
          const userData = await api.getMe(storedToken);
          setUser(userData);
          setToken(storedToken);
          // Update cached user data
          localStorage.setItem(USER_KEY, JSON.stringify(userData));
        } catch (error) {
          // Only clear token on 401 (unauthorized) errors
          const isAuthError = error &&
            typeof error === 'object' &&
            'response' in error &&
            (error as { response?: { status?: number } }).response?.status === 401;

          if (isAuthError) {
            // Token is invalid, clear everything
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(USER_KEY);
            setUser(null);
            setToken(null);
          }
          // For other errors (network, server), keep the cached user/token
          // The user can continue using the app with cached data
        }
      }
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  const login = useCallback(async (request: LoginRequest) => {
    const response = await api.login(request);
    const newToken = response.access_token;

    // Store token
    localStorage.setItem(TOKEN_KEY, newToken);
    setToken(newToken);

    // Fetch user data and cache it
    const userData = await api.getMe(newToken);
    setUser(userData);
    localStorage.setItem(USER_KEY, JSON.stringify(userData));
  }, []);

  const register = useCallback(async (request: RegisterRequest): Promise<RegisterResponse> => {
    // Register the user - returns message about verification email
    const response = await api.register(request);
    return response;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout
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
