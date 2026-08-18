# R.A.I. Explainable AI (XAI) & TreeSHAP Engine

## 1. TreeSHAP Attribution Methodology

R.A.I. implements exact tree-based Shapley value computation using Lundberg et al. (`shap.TreeExplainer`). For any prediction $f(x)$:

$$f(x) = \phi_0 + \sum_{i=1}^{M} \phi_i(x)$$

Where:
- $\phi_0$ is the base expected value of heavy rainfall across the training dataset.
- $\phi_i(x)$ is the exact marginal attribution of feature $i$ for the specific location and timestamp.

---

## 2. Feature Impact Classification

- **Positive Attributions ($\phi_i > 0$)**: Atmospheric factors that *increase* heavy rainfall probability (e.g. moisture saturation, falling pressure, high antecedent rain).
- **Negative Attributions ($\phi_i < 0$)**: Atmospheric factors that *decrease* heavy rainfall probability (e.g. high barometric pressure, dry air mass).

---

## 3. Grounded Deterministic Natural-Language Summary

The natural-language explanation is constructed deterministically from top SHAP factors:
- **No LLM Hallucinations**: Reasons directly from computed mathematical SHAP values.
- **Physical Grounding**: Highlights actual physical units (°C, %, hPa, mm) alongside risk attributions.
