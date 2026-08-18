"""
R.A.I. Machine Learning & Meteorological Configuration.
Single Source of Truth for India Meteorological Department (IMD) rainfall thresholds,
risk classifications, data paths, and feature schema definitions.
"""
from pathlib import Path
from typing import Dict, List, Any

# Root Directory Structure
ML_ROOT_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = ML_ROOT_DIR / "data"
RAW_DATA_DIR = DATA_DIR / "raw"
PROCESSED_DATA_DIR = DATA_DIR / "processed"
EXTERNAL_DATA_DIR = DATA_DIR / "external"
MODELS_DIR = ML_ROOT_DIR / "models"
EVALUATION_DIR = ML_ROOT_DIR / "evaluation"

# Ensure all directories exist
for directory in [RAW_DATA_DIR, PROCESSED_DATA_DIR, EXTERNAL_DATA_DIR, MODELS_DIR, EVALUATION_DIR]:
    directory.mkdir(parents=True, exist_ok=True)

# =============================================================================
# IMD (India Meteorological Department) Rainfall Event Standards
# Baseline 24-Hour Accumulated Rainfall Thresholds (mm/day)
# =============================================================================
HEAVY_RAIN_THRESHOLD_MM = 64.5     # Heavy Rainfall: 64.5 to 115.5 mm/day
VERY_HEAVY_THRESHOLD_MM = 115.6    # Very Heavy Rainfall: 115.6 to 204.4 mm/day
EXTREME_THRESHOLD_MM = 204.5       # Extremely Heavy Rainfall: >= 204.5 mm/day

# Default target definition for binary classification
TARGET_COLUMN = "heavy_rain_event"
PRIMARY_THRESHOLD_MM = HEAVY_RAIN_THRESHOLD_MM

# Default Prediction Horizon
DEFAULT_HORIZON_HOURS = 24

# =============================================================================
# Categorization & Severity Mapping Functions
# =============================================================================
def classify_severity(expected_rain_24h_mm: float) -> str:
    """
    Classifies 24-hour rainfall accumulation into official IMD severity tiers.
    """
    if expected_rain_24h_mm >= EXTREME_THRESHOLD_MM:
        return "EXTREMELY_HEAVY"
    elif expected_rain_24h_mm >= VERY_HEAVY_THRESHOLD_MM:
        return "VERY_HEAVY"
    elif expected_rain_24h_mm >= HEAVY_RAIN_THRESHOLD_MM:
        return "HEAVY"
    else:
        return "NORMAL"

def classify_model_risk(probability: float) -> str:
    """
    Translates model heavy rainfall probability into operational risk tiers.
    Explicitly separates algorithmic model risk from official national warnings.
    """
    if probability >= 0.75:
        return "CRITICAL"
    elif probability >= 0.50:
        return "HIGH"
    elif probability >= 0.25:
        return "MODERATE"
    else:
        return "LOW"

# =============================================================================
# Representative Indian Meteorological Stations
# Selected across diverse agro-climatic and monsoon zones
# =============================================================================
REPRESENTATIVE_STATIONS = [
    {"name": "Ahmedabad", "region": "Gujarat", "lat": 23.0225, "lng": 72.5714, "zone": "Western Semi-Arid"},
    {"name": "Lakhimpur", "region": "Uttar Pradesh", "lat": 27.9486, "lng": 80.7788, "zone": "Gangetic Plain (Agri Hub)"},
    {"name": "Mumbai", "region": "Maharashtra", "lat": 19.0760, "lng": 72.8777, "zone": "Konkan Coastal Zone"},
    {"name": "Chennai", "region": "Tamil Nadu", "lat": 13.0827, "lng": 80.2707, "zone": "Coromandel Coastal (NE Monsoon)"},
    {"name": "Kolkata", "region": "West Bengal", "lat": 22.5726, "lng": 88.3639, "zone": "Eastern Delta"},
    {"name": "Delhi", "region": "NCR", "lat": 28.6139, "lng": 77.2090, "zone": "Northern Plains"},
    {"name": "Karnal", "region": "Haryana", "lat": 29.6857, "lng": 76.9905, "zone": "Indo-Gangetic Breadbasket"},
    {"name": "Ludhiana", "region": "Punjab", "lat": 30.9010, "lng": 75.8573, "zone": "Punjab Plains"},
    {"name": "Nashik", "region": "Maharashtra", "lat": 19.9975, "lng": 73.7898, "zone": "Western Ghats Rain Shadow"},
    {"name": "Patna", "region": "Bihar", "lat": 25.5941, "lng": 85.1376, "zone": "Middle Ganges Valley"},
]
