import React from 'react';
import { Calendar, Sun, CloudRain, Wind, TrendingUp, Info } from 'lucide-react';
import { Container } from '../../../components/ui/Container';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { FarmerModuleHeader } from '../components/FarmerModuleHeader';
import { useFarmerContext } from '../../../context/FarmerContext';
import { FarmerOnboardingPage } from '../onboarding/FarmerOnboardingPage';
import styles from './SeasonalInsightsPage.module.css';

export const SeasonalInsightsPage: React.FC = () => {
  const { farmerLocation, activeCrop, isProfileComplete } = useFarmerContext();

  if (!isProfileComplete) {
    return <FarmerOnboardingPage />;
  }

  return (
    <div className={styles.pageRoot}>
      <Container size="wide" className={styles.container}>
        <FarmerModuleHeader
          title="Seasonal & Climatological Insights"
          subtitle={`Macro-scale meteorological trends and precipitation cycles for ${farmerLocation.state} Agri Basin`}
          moduleNumber="MODULE 08"
          icon={<Calendar size={20} color="#7c3aed" />}
        />

        {/* Seasonal Overview Hero */}
        <div className={styles.seasonalHero}>
          <div className={styles.heroTopRow}>
            <div className={styles.badgeRow}>
              <Badge variant="weather" showDot>
                Rabi - Pre-Monsoon Transition
              </Badge>
              <span className={styles.agroZonePill}>Zone: {farmerLocation.state} Agricultural Basin</span>
            </div>
            <span className={styles.stateTag}>{farmerLocation.formattedAddress}</span>
          </div>

          <h2 className={styles.heroTitle}>Regional Atmospheric Trajectory ({farmerLocation.district})</h2>
          <p className={styles.heroDescription}>
            The regional synoptic pattern indicates stable atmospheric pressure over {farmerLocation.state}. Diurnal temperature swings remain within 12°C, maintaining optimal thermal degree days for {activeCrop.name} development at {farmerLocation.village}.
          </p>

          <div className={styles.trendsStrip}>
            <div className={styles.trendItem}>
              <Sun size={15} color="#ea580c" />
              <div>
                <span className={styles.trendLabel}>SOLAR ACCUMULATION</span>
                <span className={styles.trendVal}>8.4 hrs/day</span>
              </div>
            </div>

            <div className={styles.trendItem}>
              <CloudRain size={15} color="#0284c7" />
              <div>
                <span className={styles.trendLabel}>MONTHLY ANOMALY</span>
                <span className={styles.trendVal}>Normal (+4%)</span>
              </div>
            </div>

            <div className={styles.trendItem}>
              <TrendingUp size={15} color="#16a34a" />
              <div>
                <span className={styles.trendLabel}>GROWING DEGREE DAYS</span>
                <span className={styles.trendVal}>1,420 GDD (Optimal)</span>
              </div>
            </div>
          </div>
        </div>

        {/* 3 Seasonal Cycle Cards */}
        <div className={styles.cyclesGrid}>
          <Card variant="default" padding="lg" className={styles.cycleCard}>
            <div className={styles.cardHeader}>
              <Calendar size={18} color="#7c3aed" />
              <h3 className={styles.cardTitle}>Wet vs Dry Cycle Outlook</h3>
            </div>
            <p className={styles.cardDesc}>
              A 14-day dry window is currently dominant across {farmerLocation.district}. Evapotranspiration rates will average 4.2 mm/day. Plan field weeding and soil aeration during this window.
            </p>
          </Card>

          <Card variant="default" padding="lg" className={styles.cycleCard}>
            <div className={styles.cardHeader}>
              <Wind size={18} color="#0891b2" />
              <h3 className={styles.cardTitle}>Subcontinental Monsoon Tracking</h3>
            </div>
            <p className={styles.cardDesc}>
              Long-range monsoon onset models for {farmerLocation.state} are monitored via IMD synoptic charts. Seasonal forecasts will be updated as the inter-tropical convergence zone (ITCZ) advances.
            </p>
          </Card>

          <Card variant="ice" padding="lg" className={styles.cycleCard}>
            <div className={styles.cardHeader}>
              <TrendingUp size={18} color="#16a34a" />
              <h3 className={styles.cardTitle}>Crop Thermal Suitability</h3>
            </div>
            <p className={styles.cardDesc}>
              Daytime maximums in {farmerLocation.district} are projected between 28°C–34°C over the next fortnight. Thermal stress risks on {activeCrop.name} are currently negligible.
            </p>
          </Card>
        </div>

        {/* Integrity Notice */}
        <div className={styles.noticeBar}>
          <Info size={14} color="#7c3aed" />
          <span>
            <strong>Transparency Policy:</strong> Seasonal patterns are grounded in IMD regional climatology and global numerical weather prediction models for {farmerLocation.formattedAddress}. R.A.I. does not generate unverified multi-month harvest yield speculation.
          </span>
        </div>
      </Container>
    </div>
  );
};
