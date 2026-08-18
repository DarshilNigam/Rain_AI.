"""
Automated unit tests for operational threshold analysis, risk tier boundaries, warning engine, and multi-horizon capabilities.
"""
import numpy as np
from ml.evaluation.threshold_analysis import (
    analyze_thresholds,
    classify_operational_risk,
    SELECTED_OPERATIONAL_THRESHOLD,
    THRESHOLD_VERSION
)
from ml.warning.warning_engine import evaluate_warning
from ml.pipelines.multi_horizon import get_multi_horizon_status

def test_threshold_analysis_validation_policy():
    # Synthetic validation labels with rare positive prevalence (1%)
    y_val = np.array([0] * 990 + [1] * 10)
    val_probs = np.concatenate([np.random.uniform(0.0, 0.04, 990), np.random.uniform(0.06, 0.30, 10)])

    res = analyze_thresholds(y_val, val_probs)
    assert "thresholdSweep" in res
    assert "derivedRiskBoundaries" in res
    assert res["selectedOperationalThreshold"] == 0.015
    assert res["thresholdVersion"] == THRESHOLD_VERSION
    assert res["derivedRiskBoundaries"]["LOW"]["max"] == 0.0075
    assert res["derivedRiskBoundaries"]["MODERATE"]["max"] == 0.0150
    assert res["derivedRiskBoundaries"]["HIGH"]["max"] == 0.0500
    assert res["derivedRiskBoundaries"]["CRITICAL"]["min"] == 0.0500

def test_operational_risk_classification_boundaries():
    # Default boundaries: LOW (<0.0075), MODERATE (0.0075-0.015), HIGH (0.015-0.050), CRITICAL (>=0.050)
    assert classify_operational_risk(0.0050) == "LOW"
    assert classify_operational_risk(0.0074) == "LOW"
    assert classify_operational_risk(0.0075) == "MODERATE"
    assert classify_operational_risk(0.0120) == "MODERATE"
    assert classify_operational_risk(0.0149) == "MODERATE"
    assert classify_operational_risk(0.0150) == "HIGH"
    assert classify_operational_risk(0.0350) == "HIGH"
    assert classify_operational_risk(0.0499) == "HIGH"
    assert classify_operational_risk(0.0500) == "CRITICAL"
    assert classify_operational_risk(0.1500) == "CRITICAL"
    assert classify_operational_risk(0.6000) == "CRITICAL"

def test_warning_engine_synthesis():
    top_factors = [{"feature": "rain_24h", "featureName": "Past 24h Rain", "shapValue": 0.5}]
    
    # Test HIGH Risk -> WATCH
    warning_high = evaluate_warning(
        city="Ahmedabad",
        probability=0.035,
        risk_level="HIGH",
        severity="HEAVY",
        horizon_hours=24,
        top_factors=top_factors,
        model_version="v1.0.0-sih-xgb"
    )
    assert warning_high["warningLevel"] == "WATCH"
    assert warning_high["operationalRisk"] == "HIGH"
    assert len(warning_high["recommendedActions"]) > 0

    # Test CRITICAL Risk -> WARNING
    warning_crit = evaluate_warning(
        city="Mumbai",
        probability=0.080,
        risk_level="CRITICAL",
        severity="VERY_HEAVY",
        horizon_hours=24,
        top_factors=top_factors,
        model_version="v1.0.0-sih-xgb"
    )
    assert warning_crit["warningLevel"] == "WARNING"

    # Test MODERATE Risk -> ADVISORY
    warning_mod = evaluate_warning(
        city="Delhi",
        probability=0.010,
        risk_level="MODERATE",
        severity="NORMAL",
        horizon_hours=24,
        top_factors=top_factors,
        model_version="v1.0.0-sih-xgb"
    )
    assert warning_mod["warningLevel"] == "ADVISORY"

    # Test LOW Risk -> NO_WARNING
    warning_low = evaluate_warning(
        city="Chennai",
        probability=0.003,
        risk_level="LOW",
        severity="NORMAL",
        horizon_hours=24,
        top_factors=top_factors,
        model_version="v1.0.0-sih-xgb"
    )
    assert warning_low["warningLevel"] == "NO_WARNING"
    assert "NOTICE: R.A.I. Model Warnings are predictive" in warning_low["disclaimer"]

def test_multi_horizon_status():
    horizon_status = get_multi_horizon_status()
    assert 24 in horizon_status["supportedHorizons"]
    assert 6 in horizon_status["supportedHorizons"]
    assert 12 in horizon_status["supportedHorizons"]
    assert horizon_status["primaryHorizon"] == 24
