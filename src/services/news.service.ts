import { apiFetch } from '../config/env.config';

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

const NEWS_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache

class NewsService {
  private cache: Map<string, { articles: WeatherNewsArticle[]; expiresAt: number }> = new Map();

  public async getWeatherNews(
    city: string = 'Kanpur',
    state: string = 'Uttar Pradesh',
    limit: number = 5,
    forceRefresh: boolean = false
  ): Promise<WeatherNewsArticle[]> {
    const cleanCity = (city || 'Kanpur').trim();
    const cleanState = (state || 'Uttar Pradesh').trim();
    const cacheKey = `${cleanCity.toLowerCase()}_${cleanState.toLowerCase()}`;
    const now = Date.now();

    if (!forceRefresh) {
      const cached = this.cache.get(cacheKey);
      if (cached && cached.expiresAt > now) {
        return cached.articles.slice(0, limit);
      }
    }

    try {
      const endpoint = `/news/weather?city=${encodeURIComponent(cleanCity)}&state=${encodeURIComponent(cleanState)}&limit=${limit}`;
      const resp = await apiFetch(endpoint);

      if (!resp.ok) {
        throw new Error(`News service responded with HTTP ${resp.status}`);
      }

      const data: NewsApiResponse = await resp.json();
      const articles = [...(data.articles || [])];

      this.cache.set(cacheKey, {
        articles,
        expiresAt: now + NEWS_CACHE_TTL_MS,
      });

      return articles.slice(0, limit);
    } catch {
      return [];
    }
  }
}

export const newsService = new NewsService();
