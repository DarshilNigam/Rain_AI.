# R.A.I. Data Sources & Ingestion Pipeline

## 1. Primary Data Sources

### Source A: Open-Meteo High-Resolution Numerical Forecast & Historical Archive
- **Endpoint**: `https://archive-api.open-meteo.com/v1/archive` and `https://api.open-meteo.com/v1/forecast`
- **License**: Creative Commons Attribution 4.0 International (CC BY 4.0) — Free open-access.
- **Coverage**: 10 representative Indian climate stations spanning major monsoon zones (Ahmedabad, Lakhimpur, Mumbai, Chennai, Kolkata, Delhi, Karnal, Ludhiana, Nashik, Patna).
- **Temporal Resolution**: Hourly observations across multi-year timeline (175,440 total records).
- **Ingested Variables**:
  - `temperature_2m` (°C)
  - `relative_humidity_2m` (%)
  - `surface_pressure` (hPa)
  - `wind_speed_10m` (km/h)
  - `wind_direction_10m` (degrees)
  - `cloud_cover` (%)
  - `precipitation` (mm)
  - `precipitation_probability` (%)

---

### Source B: NASA GPM IMERG Calibrated Satellite Grid
- **Product ID**: `GPM_3IMERGHHE.07`
- **Product Full Name**: *GPM IMERG Early Precipitation L3 Half Hourly 0.1 degree x 0.1 degree V07*
- **Spatial Resolution**: $0.1^\circ \times 0.1^\circ$ (approx. $10\text{ km} \times 10\text{ km}$)
- **Temporal Resolution**: 30 minutes, aggregated to 3-hour and 24-hour accumulations.
- **Latency**: 4 hours (Early Run), 14 hours (Late Run).
- **Calibration**: Combined passive microwave sensors (GMI, SSMIS, AMSR2) calibrated with infrared geostationary observations and Global Precipitation Climatology Centre (GPCC) monthly rain-gauge stations.
- **Local Adapter**: Handled via `NasaGpmImergAdapter` with coordinate mapping and demo/operational streams in `ml/data/external/`.
