import { BaseService } from './base.service';
import { ENDPOINTS } from '../api/endpoints';
import { ApiResponse, RiskMapQueryParams } from '../types/api';

export interface SpatialLayer {
  readonly id: string;
  readonly type: 'vector_geojson' | 'raster_tile' | 'heatmap';
  readonly name: string;
  readonly url: string;
  readonly opacity: number;
}

export interface InundationZone {
  readonly regionId: string;
  readonly riskLevel: string;
  readonly geometry: unknown; // GeoJSON Polygon/MultiPolygon
  readonly waterDepthEstimateMeters: number;
}

export interface IRiskMapService {
  getActiveLayers(signal?: AbortSignal): Promise<ApiResponse<readonly SpatialLayer[]>>;
  getHotspots(params?: RiskMapQueryParams, signal?: AbortSignal): Promise<ApiResponse<readonly unknown[]>>;
  getInundationExtent(regionId: string, signal?: AbortSignal): Promise<ApiResponse<InundationZone>>;
}

export class RiskMapService extends BaseService implements IRiskMapService {
  public getActiveLayers(signal?: AbortSignal): Promise<ApiResponse<readonly SpatialLayer[]>> {
    return this.http.get<readonly SpatialLayer[]>(ENDPOINTS.RISK_MAP.LAYERS, { signal });
  }

  public getHotspots(params?: RiskMapQueryParams, signal?: AbortSignal): Promise<ApiResponse<readonly unknown[]>> {
    return this.http.get<readonly unknown[]>(ENDPOINTS.RISK_MAP.HOTSPOTS, {
      params: params ? { ...params, bbox: params.bbox?.join(',') } : undefined,
      signal,
    });
  }

  public getInundationExtent(regionId: string, signal?: AbortSignal): Promise<ApiResponse<InundationZone>> {
    return this.http.get<InundationZone>(ENDPOINTS.RISK_MAP.INUNDATION_EXTENT(regionId), { signal });
  }
}

export const riskMapService = new RiskMapService();
