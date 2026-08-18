"""
R.A.I. Dataset & Chronological Split Module.
Implements strict time-aware train / validation / test partitioning without data leakage.
"""
from typing import Tuple, Dict, Any
import pandas as pd
from ml.src.config import (
    PROCESSED_DATA_DIR,
    ALL_MODEL_FEATURES,
    TARGET_COLUMN
)

def load_processed_dataset() -> pd.DataFrame:
    """Loads the processed meteorological dataset."""
    parquet_path = PROCESSED_DATA_DIR / "processed_meteorological_dataset.parquet"
    if parquet_path.exists():
        df = pd.read_parquet(parquet_path)
    else:
        csv_path = PROCESSED_DATA_DIR / "processed_meteorological_dataset.csv"
        if not csv_path.exists():
            raise FileNotFoundError(f"Processed dataset not found. Run feature_engineering.py first.")
        df = pd.read_csv(csv_path)
    
    df["time"] = pd.to_datetime(df["time"])
    return df

def get_chronological_splits(
    df: pd.DataFrame,
    train_ratio: float = 0.70,
    val_ratio: float = 0.15,
) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """
    Performs strict chronological splitting across all stations.
    
    Splitting Schema:
    - Train: First 70% of chronological time timeline (Historical learning)
    - Validation: Next 15% of chronological time timeline (Hyperparameter tuning & early stopping)
    - Test: Final 15% of chronological time timeline (Unseen future evaluation)
    
    This ensures absolutely ZERO future observation leakage into the training phase.
    """
    # Determine global chronological cutoffs based on time quantiles
    unique_timestamps = df["time"].drop_duplicates().sort_values().reset_index(drop=True)
    n_times = len(unique_timestamps)
    
    train_end_idx = int(n_times * train_ratio)
    val_end_idx = int(n_times * (train_ratio + val_ratio))
    
    train_cutoff = unique_timestamps.iloc[train_end_idx]
    val_cutoff = unique_timestamps.iloc[val_end_idx]
    
    train_df = df[df["time"] < train_cutoff].copy().reset_index(drop=True)
    val_df = df[(df["time"] >= train_cutoff) & (df["time"] < val_cutoff)].copy().reset_index(drop=True)
    test_df = df[df["time"] >= val_cutoff].copy().reset_index(drop=True)

    print(f"=== CHRONOLOGICAL DATASET SPLIT (Strict Time-Aware Partition) ===")
    print(f"• Training Set:   {len(train_df)} samples | {train_df['time'].min()} to {train_df['time'].max()}")
    print(f"• Validation Set: {len(val_df)} samples | {val_df['time'].min()} to {val_df['time'].max()}")
    print(f"• Test Set:       {len(test_df)} samples | {test_df['time'].min()} to {test_df['time'].max()}")
    print(f"• Positive Rates: Train={train_df[TARGET_COLUMN].mean()*100:.2f}%, Val={val_df[TARGET_COLUMN].mean()*100:.2f}%, Test={test_df[TARGET_COLUMN].mean()*100:.2f}%\n")

    return train_df, val_df, test_df

def prepare_feature_matrices(
    train_df: pd.DataFrame,
    val_df: pd.DataFrame,
    test_df: pd.DataFrame
) -> Dict[str, Any]:
    """
    Extracts feature matrices (X) and ground-truth target vectors (y).
    """
    X_train = train_df[ALL_MODEL_FEATURES]
    y_train = train_df[TARGET_COLUMN]

    X_val = val_df[ALL_MODEL_FEATURES]
    y_val = val_df[TARGET_COLUMN]

    X_test = test_df[ALL_MODEL_FEATURES]
    y_test = test_df[TARGET_COLUMN]

    return {
        "X_train": X_train, "y_train": y_train,
        "X_val": X_val, "y_val": y_val,
        "X_test": X_test, "y_test": y_test,
        "feature_names": ALL_MODEL_FEATURES,
    }
