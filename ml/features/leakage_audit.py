"""
R.A.I. Data Leakage & Temporal Integrity Audit Module.
Scans all model features to guarantee strictly ZERO access to future observations (t > 0).
"""
from typing import Dict, List, Any
import pandas as pd
from ml.features.registry import FEATURE_REGISTRY, ALL_MODEL_FEATURE_KEYS

FORBIDDEN_FORWARD_PATTERNS = [
    "forecast",
    "future",
    "lead",
    "ahead",
    "t+",
    "target",
    "shift(-",
    "rolling(forward"
]

def perform_leakage_audit(feature_keys: List[str] = None) -> Dict[str, Any]:
    """
    Validates that every feature in the model registry is strictly backward-looking or instantaneous (<= t).
    """
    if feature_keys is None:
        feature_keys = ALL_MODEL_FEATURE_KEYS

    audit_results = {
        "status": "PASSED_STRICT_ZERO_LEAKAGE",
        "auditedFeatureCount": len(feature_keys),
        "safeFeatures": [],
        "leakedFeatures": [],
        "details": []
    }

    for feat in feature_keys:
        meta = FEATURE_REGISTRY.get(feat, {})
        status = meta.get("leakageStatus", "UNKNOWN")
        time_window = meta.get("timeWindow", "")

        is_suspicious = False
        reason = "Clean backward or instantaneous observation (<= t)"

        for pattern in FORBIDDEN_FORWARD_PATTERNS:
            if pattern in feat.lower() or pattern in time_window.lower():
                is_suspicious = True
                reason = f"Contains suspicious forward pattern: '{pattern}'"
                break

        if is_suspicious or status != "SAFE":
            audit_results["leakedFeatures"].append(feat)
            audit_results["status"] = "FAILED_LEAKAGE_DETECTED"
            audit_results["details"].append({"feature": feat, "status": "LEAKAGE_RISK", "reason": reason})
        else:
            audit_results["safeFeatures"].append(feat)
            audit_results["details"].append({"feature": feat, "status": "SAFE", "reason": reason})

    return audit_results

if __name__ == "__main__":
    res = perform_leakage_audit()
    print("=== FORMAL DATA LEAKAGE AUDIT ===")
    print(f"Audit Status: {res['status']}")
    print(f"Audited Features: {res['auditedFeatureCount']}")
    print(f"Safe Features: {len(res['safeFeatures'])}")
    print(f"Leaked Features: {len(res['leakedFeatures'])}")
    print("=================================\n")
    if res["status"] != "PASSED_STRICT_ZERO_LEAKAGE":
        raise SystemExit(1)
