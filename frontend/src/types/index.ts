// User and Authentication Types
export interface User {
  id: number;
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
  id: number;
  user_id: number;
  title: string;
  type: DecisionType;
  cooldown_hours: number;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface BinaryDecision {
  decision_id: number;
  probability: number;
  probability_granularity: number; // 0=whole, 1=0.1, 2=0.01
  yes_text: string;
  no_text: string;
}

export interface WeightHistory {
  id: number;
  choice_id: number;
  weight: number;
  changed_at: string;
}

export interface Choice {
  id: number;
  decision_id: number;
  name: string;
  weight: number;
  display_order: number;
  weight_history?: WeightHistory[];
}

export interface MultiChoiceDecision {
  decision_id: number;
  choices: Choice[];
  weight_granularity: number; // 0=whole, 1=0.1, 2=0.01
}

export interface DecisionWithDetails extends Decision {
  binary_decision?: BinaryDecision;
  multi_choice_decision?: MultiChoiceDecision;
  rolls?: Roll[];
  probability_history?: ProbabilityHistory[];
}

// Roll and Tracking Types
export interface RollChoiceWeight {
  choice_id: number;
  choice_name: string;
  weight: number;
}

export interface Roll {
  id: number;
  decision_id: number;
  result: string; // For binary: "yes" | "no", for multi: choice name
  followed: boolean | null; // null = pending, true/false = confirmed
  probability?: number; // For binary decisions - the probability used for this roll
  choice_weights: RollChoiceWeight[]; // For multi-choice - the weights used for this roll
  created_at: string;
}

export interface ProbabilityHistory {
  id: number;
  decision_id: number;
  probability: number;
  changed_at: string;
}

// API response type for rolling
export interface RollResult {
  id: number;
  result: string;
  created_at: string;
}

// Form Types
export interface CreateBinaryDecisionForm {
  title: string;
  probability: number;
  probability_granularity: number;
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