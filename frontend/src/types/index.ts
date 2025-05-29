// User and Authentication Types
export interface User {
  id: string;
  email: string;
  created_at: string;
  is_active: boolean;
  is_guest: boolean;
}

export interface AuthTokens {
  access_token: string;
  token_type: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
}

// Decision Types
export type DecisionType = 'binary' | 'multi_choice';

export interface Decision {
  id: string;
  user_id: string;
  title: string;
  type: DecisionType;
  cooldown_hours: number;
  created_at: string;
  updated_at: string;
}

export interface BinaryDecision {
  decision_id: string;
  probability: number;
  yes_text: string;
  no_text: string;
}

export interface Choice {
  id: string;
  decision_id: string;
  name: string;
  weight: number;
}

export interface MultiChoiceDecision {
  decision_id: string;
  choices: Choice[];
}

export interface DecisionWithDetails extends Decision {
  binary_decision?: BinaryDecision;
  multi_choice_decision?: MultiChoiceDecision;
  rolls?: Roll[];
}

// Roll and Tracking Types
export interface Roll {
  id: string;
  decision_id: string;
  result: string; // For binary: "yes" | "no", for multi: choice name
  followed: boolean | null; // null = pending, true/false = confirmed
  created_at: string;
}

export interface ProbabilityHistory {
  id: string;
  decision_id: string;
  probability: number;
  changed_at: string;
}

// Form Types
export interface CreateBinaryDecisionForm {
  title: string;
  probability: number;
  yes_text: string;
  no_text: string;
}

export interface CreateMultiChoiceDecisionForm {
  title: string;
  cooldown_hours: number;
  choices: { name: string; weight: number }[];
}

// Analytics Types
export interface DecisionStats {
  total_rolls: number;
  follow_through_rate: number;
  streak: number;
  recent_rolls: Roll[];
}

export interface AnalyticsOverview {
  total_decisions: number;
  total_rolls: number;
  overall_follow_through_rate: number;
  most_active_decision: DecisionWithDetails | null;
}

// API Response Types
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  has_next: boolean;
}

// Error Types
export interface ApiError {
  detail: string;
  status_code: number;
}