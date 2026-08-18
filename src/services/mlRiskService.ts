/**
 * R.A.I. Machine Learning Risk Prediction Service.
 * Connects frontend modules to the FastAPI Heavy Rainfall & TreeSHAP Explainable AI backend.
 * Provides resilient fallback when inference service is offline while never inventing fake data.
 */

export interface ShapFactor {
  readonly feature: string;
  readonly featureName: string;
  readonly value: number;
  readonly unit?: string;
  readonly shapValue: number;
  readonly impact: 'INCREASES_RISK' | 'DECREASES_RISK';
  readonly absShap: number;
}

export interface ModelEvaluationMetrics {
  readonly rocAuc: number;
  readonly prAuc: number;
  readonly precision: number;
  readonly recall: number;
  readonly f1: number;
  readonly f2?: number;
  readonly operationalThreshold?: number;
  readonly brierScore?: number;
  readonly rawBrierScore?: number;
  readonly calibratedBrierScore?: number;
  readonly confusionMatrix: {
    readonly tp?: number;
    readonly fp?: number;
    readonly tn?: number;
    readonly fn?: number;
    readonly truePositives?: number;
    readonly falsePositives?: number;
    readonly trueNegatives?: number;
    readonly falseNegatives?: number;
  };
}

export interface OperationalWarning {
  readonly warningLevel: 'NO_WARNING' | 'ADVISORY' | 'WATCH' | 'WARNING';
  readonly operationalRisk: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  readonly probability: number;
  readonly horizonHours: number;
  readonly severity: string;
  readonly summary: string;
  readonly recommendedActions: readonly string[];
  readonly modelVersion: string;
  readonly timestamp: string;
  readonly disclaimer: string;
}

export interface RaiMlPredictionResponse {
  readonly location: {
    readonly latitude: number;
    readonly longitude: number;
    readonly city: string;
  };
  readonly prediction: {
    readonly probability: number;
    readonly heavyRainProbability?: number;
    readonly riskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
    readonly severity?: 'NORMAL' | 'HEAVY' | 'VERY_HEAVY' | 'EXTREMELY_HEAVY';
    readonly horizonHours?: number;
    readonly thresholdUsed?: number;
    readonly thresholdVersion?: string;
    readonly predictionHorizonHours?: number;
    readonly modelConfidenceScore?: number;
    readonly imdClassification?: {
      readonly heavyRainThresholdMm: number;
      readonly veryHeavyThresholdMm: number;
      readonly extremeThresholdMm: number;
      readonly status: string;
    };
  };
  readonly operationalWarning?: OperationalWarning;
  readonly observations?: {
    readonly temperature: number;
    readonly relativeHumidity: number;
    readonly surfacePressure: number;
    readonly cloudCover: number;
    readonly currentRainRate: number;
    readonly windSpeed: number;
  };
  readonly features: {
    readonly observedTemperature?: number;
    readonly relativeHumidity?: number;
    readonly surfacePressure?: number;
    readonly cloudCover?: number;
    readonly currentRainRate?: number;
    readonly forecast24hAccumulation?: number;
    readonly peakProbability24h?: number;
    readonly pressureTendency3h?: number;
    readonly humidityTendency3h?: number;
    readonly dewPointSpread?: number;
    readonly convectiveEnergyProxy?: number;
    readonly antecedentRain24h?: number;
    readonly satellitePrecipitation?: number;
  };
  readonly explanation: {
    readonly deterministicSummary: string;
    readonly baseValue?: number;
    readonly topFactors: readonly ShapFactor[];
    readonly positiveContributors: readonly ShapFactor[];
    readonly negativeContributors: readonly ShapFactor[];
  };
  readonly model: {
    readonly name: string;
    readonly version: string;
    readonly thresholdVersion?: string;
    readonly trainedAt: string;
    readonly thresholdMm?: number;
    readonly metrics?: ModelEvaluationMetrics;
    readonly evaluation?: ModelEvaluationMetrics;
  };
  readonly satelliteLayer?: {
    readonly source: string;
    readonly product: string;
    readonly status: string;
    readonly resolutionDeg: number;
    readonly latencyHours: number;
  };
  readonly sources?: readonly string[];
  readonly dataSources?: readonly string[];
  readonly dataStatus?: 'READY' | 'UNAVAILABLE';
  readonly disclaimer: string;
  readonly timestamp: string;
  readonly status?: 'READY' | 'UNAVAILABLE';
}

export interface ModelStatusResponse {
  readonly status: 'MODEL_READY' | 'MODEL_NOT_TRAINED' | 'MODEL_ERROR' | 'DATA_UNAVAILABLE';
  readonly modelName?: string;
  readonly modelVersion?: string;
  readonly thresholdVersion?: string;
  readonly operationalThreshold?: number;
  readonly trainedAt?: string;
  readonly featuresCount?: number;
  readonly trainingSamples?: number;
  readonly evaluation?: ModelEvaluationMetrics;
}

const ML_API_BASE_URL = 'http://127.0.0.1:8000';

class MlRiskService {
  /**
   * Fetches heavy rainfall probability and TreeSHAP explainability for given coordinates.
   */
  public async getRiskPrediction(
    latitude: number,
    longitude: number,
    city: string = 'Target Area',
    horizon: number = 24,
    signal?: AbortSignal
  ): Promise<RaiMlPredictionResponse | null> {
    try {
      const url = new URL(`${ML_API_BASE_URL}/api/prediction/heavy-rainfall`);
      url.searchParams.set('latitude', latitude.toString());
      url.searchParams.set('longitude', longitude.toString());
      url.searchParams.set('city', city);
      url.searchParams.set('horizon', horizon.toString());

      const res = await fetch(url.toString(), {
        method: 'GET',
        signal,
        headers: { 'Accept': 'application/json' },
      });

      if (!res.ok) {
        console.warn(`ML Prediction service returned HTTP ${res.status}`);
        return null;
      }

      const data = await res.json();
      if (data.dataStatus === 'UNAVAILABLE') {
        return null;
      }
      return {
        ...data,
        status: 'READY',
      };
    } catch {
      console.info('R.A.I. Python ML inference server offline or initializing.');
      return null;
    }
  }

  /**
   * Checks the operational status of the trained XGBoost model.
   */
  public async getModelStatus(signal?: AbortSignal): Promise<ModelStatusResponse> {
    try {
      const res = await fetch(`${ML_API_BASE_URL}/api/model/status`, {
        method: 'GET',
        signal,
        headers: { 'Accept': 'application/json' },
      });

      if (res.ok) {
        return await res.json();
      }
      return { status: 'MODEL_NOT_TRAINED' };
    } catch {
      return { status: 'DATA_UNAVAILABLE' };
    }
  }
}

export const mlRiskService = new MlRiskService();
