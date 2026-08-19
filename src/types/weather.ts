/**
 * Normalized R.A.I. Weather Intelligence Domain Model
 * Decouples Open-Meteo external schema from internal R.A.I. consumers.
 */

export interface WeatherSnapshot {
  readonly timestamp: string;
  readonly temperature: number; // Celsius (°C)
  readonly apparentTemperature?: number; // Perceived temperature (°C)
  readonly humidity: number; // Relative Humidity (%)
  readonly precipitation: number; // Current precipitation (mm)
  readonly precipitationProbability?: number; // Current precipitation probability (%)
  readonly rain: number; // Continuous rain (mm)
  readonly showers: number; // Convective showers (mm)
  readonly cloudCover: number; // Total cloud cover (%)
  readonly windSpeed: number; // Wind speed (km/h)
  readonly windGusts?: number; // Max wind gusts (km/h)
  readonly windDirection: number; // Wind direction (degrees)
  readonly pressure: number; // Surface pressure (hPa)
  readonly weatherCode: number; // WMO weather code
  readonly weatherCondition: string; // Plain language condition (e.g. "Partly Cloudy")
  readonly isDay: boolean; // Daylight indicator
}

export interface HourlyWeatherPoint {
  readonly time: string; // ISO 8601
  readonly temperature: number; // °C
  readonly precipitation: number; // mm
  readonly rain: number; // mm
  readonly showers: number; // mm
  readonly precipitationProbability: number; // %
  readonly humidity: number; // %
  readonly cloudCover: number; // %
  readonly windSpeed: number; // km/h
  readonly pressure: number; // hPa
}

export interface DailyWeatherPoint {
  readonly date: string; // YYYY-MM-DD
  readonly precipitationSum: number; // mm
  readonly rainSum: number; // mm
  readonly precipitationProbabilityMax: number; // %
  readonly temperatureMax: number; // °C
  readonly temperatureMin: number; // °C
  readonly sunrise: string; // ISO
  readonly sunset: string; // ISO
  readonly weatherCode: number;
  readonly weatherCondition: string;
}

export interface RaiWeatherData {
  readonly location: {
    readonly city: string;
    readonly region: string;
    readonly country: string;
    readonly lat: number;
    readonly lng: number;
  };
  readonly current: WeatherSnapshot;
  readonly hourly: readonly HourlyWeatherPoint[];
  readonly daily: readonly DailyWeatherPoint[];
  readonly fetchedAt: number; // Epoch timestamp ms
  readonly attribution: string;
}

export interface RaiWeatherContextSummary {
  readonly locationLabel: string;
  readonly currentTempC: number;
  readonly currentCondition: string;
  readonly currentPrecipitationMm: number;
  readonly currentHumidityPercent: number;
  readonly currentWindSpeedKmh: number;
  readonly currentPressureHpa: number;
  readonly next24hPrecipitationSumMm: number;
  readonly maxPrecipitationProbabilityNext24h: number;
  readonly plainSummary: string;
}

/**
 * WMO Weather Code interpreter according to World Meteorological Organization standard
 */
export function interpretWmoCode(code: number): string {
  switch (code) {
    case 0:
      return 'Clear Sky';
    case 1:
      return 'Mainly Clear';
    case 2:
      return 'Partly Cloudy';
    case 3:
      return 'Overcast';
    case 45:
    case 48:
      return 'Fog & Depositing Rime';
    case 51:
      return 'Light Drizzle';
    case 53:
      return 'Moderate Drizzle';
    case 55:
      return 'Dense Drizzle';
    case 56:
    case 57:
      return 'Freezing Drizzle';
    case 61:
      return 'Slight Rain';
    case 63:
      return 'Moderate Rain';
    case 65:
      return 'Heavy Rain';
    case 66:
    case 67:
      return 'Freezing Rain';
    case 71:
      return 'Slight Snow';
    case 73:
      return 'Moderate Snow';
    case 75:
      return 'Heavy Snow';
    case 77:
      return 'Snow Grains';
    case 80:
      return 'Slight Rain Showers';
    case 81:
      return 'Moderate Rain Showers';
    case 82:
      return 'Violent Rain Showers';
    case 85:
    case 86:
      return 'Snow Showers';
    case 95:
      return 'Thunderstorm';
    case 96:
    case 99:
      return 'Severe Thunderstorm with Hail';
    default:
      return 'Atmospheric Conditions';
  }
}
