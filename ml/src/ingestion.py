"""
R.A.I. Meteorological Data Ingestion Service.
Fetches real multi-year historical hourly atmospheric records from Open-Meteo Archive API
across representative climatic stations in India to construct a ground-truth dataset.
"""
import time
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any, Optional
import requests
import pandas as pd
from ml.src.config import RAW_DATA_DIR, REPRESENTATIVE_STATIONS

ARCHIVE_API_URL = "https://archive-api.open-meteo.com/v1/archive"

HOURLY_VARIABLES = [
    "temperature_2m",
    "relative_humidity_2m",
    "surface_pressure",
    "wind_speed_10m",
    "wind_direction_10m",
    "cloud_cover",
    "precipitation",
    "rain",
    "showers",
    "weather_code",
]

def fetch_station_history(
    station: Dict[str, Any],
    start_date: str = "2023-01-01",
    end_date: str = "2024-12-31"
) -> Optional[pd.DataFrame]:
    """
    Fetches real hourly archive meteorological observations for a given station.
    """
    params = {
        "latitude": station["lat"],
        "longitude": station["lng"],
        "start_date": start_date,
        "end_date": end_date,
        "hourly": ",".join(HOURLY_VARIABLES),
        "timezone": "auto",
    }

    try:
        print(f"Ingesting real historical data for {station['name']} ({station['state']}) from {start_date} to {end_date}...")
        response = requests.get(ARCHIVE_API_URL, params=params, timeout=30)
        response.raise_for_status()
        data = response.json()

        if "hourly" not in data:
            print(f"Warning: No hourly data returned for {station['name']}")
            return None

        hourly = data["hourly"]
        df = pd.DataFrame(hourly)
        df["time"] = pd.to_datetime(df["time"])
        df["station_name"] = station["name"]
        df["state"] = station["state"]
        df["latitude"] = station["lat"]
        df["longitude"] = station["lng"]

        # Synthesize precipitation probability proxy from historical weather code / cloud / rh if missing
        if "precipitation_probability" not in df.columns:
            # Physically grounded probability approximation based on humidity and precipitation
            df["precipitation_probability"] = (
                (df["precipitation"] > 0).astype(int) * 60 +
                (df["relative_humidity_2m"] > 80).astype(int) * 25 +
                (df["cloud_cover"] > 70).astype(int) * 15
            ).clip(0, 100)

        print(f"Successfully ingested {len(df)} hourly records for {station['name']}.")
        return df

    except Exception as e:
        print(f"Error fetching data for {station['name']}: {e}")
        return None

def ingest_all_stations(
    stations: Optional[List[Dict[str, Any]]] = None,
    start_date: str = "2023-01-01",
    end_date: str = "2024-12-31"
) -> pd.DataFrame:
    """
    Ingests all representative stations and persists combined raw dataset to data/raw/
    """
    if stations is None:
        stations = REPRESENTATIVE_STATIONS

    station_dfs = []
    for station in stations:
        df = fetch_station_history(station, start_date=start_date, end_date=end_date)
        if df is not None and not df.empty:
            station_dfs.append(df)
        time.sleep(0.5)  # Rate limiting courtesy

    if not station_dfs:
        raise RuntimeError("Failed to ingest historical data from Open-Meteo Archive API.")

    combined_df = pd.concat(station_dfs, ignore_index=True)
    # Sort chronologically by station and time
    combined_df = combined_df.sort_values(by=["station_name", "time"]).reset_index(drop=True)

    raw_output_path = RAW_DATA_DIR / "raw_meteorological_dataset.parquet"
    combined_df.to_parquet(raw_output_path, index=False)
    
    # Also save CSV for inspection
    csv_output_path = RAW_DATA_DIR / "raw_meteorological_dataset.csv"
    combined_df.to_csv(csv_output_path, index=False)

    print(f"\n=======================================================")
    print(f"Ingestion Complete: {len(combined_df)} total records saved to {raw_output_path}")
    print(f"Stations covered: {combined_df['station_name'].unique().tolist()}")
    print(f"Time span: {combined_df['time'].min()} to {combined_df['time'].max()}")
    print(f"=======================================================\n")

    return combined_df

if __name__ == "__main__":
    ingest_all_stations()
