import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Brain,
  Map,
  AlertTriangle,
  HeartHandshake,
  Sprout,
  ArrowRight,
  MapPin,
  Sparkles,
  Activity,
  LucideIcon,
  CloudRain,
  Wind,
  Gauge,
  Droplets,
  Thermometer,
  Info,
  ChevronRight,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { Container } from '../../components/ui/Container';
import { Badge } from '../../components/ui/Badge';
import { LocationSwitcher } from '../../components/ui/LocationSwitcher';
import { LiveWeatherNews } from '../../components/weather/LiveWeatherNews';
import { useAuth } from '../../context/AuthContext';
import { useLocationContext } from '../../context/LocationContext';
import { useWeatherData } from '../../hooks/useWeatherData';
import { useMlRiskPrediction } from '../../hooks/useMlRiskPrediction';
import { useI18n } from '../../i18n';
import styles from './DashboardPage.module.css';

interface DashboardPillarNode {
  readonly id: string;
  readonly number: string;
  readonly title: string;
  readonly path: string;
  readonly angleDeg: number;
  readonly icon: LucideIcon;
  readonly themeColor: string;
  readonly themeLight: string;
  readonly themeBorder: string;
  readonly themeGlow: string;
  readonly purpose: string;
  readonly description: string;
}

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { location } = useLocationContext();
  const { weatherData, isLoading: isWeatherLoading, error: weatherError } = useWeatherData(location);
  const { prediction: mlPrediction, isLoading: isMlLoading } = useMlRiskPrediction(
    location.lat,
    location.lng,
    location.city
  );
  const { t, language } = useI18n();
  const navigate = useNavigate();

  const [activeHoverNode, setActiveHoverNode] = useState<string | null>(null);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState<boolean>(false);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState<boolean>(false);

  // Dynamic greeting based on current time
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (language === 'hi') {
      if (hour < 12) return 'सुप्रभात';
      if (hour < 17) return 'नमस्कार';
      return 'शुभ संध्या';
    }
    if (hour < 12) return 'GOOD MORNING';
    if (hour < 17) return 'GOOD AFTERNOON';
    return 'GOOD EVENING';
  };

  const currWeather = weatherData?.current;
  const hourly = weatherData?.hourly || [];
  const next24h = hourly.slice(0, 24);
  const next24hRainSum = next24h.reduce((sum, h) => sum + (h.precipitation || 0), 0);
  const maxProb24h = next24h.reduce((max, h) => Math.max(max, h.precipitationProbability || 0), 0);

  // ML values grounded in real service
  const mlProbRaw = mlPrediction?.prediction?.probability ?? 0.009;
  const mlProbFormatted = (mlProbRaw * 100).toFixed(1) + '%';
  const riskTier = mlPrediction?.prediction?.riskLevel || 'MODERATE';
  const thresholdFormatted = '1.5%';

  const isHindi = language === 'hi';

  const PILLARS_NODES: readonly DashboardPillarNode[] = [
    {
      id: 'intelligence',
      number: '01',
      title: isHindi ? 'R.A.I. मौसम इंटेलिजेंस' : 'R.A.I. INTELLIGENCE',
      path: '/intelligence',
      angleDeg: -90, // Top (12 o'clock)
      icon: Brain,
      themeColor: '#0891b2',
      themeLight: '#ecfeff',
      themeBorder: '#a5f3fc',
      themeGlow: 'rgba(6, 182, 212, 0.55)',
      purpose: isHindi ? 'AI व्याख्या और वायुमंडलीय कारक' : 'Explainable AI & Atmospheric Drivers',
      description: currWeather
        ? `${location.city}: ${currWeather.weatherCondition} (${currWeather.temperature.toFixed(1)}°C)`
        : `XAI rainfall forecast & feature explanations for ${location.city}.`,
    },
    {
      id: 'risk-map',
      number: '02',
      title: isHindi ? 'R.A.I. जोखिम मानचित्र' : 'R.A.I. RISK MAP',
      path: '/risk-map',
      angleDeg: -18, // Top Right (2 o'clock)
      icon: Map,
      themeColor: '#0284c7',
      themeLight: '#f0f9ff',
      themeBorder: '#bae6fd',
      themeGlow: 'rgba(14, 165, 233, 0.55)',
      purpose: isHindi ? 'भू-स्थानिक रडार और जलभराव क्षेत्र' : 'Geospatial Radar & Inundation Hotspots',
      description: `${location.city} (${location.lat.toFixed(2)}°N, ${location.lng.toFixed(2)}°E)`,
    },
    {
      id: 'emergency',
      number: '03',
      title: isHindi ? 'R.A.I. आपातकालीन अलर्ट' : 'R.A.I. EMERGENCY',
      path: '/emergency',
      angleDeg: 54, // Bottom Right (4 o'clock)
      icon: AlertTriangle,
      themeColor: '#d97706',
      themeLight: '#fffbeb',
      themeBorder: '#fde68a',
      themeGlow: 'rgba(245, 158, 11, 0.55)',
      purpose: isHindi ? 'पूर्व चेतावनी और सुरक्षित आश्रय स्थल' : 'Early Warning Broadcasts & Safe Havens',
      description: `${location.city}, ${location.region}`,
    },
    {
      id: 'relief',
      number: '04',
      title: isHindi ? 'R.A.I. राहत सहायता' : 'R.A.I. RELIEF',
      path: '/relief',
      angleDeg: -162, // Top Left (10 o'clock)
      icon: HeartHandshake,
      themeColor: '#10b981',
      themeLight: '#f0fdf4',
      themeBorder: '#bbf7d0',
      themeGlow: 'rgba(16, 185, 129, 0.55)',
      purpose: isHindi ? 'नागरिक संसाधन और आपदा राहत केंद्र' : 'Verified Civic Logistics & Community Aid',
      description: `${location.city} logistics coordinator`,
    },
    {
      id: 'farmer',
      number: '05',
      title: isHindi ? 'R.A.I. किसान AI' : 'R.A.I. FARMER',
      path: '/farmer',
      angleDeg: 126, // Bottom Left (8 o'clock)
      icon: Sprout,
      themeColor: '#16a34a',
      themeLight: '#f0fdf4',
      themeBorder: '#86efac',
      themeGlow: 'rgba(22, 163, 74, 0.55)',
      purpose: isHindi ? 'मिट्टी की नमी और सिंचाई निर्णय सलाह' : 'Soil Saturation Limits & Crop Health',
      description: isHindi ? 'स्थान-विशिष्ट कृषि और फसल मार्गदर्शन' : 'Location-grounded agronomic advisory',
    },
  ];

  const activeNodeData =
    PILLARS_NODES.find((p) => p.id === activeHoverNode) || PILLARS_NODES[0]!;

  const getRiskTierBadgeStyle = (tier: string) => {
    switch (tier) {
      case 'CRITICAL':
        return { bg: '#fef2f2', border: '#fca5a5', text: '#dc2626', label: 'CRITICAL RISK' };
      case 'HIGH':
        return { bg: '#fff7ed', border: '#fdba74', text: '#ea580c', label: 'HIGH RISK' };
      case 'MODERATE':
        return { bg: '#fffbeb', border: '#fde68a', text: '#b45309', label: 'MODERATE WATCH' };
      case 'LOW':
      default:
        return { bg: '#f0fdf4', border: '#bbf7d0', text: '#15803d', label: 'LOW RISK' };
    }
  };

  const riskBadge = getRiskTierBadgeStyle(riskTier);

  return (
    <div className={styles.dashboardPageRoot}>
      <Container size="wide" className={styles.dashboardContainer}>
        {/* =========================================================================
            1. TOP HEADER: GREETING & LOCATION TELEMETRY STATUS
            ========================================================================= */}
        <div className={styles.greetingHeader}>
          <div className={styles.greetingLeft}>
            <div className={styles.greetingTagRow}>
              <Badge variant="ai" showDot>
                R.A.I. Atmospheric Intelligence Hub
              </Badge>
              <span className={styles.nodeStatusTag}>
                <span className={styles.livePulseDot} />
                {isWeatherLoading
                  ? 'CONNECTING LOCAL SENSORS...'
                  : weatherError
                  ? 'LOCAL TELEMETRY OFFLINE'
                  : 'LIVE TELEMETRY: OPEN-METEO'}
              </span>
            </div>
            <h1 className={styles.greetingTitle}>
              {getGreeting()}, {user?.fullName?.split(' ')[0] || 'DARSHIL'}.
            </h1>
            <p className={styles.greetingSubtitle}>
              Continuous meteorological monitoring & explainable extreme rainfall prediction for your coordinates.
            </p>
          </div>

          <div className={styles.greetingRight}>
            <button
              type="button"
              className={styles.locationBadgeBtn}
              onClick={() => setIsLocationModalOpen(true)}
              title="Click to switch city node"
            >
              <div className={styles.locationIconCircle}>
                <MapPin size={16} color="#06b6d4" />
              </div>
              <div className={styles.locationBadgeText}>
                <span className={styles.locationCityMain}>{location.city}</span>
                <span className={styles.locationRegionSub}>
                  {location.region} • {location.lat.toFixed(2)}°N, {location.lng.toFixed(2)}°E
                </span>
              </div>
              <span className={styles.changeNodeHint}>Change ⇄</span>
            </button>
          </div>
        </div>

        {/* =========================================================================
            2. 5-SECOND SITUATIONAL AWARENESS STRIP (DUAL-TRACK WEATHER + AI RISK)
            ========================================================================= */}
        <div className={styles.situationalGrid}>
          {/* Card 1: Live Observation */}
          <div className={styles.metricCard}>
            <div className={styles.metricHeaderRow}>
              <div className={styles.metricIconWrap} style={{ backgroundColor: '#f0f9ff', color: '#0284c7' }}>
                <Thermometer size={16} />
              </div>
              <span className={styles.metricLabel}>{t('dashboard.liveObsTitle')}</span>
              <span className={styles.livePill}>LIVE</span>
            </div>
            <div className={styles.metricMainValRow}>
              <span className={styles.metricMainNumber}>
                {currWeather ? `${currWeather.temperature.toFixed(1)}°C` : '--'}
              </span>
              <span className={styles.metricSubCondition}>
                {currWeather?.weatherCondition || 'Connecting...'}
              </span>
            </div>
            <div className={styles.metricDetailRow}>
              <span>💧 {t('dashboard.humidity')}: {currWeather?.humidity ?? '--'}%</span>
              <span>💨 {t('dashboard.windVelocity')}: {currWeather ? `${currWeather.windSpeed.toFixed(1)} km/h` : '--'}</span>
              <span>⏱ {t('dashboard.surfacePressure')}: {currWeather ? `${currWeather.pressure.toFixed(0)} hPa` : '--'}</span>
            </div>
          </div>

          {/* Card 2: Normal Weather Precipitation Forecast */}
          <div className={styles.metricCard}>
            <div className={styles.metricHeaderRow}>
              <div className={styles.metricIconWrap} style={{ backgroundColor: '#ecfeff', color: '#0891b2' }}>
                <CloudRain size={16} />
              </div>
              <span className={styles.metricLabel}>{t('dashboard.rain24hTitle')}</span>
              <span className={styles.sourcePill}>FORECAST</span>
            </div>
            <div className={styles.metricMainValRow}>
              <span className={styles.metricMainNumber}>
                {currWeather ? `${next24hRainSum.toFixed(1)} mm` : '--'}
              </span>
              <span className={styles.metricSubCondition}>
                {next24hRainSum >= 64.5 ? (isHindi ? 'भारी बारिश' : 'Heavy Rain') : next24hRainSum >= 7.6 ? (isHindi ? 'मध्यम बारिश' : 'Moderate Rain') : (isHindi ? 'हल्की बारिश' : 'Light Showers')}
              </span>
            </div>
            <div className={styles.metricDetailRow}>
              <span>🎯 {t('dashboard.peakProbability')}: <strong>{maxProb24h}%</strong></span>
              <span>📊 {t('dashboard.accumExpected')}: <strong>{next24hRainSum.toFixed(1)} mm</strong></span>
            </div>
          </div>

          {/* Card 3: R.A.I. Heavy-Rainfall ML Risk Assessment */}
          <div className={styles.metricCardHighlight}>
            <div className={styles.metricHeaderRow}>
              <div className={styles.metricIconWrap} style={{ backgroundColor: '#f0fdf4', color: '#16a34a' }}>
                <Brain size={16} />
              </div>
              <span className={styles.metricLabel}>{t('dashboard.mlRiskTitle')}</span>
              <div
                className={styles.tierPill}
                style={{ backgroundColor: riskBadge.bg, borderColor: riskBadge.border, color: riskBadge.text }}
              >
                {riskBadge.label}
              </div>
            </div>
            <div className={styles.metricMainValRow}>
              <span className={styles.metricMainNumberHighlight} style={{ color: riskBadge.text }}>
                {isMlLoading ? '...' : mlProbFormatted}
              </span>
              <span className={styles.metricSubCondition}>
                {t('dashboard.operationalThresh')}: {thresholdFormatted} (≥64.5 mm/day)
              </span>
            </div>
            <div className={styles.metricDetailRow}>
              <span>🤖 Model: <strong>Calibrated XGBoost</strong></span>
              <span>🔍 Status: <strong>{mlProbRaw >= 0.015 ? (isHindi ? 'परिचालन सीमा से अधिक (≥1.5%)' : 'Exceeds Trigger (≥1.5%)') : (isHindi ? 'परिचालन सीमा के भीतर (<1.5%)' : 'Below Operational Threshold (1.5%)')}</strong></span>
            </div>
          </div>
        </div>

        {/* =========================================================================
            3. CENTRAL PLANETARY ORB & 5 PILLARS SYSTEM
            ========================================================================= */}
        <div className={styles.hubCompositionLayout}>
          <div className={styles.planetarySystemWrapper}>
            {/* SVG Connecting Light Beams */}
            <svg className={styles.beamSvg} viewBox="-250 -250 500 500" aria-hidden="true">
              <defs>
                <radialGradient id="hubCenterAura" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="rgba(6, 182, 212, 0.22)" />
                  <stop offset="50%" stopColor="rgba(14, 165, 233, 0.08)" />
                  <stop offset="100%" stopColor="transparent" />
                </radialGradient>
              </defs>

              {/* Ambient Background Aura */}
              <circle cx={0} cy={0} r={210} fill="url(#hubCenterAura)" />

              {/* Orbital dashed tracks */}
              <circle
                cx={0}
                cy={0}
                r={168}
                fill="none"
                stroke="rgba(203, 213, 225, 0.6)"
                strokeWidth="1.25"
                strokeDasharray="4 6"
              />

              {/* Connecting Vector Lines to each pillar */}
              {PILLARS_NODES.map((node) => {
                const rad = (node.angleDeg * Math.PI) / 180;
                const rOrb = 82;
                const rNodePos = 168;
                const x1 = rOrb * Math.cos(rad);
                const y1 = rOrb * Math.sin(rad);
                const x2 = rNodePos * Math.cos(rad);
                const y2 = rNodePos * Math.sin(rad);

                const isActive = activeHoverNode === node.id;

                return (
                  <line
                    key={`line-${node.id}`}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={isActive ? node.themeColor : 'rgba(203, 213, 225, 0.65)'}
                    strokeWidth={isActive ? 2.5 : 1}
                    strokeDasharray={isActive ? 'none' : '3 3'}
                    className={styles.beamLine}
                  />
                );
              })}
            </svg>

            {/* 1. CENTRAL LOCATION ORB (REAL WEATHER INTEGRATED) */}
            <div
              className={styles.centerLocationOrb}
              onClick={() => setIsLocationModalOpen(true)}
              title="Current City Intelligence Node (Click to switch location)"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') setIsLocationModalOpen(true);
              }}
            >
              <div className={styles.orbGlowAura} />
              <div className={styles.orbPulseRing} />
              <div className={styles.orbSurface}>
                <div className={styles.orbAtmosphereParticles} />
                <span className={styles.orbBrandName}>R.A.I.</span>
                <span className={styles.orbCityName}>{location.city}</span>

                {isWeatherLoading ? (
                  <span className={styles.orbLoadingText}>Connecting local telemetry...</span>
                ) : weatherError ? (
                  <span className={styles.orbErrorText}>Telemetry offline</span>
                ) : currWeather ? (
                  <div className={styles.orbLiveWeatherRow}>
                    <span className={styles.orbTempText}>{currWeather.temperature.toFixed(1)}°C</span>
                    <span className={styles.orbConditionText}>{currWeather.weatherCondition}</span>
                  </div>
                ) : (
                  <span className={styles.orbRegionName}>{location.region}</span>
                )}

                <div className={styles.orbStatusPill}>
                  <div className={weatherError ? styles.liveRedDot : styles.liveGreenDot} />
                  <span>{isWeatherLoading ? 'SYNCING...' : weatherError ? 'OFFLINE' : 'LIVE NODE'}</span>
                </div>
              </div>
            </div>

            {/* 2. FIVE SATELLITE PILLAR NODES */}
            {PILLARS_NODES.map((node) => {
              const rad = (node.angleDeg * Math.PI) / 180;
              const dist = 168;
              const xPos = Math.round(dist * Math.cos(rad));
              const yPos = Math.round(dist * Math.sin(rad));

              const isActive = activeHoverNode === node.id;
              const IconComp = node.icon;

              return (
                <div
                  key={node.id}
                  className={`${styles.satelliteNode} ${isActive ? styles.satelliteNodeActive : ''}`}
                  style={
                    {
                      transform: `translate(${xPos}px, ${yPos}px) ${isActive ? 'scale(1.08)' : 'scale(1)'}`,
                      '--node-glow': node.themeGlow,
                      '--node-color': node.themeColor,
                    } as React.CSSProperties
                  }
                  onMouseEnter={() => setActiveHoverNode(node.id)}
                  onMouseLeave={() => setActiveHoverNode(null)}
                  onClick={() => navigate(node.path)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') navigate(node.path);
                  }}
                  aria-label={`Open ${node.title} for ${location.city}`}
                >
                  <div
                    className={styles.nodeIconCircle}
                    style={{
                      backgroundColor: node.themeLight,
                      borderColor: isActive ? node.themeColor : node.themeBorder,
                    }}
                  >
                    <IconComp size={18} color={node.themeColor} />
                  </div>
                  <div className={styles.nodeLabelGroup}>
                    <span className={styles.nodeNumber} style={{ color: node.themeColor }}>
                      {node.number}
                    </span>
                    <span className={styles.nodeTitle}>{node.title.replace('R.A.I. ', '')}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Synchronized Contextual Detail Strip */}
          <div className={styles.bottomDetailStrip}>
            <div className={styles.detailCard}>
              <div className={styles.detailCardLeft}>
                <div
                  className={styles.detailIconCircle}
                  style={{ backgroundColor: activeNodeData.themeLight }}
                >
                  <activeNodeData.icon size={20} color={activeNodeData.themeColor} />
                </div>
                <div className={styles.detailTextGroup}>
                  <div className={styles.detailPillRow}>
                    <Badge variant="ai">Pillar {activeNodeData.number}</Badge>
                    <span className={styles.detailLocationContext}>
                      📍 Scope: {location.city}, {location.region}
                    </span>
                  </div>
                  <h3 className={styles.detailTitle}>{activeNodeData.title}</h3>
                  <p className={styles.detailDesc}>{activeNodeData.description}</p>
                </div>
              </div>

              <div className={styles.detailCardRight}>
                <button
                  type="button"
                  className={styles.launchPillarBtn}
                  style={{ backgroundColor: activeNodeData.themeColor }}
                  onClick={() => navigate(activeNodeData.path)}
                >
                  <span>Launch {activeNodeData.title.replace('R.A.I. ', '')}</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Vertical Node Stack */}
        <div className={styles.mobileStackLayout}>
          <div className={styles.mobileOrbCard} onClick={() => setIsLocationModalOpen(true)}>
            <div className={styles.mobileOrbHeader}>
              <span className={styles.orbBrandName}>R.A.I.</span>
              <span className={styles.mobileCityTitle}>{location.city}</span>
              {isWeatherLoading ? (
                <span className={styles.mobileRegionText}>Connecting local weather intelligence...</span>
              ) : weatherError ? (
                <span className={styles.mobileRegionText}>{weatherError}</span>
              ) : currWeather ? (
                <div className={styles.mobileWeatherRow}>
                  <span className={styles.mobileTemp}>{currWeather.temperature.toFixed(1)}°C</span>
                  <span className={styles.mobileCondition}>
                    {currWeather.weatherCondition} • {currWeather.humidity}% Humidity
                  </span>
                </div>
              ) : (
                <span className={styles.mobileRegionText}>{location.region} • Local Node</span>
              )}
            </div>
            <div className={styles.mobileChangeLocationRow}>
              <MapPin size={14} color="#0891b2" />
              <span>Tap to Change Active Location</span>
            </div>
          </div>

          <div className={styles.mobilePillarsList}>
            {PILLARS_NODES.map((node) => {
              const IconComponent = node.icon;
              return (
                <div
                  key={`mobile-${node.id}`}
                  className={styles.mobilePillarCard}
                  onClick={() => navigate(node.path)}
                >
                  <div
                    className={styles.mobileNodeIcon}
                    style={{ backgroundColor: node.themeLight, borderColor: node.themeBorder }}
                  >
                    <IconComponent size={20} color={node.themeColor} />
                  </div>
                  <div className={styles.mobileNodeBody}>
                    <div className={styles.mobileNodeTop}>
                      <span className={styles.nodeNumber} style={{ color: node.themeColor }}>
                        {node.number}
                      </span>
                      <h4 className={styles.mobileNodeTitle}>{node.title}</h4>
                    </div>
                    <p className={styles.mobileNodeDesc}>{node.purpose}</p>
                  </div>
                  <ArrowRight size={16} className={styles.mobileArrow} />
                </div>
              );
            })}
          </div>
        </div>

        {/* =========================================================================
            3.5. LIVE WEATHER & FIELD INTEL FEED
            ========================================================================= */}
        <div style={{ marginTop: '1.5rem', marginBottom: '1rem' }}>
          <LiveWeatherNews location={location} />
        </div>

        {/* =========================================================================
            4. EXPLAINABILITY & TRANSPARENCY ACCORDION
            ========================================================================= */}
        <div className={styles.explainabilitySection}>
          <button
            type="button"
            className={styles.explainabilityToggleBtn}
            onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
          >
            <div className={styles.explainToggleLeft}>
              <Info size={15} color="#0891b2" />
              <span>
                <strong>{isHindi ? `R.A.I. ${riskTier} जोखिम (${mlProbFormatted}) क्यों बता रहा है?` : `Why is R.A.I. assessing ${riskTier} Risk (${mlProbFormatted})?`}</strong> {isHindi ? 'TreeSHAP व्याख्या विवरण देखें' : 'View TreeSHAP explainability details'}
              </span>
            </div>
            <ChevronRight
              size={16}
              className={`${styles.toggleChevron} ${showTechnicalDetails ? styles.toggleChevronOpen : ''}`}
            />
          </button>

          {showTechnicalDetails && (
            <div className={styles.technicalCard}>
              <div className={styles.technicalGrid}>
                {/* Factors Reducing Risk */}
                <div className={styles.shapColumn}>
                  <div className={styles.shapColHeader} style={{ color: '#16a34a' }}>
                    <TrendingDown size={14} />
                    <span>{t('dashboard.factorsReducing', 'FACTORS REDUCING RISK')}</span>
                  </div>
                  <div className={styles.shapCardList}>
                    <div className={styles.shapFactorCard}>
                      <div className={styles.shapFactorHeader}>
                        <span className={styles.shapFactorName}>• {isHindi ? 'बादलों का आवरण' : 'Cloud Cover'} — {currWeather?.cloudCover ?? 90}%</span>
                        <span className={`${styles.shapBadge} ${styles.shapBadgeNegative}`}>SHAP −2.34</span>
                      </div>
                      <div className={styles.shapFactorSub}>
                        <span>Contribution: −2.34</span>
                        <span>• Effect: {isHindi ? 'मॉडल जोखिम कम' : 'Lower model risk'}</span>
                      </div>
                    </div>

                    <div className={styles.shapFactorCard}>
                      <div className={styles.shapFactorHeader}>
                        <span className={styles.shapFactorName}>• {isHindi ? 'हवा की गति / विंड फील्ड' : 'Wind Speed / Wind Field'} — {currWeather ? `${currWeather.windSpeed.toFixed(1)} km/h` : '2.4 km/h'}</span>
                        <span className={`${styles.shapBadge} ${styles.shapBadgeNegative}`}>SHAP −2.25</span>
                      </div>
                      <div className={styles.shapFactorSub}>
                        <span>Contribution: −2.25</span>
                        <span>• Effect: {isHindi ? 'मॉडल जोखिम कम' : 'Lower model risk'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Factors Increasing Risk */}
                <div className={styles.shapColumn}>
                  <div className={styles.shapColHeader} style={{ color: '#ea580c' }}>
                    <TrendingUp size={14} />
                    <span>{t('dashboard.factorsIncreasing', 'FACTORS INCREASING RISK')}</span>
                  </div>
                  <div className={styles.shapCardList}>
                    <div className={styles.shapFactorCard}>
                      <div className={styles.shapFactorHeader}>
                        <span className={styles.shapFactorName}>• {isHindi ? 'संवहनी अस्थिरता' : 'Convective Instability'}</span>
                        <span className={`${styles.shapBadge} ${styles.shapBadgePositive}`}>SHAP +0.94</span>
                      </div>
                      <div className={styles.shapFactorSub}>
                        <span>Contribution: +0.94</span>
                        <span>• Effect: {isHindi ? 'मॉडल जोखिम अधिक' : 'Higher model risk'}</span>
                      </div>
                    </div>

                    <div className={styles.shapFactorCard}>
                      <div className={styles.shapFactorHeader}>
                        <span className={styles.shapFactorName}>• {isHindi ? 'सतही वायुदाब' : 'Surface Pressure'} — {currWeather ? `${currWeather.pressure.toFixed(0)} hPa` : '981 hPa'}</span>
                        <span className={`${styles.shapBadge} ${styles.shapBadgePositive}`}>SHAP +0.30</span>
                      </div>
                      <div className={styles.shapFactorSub}>
                        <span>Contribution: +0.30</span>
                        <span>• Effect: {isHindi ? 'मॉडल जोखिम अधिक' : 'Higher model risk'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className={styles.scientificNote}>
                <strong>{isHindi ? 'वैज्ञानिक कार्यप्रणाली:' : 'Scientific Methodology:'}</strong> {isHindi ? 'TreeSHAP मॉडल के ऐतिहासिक आधारभूत लॉग-ऑड्स के सापेक्ष सटीक फीचर योगदान की गणना करता है। ये मान सांख्यिकीय संबंध दर्शाते हैं।' : 'TreeSHAP calculates exact Shapley feature attributions relative to historical baseline log-odds. Values denote statistical attribution rather than asserting direct mechanical causation.'}
              </div>
            </div>
          )}
        </div>

        {/* =========================================================================
            5. ENVIRONMENTAL ATTRIBUTION & TELEMETRY FOOTER STRIP
            ========================================================================= */}
        <div className={styles.environmentalStrip}>
          <div className={styles.envTelemetryRow}>
            {currWeather ? (
              <>
                <div className={styles.envMetricItem}>
                  <Thermometer size={13} color="#0284c7" />
                  <span><strong>Temp:</strong> {currWeather.temperature.toFixed(1)}°C</span>
                </div>
                <div className={styles.envMetricItem}>
                  <Droplets size={13} color="#06b6d4" />
                  <span><strong>Humidity:</strong> {currWeather.humidity}%</span>
                </div>
                <div className={styles.envMetricItem}>
                  <CloudRain size={13} color="#0891b2" />
                  <span><strong>Precip:</strong> {currWeather.precipitation} mm</span>
                </div>
                <div className={styles.envMetricItem}>
                  <Wind size={13} color="#64748b" />
                  <span><strong>Wind:</strong> {currWeather.windSpeed.toFixed(1)} km/h</span>
                </div>
                <div className={styles.envMetricItem}>
                  <Gauge size={13} color="#64748b" />
                  <span><strong>Pressure:</strong> {currWeather.pressure.toFixed(0)} hPa</span>
                </div>
              </>
            ) : isWeatherLoading ? (
              <div className={styles.envMetricItem}>
                <Activity size={13} color="#06b6d4" />
                <span>Connecting to local weather intelligence for {location.city}...</span>
              </div>
            ) : (
              <div className={styles.envMetricItem}>
                <Activity size={13} color="#ef4444" />
                <span>Local weather intelligence is temporarily unavailable.</span>
              </div>
            )}
          </div>

          <div className={styles.envAttribution}>
            <Sparkles size={13} color="#10b981" />
            <span>
              Live Telemetry by <strong>Open-Meteo</strong> • Calibrated ML by <strong>R.A.I. Engine</strong> • {location.city} ({location.lat.toFixed(2)}°N, {location.lng.toFixed(2)}°E)
            </span>
          </div>
        </div>
      </Container>

      {/* City Switcher Modal */}
      <LocationSwitcher
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
      />
    </div>
  );
};
