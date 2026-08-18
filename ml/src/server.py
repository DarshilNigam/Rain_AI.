"""
R.A.I. Machine Learning Prediction & Explainability Server.
Exposes REST endpoints for real-time heavy rainfall probability, SHAP feature importance,
model health telemetry, and NASA GPM satellite layer status.
"""
from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
import uvicorn
import json

from ml.src.config import METADATA_DIR
from ml.src.predict import RaiPredictionService

app = FastAPI(
    title="R.A.I. Rainfall Intelligence - ML Inference API",
    description="Real-Time Heavy Rainfall Risk Prediction and TreeSHAP Explainability Service",
    version="1.0.0"
)

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Singleton prediction service instance
prediction_service: Optional[RaiPredictionService] = None

@app.on_event("startup")
def startup_event():
    global prediction_service
    try:
        prediction_service = RaiPredictionService()
        print("R.A.I. Prediction Service initialized successfully with XGBoost + SHAP explainer.")
    except Exception as e:
        print(f"Warning: Could not initialize prediction service during startup: {e}")

@app.get("/api/model/status")
def get_model_status():
    """Returns the operational status and training metadata of the ML model."""
    meta_path = METADATA_DIR / "model_metadata_v1.json"
    if meta_path.exists():
        with open(meta_path, "r", encoding="utf-8") as f:
            metadata = json.load(f)
        return {
            "status": "MODEL_READY",
            "modelName": metadata.get("modelName"),
            "modelVersion": metadata.get("modelVersion"),
            "trainedAt": metadata.get("trainedAt"),
            "featuresCount": metadata.get("featuresCount"),
            "evaluation": metadata.get("evaluation")
        }
    return {
        "status": "MODEL_NOT_TRAINED",
        "message": "Model artifacts not found. Run training pipeline."
    }

@app.get("/api/model/metrics")
def get_model_metrics():
    """Returns detailed evaluation metrics and feature importances."""
    meta_path = METADATA_DIR / "model_metadata_v1.json"
    if not meta_path.exists():
        raise HTTPException(status_code=404, detail="Model metadata not found.")
    with open(meta_path, "r", encoding="utf-8") as f:
        return json.load(f)

@app.get("/api/satellite/status")
def get_satellite_status(latitude: float = 23.0225, longitude: float = 72.5714):
    """Returns NASA GPM IMERG satellite precipitation coverage and stream telemetry."""
    if prediction_service is None:
        raise HTTPException(status_code=503, detail="Prediction service initializing.")
    return prediction_service.satellite_adapter.get_satellite_precipitation_rate(latitude, longitude)

@app.get("/api/risk/predict")
def predict_heavy_rainfall(
    latitude: float = Query(..., description="Target Latitude (-90 to 90)"),
    longitude: float = Query(..., description="Target Longitude (-180 to 180)"),
    city: str = Query("Target Area", description="City / Location Name"),
    horizon: int = Query(24, description="Forecast Horizon in Hours")
):
    """
    Computes heavy rainfall probability, risk classification, and SHAP explanation
    for any geographic location using real Open-Meteo telemetry and XGBoost model.
    """
    global prediction_service
    if prediction_service is None:
        prediction_service = RaiPredictionService()

    try:
        prediction = prediction_service.predict_risk(
            latitude=latitude,
            longitude=longitude,
            city=city,
            horizon=horizon
        )
        return prediction
    except Exception as e:
        print(f"Prediction Error: {e}")
        raise HTTPException(status_code=500, detail=f"Inference error: {str(e)}")

if __name__ == "__main__":
    uvicorn.run("ml.src.server:app", host="127.0.0.1", port=8000, reload=False)
