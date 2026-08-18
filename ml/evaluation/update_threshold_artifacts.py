"""
Update metadata, threshold_analysis.json, and metrics.json with final validation-selected threshold tau=0.015.
"""
import json
from pathlib import Path
import numpy as np
import joblib
from ml.configs.config import MODELS_DIR
from ml.training.dataset import load_processed_dataset, get_chronological_splits, prepare_feature_matrices
from ml.evaluation.threshold_analysis import analyze_thresholds, THRESHOLD_VERSION, SELECTED_OPERATIONAL_THRESHOLD

def update_threshold_artifacts():
    model_dir = MODELS_DIR / "rainfall_model_v1"
    raw_xgb = joblib.load(model_dir / "model.pkl")
    calibrator = joblib.load(model_dir / "calibrated_model.pkl")

    df = load_processed_dataset()
    train_df, val_df, test_df = get_chronological_splits(df)
    matrices = prepare_feature_matrices(train_df, val_df, test_df)

    X_val, y_val = matrices["X_val"], matrices["y_val"]
    raw_val_probs = raw_xgb.predict_proba(X_val)[:, 1]
    calib_val_probs = calibrator.predict_proba(raw_val_probs)

    thresh_results = analyze_thresholds(y_val.values, calib_val_probs)

    # Save threshold_analysis.json
    thresh_file = model_dir / "threshold_analysis.json"
    with open(thresh_file, "w", encoding="utf-8") as f:
        json.dump(thresh_results, f, indent=2)
    print("Saved threshold_analysis.json")

    # Update metadata.json
    meta_file = model_dir / "metadata.json"
    if meta_file.exists():
        with open(meta_file, "r", encoding="utf-8") as f:
            metadata = json.load(f)
    else:
        metadata = {}

    metadata["modelVersion"] = "v1.0.0-sih-xgb"
    metadata["thresholdVersion"] = THRESHOLD_VERSION
    metadata["operationalThreshold"] = SELECTED_OPERATIONAL_THRESHOLD
    metadata["selectionCriterion"] = "Validation recall maximization subject to precision >= 10% (Early-warning operating point; validation F2 peak is at tau=0.040)"

    with open(meta_file, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)
    print("Saved metadata.json")

    # Update metrics.json
    metrics_file = model_dir / "metrics.json"
    if metrics_file.exists():
        with open(metrics_file, "r", encoding="utf-8") as f:
            metrics = json.load(f)
    else:
        metrics = {}

    metrics["thresholdVersion"] = THRESHOLD_VERSION
    metrics["selectedOperationalThreshold"] = SELECTED_OPERATIONAL_THRESHOLD
    metrics["primaryModel"]["operationalThreshold"] = SELECTED_OPERATIONAL_THRESHOLD
    metrics["primaryModel"]["riskBoundaries"] = thresh_results["derivedRiskBoundaries"]
    metrics["primaryModel"]["validationOperationalMetrics"] = thresh_results["validationPerformanceAtThreshold"]

    with open(metrics_file, "w", encoding="utf-8") as f:
        json.dump(metrics, f, indent=2)
    print("Saved metrics.json")

if __name__ == "__main__":
    update_threshold_artifacts()
