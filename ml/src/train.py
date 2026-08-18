"""
R.A.I. Rainfall Model Training & Evaluation Pipeline.
Trains an XGBoost / Gradient Boosted Trees classifier with time-aware evaluation,
ROC-AUC, Precision, Recall, F1, PR-AUC, confusion matrix, calibration analysis, and artifact persistence.
"""
import json
import datetime
from pathlib import Path
from typing import Dict, Any
import numpy as np
import pandas as pd
import joblib
from xgboost import XGBClassifier
from sklearn.metrics import (
    roc_auc_score,
    precision_score,
    recall_score,
    f1_score,
    average_precision_score,
    confusion_matrix,
    brier_score_loss,
    classification_report
)

from ml.src.config import (
    MODELS_DIR,
    METADATA_DIR,
    ALL_MODEL_FEATURES,
    TARGET_COLUMN,
    HEAVY_RAINFALL_THRESHOLD_MM
)
from ml.src.dataset import load_processed_dataset, get_chronological_splits, prepare_feature_matrices

MODEL_VERSION = "v1.0.0-xgb"
MODEL_NAME = "RAI-HeavyRain-XGBoost"

def train_and_evaluate_model() -> Dict[str, Any]:
    """
    Executes model training, validation, testing, metric computation, and model serialization.
    """
    df = load_processed_dataset()
    train_df, val_df, test_df = get_chronological_splits(df)
    matrices = prepare_feature_matrices(train_df, val_df, test_df)

    X_train, y_train = matrices["X_train"], matrices["y_train"]
    X_val, y_val = matrices["X_val"], matrices["y_val"]
    X_test, y_test = matrices["X_test"], matrices["y_test"]

    # Calculate scale_pos_weight for handling meteorological class imbalance
    neg_count = (y_train == 0).sum()
    pos_count = (y_train == 1).sum()
    scale_pos_weight = float(neg_count / max(pos_count, 1))

    print(f"Initializing XGBoost Classifier (pos/neg weight ratio = {scale_pos_weight:.2f})...")
    model = XGBClassifier(
        n_estimators=200,
        max_depth=5,
        learning_rate=0.05,
        subsample=0.85,
        colsample_bytree=0.85,
        scale_pos_weight=scale_pos_weight,
        eval_metric=["logloss", "auc", "aucpr"],
        random_state=42,
        n_jobs=-1
    )

    print("Fitting model on training set...")
    model.fit(
        X_train,
        y_train,
        eval_set=[(X_train, y_train), (X_val, y_val)],
        verbose=False
    )

    # Predictions and Probabilities on Unseen Future Test Set
    test_probs = model.predict_proba(X_test)[:, 1]
    test_preds = (test_probs >= 0.50).astype(int)

    # Comprehensive Evaluation Metrics
    roc_auc = float(roc_auc_score(y_test, test_probs))
    pr_auc = float(average_precision_score(y_test, test_probs))
    precision = float(precision_score(y_test, test_preds, zero_division=0))
    recall = float(recall_score(y_test, test_preds, zero_division=0))
    f1 = float(f1_score(y_test, test_preds, zero_division=0))
    brier = float(brier_score_loss(y_test, test_probs))
    cm = confusion_matrix(y_test, test_preds)
    tn, fp, fn, tp = cm.ravel()

    # Feature Importance Analysis
    importances = model.feature_importances_
    feat_imp = [
        {"feature": name, "importance": float(imp)}
        for name, imp in sorted(zip(ALL_MODEL_FEATURES, importances), key=lambda x: x[1], reverse=True)
    ]

    print("\n=======================================================")
    print("=== MODEL EVALUATION REPORT (UNSEEN FUTURE TEST SET) ===")
    print(f"• Model:             {MODEL_NAME} ({MODEL_VERSION})")
    print(f"• ROC-AUC Score:     {roc_auc:.4f}")
    print(f"• PR-AUC (Avg Prec): {pr_auc:.4f}")
    print(f"• Precision:         {precision:.4f}")
    print(f"• Recall:            {recall:.4f} (High recall prioritized for heavy rain warning safety)")
    print(f"• F1-Score:          {f1:.4f}")
    print(f"• Brier Score:       {brier:.4f} (Calibration loss)")
    print(f"• Confusion Matrix:  TP={tp}, FP={fp}, TN={tn}, FN={fn}")
    print("-------------------------------------------------------")
    print("Top 5 Predictive Features:")
    for item in feat_imp[:5]:
        print(f"  - {item['feature']:<28} (Importance: {item['importance']:.4f})")
    print("=======================================================\n")

    # Serialize Model Artifact
    model_artifact_path = MODELS_DIR / "heavy_rain_model_v1.pkl"
    joblib.dump(model, model_artifact_path)
    
    # Also save native XGBoost JSON
    xgb_json_path = MODELS_DIR / "xgb_model.json"
    model.save_model(str(xgb_json_path))

    # Construct Metadata Payload
    metadata = {
        "modelName": MODEL_NAME,
        "modelVersion": MODEL_VERSION,
        "trainedAt": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "algorithm": "XGBoost Gradient Boosted Trees",
        "targetDefinition": f"Precipitation >= {HEAVY_RAINFALL_THRESHOLD_MM}mm in forward 24h horizon",
        "thresholdMm": HEAVY_RAINFALL_THRESHOLD_MM,
        "trainingRecords": int(len(X_train)),
        "validationRecords": int(len(X_val)),
        "testRecords": int(len(X_test)),
        "featuresCount": len(ALL_MODEL_FEATURES),
        "featuresList": ALL_MODEL_FEATURES,
        "evaluation": {
            "rocAuc": round(roc_auc, 4),
            "prAuc": round(pr_auc, 4),
            "precision": round(precision, 4),
            "recall": round(recall, 4),
            "f1": round(f1, 4),
            "brierScore": round(brier, 4),
            "confusionMatrix": {
                "truePositives": int(tp),
                "falsePositives": int(fp),
                "trueNegatives": int(tn),
                "falseNegatives": int(fn)
            }
        },
        "topFeatures": feat_imp[:8],
        "dataSources": [
            "Open-Meteo Historical Archive",
            "NASA GPM IMERG Calibrated Satellite Grid",
            "Open-Meteo High-Resolution Forecast Engine"
        ],
        "status": "READY"
    }

    metadata_path = METADATA_DIR / "model_metadata_v1.json"
    with open(metadata_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)

    print(f"Model serialized to {model_artifact_path}")
    print(f"Metadata written to {metadata_path}\n")

    return metadata

if __name__ == "__main__":
    train_and_evaluate_model()
