/**
 * Farmer Domain Types for R.A.I. Agricultural Command System
 */

export interface FarmerLocation {
  readonly city: string;
  readonly village: string;
  readonly district: string;
  readonly state: string;
  readonly country: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly formattedAddress: string;
  readonly source: 'CURRENT_LOCATION' | 'MANUAL' | 'SAVED';
}

export interface FarmProfile {
  readonly name: string;
  readonly farmerName: string;
  readonly email?: string;
  readonly location: FarmerLocation;
  readonly totalAreaAcres: number;
  readonly soilType: string;
  readonly isProfileComplete: boolean;
}

export interface FarmCrop {
  readonly id: string;
  readonly name: string;
  readonly variety?: string;
  readonly fieldId: string;
  readonly fieldName: string;
  readonly sowingDate?: string;
  readonly expectedHarvestDate?: string;
  readonly currentStage: string;
  readonly maxWaterTolerance: 'Low' | 'Moderate' | 'High' | 'Very Low';
  readonly icon: string;
}

export interface FarmField {
  readonly id: string;
  readonly name: string;
  readonly areaAcres: number;
  readonly cropId?: string;
  readonly cropName?: string;
  readonly soilTexture: string;
  readonly irrigationMethod: string;
}

export interface CropStageInfo {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly riskFactor: string;
  readonly waterNeed: 'Low' | 'Moderate' | 'Critical' | 'Minimal';
}

export interface WheelSegment {
  readonly id: string;
  readonly number: number;
  readonly title: string;
  readonly shortDesc: string;
  readonly route: string;
  readonly iconName: string;
  readonly angleDeg: number;
}
