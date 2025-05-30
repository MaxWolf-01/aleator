import type { AuthTokens, LoginCredentials, RegisterCredentials, User } from '@/types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export type CreateDecisionInput = {
  title: string;
  type: 'binary' | 'multi_choice';
  cooldown_hours: number;
  binary_data?: {
    probability: number;
    yes_text: string;
    no_text: string;
  };
  multi_choice_data?: {
    choices: { name: string; weight: number }[];
  };
};

export interface UpdateDecisionInput {
  title?: string;
  probability?: number;
  yes_text?: string;
  no_text?: string;
  cooldown_hours?: number;
  choices?: { name: string; weight: number }[];
}

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
      ...(options.headers as Record<string, string> || {}),
    };

    // Only set Content-Type if not already set and body exists
    if (!headers['Content-Type'] && options.body && typeof options.body === 'string') {
      headers['Content-Type'] = 'application/json';
    }

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
        const errorData = await response.json().catch(() => ({
          detail: 'Network error occurred',
          status_code: response.status,
        }));
        
        // Handle different error response formats
        let errorMessage = 'An error occurred';
        if (typeof errorData.detail === 'string') {
          errorMessage = errorData.detail;
        } else if (Array.isArray(errorData.detail)) {
          // FastAPI validation errors
          errorMessage = errorData.detail.map((err: any) => err.msg || err.message).join(', ');
        } else if (errorData.message) {
          errorMessage = errorData.message;
        } else {
          errorMessage = `HTTP ${response.status}`;
        }
        
        throw new Error(errorMessage);
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
    // Use URL-encoded form data for OAuth2 compatibility
    const params = new URLSearchParams();
    params.append('username', credentials.email);
    params.append('password', credentials.password);

    return this.request<AuthTokens>('/api/v1/auth/login/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });
  }

  async register(credentials: RegisterCredentials): Promise<User> {
    return this.request<User>('/api/v1/auth/register/', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async getCurrentUser(): Promise<User> {
    return this.request<User>('/api/v1/auth/me/');
  }

  async createGuestSession(): Promise<{ guest_token: string }> {
    return this.request<{ guest_token: string }>('/api/v1/auth/guest/', {
      method: 'POST',
    });
  }

  async convertGuestToUser(email: string, password: string): Promise<AuthTokens> {
    return this.request<AuthTokens>('/api/v1/auth/convert/', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async logout(): Promise<void> {
    await this.request<void>('/api/v1/auth/logout/', {
      method: 'POST',
    });
    this.clearAuthToken();
  }

  // Decision endpoints
  async getDecisions() {
    return this.request('/api/v1/decisions/');
  }

  async createDecision(decision: CreateDecisionInput) {
    return this.request('/api/v1/decisions/', {
      method: 'POST',
      body: JSON.stringify(decision),
    });
  }

  async updateDecision(id: string, updates: UpdateDecisionInput) {
    return this.request(`/api/v1/decisions/${id}/`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteDecision(id: string) {
    return this.request(`/api/v1/decisions/${id}/`, {
      method: 'DELETE',
    });
  }

  async rollDecision(id: string) {
    return this.request(`/api/v1/decisions/${id}/roll/`, {
      method: 'POST',
    });
  }

  async getPendingRoll(id: string) {
    return this.request(`/api/v1/decisions/${id}/pending-roll/`);
  }

  async confirmFollowThrough(decisionId: string, rollId: string, followed: boolean) {
    return this.request(`/api/v1/decisions/${decisionId}/rolls/${rollId}/confirm/`, {
      method: 'POST',
      body: JSON.stringify({ followed }),
    });
  }

  // Analytics endpoints
  async getAnalyticsOverview() {
    return this.request('/api/v1/analytics/overview/');
  }

  async getDecisionAnalytics(id: string) {
    return this.request(`/api/v1/analytics/decisions/${id}/`);
  }

  // User endpoints
  async exportData() {
    return this.request('/api/v1/user/export/');
  }
}

export const apiClient = new ApiClient(API_BASE_URL);