/**
 * R.A.I. API Layer Type Definitions
 * Standardized contracts for request handling, envelopes, error structures, and telemetry.
 */

export interface ApiResponse<T> {
  readonly data: T;
  readonly meta?: {
    readonly timestamp: string;
    readonly requestId: string;
    readonly processingTimeMs?: number;
    readonly pagination?: PaginationMeta;
  };
}

export interface ApiErrorDetail {
  readonly code: string;
  readonly message: string;
  readonly field?: string;
}

export interface ApiErrorResponse {
  readonly error: {
    readonly code: string;
    readonly message: string;
    readonly details?: readonly ApiErrorDetail[];
    readonly statusCode: number;
    readonly timestamp: string;
  };
}

export interface PaginationParams {
  readonly page?: number;
  readonly limit?: number;
  readonly sortBy?: string;
  readonly order?: 'asc' | 'desc';
}

export interface PaginationMeta {
  readonly currentPage: number;
  readonly totalPages: number;
  readonly totalItems: number;
  readonly hasMore: boolean;
}

export interface PredictionQueryParams {
  readonly regionId: string;
  readonly windowHours?: number;
  readonly includeXai?: boolean;
}

export interface RiskMapQueryParams {
  readonly bbox?: [number, number, number, number]; // [minLon, minLat, maxLon, maxLat]
  readonly severity?: string;
  readonly timestamp?: string;
}
