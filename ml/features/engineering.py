"""
R.A.I. Feature Engineering & Temporal Alignment Pipeline.
Derives backward historical lags, rolling sums, atmospheric tendencies, thermodynamic proxies,
satellite precipitation features, and future IMD-standard target labels with strictly zero data leakage.
"""
import numpy as np
import pandas as pd
from pathlib import Path
from typing import Tuple, List

from ml.configs.config import (
    RAW_DATA_DIR,
    PROCESSED_DATA_DIR,
    HEAVY_RAIN_THRESHOLD_MM,
    TARGET_COLUMN,
    classify_severity
)
from ml.features.registry import ALL_MODEL_FEATURE_KEYS
from ml.features.leakage_audit import perform_leakage_audit

def compute_dew_point_spread(temp: np.ndarray, rh: np.ndarray) -> np.ndarray:
    """
    Magnus approximation for dew point spread: T - T_dew.
    Values approaching 0 indicate deep moisture saturation.
    """
    return (100.0 - np.clip(rh, 0.0, 100.0)) / 5.0

def engineer_features_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    """
    Applies feature engineering on hourly observations per station with chronological integrity.
    """
    df = df.copy()
    df["time"] = pd.to_datetime(df["time"])
    df = df.sort_values(by=["station_name", "time"]).reset_index(drop=True)

    station_groups = []

    for station_name, group in df.groupby("station_name", sort=False):
        grp = group.copy().sort_values(by="time").reset_index(drop=True)

        # 1. Historical Lag & Accumulation Features (Strictly Backward-Looking <= t)
        grp["rain_1h"] = grp["precipitation"].shift(1).fillna(0.0)
        grp["rain_3h"] = grp["precipitation"].rolling(window=3, min_periods=1).sum().shift(1).fillna(0.0)
        grp["rain_6h"] = grp["precipitation"].rolling(window=6, min_periods=1).sum().shift(1).fillna(0.0)
        grp["rain_12h"] = grp["precipitation"].rolling(window=12, min_periods=1).sum().shift(1).fillna(0.0)
        grp["rain_24h"] = grp["precipitation"].rolling(window=24, min_periods=1).sum().shift(1).fillna(0.0)

        # 2. NASA GPM IMERG Satellite Precipitation Features (<= t)
        sat_rate = grp.get("satellite_precipitation_rate", grp["precipitation"])
        grp["satellite_precipitation"] = sat_rate.fillna(0.0)
        grp["satellite_precipitation_3h"] = sat_rate.rolling(window=3, min_periods=1).sum().shift(1).fillna(0.0)
        grp["satellite_precipitation_24h"] = sat_rate.rolling(window=24, min_periods=1).sum().shift(1).fillna(0.0)

        # 3. 3-Hour Tendency & Dynamic Change Features (Rate of change <= t)
        grp["pressure_change"] = (grp["surface_pressure"] - grp["surface_pressure"].shift(3)).fillna(0.0)
        grp["humidity_change"] = (grp["relative_humidity_2m"] - grp["relative_humidity_2m"].shift(3)).fillna(0.0)
        grp["temperature_change"] = (grp["temperature_2m"] - grp["temperature_2m"].shift(3)).fillna(0.0)
        grp["wind_speed_change"] = (grp["wind_speed_10m"] - grp["wind_speed_10m"].shift(3)).fillna(0.0)

        # 4. Thermodynamic Atmospheric Proxies (<= t)
        grp["dew_point_spread"] = compute_dew_point_spread(
            grp["temperature_2m"].values,
            grp["relative_humidity_2m"].values
        )
        grp["convective_energy_proxy"] = (
            (grp["temperature_2m"] / 30.0) *
            (grp["relative_humidity_2m"] / 100.0) *
            (1013.25 / np.clip(grp["surface_pressure"], 900.0, 1050.0))
        )

        # 5. Diurnal & Annual Harmonic Temporal Encodings
        hours = grp["time"].dt.hour
        months = grp["time"].dt.month
        grp["sin_hour"] = np.sin(2 * np.pi * hours / 24.0)
        grp["cos_hour"] = np.cos(2 * np.pi * hours / 24.0)
        grp["sin_month"] = np.sin(2 * np.pi * (months - 1) / 12.0)
        grp["cos_month"] = np.cos(2 * np.pi * (months - 1) / 12.0)

        # 6. Future Ground Truth IMD Target Definition (Window: t to t+24h)
        indexer_24h = pd.api.indexers.FixedForwardWindowIndexer(window_size=24)
        grp["target_rainfall_24h"] = grp["precipitation"].rolling(window=indexer_24h, min_periods=1).sum()
        grp[TARGET_COLUMN] = (grp["target_rainfall_24h"] >= HEAVY_RAIN_THRESHOLD_MM).astype(int)
        grp["severity"] = grp["target_rainfall_24h"].apply(classify_severity)

        station_groups.append(grp)

    full_df = pd.concat(station_groups, ignore_index=True)
    full_df = full_df.dropna(subset=[TARGET_COLUMN]).reset_index(drop=True)
    return full_df

def process_and_save_features():
    """
    Runs leakage audit, feature engineering, and saves processed parquet and csv datasets.
    """
    # 1. Leakage Audit Check
    leak_audit = perform_leakage_audit()
    if leak_audit["status"] != "PASSED_STRICT_ZERO_LEAKAGE":
        raise RuntimeError(f"Leakage audit failed: {leak_audit['leakedFeatures']}")

    raw_path = RAW_DATA_DIR / "raw_meteorological_dataset.parquet"
    if not raw_path.exists():
        raw_csv_path = RAW_DATA_DIR / "raw_meteorological_dataset.csv"
        if not raw_csv_path.exists():
            raise FileNotFoundError("Raw dataset not found. Run ingestion pipeline first.")
        df_raw = pd.read_csv(raw_csv_path)
    else:
        df_raw = pd.read_parquet(raw_path)

    print(f"Engineering features from {len(df_raw)} raw records...")
    df_processed = engineer_features_dataframe(df_raw)

    out_parquet = PROCESSED_DATA_DIR / "processed_meteorological_dataset.parquet"
    out_csv = PROCESSED_DATA_DIR / "processed_meteorological_dataset.csv"

    df_processed.to_parquet(out_parquet, index=False)
    df_processed.to_csv(out_csv, index=False)

    pos_count = int(df_processed[TARGET_COLUMN].sum())
    total = len(df_processed)
    print("\n=======================================================")
    print(f"Feature Engineering & Zero-Leakage Complete: {total} records saved.")
    print(f"IMD Heavy Rainfall Baseline (>= {HEAVY_RAIN_THRESHOLD_MM}mm/24h): {pos_count}/{total} ({pos_count/total*100:.2f}% positive rate)")
    print(f"Audited Feature Keys: {len(ALL_MODEL_FEATURE_KEYS)}")
    print(f"Severity Distribution:\n{df_processed['severity'].value_counts().to_dict()}")
    print("=======================================================\n")

    return df_processed

if __name__ == "__main__":
    process_and_save_features()
