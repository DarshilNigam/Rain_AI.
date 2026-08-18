import { useState, useEffect } from 'react';
import { mlRiskService, RaiMlPredictionResponse, ModelStatusResponse } from '../services/mlRiskService';

export interface UseMlRiskPredictionResult {
  readonly prediction: RaiMlPredictionResponse | null;
  readonly modelStatus: ModelStatusResponse | null;
  readonly isLoading: boolean;
  readonly isModelReady: boolean;
  readonly refresh: () => Promise<void>;
}

export function useMlRiskPrediction(
  latitude?: number,
  longitude?: number,
  city?: string
): UseMlRiskPredictionResult {
  const [prediction, setPrediction] = useState<RaiMlPredictionResponse | null>(null);
  const [modelStatus, setModelStatus] = useState<ModelStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const fetchPrediction = async () => {
    if (latitude === undefined || longitude === undefined) return;

    setIsLoading(true);
    try {
      const [predRes, statusRes] = await Promise.all([
        mlRiskService.getRiskPrediction(latitude, longitude, city || 'Active Location'),
        mlRiskService.getModelStatus(),
      ]);

      setPrediction(predRes);
      setModelStatus(statusRes);
    } catch (err) {
      console.warn('Error fetching ML risk prediction:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    fetchPrediction();
    return () => controller.abort();
  }, [latitude, longitude, city]);

  return {
    prediction,
    modelStatus,
    isLoading,
    isModelReady: modelStatus?.status === 'MODEL_READY',
    refresh: fetchPrediction,
  };
}
