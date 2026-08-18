"""
Automated unit tests for data leakage audit.
"""
from ml.features.leakage_audit import perform_leakage_audit
from ml.features.registry import ALL_MODEL_FEATURE_KEYS

def test_leakage_audit_passes_on_registered_features():
    res = perform_leakage_audit(ALL_MODEL_FEATURE_KEYS)
    assert res["status"] == "PASSED_STRICT_ZERO_LEAKAGE"
    assert len(res["leakedFeatures"]) == 0
    assert len(res["safeFeatures"]) == len(ALL_MODEL_FEATURE_KEYS)

def test_leakage_audit_catches_forward_features():
    fake_leaked_features = ["rain_1h", "forecast_rain_24h", "temperature_2m"]
    res = perform_leakage_audit(fake_leaked_features)
    assert res["status"] == "FAILED_LEAKAGE_DETECTED"
    assert "forecast_rain_24h" in res["leakedFeatures"]
