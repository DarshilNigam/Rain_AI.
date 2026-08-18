"""
R.A.I. Grounded Deterministic Natural-Language Explanation Builder.
Constructs human-readable explanations directly from exact SHAP factor attributions.
"""
from typing import Dict, List, Any

def format_human_explanation(
    location_name: str,
    probability: float,
    risk_level: str,
    severity: str,
    top_positive: List[Dict[str, Any]],
    top_negative: List[Dict[str, Any]]
) -> str:
    """
    Builds a truthful, deterministic natural-language explanation string.
    Preserves exact calibrated probability (e.g. 0.9%).
    """
    pct_val = probability * 100
    pct_str = f"{pct_val:.1f}%" if round(pct_val, 1) != pct_val or pct_val < 10 else f"{int(pct_val)}%"
    if pct_val < 1.0:
        pct_str = f"{pct_val:.1f}%"

    pos_items = [f"{f['featureName']} ({f['value']} {f.get('unit', '')})".strip() for f in top_positive[:3]]
    neg_items = [f"{f['featureName']} ({f['value']} {f.get('unit', '')})".strip() for f in top_negative[:2]]

    if risk_level in ["HIGH", "CRITICAL"]:
        pos_str = ", ".join(pos_items)
        text = (
            f"R.A.I. Heavy-Rainfall ML Probability (≥64.5 mm/day) is estimated at {pct_str} ({risk_level} model risk, expected severity: {severity}) for {location_name}. "
            f"The primary atmospheric factors driving this elevated prediction are {pos_str}."
        )
        if neg_items:
            text += f" Counteracting mitigating factors include {', '.join(neg_items)}."
    elif risk_level == "MODERATE":
        pos_str = ", ".join(pos_items) if pos_items else "elevated moisture signals"
        text = (
            f"R.A.I. Heavy-Rainfall ML Probability (≥64.5 mm/day) is estimated at {pct_str} ({risk_level} model risk) for {location_name}. "
            f"Convective precipitation signals are partially elevated due to {pos_str}."
        )
    else:
        neg_str = ", ".join(neg_items) if neg_items else "stable atmospheric conditions"
        text = (
            f"R.A.I. Heavy-Rainfall ML Probability (≥64.5 mm/day) is estimated at {pct_str} ({risk_level} model risk) for {location_name}. "
            f"Atmospheric stability is maintained by {neg_str}."
        )

    return text
