import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  MapPin,
  Compass,
  CheckCircle2,
  AlertCircle,
  Home,
  ShieldCheck,
} from 'lucide-react';
import { Container } from '../../../components/ui/Container';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { useFarmerContext } from '../../../context/FarmerContext';
import { createFarmerLocation } from '../../../utils/farmerLocation';
import styles from './FarmerProfileEditorPage.module.css';

export const FarmerProfileEditorPage: React.FC = () => {
  const navigate = useNavigate();
  const { farmProfile, farmerLocation, updateFarmProfile, updateFarmLocation } = useFarmerContext();

  const [farmerName, setFarmerName] = useState(farmProfile.farmerName);
  const [farmName, setFarmName] = useState(farmProfile.name);
  const [totalAreaAcres, setTotalAreaAcres] = useState(farmProfile.totalAreaAcres);
  const [soilType, setSoilType] = useState(farmProfile.soilType);

  const [locationMode, setLocationMode] = useState<'current' | 'manual'>(
    farmerLocation.source === 'CURRENT_LOCATION' ? 'current' : 'manual'
  );
  const [village, setVillage] = useState(farmerLocation.village);
  const [district, setDistrict] = useState(farmerLocation.district);
  const [state, setState] = useState(farmerLocation.state);
  const [customLat, setCustomLat] = useState<number | undefined>(farmerLocation.latitude);
  const [customLng, setCustomLng] = useState<number | undefined>(farmerLocation.longitude);
  const [geoStatusMsg, setGeoStatusMsg] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  const handleDetectCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGeoStatusMsg('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    setGeoStatusMsg('Requesting GPS sensor telemetry...');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = Number(position.coords.latitude.toFixed(4));
        const lng = Number(position.coords.longitude.toFixed(4));
        setCustomLat(lat);
        setCustomLng(lng);
        setVillage('Local Farm Site');
        setDistrict('GPS Detected Basin');
        setState('India');
        setLocationMode('current');
        setIsLocating(false);
        setGeoStatusMsg(`Detected GPS Coordinates: ${lat}°N, ${lng}°E (Accuracy: ~${Math.round(position.coords.accuracy)}m)`);
      },
      () => {
        setIsLocating(false);
        setGeoStatusMsg('Location access was unavailable. Please enter your farm location manually below.');
        setLocationMode('manual');
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    const finalLocation = createFarmerLocation(
      village,
      district,
      state,
      locationMode === 'current' ? 'CURRENT_LOCATION' : 'MANUAL',
      customLat,
      customLng
    );

    updateFarmProfile({
      name: farmName,
      farmerName,
      totalAreaAcres,
      soilType,
      location: finalLocation,
    });

    updateFarmLocation(finalLocation);

    setSavedSuccess(true);
    setTimeout(() => {
      navigate('/farmer');
    }, 600);
  };

  return (
    <div className={styles.editorPageRoot}>
      <Container size="wide" className={styles.container}>
        {/* Top Back Nav */}
        <div className={styles.topNavRow}>
          <button
            type="button"
            className={styles.backBtn}
            onClick={() => navigate('/farmer')}
          >
            <ArrowLeft size={14} />
            <span>Cancel & Back to Command Center</span>
          </button>
        </div>

        {/* Title Header */}
        <div className={styles.headerCard}>
          <div className={styles.headerBadgeRow}>
            <Badge variant="safe" showDot>
              Profile Management
            </Badge>
            <span className={styles.gridNodeTag}>
              SOURCE OF TRUTH: {farmerLocation.district.toUpperCase()}
            </span>
          </div>
          <h1 className={styles.headerTitle}>Update Farm Profile & Location</h1>
          <p className={styles.headerSub}>
            Modifications will immediately propagate across all 10 agricultural modules and Farmer AI.
          </p>
        </div>

        <form onSubmit={handleSave} className={styles.formGrid}>
          {/* Farm Information */}
          <Card variant="default" padding="lg" className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <Home size={18} color="#16a34a" />
              <h2 className={styles.sectionHeading}>Farm & Operator Identity</h2>
            </div>

            <div className={styles.inputsGrid2}>
              <div className={styles.formGroup}>
                <label>Farmer Full Name *</label>
                <input
                  type="text"
                  value={farmerName}
                  onChange={(e) => setFarmerName(e.target.value)}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label>Farm Name *</label>
                <input
                  type="text"
                  value={farmName}
                  onChange={(e) => setFarmName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className={styles.inputsGrid2}>
              <div className={styles.formGroup}>
                <label>Total Landholding (Acres) *</label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={totalAreaAcres}
                  onChange={(e) => setTotalAreaAcres(parseFloat(e.target.value) || 0)}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label>Dominant Soil Type *</label>
                <select value={soilType} onChange={(e) => setSoilType(e.target.value)}>
                  <option value="Clayey / Black Cotton">Clayey / Black Cotton</option>
                  <option value="Alluvial Silt Loam">Alluvial Silt Loam</option>
                  <option value="Red Sandy Loam">Red Sandy Loam</option>
                  <option value="Laterite Soil">Laterite Soil</option>
                </select>
              </div>
            </div>
          </Card>

          {/* Farm Location */}
          <Card variant="ice" padding="lg" className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <MapPin size={18} color="#0891b2" />
              <div>
                <h2 className={styles.sectionHeading}>Farm Geographic Location (Open-Meteo Grid)</h2>
                <span className={styles.sectionSub}>Independent from citizen profile location</span>
              </div>
            </div>

            <div className={styles.locButtonsRow}>
              <button
                type="button"
                className={`${styles.locToggleBtn} ${locationMode === 'current' ? styles.activeLocToggle : ''}`}
                onClick={handleDetectCurrentLocation}
                disabled={isLocating}
              >
                <Compass size={14} />
                <span>{isLocating ? 'Detecting GPS...' : '📍 Use My Current Location'}</span>
              </button>

              <button
                type="button"
                className={`${styles.locToggleBtn} ${locationMode === 'manual' ? styles.activeLocToggle : ''}`}
                onClick={() => setLocationMode('manual')}
              >
                <MapPin size={14} />
                <span>🗺 Enter Location Manually</span>
              </button>
            </div>

            {geoStatusMsg && (
              <div className={styles.geoMsgPill}>
                <AlertCircle size={14} color="#0891b2" />
                <span>{geoStatusMsg}</span>
              </div>
            )}

            <div className={styles.inputsGrid3}>
              <div className={styles.formGroup}>
                <label>Village / Block *</label>
                <input
                  type="text"
                  value={village}
                  onChange={(e) => setVillage(e.target.value)}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label>District *</label>
                <input
                  type="text"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label>State *</label>
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className={styles.resolvedPill}>
              <ShieldCheck size={14} color="#16a34a" />
              <span>
                Grid Coordinates: {customLat || 27.9468}°N, {customLng || 80.7788}°E ({village}, {district})
              </span>
            </div>
          </Card>

          {/* Action Bar */}
          <div className={styles.actionFooter}>
            {savedSuccess ? (
              <div className={styles.successMsg}>
                <CheckCircle2 size={16} color="#16a34a" />
                <span>Changes saved! Synchronizing Farmer Command Center...</span>
              </div>
            ) : (
              <span className={styles.footerNote}>
                Weather services will immediately reload telemetry for the new coordinates.
              </span>
            )}

            <div className={styles.btnRow}>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={() => navigate('/farmer')}
              >
                Cancel
              </button>

              <button type="submit" className={styles.saveBtn}>
                <Save size={15} />
                <span>Save Farm Changes</span>
              </button>
            </div>
          </div>
        </form>
      </Container>
    </div>
  );
};
