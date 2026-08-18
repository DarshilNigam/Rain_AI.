# R.A.I. — Smart India Hackathon (SIH) Live Demo & Evaluation Guide

This guide provides the exact operational procedure for judges, evaluators, and demonstration teams to execute and present the R.A.I. (Rainfall Artificial Intelligence) platform.

---

## 1. Clean Environment Startup Procedure

Run these commands in two separate terminal windows from the repository root (`d:\rainainew`):

### Terminal 1: Python FastAPI ML & Explainable AI Backend Server
```powershell
# Activate Python Virtual Environment
.\.venv\Scripts\Activate.ps1

# Start the operational FastAPI inference server on port 8000
python -m uvicorn ml.server:app --host 127.0.0.1 --port 8000
```
> **Verification**: The server will start and log `Uvicorn running on http://127.0.0.1:8000`.

---

### Terminal 2: Frontend Client Development Server
```powershell
# Start Vite development server on port 3000
npm run dev
```
> **Verification**: Open `http://localhost:3000` in your web browser.

---

## 2. Environment Variables & Credentials

- **External API Keys**: **NONE REQUIRED**.
- **Data Ingestion**: Open-Meteo High-Resolution Numerical Weather Model & NASA GPM IMERG 0.1° Satellite grid are integrated via direct standard REST protocols without vendor lock-in or paid API dependencies.
- **Local Machine Learning**: Models (`model.pkl`, `calibrated_model.pkl`, `xgb_model.json`) and TreeSHAP explainers run locally in Python without cloud GPU dependencies.

---

## 3. Important Web Application Routes

| Route | Name & Purpose | Key Highlights to Show Judges |
|---|---|---|
| `/` | **R.A.I. Landing Page** | Architectural mission, 5-pillar overview, and system capabilities. |
| `/dashboard` | **Central Telemetry Hub** | Central Location Orb with live weather conditions for the user's saved node. |
| `/risk-map` | **Interactive Spatial Risk Map** | **Pillar 02 (Core SIH Showcase)**: RainViewer radar, 4-layer telemetry (Observed $\to$ Predicted $\to$ Explained $\to$ Operational Warning), dynamic city switching. |
| `/emergency` | **Emergency Management** | Civil defense protocols, flood danger levels, state disaster management contacts. |
| `/relief` | **Relief Logistics** | Verified civic supply distribution, emergency shelters, disaster coordination. |
| `/farmer` | **Farmer Command Center** | Radial command wheel, agronomic phenological stages, and localized rainfall alerts. |

---

## 4. Primary REST API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` / `POST` | `/api/prediction/heavy-rainfall` | Main inference endpoint returning probability, risk tier, TreeSHAP attributions, and warning package. |
| `GET` | `/api/model/explainability` | Returns 27 ranked global TreeSHAP features with mean absolute attributions and baseline expected values. |
| `GET` | `/api/model/thresholds` | Returns the validation threshold sweep analysis ($\tau \in [0.01, 0.90]$) and derived operational boundaries. |
| `GET` | `/api/model/multi-horizon` | Returns multi-horizon definitions and feasibility metadata (6h, 12h, 24h). |
| `GET` | `/api/model/status` | Lineage metadata, training sample count (122,800 records), and version. |
| `GET` | `/api/satellite/status` | NASA GPM IMERG 0.1° satellite grid telemetry for given coordinates. |

---

## 5. Recommended 5-Minute SIH Demo Sequence

### Step 1: Central Dashboard & Live Telemetry (`/dashboard`)
1. Point out the **Central Telemetry Orb** showing live atmospheric temperature, humidity, and weather conditions for the user's saved city node (e.g. Ahmedabad).
2. Explain the 5 Pillars of R.A.I. (Intelligence, Risk Map, Emergency, Relief, Farmer).

### Step 2: Core SIH Risk Map & Four-Layer Engine (`/risk-map`)
1. Navigate to `/risk-map`.
2. Demonstrate the **Interactive Map** with live **RainViewer precipitation radar** overlays.
3. Walk judges through the **Right-Hand Telemetry Panel**:
   - **Layer 1: OBSERVED** — Live surface temperature, precipitation rate, humidity, pressure, wind velocity, and cloud cover from Open-Meteo.
   - **Layer 2: PREDICTED** — Calibrated 24h Heavy Rain Probability ($p\%$), Operational Threshold ($\tau = 0.015$), and IMD Severity baseline ($\ge 64.5\text{ mm/day}$).
   - **Layer 3: EXPLAINED (TreeSHAP)** — Top mathematical feature drivers (e.g. Current Precipitation Rate, Monsoon Seasonality, Accumulated 24h Rain) showing exact positive/negative risk attributions.
   - **Layer 4: OPERATIONAL WARNING** — Actionable warning level (`NO_WARNING`, `ADVISORY`, `WATCH`, `WARNING`), tailored checklists, and official IMD disclaimer.

### Step 3: Interactive Location Switching & Spatial Invariance
1. Click on another city marker on the map (e.g. Mumbai, Chennai, Delhi, or Kolkata).
2. Show how the map smoothly centers, fetches live telemetry, and re-computes XGBoost + TreeSHAP attributions for the selected city.
3. Click **"Reset to My Location"** to demonstrate instant restoration of the saved profile node.

### Step 4: Scientific ML Rigor & Validation
1. Highlight that the model was trained on **175,440 real hourly records** (2023–2024) across 10 Indian climate stations with **strict zero-leakage** temporal splitting.
2. Explain how R.A.I. tackled severe class imbalance ($0.44\%$ baseline) through **validation-selected threshold optimization ($\tau^* = 0.0150$, 52.1% validation recall with $\ge 10\%$ precision)** and **calibrated Platt scaling** (Brier score: `0.0044`, `EXCELLENT`).

---

## 6. Resilience & Offline Fallback Procedure

If the venue Wi-Fi or external APIs (Open-Meteo/RainViewer) experience temporary latency:
1. The backend automatically switches to deterministic fallback climatology based on coordinates.
2. The UI displays clear telemetry status indicators rather than crashing.
3. All local TreeSHAP and XGBoost inference models execute completely locally without cloud dependencies.

---

## 7. Final Verification Suite

Run these automated verification commands prior to the live demonstration:

```powershell
# 1. Run all 16 Python Automated Unit, ML, and Smoke Tests
python -m pytest ml/tests

# 2. Run TypeScript strict typecheck
npm run typecheck

# 3. Build production bundle
npm run build
```
