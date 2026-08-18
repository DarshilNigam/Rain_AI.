"""
R.A.I. Chronological Dataset Partitioning Module.
Implements strict time-aware Train / Validation / Test splitting without temporal or spatial leakage.
"""
from typing import Tuple, Dict, Any
import pandas as pd

from ml.configs.config import PROCESSED_DATA_DIR, TARGET_COLUMN
from ml.features.registry import ALL_MODEL_FEATURE_KEYS

def load_processed_dataset() -> pd.DataFrame:
    """Loads the processed meteorological dataset."""
    parquet_path = PROCESSED_DATA_DIR / "processed_meteorological_dataset.parquet"
    if parquet_path.exists():
        df = pd.read_parquet(parquet_path)
    else:
        csv_path = PROCESSED_DATA_DIR / "processed_meteorological_dataset.csv"
        if not csv_path.exists():
            raise FileNotFoundError("Processed dataset not found. Run feature engineering first.")
        df = pd.read_csv(csv_path)

    df["time"] = pd.to_datetime(df["time"])
    return df

def get_chronological_splits(
    df: pd.DataFrame,
    train_ratio: float = 0.70,
    val_ratio: float = 0.15
) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """
    Performs strict chronological splitting across all stations.
    
    Splitting Strategy:
    - Train (70%): Historical observations
    - Validation (15%): Intermediate temporal timeline (Tuning / Early Stopping / Calibration)
    - Test (15%): Latest unseen future temporal timeline (Independent Evaluation)
    """
    timestamps = df["time"].drop_duplicates().sort_values().reset_index(drop=True)
    n_times = len(timestamps)

    train_end = int(n_times * train_ratio)
    val_end = int(n_times * (train_ratio + val_ratio))

    train_cutoff = timestamps.iloc[train_end]
    val_cutoff = timestamps.iloc[val_end]

    train_df = df[df["time"] < train_cutoff].copy().reset_index(drop=True)
    val_df = df[(df["time"] >= train_cutoff) & (df["time"] < val_cutoff)].copy().reset_index(drop=True)
    test_df = df[df["time"] >= val_cutoff].copy().reset_index(drop=True)

    print("=== CHRONOLOGICAL DATASET PARTITION ===")
    print(f"• Training Set:   {len(train_df)} records | {train_df['time'].min()} to {train_df['time'].max()}")
    print(f"• Validation Set: {len(val_df)} records | {val_df['time'].min()} to {val_df['time'].max()}")
    print(f"• Test Set:       {len(test_df)} records | {test_df['time'].min()} to {test_df['time'].max()}")
    print(f"• IMD Heavy Rain Positives: Train={train_df[TARGET_COLUMN].sum()} ({train_df[TARGET_COLUMN].mean()*100:.2f}%), Val={val_df[TARGET_COLUMN].sum()} ({val_df[TARGET_COLUMN].mean()*100:.2f}%), Test={test_df[TARGET_COLUMN].sum()} ({test_df[TARGET_COLUMN].mean()*100:.2f}%)\n")

    return train_df, val_df, test_df

def prepare_feature_matrices(
    train_df: pd.DataFrame,
    val_df: pd.DataFrame,
    test_df: pd.DataFrame
) -> Dict[str, Any]:
    """Extracts aligned feature matrices (X) and target vectors (y)."""
    return {
        "X_train": train_df[ALL_MODEL_FEATURE_KEYS],
        "y_train": train_df[TARGET_COLUMN],
        "X_val": val_df[ALL_MODEL_FEATURE_KEYS],
        "y_val": val_df[TARGET_COLUMN],
        "X_test": test_df[ALL_MODEL_FEATURE_KEYS],
        "y_test": test_df[TARGET_COLUMN],
        "features": ALL_MODEL_FEATURE_KEYS
    }
