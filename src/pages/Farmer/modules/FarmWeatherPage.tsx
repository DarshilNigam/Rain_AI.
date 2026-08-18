import React from 'react';
import {
  CloudSun,
  CloudRain,
  Wind,
  Droplets,
  Gauge,
  Cloud,
  Thermometer,
  Calendar,
  Clock,
} from 'lucide-react';
import { Container } from '../../../components/ui/Container';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { FarmerModuleHeader } from '../components/FarmerModuleHeader';
import { useFarmerContext } from '../../../context/FarmerContext';
import { useWeatherData } from '../../../hooks/useWeatherData';
import styles from './FarmWeatherPage.module.css';

export const FarmWeatherPage: React.FC = () => {
  const { farmProfile, farmerLocation, farmLocationAsUserLocation, activeCrop } = useFarmerContext();
  const { weatherData } = useWeatherData(farmLocationAsUserLocation);

  const curr = weatherData?.current;
  const hourly = weatherData?.hourly.slice(0, 8) || [];
  const daily = weatherData?.daily.slice(0, 7) || [];

  return (
    <div className={styles.pageRoot}>
      <Container size="wide" className={styles.container}>
        <FarmerModuleHeader
          title="Farm Weather Intelligence"
          subtitle={`Micro-climate observations and 7-day agricultural forecast for ${farmProfile.name}`}
          moduleNumber="MODULE 04"
          icon={<CloudSun size={20} color="#ea580c" />}
        />

        {/* Real Current Weather Hero Card */}
        <div className={styles.heroWeatherCard}>
          <div className={styles.heroLeft}>
            <div className={styles.stationBadgeRow}>
              <Badge variant="weather" showDot>
                Open-Meteo High Resolution Grid
              </Badge>
              <span className={styles.coordsTag}>
                {farmerLocation.latitude.toFixed(4)}°N, {farmerLocation.longitude.toFixed(4)}°E ({farmerLocation.formattedAddress})
              </span>
            </div>

            <div className={styles.tempMainRow}>
              <span className={styles.tempLarge}>
                {curr ? `${curr.temperature.toFixed(1)}°C` : '--°C'}
              </span>
              <div className={styles.conditionCol}>
                <span className={styles.conditionTitle}>{curr?.weatherCondition || 'Synchronizing'}</span>
                <span className={styles.feelsLike}>
                  {curr ? `Relative Humidity: ${curr.humidity}%` : 'Connecting stream...'}
                </span>
              </div>
            </div>

            <div className={styles.agriInterpretationBox}>
              <span className={styles.interpTag}>AGRICULTURAL INTERPRETATION:</span>
              <p className={styles.interpText}>
                {curr && curr.precipitation > 0
                  ? `Active precipitation (${curr.precipitation} mm) noted at ${farmerLocation.village}. Field operations involving heavy tractor machinery should be paused to avoid soil compaction.`
                  : curr && curr.windSpeed > 30
                  ? `Elevated wind speed (${curr.windSpeed.toFixed(1)} km/h) detected. Postpone aerial or foliar pesticide spraying on ${activeCrop.name} to avoid chemical drift.`
                  : `Atmospheric conditions are currently calm in ${farmerLocation.district} and favorable for routine field monitoring, weeding, and nutrient application.`}
              </p>
            </div>
          </div>

          {/* Key Metric Gauges Grid */}
          <div className={styles.metricsGrid}>
            <div className={styles.metricItem}>
              <div className={styles.metricHead}>
                <CloudRain size={15} color="#0284c7" />
                <span>PRECIPITATION</span>
              </div>
              <span className={styles.metricVal}>
                {curr ? `${curr.precipitation} mm` : '--'}
              </span>
              <span className={styles.metricSub}>Live hourly rate</span>
            </div>

            <div className={styles.metricItem}>
              <div className={styles.metricHead}>
                <Droplets size={15} color="#0891b2" />
                <span>HUMIDITY</span>
              </div>
              <span className={styles.metricVal}>
                {curr ? `${curr.humidity}%` : '--'}
              </span>
              <span className={styles.metricSub}>Relative air moisture</span>
            </div>

            <div className={styles.metricItem}>
              <div className={styles.metricHead}>
                <Wind size={15} color="#ea580c" />
                <span>WIND SPEED</span>
              </div>
              <span className={styles.metricVal}>
                {curr ? `${curr.windSpeed.toFixed(1)} km/h` : '--'}
              </span>
              <span className={styles.metricSub}>
                Direction: {curr ? `${curr.windDirection}°` : '--'}
              </span>
            </div>

            <div className={styles.metricItem}>
              <div className={styles.metricHead}>
                <Gauge size={15} color="#7c3aed" />
                <span>SURFACE PRESSURE</span>
              </div>
              <span className={styles.metricVal}>
                {curr ? `${curr.pressure.toFixed(0)} hPa` : '--'}
              </span>
              <span className={styles.metricSub}>Barometric stability</span>
            </div>

            <div className={styles.metricItem}>
              <div className={styles.metricHead}>
                <Cloud size={15} color="#475569" />
                <span>CLOUD COVER</span>
              </div>
              <span className={styles.metricVal}>
                {curr ? `${curr.cloudCover}%` : '--'}
              </span>
              <span className={styles.metricSub}>Solar radiation index</span>
            </div>

            <div className={styles.metricItem}>
              <div className={styles.metricHead}>
                <Thermometer size={15} color="#16a34a" />
                <span>DEW POINT</span>
              </div>
              <span className={styles.metricVal}>
                {curr ? `${(curr.temperature - (100 - curr.humidity) / 5).toFixed(1)}°C` : '--'}
              </span>
              <span className={styles.metricSub}>Condensation threshold</span>
            </div>
          </div>
        </div>

        {/* Next 24 Hours Hourly Step Strip */}
        <Card variant="default" padding="lg" className={styles.hourlyCard}>
          <div className={styles.sectionHeader}>
            <Clock size={16} color="#0284c7" />
            <h3 className={styles.sectionTitle}>Next 24 Hours Convective Window</h3>
          </div>

          <div className={styles.hourlyList}>
            {hourly.map((h, i) => {
              const date = new Date(h.time);
              const hourStr = i === 0 ? 'Now' : date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

              return (
                <div key={h.time} className={styles.hourlyCol}>
                  <span className={styles.hourlyTime}>{hourStr}</span>
                  <span className={styles.hourlyTemp}>{h.temperature.toFixed(0)}°C</span>
                  <div className={styles.hourlyRainBox}>
                    <CloudRain size={13} color="#0284c7" />
                    <span>{h.precipitation.toFixed(1)} mm</span>
                  </div>
                  <span className={styles.hourlyProb}>{h.precipitationProbability}% prob</span>
                </div>
              );
            })}
          </div>
        </Card>

        {/* 7-Day Agricultural Outlook */}
        <Card variant="ice" padding="lg" className={styles.dailyCard}>
          <div className={styles.sectionHeader}>
            <Calendar size={16} color="#16a34a" />
            <h3 className={styles.sectionTitle}>7-Day Field Planning Horizon</h3>
          </div>

          <div className={styles.dailyList}>
            {daily.map((d) => {
              const dayDate = new Date(d.date);
              const dayName = dayDate.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });

              return (
                <div key={d.date} className={styles.dailyRow}>
                  <span className={styles.dailyDay}>{dayName}</span>
                  <span className={styles.dailyCondition}>{d.weatherCondition}</span>
                  <div className={styles.dailyTempRange}>
                    <span>Min: <strong>{d.temperatureMin.toFixed(0)}°C</strong></span>
                    <span>Max: <strong>{d.temperatureMax.toFixed(0)}°C</strong></span>
                  </div>
                  <div className={styles.dailyRainSum}>
                    <span>Rain Sum: <strong>{d.precipitationSum.toFixed(1)} mm</strong></span>
                    <span>({d.precipitationProbabilityMax}% max prob)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </Container>
    </div>
  );
};
