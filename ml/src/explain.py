"""
R.A.I. Explainable AI (XAI) & SHAP Engine.
Computes real TreeSHAP values for heavy rainfall predictions and generates
truthful, deterministic natural-language explanations.
"""
from typing import Dict, List, Any, Tuple
import numpy as np
import pandas as pd
import shap
import joblib
from ml.src.config import MODELS_DIR, ALL_MODEL_FEATURES, classify_risk

# Human-readable feature name aliases for public transparency
FEATURE_ALIASES = {
    "temperature_2m": "Ambient Temperature",
    "relative_humidity_2m": "Relative Humidity",
    "surface_pressure": "Barometric Surface Pressure",
    "wind_speed_10m": "Sustained Wind Speed",
    "wind_direction_10m": "Wind Direction",
    "cloud_cover": "Atmospheric Cloud Cover",
    "precipitation": "Current Precipitation Rate",
    "rain": "Rainfall Intensity",
    "showers": "Convective Showers",
    "precipitation_probability": "Precipitation Probability",
    "precip_1h": "Past 1h Rainfall",
    "precip_3h_sum": "Past 3h Accumulated Rain",
    "precip_6h_sum": "Past 6h Accumulated Rain",
    "precip_24h_sum": "Past 24h Accumulated Rain",
    "pressure_change_3h": "3-Hour Pressure Tendency",
    "humidity_change_3h": "3-Hour Humidity Surge",
    "wind_speed_change_3h": "3-Hour Wind Acceleration",
    "forecast_rain_6h": "Forecast 6h Rain Accumulation",
    "forecast_rain_24h": "Forecast 24h Rain Accumulation",
    "max_precip_probability_24h": "Peak 24h Rain Probability",
    "dew_point_spread": "Dew Point Saturation Spread",
    "convective_energy_proxy": "Convective Instability Index",
    "sin_hour": "Diurnal Solar Cycle",
    "cos_hour": "Diurnal Solar Cycle",
    "sin_month": "Seasonal Monsoon Cycle",
    "cos_month": "Seasonal Monsoon Cycle",
    "latitude": "Regional Latitude",
    "longitude": "Regional Longitude",
}

class RaiShapExplainer:
    """
    SHAP Explainer wrapping the trained XGBoost heavy rainfall model.
    """

    def __init__(self, model_path: str = None):
        if model_path is None:
            model_path = str(MODELS_DIR / "heavy_rain_model_v1.pkl")
        
        self.model = joblib.load(model_path)
        # TreeExplainer for exact fast tree-based Shapley value computation
        self.explainer = shap.TreeExplainer(self.model)

    def explain_prediction(
        self,
        features_dict: Dict[str, float],
        location_name: str = "your area",
        top_k: int = 5
    ) -> Dict[str, Any]:
        """
        Calculates exact SHAP values for a single feature vector and produces
        ranked positive/negative contributors and a deterministic explanation.
        """
        # Convert dictionary to ordered feature vector
        vector = [features_dict.get(feat, 0.0) for feat in ALL_MODEL_FEATURES]
        X = np.array([vector])

        # Compute SHAP values
        shap_values = self.explainer.shap_values(X)
        if isinstance(shap_values, list):
            # In binary classification, take positive class (1)
            raw_shap = shap_values[1][0]
        else:
            raw_shap = shap_values[0]

        # Combine features with their values and exact SHAP impact
        factor_items = []
        for i, feat_name in enumerate(ALL_MODEL_FEATURES):
            val = float(X[0, i])
            shap_val = float(raw_shap[i])
            alias = FEATURE_ALIASES.get(feat_name, feat_name)
            factor_items.append({
                "feature": feat_name,
                "featureName": alias,
                "value": round(val, 2),
                "shapValue": round(shap_val, 4),
                "impact": "INCREASES_RISK" if shap_val > 0 else "DECREASES_RISK",
                "absShap": abs(shap_val)
            })

        # Sort by absolute SHAP impact
        factor_items_sorted = sorted(factor_items, key=lambda x: x["absShap"], reverse=True)

        top_positive = [f for f in factor_items_sorted if f["shapValue"] > 0][:top_k]
        top_negative = [f for f in factor_items_sorted if f["shapValue"] < 0][:top_k]

        # Calculate prediction probability from model
        prob = float(self.model.predict_proba(X)[0, 1])
        risk_level = classify_risk(prob)

        # Generate Deterministic Natural-Language Summary
        explanation_text = self._build_deterministic_explanation(
            location_name=location_name,
            probability=prob,
            risk_level=risk_level,
            top_positive=top_positive,
            top_negative=top_negative
        )

        return {
            "heavyRainProbability": round(prob, 3),
            "riskLevel": risk_level,
            "topFactors": factor_items_sorted[:top_k],
            "positiveContributors": top_positive,
            "negativeContributors": top_negative,
            "deterministicExplanation": explanation_text,
            "baseValue": float(self.explainer.expected_value if not isinstance(self.explainer.expected_value, np.ndarray) else self.explainer.expected_value[0])
        }

    def _build_deterministic_explanation(
        self,
        location_name: str,
        probability: float,
        risk_level: str,
        top_positive: List[Dict[str, Any]],
        top_negative: List[Dict[str, Any]]
    ) -> str:
        """
        Creates a truthful, deterministic natural-language explanation string
        from actual SHAP feature attributions without hallucination.
        """
        pct = round(probability * 100)
        pos_names = [f"{f['featureName']} ({f['value']})" for f in top_positive[:3]]
        neg_names = [f"{f['featureName']} ({f['value']})" for f in top_negative[:2]]

        if risk_level in ["HIGH", "CRITICAL"]:
            pos_str = ", ".join(pos_names)
            text = (
                f"R.A.I. Model estimates an elevated heavy-rainfall risk of {pct}% ({risk_level}) for {location_name}. "
                f"The strongest atmospheric contributors driving this prediction are {pos_str}."
            )
            if neg_names:
                text += f" Mitigating factors counteracting higher accumulation include {', '.join(neg_names)}."
        elif risk_level == "MODERATE":
            pos_str = ", ".join(pos_names)
            text = (
                f"R.A.I. Model estimates a moderate heavy-rainfall probability of {pct}% for {location_name}. "
                f"Precipitation signals are partially elevated due to {pos_str}."
            )
        else:
            neg_str = ", ".join(neg_names) if neg_names else "stable atmospheric conditions"
            text = (
                f"R.A.I. Model estimates low heavy-rainfall probability ({pct}%) for {location_name}. "
                f"Atmospheric stability is maintained by {neg_str}."
            )

        return text
