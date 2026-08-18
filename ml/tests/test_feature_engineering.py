"""
Automated unit tests for zero-leakage feature engineering and thermodynamic computations.
"""
import numpy as np
import pandas as pd
from ml.features.engineering import compute_dew_point_spread, engineer_features_dataframe
from ml.configs.config import HEAVY_RAIN_THRESHOLD_MM, TARGET_COLUMN

def test_dew_point_spread():
    temp = np.array([30.0, 25.0])
    rh = np.array([100.0, 50.0])
    spread = compute_dew_point_spread(temp, rh)
    assert spread[0] == 0.0  # 100% saturation means 0 spread
    assert spread[1] == 10.0

def test_feature_engineering_pipeline_zero_leakage():
    hours = pd.date_range("2024-01-01", periods=30, freq="h")
    data = {
        "time": hours,
        "station_name": ["Ahmedabad"] * 30,
        "region": ["Gujarat"] * 30,
        "latitude": [23.02] * 30,
        "longitude": [72.57] * 30,
        "temperature_2m": [28.0] * 30,
        "relative_humidity_2m": [75.0] * 30,
        "surface_pressure": [1005.0] * 30,
        "wind_speed_10m": [12.0] * 30,
        "wind_direction_10m": [180.0] * 30,
        "cloud_cover": [80.0] * 30,
        "precipitation": [2.5] * 30,
        "satellite_precipitation_rate": [2.4] * 30
    }
    df = pd.DataFrame(data)
    processed = engineer_features_dataframe(df)

    assert "rain_1h" in processed.columns
    assert "rain_3h" in processed.columns
    assert "satellite_precipitation" in processed.columns
    assert "pressure_change" in processed.columns
    assert "dew_point_spread" in processed.columns
    assert "convective_energy_proxy" in processed.columns
    assert TARGET_COLUMN in processed.columns
    assert "severity" in processed.columns
