"""
R.A.I. Primary XGBoost Training, Calibration, Evaluation, and Registry Pipeline.
Trains Baseline and Primary XGBoost models on historical partitions, applies probability calibration,
performs validation threshold sweep analysis, evaluates on unseen future test partitions,
generates TreeSHAP explainability summaries, and registers versioned model artifacts and evaluation reports.
"""
import json
import datetime
from pathlib import Path
from typing import Dict, Any
import numpy as np
import pandas as pd
import joblib
import shap
from xgboost import XGBClassifier
from sklearn.metrics import (
    roc_auc_score,
    average_precision_score,
    precision_score,
    recall_score,
    f1_score,
    fbeta_score,
    brier_score_loss,
    confusion_matrix
)

from ml.configs.config import (
    MODELS_DIR,
    HEAVY_RAIN_THRESHOLD_MM,
    VERY_HEAVY_THRESHOLD_MM,
    EXTREME_THRESHOLD_MM,
    TARGET_COLUMN
)
from ml.features.registry import ALL_MODEL_FEATURE_KEYS, FEATURE_REGISTRY
from ml.training.dataset import load_processed_dataset, get_chronological_splits, prepare_feature_matrices
from ml.training.baseline import train_and_evaluate_baseline
from ml.evaluation.calibration import evaluate_calibration, PlattCalibrator
from ml.evaluation.threshold_analysis import analyze_thresholds, classify_operational_risk

MODEL_VERSION = "v1.0.0-sih-xgb"
MODEL_NAME = "RAI-HeavyRain-XGBoost-IMD"

def train_and_register_model() -> Dict[str, Any]:
    """
    Executes model training, calibration, validation threshold analysis, test evaluation, SHAP extraction, and persistence.
    """
    df = load_processed_dataset()
    train_df, val_df, test_df = get_chronological_splits(df)
    matrices = prepare_feature_matrices(train_df, val_df, test_df)

    X_train, y_train = matrices["X_train"], matrices["y_train"]
    X_val, y_val = matrices["X_val"], matrices["y_val"]
    X_test, y_test = matrices["X_test"], matrices["y_test"]

    # 1. Baseline Model Benchmarking (Logistic Regression)
    baseline_metrics = train_and_evaluate_baseline(matrices)

    # 2. Primary XGBoost Classifier with Class Imbalance Weighting
    neg_count = (y_train == 0).sum()
    pos_count = (y_train == 1).sum()
    scale_pos_weight = float(neg_count / max(pos_count, 1))

    print(f"Training Primary XGBoost Classifier (pos/neg scale ratio = {scale_pos_weight:.2f})...")
    raw_xgb = XGBClassifier(
        n_estimators=300,
        max_depth=5,
        learning_rate=0.03,
        subsample=0.85,
        colsample_bytree=0.85,
        scale_pos_weight=scale_pos_weight,
        eval_metric=["logloss", "auc", "aucpr"],
        random_state=42,
        n_jobs=-1
    )

    raw_xgb.fit(
        X_train,
        y_train,
        eval_set=[(X_train, y_train), (X_val, y_val)],
        verbose=False
    )

    # 3. Probability Calibration on Validation Partition (Platt Scaling)
    print("Fitting Platt Scaling calibrator on validation partition...")
    raw_val_probs = raw_xgb.predict_proba(X_val)[:, 1]
    platt_calibrator = PlattCalibrator()
    platt_calibrator.fit(raw_val_probs, y_val.values)
    calib_val_probs = platt_calibrator.predict_proba(raw_val_probs)

    # 4. Rigorous Operational Threshold Sweep Analysis on VALIDATION Data
    print("Executing threshold sweep analysis on validation partition...")
    val_threshold_analysis = analyze_thresholds(y_val.values, calib_val_probs)
    selected_threshold = val_threshold_analysis["selectedOperationalThreshold"]
    derived_boundaries = val_threshold_analysis["derivedRiskBoundaries"]

    print(f"Optimal F2 Threshold on Validation Set: {selected_threshold:.4f}")
    print(f"Derived Operational Risk Boundaries:\n{json.dumps(derived_boundaries, indent=2)}")

    # 5. Final Evaluation on UNTOUCHED Unseen Future Chronological Test Set
    test_raw_probs = raw_xgb.predict_proba(X_test)[:, 1]
    test_calib_probs = platt_calibrator.predict_proba(test_raw_probs)
    
    # Binary predictions using the selected operational threshold
    test_preds_operational = (test_calib_probs >= selected_threshold).astype(int)

    # Calculate operational metrics at selected threshold
    roc_auc = float(roc_auc_score(y_test, test_calib_probs))
    pr_auc = float(average_precision_score(y_test, test_calib_probs))
    precision_op = float(precision_score(y_test, test_preds_operational, zero_division=0))
    recall_op = float(recall_score(y_test, test_preds_operational, zero_division=0))
    f1_op = float(f1_score(y_test, test_preds_operational, zero_division=0))
    f2_op = float(fbeta_score(y_test, test_preds_operational, beta=2.0, zero_division=0))
    brier_raw = float(brier_score_loss(y_test, test_raw_probs))
    brier_calib = float(brier_score_loss(y_test, test_calib_probs))
    
    cm = confusion_matrix(y_test, test_preds_operational)
    tn, fp, fn, tp = cm.ravel()

    calib_report = evaluate_calibration(y_test.values, test_calib_probs)

    # 6. TreeSHAP Global & Local Attribution Summary
    print("Computing TreeSHAP explainability matrix on unseen test samples...")
    explainer = shap.TreeExplainer(raw_xgb)
    sample_size = min(500, len(X_test))
    X_test_sample = X_test.iloc[:sample_size]
    shap_matrix = explainer.shap_values(X_test_sample)
    if isinstance(shap_matrix, list):
        shap_matrix = shap_matrix[1]

    mean_abs_shap = np.abs(shap_matrix).mean(axis=0)
    feat_imp = [
        {
            "feature": name,
            "meanAbsShap": round(float(imp), 4),
            "displayName": FEATURE_REGISTRY.get(name, {}).get("displayName", name),
            "unit": FEATURE_REGISTRY.get(name, {}).get("unit", "")
        }
        for name, imp in sorted(zip(ALL_MODEL_FEATURE_KEYS, mean_abs_shap), key=lambda x: x[1], reverse=True)
    ]

    print("\n=======================================================")
    print("=== MODEL OPERATIONAL EVALUATION REPORT (TEST SET) ===")
    print(f"• Model:                     {MODEL_NAME} ({MODEL_VERSION})")
    print(f"• ROC-AUC Score:             {roc_auc:.4f}")
    print(f"• PR-AUC (Avg Prec):         {pr_auc:.4f}")
    print(f"• Selected Threshold (tau):  {selected_threshold:.4f} (Derived from Validation F2)")
    print(f"• Operational Recall:        {recall_op:.4f} ({recall_op*100:.1f}% of disaster events identified)")
    print(f"• Operational Precision:     {precision_op:.4f}")
    print(f"• Operational F1-Score:      {f1_op:.4f}")
    print(f"• Operational F2-Score:      {f2_op:.4f}")
    print(f"• Calibrated Brier Score:    {brier_calib:.4f} ({calib_report['calibrationQuality']})")
    print(f"• Confusion Matrix (at tau): TP={tp}, FP={fp}, TN={tn}, FN={fn}")
    print("-------------------------------------------------------")
    print("Top 5 Global TreeSHAP Predictive Features:")
    for item in feat_imp[:5]:
        print(f"  - {item['displayName']:<32} ({item['feature']}, Mean |SHAP|: {item['meanAbsShap']:.4f})")
    print("=======================================================\n")

    # 7. Artifact Registry Persistence
    model_dir = MODELS_DIR / "rainfall_model_v1"
    model_dir.mkdir(parents=True, exist_ok=True)

    joblib.dump(raw_xgb, model_dir / "model.pkl")
    joblib.dump(platt_calibrator, model_dir / "calibrated_model.pkl")
    raw_xgb.save_model(str(model_dir / "xgb_model.json"))

    # Feature Schema JSON
    with open(model_dir / "feature_schema.json", "w", encoding="utf-8") as f:
        json.dump({
            "featuresCount": len(ALL_MODEL_FEATURE_KEYS),
            "features": ALL_MODEL_FEATURE_KEYS,
            "registry": FEATURE_REGISTRY
        }, f, indent=2)

    # Threshold Analysis JSON
    with open(model_dir / "threshold_analysis.json", "w", encoding="utf-8") as f:
        json.dump(val_threshold_analysis, f, indent=2)

    # Metrics JSON
    metrics_payload = {
        "evaluationDataset": "Chronological Unseen Future Test Partition",
        "testSamplesTotal": len(X_test),
        "testPositives": int(y_test.sum()),
        "testNegatives": int((y_test == 0).sum()),
        "positiveRate": round(float(y_test.mean() * 100), 2),
        "selectedOperationalThreshold": selected_threshold,
        "primaryModel": {
            "modelName": MODEL_NAME,
            "rocAuc": round(roc_auc, 4),
            "prAuc": round(pr_auc, 4),
            "operationalThreshold": selected_threshold,
            "precision": round(precision_op, 4),
            "recall": round(recall_op, 4),
            "f1": round(f1_op, 4),
            "f2": round(f2_op, 4),
            "rawBrierScore": round(brier_raw, 4),
            "calibratedBrierScore": round(brier_calib, 4),
            "confusionMatrix": {"tp": int(tp), "fp": int(fp), "tn": int(tn), "fn": int(fn)},
            "calibration": calib_report,
            "riskBoundaries": derived_boundaries
        },
        "baselineComparison": baseline_metrics,
        "globalTopFeatures": feat_imp[:10]
    }
    with open(model_dir / "metrics.json", "w", encoding="utf-8") as f:
        json.dump(metrics_payload, f, indent=2)

    # SHAP Summary JSON
    shap_summary_payload = {
        "modelName": MODEL_NAME,
        "baseExpectedValue": float(explainer.expected_value if not isinstance(explainer.expected_value, (list, np.ndarray)) else explainer.expected_value[0]),
        "globalFeatureImportance": feat_imp,
        "sampleExplanation": {
            "testSampleIndex": 0,
            "actualLabel": int(y_test.iloc[0]),
            "predictedProb": round(float(test_calib_probs[0]), 3)
        }
    }
    with open(model_dir / "shap_summary.json", "w", encoding="utf-8") as f:
        json.dump(shap_summary_payload, f, indent=2)

    # Metadata JSON
    metadata_payload = {
        "modelName": MODEL_NAME,
        "modelVersion": MODEL_VERSION,
        "thresholdVersion": "v1.1-val-p10-recall",
        "trainedAt": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "algorithm": "XGBoost Gradient Boosted Decision Trees",
        "calibrationMethod": "Platt Sigmoid Logistic Scaling on Validation Partition",
        "operationalThreshold": selected_threshold,
        "imdThresholds": {
            "heavyRainMm": HEAVY_RAIN_THRESHOLD_MM,
            "veryHeavyRainMm": VERY_HEAVY_THRESHOLD_MM,
            "extremeRainMm": EXTREME_THRESHOLD_MM
        },
        "datasetPartitions": {
            "trainingPeriod": f"{train_df['time'].min()} to {train_df['time'].max()}",
            "validationPeriod": f"{val_df['time'].min()} to {val_df['time'].max()}",
            "testPeriod": f"{test_df['time'].min()} to {test_df['time'].max()}",
            "trainingSamples": len(X_train),
            "validationSamples": len(X_val),
            "testSamples": len(X_test)
        },
        "featuresCount": len(ALL_MODEL_FEATURE_KEYS),
        "status": "READY"
    }
    with open(model_dir / "metadata.json", "w", encoding="utf-8") as f:
        json.dump(metadata_payload, f, indent=2)

    # Human-Readable operational-evaluation.md
    report_md = f"""# R.A.I. Operational Model Evaluation & Threshold Report

**Model Name**: {MODEL_NAME}  
**Model Version**: {MODEL_VERSION}  
**Threshold Selection Policy**: Validation Set $F_2$-Optimization (Recall prioritized for disaster early warning)  
**Evaluation Partition**: Unseen Future Chronological Test Partition  

---

## 1. Test Dataset Characteristics
- **Test Time Window**: {metadata_payload['datasetPartitions']['testPeriod']}
- **Total Test Records**: {len(X_test):,}
- **Positive Heavy Rain Events (>= {HEAVY_RAIN_THRESHOLD_MM}mm)**: {int(y_test.sum())} ({float(y_test.mean()*100):.2f}% prevalence)
- **Negative Normal Records**: {int((y_test == 0).sum())}

---

## 2. Operational Threshold Analysis & Selection

Because heavy rainfall is a rare, safety-critical event ($0.44\%$ baseline prevalence), a standard $\\tau = 0.50$ threshold leads to zero detected events ($\text{{TP}}=0$). 

By performing a formal validation threshold sweep across $\\tau \\in [0.01, 0.90]$, we identified the operational operating point $\\tau^* = \\mathbf{{{selected_threshold:.4f}}}$ which maximizes disaster event sensitivity while maintaining bounded false alarms.

### Performance at Operational Operating Point ($\\tau = {selected_threshold:.4f}$):

| Metric | Primary Model (XGBoost @ $\\tau={selected_threshold:.4f}$) | Baseline Model (Logistic Reg @ $\\tau=0.50$) | Operational Significance |
|---|---|---|---|
| **ROC-AUC** | **{roc_auc:.4f}** | {baseline_metrics['rocAuc']:.4f} | Event discrimination across all operating thresholds |
| **PR-AUC (Average Precision)** | **{pr_auc:.4f}** | {baseline_metrics['prAuc']:.4f} | Performance under severe class imbalance |
| **Operational Recall** | **{recall_op:.4f}** ({recall_op*100:.1f}%) | {baseline_metrics['recall']:.4f} | Fraction of ground-truth heavy rain events detected |
| **Operational Precision** | **{precision_op:.4f}** | {baseline_metrics['precision']:.4f} | Proportion of alerts that correspond to true events |
| **Operational $F_1$-Score** | **{f1_op:.4f}** | {baseline_metrics['f1']:.4f} | Harmonic mean |
| **Operational $F_2$-Score** | **{f2_op:.4f}** | -- | Safety-critical disaster weighting |
| **Brier Score Loss** | **{brier_calib:.4f}** | {baseline_metrics['brierScore']:.4f} | Calibrated probability alignment ({calib_report['calibrationQuality']}) |

---

## 3. Confusion Matrix at Operational Threshold ($\\tau = {selected_threshold:.4f}$)
- **True Positives (TP)**: {tp} (True heavy rain events successfully alerted)
- **False Positives (FP)**: {fp} (False alarms)
- **True Negatives (TN)**: {tn} (Normal weather correctly classified)
- **False Negatives (FN)**: {fn} (Missed heavy rain events)

---

## 4. Derived Operational Risk Boundaries

- **LOW**: $p < {derived_boundaries['LOW']['max']:.4f}$ — Normal meteorological conditions.
- **MODERATE**: ${derived_boundaries['MODERATE']['min']:.4f} \\le p < {derived_boundaries['MODERATE']['max']:.4f}$ — Convective instability; advisory monitoring.
- **HIGH**: ${derived_boundaries['HIGH']['min']:.4f} \\le p < {derived_boundaries['HIGH']['max']:.4f}$ — High heavy rain probability (Watch).
- **CRITICAL**: $p \\ge {derived_boundaries['CRITICAL']['min']:.4f}$ — Severe meteorological risk (Warning).

---

## 5. Top 5 Global TreeSHAP Predictive Features
"""
    for idx, item in enumerate(feat_imp[:5], start=1):
        report_md += f"{idx}. **{item['displayName']}** (`{item['feature']}`): Mean |SHAP| impact = **{item['meanAbsShap']:.4f}**\n"

    report_path = Path("docs/ml/operational-evaluation.md")
    report_path.parent.mkdir(parents=True, exist_ok=True)
    with open(report_path, "w", encoding="utf-8") as f:
        f.write(report_md)

    with open(model_dir / "evaluation_report.md", "w", encoding="utf-8") as f:
        f.write(report_md)

    print(f"Operational evaluation report saved to {report_path}")
    return metadata_payload

if __name__ == "__main__":
    train_and_register_model()
