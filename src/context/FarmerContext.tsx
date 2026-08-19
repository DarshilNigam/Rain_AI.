import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from 'react';
import { FarmProfile, FarmCrop, FarmField, FarmerLocation } from '../types/farmer';
import { UserLocation } from '../types/location';
import { createFarmerLocation } from '../utils/farmerLocation';
import { useAuth } from './AuthContext';

export interface FarmerContextType {
  readonly farmProfile: FarmProfile;
  readonly farmerLocation: FarmerLocation;
  readonly farmLocationAsUserLocation: UserLocation;
  readonly crops: readonly FarmCrop[];
  readonly fields: readonly FarmField[];
  readonly activeCropId: string;
  readonly activeCrop: FarmCrop;
  readonly isProfileComplete: boolean;
  readonly isLocationUpdating: boolean;
  readonly updateFarmProfile: (updates: Partial<FarmProfile>) => void;
  readonly updateFarmLocation: (newLocation: FarmerLocation) => void;
  readonly completeOnboarding: (
    profileData: {
      name: string;
      farmerName: string;
      location: FarmerLocation;
      totalAreaAcres: number;
      soilType: string;
    },
    initialCrops: readonly Omit<FarmCrop, 'id'>[],
    initialFields: readonly Omit<FarmField, 'id'>[]
  ) => void;
  readonly setActiveCropId: (id: string) => void;
  readonly addCrop: (newCrop: Omit<FarmCrop, 'id'>) => void;
  readonly updateCropStage: (cropId: string, stage: string) => void;
  readonly addField: (newField: Omit<FarmField, 'id'>) => void;
  readonly resetToDefaultOnboarding: () => void;
  readonly clearFarmerSession: () => void;
}

// User-scoped storage key generator
const getScopedKey = (userId: string | undefined, suffix: string): string => {
  const safeId = userId && userId.trim() ? userId.trim().replace(/[^a-zA-Z0-9_-]/g, '_') : 'unauthenticated';
  return `rai_farmer_v2_${safeId}_${suffix}`;
};

// Purge any legacy unscoped storage keys that could leak across accounts
const purgeLegacyGlobalStorage = (): void => {
  try {
    localStorage.removeItem('rai_farmer_profile_v1');
    localStorage.removeItem('rai_farmer_crops_v1');
    localStorage.removeItem('rai_farmer_fields_v1');
    localStorage.removeItem('rai_farmer_active_crop_v1');
  } catch {
    // Ignore storage errors
  }
};

export const EMPTY_FARM_LOCATION: FarmerLocation = {
  city: '',
  village: '',
  district: '',
  state: '',
  country: 'India',
  latitude: 20.5937,
  longitude: 78.9629,
  formattedAddress: '',
  source: 'MANUAL',
};

const DEFAULT_CROPS: readonly FarmCrop[] = [
  {
    id: 'crop-1',
    name: 'Wheat',
    variety: 'Sharbati PBW-343',
    fieldId: 'field-1',
    fieldName: 'North Field A',
    sowingDate: '2026-01-10',
    expectedHarvestDate: '2026-04-15',
    currentStage: 'Vegetative Growth',
    maxWaterTolerance: 'Moderate',
    icon: '🌾',
  },
  {
    id: 'crop-2',
    name: 'Rice / Paddy',
    variety: 'Basmati Pusa 1121',
    fieldId: 'field-2',
    fieldName: 'South Basin Field',
    sowingDate: '2026-02-01',
    expectedHarvestDate: '2026-06-20',
    currentStage: 'Flowering',
    maxWaterTolerance: 'High',
    icon: '🌱',
  },
];

const DEFAULT_FIELDS: readonly FarmField[] = [
  {
    id: 'field-1',
    name: 'North Field A',
    areaAcres: 4.5,
    cropId: 'crop-1',
    cropName: 'Wheat',
    soilTexture: 'Clayey / Black Cotton',
    irrigationMethod: 'Drip / Furrow',
  },
  {
    id: 'field-2',
    name: 'South Basin Field',
    areaAcres: 6.0,
    cropId: 'crop-2',
    cropName: 'Rice / Paddy',
    soilTexture: 'Alluvial Silt Loam',
    irrigationMethod: 'Canal Flooding',
  },
];

interface ScopedFarmerState {
  readonly profile: FarmProfile | null;
  readonly crops: readonly FarmCrop[];
  readonly fields: readonly FarmField[];
  readonly activeCropId: string;
  readonly isComplete: boolean;
}

const FarmerContext = createContext<FarmerContextType | undefined>(undefined);

export const FarmerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const currentUserId = user?.id;

  // Cleanup legacy global storage on mount to guarantee data isolation
  useEffect(() => {
    purgeLegacyGlobalStorage();
  }, []);

  const [isLocationUpdating, setIsLocationUpdating] = useState<boolean>(false);

  // Pure function to load farmer state strictly scoped to the active user's ID
  const loadScopedData = useCallback((uid: string | undefined): ScopedFarmerState => {
    if (!uid) {
      return {
        profile: null,
        crops: DEFAULT_CROPS,
        fields: DEFAULT_FIELDS,
        activeCropId: 'crop-1',
        isComplete: false,
      };
    }

    try {
      const profileKey = getScopedKey(uid, 'profile');
      const cropsKey = getScopedKey(uid, 'crops');
      const fieldsKey = getScopedKey(uid, 'fields');
      const activeCropKey = getScopedKey(uid, 'active_crop');

      const savedProfileStr = localStorage.getItem(profileKey);
      let parsedProfile: FarmProfile | null = null;
      if (savedProfileStr) {
        try {
          const parsed = JSON.parse(savedProfileStr);
          // Verify that this profile has legitimate non-empty location fields
          if (parsed && parsed.location && parsed.location.village && parsed.location.district) {
            parsedProfile = parsed;
          }
        } catch {
          console.warn('Failed to parse scoped farmer profile');
        }
      }

      // If user registered with explicit farmer details, use them as pristine initial state
      if (!parsedProfile && user && user.role === 'farmer' && user.villageArea && user.district) {
        const regLoc = createFarmerLocation(
          user.villageArea,
          user.district,
          'Gujarat',
          'SAVED',
          user.farmLocation?.lat,
          user.farmLocation?.lng
        );
        parsedProfile = {
          name: `${user.villageArea} Farm Parcel`,
          farmerName: user.fullName || 'Farmer',
          email: user.email,
          location: regLoc,
          totalAreaAcres: 5.0,
          soilType: 'Clayey / Black Cotton',
          isProfileComplete: true,
        };
        // Persist to user-scoped storage
        localStorage.setItem(profileKey, JSON.stringify(parsedProfile));
      }

      const savedCropsStr = localStorage.getItem(cropsKey);
      const parsedCrops: readonly FarmCrop[] = savedCropsStr ? JSON.parse(savedCropsStr) : DEFAULT_CROPS;

      const savedFieldsStr = localStorage.getItem(fieldsKey);
      const parsedFields: readonly FarmField[] = savedFieldsStr ? JSON.parse(savedFieldsStr) : DEFAULT_FIELDS;

      const savedActiveCropId = localStorage.getItem(activeCropKey) || parsedCrops[0]?.id || 'crop-1';

      return {
        profile: parsedProfile,
        crops: parsedCrops,
        fields: parsedFields,
        activeCropId: savedActiveCropId,
        isComplete: Boolean(parsedProfile && parsedProfile.isProfileComplete),
      };
    } catch (err) {
      console.warn('Failed to load user-scoped farmer profile', err);
      return {
        profile: null,
        crops: DEFAULT_CROPS,
        fields: DEFAULT_FIELDS,
        activeCropId: 'crop-1',
        isComplete: false,
      };
    }
  }, [user]);

  // Scoped state holder
  const [scopedState, setScopedState] = useState<ScopedFarmerState>(() => loadScopedData(currentUserId));

  // Critical reactivity: whenever user logs in, logs out, or switches accounts, re-scope immediately
  useEffect(() => {
    setScopedState(loadScopedData(currentUserId));
  }, [currentUserId, loadScopedData]);

  // Fallback pristine profile when no valid profile has been established for current user
  const fallbackEmptyProfile: FarmProfile = useMemo(() => {
    const defaultLoc = user?.villageArea && user?.district
      ? createFarmerLocation(user.villageArea, user.district, 'Gujarat', 'SAVED', user.farmLocation?.lat, user.farmLocation?.lng)
      : EMPTY_FARM_LOCATION;

    return {
      name: user?.fullName ? `${user.fullName}'s Farm` : 'Unassigned Farm Parcel',
      farmerName: user?.fullName || 'Farmer',
      email: user?.email,
      location: defaultLoc,
      totalAreaAcres: 0,
      soilType: 'Clayey / Black Cotton',
      isProfileComplete: false,
    };
  }, [user]);

  const farmProfile: FarmProfile = scopedState.profile || fallbackEmptyProfile;
  const farmerLocation: FarmerLocation = farmProfile.location;
  const isProfileComplete: boolean = scopedState.isComplete && Boolean(farmerLocation.village && farmerLocation.district);

  const crops: readonly FarmCrop[] = scopedState.crops;
  const fields: readonly FarmField[] = scopedState.fields;
  const activeCropId: string = scopedState.activeCropId;

  const activeCrop = crops.find((c) => c.id === activeCropId) || crops[0] || DEFAULT_CROPS[0]!;

  // Adapt FarmerLocation directly into UserLocation for useWeatherData hook
  const farmLocationAsUserLocation: UserLocation = useMemo(() => {
    return {
      city: farmerLocation.city || farmerLocation.village || farmerLocation.district || 'Farm Site',
      region: farmerLocation.state || 'Region',
      country: farmerLocation.country || 'India',
      lat: farmerLocation.latitude,
      lng: farmerLocation.longitude,
      formattedAddress: farmerLocation.formattedAddress || `${farmerLocation.village}, ${farmerLocation.district}`,
    };
  }, [farmerLocation]);

  const setActiveCropId = useCallback((id: string) => {
    setScopedState((prev) => ({ ...prev, activeCropId: id }));
    if (currentUserId) {
      localStorage.setItem(getScopedKey(currentUserId, 'active_crop'), id);
    }
  }, [currentUserId]);

  const updateFarmProfile = useCallback((updates: Partial<FarmProfile>) => {
    setScopedState((prev) => {
      const base = prev.profile || fallbackEmptyProfile;
      const updated: FarmProfile = {
        ...base,
        ...updates,
        isProfileComplete: true,
      };
      if (currentUserId) {
        localStorage.setItem(getScopedKey(currentUserId, 'profile'), JSON.stringify(updated));
      }
      return {
        ...prev,
        profile: updated,
        isComplete: true,
      };
    });
  }, [currentUserId, fallbackEmptyProfile]);

  const updateFarmLocation = useCallback((newLocation: FarmerLocation) => {
    setIsLocationUpdating(true);
    setScopedState((prev) => {
      const base = prev.profile || fallbackEmptyProfile;
      const updated: FarmProfile = {
        ...base,
        location: newLocation,
        name: base.name && !base.name.includes('Unassigned') ? base.name : `${newLocation.village} Farm Parcel`,
        isProfileComplete: true,
      };
      if (currentUserId) {
        localStorage.setItem(getScopedKey(currentUserId, 'profile'), JSON.stringify(updated));
      }
      return {
        ...prev,
        profile: updated,
        isComplete: true,
      };
    });

    setTimeout(() => {
      setIsLocationUpdating(false);
    }, 400);
  }, [currentUserId, fallbackEmptyProfile]);

  const completeOnboarding = useCallback((
    profileData: {
      name: string;
      farmerName: string;
      location: FarmerLocation;
      totalAreaAcres: number;
      soilType: string;
    },
    initialCrops: readonly Omit<FarmCrop, 'id'>[],
    initialFields: readonly Omit<FarmField, 'id'>[]
  ) => {
    const formattedFields: readonly FarmField[] = initialFields.map((f, i) => ({
      ...f,
      id: `field-${Date.now()}-${i}`,
    }));

    const formattedCrops: readonly FarmCrop[] = initialCrops.map((c, i) => ({
      ...c,
      id: `crop-${Date.now()}-${i}`,
      fieldId: formattedFields[i]?.id || formattedFields[0]?.id || 'field-1',
      fieldName: formattedFields[i]?.name || formattedFields[0]?.name || 'Main Plot',
    }));

    const newProfile: FarmProfile = {
      name: profileData.name || `${profileData.location.village} Farm Parcel`,
      farmerName: profileData.farmerName || user?.fullName || 'Farmer',
      email: user?.email,
      location: profileData.location,
      totalAreaAcres: profileData.totalAreaAcres || 5.0,
      soilType: profileData.soilType || 'Clayey / Black Cotton',
      isProfileComplete: true,
    };

    const finalFields = formattedFields.length > 0 ? formattedFields : DEFAULT_FIELDS;
    const finalCrops = formattedCrops.length > 0 ? formattedCrops : DEFAULT_CROPS;
    const finalActiveCropId = finalCrops[0]?.id || 'crop-1';

    setScopedState({
      profile: newProfile,
      crops: finalCrops,
      fields: finalFields,
      activeCropId: finalActiveCropId,
      isComplete: true,
    });

    if (currentUserId) {
      localStorage.setItem(getScopedKey(currentUserId, 'profile'), JSON.stringify(newProfile));
      localStorage.setItem(getScopedKey(currentUserId, 'crops'), JSON.stringify(finalCrops));
      localStorage.setItem(getScopedKey(currentUserId, 'fields'), JSON.stringify(finalFields));
      localStorage.setItem(getScopedKey(currentUserId, 'active_crop'), finalActiveCropId);
    }
  }, [currentUserId, user]);

  const addCrop = useCallback((newCrop: Omit<FarmCrop, 'id'>) => {
    const crop: FarmCrop = {
      ...newCrop,
      id: `crop-${Date.now()}`,
    };
    setScopedState((prev) => {
      const nextCrops = [...prev.crops, crop];
      if (currentUserId) {
        localStorage.setItem(getScopedKey(currentUserId, 'crops'), JSON.stringify(nextCrops));
        localStorage.setItem(getScopedKey(currentUserId, 'active_crop'), crop.id);
      }
      return {
        ...prev,
        crops: nextCrops,
        activeCropId: crop.id,
      };
    });
  }, [currentUserId]);

  const updateCropStage = useCallback((cropId: string, stage: string) => {
    setScopedState((prev) => {
      const nextCrops = prev.crops.map((c) => (c.id === cropId ? { ...c, currentStage: stage } : c));
      if (currentUserId) {
        localStorage.setItem(getScopedKey(currentUserId, 'crops'), JSON.stringify(nextCrops));
      }
      return {
        ...prev,
        crops: nextCrops,
      };
    });
  }, [currentUserId]);

  const addField = useCallback((newField: Omit<FarmField, 'id'>) => {
    const field: FarmField = {
      ...newField,
      id: `field-${Date.now()}`,
    };
    setScopedState((prev) => {
      const nextFields = [...prev.fields, field];
      if (currentUserId) {
        localStorage.setItem(getScopedKey(currentUserId, 'fields'), JSON.stringify(nextFields));
      }
      return {
        ...prev,
        fields: nextFields,
      };
    });
  }, [currentUserId]);

  const resetToDefaultOnboarding = useCallback(() => {
    if (currentUserId) {
      localStorage.removeItem(getScopedKey(currentUserId, 'profile'));
    }
    setScopedState((prev) => ({
      ...prev,
      profile: null,
      isComplete: false,
    }));
  }, [currentUserId]);

  const clearFarmerSession = useCallback(() => {
    if (currentUserId) {
      localStorage.removeItem(getScopedKey(currentUserId, 'profile'));
      localStorage.removeItem(getScopedKey(currentUserId, 'crops'));
      localStorage.removeItem(getScopedKey(currentUserId, 'fields'));
      localStorage.removeItem(getScopedKey(currentUserId, 'active_crop'));
    }
    setScopedState({
      profile: null,
      crops: DEFAULT_CROPS,
      fields: DEFAULT_FIELDS,
      activeCropId: 'crop-1',
      isComplete: false,
    });
  }, [currentUserId]);

  return (
    <FarmerContext.Provider
      value={{
        farmProfile,
        farmerLocation,
        farmLocationAsUserLocation,
        crops,
        fields,
        activeCropId,
        activeCrop,
        isProfileComplete,
        isLocationUpdating,
        updateFarmProfile,
        updateFarmLocation,
        completeOnboarding,
        setActiveCropId,
        addCrop,
        updateCropStage,
        addField,
        resetToDefaultOnboarding,
        clearFarmerSession,
      }}
    >
      {children}
    </FarmerContext.Provider>
  );
};

export const useFarmerContext = (): FarmerContextType => {
  const context = useContext(FarmerContext);
  if (!context) {
    throw new Error('useFarmerContext must be used within a FarmerProvider');
  }
  return context;
};
