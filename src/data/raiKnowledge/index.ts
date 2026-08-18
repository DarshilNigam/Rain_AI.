/**
 * R.A.I. Structured Knowledge Base Index
 * Auto-generated master index containing 35,857 domain knowledge examples.
 */

import { RaiKnowledgeItem } from '../../types/knowledge';

import conversationData from './conversation.json';
import generalWeatherData from './general_weather.json';
import rainfallForecastData from './rainfall_forecast.json';
import rainfallAmountData from './rainfall_amount.json';
import rainfallClassificationData from './rainfall_classification.json';
import rainProbabilityData from './rain_probability.json';
import heavyRainData from './heavy_rain.json';
import cloudburstData from './cloudburst.json';
import weatherVariablesData from './weather_variables.json';
import forecastInterpretationData from './forecast_interpretation.json';
import raiMlData from './rai_ml.json';
import explainableAiData from './explainable_ai.json';
import riskTiersData from './risk_tiers.json';
import agricultureData from './agriculture.json';
import practicalActionsData from './practical_actions.json';
import comparisonsData from './comparisons.json';
import followupsData from './followups.json';
import slangTyposData from './slang_typos.json';

export const RAI_KNOWLEDGE_PARTITIONS: Record<string, RaiKnowledgeItem[]> = {
  NORMAL_CONVERSATION: conversationData as RaiKnowledgeItem[],
  GENERAL_WEATHER: generalWeatherData as RaiKnowledgeItem[],
  RAINFALL_FORECAST: rainfallForecastData as RaiKnowledgeItem[],
  RAINFALL_AMOUNT: rainfallAmountData as RaiKnowledgeItem[],
  RAINFALL_CLASSIFICATION: rainfallClassificationData as RaiKnowledgeItem[],
  RAIN_PROBABILITY: rainProbabilityData as RaiKnowledgeItem[],
  HEAVY_RAIN: heavyRainData as RaiKnowledgeItem[],
  CLOUDBURST: cloudburstData as RaiKnowledgeItem[],
  WEATHER_VARIABLES: weatherVariablesData as RaiKnowledgeItem[],
  FORECAST_INTERPRETATION: forecastInterpretationData as RaiKnowledgeItem[],
  RAI_ML: raiMlData as RaiKnowledgeItem[],
  EXPLAINABLE_AI: explainableAiData as RaiKnowledgeItem[],
  RISK_TIERS: riskTiersData as RaiKnowledgeItem[],
  AGRICULTURE: agricultureData as RaiKnowledgeItem[],
  PRACTICAL_ACTIONS: practicalActionsData as RaiKnowledgeItem[],
  COMPARISONS: comparisonsData as RaiKnowledgeItem[],
  FOLLOW_UPS: followupsData as RaiKnowledgeItem[],
  TYPOS_SLANG: slangTyposData as RaiKnowledgeItem[],
};

export const RAI_TOTAL_KNOWLEDGE_COUNT = 35857;

let cachedAllItems: RaiKnowledgeItem[] | null = null;

export function getAllRaiKnowledgeItems(): RaiKnowledgeItem[] {
  if (cachedAllItems) return cachedAllItems;
  cachedAllItems = Object.values(RAI_KNOWLEDGE_PARTITIONS).flat();
  return cachedAllItems;
}
