import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  MapPin,
  Compass,
  CheckCircle2,
  Plus,
  Trash2,
  Layers,
  Wheat,
  Home,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { Container } from '../../../components/ui/Container';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { useFarmerContext } from '../../../context/FarmerContext';
import { useAuth } from '../../../context/AuthContext';
import { createFarmerLocation } from '../../../utils/farmerLocation';
import { FarmerLocation, FarmCrop, FarmField } from '../../../types/farmer';
import styles from './FarmerOnboardingPage.module.css';

export const FarmerOnboardingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { completeOnboarding } = useFarmerContext();

  // Step 1: Profile & Farm Identity
  const [farmerName, setFarmerName] = useState(user?.fullName || '');
  const [farmName, setFarmName] = useState(
    user?.villageArea
      ? `${user.villageArea} Farm`
      : user?.fullName
      ? `${user.fullName}'s Farm Parcel`
      : ''
  );
  const [totalAreaAcres, setTotalAreaAcres] = useState<number>(5.0);
  const [soilType, setSoilType] = useState('Clayey / Black Cotton');

  // Step 2: Location
  const [locationMode, setLocationMode] = useState<'current' | 'manual'>('manual');
  const [village, setVillage] = useState(user?.villageArea || '');
  const [district, setDistrict] = useState(user?.district || '');
  const [state, setState] = useState('Gujarat');
  const [customLat, setCustomLat] = useState<number | undefined>(user?.farmLocation?.lat);
  const [customLng, setCustomLng] = useState<number | undefined>(user?.farmLocation?.lng);
  const [geoStatusMsg, setGeoStatusMsg] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);

  // Step 3: Initial Crops
  const [cropsList, setCropsList] = useState<Array<Omit<FarmCrop, 'id'>>>([
    {
      name: 'Wheat',
      variety: 'Sharbati PBW-343',
      fieldId: 'field-1',
      fieldName: 'North Plot',
      sowingDate: '2026-01-10',
      expectedHarvestDate: '2026-04-15',
      currentStage: 'Vegetative Growth',
      maxWaterTolerance: 'Moderate',
      icon: '🌾',
    },
  ]);

  // Step 4: Initial Fields
  const [fieldsList, setFieldsList] = useState<Array<Omit<FarmField, 'id'>>>([
    {
      name: 'North Plot',
      areaAcres: 6.5,
      cropName: 'Wheat',
      soilTexture: 'Clayey / Black Cotton',
      irrigationMethod: 'Drip / Furrow',
    },
    {
      name: 'South Basin',
      areaAcres: 6.0,
      cropName: 'Rice / Paddy',
      soilTexture: 'Alluvial Silt Loam',
      irrigationMethod: 'Canal Flooding',
    },
  ]);

  // Handle Geolocation
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
        setGeoStatusMsg(`Detected GPS Coordinates: ${lat}°N, ${lng}°E (Precision: ~${Math.round(position.coords.accuracy)}m)`);
      },
      () => {
        setIsLocating(false);
        setGeoStatusMsg('Location access was unavailable. Please enter your farm location manually below.');
        setLocationMode('manual');
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleAddCropRow = () => {
    setCropsList((prev) => [
      ...prev,
      {
        name: 'Rice / Paddy',
        variety: 'Basmati 1121',
        fieldId: fieldsList[1]?.name || 'field-2',
        fieldName: fieldsList[1]?.name || 'South Basin',
        sowingDate: '2026-02-01',
        currentStage: 'Sowing / Seeding',
        maxWaterTolerance: 'High',
        icon: '🌱',
      },
    ]);
  };

  const handleRemoveCropRow = (index: number) => {
    if (cropsList.length > 1) {
      setCropsList((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const handleAddFieldRow = () => {
    setFieldsList((prev) => [
      ...prev,
      {
        name: `East Plot ${prev.length + 1}`,
        areaAcres: 3.0,
        cropName: 'Fallow',
        soilTexture: 'Sandy Loam',
        irrigationMethod: 'Drip Sprinkler',
      },
    ]);
  };

  const handleRemoveFieldRow = (index: number) => {
    if (fieldsList.length > 1) {
      setFieldsList((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const handleSubmitOnboarding = (e: React.FormEvent) => {
    e.preventDefault();

    const finalLocation: FarmerLocation = createFarmerLocation(
      village,
      district,
      state,
      locationMode === 'current' ? 'CURRENT_LOCATION' : 'MANUAL',
      customLat,
      customLng
    );

    completeOnboarding(
      {
        name: farmName,
        farmerName,
        location: finalLocation,
        totalAreaAcres,
        soilType,
      },
      cropsList,
      fieldsList
    );

    navigate('/farmer');
  };

  return (
    <div className={styles.onboardingPageRoot}>
      <Container size="wide" className={styles.container}>
        {/* Onboarding Hero Header */}
        <div className={styles.heroBanner}>
          <div className={styles.heroBadgeRow}>
            <Badge variant="safe" showDot>
              R.A.I. Farmer Setup Experience
            </Badge>
            <span className={styles.heroOneTimeTag}>ONE-TIME AGRICULTURAL INITIALIZATION</span>
          </div>

          <h1 className={styles.heroTitle}>Let's set up your farm.</h1>
          <p className={styles.heroSubtitle}>
            Tell R.A.I. about your farm once. We'll use this information across your entire Farmer Command Center and all 10 agricultural intelligence modules.
          </p>
        </div>

        {/* Setup Form */}
        <form onSubmit={handleSubmitOnboarding} className={styles.formFlow}>
          {/* SECTION A: FARMER PROFILE */}
          <Card variant="default" padding="lg" className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionIconCircle}>
                <Home size={18} color="#16a34a" />
              </div>
              <div>
                <h2 className={styles.sectionTitle}>Section A • Farmer & Farm Identity</h2>
                <span className={styles.sectionSub}>Authenticated farmer profile metadata</span>
              </div>
            </div>

            <div className={styles.inputsGrid2}>
              <div className={styles.formGroup}>
                <label>Farmer Full Name *</label>
                <input
                  type="text"
                  value={farmerName}
                  onChange={(e) => setFarmerName(e.target.value)}
                  required
                  placeholder="Enter your full name"
                />
              </div>

              <div className={styles.formGroup}>
                <label>Farm Name / Landholding Identifier *</label>
                <input
                  type="text"
                  value={farmName}
                  onChange={(e) => setFarmName(e.target.value)}
                  required
                  placeholder="e.g. Lakhimpur Green Acres"
                />
              </div>
            </div>

            <div className={styles.inputsGrid2}>
              <div className={styles.formGroup}>
                <label>Total Farm Size (Acres) *</label>
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
                <label>Dominant Soil Classification *</label>
                <select value={soilType} onChange={(e) => setSoilType(e.target.value)}>
                  <option value="Clayey / Black Cotton">Clayey / Black Cotton (High Moisture Retention)</option>
                  <option value="Alluvial Silt Loam">Alluvial Silt Loam (Fertile River Plains)</option>
                  <option value="Red Sandy Loam">Red Sandy Loam (Rapid Drainage)</option>
                  <option value="Laterite Soil">Laterite Soil</option>
                </select>
              </div>
            </div>
          </Card>

          {/* SECTION B: FARM LOCATION (INDEPENDENT SOURCE OF TRUTH) */}
          <Card variant="ice" padding="lg" className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionIconCircle}>
                <MapPin size={18} color="#0891b2" />
              </div>
              <div>
                <h2 className={styles.sectionTitle}>Section B • Farm Location (Source of Truth)</h2>
                <span className={styles.sectionSub}>
                  Independent from normal citizen location. Open-Meteo weather intelligence strictly targets these coordinates.
                </span>
              </div>
            </div>

            {/* Location Options Toggle */}
            <div className={styles.locOptionsRow}>
              <button
                type="button"
                className={`${styles.locOptionBtn} ${locationMode === 'current' ? styles.locOptionActive : ''}`}
                onClick={handleDetectCurrentLocation}
                disabled={isLocating}
              >
                <Compass size={15} />
                <span>{isLocating ? 'Detecting GPS...' : '📍 Use My Current Location'}</span>
              </button>

              <button
                type="button"
                className={`${styles.locOptionBtn} ${locationMode === 'manual' ? styles.locOptionActive : ''}`}
                onClick={() => setLocationMode('manual')}
              >
                <MapPin size={15} />
                <span>🗺 Enter Farm Location Manually</span>
              </button>
            </div>

            {geoStatusMsg && (
              <div className={styles.geoAlertBox}>
                <AlertCircle size={14} color="#0891b2" />
                <span>{geoStatusMsg}</span>
              </div>
            )}

            {/* Manual / Resolved Location Inputs */}
            <div className={styles.inputsGrid3}>
              <div className={styles.formGroup}>
                <label>Village / Agri Block *</label>
                <input
                  type="text"
                  value={village}
                  onChange={(e) => setVillage(e.target.value)}
                  required
                  placeholder="e.g. Mitauli / Dholka"
                />
              </div>

              <div className={styles.formGroup}>
                <label>District *</label>
                <input
                  type="text"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  required
                  placeholder="e.g. Lakhimpur Kheri / Anand"
                />
              </div>

              <div className={styles.formGroup}>
                <label>State *</label>
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  required
                  placeholder="e.g. Uttar Pradesh / Gujarat"
                />
              </div>
            </div>

            <div className={styles.locationResolutionPill}>
              <ShieldCheck size={14} color="#16a34a" />
              <span>
                <strong>Target Weather Grid:</strong> {village}, {district}, {state} (Coordinates: {customLat || 27.9468}°N, {customLng || 80.7788}°E)
              </span>
            </div>
          </Card>

          {/* SECTION C: CROPS REGISTRY */}
          <Card variant="default" padding="lg" className={styles.sectionCard}>
            <div className={styles.sectionHeaderBetween}>
              <div className={styles.sectionHeaderLeft}>
                <div className={styles.sectionIconCircle}>
                  <Wheat size={18} color="#ea580c" />
                </div>
                <div>
                  <h2 className={styles.sectionTitle}>Section C • Crop Registry & Growth Stages</h2>
                  <span className={styles.sectionSub}>Register active crops in current rotation</span>
                </div>
              </div>

              <button
                type="button"
                className={styles.addSmallBtn}
                onClick={handleAddCropRow}
              >
                <Plus size={13} />
                <span>Add Another Crop</span>
              </button>
            </div>

            <div className={styles.cropsRowsList}>
              {cropsList.map((crop, idx) => (
                <div key={idx} className={styles.cropRowBox}>
                  <div className={styles.cropRowHeader}>
                    <span className={styles.cropRowBadge}>Crop #{idx + 1}</span>
                    {cropsList.length > 1 && (
                      <button
                        type="button"
                        className={styles.removeRowBtn}
                        onClick={() => handleRemoveCropRow(idx)}
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>

                  <div className={styles.inputsGrid4}>
                    <div className={styles.formGroup}>
                      <label>Crop Name</label>
                      <input
                        type="text"
                        value={crop.name}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCropsList((prev) =>
                            prev.map((c, i) => (i === idx ? { ...c, name: val } : c))
                          );
                        }}
                        required
                        placeholder="e.g. Wheat"
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label>Variety / Seed Hybrid</label>
                      <input
                        type="text"
                        value={crop.variety || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCropsList((prev) =>
                            prev.map((c, i) => (i === idx ? { ...c, variety: val } : c))
                          );
                        }}
                        placeholder="e.g. PBW-343"
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label>Assigned Field</label>
                      <input
                        type="text"
                        value={crop.fieldName}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCropsList((prev) =>
                            prev.map((c, i) => (i === idx ? { ...c, fieldName: val } : c))
                          );
                        }}
                        placeholder="e.g. North Plot"
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label>Current Growth Stage</label>
                      <select
                        value={crop.currentStage}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCropsList((prev) =>
                            prev.map((c, i) => (i === idx ? { ...c, currentStage: val } : c))
                          );
                        }}
                      >
                        <option value="Sowing">Sowing</option>
                        <option value="Germination">Germination</option>
                        <option value="Vegetative Growth">Vegetative Growth</option>
                        <option value="Flowering">Flowering</option>
                        <option value="Fruiting / Grain Filling">Fruiting / Grain Filling</option>
                        <option value="Maturity">Maturity</option>
                        <option value="Harvest Ready">Harvest Ready</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* SECTION D: FIELD PARCELS */}
          <Card variant="default" padding="lg" className={styles.sectionCard}>
            <div className={styles.sectionHeaderBetween}>
              <div className={styles.sectionHeaderLeft}>
                <div className={styles.sectionIconCircle}>
                  <Layers size={18} color="#7c3aed" />
                </div>
                <div>
                  <h2 className={styles.sectionTitle}>Section D • Field Parcels & Plots</h2>
                  <span className={styles.sectionSub}>Division of farm acreage into management units</span>
                </div>
              </div>

              <button
                type="button"
                className={styles.addSmallBtn}
                onClick={handleAddFieldRow}
              >
                <Plus size={13} />
                <span>Add Field Parcel</span>
              </button>
            </div>

            <div className={styles.fieldsRowsList}>
              {fieldsList.map((fld, idx) => (
                <div key={idx} className={styles.fieldRowBox}>
                  <div className={styles.inputsGrid3}>
                    <div className={styles.formGroup}>
                      <label>Plot Name</label>
                      <input
                        type="text"
                        value={fld.name}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFieldsList((prev) =>
                            prev.map((f, i) => (i === idx ? { ...f, name: val } : f))
                          );
                        }}
                        required
                        placeholder="e.g. North Plot"
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label>Acreage (Acres)</label>
                      <input
                        type="number"
                        step="0.1"
                        min="0.1"
                        value={fld.areaAcres}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setFieldsList((prev) =>
                            prev.map((f, i) => (i === idx ? { ...f, areaAcres: val } : f))
                          );
                        }}
                        required
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label>Irrigation System</label>
                      <select
                        value={fld.irrigationMethod}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFieldsList((prev) =>
                            prev.map((f, i) => (i === idx ? { ...f, irrigationMethod: val } : f))
                          );
                        }}
                      >
                        <option value="Drip / Furrow">Drip / Furrow</option>
                        <option value="Canal Flooding">Canal Flooding</option>
                        <option value="Drip Sprinkler">Drip Sprinkler</option>
                        <option value="Tube-well Border">Tube-well Border</option>
                      </select>
                    </div>
                  </div>

                  {fieldsList.length > 1 && (
                    <button
                      type="button"
                      className={styles.removeFieldBtn}
                      onClick={() => handleRemoveFieldRow(idx)}
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </Card>

          {/* Submit Action Bar */}
          <div className={styles.submitBar}>
            <div className={styles.submitLeft}>
              <CheckCircle2 size={18} color="#16a34a" />
              <span>
                All information will be saved to your dedicated <strong>FarmerLocationContext</strong> and profile store.
              </span>
            </div>

            <button type="submit" className={styles.completeBtn}>
              <Sparkles size={16} />
              <span>Launch Farmer Command Center →</span>
            </button>
          </div>
        </form>
      </Container>
    </div>
  );
};
