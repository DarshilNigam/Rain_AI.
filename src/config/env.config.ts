/**
 * R.A.I. Centralized Environment & Production Configuration.
 *
 * Provides safe defaults, dynamic port resolution, and runtime environment detection.
 * Never leaks server credentials or stack traces to client interfaces.
 */

export interface AppConfig {
  readonly appTitle: string;
  readonly appEnv: 'development' | 'staging' | 'production' | 'test';
  readonly appVersion: string;
  readonly apiBaseUrl: string;
  readonly otpProvider: 'AUTO' | 'API_EMAIL' | 'SMTP' | 'SMS' | 'DEVELOPMENT_SIMULATOR';
  readonly isProduction: boolean;
  readonly isDevelopment: boolean;
  readonly sessionDurationMs: number;
}

// In Node/test runtime, ensure local .env variables are populated
if (typeof process !== 'undefined' && process.env && !process.env.VITE_OTP_PROVIDER) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fs = require('fs');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const path = require('path');
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      content.split('\n').forEach((line: string) => {
        const t = line.trim();
        if (t && !t.startsWith('#') && t.includes('=')) {
          const idx = t.indexOf('=');
          const k = t.substring(0, idx).trim();
          const v = t.substring(idx + 1).trim().replace(/^["']|["']$/g, '');
          if (process.env[k] === undefined) {
            process.env[k] = v;
          }
        }
      });
    }
  } catch {
    // ignore in browser or restricted environments
  }
}

const getEnvVar = (key: string, defaultValue: string): string => {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    const val = import.meta.env[key];
    if (val !== undefined && val !== '') {
      return String(val);
    }
  }
  if (typeof process !== 'undefined' && process.env) {
    const val = process.env[key];
    if (val !== undefined && val !== '') {
      return String(val);
    }
  }
  return defaultValue;
};

const appEnv = (getEnvVar('VITE_APP_ENV', getEnvVar('NODE_ENV', 'development')).toLowerCase()) as AppConfig['appEnv'];
const isProd = appEnv === 'production';
const isDev = appEnv === 'development' || appEnv === 'test';

const resolveApiBaseUrl = (): string => {
  const envUrl = getEnvVar('VITE_API_BASE_URL', '');
  if (envUrl && envUrl.startsWith('http')) {
    return envUrl.replace(/\/+$/, '');
  }
  if (envUrl && envUrl.startsWith('/')) {
    return envUrl.replace(/\/+$/, '');
  }
  // In development browser, connect to proxy /api or backend on 127.0.0.1:8000
  if (typeof window !== 'undefined' && window.location) {
    // If running on dev server (localhost:3000 / localhost:5173), relative /api is proxied by Vite
    if (window.location.port === '3000' || window.location.port === '5173') {
      return '/api';
    }
    const host = window.location.hostname || '127.0.0.1';
    return `http://${host}:8000/api`;
  }
  return 'http://127.0.0.1:8000/api';
};

export const APP_CONFIG: AppConfig = {
  appTitle: getEnvVar('VITE_APP_TITLE', 'R.A.I. — Rainfall Artificial Intelligence Platform'),
  appEnv: appEnv,
  appVersion: getEnvVar('VITE_APP_VERSION', '1.0.0-sih-prod'),
  apiBaseUrl: resolveApiBaseUrl(),
  otpProvider: (getEnvVar('VITE_OTP_PROVIDER', getEnvVar('OTP_PROVIDER', 'AUTO')).toUpperCase() as AppConfig['otpProvider']) || 'AUTO',
  isProduction: isProd,
  isDevelopment: isDev,
  sessionDurationMs: 24 * 60 * 60 * 1000, // 24-hour rolling session
};

/**
 * Resilient API fetch wrapper with automated proxy/direct fallback.
 * Prevents "Failed to fetch" on cross-origin / IPv6 localhost mismatches.
 */
export async function apiFetch(endpoint: string, init?: RequestInit): Promise<Response> {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const base = (APP_CONFIG.apiBaseUrl || '/api').replace(/\/+$/, '');
  const primaryUrl = `${base}${cleanEndpoint}`;

  // Fallback URL: if primary was relative (/api), try direct http://127.0.0.1:8000/api; if direct, try /api
  const isRelative = base.startsWith('/');
  const fallbackBase = isRelative ? 'http://127.0.0.1:8000/api' : '/api';
  const fallbackUrl = `${fallbackBase}${cleanEndpoint}`;

  try {
    const resp = await fetch(primaryUrl, init);
    return resp;
  } catch (err: unknown) {
    if (typeof window !== 'undefined') {
      try {
        const fallbackResp = await fetch(fallbackUrl, init);
        return fallbackResp;
      } catch {
        // rethrow original error
      }
    }
    throw err;
  }
}

/**
 * Sanitizes and formats error messages safely for production end-users.
 * In production mode, internal database/network/file stack traces are masked.
 */
export function getSafeErrorMessage(error: unknown, fallbackMessage = 'An unexpected error occurred. Please try again.'): string {
  if (!error) return fallbackMessage;

  if (typeof error === 'string') {
    return error.length > 250 ? fallbackMessage : error;
  }

  if (error instanceof Error) {
    const msg = error.message || '';
    // Mask sensitive server / syntax / stack trace keywords in production
    if (APP_CONFIG.isProduction) {
      if (
        msg.includes('SQL') ||
        msg.includes('stack') ||
        msg.includes('ECONNREFUSED') ||
        msg.includes('ETIMEDOUT') ||
        msg.includes('TypeError') ||
        msg.includes('SyntaxError') ||
        msg.includes('localStorage')
      ) {
        return fallbackMessage;
      }
    }
    return msg || fallbackMessage;
  }

  return fallbackMessage;
}
