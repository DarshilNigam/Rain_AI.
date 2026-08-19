"""
R.A.I. SIH Heavy Rainfall Prediction & Explainable AI REST Server.
Exposes standard operational prediction endpoints, TreeSHAP attributions,
model threshold analysis, multi-horizon metadata, and warning telemetry.
"""
from fastapi import FastAPI, Query, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
import uvicorn
import json
import os

from pathlib import Path

# Load local .env into os.environ if not already present
_env_path = Path(__file__).resolve().parent.parent / ".env"
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

import hashlib
import secrets
from datetime import datetime, timezone, timedelta

from ml.configs.config import MODELS_DIR
from ml.inference.service import RaiInferenceService
from ml.pipelines.multi_horizon import get_multi_horizon_status
from ml.auth.otp_engine import otp_engine
from ml.db.client import db_client
from ml.news.service import news_service

# Password & Token Cryptographic Helpers
_AUTH_PEPPER = os.environ.get("AUTH_SERVER_PEPPER", "rai-sih-auth-pepper-2026")

def _hash_password(password: str, salt: str) -> str:
    payload = f"{salt}:{password.strip()}:{_AUTH_PEPPER}".encode("utf-8")
    return hashlib.sha256(payload).hexdigest()

def _hash_token(token: str) -> str:
    return hashlib.sha256(token.strip().encode("utf-8")).hexdigest()

def _now_utc() -> datetime:
    return datetime.now(timezone.utc)

app = FastAPI(
    title="R.A.I. SIH Rainfall Intelligence & Operational Warning Server",
    description="Real-Time Heavy Rainfall Risk Prediction, Validation-Tuned Operational Thresholds, and TreeSHAP Explainable AI Service",
    version="1.0.0"
)

# Environment-configurable CORS
def get_allowed_origins() -> List[str]:
    raw = os.environ.get(
        "ALLOWED_ORIGINS",
        "http://localhost:3000,http://localhost:5173,http://127.0.0.1:3000,http://127.0.0.1:5173,https://rainain.in,https://www.rainain.in"
    )
    return [origin.strip() for origin in raw.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_allowed_origins(),
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:[0-9]+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Defensive Security Headers Middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response: Response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "geolocation=(self), microphone=()"
    return response

class PredictionRequest(BaseModel):
    latitude: float = Field(..., ge=-90.0, le=90.0, description="Latitude coordinate (-90 to 90)")
    longitude: float = Field(..., ge=-180.0, le=180.0, description="Longitude coordinate (-180 to 180)")
    city: Optional[str] = Field("Target Area", max_length=100, description="Location name")
    horizonHours: Optional[int] = Field(24, ge=1, le=168, description="Forecast horizon in hours (1-168)")

class InitiateRegistrationRequest(BaseModel):
    fullName: str = Field(..., min_length=2, max_length=150)
    email: str = Field(..., max_length=255)
    password: str = Field(..., min_length=12, max_length=128)
    role: Optional[str] = Field("user")
    
    # Citizen location fields (optional)
    locationCity: Optional[str] = Field(None)
    locationState: Optional[str] = Field(None)
    locationLat: Optional[float] = Field(None)
    locationLng: Optional[float] = Field(None)
    
    # Farmer specific fields (optional / nullable)
    villageArea: Optional[str] = Field(None)
    district: Optional[str] = Field(None)
    state: Optional[str] = Field("Maharashtra")
    totalAcreage: Optional[float] = Field(0.0)
    primaryCrop: Optional[str] = Field(None)
    soilType: Optional[str] = Field(None)
    irrigationSource: Optional[str] = Field(None)
    farmLat: Optional[float] = Field(None)
    farmLng: Optional[float] = Field(None)
    addressLabel: Optional[str] = Field(None)

class RegisterUserRequest(InitiateRegistrationRequest):
    pass

class RegisterFarmerRequest(InitiateRegistrationRequest):
    pass

class LoginRequest(BaseModel):
    email: str = Field(..., max_length=255)
    password: str = Field(..., min_length=1)

class PasswordResetRequest(BaseModel):
    email: str = Field(..., max_length=255)
    challengeId: str = Field(..., min_length=10, max_length=100)
    code: str = Field(..., min_length=6, max_length=6)
    newPassword: str = Field(..., min_length=12, max_length=128)

class FarmerProfileUpdateRequest(BaseModel):
    villageArea: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    totalAcreage: Optional[float] = None
    primaryCrop: Optional[str] = None
    soilType: Optional[str] = None
    irrigationSource: Optional[str] = None
    farmLat: Optional[float] = None
    farmLng: Optional[float] = None
    addressLabel: Optional[str] = None

class AddPlotRequest(BaseModel):
    plotName: str = Field(..., min_length=1, max_length=100)
    plotSizeAcres: float = Field(..., ge=0.0)
    crop: Optional[str] = None
    soilType: Optional[str] = None
    irrigationType: Optional[str] = None
    sowingDate: Optional[str] = None

class LocationUpdateRequest(BaseModel):
    city: str = Field(..., min_length=1, max_length=100)
    region: Optional[str] = Field("Uttar Pradesh", max_length=100)
    lat: float
    lng: float
    formattedAddress: Optional[str] = None

# Helper to verify authenticated session from Bearer token header
def _get_authenticated_user_record(request: Request) -> Dict[str, Any]:
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authentication token required.")
    
    token = auth_header[7:].strip()
    token_hash = _hash_token(token)
    session = db_client.get_session_by_token_hash(token_hash)
    if not session:
        raise HTTPException(status_code=401, detail="Session expired or invalid. Please log in again.")
    
    user = db_client.get_user_by_id(session["user_id"])
    if not user:
        raise HTTPException(status_code=401, detail="User account not found.")
    
    return user

# =============================================================================
# Authentication & Transactional OTP Endpoints (Supabase PostgreSQL Backed)
# =============================================================================
@app.post("/api/auth/register/initiate")
@app.post("/api/v1/auth/register/initiate")
@app.post("/auth/register/initiate")
@app.post("/api/auth/register/user")
@app.post("/api/v1/auth/register/user")
@app.post("/auth/register/user")
@app.post("/api/auth/register/farmer")
@app.post("/api/v1/auth/register/farmer")
@app.post("/auth/register/farmer")
def initiate_registration_endpoint(req: InitiateRegistrationRequest, request: Request):
    """
    Authoritative Registration Endpoint for R.A.I.
    Persists unverified user (+ farmer profile if role is 'farmer') into Supabase PostgreSQL,
    generates cryptographically secure OTP challenge, and dispatches real Brevo transactional email.
    """
    clean_email = req.email.strip().lower()
    existing = db_client.get_user_by_email(clean_email)
    if existing and existing.get("verification_status") == "VERIFIED":
        raise HTTPException(status_code=409, detail="An account with this email already exists. Please log in.")
    
    salt = secrets.token_hex(16)
    pwd_hash = _hash_password(req.password, salt)
    is_farmer = (req.role == "farmer") or (req.role is None and (req.villageArea is not None or req.farmLat is not None)) or request.url.path.endswith("/farmer")
    role = "farmer" if is_farmer else "user"
    prefix = "fmr" if role == "farmer" else "usr"
    user_id = existing.get("id") if existing else f"{prefix}-{int(_now_utc().timestamp()*1000)}-{secrets.token_hex(3)}"
    
    city = req.villageArea if role == "farmer" else req.locationCity
    state = req.state if role == "farmer" else req.locationState
    lat = req.farmLat if role == "farmer" else req.locationLat
    lng = req.farmLng if role == "farmer" else req.locationLng
    
    user_data = {
        "id": user_id,
        "email": clean_email,
        "full_name": req.fullName.strip(),
        "role": role,
        "password_hash": pwd_hash,
        "salt": salt,
        "verification_status": "UNVERIFIED",
        "location_city": city,
        "location_state": state or "Maharashtra",
        "location_lat": lat,
        "location_lng": lng,
    }
    saved_user = db_client.upsert_user(user_data)
    
    if role == "farmer":
        farmer_profile_data = {
            "id": user_id,
            "user_id": user_id,
            "village_area": req.villageArea,
            "district": req.district,
            "state": req.state or "Maharashtra",
            "total_acreage": req.totalAcreage or 0.0,
            "primary_crop": req.primaryCrop,
            "soil_type": req.soilType,
            "irrigation_source": req.irrigationSource,
            "farm_lat": req.farmLat,
            "farm_lng": req.farmLng,
            "address_label": req.addressLabel,
        }
        db_client.upsert_farmer_profile(farmer_profile_data)
    
    # Issue OTP Challenge
    try:
        challenge = otp_engine.create_and_send_challenge(clean_email, "REGISTRATION", {"userId": user_id, "role": role})
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except RuntimeError as re:
        raise HTTPException(status_code=503, detail=str(re))
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to dispatch verification code. Please try again.")
    
    return {
        "success": True,
        "user": {
            "id": saved_user["id"],
            "email": saved_user["email"],
            "fullName": saved_user["full_name"],
            "role": saved_user["role"],
            "verificationStatus": saved_user["verification_status"],
        },
        "challenge": {
            "challengeId": challenge["challengeId"],
            "maskedRecipient": challenge["maskedRecipient"],
            "expiresAt": challenge["expiresAt"],
            "attemptsRemaining": challenge["attemptsRemaining"]
        },
    }

def _format_client_user(user: Dict[str, Any], profile: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    city = user.get("location_city") or (profile.get("village_area") if profile else None) or "Kanpur"
    region = user.get("location_state") or (profile.get("district") if profile else None) or "Uttar Pradesh"
    lat = float(profile.get("farm_lat")) if (profile and profile.get("farm_lat") is not None) else (float(user.get("location_lat")) if user.get("location_lat") is not None else 26.4499)
    lng = float(profile.get("farm_lng")) if (profile and profile.get("farm_lng") is not None) else (float(user.get("location_lng")) if user.get("location_lng") is not None else 80.3319)
    
    return {
        "id": user["id"],
        "email": user["email"],
        "fullName": user["full_name"],
        "role": user["role"],
        "verificationStatus": user.get("verification_status", "VERIFIED"),
        "emailVerifiedAt": user.get("email_verified_at"),
        "villageArea": profile.get("village_area") if profile else user.get("location_city"),
        "district": profile.get("district") if profile else user.get("location_state"),
        "locationCity": city,
        "locationState": region,
        "locationLat": lat,
        "locationLng": lng,
        "location": {
            "city": city,
            "region": region,
            "lat": lat,
            "lng": lng,
            "country": "India",
            "formattedAddress": f"{city}, {region}, India",
        },
        "farmLocation": {
            "lat": profile.get("farm_lat"),
            "lng": profile.get("farm_lng"),
            "addressLabel": profile.get("address_label"),
        } if profile and profile.get("farm_lat") is not None else None
    }

@app.post("/api/auth/login")
@app.post("/api/v1/auth/login")
@app.post("/auth/login")
def login_endpoint(req: LoginRequest):
    """
    Authenticates user against Supabase database, enforces 15-minute brute-force lockout,
    rotates session token, and establishes persistent session.
    """
    clean_email = req.email.strip().lower()
    user = db_client.get_user_by_email(clean_email)
    now = _now_utc()
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    
    # Check 15-minute lockout
    if user.get("locked_until"):
        try:
            locked_until_dt = datetime.fromisoformat(user["locked_until"])
            if now < locked_until_dt:
                wait_mins = max(1, int((locked_until_dt - now).total_seconds() / 60))
                raise HTTPException(
                    status_code=423,
                    detail=f"Account locked due to consecutive failed attempts. Try again in {wait_mins} minute(s)."
                )
        except (ValueError, TypeError):
            pass
    
    # Verify password hash
    calc_hash = _hash_password(req.password, user["salt"])
    if calc_hash != user["password_hash"]:
        failed = int(user.get("failed_login_attempts", 0)) + 1
        updates = {"failed_login_attempts": failed}
        if failed >= 5:
            updates["locked_until"] = (now + timedelta(minutes=15)).isoformat()
        db_client.upsert_user({**user, **updates})
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    
    # Check verification status
    if user.get("verification_status") != "VERIFIED":
        raise HTTPException(
            status_code=403,
            detail={"error": "UnverifiedAccountError", "email": clean_email, "message": "Your account requires email verification before access."}
        )
    
    # Reset failed attempts on success
    db_client.upsert_user({**user, "failed_login_attempts": 0, "locked_until": None})
    
    # Create persistent session with cryptographic token rotation
    raw_token = secrets.token_hex(32)
    token_hash = _hash_token(raw_token)
    session_id = f"sess-{int(now.timestamp()*1000)}-{secrets.token_hex(4)}"
    expires_at = (now + timedelta(hours=24)).isoformat()
    db_client.create_session(session_id, user["id"], token_hash, expires_at)
    
    # Format client-safe user model
    profile = db_client.get_farmer_profile(user["id"]) if user["role"] == "farmer" else None
    
    return {
        "success": True,
        "sessionToken": raw_token,
        "expiresAt": expires_at,
        "user": _format_client_user(user, profile)
    }

@app.post("/api/auth/logout")
@app.post("/api/v1/auth/logout")
@app.post("/auth/logout")
def logout_endpoint(request: Request):
    """
    Revokes the active session token in Supabase database.
    """
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header[7:].strip()
        token_hash = _hash_token(token)
        db_client.revoke_session(token_hash)
    return {"success": True, "message": "Logged out successfully."}

@app.get("/api/auth/session")
@app.get("/api/v1/auth/session")
@app.get("/auth/session")
def get_session_endpoint(request: Request):
    """
    Validates Bearer session token and returns active user record from database.
    """
    user = _get_authenticated_user_record(request)
    profile = db_client.get_farmer_profile(user["id"]) if user["role"] == "farmer" else None
    return {
        "success": True,
        "user": _format_client_user(user, profile)
    }

@app.post("/api/user/location")
@app.post("/api/v1/user/location")
@app.put("/api/user/location")
def update_user_location_endpoint(req: LocationUpdateRequest, request: Request):
    """
    Persists updated location preferences for the authenticated user in Supabase.
    """
    user = _get_authenticated_user_record(request)
    updated = {
        **user,
        "location_city": req.city.strip(),
        "location_state": (req.region or "Uttar Pradesh").strip(),
        "location_lat": req.lat,
        "location_lng": req.lng,
    }
    saved = db_client.upsert_user(updated)
    profile = db_client.get_farmer_profile(user["id"]) if user["role"] == "farmer" else None
    return {"success": True, "user": _format_client_user(saved, profile)}

@app.get("/api/news/weather")
@app.get("/api/v1/news/weather")
@app.get("/news/weather")
def get_weather_news_endpoint(
    city: str = Query("Kanpur", description="City name for localized weather headlines"),
    state: str = Query("Uttar Pradesh", description="State or province name"),
    limit: int = Query(5, ge=1, le=20, description="Max news articles to return")
):
    """
    Retrieves real-time localized rainfall, flood, monsoon, and weather headlines
    with resilient caching and deduplication.
    """
    articles = news_service.get_weather_news(city=city, state=state, limit=limit)
    return {
        "success": True,
        "city": city,
        "region": state,
        "count": len(articles),
        "articles": articles
    }

@app.post("/api/auth/password-reset")
@app.post("/api/v1/auth/password-reset")
@app.post("/auth/password-reset")
def password_reset_endpoint(req: PasswordResetRequest):
    """
    Verifies OTP, resets password hash with fresh salt in database, and revokes all active sessions.
    """
    # 1. Verify OTP challenge
    verify_res = otp_engine.verify_challenge(req.challengeId, req.code)
    clean_email = req.email.strip().lower()
    
    user = db_client.get_user_by_email(clean_email)
    if not user:
        raise HTTPException(status_code=404, detail="Account not found.")
    
    # 2. Hash new password with fresh salt
    salt = secrets.token_hex(16)
    pwd_hash = _hash_password(req.newPassword, salt)
    
    db_client.upsert_user({
        **user,
        "password_hash": pwd_hash,
        "salt": salt,
        "failed_login_attempts": 0,
        "locked_until": None,
        "verification_status": "VERIFIED",
    })
    
    # 3. Revoke all previous user sessions for security
    db_client.revoke_all_user_sessions(user["id"])
    
    return {"success": True, "message": "Password has been successfully reset. Please log in with your new password."}

# =============================================================================
# Farmer Agricultural Profile & Plots Endpoints (IDOR Protected)
# =============================================================================
@app.get("/api/farmer/profile/{farmer_id}")
@app.get("/api/v1/farmer/profile/{farmer_id}")
@app.get("/api/farmer/profiles/{farmer_id}")
@app.get("/api/v1/farmer/profiles/{farmer_id}")
@app.get("/farmer/profiles/{farmer_id}")
def get_farmer_profile_endpoint(farmer_id: str, request: Request):
    """
    Retrieves persistent farmer profile with IDOR tenant ownership verification.
    """
    user = _get_authenticated_user_record(request)
    
    # IDOR Tenant Defense: User can only access their own farmer profile
    if user["id"] != farmer_id and farmer_id != "current" and user.get("role") != "official":
        raise HTTPException(status_code=403, detail="Access Denied: You do not have permission to view this agricultural profile.")
    
    target_id = user["id"] if farmer_id == "current" else farmer_id
    profile = db_client.get_farmer_profile(target_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Farmer profile not found.")
    
    return {"success": True, "data": profile}

@app.put("/api/farmer/profile/{farmer_id}")
@app.put("/api/v1/farmer/profile/{farmer_id}")
def update_farmer_profile_endpoint(farmer_id: str, req: FarmerProfileUpdateRequest, request: Request):
    """
    Updates farmer profile in Supabase database with IDOR tenant verification.
    """
    user = _get_authenticated_user_record(request)
    if user["id"] != farmer_id and farmer_id != "current" and user.get("role") != "official":
        raise HTTPException(status_code=403, detail="Access Denied: You cannot modify another farmer's profile.")
    
    target_id = user["id"] if farmer_id == "current" else farmer_id
    existing = db_client.get_farmer_profile(target_id) or {"id": target_id, "user_id": target_id}
    
    updated_data = {
        **existing,
        "village_area": req.villageArea if req.villageArea is not None else existing.get("village_area"),
        "district": req.district if req.district is not None else existing.get("district"),
        "state": req.state if req.state is not None else existing.get("state"),
        "total_acreage": req.totalAcreage if req.totalAcreage is not None else existing.get("total_acreage"),
        "primary_crop": req.primaryCrop if req.primaryCrop is not None else existing.get("primary_crop"),
        "soil_type": req.soilType if req.soilType is not None else existing.get("soil_type"),
        "irrigation_source": req.irrigationSource if req.irrigationSource is not None else existing.get("irrigation_source"),
        "farm_lat": req.farmLat if req.farmLat is not None else existing.get("farm_lat"),
        "farm_lng": req.farmLng if req.farmLng is not None else existing.get("farm_lng"),
        "address_label": req.addressLabel if req.addressLabel is not None else existing.get("address_label"),
    }
    
    saved = db_client.upsert_farmer_profile(updated_data)
    return {"success": True, "data": saved}

@app.post("/api/farmer/plots/{farmer_id}")
@app.post("/api/v1/farmer/plots/{farmer_id}")
def add_farmer_plot_endpoint(farmer_id: str, req: AddPlotRequest, request: Request):
    """
    Adds a new plot to farmer profile in Supabase database.
    """
    user = _get_authenticated_user_record(request)
    if user["id"] != farmer_id and farmer_id != "current" and user.get("role") != "official":
        raise HTTPException(status_code=403, detail="Access Denied: You cannot add plots to another farmer's profile.")
    
    target_id = user["id"] if farmer_id == "current" else farmer_id
    profile = db_client.get_farmer_profile(target_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Farmer profile not found.")
    
    plot_data = {
        "farmer_profile_id": profile["id"],
        "plot_name": req.plotName,
        "plot_size_acres": req.plotSizeAcres,
        "crop": req.crop,
        "soil_type": req.soilType,
        "irrigation_type": req.irrigationType,
        "sowing_date": req.sowingDate,
    }
    saved_plot = db_client.add_farm_plot(plot_data)
    return {"success": True, "data": saved_plot}

class SendOtpRequest(BaseModel):
    email: str = Field(..., max_length=255)
    purpose: Optional[str] = Field("REGISTRATION")
    pendingData: Optional[Dict[str, Any]] = None

class VerifyOtpRequest(BaseModel):
    challengeId: str = Field(..., min_length=10, max_length=100)
    code: str = Field(..., min_length=6, max_length=6)

class ResendOtpRequest(BaseModel):
    challengeId: str = Field(..., min_length=10, max_length=100)

# =============================================================================
# Direct OTP Verification & Session Establishment
# =============================================================================
@app.post("/api/auth/otp/send")
@app.post("/api/v1/auth/otp/send")
@app.post("/auth/otp/send")
def send_otp_endpoint(req: SendOtpRequest):
    """
    Dispatches a cryptographically secure 6-digit OTP via Brevo transactional email.
    Never returns the OTP or development code in production/API responses.
    """
    try:
        result = otp_engine.create_and_send_challenge(
            identifier=req.email,
            purpose=req.purpose or "REGISTRATION",
            pending_data=req.pendingData
        )
        return result
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except RuntimeError as re:
        raise HTTPException(status_code=502, detail=str(re))
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to dispatch verification code. Please try again.")

@app.post("/api/auth/otp/verify")
@app.post("/api/v1/auth/otp/verify")
@app.post("/auth/otp/verify")
def verify_otp_endpoint(req: VerifyOtpRequest):
    """
    Verifies candidate OTP code against server-side salted HMAC hash.
    Consumes challenge immediately on successful match, marks user as VERIFIED,
    and establishes persistent authenticated session token in Supabase database.
    """
    try:
        result = otp_engine.verify_challenge(
            challenge_id=req.challengeId,
            candidate_code=req.code
        )
        
        # Transition user to VERIFIED status in Supabase database
        user = db_client.get_user_by_email(result["identifier"])
        now = _now_utc()
        session_token = None
        expires_at = None
        
        if user:
            updated_user = {
                **user,
                "verification_status": "VERIFIED",
                "email_verified_at": now.isoformat(),
            }
            db_client.upsert_user(updated_user)
            
            # Create session in database
            session_token = secrets.token_hex(32)
            token_hash = _hash_token(session_token)
            session_id = f"sess-{int(now.timestamp()*1000)}-{secrets.token_hex(4)}"
            expires_at = (now + timedelta(hours=24)).isoformat()
            db_client.create_session(session_id, user["id"], token_hash, expires_at)
            
            profile = db_client.get_farmer_profile(user["id"]) if user["role"] == "farmer" else None
            
            return {
                "success": True,
                "verified": True,
                "sessionToken": session_token,
                "expiresAt": expires_at,
                "user": _format_client_user(updated_user, profile)
            }
        
        return result
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception:
        raise HTTPException(status_code=500, detail="Verification failed due to an unexpected error.")

@app.post("/api/auth/otp/resend")
@app.post("/api/v1/auth/otp/resend")
@app.post("/auth/otp/resend")
def resend_otp_endpoint(req: ResendOtpRequest):
    """
    Resends OTP challenge respecting 60-second cooldown and 5-request rate limit window.
    """
    try:
        result = otp_engine.resend_challenge(challenge_id=req.challengeId)
        return result
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except RuntimeError as re:
        raise HTTPException(status_code=502, detail=str(re))
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to resend verification code.")

inference_service: Optional[RaiInferenceService] = None

@app.on_event("startup")
def startup_event():
    global inference_service
    try:
        inference_service = RaiInferenceService()
        print("R.A.I. Operational Inference & Warning Service initialized.")
    except Exception as e:
        print(f"Warning during startup initialization: {e}")

@app.get("/api/model/status")
def get_model_status():
    """Returns operational status and lineage metadata of the model registry."""
    model_dir = MODELS_DIR / "rainfall_model_v1"
    meta_file = model_dir / "metadata.json"
    metrics_file = model_dir / "metrics.json"

    if meta_file.exists():
        with open(meta_file, "r", encoding="utf-8") as f:
            metadata = json.load(f)
        with open(metrics_file, "r", encoding="utf-8") as f:
            metrics = json.load(f)
        return {
            "status": "MODEL_READY",
            "modelName": metadata.get("modelName"),
            "modelVersion": metadata.get("modelVersion"),
            "thresholdVersion": metadata.get("thresholdVersion"),
            "operationalThreshold": metadata.get("operationalThreshold"),
            "trainedAt": metadata.get("trainedAt"),
            "featuresCount": metadata.get("featuresCount"),
            "datasetPartitions": metadata.get("datasetPartitions"),
            "evaluation": metrics.get("primaryModel")
        }
    return {"status": "MODEL_NOT_TRAINED"}

@app.get("/api/model/metrics")
@app.get("/api/model/comparison")
def get_model_metrics():
    """Returns comparative evaluation metrics between Primary XGBoost and Baseline."""
    metrics_file = MODELS_DIR / "rainfall_model_v1" / "metrics.json"
    if not metrics_file.exists():
        raise HTTPException(status_code=404, detail="Metrics not found.")
    with open(metrics_file, "r", encoding="utf-8") as f:
        data = json.load(f)
    return {
        "evaluationDataset": data.get("evaluationDataset"),
        "primaryModel": data.get("primaryModel"),
        "baselineModel": data.get("baselineComparison"),
        "globalTopFeatures": data.get("globalTopFeatures")
    }

@app.get("/api/model/explainability")
def get_model_explainability():
    """Returns global TreeSHAP feature importances and baseline values for SIH presentation."""
    shap_file = MODELS_DIR / "rainfall_model_v1" / "shap_summary.json"
    if not shap_file.exists():
        raise HTTPException(status_code=404, detail="SHAP summary not found. Run model training.")
    with open(shap_file, "r", encoding="utf-8") as f:
        return json.load(f)

@app.get("/api/model/thresholds")
def get_model_thresholds():
    """Returns the validation threshold sweep analysis and derived operational risk boundaries."""
    thresh_file = MODELS_DIR / "rainfall_model_v1" / "threshold_analysis.json"
    if not thresh_file.exists():
        raise HTTPException(status_code=404, detail="Threshold analysis not found.")
    with open(thresh_file, "r", encoding="utf-8") as f:
        return json.load(f)

@app.get("/api/model/multi-horizon")
def get_multi_horizon_metadata():
    """Returns supported prediction horizon definitions and feasibility status."""
    return get_multi_horizon_status()

@app.get("/api/satellite/status")
def get_satellite_status(
    latitude: float = Query(23.0225, ge=-90.0, le=90.0),
    longitude: float = Query(72.5714, ge=-180.0, le=180.0)
):
    """Returns NASA GPM IMERG 0.1° satellite grid telemetry."""
    if inference_service is None:
        raise HTTPException(status_code=503, detail="Inference service initializing.")
    return inference_service.satellite_adapter.get_satellite_precipitation(latitude, longitude)

@app.post("/api/prediction/heavy-rainfall")
def predict_heavy_rainfall_post(req: PredictionRequest):
    """
    POST endpoint: Computes operational heavy rainfall probability, risk tier, and TreeSHAP attributions.
    """
    global inference_service
    if inference_service is None:
        inference_service = RaiInferenceService()

    try:
        return inference_service.predict(
            latitude=req.latitude,
            longitude=req.longitude,
            city=req.city or "Target Area",
            horizon_hours=req.horizonHours or 24
        )
    except Exception as e:
        is_prod = os.environ.get("APP_ENV") == "production"
        msg = "Real-time meteorological observation temporarily unavailable." if is_prod else f"Observation unavailable: {str(e)}"
        return {
            "dataStatus": "UNAVAILABLE",
            "message": msg,
            "prediction": None,
            "disclaimer": "Real-time live telemetry stream currently disconnected."
        }

@app.get("/api/prediction/heavy-rainfall")
@app.get("/api/risk/predict")
def predict_heavy_rainfall_get(
    latitude: float = Query(..., ge=-90.0, le=90.0, description="Latitude (-90 to 90)"),
    longitude: float = Query(..., ge=-180.0, le=180.0, description="Longitude (-180 to 180)"),
    city: str = Query("Target Area", max_length=100, description="Location name"),
    horizon: int = Query(24, ge=1, le=168, description="Forecast horizon in hours (1-168)")
):
    """
    GET endpoint: Computes operational heavy rainfall probability, risk tier, and TreeSHAP attributions.
    """
    global inference_service
    if inference_service is None:
        inference_service = RaiInferenceService()

    try:
        return inference_service.predict(
            latitude=latitude,
            longitude=longitude,
            city=city,
            horizon_hours=horizon
        )
    except Exception as e:
        is_prod = os.environ.get("APP_ENV") == "production"
        msg = "Real-time meteorological observation temporarily unavailable." if is_prod else f"Observation unavailable: {str(e)}"
        return {
            "dataStatus": "UNAVAILABLE",
            "message": msg,
            "prediction": None,
            "disclaimer": "Real-time live telemetry stream currently disconnected."
        }

if __name__ == "__main__":
    uvicorn.run("ml.server:app", host="127.0.0.1", port=8000, reload=False)
