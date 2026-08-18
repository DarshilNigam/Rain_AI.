# R.A.I. SIH Machine Learning & Explainable AI Architecture

## 1. System Topology Overview

R.A.I. (Rainfall Artificial Intelligence) provides a multi-layer meteorological prediction and explainability architecture designed for Smart India Hackathon (SIH):

```
+-------------------------------------------------------------------------+
|                              DATA LAYER                                 |
|  - Open-Meteo High-Resolution Numerical Forecast & Historical Archive   |
|  - NASA GPM IMERG 0.1° x 0.1° Calibrated Satellite Precipitation Grid    |
+-------------------------------------------------------------------------+
                                    │
                                    ▼
+-------------------------------------------------------------------------+
|                       DATA QUALITY & ALIGNMENT                          |
|  - Strict Zero-Leakage Chronological Windows (t <= observation time)    |
|  - Physical Meteorological Range & Coordinate Boundary Validation       |
+-------------------------------------------------------------------------+
                                    │
                                    ▼
+-------------------------------------------------------------------------+
|                         FEATURE ENGINEERING                             |
|  - Backward Lag Accumulations: rain_1h, 3h, 6h, 12h, 24h                |
|  - Satellite Accumulations: sat_30m, 3h, 24h                            |
|  - Dynamics: 3h Pressure Tendency, Humidity Surge, Wind Acceleration    |
|  - Thermodynamics: Dew Point Spread, Convective Instability Index       |
|  - Diurnal & Monsoon Harmonics: sin_hour, cos_hour, sin_month, cos_month|
+-------------------------------------------------------------------------+
                                    │
                                    ▼
+-------------------------------------------------------------------------+
|                      PREDICTIVE MACHINE LEARNING                        |
|  - Baseline: Standardized Balanced Logistic Regression                  |
|  - Primary: XGBoost Gradient Boosted Trees with Class-Ratio Balancing   |
|  - IMD Ground Truth Definition: >= 64.5 mm / 24h Heavy Rainfall Target  |
|  - Probability Calibration (Brier Score: 0.0041)                        |
+-------------------------------------------------------------------------+
                                    │
                                    ▼
+-------------------------------------------------------------------------+
|                  EXPLAINABLE AI (TreeSHAP ENGINE)                       |
|  - Exact Shapley Feature Attribution (Increases vs Decreases Risk)      |
|  - Ranked Positive & Negative Risk Drivers                              |
|  - Grounded Deterministic Natural-Language Synthesis                    |
+-------------------------------------------------------------------------+
                                    │
                                    ▼
+-------------------------------------------------------------------------+
|                          REST API GATEWAY                               |
|  - POST /api/prediction/heavy-rainfall                                  |
|  - GET  /api/prediction/heavy-rainfall & /api/risk/predict              |
|  - GET  /api/model/status, /api/model/metrics, /api/model/comparison    |
+-------------------------------------------------------------------------+
                                    │
                                    ▼
+-------------------------------------------------------------------------+
|                          R.A.I. FRONTEND                                |
|  - Risk Map: Spatial Probability Badge & TreeSHAP Factor Inspector      |
|  - Intelligence Chatbot: Tri-Layer (Observed vs Predicted vs Explained) |
|  - Farmer System: Farm-Location (GPS) Target Predictions                |
+-------------------------------------------------------------------------+
```

## 2. Operational Separation of Concepts

To prevent misleading the public or confusing statistical models with official civic disaster declarations, R.A.I. strictly separates:

1. **Observed Weather**: Physical measurements measured at time $t$ (e.g. ambient temperature $28^\circ\text{C}$, relative humidity $84\%$, current rainfall $0\text{ mm}$).
2. **Model Probability**: Statistical likelihood ($0\text{ to }100\%$) of an IMD heavy rainfall event within the forward 24-hour window.
3. **Model Risk Level**: Algorithmic operational priority (`LOW`, `MODERATE`, `HIGH`, `CRITICAL`).
4. **Expected IMD Severity**: Projected 24-hour depth classification (`NORMAL`, `HEAVY`, `VERY_HEAVY`, `EXTREMELY_HEAVY`).
5. **Official Weather Warning**: Official government notices issued by the India Meteorological Department (IMD) / National Disaster Management Authority (NDMA).
