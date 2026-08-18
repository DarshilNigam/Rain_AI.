import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  User,
  LoginPayload,
  RegisterUserPayload,
  RegisterFarmerPayload,
  OTPChallenge,
  PasswordResetPayload,
} from '../types/auth';
import { authService, RegistrationInitiationResult } from '../services/auth.service';
import { otpService, OTPDeliveryResult } from '../services/otp.service';

interface AuthContextType {
  readonly user: User | null;
  readonly isAuthenticated: boolean;
  readonly isVerified: boolean;
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly activeChallenge: OTPChallenge | null;
  readonly lastDeliveryResult: OTPDeliveryResult | null;
  readonly login: (payload: LoginPayload) => Promise<User>;
  readonly initiateRegisterUser: (payload: RegisterUserPayload) => Promise<RegistrationInitiationResult>;
  readonly initiateRegisterFarmer: (payload: RegisterFarmerPayload) => Promise<RegistrationInitiationResult>;
  readonly verifyRegistrationOTP: (challengeId: string, code: string) => Promise<User>;
  readonly resendOTP: (challengeId: string) => Promise<{ challenge: OTPChallenge; delivery: OTPDeliveryResult }>;
  readonly requestAccountOTP: (
    email: string,
    purpose: 'REGISTRATION' | 'LOGIN_VERIFICATION' | 'PASSWORD_RESET'
  ) => Promise<{ challenge: OTPChallenge; delivery: OTPDeliveryResult }>;
  readonly resetPassword: (payload: PasswordResetPayload) => Promise<boolean>;
  readonly setActiveChallenge: (challenge: OTPChallenge | null) => void;
  readonly logout: () => void;
  readonly clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeChallenge, setActiveChallenge] = useState<OTPChallenge | null>(null);
  const [lastDeliveryResult, setLastDeliveryResult] = useState<OTPDeliveryResult | null>(null);

  // Initialize session from server/storage on app mount with authoritative server validation
  useEffect(() => {
    let isMounted = true;
    const initializeAuth = async () => {
      try {
        const validatedUser = await authService.validateServerSession();
        if (isMounted) {
          if (validatedUser && validatedUser.verificationStatus === 'VERIFIED') {
            setUser(validatedUser);
          } else {
            setUser(null);
          }
        }
      } catch {
        if (isMounted) {
          const fallback = authService.getSession();
          if (fallback && fallback.verificationStatus === 'VERIFIED') {
            setUser(fallback);
          } else {
            setUser(null);
          }
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initializeAuth();
    return () => {
      isMounted = false;
    };
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const login = useCallback(async (payload: LoginPayload): Promise<User> => {
    setIsLoading(true);
    setError(null);
    try {
      const authenticatedUser = await authService.login(payload);
      setUser(authenticatedUser);
      return authenticatedUser;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Authentication failed. Please try again.';
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const initiateRegisterUser = useCallback(
    async (payload: RegisterUserPayload): Promise<RegistrationInitiationResult> => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await authService.initiateRegisterUser(payload);
        setActiveChallenge(result.challenge);
        setLastDeliveryResult(result.delivery);
        return result;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Registration failed. Please try again.';
        setError(msg);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const initiateRegisterFarmer = useCallback(
    async (payload: RegisterFarmerPayload): Promise<RegistrationInitiationResult> => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await authService.initiateRegisterFarmer(payload);
        setActiveChallenge(result.challenge);
        setLastDeliveryResult(result.delivery);
        return result;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Farmer registration failed. Please try again.';
        setError(msg);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const verifyRegistrationOTP = useCallback(
    async (challengeId: string, code: string): Promise<User> => {
      setIsLoading(true);
      setError(null);
      try {
        const verifiedUser = await authService.verifyRegistrationOTP(challengeId, code);
        setUser(verifiedUser);
        setActiveChallenge(null);
        return verifiedUser;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'OTP verification failed. Please try again.';
        setError(msg);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const resendOTP = useCallback(
    async (challengeId: string): Promise<{ challenge: OTPChallenge; delivery: OTPDeliveryResult }> => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await otpService.resendOTP(challengeId);
        setActiveChallenge(result.challenge);
        setLastDeliveryResult(result.delivery);
        return result;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to resend verification code.';
        setError(msg);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const requestAccountOTP = useCallback(
    async (
      email: string,
      purpose: 'REGISTRATION' | 'LOGIN_VERIFICATION' | 'PASSWORD_RESET'
    ): Promise<{ challenge: OTPChallenge; delivery: OTPDeliveryResult }> => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await authService.requestAccountOTP(email, purpose);
        setActiveChallenge(result.challenge);
        setLastDeliveryResult(result.delivery);
        return result;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to issue verification code.';
        setError(msg);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const resetPassword = useCallback(async (payload: PasswordResetPayload): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await authService.resetPassword(payload);
      setActiveChallenge(null);
      return res;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Password reset failed.';
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    authService.clearSession();
    setUser(null);
    setActiveChallenge(null);
    setLastDeliveryResult(null);
    setError(null);
  }, []);

  const value: AuthContextType = {
    user,
    isAuthenticated: Boolean(user && user.verificationStatus === 'VERIFIED'),
    isVerified: Boolean(user?.verificationStatus === 'VERIFIED'),
    isLoading,
    error,
    activeChallenge,
    lastDeliveryResult,
    login,
    initiateRegisterUser,
    initiateRegisterFarmer,
    verifyRegistrationOTP,
    resendOTP,
    requestAccountOTP,
    resetPassword,
    setActiveChallenge,
    logout,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
