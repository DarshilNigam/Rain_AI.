# R.A.I. Training Pipeline & Model Registry

## 1. Primary Model Specification

- **Algorithm**: XGBoost Gradient Boosted Decision Trees (`XGBClassifier`)
- **Hyperparameters**:
  - `n_estimators`: 300
  - `max_depth`: 5
  - `learning_rate`: 0.03
  - `subsample`: 0.85
  - `colsample_bytree`: 0.85
  - `scale_pos_weight`: 613.0 (Class imbalance balancing ratio)
- **Probability Calibration**: Platt Scaling via Sigmoidal Logistic Regression over validation partition logits.

---

## 2. Artifact Directory Structure

Model artifacts persisted to `ml/models/rainfall_model_v1/`:
- `model.pkl`: Serialized XGBoost model object.
- `calibrated_model.pkl`: Serialized Platt Scaler.
- `xgb_model.json`: Portable JSON XGBoost tree representation.
- `feature_schema.json`: Formal feature names and registry definitions.
- `metrics.json`: Evaluated metrics on unseen future test partition.
- `shap_summary.json`: Global TreeSHAP feature importance and base value.
- `metadata.json`: Model versioning and dataset partition metadata.
- `evaluation_report.md`: Human-readable benchmark report.
