"""
R.A.I. Explainable AI (XAI) & TreeSHAP Engine.
Computes exact Shapley feature attributions for individual heavy rainfall predictions
using the registered XGBoost model and feature schema.
"""
from typing import Dict, List, Any
import numpy as np
import shap
import joblib
from pathlib import Path

from ml.configs.config import MODELS_DIR, classify_model_risk
from ml.features.registry import ALL_MODEL_FEATURE_KEYS, FEATURE_REGISTRY
from ml.evaluation.calibration import PlattCalibrator

class RaiShapEngine:
    """
    TreeSHAP Explainer wrapper for the registered R.A.I. XGBoost Model.
    """

    def __init__(self, model_dir: Path = None):
        if model_dir is None:
            model_dir = MODELS_DIR / "rainfall_model_v1"

        model_file = model_dir / "model.pkl"
        calib_file = model_dir / "calibrated_model.pkl"

        if not model_file.exists():
            raise FileNotFoundError(f"Model file not found at {model_file}. Run training pipeline first.")

        self.raw_model = joblib.load(model_file)
        self.calibrator = joblib.load(calib_file) if calib_file.exists() else None
        self.explainer = shap.TreeExplainer(self.raw_model)

    def explain(
        self,
        features_dict: Dict[str, float],
        top_k: int = 6
    ) -> Dict[str, Any]:
        """
        Computes exact SHAP attributions for a single feature vector.
        """
        vector = [features_dict.get(feat, 0.0) for feat in ALL_MODEL_FEATURE_KEYS]
        X = np.array([vector])

        # Compute SHAP values from tree model
        shap_values = self.explainer.shap_values(X)
        raw_shap = shap_values[1][0] if isinstance(shap_values, list) else shap_values[0]

        factors = []
        for i, feat_name in enumerate(ALL_MODEL_FEATURE_KEYS):
            val = float(X[0, i])
            shap_val = float(raw_shap[i])
            meta = FEATURE_REGISTRY.get(feat_name, {})
            display_name = meta.get("displayName", feat_name)
            unit = meta.get("unit", "")

            factors.append({
                "feature": feat_name,
                "featureName": display_name,
                "value": round(val, 2),
                "unit": unit,
                "shapValue": round(shap_val, 4),
                "impact": "INCREASES_RISK" if shap_val > 0 else "DECREASES_RISK",
                "absShap": abs(shap_val)
            })

        factors_sorted = sorted(factors, key=lambda x: x["absShap"], reverse=True)
        top_pos = [f for f in factors_sorted if f["shapValue"] > 0][:top_k]
        top_neg = [f for f in factors_sorted if f["shapValue"] < 0][:top_k]

        # Raw probability from XGBoost
        raw_prob = float(self.raw_model.predict_proba(X)[0, 1])

        # Calibrated prediction probability
        if self.calibrator is not None:
            calib_out = self.calibrator.predict_proba(np.array([raw_prob]))
            prob = float(calib_out[0] if np.ndim(calib_out) == 1 else calib_out[0, 1])
        else:
            prob = raw_prob

        risk_level = classify_model_risk(prob)

        expected_val = self.explainer.expected_value
        base_val = float(expected_val if not isinstance(expected_val, (list, np.ndarray)) else expected_val[0])

        return {
            "probability": round(prob, 3),
            "riskLevel": risk_level,
            "baseValue": round(base_val, 4),
            "topFactors": factors_sorted[:top_k],
            "positiveContributors": top_pos,
            "negativeContributors": top_neg
        }
