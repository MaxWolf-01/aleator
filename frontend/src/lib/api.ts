import type { AuthTokens, LoginCredentials, RegisterCredentials, User, ApiError } from '@/types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

class ApiClient {
  private baseURL: string;
  private authToken: string | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    this.loadAuthToken();
  }

  private loadAuthToken() {
    this.authToken = localStorage.getItem('auth_token');
  }

  setAuthToken(token: string) {
    this.authToken = token;
    localStorage.setItem('auth_token', token);
  }

  clearAuthToken() {
    this.authToken = null;
    localStorage.removeItem('auth_token');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    if (this.authToken) {
      headers.Authorization = `Bearer ${this.authToken}`;
    }

    const config: RequestInit = {
      ...options,
      headers,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData: ApiError = await response.json().catch(() => ({
          detail: 'Network error occurred',
          status_code: response.status,
        }));
        throw new Error(errorData.detail || `HTTP ${response.status}`);
      }

      // Handle empty responses
      const text = await response.text();
      return text ? JSON.parse(text) : ({} as T);
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Unknown error occurred');
    }
  }

  // Authentication endpoints
  async login(credentials: LoginCredentials): Promise<AuthTokens> {
    const formData = new FormData();
    formData.append('username', credentials.email);
    formData.append('password', credentials.password);

    return this.request<AuthTokens>('/api/v1/auth/login', {
      method: 'POST',
      headers: {},
      body: formData,
    });
  }

  async register(credentials: RegisterCredentials): Promise<User> {
    return this.request<User>('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async getCurrentUser(): Promise<User> {
    return this.request<User>('/api/v1/auth/me');
  }

  async createGuestSession(): Promise<{ guest_token: string }> {
    return this.request<{ guest_token: string }>('/api/v1/auth/guest', {
      method: 'POST',
    });
  }

  async convertGuestToUser(email: string, password: string): Promise<AuthTokens> {
    return this.request<AuthTokens>('/api/v1/auth/convert', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async logout(): Promise<void> {
    await this.request<void>('/api/v1/auth/logout', {
      method: 'POST',
    });
    this.clearAuthToken();
  }

  // Decision endpoints
  async getDecisions() {
    return this.request('/api/v1/decisions/');
  }

  async createDecision(decision: any) {
    return this.request('/api/v1/decisions/', {
      method: 'POST',
      body: JSON.stringify(decision),
    });
  }

  async updateDecision(id: string, updates: any) {
    return this.request(`/api/v1/decisions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async rollDecision(id: string) {
    return this.request(`/api/v1/decisions/${id}/roll`, {
      method: 'POST',
    });
  }

  async confirmFollowThrough(decisionId: string, rollId: string, followed: boolean) {
    return this.request(`/api/v1/decisions/${decisionId}/rolls/${rollId}/confirm`, {
      method: 'POST',
      body: JSON.stringify({ followed }),
    });
  }

  // Analytics endpoints
  async getAnalyticsOverview() {
    return this.request('/api/v1/analytics/overview');
  }

  async getDecisionAnalytics(id: string) {
    return this.request(`/api/v1/analytics/decisions/${id}`);
  }

  // User endpoints
  async exportData() {
    return this.request('/api/v1/user/export');
  }
}

export const apiClient = new ApiClient(API_BASE_URL);