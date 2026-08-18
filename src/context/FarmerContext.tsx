import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
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
}

const STORAGE_KEYS = {
  PROFILE: 'rai_farmer_profile_v1',
  CROPS: 'rai_farmer_crops_v1',
  FIELDS: 'rai_farmer_fields_v1',
  ACTIVE_CROP: 'rai_farmer_active_crop_v1',
};

const DEFAULT_FARM_LOCATION: FarmerLocation = {
  city: 'Lakhimpur',
  village: 'Mitauli Agri Block',
  district: 'Lakhimpur Kheri',
  state: 'Uttar Pradesh',
  country: 'India',
  latitude: 27.9468,
  longitude: 80.7788,
  formattedAddress: 'Mitauli Agri Block, Lakhimpur Kheri, Uttar Pradesh',
  source: 'SAVED',
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

const FarmerContext = createContext<FarmerContextType | undefined>(undefined);

export const FarmerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [isLocationUpdating, setIsLocationUpdating] = useState<boolean>(false);

  // Initialize Farm Profile from localStorage or auth
  const [farmProfile, setFarmProfile] = useState<FarmProfile>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PROFILE);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.warn('Failed to parse saved farmer profile', e);
      }
    }

    const defaultLoc = user?.villageArea && user?.district
      ? createFarmerLocation(user.villageArea, user.district, 'Gujarat', 'SAVED', user.farmLocation?.lat, user.farmLocation?.lng)
      : DEFAULT_FARM_LOCATION;

    return {
      name: `${defaultLoc.village} Farm Parcel`,
      farmerName: user?.fullName || 'Darshil Farmer',
      email: user?.email,
      location: defaultLoc,
      totalAreaAcres: 10.5,
      soilType: 'Clayey / Black Cotton',
      isProfileComplete: Boolean(saved), // Only true if explicitly saved
    };
  });

  // Initialize Crops
  const [crops, setCrops] = useState<readonly FarmCrop[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CROPS);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.warn('Failed to parse saved farmer crops', e);
      }
    }
    return DEFAULT_CROPS;
  });

  // Initialize Fields
  const [fields, setFields] = useState<readonly FarmField[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.FIELDS);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.warn('Failed to parse saved farmer fields', e);
      }
    }
    return DEFAULT_FIELDS;
  });

  // Active Crop ID
  const [activeCropId, setActiveCropIdState] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEYS.ACTIVE_CROP) || crops[0]?.id || 'crop-1';
  });

  // Sync to localStorage
  useEffect(() => {
    if (farmProfile.isProfileComplete) {
      localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(farmProfile));
    }
  }, [farmProfile]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CROPS, JSON.stringify(crops));
  }, [crops]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.FIELDS, JSON.stringify(fields));
  }, [fields]);

  const setActiveCropId = (id: string) => {
    setActiveCropIdState(id);
    localStorage.setItem(STORAGE_KEYS.ACTIVE_CROP, id);
  };

  const activeCrop = crops.find((c) => c.id === activeCropId) || crops[0] || DEFAULT_CROPS[0]!;

  const farmerLocation = farmProfile.location;

  // Adapt FarmerLocation directly into UserLocation for useWeatherData hook
  const farmLocationAsUserLocation: UserLocation = useMemo(() => {
    return {
      city: farmerLocation.city,
      region: farmerLocation.state,
      country: farmerLocation.country || 'India',
      lat: farmerLocation.latitude,
      lng: farmerLocation.longitude,
      formattedAddress: farmerLocation.formattedAddress,
    };
  }, [farmerLocation]);

  const updateFarmProfile = (updates: Partial<FarmProfile>) => {
    setFarmProfile((prev) => {
      const updated = { ...prev, ...updates };
      return updated;
    });
  };

  const updateFarmLocation = (newLocation: FarmerLocation) => {
    setIsLocationUpdating(true);
    setFarmProfile((prev) => ({
      ...prev,
      location: newLocation,
      name: prev.name.includes('Farm') ? prev.name : `${newLocation.village} Farm Parcel`,
    }));

    setTimeout(() => {
      setIsLocationUpdating(false);
    }, 400);
  };

  const completeOnboarding = (
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
      farmerName: profileData.farmerName || user?.fullName || 'Darshil Farmer',
      email: user?.email,
      location: profileData.location,
      totalAreaAcres: profileData.totalAreaAcres || 10.0,
      soilType: profileData.soilType || 'Clayey / Black Cotton',
      isProfileComplete: true,
    };

    setFields(formattedFields.length > 0 ? formattedFields : DEFAULT_FIELDS);
    setCrops(formattedCrops.length > 0 ? formattedCrops : DEFAULT_CROPS);
    setActiveCropId(formattedCrops[0]?.id || 'crop-1');
    setFarmProfile(newProfile);

    localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(newProfile));
    localStorage.setItem(STORAGE_KEYS.CROPS, JSON.stringify(formattedCrops.length > 0 ? formattedCrops : DEFAULT_CROPS));
    localStorage.setItem(STORAGE_KEYS.FIELDS, JSON.stringify(formattedFields.length > 0 ? formattedFields : DEFAULT_FIELDS));
  };

  const addCrop = (newCrop: Omit<FarmCrop, 'id'>) => {
    const crop: FarmCrop = {
      ...newCrop,
      id: `crop-${Date.now()}`,
    };
    setCrops((prev) => [...prev, crop]);
    setActiveCropId(crop.id);
  };

  const updateCropStage = (cropId: string, stage: string) => {
    setCrops((prev) =>
      prev.map((c) => (c.id === cropId ? { ...c, currentStage: stage } : c))
    );
  };

  const addField = (newField: Omit<FarmField, 'id'>) => {
    const field: FarmField = {
      ...newField,
      id: `field-${Date.now()}`,
    };
    setFields((prev) => [...prev, field]);
  };

  const resetToDefaultOnboarding = () => {
    localStorage.removeItem(STORAGE_KEYS.PROFILE);
    setFarmProfile((prev) => ({ ...prev, isProfileComplete: false }));
  };

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
        isProfileComplete: farmProfile.isProfileComplete,
        isLocationUpdating,
        updateFarmProfile,
        updateFarmLocation,
        completeOnboarding,
        setActiveCropId,
        addCrop,
        updateCropStage,
        addField,
        resetToDefaultOnboarding,
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
