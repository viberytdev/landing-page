export interface User {
  id: string;
  email: string;
  createdAt: string;
}

export interface TrialStatus {
  status: "not_activated" | "active" | "expired";
  startDate?: string;
  endDate?: string;
  daysRemaining?: number;
}

export interface SubscriptionStatus {
  type: "none" | "lifetime";
  startDate?: string;
}

export interface LicenseKey {
  key: string;
  deviceId: string;
  isActivated: boolean;
  expiresAt?: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  user?: User;
  error?: string;
}
