"""
R.A.I. Probability Calibration & Reliability Analysis Module.
Computes Brier scores, reliability curves, and Platt Scaling probability calibration.
"""
from typing import Dict, Any, Tuple
import numpy as np
from sklearn.calibration import calibration_curve
from sklearn.metrics import brier_score_loss
from sklearn.linear_model import LogisticRegression

class PlattCalibrator:
    """
    Platt Scaling probability calibrator using Logistic Regression over validation logits.
    """
    def __init__(self):
        self.calibrator = LogisticRegression(solver="lbfgs", random_state=42)

    def fit(self, val_probs: np.ndarray, y_val: np.ndarray):
        probs_2d = val_probs.reshape(-1, 1)
        self.calibrator.fit(probs_2d, y_val)
        return self

    def predict_proba(self, probs: np.ndarray) -> np.ndarray:
        probs_2d = probs.reshape(-1, 1)
        return self.calibrator.predict_proba(probs_2d)[:, 1]

def evaluate_calibration(
    y_true: np.ndarray,
    y_prob: np.ndarray,
    n_bins: int = 10
) -> Dict[str, Any]:
    """
    Computes binned reliability curves and Brier score loss.
    """
    brier = float(brier_score_loss(y_true, y_prob))
    prob_true, prob_pred = calibration_curve(y_true, y_prob, n_bins=n_bins, strategy="uniform")

    curve_points = [
        {"predictedProb": round(float(p_pred), 4), "observedFraction": round(float(p_true), 4)}
        for p_pred, p_true in zip(prob_pred, prob_true)
    ]

    return {
        "brierScore": round(brier, 4),
        "calibrationQuality": "EXCELLENT" if brier < 0.05 else "ACCEPTABLE" if brier < 0.15 else "NEEDS_CALIBRATION",
        "reliabilityCurve": curve_points
    }
