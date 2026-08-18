/**
 * R.A.I. Core Domain Types
 * Precise type definitions for the 5 Pillars:
 * 1. Intelligence
 * 2. Risk Map
 * 3. Emergency
 * 4. Relief
 * 5. Farmer
 */

/* ==========================================================================
   1. GEO & SPATIAL DOMAIN
   ========================================================================== */

export interface GeoCoordinates {
  readonly latitude: number;
  readonly longitude: number;
}

export interface BoundingBox {
  readonly north: number;
  readonly south: number;
  readonly east: number;
  readonly west: number;
}

export interface Region {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly stateOrProvince: string;
  readonly country: string;
  readonly coordinates: GeoCoordinates;
  readonly boundingBox?: BoundingBox;
  readonly elevationMeters?: number;
  readonly catchmentAreaKm2?: number;
}

/* ==========================================================================
   2. WEATHER & RAINFALL INTELLIGENCE DOMAIN
   ========================================================================== */

export type WeatherCategory =
  | 'clear'
  | 'partly_cloudy'
  | 'overcast'
  | 'mist'
  | 'light_rain'
  | 'heavy_rain'
  | 'torrential'
  | 'thunderstorm';

export interface WeatherCondition {
  readonly timestamp: string;
  readonly category: WeatherCategory;
  readonly temperatureCelsius: number;
  readonly relativeHumidityPercent: number;
  readonly atmosphericPressureHpa: number;
  readonly windSpeedKmh: number;
  readonly windDirectionDegrees: number;
  readonly cloudCoverPercent: number;
}

export interface RainfallMeasurement {
  readonly timestamp: string;
  readonly amountMm: number;
  readonly intensityMmPerHour: number;
  readonly source: 'satellite' | 'radar' | 'gauge' | 'interpolated';
}

export interface HistoricalRainfall {
  readonly regionId: string;
  readonly periodStart: string;
  readonly periodEnd: string;
  readonly totalAccumulatedMm: number;
  readonly dailyAveragesMm: readonly number[];
  readonly percentileDeviation: number; // Deviation from 30-year climate normal (%)
  readonly recordedSeries: readonly RainfallMeasurement[];
}

export type RiskLevel = 'safe' | 'caution' | 'high_risk' | 'critical';

export interface ConfidenceInterval {
  readonly lowerMm: number;
  readonly expectedMm: number;
  readonly upperMm: number;
  readonly confidenceScore: number; // 0.0 to 1.0
}

export interface RainfallPrediction {
  readonly id: string;
  readonly regionId: string;
  readonly generatedAt: string;
  readonly forecastWindowHours: number; // e.g. 24, 48, 72
  readonly expectedTotalMm: number;
  readonly peakIntensityMmPerHour: number;
  readonly confidence: ConfidenceInterval;
  readonly riskLevel: RiskLevel;
  readonly floodProbability: number;     // 0.0 to 1.0
  readonly droughtProbability: number;   // 0.0 to 1.0
  readonly modelVersion: string;
}

/* ==========================================================================
   3. EXPLAINABLE AI (XAI) DOMAIN
   ========================================================================== */

export interface RiskFactor {
  readonly featureName: string;
  readonly displayName: string;
  readonly contributionScore: number; // Positive increases risk, negative decreases
  readonly relativeImportance: number; // Normalized 0.0 to 1.0
  readonly observationValue: string | number;
  readonly baselineThreshold: string | number;
  readonly explanationNote: string;
}

export interface XAIExplanation {
  readonly predictionId: string;
  readonly generatedAt: string;
  readonly primaryDrivers: readonly RiskFactor[];
  readonly environmentalContext: string;
  readonly uncertaintyFactors: readonly string[];
  readonly plainLanguageSummary: string;
  readonly counterfactualScenarios?: readonly {
    readonly trigger: string;
    readonly resultingRiskLevel: RiskLevel;
  }[];
}

/* ==========================================================================
   4. EMERGENCY & RESPONSE DOMAIN
   ========================================================================== */

export type EmergencyCategory =
  | 'flash_flood'
  | 'riverine_inundation'
  | 'landslide_hazard'
  | 'waterlogging'
  | 'dam_overflow';

export type AlertSeverity = 'advisory' | 'watch' | 'warning' | 'emergency';

export interface EmergencyService {
  readonly id: string;
  readonly regionId: string;
  readonly alertTitle: string;
  readonly severity: AlertSeverity;
  readonly hazardCategory: EmergencyCategory;
  readonly issuedAt: string;
  readonly expiresAt: string;
  readonly affectedZones: readonly string[];
  readonly safeHavens: readonly {
    readonly name: string;
    readonly coordinates: GeoCoordinates;
    readonly capacity: number;
    readonly isAccessible: boolean;
  }[];
  readonly contactChannels: readonly {
    readonly type: 'helpline' | 'radio' | 'sms_broadcast';
    readonly value: string;
  }[];
  readonly actionChecklist: readonly string[];
}

/* ==========================================================================
   5. RELIEF & COMMUNITY DOMAIN
   ========================================================================== */

export type ReliefStatus = 'mobilizing' | 'active' | 'deployed' | 'completed';

export interface ReliefResource {
  readonly resourceType: 'potable_water' | 'food_rations' | 'medical_kits' | 'sandbags' | 'rescue_boats';
  readonly requestedUnits: number;
  readonly committedUnits: number;
  readonly unitMeasure: string;
}

export interface ReliefCampaign {
  readonly id: string;
  readonly regionId: string;
  readonly incidentId?: string;
  readonly title: string;
  readonly summary: string;
  readonly status: ReliefStatus;
  readonly startDate: string;
  readonly targetBeneficiaries: number;
  readonly resourcesNeeded: readonly ReliefResource[];
  readonly coordinatingAgency: string;
}

/* ==========================================================================
   6. FARMER & AGRONOMIC INTELLIGENCE DOMAIN
   ========================================================================== */

export type SoilType =
  | 'alluvial'
  | 'black_clay'
  | 'red_loam'
  | 'sandy_loam'
  | 'laterite';

export interface Crop {
  readonly id: string;
  readonly name: string;
  readonly botanicalName?: string;
  readonly growthDurationDays: number;
  readonly currentStage: 'sowing' | 'vegetative' | 'flowering' | 'grain_filling' | 'maturity' | 'harvest';
  readonly waterRequirementMmPerWeek: number;
  readonly floodVulnerabilityScore: number;  // 1 (low) to 5 (extreme)
  readonly droughtVulnerabilityScore: number; // 1 (low) to 5 (extreme)
}

export interface CropGuidance {
  readonly cropId: string;
  readonly cropName: string;
  readonly guidanceTimestamp: string;
  readonly recommendedAction: 'irrigate' | 'drain_fields' | 'postpone_fertilizer' | 'hasten_harvest' | 'protect_saplings';
  readonly actionableSteps: readonly string[];
  readonly riskImpactSummary: string;
  readonly soilMoistureStatusPercent: number;
}

export interface FarmerProfile {
  readonly id: string;
  readonly regionId: string;
  readonly farmAreaHectares: number;
  readonly soilType: SoilType;
  readonly activeCrops: readonly Crop[];
  readonly activeGuidance: readonly CropGuidance[];
}
