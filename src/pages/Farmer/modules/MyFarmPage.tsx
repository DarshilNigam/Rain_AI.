import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, MapPin, Edit3, CheckCircle2, Shield, Layers, Compass, Settings } from 'lucide-react';
import { Container } from '../../../components/ui/Container';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { FarmerModuleHeader } from '../components/FarmerModuleHeader';
import { useFarmerContext } from '../../../context/FarmerContext';
import { FarmerOnboardingPage } from '../onboarding/FarmerOnboardingPage';
import styles from './MyFarmPage.module.css';

export const MyFarmPage: React.FC = () => {
  const navigate = useNavigate();
  const { farmProfile, farmerLocation, isProfileComplete } = useFarmerContext();

  if (!isProfileComplete) {
    return <FarmerOnboardingPage />;
  }

  return (
    <div className={styles.pageRoot}>
      <Container size="wide" className={styles.container}>
        <FarmerModuleHeader
          title="My Farm Profile"
          subtitle="Agricultural landholding identity, geographic coordinates, and soil classification"
          moduleNumber="MODULE 01"
          icon={<Home size={20} color="#16a34a" />}
        />

        <div className={styles.contentGrid}>
          {/* Main Farm Card */}
          <Card variant="default" padding="lg" className={styles.mainCard}>
            <div className={styles.cardTopRow}>
              <div className={styles.farmTitleBlock}>
                <div className={styles.farmBadgeRow}>
                  <Badge variant="safe" showDot>
                    Verified Agri Landholding
                  </Badge>
                  <span className={styles.completionPill}>
                    Profile Status: Complete & Synchronized
                  </span>
                </div>
                <h2 className={styles.farmName}>{farmProfile.name}</h2>
                <p className={styles.farmerName}>Owner / Operator: {farmProfile.farmerName}</p>
              </div>

              <button
                type="button"
                className={styles.editBtn}
                onClick={() => navigate('/farmer/profile/edit')}
              >
                <Edit3 size={14} />
                <span>✎ Update Farm Information</span>
              </button>
            </div>

            {/* Farm Properties Grid */}
            <div className={styles.propsGrid}>
              <div className={styles.propItem}>
                <MapPin size={16} color="#16a34a" />
                <div>
                  <span className={styles.propLabel}>VILLAGE / REGIONAL AREA</span>
                  <span className={styles.propValue}>{farmerLocation.village}</span>
                </div>
              </div>

              <div className={styles.propItem}>
                <Compass size={16} color="#0891b2" />
                <div>
                  <span className={styles.propLabel}>DISTRICT & STATE</span>
                  <span className={styles.propValue}>
                    {farmerLocation.district}, {farmerLocation.state}
                  </span>
                </div>
              </div>

              <div className={styles.propItem}>
                <Layers size={16} color="#0284c7" />
                <div>
                  <span className={styles.propLabel}>TOTAL LANDHOLDING</span>
                  <span className={styles.propValue}>{farmProfile.totalAreaAcres} Acres</span>
                </div>
              </div>

              <div className={styles.propItem}>
                <Shield size={16} color="#ea580c" />
                <div>
                  <span className={styles.propLabel}>DOMINANT SOIL CLASSIFICATION</span>
                  <span className={styles.propValue}>{farmProfile.soilType}</span>
                </div>
              </div>
            </div>

            {/* Coordinates Strip */}
            <div className={styles.geoStrip}>
              <span className={styles.geoLabel}>METEOROLOGICAL SENSOR GRID BINDING:</span>
              <span className={styles.geoCoords}>
                {farmerLocation.latitude.toFixed(4)}°N, {farmerLocation.longitude.toFixed(4)}°E ({farmerLocation.formattedAddress})
              </span>
            </div>
          </Card>

          {/* Side Info Cards */}
          <div className={styles.sideCol}>
            <Card variant="ice" padding="lg">
              <h3 className={styles.sideTitle}>Farm Health Status</h3>
              <p className={styles.sideDesc}>
                Real-time connection with local meteorological stations is operational. All 10 agricultural telemetry modules are synced with this farm's spatial boundary.
              </p>
              <div className={styles.healthList}>
                <div className={styles.healthItem}>
                  <CheckCircle2 size={15} color="#16a34a" />
                  <span>Weather Stream Active</span>
                </div>
                <div className={styles.healthItem}>
                  <CheckCircle2 size={15} color="#16a34a" />
                  <span>Soil Moisture Cache Active</span>
                </div>
                <div className={styles.healthItem}>
                  <CheckCircle2 size={15} color="#16a34a" />
                  <span>Crop Stage Matrix Synchronized</span>
                </div>
              </div>

              <div style={{ marginTop: '1rem' }}>
                <button
                  type="button"
                  className={styles.editBtn}
                  style={{ width: '100%', justifyContent: 'center' }}
                  onClick={() => navigate('/farmer/profile/edit')}
                >
                  <Settings size={14} />
                  <span>Edit Farm Location / Coordinates</span>
                </button>
              </div>
            </Card>
          </div>
        </div>
      </Container>
    </div>
  );
};
