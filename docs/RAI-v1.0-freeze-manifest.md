**Freeze Date**: August 17, 2026  
**Status**: OFFICIALLY FROZEN & VERIFIED  
**Version**: `1.0.0-sih-prod` / `v1.0.0-sih-xgb`  
**Git Commit**: `47c7fa3eb1a7c30fbfc36027a669b999744eb239`  
**Git Branch**: `master`

---

## 1. Executive Summary & Purpose

This manifest documents the frozen, production-ready state of the **R.A.I. (Rainfall Artificial Intelligence)** system prior to external deployment. The application has achieved a 100% pass rate across all verification suites, establishing an authoritative baseline for operational inference, multi-tenant persistence, and defensive security.

---

## 2. Frozen ML / XAI Intelligence Artifacts

| Component | Artifact Path / Specification | Verification Status |
| :--- | :--- | :--- |
| **Model Weight File** | `ml/models/rainfall_model_v1/model.pkl` (573.8 KB) | **Frozen & Untouched** |
| **Model Type** | `XGBClassifier` (Gradient Boosted Decision Trees) | **Frozen & Untouched** |
| **Calibrator** | `ml/models/rainfall_model_v1/calibrated_model.pkl` (Isotonic Probability Calibrator) | **Frozen & Untouched** |
| **Feature Signature** | 14-Feature Production Signature (`precipitation_sum`, `dew_point_2m_mean`, etc.) | **Frozen & Untouched** |
| **Operational Threshold** | $\tau = 0.015$ (1.5% calibrated probability trigger point) | **Frozen & Untouched** |
| **Explainability Engine** | TreeSHAP exact additive attribution (`ml/explainability/shap_engine.py`) | **Frozen & Untouched** |
| **Meteorological Baseline** | Open-Meteo Historical & Forecast API schemas (`ml/weather_service.py`) | **Frozen & Untouched** |
| **Risk Classification** | IMD Heavy ($64.5\text{ mm}$), Very Heavy ($115.6\text{ mm}$), Extreme ($204.5\text{ mm}$) | **Frozen & Untouched** |
| **Master Knowledge Base** | 18 Structured JSON Partitions, **35,857 domain records** (`src/data/raiKnowledge/`) | **Frozen & Untouched** |
| **Farmer AI Engine** | 1.75x Persona Category Boosting, Soil/Crop Grounding, Multilingual Synonyms | **Frozen & Untouched** |

---

## 3. Test & Verification Summary Matrix

| Suite | Tests Executed | Passed | Failed | Status |
| :--- | :---: | :---: | :---: | :---: |
| **Live Cloud Supabase PostgreSQL E2E** | 23 | 23 | 0 | **PASS (100%)** |
| **Authentication & Remember-Me Hardening** | 19 | 19 | 0 | **PASS (100%)** |
| **Production Defensive Security Audit** | 39 | 39 | 0 | **PASS (100%)** |
| **Production-Readiness Hardening Suite** | 41 | 41 | 0 | **PASS (100%)** |
| **Backend ML & Operational Pytest** | 26 | 26 | 0 | **PASS (100%)** |
| **Frontend Production Build (`vite build`)** | 1,758 modules | 1,758 | 0 | **PASS (100%)** |
| **Total Cumulative Verifications** | **148** | **148** | **0** | **PASS (100%)** |

---

## 4. Live Cloud & Service Integrations

### A. Supabase Managed PostgreSQL
- **Mode**: Cloud PostgreSQL (`is_supabase_active == True`)
- **Tables Enforced**: `users`, `sessions`, `otp_challenges`, `farmer_profiles`, `farm_plots`, `user_preferences`
- **Security**: Service role access restricted strictly to FastAPI backend. React frontend has zero direct database connectivity.
- **Multi-Tenancy**: Strict IDOR prevention isolating Citizen vs. Farmer A vs. Farmer B data.

### B. Brevo Transactional Email OTP
- **Mode**: `API_EMAIL` (Real live email delivery)
- **Sender Binding**: Verified Sender ID: `1` (`RAINAIWORK@GMAIL.COM`)
- **Delivery Protocol**: Dynamic sender verification, automated bounce suppression clearing, and 5-minute single-use HMAC challenge lifecycle.
- **Privacy**: Zero plaintext OTPs or dev codes emitted in production responses or application logs.

### C. Client Storage & Authentication
- **Remember Me ON**: Session stored in `localStorage`, non-sensitive email remembered in `rai_remembered_email`.
- **Remember Me OFF**: Session stored in `sessionStorage` only, destroyed upon browser close.
- **Password Security**: Passwords immediately cleared from memory upon submission; zero passwords stored in browser storage.

---

## 5. Local Backup Archive

- **Archive File**: `backups/R.A.I.-v1.0-predeployment-backup.zip`
- **Total Files**: 331 source files
- **Uncompressed Size**: 107.65 MB
- **Archive Size**: 20.98 MB
- **Exclusions**: `node_modules`, `.venv`, `dist`, `.env`, secrets, caches, and scratch scripts.

---

## 6. Known Production Limitations & Boundaries

1. **Weather Data Ingestion**: Relies on Open-Meteo REST API availability; fallback heuristics activate if external weather API is degraded.
2. **Brevo Account Free Tier**: Free tier has an allocation of 300 transactional emails/day. For high-volume deployment, account upgrade or dedicated SMTP pool is required.
3. **Single FastAPI Worker on Local**: Currently running single Uvicorn worker for local development; multi-worker Gunicorn configuration should be utilized in cloud container environments.

---

## 7. Baseline Preservation Notice

Any future deployment configuration, containerization, or hosting change must maintain 100% equivalence with this frozen manifest. Under no circumstances should ML models, thresholds, or security policies be altered during deployment.
