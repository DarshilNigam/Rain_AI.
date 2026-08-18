"""
R.A.I. Dataset Building & Validation Pipeline.
Entrypoint for ingesting real historical records, running quality validation,
performing zero-leakage feature engineering, and generating audit reports.
"""
import json
import datetime
from pathlib import Path
import pandas as pd

from ml.configs.config import RAW_DATA_DIR, PROCESSED_DATA_DIR, REPRESENTATIVE_STATIONS
from ml.pipelines.ingestion import ingest_all_stations
from ml.data_quality.validator import DataQualityValidator
from ml.features.engineering import engineer_features_dataframe
from ml.features.leakage_audit import perform_leakage_audit
from ml.features.registry import ALL_MODEL_FEATURE_KEYS

def build_dataset_pipeline() -> pd.DataFrame:
    """
    Executes the reproducible dataset generation and validation workflow.
    """
    raw_parquet_path = RAW_DATA_DIR / "raw_meteorological_dataset.parquet"
    if not raw_parquet_path.exists():
        print("Raw dataset missing. Launching historical ingestion...")
        df_raw = ingest_all_stations()
    else:
        print(f"Loading existing raw dataset from {raw_parquet_path}...")
        df_raw = pd.read_parquet(raw_parquet_path)

    initial_rows = len(df_raw)

    # 1. Leakage Audit
    print("Performing strict temporal leakage audit...")
    leakage_audit = perform_leakage_audit()
    if leakage_audit["status"] != "PASSED_STRICT_ZERO_LEAKAGE":
        raise RuntimeError(f"Data leakage detected! Leaked features: {leakage_audit['leakedFeatures']}")

    # 2. Zero-Leakage Feature Engineering & Target Generation
    print("Executing feature engineering and IMD target labeling...")
    df_processed = engineer_features_dataframe(df_raw)

    # 3. Data Quality Audit
    print("Running meteorological data quality validation...")
    validator = DataQualityValidator()
    quality_report = validator.validate_dataset(df_processed)

    # Compile Comprehensive Data Quality Summary
    quality_summary = {
        "generatedAt": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "rowsBefore": initial_rows,
        "rowsAfter": len(df_processed),
        "missingValues": 0 if quality_report["checks"]["missingValues"] == "PASSED" else len(quality_report["issues"]),
        "duplicatesRemoved": 0,
        "invalidValuesRemoved": 0,
        "locations": [s["name"] for s in REPRESENTATIVE_STATIONS],
        "locationCount": len(REPRESENTATIVE_STATIONS),
        "timeRange": {
            "start": str(df_processed["time"].min()),
            "end": str(df_processed["time"].max())
        },
        "featureCoverage": {
            "totalFeatures": len(ALL_MODEL_FEATURE_KEYS),
            "featureList": ALL_MODEL_FEATURE_KEYS
        },
        "leakageAudit": leakage_audit,
        "validationChecks": quality_report["checks"],
        "targetDistribution": {
            "heavyRainPositives": int(df_processed["heavy_rain_event"].sum()),
            "positiveRatePct": round(float(df_processed["heavy_rain_event"].mean() * 100), 2),
            "severityBreakdown": df_processed["severity"].value_counts().to_dict()
        }
    }

    report_path = PROCESSED_DATA_DIR / "data_quality_report.json"
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(quality_summary, f, indent=2)

    # Save Output Datasets
    out_parquet = PROCESSED_DATA_DIR / "processed_meteorological_dataset.parquet"
    out_csv = PROCESSED_DATA_DIR / "processed_meteorological_dataset.csv"
    df_processed.to_parquet(out_parquet, index=False)
    df_processed.to_csv(out_csv, index=False)

    print("\n=======================================================")
    print(f"Dataset Pipeline Successfully Built: {len(df_processed)} records")
    print(f"Data Quality Report Written to: {report_path}")
    print(f"Processed Parquet: {out_parquet}")
    print("=======================================================\n")

    return df_processed

if __name__ == "__main__":
    build_dataset_pipeline()
