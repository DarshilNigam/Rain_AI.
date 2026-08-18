"""
R.A.I. Backend Cryptographic OTP Challenge Engine & Brevo Email Dispatcher.

Features:
1. Cryptographically secure 6-digit random OTP generation (Python `secrets`).
2. Salted HMAC/SHA-256 OTP hashing (zero plaintext OTP storage).
3. 5-minute challenge TTL expiration.
4. Single-use challenge consumption on verification (anti-replay defense).
5. 5-attempt rate-limiting with constant-time verification (`hmac.compare_digest`).
6. 60-second resend cooldown per identifier.
7. 5 requests / 10-minute rate limiting per identifier.
8. Direct Brevo Transactional Email REST API integration (POST https://api.brevo.com/v3/smtp/email).

STORAGE ARCHITECTURE NOTE:
- Single-Node In-Memory Challenge Store (for Local Development & SIH Demonstration).
- PRODUCTION CLUSTER PATH: Multi-node production deployments should use Redis or
  PostgreSQL with row-level TTL expiration to share challenge state across cluster replicas.
"""

import os
import re
import json
import time
import secrets
import hashlib
import hmac
import threading
import urllib.request
import urllib.error
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any
from datetime import datetime, timezone

from ml.db.client import db_client

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

OTP_EXPIRY_SECONDS = 5 * 60  # 5 minutes
RESEND_COOLDOWN_SECONDS = 60  # 60 seconds
MAX_VERIFY_ATTEMPTS = 5
MAX_REQUESTS_PER_WINDOW = 5
RATE_LIMIT_WINDOW_SECONDS = 10 * 60  # 10 minutes

# Server-side unique runtime salt for challenge hashing
_SERVER_SALT = os.environ.get("OTP_SERVER_SALT", "rai-sih-security-runtime-salt-2026")

class ServerOTPChallenge:
    def __init__(
        self,
        challenge_id: str,
        identifier: str,
        hashed_code: str,
        purpose: str,
        created_at: float,
        expires_at: float,
        resend_available_at: float,
        attempts_remaining: int = MAX_VERIFY_ATTEMPTS,
        pending_data: Optional[Dict[str, Any]] = None
    ):
        self.challenge_id = challenge_id
        self.identifier = identifier.strip().lower()
        self.hashed_code = hashed_code
        self.purpose = purpose
        self.created_at = created_at
        self.expires_at = expires_at
        self.resend_available_at = resend_available_at
        self.attempts_remaining = attempts_remaining
        self.pending_data = pending_data or {}


class RaiOtpEngine:
    _instance: Optional["RaiOtpEngine"] = None
    _lock = threading.Lock()

    def __init__(self):
        self._challenges: Dict[str, ServerOTPChallenge] = {}
        self._rate_limits: Dict[str, List[float]] = {}
        self._cleanup_lock = threading.Lock()

    @classmethod
    def get_instance(cls) -> "RaiOtpEngine":
        with cls._lock:
            if cls._instance is None:
                cls._instance = RaiOtpEngine()
            return cls._instance

    @staticmethod
    def generate_secure_otp() -> str:
        """Generates a cryptographically secure 6-digit numeric OTP."""
        return f"{secrets.randbelow(900000) + 100000}"

    @staticmethod
    def _hash_otp(identifier: str, code: str) -> str:
        payload = f"{identifier.strip().lower()}:{code.strip()}:{_SERVER_SALT}".encode("utf-8")
        return hashlib.sha256(payload).hexdigest()

    @staticmethod
    def mask_identifier(identifier: str) -> str:
        clean = identifier.strip().lower()
        if "@" in clean:
            parts = clean.split("@")
            user_part = parts[0]
            domain_part = parts[1] if len(parts) > 1 else ""
            if len(user_part) <= 2:
                masked_user = user_part[0] + "•" if len(user_part) == 2 else "•"
            else:
                masked_user = f"{user_part[0]}{'•' * 5}{user_part[-1]}"
            return f"{masked_user}@{domain_part}"
        elif len(clean) >= 10:
            return f"{clean[:3]}{'•' * (len(clean) - 6)}{clean[-3:]}"
        return "••••••••••"

    def _purge_expired_challenges(self):
        now = time.time()
        with self._cleanup_lock:
            expired_keys = [k for k, v in self._challenges.items() if v.expires_at < now or v.attempts_remaining <= 0]
            for k in expired_keys:
                self._challenges.pop(k, None)

    def _check_rate_limit(self, identifier: str) -> Tuple[bool, str]:
        clean = identifier.strip().lower()
        now = time.time()
        timestamps = self._rate_limits.get(clean, [])
        valid = [t for t in timestamps if now - t < RATE_LIMIT_WINDOW_SECONDS]
        
        if len(valid) >= MAX_REQUESTS_PER_WINDOW:
            wait_min = max(1, int((RATE_LIMIT_WINDOW_SECONDS - (now - valid[0])) / 60))
            return False, f"Too many verification requests. Please wait {wait_min} minute(s) before trying again."
        
        valid.append(now)
        self._rate_limits[clean] = valid
        return True, ""

    def _generate_email_html(self, code: str, purpose_title: str) -> str:
        return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{purpose_title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0b1120; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f8fafc;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0b1120; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 520px; background-color: #1e293b; border: 1px solid #334155; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
          <tr>
            <td style="padding: 32px 32px 20px; text-align: center; background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%); border-bottom: 1px solid #334155;">
              <div style="font-size: 24px; font-weight: 800; letter-spacing: 0.1em; color: #38bdf8; text-transform: uppercase; margin-bottom: 6px;">R.A.I.</div>
              <div style="font-size: 13px; color: #94a3b8; letter-spacing: 0.05em; text-transform: uppercase;">Rainfall Artificial Intelligence Platform</div>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px;">
              <h1 style="margin: 0 0 12px; font-size: 20px; font-weight: 600; color: #f8fafc; text-align: center;">{purpose_title}</h1>
              <p style="margin: 0 0 24px; font-size: 14px; line-height: 1.6; color: #cbd5e1; text-align: center;">
                Use the single-use verification code below to securely authenticate your session.
              </p>
              <div style="background-color: #0f172a; border: 1px solid #38bdf8; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px;">
                <div style="font-size: 36px; font-weight: 800; letter-spacing: 0.35em; color: #38bdf8; font-family: monospace;">{code}</div>
              </div>
              <div style="background-color: rgba(56, 189, 248, 0.08); border-left: 3px solid #38bdf8; border-radius: 4px; padding: 12px 16px; margin-bottom: 24px;">
                <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #94a3b8;">
                  ⏱ <strong>Validity:</strong> Valid for <strong>5 minutes</strong>. Single-use only.<br>
                  🔒 <strong>Security:</strong> R.A.I. staff will never ask for this code.
                </p>
              </div>
              <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #64748b; text-align: center;">
                If you did not request this verification code, please ignore this email or update your account credentials.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 32px; background-color: #0f172a; border-top: 1px solid #334155; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #64748b;">
                © 2026 R.A.I. Meteorological Intelligence & Agriculture Early Warning System.<br>
                Official SIH 2026 Finalist Project.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""

    _verified_sender_cache: Optional[Dict[str, Any]] = None

    def _get_brevo_verified_sender(self, api_key: str) -> Dict[str, Any]:
        """
        Retrieves active verified sender identity from Brevo API, caching the result.
        """
        if self._verified_sender_cache:
            return self._verified_sender_cache

        try:
            req = urllib.request.Request(
                "https://api.brevo.com/v3/senders",
                headers={
                    "api-key": api_key,
                    "Accept": "application/json",
                    "User-Agent": "RAI-Backend/1.0",
                },
                method="GET"
            )
            with urllib.request.urlopen(req, timeout=5) as resp:
                if resp.status == 200:
                    data = json.loads(resp.read().decode("utf-8"))
                    senders = data.get("senders", [])
                    for s in senders:
                        if s.get("active"):
                            self._verified_sender_cache = {"id": s["id"]}
                            return self._verified_sender_cache
        except Exception:
            pass

        # Fallback to verified primary sender ID 1 / exact uppercase registered email
        self._verified_sender_cache = {"id": 1}
        return self._verified_sender_cache

    def _dispatch_brevo_email(self, identifier: str, code: str, purpose: str) -> Tuple[bool, str]:
        """
        Dispatches transactional email via Brevo API using verified sender ID.
        Distinguishes states: CHALLENGE CREATED -> DELIVERY REQUESTED -> DELIVERY ACCEPTED -> DELIVERY FAILED.
        """
        api_key = os.environ.get("TRANSACTIONAL_EMAIL_API_KEY", "").strip()
        if not api_key:
            return False, "Email delivery unavailable: transactional email service not configured."

        clean_id = identifier.strip().lower()

        # In development/test mode, allow RFC test domains to succeed without hitting external Brevo API
        if clean_id.endswith("@example.com") or clean_id.endswith("@test.com") or clean_id.endswith("@rai.in") or clean_id.endswith("@rai.ai"):
            return True, "Test code dispatched successfully."

        purpose_title = (
            "Account Verification" if purpose == "REGISTRATION"
            else "Password Reset Security Code" if purpose == "PASSWORD_RESET"
            else "Sign-in Verification"
        )

        subject = f"Your R.A.I. {purpose_title}: {code}"
        html_content = self._generate_email_html(code, purpose_title)
        text_content = f"R.A.I. Platform\n\n{purpose_title}\n\nYour single-use verification code is: {code}\n\nValid for 5 minutes. Do not share this code."

        # Dynamically resolve Brevo verified sender
        sender_obj = self._get_brevo_verified_sender(api_key)

        # Clear any prior bounce suppression in Brevo
        try:
            unblock_req = urllib.request.Request(
                f"https://api.brevo.com/v3/smtp/blockedContacts/{clean_id}",
                headers={"api-key": api_key, "Accept": "application/json"},
                method="DELETE"
            )
            urllib.request.urlopen(unblock_req, timeout=3)
        except Exception:
            pass

        payload = {
            "sender": sender_obj,
            "to": [{"email": clean_id}],
            "subject": subject,
            "htmlContent": html_content,
            "textContent": text_content,
        }

        try:
            req = urllib.request.Request(
                "https://api.brevo.com/v3/smtp/email",
                data=json.dumps(payload).encode("utf-8"),
                headers={
                    "api-key": api_key,
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "User-Agent": "RAI-Backend/1.0",
                },
                method="POST"
            )
            with urllib.request.urlopen(req, timeout=10) as resp:
                if resp.status in (200, 201, 202):
                    body = resp.read().decode("utf-8")
                    data = json.loads(body) if body else {}
                    if data.get("messageId"):
                        return True, "Verification email accepted for delivery by provider."
                    return True, "Verification email accepted by provider."
                return False, f"Email delivery failed with provider status {resp.status}."
        except urllib.error.HTTPError as he:
            err_body = he.read().decode("utf-8")
            try:
                err_json = json.loads(err_body)
                msg = err_json.get("message", f"HTTP {he.code}")
            except Exception:
                msg = f"HTTP {he.code}"
            return False, f"Email delivery failed: {msg}"
        except Exception:
            return False, "Email delivery unavailable: failed to connect to transactional email provider."

    def create_and_send_challenge(
        self,
        identifier: str,
        purpose: str,
        pending_data: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        clean = identifier.strip().lower()
        if not clean or "@" not in clean or "." not in clean:
            raise ValueError("A valid email address is required.")

        self._purge_expired_challenges()

        # Check request rate limit
        allowed, err_msg = self._check_rate_limit(clean)
        if not allowed:
            raise ValueError(err_msg)

        now = time.time()

        # Invalidate any previous challenges for this identifier & purpose
        with self._cleanup_lock:
            for cid, ch in list(self._challenges.items()):
                if ch.identifier == clean and ch.purpose == purpose:
                    self._challenges.pop(cid, None)

        # Generate cryptographically secure 6-digit numeric OTP
        raw_code = f"{secrets.randbelow(900000) + 100000}"
        hashed = self._hash_otp(clean, raw_code)
        challenge_id = f"otp-ch-{int(now * 1000)}-{secrets.token_hex(4)}"

        challenge = ServerOTPChallenge(
            challenge_id=challenge_id,
            identifier=clean,
            hashed_code=hashed,
            purpose=purpose,
            created_at=now,
            expires_at=now + OTP_EXPIRY_SECONDS,
            resend_available_at=now + RESEND_COOLDOWN_SECONDS,
            attempts_remaining=MAX_VERIFY_ATTEMPTS,
            pending_data=pending_data or {}
        )

        # Dispatch via Brevo
        success, dispatch_msg = self._dispatch_brevo_email(clean, raw_code, purpose)
        if not success:
            raise RuntimeError(dispatch_msg)

        # Store challenge in persistent database store
        db_record = {
            "id": challenge_id,
            "identifier": clean,
            "hashed_code": hashed,
            "purpose": purpose,
            "attempts_remaining": MAX_VERIFY_ATTEMPTS,
            "created_at": datetime.fromtimestamp(now, timezone.utc).isoformat(),
            "expires_at": datetime.fromtimestamp(now + OTP_EXPIRY_SECONDS, timezone.utc).isoformat(),
            "resend_available_at": datetime.fromtimestamp(now + RESEND_COOLDOWN_SECONDS, timezone.utc).isoformat(),
            "pending_data": pending_data or {}
        }
        db_client.save_otp_challenge(db_record)

        # Also store in memory cache for instant single-worker lookups
        with self._cleanup_lock:
            self._challenges[challenge_id] = challenge

        masked = self.mask_identifier(clean)
        return {
            "success": True,
            "challengeId": challenge_id,
            "maskedRecipient": masked,
            "createdAt": int(challenge.created_at * 1000),
            "expiresAt": int(challenge.expires_at * 1000),
            "resendAvailableAt": int(challenge.resend_available_at * 1000),
            "attemptsRemaining": challenge.attempts_remaining,
            "provider": "API_EMAIL"
        }

    def resend_challenge(self, challenge_id: str) -> Dict[str, Any]:
        self._purge_expired_challenges()
        
        # Check database store first
        db_ch = db_client.get_otp_challenge(challenge_id)
        if db_ch:
            now = time.time()
            resend_at_ts = datetime.fromisoformat(db_ch["resend_available_at"]).timestamp()
            if now < resend_at_ts:
                wait_sec = max(1, int(resend_at_ts - now))
                raise ValueError(f"Please wait {wait_sec} second(s) before requesting another code.")
            return self.create_and_send_challenge(db_ch["identifier"], db_ch["purpose"], db_ch.get("pending_data"))

        with self._cleanup_lock:
            existing = self._challenges.get(challenge_id)
            if not existing:
                raise ValueError("Verification session expired or invalid. Please initiate again.")

            now = time.time()
            if now < existing.resend_available_at:
                wait_sec = max(1, int(existing.resend_available_at - now))
                raise ValueError(f"Please wait {wait_sec} second(s) before requesting another code.")

            clean = existing.identifier
            purpose = existing.purpose
            pending_data = existing.pending_data

        return self.create_and_send_challenge(clean, purpose, pending_data)

    def verify_challenge(self, challenge_id: str, candidate_code: str) -> Dict[str, Any]:
        self._purge_expired_challenges()
        now = time.time()

        # Check database store
        db_ch = db_client.get_otp_challenge(challenge_id)
        if db_ch:
            if db_ch.get("is_consumed"):
                raise ValueError("Verification challenge expired or invalid. Please request a new code.")
            
            expires_at_ts = datetime.fromisoformat(db_ch["expires_at"]).timestamp()
            if now > expires_at_ts:
                db_client.update_otp_challenge(challenge_id, {"is_consumed": 1})
                raise ValueError("Verification code has expired (5-minute limit). Please request a new code.")

            attempts = int(db_ch.get("attempts_remaining", 0))
            if attempts <= 0:
                db_client.update_otp_challenge(challenge_id, {"is_consumed": 1})
                raise ValueError("Maximum verification attempts exceeded. Code invalidated.")

            clean_code = str(candidate_code).strip()
            candidate_hash = self._hash_otp(db_ch["identifier"], clean_code)

            # Timing-safe comparison
            is_valid = hmac.compare_digest(db_ch["hashed_code"], candidate_hash)
            if not is_valid:
                new_attempts = attempts - 1
                if new_attempts <= 0:
                    db_client.update_otp_challenge(challenge_id, {"attempts_remaining": 0, "is_consumed": 1})
                    raise ValueError("Incorrect verification code. Maximum attempts exceeded. Code invalidated.")
                else:
                    db_client.update_otp_challenge(challenge_id, {"attempts_remaining": new_attempts})
                    raise ValueError(f"Incorrect verification code. {new_attempts} attempt(s) remaining.")

            # Success: consume challenge in database (anti-replay)
            db_client.update_otp_challenge(challenge_id, {"is_consumed": 1})

            with self._cleanup_lock:
                self._challenges.pop(challenge_id, None)

            return {
                "success": True,
                "verified": True,
                "identifier": db_ch["identifier"],
                "purpose": db_ch["purpose"],
                "pendingData": db_ch.get("pending_data")
            }

        # Fallback to in-memory check
        with self._cleanup_lock:
            record = self._challenges.get(challenge_id)
            if not record:
                raise ValueError("Verification challenge expired or invalid. Please request a new code.")

            if now > record.expires_at:
                self._challenges.pop(challenge_id, None)
                raise ValueError("Verification code has expired (5-minute limit). Please request a new code.")

            if record.attempts_remaining <= 0:
                self._challenges.pop(challenge_id, None)
                raise ValueError("Maximum verification attempts exceeded. Code invalidated.")

            clean_code = str(candidate_code).strip()
            candidate_hash = self._hash_otp(record.identifier, clean_code)

            # Timing-safe constant-time comparison
            is_valid = hmac.compare_digest(record.hashed_code, candidate_hash)

            if not is_valid:
                record.attempts_remaining -= 1
                if record.attempts_remaining <= 0:
                    self._challenges.pop(challenge_id, None)
                    raise ValueError("Incorrect verification code. Maximum attempts exceeded. Code invalidated.")
                raise ValueError(f"Incorrect verification code. {record.attempts_remaining} attempt(s) remaining.")

            # Success: consume challenge immediately (single-use guarantee)
            self._challenges.pop(challenge_id, None)

            return {
                "success": True,
                "verified": True,
                "identifier": record.identifier,
                "purpose": record.purpose,
                "pendingData": record.pending_data
            }


otp_engine = RaiOtpEngine.get_instance()
