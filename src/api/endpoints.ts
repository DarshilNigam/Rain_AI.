/**
 * R.A.I. Service Endpoints Configuration
 * Abstracted routes ready for microservice or monolith API backends.
 */

import { APP_CONFIG } from '../config/env.config';

export const API_BASE_URL = APP_CONFIG.apiBaseUrl || '/api/v1';

export const ENDPOINTS = {
  REGIONS: {
    LIST: '/regions',
    GET_BY_ID: (id: string) => `/regions/${id}`,
    SEARCH: '/regions/search',
  },
  INTELLIGENCE: {
    PREDICT: '/intelligence/predictions',
    LATEST: (regionId: string) => `/intelligence/regions/${regionId}/latest`,
    HISTORICAL: (regionId: string) => `/intelligence/regions/${regionId}/historical`,
    XAI_EXPLANATION: (predictionId: string) => `/intelligence/predictions/${predictionId}/explain`,
  },
  RISK_MAP: {
    LAYERS: '/risk-map/layers',
    HOTSPOTS: '/risk-map/hotspots',
    INUNDATION_EXTENT: (regionId: string) => `/risk-map/regions/${regionId}/inundation`,
  },
  EMERGENCY: {
    ACTIVE_ALERTS: '/emergency/alerts',
    GET_ALERT: (id: string) => `/emergency/alerts/${id}`,
    EVACUATION_ZONES: (regionId: string) => `/emergency/regions/${regionId}/evacuation`,
  },
  RELIEF: {
    CAMPAIGNS: '/relief/campaigns',
    GET_CAMPAIGN: (id: string) => `/relief/campaigns/${id}`,
    RESOURCE_STATUS: (campaignId: string) => `/relief/campaigns/${campaignId}/resources`,
  },
  FARMER: {
    PROFILE: (id: string) => `/farmer/profiles/${id}`,
    GUIDANCE: (profileId: string) => `/farmer/profiles/${profileId}/guidance`,
    CROP_RECOMMENDATIONS: (regionId: string) => `/farmer/regions/${regionId}/crop-advisory`,
  },
} as const;
