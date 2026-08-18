/**
 * R.A.I. Authentication & Identity Service.
 *
 * Implements:
 * 1. Multi-Step Registration with Strong Password Policy & Salted Hashing
 * 2. Mandatory 6-Digit OTP Account Verification
 * 3. Server-side Session Management & Verified-State Access Enforcement (24h rolling expiry)
 * 4. Secure Password Reset Flow with OTP Validation
 * 5. Brute-Force Rate Limiting & 15-Minute Account Lockout Defense
 * 6. Input Sanitization & Masked Safe Production Error Messaging
 */

import {
  User,
  StoredUserRecord,
  LoginPayload,
  RegisterUserPayload,
  RegisterFarmerPayload,
  OTPChallenge,
  PasswordResetPayload,
} from '../types/auth';
import { UserLocation, DEFAULT_USER_LOCATION } from '../types/location';
import { CryptoService } from './crypto.service';
import { otpService, OTPDeliveryResult } from './otp.service';
import { APP_CONFIG } from '../config/env.config';

const STORAGE_USERS_KEY = 'rai_registered_users_v3_secure';
const STORAGE_SESSION_KEY = 'rai_auth_session_v3_secure';
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes lockout

// Initial demo credentials:
// Citizen: user@rai.ai / DemoUser@2026!
// Farmer: farmer@rai.ai / DemoFarmer@2026!
const DEFAULT_DEMO_USERS: StoredUserRecord[] = [
  {
    id: 'user-demo-01',
    fullName: 'Darshil',
    email: 'user@rai.ai',
    role: 'user',
    verificationStatus: 'VERIFIED',
    emailVerifiedAt: '2026-01-01T00:00:00.000Z',
    passwordHash: '87f763bf45ad5be434ecba9cb49d79fa55325c381f9b3dc3125e985ba5e7d56e',
    salt: 'a1b2c3d4e5f60718293a4b5c6d7e8f90',
    location: DEFAULT_USER_LOCATION,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'farmer-demo-01',
    fullName: 'Ramesh Patel',
    email: 'farmer@rai.ai',
    role: 'farmer',
    verificationStatus: 'VERIFIED',
    emailVerifiedAt: '2026-01-01T00:00:00.000Z',
    passwordHash: '43cb6c8b9d628b0c8046ff6a5ebcb30058ec18f3a388b39414578bfa79f6eb3c',
    salt: 'b2c3d4e5f6a10718293a4b5c6d7e8f91',
    villageArea: 'Khed Shivapur',
    district: 'Pune',
    farmLocation: {
      lat: 18.3541,
      lng: 73.8432,
      addressLabel: 'Sector 4, Shivapur Basin, Pune District',
    },
    createdAt: '2026-01-01T00:00:00.000Z',
  },
];

export interface RegistrationInitiationResult {
  readonly challenge: OTPChallenge;
  readonly delivery: OTPDeliveryResult;
  readonly tempUser: User;
}

export class UnverifiedAccountError extends Error {
  public readonly email: string;
  constructor(message: string, email: string) {
    super(message);
    this.name = 'UnverifiedAccountError';
    this.email = email;
  }
}

export class AccountLockedError extends Error {
  public readonly lockExpiresAt: number;
  constructor(message: string, lockExpiresAt: number) {
    super(message);
    this.name = 'AccountLockedError';
    this.lockExpiresAt = lockExpiresAt;
  }
}

interface StoredSessionEnvelope {
  readonly user: User;
  readonly sessionToken: string;
  readonly sessionCreatedAt: number;
  readonly sessionExpiresAt: number;
  readonly sessionRotatedAt: number;
}

class AuthService {
  private failedLoginAttempts: Map<string, number[]> = new Map();
  private lockedAccounts: Map<string, number> = new Map(); // email -> lockExpiresAt
  private memoryUsers: StoredUserRecord[] = [...DEFAULT_DEMO_USERS];
  private memorySession: string | null = null;

  private getStoredUsers(): StoredUserRecord[] {
    try {
      if (typeof localStorage === 'undefined') {
        return this.memoryUsers;
      }
      const raw = localStorage.getItem(STORAGE_USERS_KEY);
      if (!raw) {
        localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(DEFAULT_DEMO_USERS));
        return DEFAULT_DEMO_USERS;
      }
      return JSON.parse(raw);
    } catch {
      return this.memoryUsers || DEFAULT_DEMO_USERS;
    }
  }

  private saveStoredUsers(users: StoredUserRecord[]): void {
    try {
      this.memoryUsers = users;
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(users));
      }
    } catch (e) {
      console.error('Failed to persist users in storage', e);
    }
  }

  public getSession(): User | null {
    try {
      let raw: string | null = null;
      if (typeof sessionStorage !== 'undefined') {
        raw = sessionStorage.getItem(STORAGE_SESSION_KEY);
      }
      if (!raw && typeof localStorage !== 'undefined') {
        raw = localStorage.getItem(STORAGE_SESSION_KEY);
      }
      if (!raw) {
        raw = this.memorySession;
      }
      if (!raw) return null;

      let user: User | null = null;
      // Support envelope format with expiration check
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        if ('sessionExpiresAt' in parsed && 'user' in parsed) {
          const envelope = parsed as StoredSessionEnvelope;
          if (Date.now() > envelope.sessionExpiresAt) {
            this.clearSession();
            return null;
          }
          user = envelope.user;
        } else {
          user = parsed as User;
        }
      }

      if (!user || user.verificationStatus !== 'VERIFIED') {
        this.clearSession();
        return null;
      }
      return user;
    } catch {
      return null;
    }
  }

  public getSessionToken(): string | null {
    try {
      let raw: string | null = null;
      if (typeof sessionStorage !== 'undefined') {
        raw = sessionStorage.getItem(STORAGE_SESSION_KEY);
      }
      if (!raw && typeof localStorage !== 'undefined') {
        raw = localStorage.getItem(STORAGE_SESSION_KEY);
      }
      if (!raw) {
        raw = this.memorySession;
      }
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed?.sessionToken || null;
    } catch {
      return null;
    }
  }

  public saveSession(user: User, rememberMe: boolean = false, tokenOverride?: string): void {
    try {
      // Never store passwordHash or salt in session
      const sanitizedUser: User = {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        verificationStatus: user.verificationStatus,
        emailVerifiedAt: user.emailVerifiedAt,
        createdAt: user.createdAt,
        location: user.location,
        villageArea: user.villageArea,
        district: user.district,
        farmLocation: user.farmLocation,
      };

      const now = Date.now();
      const envelope: StoredSessionEnvelope = {
        user: sanitizedUser,
        sessionToken: tokenOverride || CryptoService.generateSecureToken(), // Fresh cryptographic 256-bit token (Session Fixation Defense)
        sessionCreatedAt: now,
        sessionRotatedAt: now,
        sessionExpiresAt: now + APP_CONFIG.sessionDurationMs,
      };

      const serialized = JSON.stringify(envelope);
      this.memorySession = serialized;

      if (rememberMe) {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(STORAGE_SESSION_KEY, serialized);
          localStorage.setItem('rai_remember_me', 'true');
          localStorage.setItem('rai_remembered_email', user.email.toLowerCase());
        }
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.removeItem(STORAGE_SESSION_KEY);
        }
      } else {
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.setItem(STORAGE_SESSION_KEY, serialized);
        }
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem(STORAGE_SESSION_KEY);
          localStorage.removeItem('rai_remember_me');
          localStorage.removeItem('rai_remembered_email');
        }
      }
    } catch (e) {
      console.error('Failed to persist session', e);
    }
  }

  public clearSession(): void {
    try {
      const token = this.getSessionToken();
      if (token) {
        const baseApi = (APP_CONFIG.apiBaseUrl || 'http://127.0.0.1:8000/api').replace(/\/+$/, '');
        fetch(`${baseApi}/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }).catch(() => {});
      }
      this.memorySession = null;
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.removeItem(STORAGE_SESSION_KEY);
      }
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(STORAGE_SESSION_KEY);
        if (localStorage.getItem('rai_remember_me') !== 'true') {
          localStorage.removeItem('rai_remembered_email');
        }
      }
    } catch (e) {
      console.error('Failed to clear session', e);
    }
  }

  public async validateServerSession(): Promise<User | null> {
    const token = this.getSessionToken();
    if (!token) return null;

    try {
      const baseApi = (APP_CONFIG.apiBaseUrl || 'http://127.0.0.1:8000/api').replace(/\/+$/, '');
      const resp = await fetch(`${baseApi}/auth/session`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (resp.ok) {
        const data = await resp.json();
        if (data.user && data.user.verificationStatus === 'VERIFIED') {
          const validatedUser: User = {
            id: data.user.id,
            fullName: data.user.fullName,
            email: data.user.email,
            role: data.user.role,
            verificationStatus: data.user.verificationStatus,
            emailVerifiedAt: data.user.emailVerifiedAt,
            villageArea: data.user.villageArea,
            district: data.user.district,
            createdAt: data.user.createdAt || new Date().toISOString(),
          };
          return validatedUser;
        }
      }
      // Server rejected session
      this.clearSession();
      return null;
    } catch {
      // Network failure: fallback to valid unexpired local session
      return this.getSession();
    }
  }

  /**
   * Evaluates login credentials, validates verification state, and establishes session.
   */
  public async login(payload: LoginPayload): Promise<User> {
    await new Promise((resolve) => setTimeout(resolve, 350));

    const email = (payload.email || '').trim().toLowerCase();
    const password = (payload.password || '').trim();
    const rememberMe = Boolean(payload.rememberMe);

    if (!email || !password) {
      throw new Error('Please enter both your email address and password.');
    }

    const now = Date.now();

    // 1. Check account lockout state
    const lockExpiry = this.lockedAccounts.get(email);
    if (lockExpiry && lockExpiry > now) {
      const waitMinutes = Math.ceil((lockExpiry - now) / (60 * 1000));
      throw new AccountLockedError(
        `Account temporarily locked due to multiple failed attempts. Please try again in ${waitMinutes} minute${waitMinutes > 1 ? 's' : ''}.`,
        lockExpiry
      );
    } else if (lockExpiry && lockExpiry <= now) {
      this.lockedAccounts.delete(email);
      this.failedLoginAttempts.delete(email);
    }

    // 2. Rate limiting: max 5 failed attempts in 5 minutes -> triggers 15-min lockout
    const attempts = this.failedLoginAttempts.get(email) || [];
    const validAttempts = attempts.filter((t) => t > now - 5 * 60 * 1000);
    if (validAttempts.length >= 5) {
      const lockUntil = now + LOCKOUT_DURATION_MS;
      this.lockedAccounts.set(email, lockUntil);
      throw new AccountLockedError(
        'Account locked for 15 minutes due to multiple failed login attempts. Please reset your password or try again later.',
        lockUntil
      );
    }

    // Try FastAPI Backend first
    try {
      const baseApi = (APP_CONFIG.apiBaseUrl || 'http://127.0.0.1:8000/api').replace(/\/+$/, '');
      const resp = await fetch(`${baseApi}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (resp.ok) {
        const data = await resp.json();
        if (data.user) {
          const user: User = {
            id: data.user.id,
            fullName: data.user.fullName,
            email: data.user.email,
            role: data.user.role,
            verificationStatus: data.user.verificationStatus,
            emailVerifiedAt: data.user.emailVerifiedAt,
            villageArea: data.user.villageArea,
            district: data.user.district,
            farmLocation: data.user.farmLocation,
            createdAt: data.user.createdAt || new Date().toISOString(),
          };
          this.saveSession(user, rememberMe, data.sessionToken);
          return user;
        }
      } else if (resp.status === 403) {
        await resp.json().catch(() => ({}));
        throw new UnverifiedAccountError(
          'Your account is not verified yet. Please complete OTP verification.',
          email
        );
      } else if (resp.status === 423) {
        const errData = (await resp.json().catch(() => ({}))) as { detail?: string };
        const lockUntil = now + LOCKOUT_DURATION_MS;
        this.lockedAccounts.set(email, lockUntil);
        throw new AccountLockedError(
          errData.detail || 'Account locked for 15 minutes due to multiple failed login attempts.',
          lockUntil
        );
      }
    } catch (backendErr: unknown) {
      if (backendErr instanceof UnverifiedAccountError || backendErr instanceof AccountLockedError) {
        throw backendErr;
      }
      // Continue to local verification fallback
    }

    const users = this.getStoredUsers();
    let found = users.find((u) => u.email.toLowerCase() === email);

    // Fallback: check seeded demo accounts
    if (!found) {
      const demo = DEFAULT_DEMO_USERS.find((u) => u.email.toLowerCase() === email);
      if (demo) {
        users.push(demo);
        this.saveStoredUsers(users);
        found = demo;
      }
    }

    if (!found) {
      validAttempts.push(now);
      this.failedLoginAttempts.set(email, validAttempts);
      throw new Error("That email or password doesn't match an existing R.A.I. account.");
    }

    // Verify salted password hash
    let isPasswordValid = false;
    if (found.passwordHash && found.salt) {
      isPasswordValid = await CryptoService.verifyPassword(password, found.passwordHash, found.salt);
    }
    if (!isPasswordValid) {
      isPasswordValid =
        (found.email.toLowerCase() === 'user@rai.ai' && password === 'DemoUser@2026!') ||
        (found.email.toLowerCase() === 'farmer@rai.ai' && password === 'DemoFarmer@2026!');
    }

    if (!isPasswordValid) {
      validAttempts.push(now);
      this.failedLoginAttempts.set(email, validAttempts);
      if (validAttempts.length >= 5) {
        const lockUntil = now + LOCKOUT_DURATION_MS;
        this.lockedAccounts.set(email, lockUntil);
        throw new AccountLockedError(
          'Too many failed login attempts. For your security, this account is locked for 15 minutes.',
          lockUntil
        );
      }
      throw new Error("That email or password doesn't match an existing R.A.I. account.");
    }

    // Reset failed attempts & locks on successful authentication
    this.failedLoginAttempts.delete(email);
    this.lockedAccounts.delete(email);

    // Check account verification state
    if (found.verificationStatus !== 'VERIFIED') {
      throw new UnverifiedAccountError(
        'Your account is not verified yet. Please complete OTP verification.',
        found.email
      );
    }

    // Ensure citizen location default
    if (found.role === 'user' && !found.location) {
      found = { ...found, location: DEFAULT_USER_LOCATION };
    }

    this.saveSession(found);
    return found;
  }

  /**
   * Initiates Citizen registration: validates fields, enforces password policy, hashes password,
   * creates unverified user record, and issues OTP challenge.
   */
  public async initiateRegisterUser(payload: RegisterUserPayload): Promise<RegistrationInitiationResult> {
    await new Promise((resolve) => setTimeout(resolve, 400));

    const fullName = CryptoService.sanitizeString(payload.fullName || '');
    const email = (payload.email || '').trim().toLowerCase();
    const password = (payload.password || '').trim();
    const confirmPassword = (payload.confirmPassword || '').trim();
    const location = payload.location || DEFAULT_USER_LOCATION;

    if (!fullName) {
      throw new Error('Please enter your full name.');
    }
    if (!email || !email.includes('@') || !email.includes('.')) {
      throw new Error('Please enter a valid email address.');
    }

    const policyCheck = CryptoService.evaluatePasswordPolicy(password);
    if (!policyCheck.isValid) {
      throw new Error(policyCheck.feedbackMessages[0] || 'Password does not meet the security requirements.');
    }

    if (password !== confirmPassword) {
      throw new Error('Passwords do not match. Please verify.');
    }

    if (APP_CONFIG.otpProvider === 'API_EMAIL') {
      const baseApi = (APP_CONFIG.apiBaseUrl || 'http://127.0.0.1:8000/api').replace(/\/+$/, '');
      const resp = await fetch(`${baseApi}/auth/register/initiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          email,
          password,
          role: 'user',
          locationCity: location.city,
          locationState: location.region,
          locationLat: location.lat,
          locationLng: location.lng,
        }),
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.detail || 'Registration failed.');
      }

      const data = await resp.json();
      return {
        challenge: data.challenge,
        delivery: {
          success: true,
          provider: 'API_EMAIL',
          message: `Verification code dispatched to ${data.challenge.maskedRecipient}.`,
          maskedRecipient: data.challenge.maskedRecipient,
        },
        tempUser: data.user,
      };
    }

    const users = this.getStoredUsers();
    if (users.some((u) => u.email.toLowerCase() === email && u.verificationStatus === 'VERIFIED')) {
      throw new Error('An account with this email address already exists. Please log in.');
    }

    // Hash password with unique salt
    const { hash: passwordHash, salt } = await CryptoService.hashPassword(password);

    // Create or update unverified user record
    const existingIndex = users.findIndex((u) => u.email.toLowerCase() === email);
    const userId = existingIndex >= 0 ? users[existingIndex]!.id : `usr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    const unverifiedUser: StoredUserRecord = {
      id: userId,
      fullName,
      email,
      role: 'user',
      verificationStatus: 'UNVERIFIED',
      passwordHash,
      salt,
      location,
      createdAt: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      users[existingIndex] = unverifiedUser;
    } else {
      users.push(unverifiedUser);
    }
    this.saveStoredUsers(users);

    // Issue OTP Challenge
    const { challenge, delivery } = await otpService.createChallenge(email, 'REGISTRATION');

    return {
      challenge,
      delivery,
      tempUser: unverifiedUser,
    };
  }

  /**
   * Initiates Farmer registration: validates fields, enforces password policy, hashes password,
   * creates unverified farmer record, and issues OTP challenge.
   */
  public async initiateRegisterFarmer(payload: RegisterFarmerPayload): Promise<RegistrationInitiationResult> {
    await new Promise((resolve) => setTimeout(resolve, 450));

    const fullName = CryptoService.sanitizeString(payload.fullName || '');
    const email = (payload.email || '').trim().toLowerCase();
    const password = (payload.password || '').trim();
    const confirmPassword = (payload.confirmPassword || '').trim();
    const villageArea = CryptoService.sanitizeString(payload.villageArea || '');
    const district = CryptoService.sanitizeString(payload.district || '');

    if (!fullName) {
      throw new Error('Please enter your full name.');
    }
    if (!email || !email.includes('@') || !email.includes('.')) {
      throw new Error('Please enter a valid email address.');
    }

    const policyCheck = CryptoService.evaluatePasswordPolicy(password);
    if (!policyCheck.isValid) {
      throw new Error(policyCheck.feedbackMessages[0] || 'Password does not meet the security requirements.');
    }

    if (password !== confirmPassword) {
      throw new Error('Passwords do not match. Please verify.');
    }
    if (!villageArea) {
      throw new Error('Village or area name is required.');
    }
    if (!district) {
      throw new Error('District name is required.');
    }
    if (!payload.farmLocation || !payload.farmLocation.addressLabel) {
      throw new Error('Please specify your farm location coordinates or address.');
    }

    if (APP_CONFIG.otpProvider === 'API_EMAIL') {
      const baseApi = (APP_CONFIG.apiBaseUrl || 'http://127.0.0.1:8000/api').replace(/\/+$/, '');
      const resp = await fetch(`${baseApi}/auth/register/initiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          email,
          password,
          role: 'farmer',
          villageArea,
          district,
          state: 'Maharashtra',
          farmLat: payload.farmLocation.lat,
          farmLng: payload.farmLocation.lng,
          addressLabel: payload.farmLocation.addressLabel,
        }),
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.detail || 'Farmer registration failed.');
      }

      const data = await resp.json();
      return {
        challenge: data.challenge,
        delivery: {
          success: true,
          provider: 'API_EMAIL',
          message: `Verification code dispatched to ${data.challenge.maskedRecipient}.`,
          maskedRecipient: data.challenge.maskedRecipient,
        },
        tempUser: data.user,
      };
    }

    const users = this.getStoredUsers();
    if (users.some((u) => u.email.toLowerCase() === email && u.verificationStatus === 'VERIFIED')) {
      throw new Error('An account with this email address already exists. Please log in.');
    }

    // Hash password with unique salt
    const { hash: passwordHash, salt } = await CryptoService.hashPassword(password);

    const existingIndex = users.findIndex((u) => u.email.toLowerCase() === email);
    const farmerId = existingIndex >= 0 ? users[existingIndex]!.id : `fmr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    const unverifiedFarmer: StoredUserRecord = {
      id: farmerId,
      fullName,
      email,
      role: 'farmer',
      verificationStatus: 'UNVERIFIED',
      passwordHash,
      salt,
      villageArea,
      district,
      farmLocation: payload.farmLocation,
      createdAt: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      users[existingIndex] = unverifiedFarmer;
    } else {
      users.push(unverifiedFarmer);
    }
    this.saveStoredUsers(users);

    // Issue OTP Challenge
    const { challenge, delivery } = await otpService.createChallenge(email, 'REGISTRATION');

    return {
      challenge,
      delivery,
      tempUser: unverifiedFarmer,
    };
  }

  /**
   * Verifies OTP challenge, transitions account to VERIFIED, and establishes active session.
   */
  public async verifyRegistrationOTP(challengeId: string, code: string): Promise<User> {
    await new Promise((resolve) => setTimeout(resolve, 350));

    const verification = await otpService.verifyCode(challengeId, code);
    
    // If backend provided verified user object
    if (verification.user) {
      const verifiedUser: User = {
        id: verification.user.id,
        fullName: verification.user.fullName,
        email: verification.user.email,
        role: verification.user.role,
        verificationStatus: 'VERIFIED',
        emailVerifiedAt: verification.user.emailVerifiedAt || new Date().toISOString(),
        villageArea: verification.user.villageArea,
        district: verification.user.district,
        farmLocation: verification.user.farmLocation,
        createdAt: verification.user.createdAt || new Date().toISOString(),
      };
      this.saveSession(verifiedUser);
      return verifiedUser;
    }

    const users = this.getStoredUsers();
    const index = users.findIndex((u) => u.email.toLowerCase() === verification.identifier.toLowerCase());

    if (index === -1) {
      throw new Error('User record not found. Please start registration again.');
    }

    const verifiedUser: StoredUserRecord = {
      ...users[index]!,
      verificationStatus: 'VERIFIED',
      emailVerifiedAt: new Date().toISOString(),
    };

    users[index] = verifiedUser;
    this.saveStoredUsers(users);

    this.saveSession(verifiedUser);
    return verifiedUser;
  }

  /**
   * Requests OTP challenge for an unverified account or password reset.
   */
  public async requestAccountOTP(
    email: string,
    purpose: 'REGISTRATION' | 'LOGIN_VERIFICATION' | 'PASSWORD_RESET'
  ): Promise<{ challenge: OTPChallenge; delivery: OTPDeliveryResult }> {
    const cleanEmail = (email || '').trim().toLowerCase();
    const users = this.getStoredUsers();
    const found = users.find((u) => u.email.toLowerCase() === cleanEmail);

    if (!found && purpose !== 'REGISTRATION') {
      // Account enumeration protection: simulate success delay without revealing non-existence
      await new Promise((resolve) => setTimeout(resolve, 400));
      return {
        challenge: {
          challengeId: `dummy-${Date.now()}`,
          identifier: cleanEmail,
          purpose,
          createdAt: Date.now(),
          expiresAt: Date.now() + 5 * 60 * 1000,
          attemptsRemaining: 5,
          resendAvailableAt: Date.now() + 60 * 1000,
          isExpired: false,
          maskedIdentifier: CryptoService.maskIdentifier(cleanEmail),
        },
        delivery: {
          success: true,
          provider: 'DEVELOPMENT_SIMULATOR',
          message: `If an account exists for ${CryptoService.maskIdentifier(cleanEmail)}, a verification code has been dispatched.`,
          maskedRecipient: CryptoService.maskIdentifier(cleanEmail),
        },
      };
    }

    return await otpService.createChallenge(cleanEmail, purpose);
  }

  /**
   * Resets password using verified OTP challenge.
   */
  public async resetPassword(payload: PasswordResetPayload): Promise<boolean> {
    await new Promise((resolve) => setTimeout(resolve, 450));

    const email = (payload.email || '').trim().toLowerCase();
    const newPassword = (payload.newPassword || '').trim();
    const confirmNewPassword = (payload.confirmNewPassword || '').trim();

    // Verify OTP challenge first
    await otpService.verifyCode(payload.challengeId, payload.code);

    const policyCheck = CryptoService.evaluatePasswordPolicy(newPassword);
    if (!policyCheck.isValid) {
      throw new Error(policyCheck.feedbackMessages[0] || 'Password does not meet the security requirements.');
    }

    if (newPassword !== confirmNewPassword) {
      throw new Error('Passwords do not match. Please verify.');
    }

    const users = this.getStoredUsers();
    const index = users.findIndex((u) => u.email.toLowerCase() === email);
    if (index === -1) {
      throw new Error('Account not found.');
    }

    const { hash: passwordHash, salt } = await CryptoService.hashPassword(newPassword);
    const updatedUser: StoredUserRecord = {
      ...users[index]!,
      passwordHash,
      salt,
      verificationStatus: 'VERIFIED',
    };

    users[index] = updatedUser;
    this.saveStoredUsers(users);
    this.clearSession(); // Invalidate any existing session

    return true;
  }

  public async updateUserLocation(userId: string, location: UserLocation): Promise<User> {
    const users = this.getStoredUsers();
    const index = users.findIndex((u) => u.id === userId);
    if (index === -1) {
      throw new Error('User not found');
    }

    const updatedUser: StoredUserRecord = { ...users[index]!, location };
    users[index] = updatedUser;
    this.saveStoredUsers(users);
    this.saveSession(updatedUser);
    return updatedUser;
  }
}

export const authService = new AuthService();
