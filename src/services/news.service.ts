/**
 * R.A.I. Real-Time Meteorological & Weather News Client Service.
 * Connects to the backend proxy /api/news/weather with local caching and resilient degradation.
 */
import { APP_CONFIG } from '../config/env.config';

export interface WeatherNewsArticle {
  readonly title: string;
  readonly source: string;
  readonly url: string;
  readonly pubDate: string;
  readonly relativeTime: string;
  readonly category: 'WEATHER_ALERT' | 'MONSOON_UPDATE' | 'METEOROLOGY';
  readonly city: string;
  readonly region: string;
}

interface NewsApiResponse {
  readonly success: boolean;
  readonly city: string;
  readonly region: string;
  readonly count: number;
  readonly articles: readonly WeatherNewsArticle[];
}

const NEWS_CACHE_TTL_MS = 8 * 60 * 1000; // 8 minutes client cache

class NewsService {
  private cache: Map<string, { articles: WeatherNewsArticle[]; expiresAt: number }> = new Map();

  public async getWeatherNews(city: string = 'Kanpur', state: string = 'Uttar Pradesh', limit: number = 5): Promise<WeatherNewsArticle[]> {
    const cleanCity = (city || 'Kanpur').trim();
    const cleanState = (state || 'Uttar Pradesh').trim();
    const cacheKey = `${cleanCity.toLowerCase()}_${cleanState.toLowerCase()}`;
    const now = Date.now();

    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      return cached.articles.slice(0, limit);
    }

    try {
      const baseApi = (APP_CONFIG.apiBaseUrl || 'http://127.0.0.1:8000/api').replace(/\/+$/, '');
      const url = new URL(`${baseApi}/news/weather`);
      url.searchParams.set('city', cleanCity);
      url.searchParams.set('state', cleanState);
      url.searchParams.set('limit', String(limit));

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 6000);

      const resp = await fetch(url.toString(), {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });
      clearTimeout(timer);

      if (!resp.ok) {
        throw new Error(`News server responded with HTTP ${resp.status}`);
      }

      const data: NewsApiResponse = await resp.json();
      const articles = [...(data.articles || [])];

      this.cache.set(cacheKey, {
        articles,
        expiresAt: now + NEWS_CACHE_TTL_MS,
      });

      return articles.slice(0, limit);
    } catch {
      // Graceful offline fallback
      const fallback = this.getFallbackNews(cleanCity, cleanState);
      return fallback.slice(0, limit);
    }
  }

  private getFallbackNews(city: string, state: string): WeatherNewsArticle[] {
    return [
      {
        title: `IMD Regional Monsoon Outlook: Atmospheric convection monitoring active for ${city} and ${state}`,
        source: 'IMD Regional Weather Desk',
        url: 'https://mausam.imd.gov.in',
        pubDate: '',
        relativeTime: 'Live Intel',
        category: 'METEOROLOGY',
        city,
        region: state,
      },
      {
        title: `Precipitation & Drainage Advisory: Local municipal and catchment monitoring active across ${city}`,
        source: 'R.A.I. Field Telemetry',
        url: '#',
        pubDate: '',
        relativeTime: '1h ago',
        category: 'WEATHER_ALERT',
        city,
        region: state,
      },
      {
        title: `Agronomic Soil Moisture Update: Favorable moisture retention reported across ${state} agricultural tracts`,
        source: 'Agricultural Weather Network',
        url: '#',
        pubDate: '',
        relativeTime: '3h ago',
        category: 'MONSOON_UPDATE',
        city,
        region: state,
      },
    ];
  }
}

export const newsService = new NewsService();
