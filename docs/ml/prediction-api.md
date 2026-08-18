# R.A.I. Prediction API Reference

## Endpoints

### 1. `POST /api/prediction/heavy-rainfall`
Submits coordinate payload and returns calibrated heavy rainfall probability, risk tier, IMD classification, and TreeSHAP attributions.

**Payload**:
```json
{
  "latitude": 23.0225,
  "longitude": 72.5714,
  "city": "Ahmedabad",
  "horizonHours": 24
}
```

### 2. `GET /api/prediction/heavy-rainfall` / `GET /api/risk/predict`
Query parameter equivalent for browser telemetry and frontend widgets.

### 3. `GET /api/model/status`
Returns registry metadata, training samples, and feature counts.

### 4. `GET /api/satellite/status`
Returns NASA GPM IMERG 0.1° satellite grid telemetry.
