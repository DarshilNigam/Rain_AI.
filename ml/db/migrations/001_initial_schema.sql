-- =============================================================================
-- R.A.I. (Rainfall Artificial Intelligence Platform)
-- Supabase Managed PostgreSQL Database Schema - Initial Migration (001)
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'farmer', 'official')),
    password_hash TEXT NOT NULL,
    salt TEXT NOT NULL,
    verification_status TEXT NOT NULL DEFAULT 'UNVERIFIED' CHECK (verification_status IN ('UNVERIFIED', 'VERIFIED')),
    email_verified_at TIMESTAMPTZ,
    failed_login_attempts INTEGER NOT NULL DEFAULT 0,
    locked_until TIMESTAMPTZ,
    location_city TEXT,
    location_state TEXT,
    location_lat DOUBLE PRECISION,
    location_lng DOUBLE PRECISION,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for users
CREATE INDEX IF NOT EXISTS idx_users_email ON users (LOWER(email));
CREATE INDEX IF NOT EXISTS idx_users_role ON users (role);
CREATE INDEX IF NOT EXISTS idx_users_verification_status ON users (verification_status);

-- 2. SESSIONS TABLE
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token_hash TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_revoked BOOLEAN NOT NULL DEFAULT FALSE
);

-- Indexes for sessions
CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions (session_token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions (expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_active ON sessions (user_id, is_revoked, expires_at);

-- 3. OTP CHALLENGES TABLE
CREATE TABLE IF NOT EXISTS otp_challenges (
    id TEXT PRIMARY KEY,
    identifier TEXT NOT NULL,
    hashed_code TEXT NOT NULL,
    purpose TEXT NOT NULL CHECK (purpose IN ('REGISTRATION', 'LOGIN_VERIFICATION', 'PASSWORD_RESET')),
    attempts_remaining INTEGER NOT NULL DEFAULT 5,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    resend_available_at TIMESTAMPTZ NOT NULL,
    is_consumed BOOLEAN NOT NULL DEFAULT FALSE,
    pending_data JSONB
);

-- Indexes for OTP challenges
CREATE INDEX IF NOT EXISTS idx_otp_identifier ON otp_challenges (LOWER(identifier));
CREATE INDEX IF NOT EXISTS idx_otp_active ON otp_challenges (id, is_consumed, expires_at);
CREATE INDEX IF NOT EXISTS idx_otp_expires_at ON otp_challenges (expires_at);

-- 4. FARMER PROFILES TABLE (Flexible & Nullable for Optional Attributes)
CREATE TABLE IF NOT EXISTS farmer_profiles (
    id TEXT PRIMARY KEY,
    user_id TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    village_area TEXT,
    district TEXT,
    state TEXT DEFAULT 'Maharashtra',
    total_acreage DOUBLE PRECISION DEFAULT 0.0,
    primary_crop TEXT,
    soil_type TEXT,
    irrigation_source TEXT,
    farm_lat DOUBLE PRECISION,
    farm_lng DOUBLE PRECISION,
    address_label TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for farmer profiles
CREATE INDEX IF NOT EXISTS idx_farmer_user_id ON farmer_profiles (user_id);
CREATE INDEX IF NOT EXISTS idx_farmer_district ON farmer_profiles (district);
CREATE INDEX IF NOT EXISTS idx_farmer_primary_crop ON farmer_profiles (primary_crop);

-- 5. FARM PLOTS TABLE
CREATE TABLE IF NOT EXISTS farm_plots (
    id TEXT PRIMARY KEY,
    farmer_profile_id TEXT NOT NULL REFERENCES farmer_profiles(id) ON DELETE CASCADE,
    plot_name TEXT NOT NULL,
    plot_size_acres DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    crop TEXT,
    soil_type TEXT,
    irrigation_type TEXT,
    sowing_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for farm plots
CREATE INDEX IF NOT EXISTS idx_plots_farmer_id ON farm_plots (farmer_profile_id);

-- 6. USER PREFERENCES TABLE
CREATE TABLE IF NOT EXISTS user_preferences (
    id TEXT PRIMARY KEY,
    user_id TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    preferred_language TEXT NOT NULL DEFAULT 'en',
    notification_channels JSONB NOT NULL DEFAULT '{"email": true, "sms": false}',
    default_city TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_preferences_user_id ON user_preferences (user_id);

-- Trigger function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_farmer_profiles_updated_at ON farmer_profiles;
CREATE TRIGGER trg_farmer_profiles_updated_at
BEFORE UPDATE ON farmer_profiles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_farm_plots_updated_at ON farm_plots;
CREATE TRIGGER trg_farm_plots_updated_at
BEFORE UPDATE ON farm_plots
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_user_preferences_updated_at ON user_preferences;
CREATE TRIGGER trg_user_preferences_updated_at
BEFORE UPDATE ON user_preferences
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- Row Level Security (RLS) & Backend Service Role Privileges
-- =============================================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE otp_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE farmer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE farm_plots ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Grant explicit CRUD permissions to service_role on public schema
GRANT USAGE ON SCHEMA public TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO service_role;

