import React from 'react';
import { CloudRain, Droplets, AlertTriangle, ShieldCheck, Layers, Info } from 'lucide-react';
import { Container } from '../../../components/ui/Container';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { FarmerModuleHeader } from '../components/FarmerModuleHeader';
import { useFarmerContext } from '../../../context/FarmerContext';
import { useWeatherData } from '../../../hooks/useWeatherData';
import styles from './RainfallImpactPage.module.css';

export const RainfallImpactPage: React.FC = () => {
  const { farmProfile, farmerLocation, farmLocationAsUserLocation, activeCrop } = useFarmerContext();
  const { weatherData } = useWeatherData(farmLocationAsUserLocation);

  const curr = weatherData?.current;
  const next24h = weatherData?.hourly.slice(0, 24) || [];
  const rain24hSum = next24h.reduce((sum, h) => sum + (h.precipitation || 0), 0);
  const maxProb24h = next24h.reduce((max, h) => Math.max(max, h.precipitationProbability || 0), 0);

  // Compute soil & crop impact
  const isHeavyRain = rain24hSum > 25 || (curr?.precipitation || 0) > 10;
  const isModerateRain = rain24hSum > 5 || (curr?.precipitation || 0) > 1;

  let impactLevel = 'Beneficial Moisture';
  let impactBadgeVariant: 'safe' | 'caution' | 'critical' = 'safe';
  let impactSummary = `Precipitation levels forecasted (${rain24hSum.toFixed(1)} mm) in ${farmerLocation.district} are well within the root absorption capacity of ${activeCrop.name} during the ${activeCrop.currentStage} stage.`;

  if (isHeavyRain) {
    impactLevel = 'Waterlogging Caution';
    impactBadgeVariant = 'critical';
    impactSummary = `Significant 24h accumulation (${rain24hSum.toFixed(1)} mm) detected. For ${farmProfile.soilType} soils, slow percolation may lead to root hypoxia in low-lying plots of ${farmerLocation.village}.`;
  } else if (isModerateRain) {
    impactLevel = 'Moderate Moisture Influx';
    impactBadgeVariant = 'caution';
    impactSummary = `Moderate rainfall (${rain24hSum.toFixed(1)} mm, peak ${maxProb24h}%) will replenish root-zone soil moisture. Monitor field drainage if rainfall extends past 36 hours.`;
  }

  return (
    <div className={styles.pageRoot}>
      <Container size="wide" className={styles.container}>
        <FarmerModuleHeader
          title="Rainfall Impact Assessment"
          subtitle={`Agronomic evaluation of forecasted precipitation on ${activeCrop.name} (${activeCrop.currentStage})`}
          moduleNumber="MODULE 05"
          icon={<CloudRain size={20} color="#2563eb" />}
        />

        {/* Impact Hero Card */}
        <div className={styles.impactHeroCard}>
          <div className={styles.heroTopRow}>
            <div className={styles.badgeRow}>
              <Badge variant={impactBadgeVariant} showDot>
                {impactLevel}
              </Badge>
              <span className={styles.cropStagePill}>
                {activeCrop.icon} {activeCrop.name} • {activeCrop.currentStage}
              </span>
            </div>
            <span className={styles.soilPill}>Soil: {farmProfile.soilType}</span>
          </div>

          <h2 className={styles.heroHeadline}>
            {impactLevel} for {farmProfile.name}
          </h2>

          <p className={styles.heroDescription}>{impactSummary}</p>

          <div className={styles.metricsSummaryStrip}>
            <div className={styles.metricCol}>
              <span className={styles.metricLabel}>LIVE PRECIPITATION</span>
              <span className={styles.metricVal}>{curr ? `${curr.precipitation} mm` : '0.0 mm'}</span>
            </div>
            <div className={styles.metricCol}>
              <span className={styles.metricLabel}>NEXT 24H ACCUMULATION</span>
              <span className={styles.metricVal}>{rain24hSum.toFixed(1)} mm</span>
            </div>
            <div className={styles.metricCol}>
              <span className={styles.metricLabel}>PEAK RAIN PROBABILITY</span>
              <span className={styles.metricVal}>{maxProb24h}%</span>
            </div>
            <div className={styles.metricCol}>
              <span className={styles.metricLabel}>WATER SENSITIVITY</span>
              <span className={styles.metricVal}>{activeCrop.maxWaterTolerance} Tolerance</span>
            </div>
          </div>
        </div>

        {/* 3-Pillar Practical Decision Action Grid */}
        <div className={styles.actionDecisionGrid}>
          <div className={styles.actionCardDo}>
            <div className={styles.actionHeaderDo}>
              <span>✓ DO THIS (RECOMMENDED)</span>
            </div>
            <ul className={styles.actionList}>
              <li>Keep field perimeter drainage channels and furrows clear of blockages.</li>
              <li>Maintain bund integrity to manage surface runoff without submerging root crowns.</li>
              <li>Rely on forecasted {rain24hSum.toFixed(1)} mm rainfall to recharge root-zone soil moisture.</li>
            </ul>
          </div>

          <div className={styles.actionCardAvoid}>
            <div className={styles.actionHeaderAvoid}>
              <span>✕ AVOID THIS (HIGH RISK)</span>
            </div>
            <ul className={styles.actionList}>
              <li>Do NOT run tubewell or canal irrigation while rain is expected.</li>
              <li>Do NOT broadcast urea or nitrogen top-dressing before or during rain.</li>
              <li>Postpone foliar pesticide or fungicide spraying to prevent chemical wash-off.</li>
            </ul>
          </div>

          <div className={styles.actionCardCheck}>
            <div className={styles.actionHeaderCheck}>
              <span>→ CHECK LATER (FOLLOW-UP)</span>
            </div>
            <ul className={styles.actionList}>
              <li>Perform soil moisture ball test 24–48 hours after rain cessation.</li>
              <li>Inspect low-lying field corners for standing water lasting over 12 hours.</li>
              <li>Scout leaf sheaths for early fungal symptoms once canopy foliage dries.</li>
            </ul>
          </div>
        </div>

        {/* 4-Pillar Agronomic Risk Grid */}
        <div className={styles.riskGrid}>
          <Card variant="default" padding="lg" className={styles.riskCard}>
            <div className={styles.cardHeader}>
              <Droplets size={18} color="#0284c7" />
              <h3 className={styles.cardTitle}>Soil Percolation & Aeration</h3>
            </div>
            <p className={styles.cardDesc}>
              {farmProfile.soilType} soil at {farmerLocation.village} has moderate permeability. Runoff begins after approximately 15 mm of continuous rainfall. Maintain clear perimeter field furrows.
            </p>
          </Card>

          <Card variant="default" padding="lg" className={styles.riskCard}>
            <div className={styles.cardHeader}>
              <Layers size={18} color="#16a34a" />
              <h3 className={styles.cardTitle}>Nutrient Leaching Risk</h3>
            </div>
            <p className={styles.cardDesc}>
              Top-dressed nitrogen fertilizers (Urea) can leach downward if rainfall exceeds 30 mm within 6 hours. Delay split applications until after peak rain passes.
            </p>
          </Card>

          <Card variant="default" padding="lg" className={styles.riskCard}>
            <div className={styles.cardHeader}>
              <AlertTriangle size={18} color="#ea580c" />
              <h3 className={styles.cardTitle}>Foliar Disease Susceptibility</h3>
            </div>
            <p className={styles.cardDesc}>
              High atmospheric humidity ({curr?.humidity || 65}%) combined with canopy leaf wetness creates favorable conditions for fungal blight. Inspect leaf sheaths after showers.
            </p>
          </Card>

          <Card variant="ice" padding="lg" className={styles.riskCard}>
            <div className={styles.cardHeader}>
              <ShieldCheck size={18} color="#0891b2" />
              <h3 className={styles.cardTitle}>Field Trafficability</h3>
            </div>
            <p className={styles.cardDesc}>
              Tractor sprayers and heavy tillage equipment should avoid entering field plots until 24 hours after rainfall ceases in {farmerLocation.district} to prevent deep tire ruts and soil pan compaction.
            </p>
          </Card>
        </div>

        {/* Integrity Footnote */}
        <div className={styles.footnoteBar}>
          <Info size={14} color="#64748b" />
          <span>
            <strong>R.A.I. Model Notice:</strong> Agricultural interpretations are derived from physical meteorological forecasts for coordinates {farmerLocation.latitude.toFixed(4)}°N, {farmerLocation.longitude.toFixed(4)}°E and standard ICAR agronomic thresholds.
          </span>
        </div>
      </Container>
    </div>
  );
};
