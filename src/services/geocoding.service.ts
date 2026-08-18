import { UserLocation, PRESET_CITIES } from '../types/location';

interface OpenMeteoGeocodingResult {
  readonly id: number;
  readonly name: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly elevation?: number;
  readonly country_code?: string;
  readonly country?: string;
  readonly admin1?: string; // State / Province
  readonly admin2?: string; // District / County
  readonly admin3?: string; // Municipality / Block
}

interface OpenMeteoGeocodingResponse {
  readonly results?: readonly OpenMeteoGeocodingResult[];
  readonly generationtime_ms?: number;
}

class GeocodingService {
  private cache: Map<string, UserLocation[]> = new Map();
  private maxCacheSize = 150;

  /**
   * Search for locations dynamically across all Indian cities, towns, districts,
   * and international locations using Open-Meteo's official high-precision Geocoding engine.
   */
  public async searchLocations(query: string, limit = 8): Promise<UserLocation[]> {
    const trimmed = query.trim();
    if (!trimmed) {
      return [...PRESET_CITIES.slice(0, limit)];
    }

    const normalizedKey = trimmed.toLowerCase();

    // Check memory cache
    if (this.cache.has(normalizedKey)) {
      return this.cache.get(normalizedKey)!;
    }

    // 1. Check local preset matches first for instant local hit
    const localMatches: UserLocation[] = PRESET_CITIES.filter((p) => {
      const q = normalizedKey;
      return (
        p.city.toLowerCase().includes(q) ||
        p.region.toLowerCase().includes(q) ||
        p.formattedAddress.toLowerCase().includes(q)
      );
    });

    try {
      // 2. Fetch live dynamic geocoded locations from Open-Meteo Geocoding API
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
        trimmed
      )}&count=${Math.max(limit, 10)}&language=en&format=json`;

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Geocoding server responded with status: ${response.status}`);
      }

      const data: OpenMeteoGeocodingResponse = await response.json();

      const dynamicResults: UserLocation[] = (data.results || []).map((item) => {
        const cityName = item.name;
        const regionName = item.admin1 || item.admin2 || item.country || 'Region';
        const countryName = item.country || (item.country_code === 'IN' ? 'India' : 'Global');
        const lat = parseFloat(item.latitude.toFixed(4));
        const lng = parseFloat(item.longitude.toFixed(4));

        const addressParts = [
          cityName,
          item.admin2 && item.admin2 !== cityName ? item.admin2 : null,
          item.admin1 && item.admin1 !== cityName ? item.admin1 : null,
          countryName,
        ].filter(Boolean);

        return {
          city: cityName,
          region: regionName,
          country: countryName,
          lat,
          lng,
          formattedAddress: addressParts.join(', '),
        };
      });

      // Deduplicate results by combining local preset matches and dynamic API results
      const combined: UserLocation[] = [];
      const seen = new Set<string>();

      // Add dynamic results
      for (const loc of [...dynamicResults, ...localMatches]) {
        const key = `${loc.city.toLowerCase()}_${loc.lat.toFixed(2)}_${loc.lng.toFixed(2)}`;
        if (!seen.has(key)) {
          seen.add(key);
          combined.push(loc);
        }
        if (combined.length >= limit) break;
      }

      // If combined has matches, store in cache and return
      if (combined.length > 0) {
        this.setCache(normalizedKey, combined);
        return combined;
      }
    } catch (err) {
      console.warn('[GeocodingService] Dynamic search failed, using local presets:', err);
    }

    // Fallback to local preset matches if offline or API error
    const fallbackResults = localMatches.slice(0, limit);
    this.setCache(normalizedKey, fallbackResults);
    return fallbackResults;
  }

  private setCache(key: string, data: UserLocation[]): void {
    if (this.cache.size >= this.maxCacheSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.cache.delete(oldestKey);
    }
    this.cache.set(key, data);
  }
}

export const geocodingService = new GeocodingService();
