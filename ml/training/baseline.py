"""
R.A.I. Baseline Model Training & Evaluation.
Trains a scaled Logistic Regression baseline for transparent model benchmarking.
"""
from typing import Dict, Any
import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.metrics import (
    roc_auc_score,
    average_precision_score,
    precision_score,
    recall_score,
    f1_score,
    brier_score_loss,
    confusion_matrix
)

def train_and_evaluate_baseline(matrices: Dict[str, Any]) -> Dict[str, Any]:
    """
    Fits and evaluates a Logistic Regression baseline model.
    """
    X_train, y_train = matrices["X_train"], matrices["y_train"]
    X_test, y_test = matrices["X_test"], matrices["y_test"]

    pipeline = Pipeline([
        ("scaler", StandardScaler()),
        ("clf", LogisticRegression(class_weight="balanced", max_iter=1000, random_state=42))
    ])

    print("Training Logistic Regression baseline...")
    pipeline.fit(X_train, y_train)

    test_probs = pipeline.predict_proba(X_test)[:, 1]
    test_preds = (test_probs >= 0.50).astype(int)

    roc_auc = float(roc_auc_score(y_test, test_probs))
    pr_auc = float(average_precision_score(y_test, test_probs))
    precision = float(precision_score(y_test, test_preds, zero_division=0))
    recall = float(recall_score(y_test, test_preds, zero_division=0))
    f1 = float(f1_score(y_test, test_preds, zero_division=0))
    brier = float(brier_score_loss(y_test, test_probs))
    cm = confusion_matrix(y_test, test_preds)
    tn, fp, fn, tp = cm.ravel()

    results = {
        "modelName": "Logistic Regression Baseline",
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
    }

    print("=== LOGISTIC REGRESSION BASELINE EVALUATION ===")
    print(f"• ROC-AUC:  {roc_auc:.4f}")
    print(f"• PR-AUC:   {pr_auc:.4f}")
    print(f"• Recall:   {recall:.4f}")
    print(f"• F1-Score: {f1:.4f}")
    print("==============================================\n")

    return results
