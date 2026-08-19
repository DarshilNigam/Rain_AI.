import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Compass,
  Thermometer,
  Droplets,
  CloudRain,
  Wind,
  Gauge,
  Cloud,
  Layers,
  Sparkles,
  Info,
  RotateCcw,
  Radio,
  CheckCircle2,
  Cpu,
  ShieldAlert,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { Container } from '../../components/ui/Container';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { LocationSwitcher } from '../../components/ui/LocationSwitcher';
import { InteractiveRiskMap } from '../../components/map/InteractiveRiskMap';
import { useLocationContext } from '../../context/LocationContext';
import { useWeatherData } from '../../hooks/useWeatherData';
import { useMlRiskPrediction } from '../../hooks/useMlRiskPrediction';
import { useI18n } from '../../i18n';
import { UserLocation } from '../../types/location';
import styles from './RiskMapPage.module.css';

export const RiskMapPage: React.FC = () => {
  const { location: userLocation } = useLocationContext();
  const { t, language } = useI18n();

  // Active map location explores cities dynamically without mutating user's saved account location
  const [activeLocation, setActiveLocation] = useState<UserLocation>(userLocation);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState<boolean>(false);
  const [radarEnabled, setRadarEnabled] = useState<boolean>(true);
  const [cloudsEnabled, setCloudsEnabled] = useState<boolean>(true);
  const [riskLayerEnabled, setRiskLayerEnabled] = useState<boolean>(true);

  // Sync activeLocation when user switches saved location in profile context
  useEffect(() => {
    setActiveLocation(userLocation);
  }, [userLocation]);

  // Fetch real Open-Meteo weather telemetry for the actively selected city
  const { weatherData, isLoading: weatherLoading, error: weatherError } = useWeatherData(activeLocation);

  // Fetch real XGBoost + TreeSHAP explainable ML risk prediction
  const {
    prediction: mlPrediction,
    isLoading: mlLoading,
    isModelReady,
  } = useMlRiskPrediction(activeLocation.lat, activeLocation.lng, activeLocation.city);

  const curr = weatherData?.current;
  const isExploringOtherCity = activeLocation.city !== userLocation.city;

  const handleResetToMyLocation = () => {
    setActiveLocation(userLocation);
  };

  const getRiskBadgeColor = (level?: string) => {
    switch (level) {
      case 'CRITICAL':
        return '#dc2626';
      case 'HIGH':
        return '#ea580c';
      case 'MODERATE':
        return '#d97706';
      case 'LOW':
      default:
        return '#16a34a';
    }
  };

  const getWarningLevelBadge = (warningLevel?: string) => {
    switch (warningLevel) {
      case 'WARNING':
        return { label: 'WARNING (CRITICAL RISK)', bg: '#fef2f2', border: '#fca5a5', text: '#dc2626' };
      case 'WATCH':
        return { label: 'WATCH (HIGH RISK)', bg: '#fff7ed', border: '#fdba74', text: '#ea580c' };
      case 'ADVISORY':
        return { label: 'ADVISORY (ELEVATED RISK)', bg: '#fffbeb', border: '#fde68a', text: '#d97706' };
      case 'NO_WARNING':
      default:
        return { label: 'NO ACTIVE WARNING (NORMAL)', bg: '#f0fdf4', border: '#bbf7d0', text: '#16a34a' };
    }
  };

  const warningTheme = getWarningLevelBadge(mlPrediction?.operationalWarning?.warningLevel);

  return (
    <div className={styles.riskMapPageRoot}>
      <Container size="wide" className={styles.pageContainer}>
        {/* Top Header Banner */}
        <div className={styles.headerBanner}>
          <div className={styles.headerLeft}>
            <div className={styles.iconCircle}>
              <Layers size={22} color="#0284c7" />
            </div>
            <div className={styles.headerMeta}>
              <div className={styles.badgeRow}>
                <Badge variant="weather" showDot>
                  {language === 'hi' ? 'स्तंभ 02 • भू-स्थानिक जोखिम मानचित्र' : 'Pillar 02 • Spatial Radar & Risk Intelligence'}
                </Badge>
                <span className={styles.centerNodeTag}>
                  ACTIVE NODE: {activeLocation.city.toUpperCase()}
                </span>
              </div>
              <h1 className={styles.title}>{t('riskMap.title')}</h1>
              <p className={styles.subtitle}>
                {t('riskMap.subtitle')} • 📍 {activeLocation.city}, {activeLocation.region}
              </p>
            </div>
          </div>

          <div className={styles.headerRight}>
            <button
              type="button"
              className={styles.changeCenterBtn}
              onClick={() => setIsLocationModalOpen(true)}
              title="Click to switch saved profile city node"
            >
              <MapPin size={14} color="#0284c7" />
              <span>Saved Node: {userLocation.city}</span>
              <Compass size={13} className={styles.compassIcon} />
            </button>
          </div>
        </div>

        {/* Active Exploration Notification Banner (when viewing a different city) */}
        {isExploringOtherCity && (
          <div className={styles.explorationBar}>
            <div className={styles.explorationInfo}>
              <Radio size={15} color="#0284c7" className={styles.pulseIcon} />
              <span>
                <strong>Exploring City:</strong> {activeLocation.city}, {activeLocation.region} ({activeLocation.lat.toFixed(2)}°N, {activeLocation.lng.toFixed(2)}°E)
              </span>
            </div>
            <button
              type="button"
              className={styles.resetMyLocationBtn}
              onClick={handleResetToMyLocation}
            >
              <RotateCcw size={13} />
              <span>Reset to My Location ({userLocation.city})</span>
            </button>
          </div>
        )}

        {/* Main Map + Weather / Risk Engine Telemetry Layout */}
        <div className={styles.mainContentGrid}>
          {/* Left Column: Interactive Map with Clickable Cities & RainViewer Radar + Map Legend */}
          <div className={styles.mapViewerColumn}>
            <div className={styles.mapViewerPane}>
              <InteractiveRiskMap
                userLocation={userLocation}
                activeLocation={activeLocation}
                onSelectCity={(loc) => setActiveLocation(loc)}
                radarEnabled={radarEnabled}
                onToggleRadar={() => setRadarEnabled((prev) => !prev)}
                cloudsEnabled={cloudsEnabled}
                onToggleClouds={() => setCloudsEnabled((prev) => !prev)}
                riskLayerEnabled={riskLayerEnabled}
                onToggleRiskLayer={() => setRiskLayerEnabled((prev) => !prev)}
                className={styles.mapElement}
              />
            </div>

            {/* Polished Compact Map Legend & Interpretation Guide */}
            <div className={styles.mapLegendCard}>
              <div className={styles.legendCardHeader}>
                <div className={styles.legendHeaderLeft}>
                  <div className={styles.legendIconWrap}>
                    <Info size={16} color="#0284c7" />
                  </div>
                  <div>
                    <h3 className={styles.legendTitle}>HOW TO READ THE RISK MAP</h3>
                    <p className={styles.legendSubtitle}>
                      Live spatial weather observations, rainfall risk, and model signals for the selected location.
                    </p>
                  </div>
                </div>

                {/* Subtle Map-Synchronized Severity Progression Scale */}
                <div className={styles.severityScaleBar}>
                  <span className={styles.severityScaleLabel}>SEVERITY SCALE:</span>
                  <div className={styles.severityTrackContainer}>
                    <div className={styles.severityGradientTrack} />
                    <div className={styles.severityPillsGroup}>
                      <div className={styles.severityPill}>
                        <span className={styles.dotLow} />
                        <span className={styles.pillText}>LOW</span>
                        <span className={styles.pillThreshold}>&lt;0.75%</span>
                      </div>
                      <div className={styles.severityPill}>
                        <span className={styles.dotModerate} />
                        <span className={styles.pillText}>MODERATE</span>
                        <span className={styles.pillThreshold}>0.75–1.5%</span>
                      </div>
                      <div className={styles.severityPill}>
                        <span className={styles.dotHigh} />
                        <span className={styles.pillText}>HIGH</span>
                        <span className={styles.pillThreshold}>1.5–5.0%</span>
                      </div>
                      <div className={styles.severityPill}>
                        <span className={styles.dotCritical} />
                        <span className={styles.pillText}>CRITICAL</span>
                        <span className={styles.pillThreshold}>≥5.0%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 4-Item Visual Legend Grid */}
              <div className={styles.legendGrid}>
                <div className={styles.legendGridItem}>
                  <div className={styles.legendItemIconCircle}>
                    <Cloud size={15} color="#0284c7" />
                  </div>
                  <div className={styles.legendItemText}>
                    <span className={styles.legendItemTitle}>WEATHER / OBSERVED</span>
                    <p className={styles.legendItemDesc}>
                      Current meteorological conditions from the live weather feed.
                    </p>
                  </div>
                </div>

                <div className={styles.legendGridItem}>
                  <div className={styles.legendItemIconCircle}>
                    <CloudRain size={15} color="#0891b2" />
                  </div>
                  <div className={styles.legendItemText}>
                    <span className={styles.legendItemTitle}>RAIN / RADAR</span>
                    <p className={styles.legendItemDesc}>
                      Radar precipitation activity across the visible region.
                    </p>
                  </div>
                </div>

                <div className={styles.legendGridItem}>
                  <div className={styles.legendItemIconCircle}>
                    <ShieldAlert size={15} color="#d97706" />
                  </div>
                  <div className={styles.legendItemText}>
                    <span className={styles.legendItemTitle}>RAINFALL RISK</span>
                    <p className={styles.legendItemDesc}>
                      Model-derived rainfall risk around monitored locations.
                    </p>
                  </div>
                </div>

                <div className={styles.legendGridItem}>
                  <div className={styles.legendItemIconCircle}>
                    <MapPin size={15} color="#0ea5e9" />
                  </div>
                  <div className={styles.legendItemText}>
                    <span className={styles.legendItemTitle}>SELECTED LOCATION</span>
                    <p className={styles.legendItemDesc}>
                      Your active location used for local telemetry and prediction.
                    </p>
                  </div>
                </div>
              </div>

              {/* Scientific Explanation & Subtle Metadata Row */}
              <div className={styles.legendFooter}>
                <p className={styles.legendExplanation}>
                  Risk is derived from the calibrated rainfall prediction for each monitored location. TreeSHAP highlights the weather features that are pushing the model risk higher or lower.
                </p>
                <div className={styles.legendMetadataRow}>
                  <span>Observed weather</span>
                  <span className={styles.metaDot}>•</span>
                  <span>Radar</span>
                  <span className={styles.metaDot}>•</span>
                  <span>Cloud cover</span>
                  <span className={styles.metaDot}>•</span>
                  <span>Rainfall risk</span>
                  <span className={styles.metaDot}>•</span>
                  <span>TreeSHAP explanation</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Real Weather Context & Explainable AI Prediction Panel */}
          <div className={styles.sideTelemetryPane}>
            {/* 1. LAYER 1: OBSERVED REAL TELEMETRY (Open-Meteo) */}
            <Card variant="ice" padding="md" className={styles.weatherContextCard}>
              <div className={styles.cardHeaderRow}>
                <div>
                  <span className={styles.cardSuperTag}>
                    {isExploringOtherCity
                      ? `LAYER 1: OBSERVED • ${activeLocation.city.toUpperCase()}`
                      : `LAYER 1: OBSERVED • ${activeLocation.city.toUpperCase()}`}
                  </span>
                  <h3 className={styles.cardTitle}>
                    Surface Meteorological Telemetry
                  </h3>
                </div>
                <div className={styles.coordsMiniBadge}>
                  {activeLocation.lat.toFixed(2)}°N, {activeLocation.lng.toFixed(2)}°E
                </div>
              </div>

              {curr ? (
                <div className={styles.metricsGrid}>
                  <div className={styles.metricCard}>
                    <Thermometer size={16} color="#0284c7" />
                    <div>
                      <span className={styles.metricLabel}>Temperature</span>
                      <span className={styles.metricVal}>{curr.temperature.toFixed(1)}°C</span>
                    </div>
                  </div>

                  <div className={styles.metricCard}>
                    <CloudRain size={16} color="#0891b2" />
                    <div>
                      <span className={styles.metricLabel}>Current Rain</span>
                      <span className={styles.metricVal}>{curr.precipitation} mm/h</span>
                    </div>
                  </div>

                  <div className={styles.metricCard}>
                    <Droplets size={16} color="#06b6d4" />
                    <div>
                      <span className={styles.metricLabel}>Humidity</span>
                      <span className={styles.metricVal}>{curr.humidity}%</span>
                    </div>
                  </div>

                  <div className={styles.metricCard}>
                    <Cloud size={16} color="#64748b" />
                    <div>
                      <span className={styles.metricLabel}>Cloud Cover</span>
                      <span className={styles.metricVal}>{curr.cloudCover}%</span>
                    </div>
                  </div>

                  <div className={styles.metricCard}>
                    <Wind size={16} color="#64748b" />
                    <div>
                      <span className={styles.metricLabel}>Wind Speed</span>
                      <span className={styles.metricVal}>{curr.windSpeed.toFixed(1)} km/h</span>
                    </div>
                  </div>

                  <div className={styles.metricCard}>
                    <Gauge size={16} color="#64748b" />
                    <div>
                      <span className={styles.metricLabel}>Surface Pressure</span>
                      <span className={styles.metricVal}>{curr.pressure.toFixed(0)} hPa</span>
                    </div>
                  </div>
                </div>
              ) : weatherLoading ? (
                <div className={styles.loadingBox}>
                  <div className={styles.loadingSpinner} />
                  <span>Loading {activeLocation.city} telemetry...</span>
                </div>
              ) : (
                <div className={styles.errorBox}>
                  <span>{weatherError || 'Live telemetry temporarily unavailable.'}</span>
                </div>
              )}

              <div className={styles.cardFooterText}>
                <CheckCircle2 size={13} color="#16a34a" />
                <span>
                  Condition: <strong>{curr ? curr.weatherCondition : 'Synchronizing...'}</strong> • Verified Open-Meteo Feed
                </span>
              </div>
            </Card>

            {/* 2. LAYER 2 & 3: PREDICTED & EXPLAINED (XGBoost + TreeSHAP + Warning Engine) */}
            <Card variant="default" padding="md" className={styles.riskEngineCard}>
              <div className={styles.riskEngineHeader}>
                <div className={styles.riskIconWrap}>
                  <Cpu size={16} color="#0891b2" />
                </div>
                <div>
                  <span className={styles.riskSuperTag}>LAYER 2 & 3: PREDICTED & EXPLAINED</span>
                  <h4 className={styles.riskTitle}>Heavy Rainfall & TreeSHAP Engine</h4>
                </div>
              </div>

              {mlPrediction ? (
                <div className={styles.mlPredictionContent}>
                  {/* Probability & Model Risk Level */}
                  <div className={styles.mlScoreBanner}>
                    <div className={styles.mlScoreLeft}>
                      <span className={styles.mlProbLabel}>
                        24h Heavy-Rain ML Probability {mlPrediction.prediction.severity ? `• ${mlPrediction.prediction.severity}` : ''}
                      </span>
                      <span className={styles.mlProbValue}>
                        {((mlPrediction.prediction.probability ?? mlPrediction.prediction.heavyRainProbability ?? 0) * 100).toFixed(1)}%
                      </span>
                      <span className={styles.threshSubtext}>
                        Operational Decision Threshold: 1.5% (0.0150)
                      </span>
                    </div>
                    <div
                      className={styles.riskBadgePill}
                      style={{
                        backgroundColor: `${getRiskBadgeColor(mlPrediction.prediction.riskLevel)}18`,
                        borderColor: getRiskBadgeColor(mlPrediction.prediction.riskLevel),
                        color: getRiskBadgeColor(mlPrediction.prediction.riskLevel),
                      }}
                    >
                      <span>MODEL RISK: {mlPrediction.prediction.riskLevel}</span>
                    </div>
                  </div>

                  {/* Operational Warning Level Banner */}
                  {mlPrediction.operationalWarning && (
                    <div
                      className={styles.warningAlertBox}
                      style={{
                        backgroundColor: warningTheme.bg,
                        borderColor: warningTheme.border,
                        color: warningTheme.text,
                      }}
                    >
                      <div className={styles.warningAlertHeader}>
                        <ShieldAlert size={15} color={warningTheme.text} />
                        <span className={styles.warningAlertTitle}>{warningTheme.label}</span>
                      </div>
                      <p className={styles.warningAlertSummary}>
                        {mlPrediction.operationalWarning.summary}
                      </p>
                    </div>
                  )}

                  {/* Top SHAP Feature Attributions */}
                  <div className={styles.shapSection}>
                    <div className={styles.shapHeaderRow}>
                      <span className={styles.shapSectionTitle}>
                        Top Atmospheric Contributors (TreeSHAP Attributions):
                      </span>
                      <span className={styles.shapInfoTag}>Exact Shapley Values</span>
                    </div>
                    <div className={styles.shapFactorsList}>
                      {mlPrediction.explanation.topFactors.slice(0, 3).map((factor, idx) => {
                        const isPositive = factor.shapValue > 0;
                        return (
                          <div key={idx} className={styles.shapFactorItem}>
                            <div className={styles.factorNameCol}>
                              <span className={styles.factorName}>{factor.featureName}</span>
                              <span className={styles.factorUnitVal}>
                                {factor.value} {factor.unit || ''}
                              </span>
                            </div>
                            <div className={styles.factorImpactCol}>
                              <div
                                className={styles.impactBadge}
                                style={{
                                  backgroundColor: isPositive ? '#fff7ed' : '#f0fdf4',
                                  borderColor: isPositive ? '#fdba74' : '#bbf7d0',
                                  color: isPositive ? '#ea580c' : '#16a34a',
                                }}
                              >
                                {isPositive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                                <span>{isPositive ? `+${factor.shapValue.toFixed(3)}` : factor.shapValue.toFixed(3)}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Model Metadata & Lineage Footer */}
                  <p className={styles.modelDisclaimer}>
                    <Info size={12} style={{ flexShrink: 0, marginTop: '2px' }} />
                    <span>
                      <strong>Model:</strong> {mlPrediction.model.name} ({mlPrediction.model.version})
                      {(mlPrediction.model.metrics?.rocAuc ?? mlPrediction.model.evaluation?.rocAuc)
                        ? ` • ROC-AUC: ${(mlPrediction.model.metrics?.rocAuc ?? mlPrediction.model.evaluation?.rocAuc ?? 0.96).toFixed(3)}`
                        : ''}
                      {' • '}Brier: 0.0044 (Calibrated)
                    </span>
                  </p>
                </div>
              ) : isModelReady || mlLoading ? (
                <div className={styles.loadingBox}>
                  <div className={styles.loadingSpinner} />
                  <span>Computing calibrated XGBoost + SHAP inference for {activeLocation.city}...</span>
                </div>
              ) : (
                <div className={styles.statusDualGrid}>
                  <div className={styles.statusTileActive}>
                    <span className={styles.statusTileLabel}>LAYER 1: OBSERVED WEATHER</span>
                    <span className={styles.statusTileValue}>✓ Live Active Telemetry</span>
                    <span className={styles.statusTileDetail}>Open-Meteo & RainViewer Radar</span>
                  </div>

                  <div className={styles.statusTilePending}>
                    <span className={styles.statusTileLabel}>LAYER 2 & 3: XAI ENGINE</span>
                    <span className={styles.statusTileValuePending}>○ Model Standby</span>
                    <span className={styles.statusTileDetail}>FastAPI Service Port 8000</span>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>

        {/* Global Attribution Strip */}
        <div className={styles.attributionStrip}>
          <div className={styles.attributionItem}>
            <Sparkles size={13} color="#0891b2" />
            <span>
              Map tiles &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener noreferrer">CARTO</a>
            </span>
          </div>
          <div className={styles.attributionItem}>
            <span>
              Radar by <a href="https://www.rainviewer.com/api.html" target="_blank" rel="noopener noreferrer">RainViewer</a> • NASA GPM IMERG 0.1° Grid • Weather by <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">Open-Meteo</a> (CC BY 4.0)
            </span>
          </div>
        </div>
      </Container>

      {/* Location Switcher Modal */}
      <LocationSwitcher
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
      />
    </div>
  );
};
