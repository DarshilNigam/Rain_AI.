"""
R.A.I. Rainfall Intelligence - ML Configuration & Threshold Definitions
Configures meteorological thresholds, feature spaces, risk mappings, and paths.
"""
from pathlib import Path
from typing import List, Dict, Any

# Root Directories
BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
RAW_DATA_DIR = DATA_DIR / "raw"
PROCESSED_DATA_DIR = DATA_DIR / "processed"
MODELS_DIR = DATA_DIR / "models"
METADATA_DIR = DATA_DIR / "metadata"

for directory in [RAW_DATA_DIR, PROCESSED_DATA_DIR, MODELS_DIR, METADATA_DIR]:
    directory.mkdir(parents=True, exist_ok=True)

# Configurable Meteorological Thresholds
# Heavy Rainfall Criteria (aligned with Indian Meteorological Department / WMO standard criteria)
# Configurable in one single place
HEAVY_RAINFALL_THRESHOLD_MM = 35.5  # 24h event threshold for classification

# Prediction Horizons
DEFAULT_HORIZON_HOURS = 24

# R.A.I. Risk Level Classification Mapping
RISK_LEVEL_THRESHOLDS = {
    "LOW": (0.0, 0.25),
    "MODERATE": (0.25, 0.55),
    "HIGH": (0.55, 0.80),
    "CRITICAL": (0.80, 1.01),
}

def classify_risk(probability: float) -> str:
    """Classifies a predicted probability into an R.A.I. model risk level."""
    for level, (low, high) in RISK_LEVEL_THRESHOLDS.items():
        if low <= probability < high:
            return level
    return "CRITICAL" if probability >= 0.80 else "LOW"

# Feature Names and Specifications
BASE_ATMOSPHERIC_FEATURES: List[str] = [
    "temperature_2m",
    "relative_humidity_2m",
    "surface_pressure",
    "wind_speed_10m",
    "wind_direction_10m",
    "cloud_cover",
    "precipitation",
    "rain",
    "showers",
    "precipitation_probability",
]

ENGINEERED_FEATURES: List[str] = [
    "precip_1h",
    "precip_3h_sum",
    "precip_6h_sum",
    "precip_24h_sum",
    "pressure_change_3h",
    "humidity_change_3h",
    "wind_speed_change_3h",
    "forecast_rain_6h",
    "forecast_rain_24h",
    "max_precip_probability_24h",
    "dew_point_spread",
    "convective_energy_proxy",
    "sin_hour",
    "cos_hour",
    "sin_month",
    "cos_month",
    "latitude",
    "longitude",
]

ALL_MODEL_FEATURES: List[str] = BASE_ATMOSPHERIC_FEATURES + ENGINEERED_FEATURES

# Target Definition Column
TARGET_COLUMN = "heavy_rainfall_event"

# Standard Regional Calibration Stations for Ingestion
REPRESENTATIVE_STATIONS: List[Dict[str, Any]] = [
    {"name": "Ahmedabad", "state": "Gujarat", "lat": 23.0225, "lng": 72.5714},
    {"name": "Lakhimpur", "state": "Uttar Pradesh", "lat": 27.9468, "lng": 80.7788},
    {"name": "Mumbai", "state": "Maharashtra", "lat": 19.0760, "lng": 72.8777},
    {"name": "Chennai", "state": "Tamil Nadu", "lat": 13.0827, "lng": 80.2707},
    {"name": "Kolkata", "state": "West Bengal", "lat": 22.5726, "lng": 88.3639},
    {"name": "Delhi", "state": "NCR", "lat": 28.6139, "lng": 77.2090},
    {"name": "Karnal", "state": "Haryana", "lat": 29.6857, "lng": 76.9905},
    {"name": "Ludhiana", "state": "Punjab", "lat": 30.9010, "lng": 75.8573},
    {"name": "Nashik", "state": "Maharashtra", "lat": 19.9975, "lng": 73.7898},
    {"name": "Patna", "state": "Bihar", "lat": 25.5941, "lng": 85.1376},
]
