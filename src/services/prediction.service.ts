import { BaseService } from './base.service';
import { ENDPOINTS } from '../api/endpoints';
import { RainfallPrediction, HistoricalRainfall, XAIExplanation } from '../types/domain';
import { ApiResponse, PredictionQueryParams } from '../types/api';

export interface IPredictionService {
  getLatestPrediction(regionId: string, signal?: AbortSignal): Promise<ApiResponse<RainfallPrediction>>;
  getHistoricalData(regionId: string, signal?: AbortSignal): Promise<ApiResponse<HistoricalRainfall>>;
  getXAIExplanation(predictionId: string, signal?: AbortSignal): Promise<ApiResponse<XAIExplanation>>;
  requestForecast(params: PredictionQueryParams, signal?: AbortSignal): Promise<ApiResponse<RainfallPrediction>>;
}

export class PredictionService extends BaseService implements IPredictionService {
  public getLatestPrediction(regionId: string, signal?: AbortSignal): Promise<ApiResponse<RainfallPrediction>> {
    return this.http.get<RainfallPrediction>(ENDPOINTS.INTELLIGENCE.LATEST(regionId), { signal });
  }

  public getHistoricalData(regionId: string, signal?: AbortSignal): Promise<ApiResponse<HistoricalRainfall>> {
    return this.http.get<HistoricalRainfall>(ENDPOINTS.INTELLIGENCE.HISTORICAL(regionId), { signal });
  }

  public getXAIExplanation(predictionId: string, signal?: AbortSignal): Promise<ApiResponse<XAIExplanation>> {
    return this.http.get<XAIExplanation>(ENDPOINTS.INTELLIGENCE.XAI_EXPLANATION(predictionId), { signal });
  }

  public requestForecast(params: PredictionQueryParams, signal?: AbortSignal): Promise<ApiResponse<RainfallPrediction>> {
    return this.http.post<RainfallPrediction>(ENDPOINTS.INTELLIGENCE.PREDICT, params, { signal });
  }
}

export const predictionService = new PredictionService();
