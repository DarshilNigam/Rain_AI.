"""
R.A.I. Meteorological Feature Engineering Pipeline.
Derives temporal, lag, accumulation, change, and atmospheric features without data leakage.
"""
import numpy as np
import pandas as pd
from typing import Tuple, List
from ml.src.config import (
    PROCESSED_DATA_DIR,
    RAW_DATA_DIR,
    HEAVY_RAINFALL_THRESHOLD_MM,
    ALL_MODEL_FEATURES,
    TARGET_COLUMN
)

def compute_dew_point_spread(temp: np.ndarray, rh: np.ndarray) -> np.ndarray:
    """
    Magnus-Tetens dew point approximation spread: T - T_dew
    Spread close to 0 indicates high atmospheric moisture saturation.
    """
    # Simple standard approximation: T_dew ≈ T - ((100 - RH) / 5)
    return (100.0 - rh) / 5.0

def engineer_features_for_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    """
    Applies feature engineering transformation on hourly meteorological dataframe.
    Processes data per station to maintain temporal integrity.
    """
    df = df.copy()
    df["time"] = pd.to_datetime(df["time"])
    df = df.sort_values(by=["station_name", "time"]).reset_index(drop=True)

    processed_stations = []

    for station_name, group in df.groupby("station_name", sort=False):
        grp = group.copy().sort_values(by="time").reset_index(drop=True)

        # 1. Historical Lag & Accumulation Features (Looking BACKWARD)
        grp["precip_1h"] = grp["precipitation"].shift(1).fillna(0.0)
        grp["precip_3h_sum"] = grp["precipitation"].rolling(window=3, min_periods=1).sum().shift(1).fillna(0.0)
        grp["precip_6h_sum"] = grp["precipitation"].rolling(window=6, min_periods=1).sum().shift(1).fillna(0.0)
        grp["precip_24h_sum"] = grp["precipitation"].rolling(window=24, min_periods=1).sum().shift(1).fillna(0.0)

        # 2. Rate of Change / Dynamics Features (Over 3 hours)
        grp["pressure_change_3h"] = (grp["surface_pressure"] - grp["surface_pressure"].shift(3)).fillna(0.0)
        grp["humidity_change_3h"] = (grp["relative_humidity_2m"] - grp["relative_humidity_2m"].shift(3)).fillna(0.0)
        grp["wind_speed_change_3h"] = (grp["wind_speed_10m"] - grp["wind_speed_10m"].shift(3)).fillna(0.0)

        # 3. Forecast / Ahead Features (Looking FORWARD into 6h and 24h horizon)
        # Note: In real-time inference, these come from the official numerical weather forecast model (e.g. Open-Meteo 7-day forecast).
        # In historical training data, we use the forward sequence as the forecast observation.
        indexer_6h = pd.api.indexers.FixedForwardWindowIndexer(window_size=6)
        indexer_24h = pd.api.indexers.FixedForwardWindowIndexer(window_size=24)

        grp["forecast_rain_6h"] = grp["precipitation"].rolling(window=indexer_6h, min_periods=1).sum()
        grp["forecast_rain_24h"] = grp["precipitation"].rolling(window=indexer_24h, min_periods=1).sum()
        grp["max_precip_probability_24h"] = grp["precipitation_probability"].rolling(window=indexer_24h, min_periods=1).max()

        # 4. Thermodynamic & Atmospheric Physics Proxies
        grp["dew_point_spread"] = compute_dew_point_spread(
            grp["temperature_2m"].values,
            grp["relative_humidity_2m"].values
        )
        
        # Convective energy proxy: combines temperature buoyancy with high relative humidity and falling pressure
        grp["convective_energy_proxy"] = (
            (grp["temperature_2m"] / 30.0) * 
            (grp["relative_humidity_2m"] / 100.0) * 
            (1013.25 / (grp["surface_pressure"].clip(lower=900)))
        )

        # 5. Diurnal and Seasonal Temporal Encodings (Continuous cyclic transformations)
        hours = grp["time"].dt.hour
        months = grp["time"].dt.month
        grp["sin_hour"] = np.sin(2 * np.pi * hours / 24.0)
        grp["cos_hour"] = np.cos(2 * np.pi * hours / 24.0)
        grp["sin_month"] = np.sin(2 * np.pi * (months - 1) / 12.0)
        grp["cos_month"] = np.cos(2 * np.pi * (months - 1) / 12.0)

        # 6. Target Event Definition (Ground Truth for 24h Heavy Rainfall Event)
        # Event = 1 if forward 24h precipitation >= HEAVY_RAINFALL_THRESHOLD_MM (35.5 mm)
        grp[TARGET_COLUMN] = (grp["forecast_rain_24h"] >= HEAVY_RAINFALL_THRESHOLD_MM).astype(int)

        processed_stations.append(grp)

    full_processed_df = pd.concat(processed_stations, ignore_index=True)
    
    # Drop rows at tail where forward 24h window is incomplete
    full_processed_df = full_processed_df.dropna(subset=[TARGET_COLUMN]).reset_index(drop=True)

    return full_processed_df

def process_and_save_dataset():
    """
    Loads raw parquet/csv, executes feature engineering, and saves processed parquet/csv.
    """
    raw_path = RAW_DATA_DIR / "raw_meteorological_dataset.parquet"
    if not raw_path.exists():
        raw_csv_path = RAW_DATA_DIR / "raw_meteorological_dataset.csv"
        if not raw_csv_path.exists():
            raise FileNotFoundError(f"Raw dataset not found at {raw_path}. Run ingestion first.")
        df_raw = pd.read_csv(raw_csv_path)
    else:
        df_raw = pd.read_parquet(raw_path)

    print(f"Engineering features from raw dataset ({len(df_raw)} records)...")
    processed_df = engineer_features_for_dataframe(df_raw)

    processed_output_path = PROCESSED_DATA_DIR / "processed_meteorological_dataset.parquet"
    processed_df.to_parquet(processed_output_path, index=False)
    
    csv_output_path = PROCESSED_DATA_DIR / "processed_meteorological_dataset.csv"
    processed_df.to_csv(csv_output_path, index=False)

    positives = processed_df[TARGET_COLUMN].sum()
    total = len(processed_df)
    print(f"\n=======================================================")
    print(f"Feature Engineering Complete: {total} records saved to {processed_output_path}")
    print(f"Heavy Rainfall Event Target Distribution: {positives}/{total} ({positives/total*100:.2f}% positive rate)")
    print(f"Engineered Features: {len(ALL_MODEL_FEATURES)} model features")
    print(f"=======================================================\n")

    return processed_df

if __name__ == "__main__":
    process_and_save_dataset()
