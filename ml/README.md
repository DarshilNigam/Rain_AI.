# R.A.I. — SIH Machine Learning & Explainable AI Pipeline

This directory contains the complete, reproducible Heavy Rainfall Prediction and TreeSHAP Explainability service for R.A.I.

---

## Quickstart & Reproducibility Guide

### 1. Environment Setup
```powershell
# Create and activate Python virtual environment
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# Install required dependencies
pip install numpy pandas scikit-learn xgboost shap fastapi uvicorn requests joblib pyarrow pytest httpx
```

### 2. Ingestion & Alignment
```powershell
# Ingest 175,440 real hourly meteorological records (2023-2024) across 10 Indian climate stations
python -m ml.pipelines.ingestion

# Run feature engineering, 3h tendencies, and IMD target labeling
python -m ml.features.engineering
```

### 3. Model Training & Benchmarking
```powershell
# Train baseline Logistic Regression & Primary XGBoost models with calibration
python -m ml.training.train_xgb
```

### 4. Run Automated Test Suite
```powershell
# Execute 10 automated unit and end-to-end smoke tests
python -m pytest ml/tests
```

### 5. Start Real-Time Prediction API Server
```powershell
# Start FastAPI inference server on port 8000
python -m uvicorn ml.server:app --host 127.0.0.1 --port 8000
```

---

## API Reference

### `POST /api/prediction/heavy-rainfall`
**Request Body**:
```json
{
  "latitude": 23.0225,
  "longitude": 72.5714,
  "city": "Ahmedabad",
  "horizonHours": 24
}
```

**Response Payload**:
```json
{
  "location": {
    "latitude": 23.0225,
    "longitude": 72.5714,
    "city": "Ahmedabad"
  },
  "prediction": {
    "probability": 0.0,
    "riskLevel": "LOW",
    "severity": "NORMAL",
    "horizonHours": 24,
    "imdClassification": {
      "heavyRainThresholdMm": 64.5,
      "veryHeavyThresholdMm": 115.6,
      "extremeThresholdMm": 204.5,
      "status": "NORMAL"
    }
  },
  "observations": {
    "temperature": 27.3,
    "relativeHumidity": 86.0,
    "surfacePressure": 999.4,
    "cloudCover": 100.0,
    "currentRainRate": 0.0,
    "windSpeed": 10.0
  },
  "features": {
    "forecast24hAccumulation": 4.7,
    "peakProbability24h": 92.0,
    "pressureTendency3h": -0.1
  },
  "explanation": {
    "deterministicSummary": "R.A.I. estimates low heavy-rainfall probability (0%, LOW model risk) for Ahmedabad. Atmospheric stability is maintained by Forecast 24h Rain Accumulation (4.7 mm), Peak 24h Rain Probability (92.0 %).",
    "topFactors": [...],
    "positiveContributors": [...],
    "negativeContributors": [...]
  },
  "model": {
    "name": "RAI-HeavyRain-XGBoost-IMD",
    "version": "v1.0.0-sih-xgb"
  },
  "sources": [
    "Open-Meteo High-Resolution Numerical Forecast",
    "NASA GPM IMERG Calibrated Satellite Grid",
    "R.A.I. Real-Time Feature Engineering Pipeline"
  ]
}
```
