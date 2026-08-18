import { UserLocation } from '../types/location';
import {
  RaiWeatherData,
  WeatherSnapshot,
  HourlyWeatherPoint,
  DailyWeatherPoint,
  RaiWeatherContextSummary,
  interpretWmoCode,
} from '../types/weather';

interface OpenMeteoResponse {
  readonly latitude: number;
  readonly longitude: number;
  readonly elevation: number;
  readonly timezone: string;
  readonly current?: {
    readonly time: string;
    readonly temperature_2m: number;
    readonly relative_humidity_2m: number;
    readonly precipitation: number;
    readonly rain: number;
    readonly showers: number;
    readonly weather_code: number;
    readonly cloud_cover: number;
    readonly wind_speed_10m: number;
    readonly wind_direction_10m: number;
    readonly surface_pressure: number;
    readonly is_day?: number;
  };
  readonly hourly?: {
    readonly time: readonly string[];
    readonly temperature_2m: readonly number[];
    readonly precipitation: readonly number[];
    readonly rain: readonly number[];
    readonly showers: readonly number[];
    readonly precipitation_probability: readonly number[];
    readonly relative_humidity_2m: readonly number[];
    readonly cloud_cover: readonly number[];
    readonly wind_speed_10m: readonly number[];
    readonly surface_pressure: readonly number[];
  };
  readonly daily?: {
    readonly time: readonly string[];
    readonly precipitation_sum: readonly number[];
    readonly rain_sum: readonly number[];
    readonly precipitation_probability_max: readonly number[];
    readonly temperature_2m_max: readonly number[];
    readonly temperature_2m_min: readonly number[];
    readonly sunrise: readonly string[];
    readonly sunset: readonly string[];
    readonly weather_code: readonly number[];
  };
}

interface CacheEntry {
  readonly data: RaiWeatherData;
  readonly expiresAt: number;
}

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes cache TTL

class WeatherService {
  private cache: Map<string, CacheEntry> = new Map();

  private getCacheKey(lat: number, lng: number): string {
    return `${lat.toFixed(3)}_${lng.toFixed(3)}`;
  }

  /**
   * Retrieves normalized full forecast for the given geographic coordinate node.
   */
  public async getForecast(location: UserLocation): Promise<RaiWeatherData> {
    const key = this.getCacheKey(location.lat, location.lng);
    const now = Date.now();

    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > now) {
      return cached.data;
    }

    try {
      const url = new URL('https://api.open-meteo.com/v1/forecast');
      url.searchParams.set('latitude', location.lat.toString());
      url.searchParams.set('longitude', location.lng.toString());
      url.searchParams.set(
        'current',
        'temperature_2m,relative_humidity_2m,precipitation,rain,showers,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m,surface_pressure,is_day'
      );
      url.searchParams.set(
        'hourly',
        'temperature_2m,precipitation,rain,showers,precipitation_probability,relative_humidity_2m,cloud_cover,wind_speed_10m,surface_pressure'
      );
      url.searchParams.set(
        'daily',
        'precipitation_sum,rain_sum,precipitation_probability_max,temperature_2m_max,temperature_2m_min,sunrise,sunset,weather_code'
      );
      url.searchParams.set('timezone', 'auto');
      url.searchParams.set('forecast_days', '7');

      const response = await fetch(url.toString(), {
        headers: {
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Open-Meteo API returned status ${response.status}`);
      }

      const raw: OpenMeteoResponse = await response.json();
      const normalized = this.normalizeResponse(raw, location);

      this.cache.set(key, {
        data: normalized,
        expiresAt: now + CACHE_TTL_MS,
      });

      return normalized;
    } catch (err: unknown) {
      console.error('WeatherService fetch failure for location', location, err);
      throw new Error('Local weather intelligence is temporarily unavailable.');
    }
  }

  /**
   * Returns current instantaneous weather snapshot.
   */
  public async getCurrentWeather(location: UserLocation): Promise<WeatherSnapshot> {
    const full = await this.getForecast(location);
    return full.current;
  }

  /**
   * Builds clean, factual context summary for the future R.A.I. Intelligence chatbot and Risk Engine.
   */
  public async getWeatherContext(location: UserLocation): Promise<RaiWeatherContextSummary> {
    const forecast = await this.getForecast(location);
    const curr = forecast.current;

    // Calculate sum of precipitation for the next 24 hourly buckets
    const next24hHours = forecast.hourly.slice(0, 24);
    const next24hPrecipSum = next24hHours.reduce((sum, h) => sum + h.precipitation, 0);
    const maxProb24h = next24hHours.reduce(
      (max, h) => Math.max(max, h.precipitationProbability || 0),
      0
    );

    const plainSummary = `Current conditions at ${location.city}, ${location.region}: ${curr.temperature.toFixed(1)}°C, ${curr.weatherCondition}, humidity ${curr.humidity}%, wind ${curr.windSpeed.toFixed(1)} km/h. Next 24h accumulated precipitation projection: ${next24hPrecipSum.toFixed(1)} mm (peak probability: ${maxProb24h}%).`;

    return {
      locationLabel: `${location.city}, ${location.region}`,
      currentTempC: curr.temperature,
      currentCondition: curr.weatherCondition,
      currentPrecipitationMm: curr.precipitation,
      currentHumidityPercent: curr.humidity,
      currentWindSpeedKmh: curr.windSpeed,
      currentPressureHpa: curr.pressure,
      next24hPrecipitationSumMm: parseFloat(next24hPrecipSum.toFixed(1)),
      maxPrecipitationProbabilityNext24h: maxProb24h,
      plainSummary,
    };
  }

  /**
   * Normalizes raw Open-Meteo response into domain RaiWeatherData.
   */
  private normalizeResponse(raw: OpenMeteoResponse, location: UserLocation): RaiWeatherData {
    const currRaw = raw.current;
    const weatherCode = currRaw?.weather_code ?? 0;

    const current: WeatherSnapshot = {
      timestamp: currRaw?.time || new Date().toISOString(),
      temperature: currRaw?.temperature_2m ?? 0,
      humidity: currRaw?.relative_humidity_2m ?? 0,
      precipitation: currRaw?.precipitation ?? 0,
      rain: currRaw?.rain ?? 0,
      showers: currRaw?.showers ?? 0,
      cloudCover: currRaw?.cloud_cover ?? 0,
      windSpeed: currRaw?.wind_speed_10m ?? 0,
      windDirection: currRaw?.wind_direction_10m ?? 0,
      pressure: currRaw?.surface_pressure ?? 1013.25,
      weatherCode,
      weatherCondition: interpretWmoCode(weatherCode),
      isDay: currRaw?.is_day !== 0,
    };

    const hourly: HourlyWeatherPoint[] = [];
    if (raw.hourly && Array.isArray(raw.hourly.time)) {
      const times = raw.hourly.time;
      for (let i = 0; i < times.length; i++) {
        hourly.push({
          time: times[i]!,
          temperature: raw.hourly.temperature_2m?.[i] ?? 0,
          precipitation: raw.hourly.precipitation?.[i] ?? 0,
          rain: raw.hourly.rain?.[i] ?? 0,
          showers: raw.hourly.showers?.[i] ?? 0,
          precipitationProbability: raw.hourly.precipitation_probability?.[i] ?? 0,
          humidity: raw.hourly.relative_humidity_2m?.[i] ?? 0,
          cloudCover: raw.hourly.cloud_cover?.[i] ?? 0,
          windSpeed: raw.hourly.wind_speed_10m?.[i] ?? 0,
          pressure: raw.hourly.surface_pressure?.[i] ?? 1013.25,
        });
      }
    }

    const daily: DailyWeatherPoint[] = [];
    if (raw.daily && Array.isArray(raw.daily.time)) {
      const times = raw.daily.time;
      for (let i = 0; i < times.length; i++) {
        const dCode = raw.daily.weather_code?.[i] ?? 0;
        daily.push({
          date: times[i]!,
          precipitationSum: raw.daily.precipitation_sum?.[i] ?? 0,
          rainSum: raw.daily.rain_sum?.[i] ?? 0,
          precipitationProbabilityMax: raw.daily.precipitation_probability_max?.[i] ?? 0,
          temperatureMax: raw.daily.temperature_2m_max?.[i] ?? 0,
          temperatureMin: raw.daily.temperature_2m_min?.[i] ?? 0,
          sunrise: raw.daily.sunrise?.[i] || '',
          sunset: raw.daily.sunset?.[i] || '',
          weatherCode: dCode,
          weatherCondition: interpretWmoCode(dCode),
        });
      }
    }

    return {
      location: {
        city: location.city,
        region: location.region,
        country: location.country,
        lat: location.lat,
        lng: location.lng,
      },
      current,
      hourly,
      daily,
      fetchedAt: Date.now(),
      attribution: 'Weather data by Open-Meteo (CC BY 4.0)',
    };
  }
}

export const weatherService = new WeatherService();
