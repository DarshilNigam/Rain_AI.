"""
Automated unit tests for data quality and integrity validator.
"""
import pandas as pd
import numpy as np
from ml.data_quality.validator import DataQualityValidator
from ml.features.registry import ALL_MODEL_FEATURE_KEYS

def test_data_quality_valid_dataset():
    data = {
        "station_name": ["Ahmedabad", "Ahmedabad"],
        "time": ["2024-01-01 00:00:00", "2024-01-01 01:00:00"],
        "latitude": [23.02, 23.02],
        "longitude": [72.57, 72.57],
        "precipitation": [0.0, 5.2]
    }
    for feat in ALL_MODEL_FEATURE_KEYS:
        if feat not in data:
            data[feat] = [10.0, 12.0]

    df = pd.DataFrame(data)
    validator = DataQualityValidator()
    report = validator.validate_dataset(df)
    assert report["passed"] is True
    assert report["checks"]["coordinateBounds"] == "PASSED"
    assert report["checks"]["nonNegativePrecipitation"] == "PASSED"

def test_data_quality_catches_negative_precipitation():
    data = {
        "station_name": ["Delhi"],
        "time": ["2024-01-01 00:00:00"],
        "latitude": [28.61],
        "longitude": [77.20],
        "precipitation": [-5.0]
    }
    for feat in ALL_MODEL_FEATURE_KEYS:
        if feat not in data:
            data[feat] = [10.0]

    df = pd.DataFrame(data)
    validator = DataQualityValidator()
    report = validator.validate_dataset(df)
    assert report["passed"] is False
    assert report["checks"]["nonNegativePrecipitation"] == "FAILED"
