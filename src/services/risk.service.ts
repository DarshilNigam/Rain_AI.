import { UserLocation } from '../types/location';

export interface RegionalRiskEvaluation {
  readonly isModelConnected: boolean;
  readonly statusMessage: string;
  readonly riskLevel: 'uncalibrated' | 'safe' | 'caution' | 'warning' | 'critical';
  readonly heavyRainfallProbability: number | null; // null until model is live
  readonly confidenceScore: number | null;
  readonly forecastHorizonHours: number;
  readonly primaryAttributions: readonly string[];
  readonly lastEvaluated: string;
}

class RiskService {
  /**
   * Future ML Inference Integration Boundary for SIH Heavy Rainfall Prediction Model.
   * Truthfully returns uncalibrated / awaiting predictive model state until ML endpoint is connected.
   */
  public async getRegionalRisk(_location: UserLocation): Promise<RegionalRiskEvaluation> {
    return {
      isModelConnected: false,
      statusMessage: 'Awaiting predictive model integration (SIH Heavy Rainfall Inference Pipeline)',
      riskLevel: 'uncalibrated',
      heavyRainfallProbability: null,
      confidenceScore: null,
      forecastHorizonHours: 24,
      primaryAttributions: [
        'Synoptic Humidity Advection',
        'Topographical Convergence',
        'Catchment Saturation Index',
      ],
      lastEvaluated: new Date().toISOString(),
    };
  }
}

export const riskService = new RiskService();
