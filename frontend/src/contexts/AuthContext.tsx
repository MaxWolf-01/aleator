import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User, LoginCredentials, RegisterCredentials } from '@/types';
import { apiClient } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isGuest: boolean;
  createGuestSession: () => Promise<void>;
  convertGuestToUser: (email: string, password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const isAuthenticated = !!user;
  const isGuest = user?.is_guest ?? false;

  useEffect(() => {
    // Check if user is already logged in on app start
    const initAuth = async () => {
      try {
        const currentUser = await apiClient.getCurrentUser();
        setUser(currentUser);
      } catch (error) {
        // User not authenticated or token expired
        // Only create a new guest session if we don't have any token
        const existingToken = localStorage.getItem('auth_token');
        if (!existingToken) {
          try {
            const { guest_token } = await apiClient.createGuestSession();
            apiClient.setAuthToken(guest_token);
            
            const guestUser = await apiClient.getCurrentUser();
            setUser(guestUser);
          } catch (guestError) {
            console.error('Failed to create guest session:', guestError);
          }
        } else {
          // Clear the invalid token
          apiClient.clearAuthToken();
        }
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (credentials: LoginCredentials) => {
    try {
      const tokens = await apiClient.login(credentials);
      apiClient.setAuthToken(tokens.access_token);
      
      const currentUser = await apiClient.getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      throw error;
    }
  };

  const register = async (credentials: RegisterCredentials) => {
    try {
      await apiClient.register(credentials);
      // After registration, automatically log in
      await login({
        email: credentials.email,
        password: credentials.password,
      });
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      await apiClient.logout();
    } catch (error) {
      // Continue with logout even if API call fails
    } finally {
      setUser(null);
      apiClient.clearAuthToken();
    }
  };

  const createGuestSession = async () => {
    try {
      const { guest_token } = await apiClient.createGuestSession();
      apiClient.setAuthToken(guest_token);
      
      const currentUser = await apiClient.getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      throw error;
    }
  };

  const convertGuestToUser = async (email: string, password: string) => {
    try {
      const tokens = await apiClient.convertGuestToUser(email, password);
      apiClient.setAuthToken(tokens.access_token);
      
      const currentUser = await apiClient.getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    login,
    register,
    logout,
    isAuthenticated,
    isGuest,
    createGuestSession,
    convertGuestToUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}