import React from 'react';
import { AlertTriangle, ShieldCheck, Wind, Droplets, CloudRain, Clock, CheckCircle2 } from 'lucide-react';
import { Container } from '../../../components/ui/Container';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { FarmerModuleHeader } from '../components/FarmerModuleHeader';
import { useFarmerContext } from '../../../context/FarmerContext';
import { useWeatherData } from '../../../hooks/useWeatherData';
import styles from './FarmAlertsPage.module.css';

interface FarmAlertItem {
  readonly id: string;
  readonly type: 'rain' | 'wind' | 'moisture' | 'temperature';
  readonly title: string;
  readonly severity: 'critical' | 'caution' | 'weather' | 'safe';
  readonly severityLabel: 'CRITICAL' | 'WARNING' | 'WATCH' | 'STABLE';
  readonly timeWindow: string;
  readonly physicalTrigger: string;
  readonly precaution: string;
}

export const FarmAlertsPage: React.FC = () => {
  const { farmProfile, farmerLocation, farmLocationAsUserLocation, activeCrop } = useFarmerContext();
  const { weatherData } = useWeatherData(farmLocationAsUserLocation);

  const curr = weatherData?.current;
  const next24h = weatherData?.hourly.slice(0, 24) || [];
  const rain24hSum = next24h.reduce((sum, h) => sum + (h.precipitation || 0), 0);
  const maxWind24h = next24h.reduce((max, h) => Math.max(max, h.windSpeed || 0), 0);

  // Generate dynamic farm alerts from physical observations
  const alerts: FarmAlertItem[] = [];

  // 1. Rain Alert
  if (rain24hSum > 30 || (curr?.precipitation || 0) > 15) {
    alerts.push({
      id: 'alert-rain',
      type: 'rain',
      title: 'Heavy Rainfall Accumulation Warning',
      severity: 'critical',
      severityLabel: 'CRITICAL',
      timeWindow: 'Next 24 Hours',
      physicalTrigger: `Expected rainfall accumulation: ${rain24hSum.toFixed(1)} mm at ${farmerLocation.village}.`,
      precaution: `Inspect drainage outlets in ${activeCrop.fieldName}. Open perimeter drains to prevent standing water on ${activeCrop.name}.`,
    });
  } else if (rain24hSum > 8) {
    alerts.push({
      id: 'alert-rain-watch',
      type: 'rain',
      title: 'Moderate Rainfall Influx Watch',
      severity: 'caution',
      severityLabel: 'WATCH',
      timeWindow: 'Next 24 Hours',
      physicalTrigger: `Intermittent showers expected (${rain24hSum.toFixed(1)} mm total) in ${farmerLocation.district}.`,
      precaution: 'Hold additional irrigation cycles. Check soil saturation before scheduling tractor passes.',
    });
  }

  // 2. Wind Alert
  if (maxWind24h > 40 || (curr?.windSpeed || 0) > 35) {
    alerts.push({
      id: 'alert-wind',
      type: 'wind',
      title: 'Strong Surface Wind Gust Alert',
      severity: 'critical',
      severityLabel: 'CRITICAL',
      timeWindow: 'Next 12 Hours',
      physicalTrigger: `Wind velocities peaking at ${maxWind24h.toFixed(1)} km/h.`,
      precaution: `Tall crops like maize or mature ${activeCrop.name} risk stalk lodging. Postpone foliar spray operations.`,
    });
  } else if (maxWind24h > 25) {
    alerts.push({
      id: 'alert-wind-advisory',
      type: 'wind',
      title: 'Moderate Breeze & Spray Drift Advisory',
      severity: 'weather',
      severityLabel: 'WATCH',
      timeWindow: 'Afternoon Hours',
      physicalTrigger: `Sustained winds between 20–30 km/h in ${farmerLocation.state}.`,
      precaution: 'Use coarse spray nozzles if spraying pesticides to minimize droplet drift into neighboring fields.',
    });
  }

  // 3. Humidity & Canopy Wetness
  if ((curr?.humidity || 0) > 82) {
    alerts.push({
      id: 'alert-humidity',
      type: 'moisture',
      title: 'High Humidity & Canopy Wetness Watch',
      severity: 'caution',
      severityLabel: 'WATCH',
      timeWindow: 'Current & Overnight',
      physicalTrigger: `Relative humidity at ${curr?.humidity}%. Dew point within 2°C of air temperature.`,
      precaution: `Inspect ${activeCrop.name} foliage for fungal spore spots or rust symptoms in dense canopy zones.`,
    });
  }

  return (
    <div className={styles.pageRoot}>
      <Container size="wide" className={styles.container}>
        <FarmerModuleHeader
          title="Farm Meteorological Alerts"
          subtitle={`Real-time physical weather hazard signals evaluated for ${farmProfile.name}`}
          moduleNumber="MODULE 06"
          icon={<AlertTriangle size={20} color="#dc2626" />}
        />

        {/* Alerts Summary Hero */}
        <div className={styles.summaryHero}>
          <div className={styles.heroLeft}>
            <div className={styles.heroBadgeRow}>
              <Badge variant={alerts.length > 0 ? 'caution' : 'safe'} showDot>
                {alerts.length > 0 ? `${alerts.length} Active Farm Advisories` : 'All Weather Signals Stable'}
              </Badge>
              <span className={styles.heroScope}>Grid: {farmerLocation.formattedAddress}</span>
            </div>
            <h2 className={styles.heroTitle}>
              {alerts.length > 0
                ? 'Active Field Precautions in Effect'
                : 'Zero Acute Weather Hazards Detected'}
            </h2>
            <p className={styles.heroSub}>
              Physical telemetry is continuously scanned against ICAR agricultural vulnerability thresholds for {activeCrop.name} at {farmerLocation.village}, {farmerLocation.district}.
            </p>
          </div>
        </div>

        {/* Alerts Feed */}
        <div className={styles.alertsList}>
          {alerts.length > 0 ? (
            alerts.map((al) => (
              <Card
                key={al.id}
                variant={al.severity === 'critical' ? 'aiAccent' : al.severity === 'caution' ? 'default' : 'ice'}
                padding="lg"
                className={styles.alertCard}
              >
                <div className={styles.alertHeader}>
                  <div className={styles.alertTypeBadge}>
                    {al.type === 'rain' && <CloudRain size={16} color="#0284c7" />}
                    {al.type === 'wind' && <Wind size={16} color="#ea580c" />}
                    {al.type === 'moisture' && <Droplets size={16} color="#0891b2" />}
                    <Badge variant={al.severity} showDot>
                      {al.severityLabel}
                    </Badge>
                  </div>
                  <div className={styles.timeTag}>
                    <Clock size={12} />
                    <span>{al.timeWindow}</span>
                  </div>
                </div>

                <h3 className={styles.alertCardTitle}>{al.title}</h3>

                <div className={styles.triggerBox}>
                  <span className={styles.triggerLabel}>PHYSICAL METEOROLOGICAL TRIGGER:</span>
                  <span className={styles.triggerText}>{al.physicalTrigger}</span>
                </div>

                <div className={styles.precautionBox}>
                  <CheckCircle2 size={16} color="#16a34a" />
                  <div>
                    <strong>Recommended Field Precaution:</strong>
                    <p>{al.precaution}</p>
                  </div>
                </div>
              </Card>
            ))
          ) : (
            <div className={styles.emptyAlertsBox}>
              <ShieldCheck size={36} color="#16a34a" />
              <div className={styles.emptyText}>
                <strong>No Active Weather Threats for {farmProfile.name}</strong>
                <p>
                  Temperature, precipitation, and wind parameters at {farmerLocation.district} ({farmerLocation.latitude.toFixed(2)}°N, {farmerLocation.longitude.toFixed(2)}°E) are currently within normal baseline ranges for {activeCrop.name} ({activeCrop.currentStage}).
                </p>
              </div>
            </div>
          )}
        </div>
      </Container>
    </div>
  );
};
