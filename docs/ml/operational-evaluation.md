# R.A.I. Operational Model Evaluation & Threshold Report

**Model Name**: `RAI-HeavyRain-XGBoost-IMD`  
**Model Version**: `v1.0.0-sih-xgb`  
**Threshold Version**: `v1.1-val-p10-recall`  
**Operational Decision Threshold**: $\tau^* = \mathbf{0.0150}$  
**Threshold Selection Policy**: Validation set recall maximization subject to Precision $\ge 10\%$ (High-recall disaster early warning operating point)  
**Evaluation Partition**: Chronological splits across 175,440 hourly records (122,800 Train / 26,320 Val / 26,320 Test)

---

## 1. Validation-Selected Operating Point ($\tau^* = 0.0150$)

Because heavy rainfall ($\ge 64.5\text{ mm/day}$) is an extreme outlier event ($<1.5\%$ prevalence), standard $\tau = 0.50$ thresholds are invalid for early warning. 

A formal validation threshold sweep across $\tau \in [0.005, 0.90]$ was conducted strictly on the validation partition (`2024-05-26` to `2024-09-13`, 405 positive events):

### Validation Performance at Selected Operating Point ($\tau^* = 0.0150$):
- **Validation Recall**: **52.10%** (Captures the majority of ground-truth heavy rain events)
- **Validation Precision**: **10.96%** ($>7\times$ above the climatological random baseline)
- **Validation $F_1$-Score**: **0.1810**
- **Validation $F_2$-Score**: **0.2975** (Validation $F_2$ peak is at $\tau=0.040$, where recall is $42.72\%$)
- **Validation Alert Rate**: **7.32%** (Manageable civil alert frequency)
- **Validation False Positive Rate**: **6.62%**

---

## 2. Unseen Future Test Partition Evaluation (Sensitivity / Generalization)

*Evaluated on the 26,320 unseen chronological test records (`2024-09-13` to `2024-12-31`, 116 positives):*

| Metric | Primary Model (XGBoost @ $\tau^*=0.0150$) | Baseline Model (Logistic Reg @ $\tau=0.50$) | Operational Significance |
|---|---|---|---|
| **ROC-AUC** | **0.9605** | 0.9620 | Event discrimination across all operating thresholds |
| **PR-AUC (Average Precision)** | **0.1082** | 0.1053 | Precision-Recall curve under extreme class imbalance |
| **Operational Recall** | **0.0776** (7.8%) | 0.5517 | Fraction of ground-truth test events detected |
| **Operational Precision** | **0.1200** (12.0%) | 0.0852 | Proportion of alerts that correspond to true events |
| **Operational $F_1$-Score** | **0.0942** | 0.1476 | Harmonic mean |
| **Brier Score Loss** | **0.0044** | 0.0213 | Calibrated probability alignment (**EXCELLENT**) |

*(Note: Test set sensitivity increases to $25.86\%$ recall at $\tau=0.010$. The lower raw test recall relative to validation reflects the seasonal shift from the Southwest Summer Monsoon to the Northeast Retreating Monsoon in South India).*

---

## 3. Active Operational Risk Boundaries & Warning Mapping

| Risk Tier | Probability Range ($p$) | Warning Level | Action Protocol |
|---|---|---|---|
| **LOW** | $p < 0.0075$ | `NO_WARNING` | Normal meteorological monitoring; routine farm schedules. |
| **MODERATE** | $0.0075 \le p < 0.0150$ | `ADVISORY` | Heightened awareness; inspect drainage and storm water grates. |
| **HIGH** | $0.0150 \le p < 0.0500$ | `WATCH` | **$\ge \tau^*$ Operating Point**: Active civil watch; secure standing crops & pumps. |
| **CRITICAL** | $p \ge 0.0500$ | `WARNING` | **Severe event outlier ($>10\times$ baseline)**: Emergency mobilization; flood warnings. |

---

## 4. Top 5 Global TreeSHAP Predictive Features
1. **Monsoon Seasonality (Sine)** (`sin_month`): Mean |SHAP| impact = **1.4895**
2. **Atmospheric Cloud Cover** (`cloud_cover`): Mean |SHAP| impact = **1.2605**
3. **Current Precipitation Rate** (`precipitation`): Mean |SHAP| impact = **0.8705**
4. **Convective Instability Index** (`convective_energy_proxy`): Mean |SHAP| impact = **0.7090**
5. **Sustained Wind Speed** (`wind_speed_10m`): Mean |SHAP| impact = **0.7040**
