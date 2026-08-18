# R.A.I. — OFFICIAL SIH1521 TECHNICAL VIVA GUIDE & STUDY MANUAL
## Problem Statement: SIH1521 — Explainable AI for Heavy/High-Impact Rainfall Prediction
**Version**: 1.0.0 (Master Pre-Deployment Freeze Baseline)  
**Workflow**: Local Python + React Development & Git/GitHub Version Control (NO DOCKER)  
**Target Audience**: All 6 Team Members (Clear, Accurate, Defensible)  

---

# TABLE OF CONTENTS
1. [Chapter 1: The Big Picture (What is R.A.I. & Why Does It Exist?)](#chapter-1-the-big-picture)
2. [Chapter 2: Core Philosophy (Observe -> Predict -> Explain -> Act)](#chapter-2-core-philosophy)
3. [Chapter 3: Complete Technology Stack (Verified Inventory)](#chapter-3-complete-technology-stack)
4. [Chapter 4: Project Structure & File Manifest](#chapter-4-project-structure)
5. [Chapter 5: Frontend Architecture (5 Core Pillars & Radar Map)](#chapter-5-frontend-architecture)
6. [Chapter 6: Backend Architecture (FastAPI & API Endpoints)](#chapter-6-backend-architecture)
7. [Chapter 7: Authentication, OTP & Security Architecture](#chapter-7-authentication-otp--security)
8. [Chapter 8: Machine Learning Pipeline (XGBoost & Data Splitting)](#chapter-8-machine-learning-pipeline)
9. [Chapter 9: Model Performance Metrics & Imbalance Analysis](#chapter-9-model-performance-metrics)
10. [Chapter 10: Operational Decision Threshold (Why tau = 0.015?)](#chapter-10-operational-decision-threshold)
11. [Chapter 11: Explainable AI & TreeSHAP Mathematics](#chapter-11-explainable-ai--treeshap)
12. [Chapter 12: Warning Engine & Farmer AI Knowledge Hub](#chapter-12-warning-engine--farmer-ai-hub)
13. [Chapter 13: Data Ingestion (Open-Meteo & NASA GPM IMERG)](#chapter-13-data-ingestion)
14. [Chapter 14: Database Architecture (Supabase Cloud PostgreSQL)](#chapter-14-database-architecture)
15. [Chapter 15: Running the Application Locally](#chapter-15-running-the-application-locally)
16. [Chapter 16: "Why Did We Choose This?" (Key Architectural Decisions)](#chapter-16-why-did-we-choose-this)
17. [Chapter 17: Rapid-Fire Viva Question Bank & Answers](#chapter-17-rapid-fire-viva-question-bank)
18. [Chapter 18: Top 20 Must-Know Questions for the Presentation](#chapter-18-top-20-must-know-questions)
19. [Chapter 19: 6-Member Team Role Distribution](#chapter-19-6-member-team-role-distribution)
20. [Chapter 20: 1-Page Master Cheat Sheet (Memorize This!)](#chapter-20-1-page-master-cheat-sheet)

---

# CHAPTER 1: THE BIG PICTURE

### 1. What is R.A.I.?
**R.A.I.** stands for **Rainfall Artificial Intelligence**.  
It is an operational meteorological intelligence platform that predicts **heavy rainfall 24 hours in advance** and explains **WHY** the model triggered that risk using **TreeSHAP Explainable AI**.

### 2. What problem does it solve?
- Extreme localized rainfall (cloudbursts, intense convective storms) causes urban waterlogging, flash floods, and agricultural devastation across India.
- Standard weather applications provide broad regional forecasts but fail to identify localized extreme precipitation events and treat predictions as an opaque black box.
- R.A.I. provides transparent, physics-grounded early warnings with exact feature attributions for citizens, emergency response authorities, and farmers.

### 3. What is the SIH Problem Statement?
- **Problem Statement Code**: `SIH1521`
- **Title**: *"Explainable AI for Heavy/High-Impact Rainfall Prediction"*
- **Target Event Definition**: Heavy rainfall accumulation **>= 64.5 mm/day** (the official India Meteorological Department / IMD classification standard).

---

# CHAPTER 2: CORE PHILOSOPHY

```
1. OBSERVE (Layer 1)
   Fetch high-resolution atmospheric physics from Open-Meteo & NASA GPM satellites.
                     |
                     v
2. PREDICT (Layer 2)
   Run calibrated XGBoost ML model to compute heavy rainfall probability p(x).
                     |
                     v
3. EXPLAIN (Layer 3)
   Apply TreeSHAP to compute exact additive feature attributions (positive & negative).
                     |
                     v
4. ACT (Layer 4)
   Map risk score to IMD-aligned operational warning levels & actionable checklists.
```

---

# CHAPTER 3: COMPLETE TECHNOLOGY STACK

### 1. Frontend Technologies (`src/`)
- **React (v18.3.1)**: Component-based UI framework.
- **TypeScript (v5.6.3)**: Strict static type checking across data contracts.
- **Vite (v6.0.1)**: High-speed frontend build tool and dev server (`http://localhost:3000`).
- **React Router DOM (v6.28.0)**: Client-side routing and protected route guards.
- **Leaflet (v1.9.4)**: Interactive mapping engine for city markers and radar overlays.
- **Lucide React (v0.468.0)**: Clean, lightweight iconography.
- **Vanilla CSS Modules**: Scoped component styles avoiding global collisions.
- **Custom Design Tokens**: Light futuristic design system (Apple / Linear style).

### 2. Backend Technologies (`ml/`)
- **Python (3.14.6 / 3.11+)**: Core language for data science and API services.
- **FastAPI (v0.141.1)**: High-performance asynchronous REST API framework (`http://127.0.0.1:8000`).
- **Uvicorn (v0.52.3)**: Production ASGI web server running FastAPI.
- **Pydantic (v2.13.4)**: Request and response data contract validation.
- **Requests & Httpx**: HTTP client libraries for external meteorological ingestion.
- **Pytest (v9.1.1)**: Automated test runner executing 26 unit and integration test cases.

### 3. Machine Learning & Explainable AI
- **XGBoost (v3.4.1)**: Gradient Boosted Decision Trees trained on 175,440 hourly records.
- **Scikit-Learn (v1.9.0)**: Platt Sigmoid probability calibration and metric evaluation.
- **SHAP (TreeSHAP v0.52.0)**: Exact game-theoretic Shapley additive feature attribution engine.
- **NumPy & Pandas**: Tabular feature processing and rolling window calculations.
- **Joblib (v1.5.3)**: High-performance model serialization (`model.pkl`, `calibrated_model.pkl`).

### 4. Cloud Database, Auth & External APIs
- **Supabase Cloud PostgreSQL**: Managed cloud relational database (6 tables).
- **PostgREST API**: RESTful query interface for Supabase.
- **Brevo Transactional API**: Email gateway delivering 6-digit OTP codes via verified Sender ID `1` (`RAINAIWORK@GMAIL.COM`).
- **Open-Meteo REST API**: Hourly 2m temperature, dew point, surface pressure, cloud cover, wind, precipitation.
- **NASA GPM IMERG 0.1 deg Grid**: Spaceborne microwave/IR precipitation data layer.
- **RainViewer Doppler Radar**: Live animated Doppler radar tile layer for Leaflet.

### 5. Collaboration & Version Control (NO DOCKER)
- **Git**: Local version control tracking all commits and baselines.
- **GitHub**: Remote repository for team collaboration, code reviews, and synchronization.

---

# CHAPTER 4: PROJECT STRUCTURE

```
d:/rainainew/
|-- src/                              # React 18 + TypeScript Frontend
|   |-- pages/                        # 5 Core Pillar Pages
|   |   |-- Home/                     # Landing page with dual CTAs & telemetry preview
|   |   |-- RiskMap/                  # MAIN SHOWCASE: 4-Layer Inspector & Doppler radar
|   |   |-- Dashboard/                # Central risk and location telemetry
|   |   |-- Emergency/                # Civil defense & river flood gauges
|   |   |-- Relief/                   # Community shelters & logistics
|   |   |-- Farmer/                   # Farmer command center & crop calendar
|   |   `-- Intelligence/             # [PROTECTED] Claude AI Assistant
|   |-- components/                   # UI components, layout shell, and map components
|   |-- context/                      # AuthContext, LocationContext, FarmerContext
|   `-- data/raiKnowledge/            # 35,857 agronomic records across 18 JSON files
|-- ml/                               # FastAPI + Machine Learning Backend
|   |-- server.py                     # Main FastAPI server entry point
|   |-- inference/service.py          # Feature assembly and XGBoost inference coordinator
|   |-- explainability/shap_engine.py # TreeSHAP calculation engine
|   |-- features/registry.py          # 27-feature formal meteorological registry
|   |-- auth/otp_engine.py            # Brevo OTP generation, salted HMAC, and verification
|   |-- db/client.py                  # Supabase Cloud PostgreSQL client
|   |-- models/rainfall_model_v1/     # model.pkl, calibrated_model.pkl, metrics.json
|   `-- tests/                        # 26 automated pytest unit & integration tests
|-- docs/                             # SIH1521 technical documentation, PDF, and HTML
`-- package.json                      # Frontend dependency manifest
```

---

# CHAPTER 5: FRONTEND ARCHITECTURE (5 PILLARS)

1. **Pillar 01 — Dashboard (`/dashboard`)**:
   - Central location telemetry displaying real-time temperature, humidity, pressure, and risk summary for the selected city.
2. **Pillar 02 — Interactive Risk Map (`/risk-map`) [MAIN SHOWCASE]**:
   - Real-time animated **RainViewer Doppler radar precipitation tiles**.
   - **4-Layer Telemetry Inspector**:
     - **Layer 1: Observed**: Real physical measurements (Temperature, Dew Point, Humidity, Pressure, Wind).
     - **Layer 2: Predicted**: Calibrated probability $p(x)$ against operational threshold $\tau = 0.015$.
     - **Layer 3: Explained**: TreeSHAP horizontal bar chart (factors increasing risk in orange/red, protective factors in blue).
     - **Layer 4: Operational**: Warning status (`NO_WARNING`, `ADVISORY`, `WATCH`, `WARNING`) and action checklists.
3. **Pillar 03 — Emergency Civil Defense (`/emergency`)**:
   - River flood gauge monitoring, danger water levels, and emergency helpline routing.
4. **Pillar 04 — Relief Logistics (`/relief`)**:
   - Verified community relief shelters, dry storage zones, and logistics supply routes.
5. **Pillar 05 — Farmer Command Center (`/farmer`)**:
   - Crop growth stage tracking, soil-grounded irrigation watch, and agronomic risk advisories.

---

# CHAPTER 6: BACKEND ARCHITECTURE & APIS

The FastAPI backend runs on `http://127.0.0.1:8000`.

### Key Endpoints:
- `GET /api/prediction/heavy-rainfall?latitude=...&longitude=...&city=...`: Executes live weather ingestion, feature extraction, calibrated inference, and TreeSHAP attribution.
- `GET /api/model/status`: Returns model version (`v1.0.0-sih-xgb`), threshold (`0.015`), and training lineage.
- `GET /api/model/explainability`: Returns global feature importance rankings across all 27 registered features.
- `POST /api/auth/register/initiate`: Creates user challenge and dispatches 6-digit OTP via Brevo email.
- `POST /api/auth/otp/verify`: Validates OTP hash, marks account verified, and issues session token.
- `POST /api/auth/login`: Authenticates returning users with 15-minute brute-force lockout protection.

---

# CHAPTER 7: AUTHENTICATION, OTP & SECURITY

1. **Cryptographic Salted OTP**:
   - 6-digit random code hashed using **HMAC-SHA256** with server-side salt.
   - Dispatched via Brevo API using verified Sender ID `1` (`RAINAIWORK@GMAIL.COM`).
   - Strict 5-minute expiry, max 5 attempts, and immediate single-use destruction (`is_consumed = TRUE`).
2. **Password Security**:
   - Salted SHA-256 with server pepper. Zero passwords stored in browser storage.
3. **Session Management**:
   - 256-bit cryptographic hex tokens (`secrets.token_hex(32)`).
   - Remember Me checked $\to$ `localStorage` (email string only).
   - Remember Me unchecked $\to$ `sessionStorage` (destroyed on tab close).
4. **IDOR Tenant Defense**:
   - Supabase authorization gates strictly isolate citizen vs. farmer plot datasets.

---

# CHAPTER 8: MACHINE LEARNING PIPELINE

### 1. Dataset & Zero-Leakage Partitions
The model was trained on **175,440 hourly meteorological records** spanning 2023 to 2024 across 10 diverse Indian climate zones:
- **Training Set (70%)**: 122,800 records (Jan 1, 2023 to May 26, 2024).
- **Validation Set (15%)**: 26,320 records (May 26, 2024 to Sep 13, 2024) — *Used for threshold selection and probability calibration*.
- **Test Set (15%)**: 26,320 records (Sep 13, 2024 to Dec 31, 2024) — *Held out for final performance verification*.

### 2. Feature Inventory (14 Production vs. 27 Registered Features)
- **14 Production Inference Features**: The exact vector passed to `model.pkl` (surface measurements, humidity, pressure, wind, past rainfall sums, evapotranspiration, and temperature extremes).
- **27 Registered Feature Schema**: The complete formal meteorological schema in `ml/features/registry.py` including backward lags (1h, 3h, 6h, 12h, 24h), satellite accumulations, 3-hour physical tendencies, thermodynamic proxies (`dew_point_spread`, `convective_energy_proxy`), and solar/monsoon harmonics.

---

# CHAPTER 9: MODEL PERFORMANCE METRICS

| Metric Name | Value | Correct Viva Interpretation |
| :--- | :---: | :--- |
| **ROC-AUC** | **0.9605** | **Discrimination Power**: Indicates exceptional ranking capability between heavy rain events and non-heavy rain days across all thresholds. *(Do not call this 96% accuracy)*. |
| **PR-AUC** | **0.1082** | **Precision-Recall Area**: Given an extreme baseline incidence of 0.44%, this represents a **24.6x lift over random guessing**. |
| **Calibrated Brier Score** | **0.0044** | **Probability Reliability**: Mean squared error between predicted probability and actual outcome. Rated **EXCELLENT**. |
| **Validation Recall (tau=0.015)** | **52.1%** | **Early Warning Catch Rate**: Successfully captures 52.1% of extreme rainfall events 24 hours ahead. |
| **Validation Precision (tau=0.015)** | **10.96%** | **Alert Reliability**: 1 in 9 alerts corresponds to >= 64.5 mm rain, with the remainder bringing moderate-to-heavy showers. |
| **Validation F2 Score** | **0.2975** | Weighs flood recall twice as heavily as false alarms. |

---

# CHAPTER 10: OPERATIONAL DECISION THRESHOLD (tau = 0.015)

- **The Class Imbalance Challenge**: Heavy rain (>= 64.5 mm/day) occurs on only **0.44% of days (1 in 227)**.
- **Why tau = 0.015 instead of 0.50?**: A default 50% cutoff predicts "NO RAIN" 365 days a year (0% recall). A calibrated probability of 1.5% represents a **3.4x surge over the historical base rate**.
- Setting $\tau = 0.0150$ on validation data catches **52.1% of flood events** while triggering alerts on only 7.32% of days.

### Risk Boundaries:
- **LOW** ($p < 0.75\%$): Atmospheric conditions unfavorable for heavy rain.
- **MODERATE** ($0.75\% \le p < 1.5\%$): Elevated moisture/instability; heightened monitoring.
- **HIGH** ($1.5\% \le p < 5.0\%$): **Threshold Breached [WATCH]** — High heavy rain probability.
- **CRITICAL** ($p \ge 5.0\%$): **Severe Danger [WARNING]** — Potential cloudburst / flood.

---

# CHAPTER 11: EXPLAINABLE AI & TreeSHAP

### 1. What TreeSHAP Does:
TreeSHAP computes the exact additive contribution of each atmospheric feature to the model's predicted risk score using game-theoretic Shapley values:
$$f(x) = \phi_0 + \sum_{i=1}^{M} \phi_i$$
- $\phi_0 = -4.852\text{ log-odds}$ (the expected average baseline across India).
- $\phi_i > 0$: Feature increased the model's predicted risk (e.g. High Dew Point $+0.41$).
- $\phi_i < 0$: Feature reduced the model's predicted risk (e.g. High Barometric Pressure $-0.28$).

### 2. Precise Viva Language:
> *"TreeSHAP explains the model's prediction by identifying which features contributed positively or negatively to the risk score. It does not claim physical causality."*

---

# CHAPTER 12: WARNING ENGINE & FARMER AI HUB

1. **Operational Warning Levels**:
   - `NO_WARNING` $\to$ `ADVISORY` $\to$ `WATCH` (Triggered at $\tau = 0.015$) $\to$ `WARNING` (Triggered at $p \ge 0.05$).
2. **Farmer AI Knowledge Hub**:
   - **35,857 verified agronomic records** across 18 JSON files in `src/data/raiKnowledge/`.
   - **$1.75\times$ Farmer Persona Boosting** for agricultural queries.
   - Understands Hindi/Hinglish agricultural terms (*sinchai*, *jalbharav*).
   - Grounds advice in specific soil types (Clayey vs. Sandy loam) and crop stages (Sowing, Vegetative, Flowering, Harvest).

---

# CHAPTER 13: DATA INGESTION

1. **Open-Meteo REST API**: Real-time hourly numerical weather forecast inputs for 2m temperature, dew point, surface pressure, cloud cover, wind speed, and precipitation.
2. **NASA GPM IMERG 0.1 deg Grid**: Satellite remote-sensing precipitation data.
3. **Offline Fallback Heuristics**: If external APIs are unreachable during a demo, R.A.I. automatically uses seasonal climatology fallbacks so the application never crashes.

---

# CHAPTER 14: DATABASE ARCHITECTURE

Supabase Cloud PostgreSQL hosts 6 relational tables:
1. `users`: UUID, email, salted password hash, role (`user`/`farmer`).
2. `sessions`: 256-bit token hash, expiry timestamp, revocation status.
3. `otp_challenges`: Salted HMAC code hash, attempts remaining (max 5), single-use status (`is_consumed`).
4. `farmer_profiles`: Village, district, soil type, irrigation source.
5. `farm_plots`: Plot name, acreage, active crop, coordinates.
6. `user_preferences`: Language (`en`/`hi`), default city node.

---

# CHAPTER 15: RUNNING THE APPLICATION LOCALLY

### Terminal 1 — Start FastAPI Backend:
```powershell
.\.venv\Scripts\Activate.ps1
python -m uvicorn ml.server:app --host 127.0.0.1 --port 8000
```

### Terminal 2 — Start React Frontend:
```powershell
npm run dev
```

- **Frontend URL**: `http://localhost:3000`
- **Backend Swagger Docs**: `http://127.0.0.1:8000/docs`

---

# CHAPTER 16: "WHY DID WE CHOOSE THIS?"

- **Why XGBoost over Deep Learning?** Tabular weather data performs best on Gradient Boosted Trees, runs efficiently on CPUs without GPUs, and supports exact TreeSHAP math.
- **Why TreeSHAP over LIME?** TreeSHAP provides exact, deterministic mathematical Shapley attributions without random sampling approximations.
- **Why Platt Probability Calibration?** Raw tree margins are distorted under severe class imbalance. Calibration ensures a 10% predicted probability matches a 10% empirical occurrence rate.
- **Why tau = 0.015 instead of 0.50?** Extreme events occur only 0.44% of the time. Setting $\tau = 0.015$ yields 52.1% recall rather than missing every flood.
- **Why Git + GitHub instead of Docker?** Direct local environments provide lightweight, instant execution and transparent debugging for our hackathon prototype.

---

# CHAPTER 17: RAPID-FIRE VIVA QUESTION BANK

1. **What is the SIH problem statement?** $\to$ SIH1521 (Explainable AI for Heavy Rainfall Prediction).
2. **What is the heavy rain definition?** $\to$ $\ge 64.5\text{ mm/day}$ (IMD Standard).
3. **What is the primary ML algorithm?** $\to$ XGBoost with Platt Sigmoid Probability Calibration.
4. **What is the operational decision threshold?** $\to$ $\tau = 0.0150$ ($1.5\%$ calibrated probability).
5. **What is the test ROC-AUC?** $\to$ 0.9605 (Measures ranking/discrimination power).
6. **What is the test PR-AUC?** $\to$ 0.1082 ($24.6\times$ lift over baseline).
7. **What is the calibrated Brier score?** $\to$ 0.0044 (Rated EXCELLENT reliability).
8. **What is the validation recall at $\tau=0.015$?** $\to$ 52.1% of heavy rainfall events caught.
9. **What Explainable AI method is used?** $\to$ TreeSHAP computing additive feature attributions.
10. **What is the base value $\phi_0$?** $\to$ $-4.852\text{ log-odds}$ (training distribution average).
11. **How many total records were used for training/testing?** $\to$ 175,440 hourly records.
12. **How many features are in the production model?** $\to$ 14 production inference features (27 in registry).
13. **What backend framework is used?** $\to$ Python FastAPI running on Uvicorn (Port 8000).
14. **What frontend stack is used?** $\to$ React 18 + TypeScript + Vite (Port 3000).
15. **What cloud database is used?** $\to$ Supabase Cloud PostgreSQL with 6 relational tables.
16. **How does OTP delivery work?** $\to$ 6-digit code, salted HMAC hash, sent via Brevo email (Sender ID 1).
17. **How many agronomic records are in Farmer AI?** $\to$ 35,857 records across 18 JSON files.
18. **How many automated backend tests exist?** $\to$ 26 pytest test cases (100% passing).
19. **How is version control managed?** $\to$ Git + GitHub.
20. **What makes R.A.I. unique?** $\to$ It transforms black-box predictions into transparent, physics-grounded civil actions.

---

# CHAPTER 18: TOP 20 MUST-KNOW QUESTIONS FOR THE PRESENTATION

*(Refer to Chapter 17 for detailed answers to the 20 primary presentation questions)*.

---

# CHAPTER 19: 6-MEMBER TEAM ROLE DISTRIBUTION

```
Member 1: Team Lead & Presentation -> SIH1521 Mission, 5 Pillars, UI Demonstration
Member 2: ML & Data Lead           -> XGBoost, Calibration, Data Splitting, Metrics
Member 3: Explainable AI Lead      -> TreeSHAP Mathematics, Feature Attributions
Member 4: Frontend Lead            -> React 18, 4-Layer Inspector, Doppler Radar
Member 5: Backend & API Lead       -> FastAPI, Pydantic Models, Weather Ingestion
Member 6: Security & Cloud Lead    -> Supabase PostgreSQL, Brevo OTP, Git/GitHub
```

---

# CHAPTER 20: 1-PAGE MASTER CHEAT SHEET

```
+-----------------------------------------------------------------------------+
|                      R.A.I. 1-PAGE VIVA MASTER CHEAT SHEET                  |
+-------------------+---------------------------------------------------------+
| Problem Statement | SIH1521 - Explainable AI for Heavy Rainfall Prediction   |
| Heavy Rain Cutoff | >= 64.5 mm / 24 hours (IMD Standard)                    |
| Historical Freq.  | 0.44% of days (Severe Class Imbalance: 1 in 227)        |
| ML Algorithm      | XGBoost + Platt Sigmoid Probability Calibration         |
| Operating Point   | tau = 0.015 (1.5% probability) -> 52.1% Flood Recall   |
| ROC-AUC / PR-AUC  | ROC-AUC: 0.9605 | PR-AUC: 0.1082 (24.6x Baseline Lift)  |
| Brier Score       | 0.0044 (Rated EXCELLENT Probability Reliability)        |
| XAI Engine        | TreeSHAP (Additive Shapley Feature Attributions)        |
| 4-Layer Inspector | Observed -> Predicted -> Explained -> Operational Action|
| Data Feeds        | Open-Meteo NWP + NASA GPM IMERG 0.1 deg Satellite Grid  |
| Full Stack Ports  | React 18 (Port 3000) <-> Python FastAPI (Port 8000)     |
| Cloud Database    | Supabase Managed PostgreSQL (6 Relational Tables)       |
| OTP Delivery      | Brevo Transactional Email REST API (Sender ID: 1)       |
| Farmer AI Hub     | 35,857 Records, 1.75x Persona Boost, Hinglish Synonyms  |
| Version Control   | Git + GitHub (Direct Local Environments - NO DOCKER)    |
| Verified Tests    | 26 / 26 Backend Pytest Tests Passed (100% Pass Rate)    |
+-------------------+---------------------------------------------------------+
```
