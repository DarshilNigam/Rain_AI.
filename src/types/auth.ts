/**
 * Authentication & Identity Types for R.A.I.
 */
import { UserLocation } from './location';

export type UserRole = 'user' | 'farmer';

export type AccountVerificationStatus = 'UNVERIFIED' | 'VERIFIED' | 'LOCKED';

export interface User {
  readonly id: string;
  readonly fullName: string;
  readonly email: string;
  readonly role: UserRole;
  readonly verificationStatus: AccountVerificationStatus;
  readonly emailVerifiedAt?: string;
  readonly createdAt: string;
  // Citizen location context
  readonly location?: UserLocation;
  // Farmer specific location metadata
  readonly villageArea?: string;
  readonly district?: string;
  readonly farmLocation?: {
    readonly lat: number;
    readonly lng: number;
    readonly addressLabel: string;
  };
}

export interface StoredUserRecord extends User {
  readonly passwordHash: string;
  readonly salt: string;
}

export interface FarmerAgriculturalProfile {
  readonly farmerId: string;
  readonly cropType?: string;
  readonly cropVariety?: string;
  readonly cropStage?: string;
  readonly soilType?: string;
  readonly drainageType?: string;
  readonly farmSizeAcres?: number;
  readonly lastUpdated?: string;
}

export interface LoginPayload {
  readonly email: string;
  readonly password: string;
  readonly rememberMe?: boolean;
}

export interface RegisterUserPayload {
  readonly fullName: string;
  readonly email: string;
  readonly password: string;
  readonly confirmPassword: string;
  readonly location?: UserLocation;
}

export interface RegisterFarmerPayload {
  readonly fullName: string;
  readonly email: string;
  readonly password: string;
  readonly confirmPassword: string;
  readonly villageArea: string;
  readonly district: string;
  readonly farmLocation: {
    readonly lat: number;
    readonly lng: number;
    readonly addressLabel: string;
  };
}

export interface OTPChallenge {
  readonly challengeId: string;
  readonly identifier: string; // Masked on client where appropriate
  readonly purpose: 'REGISTRATION' | 'LOGIN_VERIFICATION' | 'PASSWORD_RESET';
  readonly createdAt: number;
  readonly expiresAt: number;
  readonly attemptsRemaining: number;
  readonly resendAvailableAt: number;
  readonly isExpired: boolean;
  readonly maskedIdentifier: string;
}

export type PasswordStrength = 'WEAK' | 'FAIR' | 'GOOD' | 'STRONG';

export interface PasswordPolicyCheck {
  readonly isMinLength: boolean;
  readonly hasUppercase: boolean;
  readonly hasLowercase: boolean;
  readonly hasNumber: boolean;
  readonly hasSpecialChar: boolean;
  readonly isNotCommon: boolean;
  readonly isValid: boolean;
  readonly strength: PasswordStrength;
  readonly score: number; // 0 to 100
  readonly feedbackMessages: readonly string[];
}

export interface PasswordResetPayload {
  readonly email: string;
  readonly challengeId: string;
  readonly code: string;
  readonly newPassword: string;
  readonly confirmNewPassword: string;
}

export interface AuthState {
  readonly isAuthenticated: boolean;
  readonly user: User | null;
  readonly isLoading: boolean;
  readonly error: string | null;
}
