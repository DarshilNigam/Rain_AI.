import { RiskLevel } from '../types/domain';

/**
 * Format rainfall depth in millimeters
 */
export function formatMillimeters(val: number, decimals: number = 1): string {
  return `${val.toFixed(decimals)} mm`;
}

/**
 * Format percentage values
 */
export function formatPercentage(val: number, isRatio0to1: boolean = true): string {
  const percentage = isRatio0to1 ? val * 100 : val;
  return `${Math.round(percentage)}%`;
}

/**
 * Map risk level to semantic display text
 */
export function getRiskLevelLabel(level: RiskLevel): string {
  switch (level) {
    case 'safe':
      return 'Optimal / Safe';
    case 'caution':
      return 'Advisory / Caution';
    case 'high_risk':
      return 'High Precipitation Risk';
    case 'critical':
      return 'Critical Emergency Risk';
  }
}
