"""
Comprehensive Tests for R.A.I. Backend OTP Engine & FastAPI Endpoints.
"""
import time
import pytest
from fastapi.testclient import TestClient
from ml.server import app
from ml.auth.otp_engine import otp_engine, RaiOtpEngine

client = TestClient(app)

def test_mask_identifier():
    assert otp_engine.mask_identifier("rainaiwork@gmail.com") == "r•••••k@gmail.com"
    assert otp_engine.mask_identifier("a@test.com") == "•@test.com"
    assert otp_engine.mask_identifier("+919876543210") == "+91•••••••210"

def test_create_challenge_validation():
    response = client.post("/api/auth/otp/send", json={"email": "invalid-email", "purpose": "REGISTRATION"})
    assert response.status_code == 400
    assert "valid email" in response.json()["detail"].lower()

def test_verify_nonexistent_challenge():
    response = client.post("/api/auth/otp/verify", json={"challengeId": "otp-ch-999999-deadbeef", "code": "123456"})
    assert response.status_code == 400
    assert "expired or invalid" in response.json()["detail"].lower()

def test_engine_challenge_lifecycle():
    engine = RaiOtpEngine()
    test_email = "tester.farmer@rai.ai"
    test_purpose = "REGISTRATION"

    # 1. Create challenge (mocking Brevo dispatch to prevent external network calls)
    code = engine.generate_secure_otp()
    assert len(code) == 6
    assert code.isdigit()

    now = time.time()
    ch_id = f"otp-ch-{int(now*1000)}-test"
    hashed = engine._hash_otp(test_email, code)
    from ml.auth.otp_engine import ServerOTPChallenge, OTP_EXPIRY_SECONDS, RESEND_COOLDOWN_SECONDS
    ch = ServerOTPChallenge(
        challenge_id=ch_id,
        identifier=test_email,
        hashed_code=hashed,
        purpose=test_purpose,
        created_at=now,
        expires_at=now + OTP_EXPIRY_SECONDS,
        resend_available_at=now + RESEND_COOLDOWN_SECONDS,
        attempts_remaining=5,
        pending_data={"crop": "Wheat"}
    )
    engine._challenges[ch_id] = ch

    # 2. Test wrong code reduces attempts
    with pytest.raises(ValueError) as exc:
        engine.verify_challenge(ch_id, "000000")
    assert "4 attempt(s) remaining" in str(exc.value)

    # 3. Test correct code verifies and consumes
    res = engine.verify_challenge(ch_id, code)
    assert res["success"] is True
    assert res["verified"] is True
    assert res["identifier"] == test_email
    assert res["pendingData"]["crop"] == "Wheat"

    # 4. Test anti-replay: verify again must fail
    with pytest.raises(ValueError) as exc_replay:
        engine.verify_challenge(ch_id, code)
    assert "expired or invalid" in str(exc_replay.value).lower()

def test_max_attempts_lockout():
    engine = RaiOtpEngine()
    test_email = "lockout.test@rai.ai"
    code = "654321"
    now = time.time()
    ch_id = f"otp-ch-{int(now*1000)}-lockout"
    from ml.auth.otp_engine import ServerOTPChallenge
    ch = ServerOTPChallenge(
        challenge_id=ch_id,
        identifier=test_email,
        hashed_code=engine._hash_otp(test_email, code),
        purpose="REGISTRATION",
        created_at=now,
        expires_at=now + 300,
        resend_available_at=now + 60,
        attempts_remaining=2
    )
    engine._challenges[ch_id] = ch

    # Attempt 1 (1 remaining)
    with pytest.raises(ValueError) as exc1:
        engine.verify_challenge(ch_id, "111111")
    assert "1 attempt(s) remaining" in str(exc1.value)

    # Attempt 2 (0 remaining -> challenge deleted)
    with pytest.raises(ValueError) as exc2:
        engine.verify_challenge(ch_id, "222222")
    assert "maximum attempts exceeded" in str(exc2.value).lower()
    assert ch_id not in engine._challenges

def test_expired_challenge_rejection():
    engine = RaiOtpEngine()
    test_email = "expired.test@rai.ai"
    code = "123456"
    now = time.time()
    ch_id = f"otp-ch-{int(now*1000)}-expired"
    from ml.auth.otp_engine import ServerOTPChallenge
    ch = ServerOTPChallenge(
        challenge_id=ch_id,
        identifier=test_email,
        hashed_code=engine._hash_otp(test_email, code),
        purpose="REGISTRATION",
        created_at=now - 400,
        expires_at=now - 100,  # Already expired
        resend_available_at=now - 340,
        attempts_remaining=5
    )
    engine._challenges[ch_id] = ch

    with pytest.raises(ValueError) as exc:
        engine.verify_challenge(ch_id, code)
    assert "expired" in str(exc.value).lower()
    assert ch_id not in engine._challenges
