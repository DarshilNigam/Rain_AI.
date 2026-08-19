import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { UserLocation, DEFAULT_USER_LOCATION, PRESET_CITIES } from '../types/location';
import { useAuth } from './AuthContext';
import { authService } from '../services/auth.service';

interface LocationContextType {
  readonly location: UserLocation;
  readonly setLocation: (location: UserLocation) => void;
  readonly detectCurrentLocation: () => Promise<UserLocation>;
  readonly isLocating: boolean;
  readonly locationError: string | null;
}

const STORAGE_ACTIVE_LOCATION_KEY = 'rai_active_location';

const LocationContext = createContext<LocationContextType | undefined>(undefined);

const resolveInitialLocation = (userLocation?: UserLocation): UserLocation => {
  // Priority 1: Authenticated user's explicit saved location
  if (userLocation && userLocation.city && typeof userLocation.lat === 'number') {
    return userLocation;
  }

  // Priority 2: User's explicit current-session location selection
  try {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_ACTIVE_LOCATION_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as UserLocation;
        if (parsed && parsed.city && typeof parsed.lat === 'number' && typeof parsed.lng === 'number') {
          return parsed;
        }
      }
    }
  } catch {
    // Ignore storage parse errors
  }

  // Priority 4: Default location as final fallback
  return DEFAULT_USER_LOCATION;
};

export const LocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [location, setLocationState] = useState<UserLocation>(() => resolveInitialLocation(user?.location));
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Synchronize location whenever authenticated user profile or session changes
  useEffect(() => {
    if (user?.location && user.location.city) {
      setLocationState(user.location);
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(STORAGE_ACTIVE_LOCATION_KEY, JSON.stringify(user.location));
        }
      } catch {
        // ignore
      }
    }
  }, [user]);

  const setLocation = useCallback(
    (newLoc: UserLocation) => {
      setLocationState(newLoc);
      setLocationError(null);
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(STORAGE_ACTIVE_LOCATION_KEY, JSON.stringify(newLoc));
        }
      } catch {
        // ignore
      }
      if (user?.id) {
        authService.updateUserLocation(user.id, newLoc).catch(console.error);
      }
    },
    [user]
  );

  const detectCurrentLocation = useCallback(async (): Promise<UserLocation> => {
    if (!navigator.geolocation) {
      const err = 'Geolocation is not supported by your browser environment.';
      setLocationError(err);
      throw new Error(err);
    }

    setIsLocating(true);
    setLocationError(null);

    return new Promise<UserLocation>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = parseFloat(pos.coords.latitude.toFixed(4));
          const lng = parseFloat(pos.coords.longitude.toFixed(4));

          // Try to find closest known preset city, or create custom location node
          let bestMatch: UserLocation = PRESET_CITIES[0]!;
          let minDistance = Infinity;

          for (const city of PRESET_CITIES) {
            const dist = Math.hypot(city.lat - lat, city.lng - lng);
            if (dist < minDistance) {
              minDistance = dist;
              bestMatch = city;
            }
          }

          // If within ~0.5 degree (~55km), use the matched city name; otherwise create GPS node
          let resolvedLoc: UserLocation;
          if (minDistance < 0.5) {
            resolvedLoc = {
              ...bestMatch,
              lat,
              lng,
            };
          } else {
            resolvedLoc = {
              city: `Local Node (${lat.toFixed(2)}°N)`,
              region: 'Regional Catchment',
              country: 'India',
              lat,
              lng,
              formattedAddress: `Local Coordinates: [${lat}° N, ${lng}° E]`,
            };
          }

          setLocationState(resolvedLoc);
          setIsLocating(false);
          try {
            if (typeof localStorage !== 'undefined') {
              localStorage.setItem(STORAGE_ACTIVE_LOCATION_KEY, JSON.stringify(resolvedLoc));
            }
          } catch {
            // ignore
          }
          if (user?.id) {
            authService.updateUserLocation(user.id, resolvedLoc).catch(console.error);
          }
          resolve(resolvedLoc);
        },
        (err) => {
          setIsLocating(false);
          const msg = err.message || 'Unable to retrieve location coordinates.';
          setLocationError(msg);
          reject(new Error(msg));
        },
        { timeout: 8000, enableHighAccuracy: true }
      );
    });
  }, [user]);

  const value: LocationContextType = {
    location,
    setLocation,
    detectCurrentLocation,
    isLocating,
    locationError,
  };

  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
};

export const useLocationContext = (): LocationContextType => {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocationContext must be used within a LocationProvider');
  }
  return context;
};
