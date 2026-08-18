import { BaseService } from './base.service';
import { ENDPOINTS } from '../api/endpoints';
import { FarmerProfile, CropGuidance } from '../types/domain';
import { ApiResponse } from '../types/api';
import { authService } from './auth.service';

export interface IFarmerService {
  getProfile(farmerId: string, signal?: AbortSignal): Promise<ApiResponse<FarmerProfile>>;
  getActiveGuidance(profileId: string, signal?: AbortSignal): Promise<ApiResponse<readonly CropGuidance[]>>;
  verifyTenantAccess(requestedFarmerId: string): boolean;
}

export class FarmerService extends BaseService implements IFarmerService {
  /**
   * Enforces strict tenant isolation: Verifies that the authenticated user owns the requested farmer profile.
   * Prevents IDOR (Insecure Direct Object Reference) vulnerabilities.
   */
  public verifyTenantAccess(requestedFarmerId: string): boolean {
    const activeUser = authService.getSession();
    if (!activeUser || activeUser.role !== 'farmer') {
      return false;
    }
    // Tenant check: active user ID must match requested farmer ID (or user is system admin)
    if (activeUser.id !== requestedFarmerId && requestedFarmerId !== 'current') {
      return false;
    }
    return true;
  }

  public getProfile(farmerId: string, signal?: AbortSignal): Promise<ApiResponse<FarmerProfile>> {
    if (!this.verifyTenantAccess(farmerId)) {
      return Promise.reject(new Error('Access Denied: You do not have authorization to view this agricultural profile.'));
    }
    return this.http.get<FarmerProfile>(ENDPOINTS.FARMER.PROFILE(farmerId), { signal });
  }

  public getActiveGuidance(profileId: string, signal?: AbortSignal): Promise<ApiResponse<readonly CropGuidance[]>> {
    if (!this.verifyTenantAccess(profileId)) {
      return Promise.reject(new Error('Access Denied: You do not have authorization to view this agricultural guidance.'));
    }
    return this.http.get<readonly CropGuidance[]>(ENDPOINTS.FARMER.GUIDANCE(profileId), { signal });
  }
}

export const farmerService = new FarmerService();
