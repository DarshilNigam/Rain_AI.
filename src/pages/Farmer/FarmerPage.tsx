import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Home,
  Wheat,
  Activity,
  CloudSun,
  CloudRain,
  AlertTriangle,
  Droplets,
  Calendar,
  History,
  Grid,
  MapPin,
  Settings,
} from 'lucide-react';
import { Container } from '../../components/ui/Container';
import { useFarmerContext } from '../../context/FarmerContext';
import { useI18n } from '../../i18n';
import { FarmerOnboardingPage } from './onboarding/FarmerOnboardingPage';
import styles from './FarmerPage.module.css';

interface WheelNode {
  readonly id: string;
  readonly number: string;
  readonly title: string;
  readonly shortDesc: string;
  readonly route: string;
  readonly icon: React.ReactNode;
  readonly angleDeg: number; // Angle in degrees (0 = top, clockwise)
  readonly categoryColor: string;
}

const WHEEL_NODES: readonly WheelNode[] = [
  {
    id: 'farm',
    number: '01',
    title: 'MY FARM',
    shortDesc: 'Farm profile, village location & landholding overview',
    route: '/farmer/farm',
    icon: <Home size={17} color="#16a34a" />,
    angleDeg: 0, // 12 o'clock (Top)
    categoryColor: '#16a34a',
  },
  {
    id: 'crops',
    number: '02',
    title: 'MY CROPS',
    shortDesc: 'Active crop registry, varieties & sowing timelines',
    route: '/farmer/crops',
    icon: <Wheat size={17} color="#0891b2" />,
    angleDeg: 36,
    categoryColor: '#0891b2',
  },
  {
    id: 'crop-stage',
    number: '03',
    title: 'CROP STAGE',
    shortDesc: 'Phenological stages from germination to harvest',
    route: '/farmer/crop-stage',
    icon: <Activity size={17} color="#0284c7" />,
    angleDeg: 72,
    categoryColor: '#0284c7',
  },
  {
    id: 'weather',
    number: '04',
    title: 'FARM WEATHER',
    shortDesc: 'Live Open-Meteo farm telemetry & 7-day outlook',
    route: '/farmer/weather',
    icon: <CloudSun size={17} color="#ea580c" />,
    angleDeg: 108,
    categoryColor: '#ea580c',
  },
  {
    id: 'rainfall-impact',
    number: '05',
    title: 'RAINFALL IMPACT',
    shortDesc: 'Precipitation effects on current crop root zone',
    route: '/farmer/rainfall-impact',
    icon: <CloudRain size={17} color="#2563eb" />,
    angleDeg: 144,
    categoryColor: '#2563eb',
  },
  {
    id: 'alerts',
    number: '06',
    title: 'FARM ALERTS',
    shortDesc: 'Meteorological hazards, storm & wet-spell alerts',
    route: '/farmer/alerts',
    icon: <AlertTriangle size={17} color="#dc2626" />,
    angleDeg: 180, // 6 o'clock (Bottom)
    categoryColor: '#dc2626',
  },
  {
    id: 'irrigation',
    number: '07',
    title: 'IRRIGATION',
    shortDesc: 'Forecast rainfall guidance for water scheduling',
    route: '/farmer/irrigation',
    icon: <Droplets size={17} color="#0891b2" />,
    angleDeg: 216,
    categoryColor: '#0891b2',
  },
  {
    id: 'seasonal',
    number: '08',
    title: 'SEASONAL INSIGHTS',
    shortDesc: 'Monsoon pattern analysis & long-range cycles',
    route: '/farmer/seasonal',
    icon: <Calendar size={17} color="#7c3aed" />,
    angleDeg: 252,
    categoryColor: '#7c3aed',
  },
  {
    id: 'history',
    number: '09',
    title: 'FARM HISTORY',
    shortDesc: '7-day and 30-day historical precipitation records',
    route: '/farmer/history',
    icon: <History size={17} color="#475569" />,
    angleDeg: 288,
    categoryColor: '#475569',
  },
  {
    id: 'fields',
    number: '10',
    title: 'MY FIELDS',
    shortDesc: 'Multi-plot boundaries, soil types & acreage',
    route: '/farmer/fields',
    icon: <Grid size={17} color="#16a34a" />,
    angleDeg: 324,
    categoryColor: '#16a34a',
  },
];

export const FarmerPage: React.FC = () => {
  const navigate = useNavigate();
  const { farmerLocation, activeCrop, isProfileComplete, isLocationUpdating } = useFarmerContext();
  const { t, language } = useI18n();
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  // If farmer profile is incomplete, render one-time onboarding setup
  if (!isProfileComplete) {
    return <FarmerOnboardingPage />;
  }

  const hoveredNode = WHEEL_NODES.find((n) => n.id === hoveredNodeId);

  // SVG Normalized Dimension System (viewBox: 600 x 600)
  const viewBoxSize = 600;
  const centerCoord = viewBoxSize / 2; // 300
  const orbitRadius = 210; // 35% of viewBox, leaves 90px on all sides for nodes

  // Percentage offset factor for CSS absolute node positioning
  // Orbit radius is 35% of container width/height
  const orbitPercent = 35;

  return (
    <div className={styles.farmerPageRoot}>
      <Container size="wide" className={styles.pageContainer}>
        {/* Compact Command Header with Farm Location & Settings Action */}
        <div className={styles.commandHeader}>
          <div className={styles.headerLeft}>
            <div className={styles.statusPill}>
              <span className={styles.pulseDot} />
              <span className={styles.statusText}>
                {language === 'hi' ? 'R.A.I. कृषि कमान प्रणाली' : 'R.A.I. AGRICULTURAL COMMAND SYSTEM'}
              </span>
            </div>
            <h1 className={styles.commandTitle}>{t('farmer.title')}</h1>
            <div className={styles.locationHeaderRow}>
              <MapPin size={12} color="#16a34a" />
              <span className={styles.locationHeadline}>
                <strong>{language === 'hi' ? 'खेत का स्थान:' : 'Farm Location:'}</strong> {farmerLocation.formattedAddress} ({farmerLocation.latitude.toFixed(2)}°N, {farmerLocation.longitude.toFixed(2)}°E)
              </span>
            </div>
          </div>

          <div className={styles.headerRight}>
            <div className={styles.activeCropBadge}>
              <span className={styles.activeCropIcon}>{activeCrop.icon}</span>
              <div>
                <span className={styles.activeCropLabel}>
                  {language === 'hi' ? 'सक्रिय फसल' : 'ACTIVE CROP'}
                </span>
                <span className={styles.activeCropName}>{activeCrop.name} ({activeCrop.currentStage})</span>
              </div>
            </div>

            <button
              type="button"
              className={styles.updateProfileBtn}
              onClick={() => navigate('/farmer/profile/edit')}
              title="Update Farm Profile, Location & Settings"
            >
              <Settings size={12} />
              <span>{language === 'hi' ? 'खेत विवरण बदलें' : 'Update Farm Info'}</span>
            </button>
          </div>
        </div>

        {/* Location Transition Loader */}
        {isLocationUpdating && (
          <div className={styles.locationUpdatingBar}>
            <span className={styles.updatingDot} />
            <span>Updating farm location & refreshing agricultural intelligence...</span>
          </div>
        )}

        {/* Central Circular Command Wheel Stage (Auto-fit within viewport) */}
        <div className={styles.wheelStage}>
          {/* Background Ambient Aura */}
          <div className={styles.ambientAura} />

          <div className={styles.wheelContainer}>
            {/* SVG Connector Lines & Orbital Rings */}
            <svg
              className={styles.wheelSvgLayer}
              viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
              preserveAspectRatio="xMidYMid meet"
            >
              <defs>
                <radialGradient id="hubGradient" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#ecfeff" stopOpacity="1" />
                  <stop offset="70%" stopColor="#dcfce7" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity="0.95" />
                </radialGradient>
              </defs>

              {/* Background Outer Circle Rings */}
              <circle
                cx={centerCoord}
                cy={centerCoord}
                r={orbitRadius}
                className={styles.orbitCircle}
              />
              <circle
                cx={centerCoord}
                cy={centerCoord}
                r={orbitRadius + 28}
                className={styles.orbitOuterCircle}
              />
              <circle
                cx={centerCoord}
                cy={centerCoord}
                r={orbitRadius - 60}
                className={styles.orbitInnerCircle}
              />

              {/* Radial Spokes from Hub to Outer Nodes */}
              {WHEEL_NODES.map((node) => {
                const rad = ((node.angleDeg - 90) * Math.PI) / 180;
                const x2 = centerCoord + orbitRadius * Math.cos(rad);
                const y2 = centerCoord + orbitRadius * Math.sin(rad);
                const isHovered = hoveredNodeId === node.id;

                return (
                  <line
                    key={`spoke-${node.id}`}
                    x1={centerCoord}
                    y1={centerCoord}
                    x2={x2}
                    y2={y2}
                    className={`${styles.radialSpoke} ${isHovered ? styles.spokeHovered : ''}`}
                  />
                );
              })}
            </svg>

            {/* Central Farmer AI Core Hub */}
            <button
              type="button"
              className={`${styles.centerHub} ${hoveredNodeId === 'ai' ? styles.hubActive : ''}`}
              onClick={() => navigate('/farmer/ai')}
              onMouseEnter={() => setHoveredNodeId('ai')}
              onMouseLeave={() => setHoveredNodeId(null)}
              title="Click to open Farmer AI assistant"
            >
              <div className={styles.centerPulseRing} />
              <div className={styles.centerPulseRingSecondary} />
              <div className={styles.centerHubInner}>
                <span className={styles.centerWheatIcon}>🌾</span>
                <span className={styles.centerTitle}>{language === 'hi' ? 'किसान AI' : 'FARMER AI'}</span>
                <span className={styles.centerSub}>{language === 'hi' ? 'केंद्रीय कृषि इंटेलिजेंस' : 'Central Intelligence'}</span>
                <div className={styles.centerActionBadge}>
                  <Sparkles size={10} color="#16a34a" />
                  <span>{language === 'hi' ? 'परामर्श लें' : 'Ask AI'}</span>
                </div>
              </div>
            </button>

            {/* 10 Outer Radial Segment Buttons */}
            {WHEEL_NODES.map((node) => {
              const rad = ((node.angleDeg - 90) * Math.PI) / 180;
              const leftPercent = 50 + orbitPercent * Math.cos(rad);
              const topPercent = 50 + orbitPercent * Math.sin(rad);
              const isHovered = hoveredNodeId === node.id;

              return (
                <button
                  key={node.id}
                  type="button"
                  className={`${styles.segmentNode} ${isHovered ? styles.segmentHovered : ''}`}
                  style={{
                    left: `${leftPercent}%`,
                    top: `${topPercent}%`,
                  }}
                  onClick={() => navigate(node.route)}
                  onMouseEnter={() => setHoveredNodeId(node.id)}
                  onMouseLeave={() => setHoveredNodeId(null)}
                  title={`Open ${node.title}`}
                >
                  <div className={styles.segmentNumberBadge}>{node.number}</div>
                  <div className={styles.segmentIconBox}>{node.icon}</div>
                  <span className={styles.segmentTitle}>{node.title}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Integrated Preview Bar */}
        <div className={styles.hoverPreviewBar}>
          {hoveredNode ? (
            <div className={styles.previewContent}>
              <span className={styles.previewTag}>MODULE {hoveredNode.number}</span>
              <strong className={styles.previewTitle}>{hoveredNode.title}</strong>
              <span className={styles.previewDesc}>{hoveredNode.shortDesc}</span>
              <span className={styles.clickHint}>Launch →</span>
            </div>
          ) : hoveredNodeId === 'ai' ? (
            <div className={styles.previewContent}>
              <span className={styles.previewTag}>INTELLIGENCE CORE</span>
              <strong className={styles.previewTitle}>R.A.I. FARMER AI</strong>
              <span className={styles.previewDesc}>
                Location-grounded agricultural conversation powered by {farmerLocation.district} weather.
              </span>
              <span className={styles.clickHint}>Open Chat →</span>
            </div>
          ) : (
            <div className={styles.idleHint}>
              <span>Hover any segment to inspect module • Click <strong>FARMER AI</strong> for conversational intelligence</span>
            </div>
          )}
        </div>
      </Container>
    </div>
  );
};
