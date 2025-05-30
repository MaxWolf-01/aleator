import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User, LoginCredentials, RegisterCredentials } from '@/types';
import { apiClient } from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';

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
  const queryClient = useQueryClient();

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
        console.log('Auth check failed, creating guest session');
        
        // Clear the invalid token
        apiClient.clearAuthToken();
        
        // Create a new guest session
        try {
          const { guest_token } = await apiClient.createGuestSession();
          console.log('Guest token created:', guest_token ? 'yes' : 'no');
          apiClient.setAuthToken(guest_token);
          
          const guestUser = await apiClient.getCurrentUser();
          console.log('Guest user:', guestUser);
          setUser(guestUser);
        } catch (guestError) {
          console.error('Failed to create guest session:', guestError);
          // Keep user as null, app will handle unauthenticated state
        }
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (credentials: LoginCredentials) => {
    const tokens = await apiClient.login(credentials);
    apiClient.setAuthToken(tokens.access_token);
    
    const currentUser = await apiClient.getCurrentUser();
    setUser(currentUser);
  };

  const register = async (credentials: RegisterCredentials) => {
    await apiClient.register(credentials);
    // After registration, automatically log in
    await login({
      email: credentials.email,
      password: credentials.password,
    });
  };

  const logout = async () => {
    const wasGuest = user?.is_guest;
    
    try {
      await apiClient.logout();
    } catch {
      // Continue with logout even if API call fails
    } finally {
      setUser(null);
      apiClient.clearAuthToken();
      // Clear all cached queries on logout
      queryClient.clear();
      
      // For guest users, create a new guest session instead of logging out completely
      if (wasGuest) {
        try {
          const { guest_token } = await apiClient.createGuestSession();
          apiClient.setAuthToken(guest_token);
          
          const guestUser = await apiClient.getCurrentUser();
          setUser(guestUser);
        } catch (error) {
          console.error('Failed to create new guest session:', error);
        }
      }
    }
  };

  const createGuestSession = async () => {
    const { guest_token } = await apiClient.createGuestSession();
    apiClient.setAuthToken(guest_token);
    
    const currentUser = await apiClient.getCurrentUser();
    setUser(currentUser);
  };

  const convertGuestToUser = async (email: string, password: string) => {
    const tokens = await apiClient.convertGuestToUser(email, password);
    apiClient.setAuthToken(tokens.access_token);
    
    const currentUser = await apiClient.getCurrentUser();
    setUser(currentUser);
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