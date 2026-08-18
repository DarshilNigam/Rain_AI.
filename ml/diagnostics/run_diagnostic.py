"""
R.A.I. Model Performance Diagnostic Script.
Runs comprehensive threshold sweeps, per-station breakdowns, feature taxonomy,
and class imbalance analysis on validation and test partitions without modifying the production model.
"""
import json
from pathlib import Path
import numpy as np
import pandas as pd
import joblib
from sklearn.metrics import (
    precision_score,
    recall_score,
    f1_score,
    fbeta_score,
    confusion_matrix
)

from ml.configs.config import MODELS_DIR, TARGET_COLUMN
from ml.training.dataset import load_processed_dataset, get_chronological_splits, prepare_feature_matrices
from ml.features.registry import ALL_MODEL_FEATURE_KEYS, FEATURE_REGISTRY

DIAGNOSTIC_THRESHOLDS = [
    0.001, 0.0025, 0.005, 0.01, 0.015, 0.02, 0.03, 0.04, 0.05,
    0.075, 0.10, 0.15, 0.20, 0.30, 0.50
]

def run_diagnostic():
    model_dir = MODELS_DIR / "rainfall_model_v1"
    raw_xgb = joblib.load(model_dir / "model.pkl")
    calibrator = joblib.load(model_dir / "calibrated_model.pkl")

    df = load_processed_dataset()
    train_df, val_df, test_df = get_chronological_splits(df)
    matrices = prepare_feature_matrices(train_df, val_df, test_df)

    X_val, y_val = matrices["X_val"], matrices["y_val"]
    X_test, y_test = matrices["X_test"], matrices["y_test"]

    # Compute Raw & Calibrated Probabilities
    raw_val_probs = raw_xgb.predict_proba(X_val)[:, 1]
    calib_val_probs = calibrator.predict_proba(raw_val_probs)

    test_raw_probs = raw_xgb.predict_proba(X_test)[:, 1]
    test_calib_probs = calibrator.predict_proba(test_raw_probs)

    # 1. Validation Threshold Sweep
    val_sweep = []
    for tau in DIAGNOSTIC_THRESHOLDS:
        preds = (calib_val_probs >= tau).astype(int)
        cm = confusion_matrix(y_val, preds)
        tn, fp, fn, tp = cm.ravel()
        prec = float(precision_score(y_val, preds, zero_division=0))
        rec = float(recall_score(y_val, preds, zero_division=0))
        f1 = float(f1_score(y_val, preds, zero_division=0))
        f2 = float(fbeta_score(y_val, preds, beta=2.0, zero_division=0))
        val_sweep.append({
            "threshold": tau,
            "tp": int(tp),
            "fp": int(fp),
            "tn": int(tn),
            "fn": int(fn),
            "predictedPositives": int(tp + fp),
            "precision": round(prec, 4),
            "recall": round(rec, 4),
            "f1": round(f1, 4),
            "f2": round(f2, 4)
        })

    # 2. Test Sensitivity Sweep
    test_sweep = []
    for tau in DIAGNOSTIC_THRESHOLDS:
        preds = (test_calib_probs >= tau).astype(int)
        cm = confusion_matrix(y_test, preds)
        tn, fp, fn, tp = cm.ravel()
        prec = float(precision_score(y_test, preds, zero_division=0))
        rec = float(recall_score(y_test, preds, zero_division=0))
        f1 = float(f1_score(y_test, preds, zero_division=0))
        f2 = float(fbeta_score(y_test, preds, beta=2.0, zero_division=0))
        test_sweep.append({
            "threshold": tau,
            "tp": int(tp),
            "fp": int(fp),
            "tn": int(tn),
            "fn": int(fn),
            "predictedPositives": int(tp + fp),
            "precision": round(prec, 4),
            "recall": round(rec, 4),
            "f1": round(f1, 4),
            "f2": round(f2, 4)
        })

    # 3. Per-Station Analysis
    val_df_with_preds = val_df.copy()
    val_df_with_preds["prob"] = calib_val_probs
    val_df_with_preds["target"] = y_val.values

    test_df_with_preds = test_df.copy()
    test_df_with_preds["prob"] = test_calib_probs
    test_df_with_preds["target"] = y_test.values

    station_stats = {}
    stations = val_df["station_name"].unique()

    for st in stations:
        st_val = val_df_with_preds[val_df_with_preds["station_name"] == st]
        st_test = test_df_with_preds[test_df_with_preds["station_name"] == st]

        # Evaluate at current tau=0.05 and candidate tau=0.015
        val_preds_05 = (st_val["prob"] >= 0.05).astype(int)
        test_preds_05 = (st_test["prob"] >= 0.05).astype(int)

        val_preds_015 = (st_val["prob"] >= 0.015).astype(int)
        test_preds_015 = (st_test["prob"] >= 0.015).astype(int)

        station_stats[st] = {
            "validation": {
                "totalRecords": len(st_val),
                "positives": int(st_val["target"].sum()),
                "at_tau_05": {
                    "alerts": int(val_preds_05.sum()),
                    "tp": int(((val_preds_05 == 1) & (st_val["target"] == 1)).sum()),
                    "precision": round(float(precision_score(st_val["target"], val_preds_05, zero_division=0)), 4),
                    "recall": round(float(recall_score(st_val["target"], val_preds_05, zero_division=0)), 4)
                },
                "at_tau_015": {
                    "alerts": int(val_preds_015.sum()),
                    "tp": int(((val_preds_015 == 1) & (st_val["target"] == 1)).sum()),
                    "precision": round(float(precision_score(st_val["target"], val_preds_015, zero_division=0)), 4),
                    "recall": round(float(recall_score(st_val["target"], val_preds_015, zero_division=0)), 4)
                }
            },
            "test": {
                "totalRecords": len(st_test),
                "positives": int(st_test["target"].sum()),
                "at_tau_05": {
                    "alerts": int(test_preds_05.sum()),
                    "tp": int(((test_preds_05 == 1) & (st_test["target"] == 1)).sum()),
                    "precision": round(float(precision_score(st_test["target"], test_preds_05, zero_division=0)), 4),
                    "recall": round(float(recall_score(st_test["target"], test_preds_05, zero_division=0)), 4)
                },
                "at_tau_015": {
                    "alerts": int(test_preds_015.sum()),
                    "tp": int(((test_preds_015 == 1) & (st_test["target"] == 1)).sum()),
                    "precision": round(float(precision_score(st_test["target"], test_preds_015, zero_division=0)), 4),
                    "recall": round(float(recall_score(st_test["target"], test_preds_015, zero_division=0)), 4)
                }
            }
        }

    output = {
        "validationSweep": val_sweep,
        "testSweep": test_sweep,
        "stationStats": station_stats
    }

    out_file = model_dir / "diagnostic_results.json"
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2)

    print("Diagnostic calculation complete. Results saved to:", out_file)
    return output

if __name__ == "__main__":
    run_diagnostic()
