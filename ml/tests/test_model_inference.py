"""
Automated unit tests for TreeSHAP explainability and IMD severity mapping.
"""
from ml.configs.config import classify_severity, classify_model_risk, HEAVY_RAIN_THRESHOLD_MM
from ml.explainability.human_explainer import format_human_explanation

def test_imd_severity_classification():
    assert classify_severity(10.0) == "NORMAL"
    assert classify_severity(65.0) == "HEAVY"
    assert classify_severity(120.0) == "VERY_HEAVY"
    assert classify_severity(210.0) == "EXTREMELY_HEAVY"

def test_model_risk_classification():
    assert classify_model_risk(0.10) == "LOW"
    assert classify_model_risk(0.35) == "MODERATE"
    assert classify_model_risk(0.65) == "HIGH"
    assert classify_model_risk(0.85) == "CRITICAL"

def test_format_human_explanation():
    top_pos = [{"featureName": "Relative Humidity", "value": 88, "unit": "%"}]
    top_neg = [{"featureName": "Surface Pressure", "value": 1014, "unit": "hPa"}]
    explanation = format_human_explanation(
        location_name="Ahmedabad",
        probability=0.78,
        risk_level="HIGH",
        severity="HEAVY",
        top_positive=top_pos,
        top_negative=top_neg
    )
    assert "Ahmedabad" in explanation
    assert "78%" in explanation
    assert "HIGH" in explanation
    assert "Relative Humidity" in explanation
