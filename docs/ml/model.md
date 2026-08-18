# R.A.I. Model Architecture & Training Methodology

## 1. Target Definition (IMD Baseline)

In compliance with India Meteorological Department standards:
- **Heavy Rainfall Event Target ($y = 1$)**: 24-hour accumulated rainfall $\ge 64.5\text{ mm/day}$.
- **Severity Tiers**:
  - `NORMAL`: $< 64.5\text{ mm/day}$
  - `HEAVY`: $64.5 \le R < 115.6\text{ mm/day}$
  - `VERY_HEAVY`: $115.6 \le R < 204.5\text{ mm/day}$
  - `EXTREMELY_HEAVY`: $\ge 204.5\text{ mm/day}$

---

## 2. Model Candidates & Selection

1. **Baseline Model**: Scaled Logistic Regression with balanced class weighting.
2. **Primary Model**: XGBoost Gradient Boosted Decision Trees (`n_estimators=250`, `max_depth=5`, `learning_rate=0.04`, `scale_pos_weight=613.0`).

---

## 3. Chronological Temporal Partition

Time-series rainfall data is split strictly chronologically:
- **Training Set (70%)**: 122,800 records (2023-01-01 to 2024-05-26)
- **Validation Set (15%)**: 26,320 records (2024-05-26 to 2024-09-13)
- **Unseen Future Test Set (15%)**: 26,320 records (2024-09-13 to 2024-12-31)
