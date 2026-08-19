/**
 * OTP Verification Challenge & Delivery Service.
 *
 * Implements:
 * 1. Cryptographically secure 6-digit challenge lifecycle
 * 2. 5-minute expiration & 60-second resend cooldown
 * 3. 5-attempt rate limit protection
 * 4. Single-use invalidation
 * 5. Production Delivery Provider Abstraction (SMTP / SMS / Dev Mode)
 */

import { OTPChallenge, User } from '../types/auth';
import { CryptoService } from './crypto.service';
import { getActiveOtpProvider, IOtpProvider, OTPDeliveryResult } from './otp.provider';
import { APP_CONFIG, apiFetch } from '../config/env.config';

const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
const RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds
const MAX_VERIFY_ATTEMPTS = 5;

export interface ServerOTPRecord {
  readonly id: string;
  readonly identifier: string;
  readonly code: string; // Server memory representation
  readonly purpose: 'REGISTRATION' | 'LOGIN_VERIFICATION' | 'PASSWORD_RESET';
  readonly createdAt: number;
  readonly expiresAt: number;
  readonly attemptsRemaining: number;
  readonly resendAvailableAt: number;
  readonly verified: boolean;
  readonly pendingData?: Record<string, unknown>;
}

export type { OTPDeliveryResult };

class OTPService {
  private challenges: Map<string, ServerOTPRecord> = new Map();
  private recentResendsByIdentifier: Map<string, number[]> = new Map();
  private provider: IOtpProvider = getActiveOtpProvider();

  /**
   * Sets or overrides the active OTP provider (useful for testing).
   */
  public setProvider(provider: IOtpProvider): void {
    this.provider = provider;
  }

  /**
   * Returns current active provider type.
   */
  public getActiveProviderType(): string {
    return this.provider.providerType;
  }

  /**
   * Checks whether real production delivery provider credentials (e.g. SMTP/SMS) are present.
   */
  public isProductionDeliveryConfigured(): boolean {
    return this.provider.providerType === 'SMTP' || this.provider.providerType === 'SMS';
  }

  /**
   * Dispatches OTP through configured delivery channel.
   */
  private async deliverOTP(
    identifier: string,
    code: string,
    purpose: ServerOTPRecord['purpose']
  ): Promise<OTPDeliveryResult> {
    return this.provider.sendOtp(identifier, code, purpose);
  }

  /**
   * Creates a new OTP verification challenge.
   * If in API_EMAIL mode, delegates to FastAPI backend which dispatches via Brevo.
   */
  public async createChallenge(
    identifier: string,
    purpose: ServerOTPRecord['purpose'],
    pendingData?: Record<string, unknown>
  ): Promise<{ challenge: OTPChallenge; delivery: OTPDeliveryResult }> {
    const cleanId = identifier.trim().toLowerCase();

    // 1. Backend REST API Mode (API_EMAIL)
    if (this.provider.providerType === 'API_EMAIL' || APP_CONFIG.otpProvider === 'API_EMAIL') {
      try {
        const resp = await apiFetch('/auth/otp/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanId, purpose, pendingData }),
        });

        if (!resp.ok) {
          const errData = (await resp.json().catch(() => ({}))) as { detail?: string; message?: string };
          throw new Error(errData.detail || errData.message || 'Failed to dispatch verification code via email.');
        }

        const data = await resp.json();
        const clientChallenge: OTPChallenge = {
          challengeId: data.challengeId,
          identifier: cleanId,
          maskedIdentifier: data.maskedRecipient || CryptoService.maskIdentifier(cleanId),
          purpose,
          createdAt: data.createdAt || Date.now(),
          expiresAt: data.expiresAt || Date.now() + OTP_EXPIRY_MS,
          attemptsRemaining: data.attemptsRemaining ?? MAX_VERIFY_ATTEMPTS,
          resendAvailableAt: data.resendAvailableAt || Date.now() + RESEND_COOLDOWN_MS,
          isExpired: false,
        };

        const delivery: OTPDeliveryResult = {
          success: true,
          provider: 'API_EMAIL',
          message: `Verification code has been dispatched via Brevo to ${clientChallenge.maskedIdentifier}. Please check your inbox.`,
          maskedRecipient: clientChallenge.maskedIdentifier,
          devCode: undefined, // Never expose devCode in API_EMAIL mode!
        };

        return { challenge: clientChallenge, delivery };
      } catch (err: unknown) {
        if (err instanceof Error) {
          if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
            throw new Error('Unable to reach R.A.I. Authentication Server. Please ensure the backend is running.');
          }
          throw err;
        }
        throw new Error('Failed to dispatch verification code via email.');
      }
    }

    // 2. Local In-Memory Mode (For offline testing / Dev Simulator)
    const now = Date.now();

    // Check rate limit: max 5 requests per 10 minutes per identifier
    const recent = this.recentResendsByIdentifier.get(cleanId) || [];
    const windowStart = now - 10 * 60 * 1000;
    const validRecent = recent.filter((t) => t > windowStart);
    if (validRecent.length >= 5) {
      throw new Error('Too many verification requests for this account. Please wait a few minutes before trying again.');
    }
    validRecent.push(now);
    this.recentResendsByIdentifier.set(cleanId, validRecent);

    // Invalidate any existing active challenges for this identifier & purpose
    for (const [existingId, record] of this.challenges.entries()) {
      if (record.identifier.toLowerCase() === cleanId && record.purpose === purpose) {
        this.challenges.delete(existingId);
      }
    }

    const code = CryptoService.generateSecureOTP();
    const challengeId = `otp-ch-${now}-${Math.random().toString(36).substring(2, 9)}`;

    const record: ServerOTPRecord = {
      id: challengeId,
      identifier: cleanId,
      code,
      purpose,
      createdAt: now,
      expiresAt: now + OTP_EXPIRY_MS,
      attemptsRemaining: MAX_VERIFY_ATTEMPTS,
      resendAvailableAt: now + RESEND_COOLDOWN_MS,
      verified: false,
      pendingData,
    };

    this.challenges.set(challengeId, record);
    const delivery = await this.deliverOTP(cleanId, code, purpose);

    const clientChallenge: OTPChallenge = {
      challengeId,
      identifier: cleanId,
      maskedIdentifier: CryptoService.maskIdentifier(cleanId),
      purpose,
      createdAt: record.createdAt,
      expiresAt: record.expiresAt,
      attemptsRemaining: record.attemptsRemaining,
      resendAvailableAt: record.resendAvailableAt,
      isExpired: false,
    };

    return { challenge: clientChallenge, delivery };
  }

  /**
   * Resends an OTP challenge respecting the 60-second cooldown period.
   */
  public async resendChallenge(
    challengeId: string
  ): Promise<{ challenge: OTPChallenge; delivery: OTPDeliveryResult }> {
    // 1. Backend REST API Mode (API_EMAIL)
    if (this.provider.providerType === 'API_EMAIL' || APP_CONFIG.otpProvider === 'API_EMAIL') {
      try {
        const resp = await apiFetch('/auth/otp/resend', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ challengeId }),
        });

        if (!resp.ok) {
          const errData = (await resp.json().catch(() => ({}))) as { detail?: string; message?: string };
          throw new Error(errData.detail || errData.message || 'Failed to resend verification code.');
        }

        const data = await resp.json();
        const clientChallenge: OTPChallenge = {
          challengeId: data.challengeId,
          identifier: data.identifier || '',
          maskedIdentifier: data.maskedRecipient || '',
          purpose: data.purpose || 'REGISTRATION',
          createdAt: data.createdAt || Date.now(),
          expiresAt: data.expiresAt || Date.now() + OTP_EXPIRY_MS,
          attemptsRemaining: data.attemptsRemaining ?? MAX_VERIFY_ATTEMPTS,
          resendAvailableAt: data.resendAvailableAt || Date.now() + RESEND_COOLDOWN_MS,
          isExpired: false,
        };

        const delivery: OTPDeliveryResult = {
          success: true,
          provider: 'API_EMAIL',
          message: `Fresh verification code dispatched via Brevo to ${clientChallenge.maskedIdentifier}.`,
          maskedRecipient: clientChallenge.maskedIdentifier,
          devCode: undefined,
        };

        return { challenge: clientChallenge, delivery };
      } catch (err: unknown) {
        if (err instanceof Error) {
          if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
            throw new Error('Unable to reach R.A.I. Authentication Server. Please ensure the backend is running.');
          }
          throw err;
        }
        throw new Error('Failed to resend verification code.');
      }
    }

    // 2. Local in-memory mode
    const existing = this.challenges.get(challengeId);
    if (!existing) {
      throw new Error('Verification session not found or has expired. Please initiate registration or login again.');
    }

    const now = Date.now();
    if (now < existing.resendAvailableAt) {
      const waitSec = Math.ceil((existing.resendAvailableAt - now) / 1000);
      throw new Error(`Please wait ${waitSec} seconds before requesting another code.`);
    }

    return this.createChallenge(existing.identifier, existing.purpose, existing.pendingData);
  }

  public async resendOTP(
    challengeId: string
  ): Promise<{ challenge: OTPChallenge; delivery: OTPDeliveryResult }> {
    return this.resendChallenge(challengeId);
  }

  /**
   * Verifies candidate OTP code against server challenge record.
   */
  public async verifyCode(
    challengeId: string,
    candidateCode: string
  ): Promise<{
    success: boolean;
    identifier: string;
    purpose: ServerOTPRecord['purpose'];
    pendingData?: Record<string, unknown>;
    user?: User;
    sessionToken?: string;
  }> {
    const cleanInput = candidateCode.trim();

    // 1. Backend REST API Mode (API_EMAIL)
    if (this.provider.providerType === 'API_EMAIL' || APP_CONFIG.otpProvider === 'API_EMAIL') {
      try {
        const resp = await apiFetch('/auth/otp/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ challengeId, code: cleanInput }),
        });

        if (!resp.ok) {
          const errData = (await resp.json().catch(() => ({}))) as { detail?: string; message?: string };
          throw new Error(errData.detail || errData.message || 'Incorrect verification code.');
        }

        const data = await resp.json();
        return {
          success: true,
          identifier: data.identifier || data.user?.email || '',
          purpose: data.purpose || 'REGISTRATION',
          pendingData: data.pendingData,
          user: data.user,
          sessionToken: data.sessionToken,
        };
      } catch (err: unknown) {
        if (err instanceof Error) {
          if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
            throw new Error('Unable to reach R.A.I. Authentication Server. Please ensure the backend is running.');
          }
          throw err;
        }
        throw new Error('Verification failed.');
      }
    }

    // 2. Local in-memory mode
    const record = this.challenges.get(challengeId);
    if (!record) {
      throw new Error('Verification challenge expired or invalid. Please request a new code.');
    }

    const now = Date.now();
    if (now > record.expiresAt) {
      this.challenges.delete(challengeId);
      throw new Error('Verification code has expired (5-minute limit exceeded). Please request a fresh code.');
    }

    if (record.attemptsRemaining <= 0) {
      this.challenges.delete(challengeId);
      throw new Error('Maximum verification attempts exceeded. For your security, this code is now invalidated.');
    }

    // Timing-safe constant-time comparison
    const isMatch = CryptoService.timingSafeEqual(record.code, cleanInput);

    if (!isMatch) {
      const newAttempts = record.attemptsRemaining - 1;
      if (newAttempts <= 0) {
        this.challenges.delete(challengeId);
        throw new Error('Incorrect verification code. Maximum attempts exceeded. Please request a fresh code.');
      } else {
        const updatedRecord: ServerOTPRecord = {
          ...record,
          attemptsRemaining: newAttempts,
        };
        this.challenges.set(challengeId, updatedRecord);
        throw new Error(`Incorrect verification code. ${newAttempts} attempt${newAttempts > 1 ? 's' : ''} remaining.`);
      }
    }

    // Success: consume challenge immediately (single-use guarantee)
    this.challenges.delete(challengeId);

    return {
      success: true,
      identifier: record.identifier,
      purpose: record.purpose,
      pendingData: record.pendingData,
    };
  }

  /**
   * Synchronous challenge verification helper for legacy test compatibility.
   */
  public verifyOTP(
    challengeId: string,
    candidateCode: string
  ): { success: boolean; record: { verified: boolean; identifier: string } } {
    const record = this.challenges.get(challengeId);
    if (!record) {
      throw new Error('Verification challenge expired or invalid.');
    }
    const cleanInput = candidateCode.trim();
    if (!CryptoService.timingSafeEqual(record.code, cleanInput)) {
      const newAttempts = record.attemptsRemaining - 1;
      if (newAttempts <= 0) {
        this.challenges.delete(challengeId);
        throw new Error('Incorrect verification code. Maximum attempts exceeded.');
      } else {
        this.challenges.set(challengeId, { ...record, attemptsRemaining: newAttempts });
        throw new Error(`Incorrect verification code. ${newAttempts} attempts remaining.`);
      }
    }
    const updated = { ...record, verified: true };
    this.challenges.set(challengeId, updated);
    return { success: true, record: { verified: true, identifier: record.identifier } };
  }

  /**
   * Consumes and invalidates an active challenge (single-use).
   */
  public consumeChallenge(challengeId: string): void {
    this.challenges.delete(challengeId);
  }

  public getChallenge(challengeId: string): OTPChallenge | null {
    return this.getChallengeStatus(challengeId);
  }

  /**
   * Retrieves active client-safe challenge status.
   */
  public getChallengeStatus(challengeId: string): OTPChallenge | null {
    const record = this.challenges.get(challengeId);
    if (!record) return null;

    const now = Date.now();
    return {
      challengeId: record.id,
      identifier: record.identifier,
      maskedIdentifier: CryptoService.maskIdentifier(record.identifier),
      purpose: record.purpose,
      createdAt: record.createdAt,
      expiresAt: record.expiresAt,
      attemptsRemaining: record.attemptsRemaining,
      resendAvailableAt: record.resendAvailableAt,
      isExpired: now > record.expiresAt,
    };
  }
}

export const otpService = new OTPService();
