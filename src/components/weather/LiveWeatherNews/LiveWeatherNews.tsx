import React, { useState, useEffect, useCallback } from 'react';
import {
  MapPin,
  RefreshCw,
  Thermometer,
  CloudRain,
  Cloud,
  Wind,
} from 'lucide-react';
import { UserLocation } from '../../../types/location';
import { useWeatherData } from '../../../hooks/useWeatherData';
import { newsService, WeatherNewsArticle } from '../../../services/news.service';
import styles from './LiveWeatherNews.module.css';

interface LiveWeatherNewsProps {
  readonly location: UserLocation;
  readonly className?: string;
  readonly maxArticles?: number;
}

export const LiveWeatherNews: React.FC<LiveWeatherNewsProps> = ({
  location,
  className,
  maxArticles = 5,
}) => {
  const { weatherData } = useWeatherData(location);
  const [articles, setArticles] = useState<WeatherNewsArticle[]>([]);
  const [isNewsLoading, setIsNewsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const fetchNews = useCallback(async (force = false) => {
    try {
      if (force) {
        setIsRefreshing(true);
      } else {
        setIsNewsLoading(true);
      }
      const data = await newsService.getWeatherNews(location.city, location.region, maxArticles, force);
      setArticles(data);
    } catch {
      setArticles([]);
    } finally {
      setIsNewsLoading(false);
      setIsRefreshing(false);
    }
  }, [location.city, location.region, maxArticles]);

  useEffect(() => {
    fetchNews(false);
    // Auto-refresh news every 5 minutes
    const interval = setInterval(() => fetchNews(false), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchNews]);

  const handleManualRefresh = async () => {
    await fetchNews(true);
  };

  const curr = weatherData?.current;

  const getCategoryClass = (category: string) => {
    switch (category) {
      case 'WEATHER_ALERT':
        return styles.articleCategoryAlert;
      case 'MONSOON_UPDATE':
        return styles.articleCategoryMonsoon;
      default:
        return styles.articleCategoryMet;
    }
  };

  return (
    <div className={`${styles.intelCard} ${className || ''}`}>
      {/* Header */}
      <div className={styles.cardHeader}>
        <div className={styles.headerLeft}>
          <span className={styles.liveIndicator}>
            <span className={styles.liveDot} />
            LIVE
          </span>
          <span className={styles.headerTitle}>Weather & Field Intelligence</span>
          <span className={styles.headerLocation}>
            <MapPin size={12} color="#0284c7" />
            {location.city}, {location.region}
          </span>
        </div>

        <button
          type="button"
          className={styles.refreshBtn}
          onClick={handleManualRefresh}
          disabled={isRefreshing || isNewsLoading}
          title="Force refresh real-time weather & headlines"
          aria-label="Refresh intelligence"
        >
          <RefreshCw size={12} className={isRefreshing ? styles.spinIcon : ''} />
          <span>{isRefreshing ? 'Syncing...' : 'Sync'}</span>
        </button>
      </div>

      {/* Live Telemetry Pill */}
      {curr && (
        <div className={styles.telemetryBar}>
          <div className={styles.telemetryItem}>
            <span className={styles.telemetryLabel}>
              <Thermometer size={12} color="#0284c7" />
              Temp
            </span>
            <span className={styles.telemetryValue}>{curr.temperature.toFixed(1)}°C</span>
            <span className={styles.telemetrySub}>
              Feels {curr.apparentTemperature ? `${curr.apparentTemperature.toFixed(0)}°` : `${curr.temperature.toFixed(0)}°`}
            </span>
          </div>

          <div className={styles.telemetryItem}>
            <span className={styles.telemetryLabel}>
              <CloudRain size={12} color="#0284c7" />
              Precip
            </span>
            <span className={styles.telemetryValue}>{curr.precipitation.toFixed(1)} mm</span>
            <span className={styles.telemetrySub}>
              {curr.precipitationProbability ?? 0}% prob
            </span>
          </div>

          <div className={styles.telemetryItem}>
            <span className={styles.telemetryLabel}>
              <Cloud size={12} color="#0284c7" />
              Clouds
            </span>
            <span className={styles.telemetryValue}>{curr.cloudCover}%</span>
            <span className={styles.telemetrySub}>{curr.weatherCondition}</span>
          </div>

          <div className={styles.telemetryItem}>
            <span className={styles.telemetryLabel}>
              <Wind size={12} color="#0284c7" />
              Wind
            </span>
            <span className={styles.telemetryValue}>{curr.windSpeed.toFixed(0)} km/h</span>
            <span className={styles.telemetrySub}>{curr.pressure.toFixed(0)} hPa</span>
          </div>
        </div>
      )}

      {/* Headlines List */}
      <div className={styles.headlinesSection}>
        <div className={styles.sectionHeading}>
          <span>Regional Meteorological Feed</span>
          <span>{articles.length} Updates</span>
        </div>

        {isNewsLoading && articles.length === 0 ? (
          <div className={styles.articlesList}>
            <div className={styles.skeletonItem} />
            <div className={styles.skeletonItem} />
            <div className={styles.skeletonItem} />
          </div>
        ) : articles.length > 0 ? (
          <div className={styles.articlesList}>
            {articles.map((art, idx) => (
              <a
                key={`${art.title}-${idx}`}
                href={art.url && art.url !== '#' ? art.url : undefined}
                target={art.url && art.url !== '#' ? '_blank' : undefined}
                rel="noopener noreferrer"
                className={styles.articleItem}
              >
                <div className={styles.articleTop}>
                  <span className={styles.articleSource}>{art.source}</span>
                  <span className={getCategoryClass(art.category)}>
                    {art.category === 'WEATHER_ALERT' ? 'Alert' : art.category === 'MONSOON_UPDATE' ? 'Monsoon' : 'Intel'}
                  </span>
                  <span className={styles.articleTime}>{art.relativeTime}</span>
                </div>
                <div className={styles.articleTitle}>
                  {art.title}
                </div>
              </a>
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            Fresh regional weather headlines are currently unavailable.
          </div>
        )}
      </div>
    </div>
  );
};
