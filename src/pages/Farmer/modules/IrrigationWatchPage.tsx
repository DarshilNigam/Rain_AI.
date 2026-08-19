import React from 'react';
import { Droplets, Clock, CheckCircle2, CloudRain, Info, ShieldAlert } from 'lucide-react';
import { Container } from '../../../components/ui/Container';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { FarmerModuleHeader } from '../components/FarmerModuleHeader';
import { useFarmerContext } from '../../../context/FarmerContext';
import { useWeatherData } from '../../../hooks/useWeatherData';
import { FarmerOnboardingPage } from '../onboarding/FarmerOnboardingPage';
import styles from './IrrigationWatchPage.module.css';

export const IrrigationWatchPage: React.FC = () => {
  const { farmProfile, farmerLocation, farmLocationAsUserLocation, activeCrop, fields, isProfileComplete } = useFarmerContext();
  const { weatherData } = useWeatherData(farmLocationAsUserLocation);

  if (!isProfileComplete) {
    return <FarmerOnboardingPage />;
  }

  const next24h = weatherData?.hourly.slice(0, 24) || [];
  const rain24hSum = next24h.reduce((sum, h) => sum + (h.precipitation || 0), 0);
  const maxProb24h = next24h.reduce((max, h) => Math.max(max, h.precipitationProbability || 0), 0);

  // Irrigation decision engine based on forecasted precipitation
  let signalTitle = 'PROCEED WITH NORMAL SCHEDULE';
  let signalTag = 'Optimal Field Moisture Deficit';
  let signalVariant: 'safe' | 'caution' | 'critical' = 'safe';
  let signalDesc = `Minimal rain forecasted (${rain24hSum.toFixed(1)} mm in 24h) in ${farmerLocation.district}. Proceed with standard scheduled irrigation for ${activeCrop.name} according to your standard furrow or drip cycle.`;

  if (rain24hSum > 10 || maxProb24h > 65) {
    signalTitle = 'HOLD IRRIGATION CYCLES';
    signalTag = 'Precipitation Influx Anticipated';
    signalVariant = 'critical';
    signalDesc = `Significant rainfall (${rain24hSum.toFixed(1)} mm, peak probability ${maxProb24h}%) is forecasted within the next 24 hours at ${farmerLocation.village}. Hold canal or tube-well irrigation to conserve water and avoid root saturation.`;
  } else if (rain24hSum > 3 || maxProb24h > 40) {
    signalTitle = 'REDUCE / DELAY WATERING';
    signalTag = 'Light Showers Expected';
    signalVariant = 'caution';
    signalDesc = `Intermittent showers forecasted (${rain24hSum.toFixed(1)} mm). Consider delaying deep furrow watering by 12–24 hours to monitor actual localized rainfall in ${farmerLocation.district}.`;
  }

  return (
    <div className={styles.pageRoot}>
      <Container size="wide" className={styles.container}>
        <FarmerModuleHeader
          title="Irrigation Watch"
          subtitle={`Forecast-driven water scheduling intelligence for ${activeCrop.name} (${activeCrop.fieldName})`}
          moduleNumber="MODULE 07"
          icon={<Droplets size={20} color="#0891b2" />}
        />

        {/* Primary Irrigation Signal Hero */}
        <div
          className={styles.signalHeroCard}
          style={{
            borderColor:
              signalVariant === 'critical'
                ? '#fca5a5'
                : signalVariant === 'caution'
                ? '#fde68a'
                : '#bbf7d0',
          }}
        >
          <div className={styles.signalTopRow}>
            <div className={styles.signalBadgeRow}>
              <Badge variant={signalVariant} showDot>
                {signalTag}
              </Badge>
              <span className={styles.fieldTag}>Field: {activeCrop.fieldName}</span>
            </div>
            <span className={styles.soilNote}>Soil: {farmProfile.soilType} • {farmerLocation.village}</span>
          </div>

          <h2 className={styles.signalHeadline}>{signalTitle}</h2>
          <p className={styles.signalDescription}>{signalDesc}</p>

          <div className={styles.forecastMetricsStrip}>
            <div className={styles.metricItem}>
              <Clock size={14} color="#0891b2" />
              <div>
                <span className={styles.metricLabel}>NEXT 24H RAIN SUM</span>
                <span className={styles.metricVal}>{rain24hSum.toFixed(1)} mm</span>
              </div>
            </div>

            <div className={styles.metricItem}>
              <CloudRain size={14} color="#0284c7" />
              <div>
                <span className={styles.metricLabel}>PEAK RAIN PROBABILITY</span>
                <span className={styles.metricVal}>{maxProb24h}%</span>
              </div>
            </div>

            <div className={styles.metricItem}>
              <Droplets size={14} color="#16a34a" />
              <div>
                <span className={styles.metricLabel}>CURRENT WATER DEMAND</span>
                <span className={styles.metricVal}>Moderate ({activeCrop.currentStage})</span>
              </div>
            </div>
          </div>
        </div>

        {/* Fields Irrigation Status Grid */}
        <div className={styles.fieldsSection}>
          <h3 className={styles.fieldsHeading}>Multi-Field Irrigation Scheduling ({farmerLocation.district})</h3>
          <div className={styles.fieldsGrid}>
            {fields.map((f) => (
              <Card key={f.id} variant="default" padding="lg" className={styles.fieldCard}>
                <div className={styles.fieldCardTop}>
                  <strong className={styles.fieldName}>{f.name}</strong>
                  <span className={styles.fieldAreaPill}>{f.areaAcres} Acres</span>
                </div>

                <div className={styles.fieldMeta}>
                  <span>Crop: <strong>{f.cropName || 'Fallow'}</strong></span>
                  <span>Method: <strong>{f.irrigationMethod}</strong></span>
                  <span>Soil: <strong>{f.soilTexture}</strong></span>
                </div>

                <div className={styles.fieldAction}>
                  {rain24hSum > 8 ? (
                    <span className={styles.holdText}>
                      <ShieldAlert size={13} /> Hold Watering
                    </span>
                  ) : (
                    <span className={styles.proceedText}>
                      <CheckCircle2 size={13} /> Ready for Scheduled Cycle
                    </span>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Guidance Footnote */}
        <div className={styles.guidanceNotice}>
          <Info size={14} color="#0891b2" />
          <span>
            <strong>R.A.I. Weather-Based Guidance Notice:</strong> Irrigation signals are advisory models calculated from Open-Meteo precipitation forecasts and soil drainage factors for {farmerLocation.formattedAddress}. Inspect on-ground soil tension before opening sluice gates.
          </span>
        </div>
      </Container>
    </div>
  );
};
