import { useState, useEffect } from 'react';
import { UserLocation } from '../types/location';
import { RaiWeatherData, RaiWeatherContextSummary } from '../types/weather';
import { weatherService } from '../services/weather.service';

export interface UseWeatherDataResult {
  readonly weatherData: RaiWeatherData | null;
  readonly weatherContext: RaiWeatherContextSummary | null;
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly refetch: () => Promise<void>;
}

export function useWeatherData(location: UserLocation): UseWeatherDataResult {
  const [weatherData, setWeatherData] = useState<RaiWeatherData | null>(null);
  const [weatherContext, setWeatherContext] = useState<RaiWeatherContextSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWeather = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [data, context] = await Promise.all([
        weatherService.getForecast(location),
        weatherService.getWeatherContext(location),
      ]);
      setWeatherData(data);
      setWeatherContext(context);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Local weather intelligence is temporarily unavailable.';
      setError(msg);
      setWeatherData(null);
      setWeatherContext(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    fetchWeather().catch(() => {
      if (isMounted) {
        // Handled in try/catch above
      }
    });

    return () => {
      isMounted = false;
    };
  }, [location.lat, location.lng, location.city]);

  return {
    weatherData,
    weatherContext,
    isLoading,
    error,
    refetch: fetchWeather,
  };
}
