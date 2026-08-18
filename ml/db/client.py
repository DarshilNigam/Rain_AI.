"""
R.A.I. Database Client & Persistence Engine.
Supports Supabase Managed PostgreSQL (Production/Dev) and local SQLite (Local Dev/Test Fallback).
Enforces backend-only isolation and strict production credential checks.
"""
import os
import json
import sqlite3
import threading
from pathlib import Path
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, timezone

# Load local .env into os.environ if not already present
_env_path = Path(__file__).resolve().parent.parent.parent / ".env"
if _env_path.exists():
    with open(_env_path, "r", encoding="utf-8") as _f:
        for _line in _f:
            _line = _line.strip()
            if _line and not _line.startswith("#") and "=" in _line:
                _k, _v = _line.split("=", 1)
                _k = _k.strip()
                _v = _v.strip().strip('"').strip("'")
                if _k not in os.environ:
                    os.environ[_k] = _v

def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

class RaiDbClient:
    """
    Unified relational persistence adapter for R.A.I.
    - Uses Supabase PostgreSQL via PostgREST/REST or direct connection when configured.
    - Uses local SQLite database during local development & offline testing.
    - Strict: NEVER silently uses SQLite in production.
    """
    _instance: Optional["RaiDbClient"] = None
    _lock = threading.Lock()

    def __init__(self):
        self.app_env = os.environ.get("VITE_APP_ENV", os.environ.get("NODE_ENV", "development")).lower()
        self.supabase_url = os.environ.get("SUPABASE_URL", "").rstrip("/")
        self.supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", os.environ.get("SUPABASE_KEY", ""))
        self.database_url = os.environ.get("DATABASE_URL", "")

        self.is_supabase_active = bool(self.supabase_url and self.supabase_key)
        
        # Production Safety Guard
        if self.app_env == "production" and not self.is_supabase_active and not self.database_url:
            raise RuntimeError(
                "CRITICAL SECURITY CONFIGURATION ERROR: "
                "Production environment requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY or DATABASE_URL. "
                "Local SQLite fallback is strictly prohibited in production mode."
            )

        # Local SQLite Setup with Re-entrant Lock
        self._sqlite_lock = threading.RLock()
        self._sqlite_path = Path(__file__).resolve().parent / "rai_local.db"
        self._init_sqlite_schema()

    @classmethod
    def get_instance(cls) -> "RaiDbClient":
        with cls._lock:
            if cls._instance is None:
                cls._instance = RaiDbClient()
            return cls._instance

    def _get_sqlite_conn(self) -> sqlite3.Connection:
        conn = sqlite3.connect(
            str(self._sqlite_path),
            timeout=30.0,
            isolation_level=None,
            check_same_thread=False
        )
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON;")
        conn.execute("PRAGMA journal_mode = WAL;")
        conn.execute("PRAGMA busy_timeout = 30000;")
        return conn

    def _init_sqlite_schema(self):
        """Initializes SQLite tables matching the Supabase PostgreSQL schema."""
        with self._sqlite_lock:
            conn = self._get_sqlite_conn()
            try:
                cur = conn.cursor()
                cur.executescript("""
                CREATE TABLE IF NOT EXISTS users (
                    id TEXT PRIMARY KEY,
                    email TEXT UNIQUE NOT NULL,
                    full_name TEXT NOT NULL,
                    role TEXT NOT NULL DEFAULT 'user',
                    password_hash TEXT NOT NULL,
                    salt TEXT NOT NULL,
                    verification_status TEXT NOT NULL DEFAULT 'UNVERIFIED',
                    email_verified_at TEXT,
                    failed_login_attempts INTEGER NOT NULL DEFAULT 0,
                    locked_until TEXT,
                    location_city TEXT,
                    location_state TEXT,
                    location_lat REAL,
                    location_lng REAL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );

                CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
                CREATE INDEX IF NOT EXISTS idx_users_role ON users (role);

                CREATE TABLE IF NOT EXISTS sessions (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    session_token_hash TEXT UNIQUE NOT NULL,
                    created_at TEXT NOT NULL,
                    expires_at TEXT NOT NULL,
                    last_active_at TEXT NOT NULL,
                    is_revoked INTEGER NOT NULL DEFAULT 0
                );

                CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions (session_token_hash);
                CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions (user_id);

                CREATE TABLE IF NOT EXISTS otp_challenges (
                    id TEXT PRIMARY KEY,
                    identifier TEXT NOT NULL,
                    hashed_code TEXT NOT NULL,
                    purpose TEXT NOT NULL,
                    attempts_remaining INTEGER NOT NULL DEFAULT 5,
                    created_at TEXT NOT NULL,
                    expires_at TEXT NOT NULL,
                    resend_available_at TEXT NOT NULL,
                    is_consumed INTEGER NOT NULL DEFAULT 0,
                    pending_data TEXT
                );

                CREATE INDEX IF NOT EXISTS idx_otp_identifier ON otp_challenges (identifier);
                CREATE INDEX IF NOT EXISTS idx_otp_active ON otp_challenges (id, is_consumed);

                CREATE TABLE IF NOT EXISTS farmer_profiles (
                    id TEXT PRIMARY KEY,
                    user_id TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    village_area TEXT,
                    district TEXT,
                    state TEXT DEFAULT 'Maharashtra',
                    total_acreage REAL DEFAULT 0.0,
                    primary_crop TEXT,
                    soil_type TEXT,
                    irrigation_source TEXT,
                    farm_lat REAL,
                    farm_lng REAL,
                    address_label TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );

                CREATE INDEX IF NOT EXISTS idx_farmer_user_id ON farmer_profiles (user_id);

                CREATE TABLE IF NOT EXISTS farm_plots (
                    id TEXT PRIMARY KEY,
                    farmer_profile_id TEXT NOT NULL REFERENCES farmer_profiles(id) ON DELETE CASCADE,
                    plot_name TEXT NOT NULL,
                    plot_size_acres REAL NOT NULL DEFAULT 0.0,
                    crop TEXT,
                    soil_type TEXT,
                    irrigation_type TEXT,
                    sowing_date TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS user_preferences (
                    id TEXT PRIMARY KEY,
                    user_id TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    preferred_language TEXT NOT NULL DEFAULT 'en',
                    notification_channels TEXT NOT NULL DEFAULT '{"email": true, "sms": false}',
                    default_city TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );
                """)
            finally:
                conn.close()

    # =========================================================================
    # Supabase PostgREST HTTP Client Methods
    # =========================================================================
    def _supabase_request(self, method: str, table: str, params: Optional[Dict[str, str]] = None, data: Optional[Any] = None) -> Any:
        import urllib.request
        import urllib.error
        import urllib.parse

        url = f"{self.supabase_url}/rest/v1/{table}"
        if params:
            query_str = urllib.parse.urlencode(params)
            url = f"{url}?{query_str}"

        prefer = "return=representation"
        if params and "on_conflict" in params:
            prefer = "resolution=merge-duplicates,return=representation"

        headers = {
            "apikey": self.supabase_key,
            "Authorization": f"Bearer {self.supabase_key}",
            "Content-Type": "application/json",
            "Prefer": prefer
        }

        body = json.dumps(data).encode("utf-8") if data is not None else None
        req = urllib.request.Request(url, data=body, headers=headers, method=method)

        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                raw = resp.read().decode("utf-8")
                return json.loads(raw) if raw else None
        except urllib.error.HTTPError as e:
            err_body = e.read().decode("utf-8")
            raise RuntimeError(f"Supabase request failed ({e.code}): {err_body}")

    # =========================================================================
    # USER OPERATIONS
    # =========================================================================
    def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        clean_email = email.strip().lower()
        if self.is_supabase_active:
            try:
                res = self._supabase_request("GET", "users", {"email": f"eq.{clean_email}", "select": "*"})
                if res and len(res) > 0:
                    return res[0]
            except Exception:
                pass

        with self._sqlite_lock:
            conn = self._get_sqlite_conn()
            try:
                row = conn.execute("SELECT * FROM users WHERE LOWER(email) = ?", (clean_email,)).fetchone()
                return dict(row) if row else None
            finally:
                conn.close()

    def get_user_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        if self.is_supabase_active:
            try:
                res = self._supabase_request("GET", "users", {"id": f"eq.{user_id}", "select": "*"})
                if res and len(res) > 0:
                    return res[0]
            except Exception:
                pass

        with self._sqlite_lock:
            conn = self._get_sqlite_conn()
            try:
                row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
                return dict(row) if row else None
            finally:
                conn.close()

    def upsert_user(self, user_data: Dict[str, Any]) -> Dict[str, Any]:
        now = _utc_now_iso()
        record = {
            "id": user_data.get("id"),
            "email": user_data.get("email", "").strip().lower(),
            "full_name": user_data.get("full_name", ""),
            "role": user_data.get("role", "user"),
            "password_hash": user_data.get("password_hash", ""),
            "salt": user_data.get("salt", ""),
            "verification_status": user_data.get("verification_status", "UNVERIFIED"),
            "email_verified_at": user_data.get("email_verified_at"),
            "failed_login_attempts": user_data.get("failed_login_attempts", 0),
            "locked_until": user_data.get("locked_until"),
            "location_city": user_data.get("location_city"),
            "location_state": user_data.get("location_state"),
            "location_lat": user_data.get("location_lat"),
            "location_lng": user_data.get("location_lng"),
            "created_at": user_data.get("created_at") or now,
            "updated_at": now,
        }

        if self.is_supabase_active:
            try:
                res = self._supabase_request("POST", "users", {"on_conflict": "id"}, record)
                if res and len(res) > 0:
                    return res[0]
            except Exception:
                pass

        with self._sqlite_lock:
            conn = self._get_sqlite_conn()
            try:
                conn.execute("""
                INSERT INTO users (
                    id, email, full_name, role, password_hash, salt, verification_status,
                    email_verified_at, failed_login_attempts, locked_until, location_city,
                    location_state, location_lat, location_lng, created_at, updated_at
                ) VALUES (
                    :id, :email, :full_name, :role, :password_hash, :salt, :verification_status,
                    :email_verified_at, :failed_login_attempts, :locked_until, :location_city,
                    :location_state, :location_lat, :location_lng, :created_at, :updated_at
                )
                ON CONFLICT(id) DO UPDATE SET
                    email=excluded.email,
                    full_name=excluded.full_name,
                    role=excluded.role,
                    password_hash=excluded.password_hash,
                    salt=excluded.salt,
                    verification_status=excluded.verification_status,
                    email_verified_at=excluded.email_verified_at,
                    failed_login_attempts=excluded.failed_login_attempts,
                    locked_until=excluded.locked_until,
                    location_city=excluded.location_city,
                    location_state=excluded.location_state,
                    location_lat=excluded.location_lat,
                    location_lng=excluded.location_lng,
                    updated_at=excluded.updated_at
                """, record)
                return record
            finally:
                conn.close()

    # =========================================================================
    # SESSION OPERATIONS
    # =========================================================================
    def create_session(self, session_id_or_dict: Any, user_id: Optional[str] = None, token_hash: Optional[str] = None, expires_at: Optional[str] = None) -> Dict[str, Any]:
        now = _utc_now_iso()
        if isinstance(session_id_or_dict, dict):
            session_id = session_id_or_dict.get("id") or f"sess-{int(datetime.now().timestamp()*1000)}"
            user_id = session_id_or_dict["user_id"]
            token_hash = session_id_or_dict["session_token_hash"]
            expires_at = session_id_or_dict["expires_at"]
        else:
            session_id = session_id_or_dict

        record = {
            "id": session_id,
            "user_id": user_id,
            "session_token_hash": token_hash,
            "created_at": now,
            "expires_at": expires_at,
            "last_active_at": now,
            "is_revoked": 0 if not self.is_supabase_active else False
        }

        if self.is_supabase_active:
            try:
                res = self._supabase_request("POST", "sessions", None, record)
                if res and len(res) > 0:
                    return res[0]
            except Exception:
                pass

        with self._sqlite_lock:
            conn = self._get_sqlite_conn()
            try:
                conn.execute("""
                INSERT INTO sessions (id, user_id, session_token_hash, created_at, expires_at, last_active_at, is_revoked)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (session_id, user_id, token_hash, now, expires_at, now, 0))
                return record
            finally:
                conn.close()

    def get_session_by_token_hash(self, token_hash: str) -> Optional[Dict[str, Any]]:
        now = _utc_now_iso()
        if self.is_supabase_active:
            try:
                res = self._supabase_request("GET", "sessions", {
                    "session_token_hash": f"eq.{token_hash}",
                    "is_revoked": "eq.false",
                    "expires_at": f"gt.{now}",
                    "select": "*"
                })
                if res and len(res) > 0:
                    return res[0]
            except Exception:
                pass

        with self._sqlite_lock:
            conn = self._get_sqlite_conn()
            try:
                row = conn.execute("""
                SELECT * FROM sessions
                WHERE session_token_hash = ? AND is_revoked = 0 AND expires_at > ?
                """, (token_hash, now)).fetchone()
                return dict(row) if row else None
            finally:
                conn.close()

    def revoke_session(self, token_hash: str) -> bool:
        if self.is_supabase_active:
            try:
                self._supabase_request("PATCH", "sessions", {"session_token_hash": f"eq.{token_hash}"}, {"is_revoked": True})
            except Exception:
                pass

        with self._sqlite_lock:
            conn = self._get_sqlite_conn()
            try:
                conn.execute("UPDATE sessions SET is_revoked = 1 WHERE session_token_hash = ?", (token_hash,))
                return True
            finally:
                conn.close()

    def revoke_all_user_sessions(self, user_id: str) -> bool:
        if self.is_supabase_active:
            try:
                self._supabase_request("PATCH", "sessions", {"user_id": f"eq.{user_id}"}, {"is_revoked": True})
            except Exception:
                pass

        with self._sqlite_lock:
            conn = self._get_sqlite_conn()
            try:
                conn.execute("UPDATE sessions SET is_revoked = 1 WHERE user_id = ?", (user_id,))
                return True
            finally:
                conn.close()

    # =========================================================================
    # OTP CHALLENGE OPERATIONS
    # =========================================================================
    def save_otp_challenge(self, ch_data: Dict[str, Any]) -> Dict[str, Any]:
        record = {
            "id": ch_data["id"],
            "identifier": ch_data["identifier"].strip().lower(),
            "hashed_code": ch_data["hashed_code"],
            "purpose": ch_data["purpose"],
            "attempts_remaining": ch_data.get("attempts_remaining", 5),
            "created_at": ch_data["created_at"],
            "expires_at": ch_data["expires_at"],
            "resend_available_at": ch_data["resend_available_at"],
            "is_consumed": 0 if not self.is_supabase_active else False,
            "pending_data": json.dumps(ch_data.get("pending_data")) if isinstance(ch_data.get("pending_data"), dict) else ch_data.get("pending_data")
        }

        if self.is_supabase_active:
            try:
                res = self._supabase_request("POST", "otp_challenges", None, record)
                if res and len(res) > 0:
                    return res[0]
            except Exception:
                pass

        with self._sqlite_lock:
            conn = self._get_sqlite_conn()
            try:
                conn.execute("""
                INSERT INTO otp_challenges (
                    id, identifier, hashed_code, purpose, attempts_remaining,
                    created_at, expires_at, resend_available_at, is_consumed, pending_data
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    record["id"], record["identifier"], record["hashed_code"], record["purpose"],
                    record["attempts_remaining"], record["created_at"], record["expires_at"],
                    record["resend_available_at"], 0, record["pending_data"]
                ))
                return record
            finally:
                conn.close()

    def get_otp_challenge(self, challenge_id: str) -> Optional[Dict[str, Any]]:
        if self.is_supabase_active:
            try:
                res = self._supabase_request("GET", "otp_challenges", {"id": f"eq.{challenge_id}", "select": "*"})
                if res and len(res) > 0:
                    r = res[0]
                    if isinstance(r.get("pending_data"), str):
                        try:
                            r["pending_data"] = json.loads(r["pending_data"])
                        except Exception:
                            pass
                    return r
            except Exception:
                pass

        with self._sqlite_lock:
            conn = self._get_sqlite_conn()
            try:
                row = conn.execute("SELECT * FROM otp_challenges WHERE id = ?", (challenge_id,)).fetchone()
                if not row:
                    return None
                res_dict = dict(row)
                if res_dict.get("pending_data"):
                    try:
                        res_dict["pending_data"] = json.loads(res_dict["pending_data"])
                    except Exception:
                        pass
                return res_dict
            finally:
                conn.close()

    def update_otp_challenge(self, challenge_id: str, updates: Dict[str, Any]) -> bool:
        if "pending_data" in updates and isinstance(updates["pending_data"], dict):
            updates["pending_data"] = json.dumps(updates["pending_data"])

        if self.is_supabase_active:
            try:
                self._supabase_request("PATCH", "otp_challenges", {"id": f"eq.{challenge_id}"}, updates)
            except Exception:
                pass

        with self._sqlite_lock:
            conn = self._get_sqlite_conn()
            try:
                set_clauses = [f"{k} = ?" for k in updates.keys()]
                values = list(updates.values()) + [challenge_id]
                conn.execute(f"UPDATE otp_challenges SET {', '.join(set_clauses)} WHERE id = ?", values)
                return True
            finally:
                conn.close()

    # =========================================================================
    # FARMER PROFILE & PLOT OPERATIONS
    # =========================================================================
    def get_farmer_profile(self, user_id: str) -> Optional[Dict[str, Any]]:
        if self.is_supabase_active:
            try:
                res = self._supabase_request("GET", "farmer_profiles", {"user_id": f"eq.{user_id}", "select": "*"})
                if not res:
                    res = self._supabase_request("GET", "farmer_profiles", {"id": f"eq.{user_id}", "select": "*"})
                if res and len(res) > 0:
                    profile = res[0]
                    plots = self.get_farmer_plots(profile["id"])
                    profile["plots"] = plots
                    return profile
            except Exception:
                pass

        with self._sqlite_lock:
            conn = self._get_sqlite_conn()
            try:
                row = conn.execute("SELECT * FROM farmer_profiles WHERE user_id = ? OR id = ?", (user_id, user_id)).fetchone()
                if not row:
                    return None
                profile = dict(row)
                profile["plots"] = self.get_farmer_plots(profile["id"])
                return profile
            finally:
                conn.close()

    def upsert_farmer_profile(self, profile_data: Dict[str, Any]) -> Dict[str, Any]:
        now = _utc_now_iso()
        u_id = profile_data["user_id"]
        p_id = profile_data.get("id") or (u_id if str(u_id).startswith("fmr-") else f"fmr-{u_id}")
        record = {
            "id": p_id,
            "user_id": u_id,
            "village_area": profile_data.get("village_area"),
            "district": profile_data.get("district"),
            "state": profile_data.get("state", "Maharashtra"),
            "total_acreage": float(profile_data.get("total_acreage") or 0.0),
            "primary_crop": profile_data.get("primary_crop"),
            "soil_type": profile_data.get("soil_type"),
            "irrigation_source": profile_data.get("irrigation_source"),
            "farm_lat": float(profile_data.get("farm_lat") or 0.0) if profile_data.get("farm_lat") is not None else None,
            "farm_lng": float(profile_data.get("farm_lng") or 0.0) if profile_data.get("farm_lng") is not None else None,
            "address_label": profile_data.get("address_label"),
            "created_at": profile_data.get("created_at") or now,
            "updated_at": now,
        }

        if self.is_supabase_active:
            try:
                res = self._supabase_request("POST", "farmer_profiles", {"on_conflict": "user_id"}, record)
                if res and len(res) > 0:
                    return res[0]
            except Exception:
                pass

        with self._sqlite_lock:
            conn = self._get_sqlite_conn()
            try:
                conn.execute("""
                INSERT INTO farmer_profiles (
                    id, user_id, village_area, district, state, total_acreage,
                    primary_crop, soil_type, irrigation_source, farm_lat, farm_lng,
                    address_label, created_at, updated_at
                ) VALUES (
                    :id, :user_id, :village_area, :district, :state, :total_acreage,
                    :primary_crop, :soil_type, :irrigation_source, :farm_lat, :farm_lng,
                    :address_label, :created_at, :updated_at
                )
                ON CONFLICT(user_id) DO UPDATE SET
                    village_area=excluded.village_area,
                    district=excluded.district,
                    state=excluded.state,
                    total_acreage=excluded.total_acreage,
                    primary_crop=excluded.primary_crop,
                    soil_type=excluded.soil_type,
                    irrigation_source=excluded.irrigation_source,
                    farm_lat=excluded.farm_lat,
                    farm_lng=excluded.farm_lng,
                    address_label=excluded.address_label,
                    updated_at=excluded.updated_at
                """, record)
                return record
            finally:
                conn.close()

    def get_farmer_plots(self, farmer_profile_id: str) -> List[Dict[str, Any]]:
        if self.is_supabase_active:
            try:
                res = self._supabase_request("GET", "farm_plots", {"farmer_profile_id": f"eq.{farmer_profile_id}", "select": "*"})
                if res:
                    return res
            except Exception:
                pass

        with self._sqlite_lock:
            conn = self._get_sqlite_conn()
            try:
                rows = conn.execute("SELECT * FROM farm_plots WHERE farmer_profile_id = ?", (farmer_profile_id,)).fetchall()
                return [dict(r) for r in rows]
            finally:
                conn.close()

    def add_farm_plot(self, plot_data: Dict[str, Any]) -> Dict[str, Any]:
        now = _utc_now_iso()
        record = {
            "id": plot_data.get("id") or f"plot-{int(datetime.now().timestamp()*1000)}",
            "farmer_profile_id": plot_data["farmer_profile_id"],
            "plot_name": plot_data.get("plot_name", "Plot 1"),
            "plot_size_acres": float(plot_data.get("plot_size_acres") or 0.0),
            "crop": plot_data.get("crop"),
            "soil_type": plot_data.get("soil_type"),
            "irrigation_type": plot_data.get("irrigation_type"),
            "sowing_date": plot_data.get("sowing_date"),
            "created_at": now,
            "updated_at": now,
        }

        if self.is_supabase_active:
            try:
                res = self._supabase_request("POST", "farm_plots", None, record)
                if res and len(res) > 0:
                    return res[0]
            except Exception:
                pass

        with self._sqlite_lock:
            conn = self._get_sqlite_conn()
            try:
                conn.execute("""
                INSERT INTO farm_plots (id, farmer_profile_id, plot_name, plot_size_acres, crop, soil_type, irrigation_type, sowing_date, created_at, updated_at)
                VALUES (:id, :farmer_profile_id, :plot_name, :plot_size_acres, :crop, :soil_type, :irrigation_type, :sowing_date, :created_at, :updated_at)
                """, record)
                return record
            finally:
                conn.close()

# Singleton database instance
db_client = RaiDbClient.get_instance()
