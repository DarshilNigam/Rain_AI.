"""
R.A.I. Controlled Seasonal & Regional Generalization Experiment.
Evaluates whether seasonal harmonics (day-of-year, dual-monsoon regimes),
spatial-temporal interactions, atmospheric coupling, and rainfall dynamics
improve unseen generalization without modifying the production model.
"""
import os
import json
from pathlib import Path
import numpy as np
import pandas as pd
import joblib
from xgboost import XGBClassifier
from sklearn.metrics import (
    roc_auc_score,
    average_precision_score,
    brier_score_loss,
    precision_score,
    recall_score,
    f1_score,
    fbeta_score,
    confusion_matrix
)

from ml.configs.config import MODELS_DIR, TARGET_COLUMN
from ml.training.dataset import load_processed_dataset, get_chronological_splits
from ml.evaluation.calibration import PlattCalibrator
from ml.evaluation.threshold_analysis import analyze_thresholds

EXP_DIR = MODELS_DIR / "rainfall_model_exp1"
EXP_DIR.mkdir(parents=True, exist_ok=True)

# 1. Base Features (27 Features from Baseline Model A)
BASELINE_FEATURES = [
    "temperature_2m", "relative_humidity_2m", "surface_pressure", "wind_speed_10m",
    "wind_direction_10m", "cloud_cover", "precipitation", "rain_1h", "rain_3h",
    "rain_6h", "rain_12h", "rain_24h", "satellite_precipitation", "satellite_precipitation_3h",
    "satellite_precipitation_24h", "pressure_change", "humidity_change", "temperature_change",
    "wind_speed_change", "dew_point_spread", "convective_energy_proxy", "sin_hour",
    "cos_hour", "sin_month", "cos_month", "latitude", "longitude"
]

# 2. Enhanced Features for Experimental Model B
# Seasonal regimes, day-of-year harmonics, spatial-seasonal interactions, rainfall dynamics, atmospheric coupling
EXPERIMENTAL_NEW_FEATURES = [
    "sin_doy", "cos_doy",
    "is_sw_monsoon", "is_ne_monsoon",
    "lat_x_sin_month", "lng_x_cos_month",
    "rain_rate_change", "rain_6h_to_24h_ratio",
    "cloud_x_precip", "convective_x_wind",
    "saturation_deficit_tendency"
]

EXPERIMENTAL_ALL_FEATURES = BASELINE_FEATURES + EXPERIMENTAL_NEW_FEATURES

def compute_experimental_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Computes enhanced seasonal and regional interaction features with strictly zero leakage (<= t).
    """
    df = df.copy()
    df["time"] = pd.to_datetime(df["time"])
    df = df.sort_values(by=["station_name", "time"]).reset_index(drop=True)

    station_dfs = []
    for station_name, group in df.groupby("station_name", sort=False):
        grp = group.copy().sort_values(by="time").reset_index(drop=True)

        # 1. Day-of-Year Continuous Harmonic Encoding
        doy = grp["time"].dt.dayofyear
        grp["sin_doy"] = np.sin(2 * np.pi * (doy - 1) / 365.25)
        grp["cos_doy"] = np.cos(2 * np.pi * (doy - 1) / 365.25)

        # 2. Dual Monsoon Regime Indicators
        month = grp["time"].dt.month
        grp["is_sw_monsoon"] = month.isin([6, 7, 8, 9]).astype(float)      # June - Sept (Southwest Monsoon)
        grp["is_ne_monsoon"] = month.isin([10, 11, 12]).astype(float)    # Oct - Dec (Northeast Retreating Monsoon)

        # 3. Spatial-Seasonal Interactions (ITCZ Migration Tracking)
        grp["lat_x_sin_month"] = grp["latitude"] * grp["sin_month"]
        grp["lng_x_cos_month"] = grp["longitude"] * grp["cos_month"]

        # 4. Rainfall Dynamics & Acceleration
        grp["rain_rate_change"] = (grp["precipitation"] - grp["precipitation"].shift(1)).fillna(0.0)
        grp["rain_6h_to_24h_ratio"] = (grp["rain_6h"] / (grp["rain_24h"] + 1e-3)).fillna(0.0)

        # 5. Atmospheric Coupling & Instability Proxies
        grp["cloud_x_precip"] = (grp["cloud_cover"] / 100.0) * grp["precipitation"]
        grp["convective_x_wind"] = grp["convective_energy_proxy"] * (grp["wind_speed_10m"] / 30.0)
        grp["saturation_deficit_tendency"] = (grp["dew_point_spread"] - grp["dew_point_spread"].shift(3)).fillna(0.0)

        station_dfs.append(grp)

    full_df = pd.concat(station_dfs, ignore_index=True)
    return full_df

def run_experiment():
    print("=== STARTING CONTROLLED SEASONAL GENERALIZATION EXPERIMENT ===")

    # 1. Load Raw Processed Dataset
    raw_df = load_processed_dataset()
    exp_df = compute_experimental_features(raw_df)

    # 2. Chronological Splits (Exactly Identical)
    train_df, val_df, test_df = get_chronological_splits(exp_df)

    # Feature Matrices for Model A (Baseline) and Model B (Experimental)
    X_train_A = train_df[BASELINE_FEATURES].fillna(0.0)
    X_val_A = val_df[BASELINE_FEATURES].fillna(0.0)
    X_test_A = test_df[BASELINE_FEATURES].fillna(0.0)

    X_train_B = train_df[EXPERIMENTAL_ALL_FEATURES].fillna(0.0)
    X_val_B = val_df[EXPERIMENTAL_ALL_FEATURES].fillna(0.0)
    X_test_B = test_df[EXPERIMENTAL_ALL_FEATURES].fillna(0.0)

    y_train = train_df[TARGET_COLUMN]
    y_val = val_df[TARGET_COLUMN]
    y_test = test_df[TARGET_COLUMN]

    print(f"Features: Baseline={len(BASELINE_FEATURES)}, Experimental={len(EXPERIMENTAL_ALL_FEATURES)}")
    print(f"Train samples: {len(X_train_B)} ({y_train.sum()} pos)")
    print(f"Val samples:   {len(X_val_B)} ({y_val.sum()} pos)")
    print(f"Test samples:  {len(X_test_B)} ({y_test.sum()} pos)")

    # 3. Leakage Verification on Experimental Features
    for feat in EXPERIMENTAL_NEW_FEATURES:
        assert feat in X_train_B.columns
        # Check no target leakage correlation
        corr = np.abs(np.corrcoef(X_train_B[feat].values, y_train.values)[0, 1])
        assert corr < 0.95, f"Suspected target leakage in {feat}: correlation={corr}"

    print("Leakage audit passed: 0 target contamination detected.")

    # 4. Train Experimental Model B (Same Hyperparameters)
    pos_weight = float((len(y_train) - y_train.sum()) / max(y_train.sum(), 1))
    print(f"Training Experimental XGBoost with scale_pos_weight={pos_weight:.2f}...")

    xgb_B = XGBClassifier(
        n_estimators=300,
        max_depth=6,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        scale_pos_weight=pos_weight,
        random_state=42,
        eval_metric="aucpr",
        early_stopping_rounds=30,
        tree_method="hist",
        n_jobs=-1
    )

    xgb_B.fit(
        X_train_B, y_train,
        eval_set=[(X_train_B, y_train), (X_val_B, y_val)],
        verbose=False
    )

    # 5. Fit Platt Calibrator on Validation Logits ONLY
    val_raw_probs_B = xgb_B.predict_proba(X_val_B)[:, 1]
    calibrator_B = PlattCalibrator()
    calibrator_B.fit(val_raw_probs_B, y_val.values)
    val_calib_probs_B = calibrator_B.predict_proba(val_raw_probs_B)

    # Load Baseline Model A
    model_A_dir = MODELS_DIR / "rainfall_model_v1"
    xgb_A = joblib.load(model_A_dir / "model.pkl")
    calibrator_A = joblib.load(model_A_dir / "calibrated_model.pkl")

    val_raw_probs_A = xgb_A.predict_proba(X_val_A)[:, 1]
    val_calib_probs_A = calibrator_A.predict_proba(val_raw_probs_A)

    # 6. Validation Threshold Sweep & Selection (VALIDATION ONLY)
    threshold_sweep_candidates = [
        0.005, 0.010, 0.015, 0.020, 0.030, 0.040, 0.050, 0.075, 0.10, 0.15, 0.20, 0.30, 0.50
    ]

    val_sweep_A = analyze_thresholds(y_val.values, val_calib_probs_A, threshold_sweep_candidates)
    val_sweep_B = analyze_thresholds(y_val.values, val_calib_probs_B, threshold_sweep_candidates)

    # Operational rule for Model B: Maximize recall subject to Precision >= 10%
    best_tau_B = 0.015
    best_rec_B = -1.0
    for res in val_sweep_B["thresholdSweep"]:
        if res["precision"] >= 0.10 and res["recall"] > best_rec_B:
            best_rec_B = res["recall"]
            best_tau_B = res["threshold"]

    tau_A = 0.015  # Baseline operational threshold

    # 7. Evaluate on Validation Set
    val_preds_A = (val_calib_probs_A >= tau_A).astype(int)
    val_preds_B = (val_calib_probs_B >= best_tau_B).astype(int)

    val_metrics = {
        "model_A_baseline": {
            "rocAuc": round(float(roc_auc_score(y_val, val_calib_probs_A)), 4),
            "prAuc": round(float(average_precision_score(y_val, val_calib_probs_A)), 4),
            "brierScore": round(float(brier_score_loss(y_val, val_calib_probs_A)), 4),
            "selectedThreshold": tau_A,
            "precision": round(float(precision_score(y_val, val_preds_A, zero_division=0)), 4),
            "recall": round(float(recall_score(y_val, val_preds_A, zero_division=0)), 4),
            "f1": round(float(f1_score(y_val, val_preds_A, zero_division=0)), 4),
            "f2": round(float(fbeta_score(y_val, val_preds_A, beta=2.0, zero_division=0)), 4),
            "alertRate": round(float(val_preds_A.sum() / len(val_preds_A)), 4)
        },
        "model_B_experimental": {
            "rocAuc": round(float(roc_auc_score(y_val, val_calib_probs_B)), 4),
            "prAuc": round(float(average_precision_score(y_val, val_calib_probs_B)), 4),
            "brierScore": round(float(brier_score_loss(y_val, val_calib_probs_B)), 4),
            "selectedThreshold": best_tau_B,
            "precision": round(float(precision_score(y_val, val_preds_B, zero_division=0)), 4),
            "recall": round(float(recall_score(y_val, val_preds_B, zero_division=0)), 4),
            "f1": round(float(f1_score(y_val, val_preds_B, zero_division=0)), 4),
            "f2": round(float(fbeta_score(y_val, val_preds_B, beta=2.0, zero_division=0)), 4),
            "alertRate": round(float(val_preds_B.sum() / len(val_preds_B)), 4)
        }
    }

    # 8. Final One-Time Evaluation on Untouched TEST Partition
    test_raw_probs_A = xgb_A.predict_proba(X_test_A)[:, 1]
    test_calib_probs_A = calibrator_A.predict_proba(test_raw_probs_A)

    test_raw_probs_B = xgb_B.predict_proba(X_test_B)[:, 1]
    test_calib_probs_B = calibrator_B.predict_proba(test_raw_probs_B)

    test_preds_A = (test_calib_probs_A >= tau_A).astype(int)
    test_preds_B = (test_calib_probs_B >= best_tau_B).astype(int)

    cm_A = confusion_matrix(y_test, test_preds_A)
    tn_A, fp_A, fn_A, tp_A = cm_A.ravel()

    cm_B = confusion_matrix(y_test, test_preds_B)
    tn_B, fp_B, fn_B, tp_B = cm_B.ravel()

    test_metrics = {
        "model_A_baseline": {
            "rocAuc": round(float(roc_auc_score(y_test, test_calib_probs_A)), 4),
            "prAuc": round(float(average_precision_score(y_test, test_calib_probs_A)), 4),
            "brierScore": round(float(brier_score_loss(y_test, test_calib_probs_A)), 4),
            "thresholdUsed": tau_A,
            "precision": round(float(precision_score(y_test, test_preds_A, zero_division=0)), 4),
            "recall": round(float(recall_score(y_test, test_preds_A, zero_division=0)), 4),
            "f1": round(float(f1_score(y_test, test_preds_A, zero_division=0)), 4),
            "f2": round(float(fbeta_score(y_test, test_preds_A, beta=2.0, zero_division=0)), 4),
            "confusionMatrix": {"tp": int(tp_A), "fp": int(fp_A), "tn": int(tn_A), "fn": int(fn_A)}
        },
        "model_B_experimental": {
            "rocAuc": round(float(roc_auc_score(y_test, test_calib_probs_B)), 4),
            "prAuc": round(float(average_precision_score(y_test, test_calib_probs_B)), 4),
            "brierScore": round(float(brier_score_loss(y_test, test_calib_probs_B)), 4),
            "thresholdUsed": best_tau_B,
            "precision": round(float(precision_score(y_test, test_preds_B, zero_division=0)), 4),
            "recall": round(float(recall_score(y_test, test_preds_B, zero_division=0)), 4),
            "f1": round(float(f1_score(y_test, test_preds_B, zero_division=0)), 4),
            "f2": round(float(fbeta_score(y_test, test_preds_B, beta=2.0, zero_division=0)), 4),
            "confusionMatrix": {"tp": int(tp_B), "fp": int(fp_B), "tn": int(tn_B), "fn": int(fn_B)}
        }
    }

    # 9. Compute Feature Importances for Model B
    importances = xgb_B.feature_importances_
    ranked_feats = sorted(
        [{"feature": feat, "importance": round(float(imp), 4)} for feat, imp in zip(EXPERIMENTAL_ALL_FEATURES, importances)],
        key=lambda x: x["importance"],
        reverse=True
    )

    # 10. Save Experimental Artifacts (Separately from v1.0.0-sih-xgb)
    joblib.dump(xgb_B, EXP_DIR / "model.pkl")
    joblib.dump(calibrator_B, EXP_DIR / "calibrated_model.pkl")
    xgb_B.save_model(str(EXP_DIR / "xgb_model.json"))

    exp_payload = {
        "modelName": "RAI-HeavyRain-XGBoost-SeasonalExp",
        "modelVersion": "v1.1.0-seasonal-experiment",
        "featuresCount": len(EXPERIMENTAL_ALL_FEATURES),
        "featuresList": EXPERIMENTAL_ALL_FEATURES,
        "validationEvaluation": val_metrics,
        "testEvaluation": test_metrics,
        "topFeatureImportances": ranked_feats[:15],
        "validationSweepB": val_sweep_B["thresholdSweep"]
    }

    with open(EXP_DIR / "experiment_report.json", "w", encoding="utf-8") as f:
        json.dump(exp_payload, f, indent=2)

    print("=== EXPERIMENT RUN COMPLETE ===")
    print("Validation Comparison:")
    print(json.dumps(val_metrics, indent=2))
    print("\nUntouched Test Comparison:")
    print(json.dumps(test_metrics, indent=2))
    return exp_payload

if __name__ == "__main__":
    run_experiment()
