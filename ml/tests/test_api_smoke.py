"""
Automated smoke test for FastAPI prediction server.
"""
from fastapi.testclient import TestClient
from ml.server import app

client = TestClient(app)

def test_model_status_endpoint():
    response = client.get("/api/model/status")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data

def test_model_comparison_endpoint():
    response = client.get("/api/model/comparison")
    assert response.status_code == 200
    data = response.json()
    assert "primaryModel" in data
    assert "baselineModel" in data

def test_prediction_post_endpoint():
    payload = {
        "latitude": 23.0225,
        "longitude": 72.5714,
        "city": "Ahmedabad",
        "horizonHours": 24
    }
    response = client.post("/api/prediction/heavy-rainfall", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "prediction" in data
    assert "probability" in data["prediction"]
    assert "riskLevel" in data["prediction"]
    assert "severity" in data["prediction"]
    assert "explanation" in data
    assert "topFactors" in data["explanation"]
    assert "deterministicSummary" in data["explanation"]
    assert "sources" in data
    assert "disclaimer" in data
