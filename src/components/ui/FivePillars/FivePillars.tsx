import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Brain,
  Map,
  AlertTriangle,
  HeartHandshake,
  Sprout,
  ArrowRight,
  Sparkles,
  Layers,
  ShieldAlert,
  Activity,
  Wheat,
  Clock,
  Navigation,
  CheckCircle2,
  LucideIcon,
} from 'lucide-react';
import { Badge } from '../Badge';
import { Button } from '../Button';
import { useI18n } from '../../../i18n';
import { cn } from '../../../utils/classNames';
import styles from './FivePillars.module.css';

export interface PillarSpec {
  readonly id: number;
  readonly number: string;
  readonly title: string;
  readonly shortName: string;
  readonly route: string;
  readonly tagline: string;
  readonly purpose: string;
  readonly explanation: string;
  readonly badgeVariant: 'ai' | 'weather' | 'caution' | 'safe' | 'highRisk';
  readonly icon: LucideIcon;
  readonly theme: {
    readonly primary: string;
    readonly light: string;
    readonly border: string;
    readonly glow: string;
    readonly gradient: [string, string];
  };
  readonly capabilities: readonly {
    readonly label: string;
    readonly icon: LucideIcon;
  }[];
}

export const FIVE_PILLARS_DATA: readonly PillarSpec[] = [
  {
    id: 1,
    number: '01',
    title: 'R.A.I. INTELLIGENCE',
    shortName: 'Intelligence',
    route: '/intelligence',
    tagline: 'Explainable AI & Atmospheric Physics',
    purpose: "Understand what's happening.",
    explanation:
      'Multi-horizon rainfall forecasting engine decoding complex atmospheric drivers into transparent SHAP attributions, probability bounds, and meteorological explanations.',
    badgeVariant: 'ai',
    icon: Brain,
    theme: {
      primary: '#0891b2',
      light: '#ecfeff',
      border: '#a5f3fc',
      glow: 'rgba(6, 182, 212, 0.45)',
      gradient: ['#ecfeff', '#cffafe'],
    },
    capabilities: [
      { label: 'Rainfall prediction & multi-horizon bounds', icon: Activity },
      { label: 'Explainable AI with SHAP feature weights', icon: Sparkles },
      { label: 'Risk probability & confidence intervals', icon: ShieldAlert },
      { label: 'Meteorological drivers & synoptic radar', icon: Layers },
      { label: 'Historical 30-year climatological patterns', icon: Clock },
    ],
  },
  {
    id: 2,
    number: '02',
    title: 'R.A.I. RISK MAP',
    shortName: 'Risk Map',
    route: '/risk-map',
    tagline: 'Geospatial Hydrology & Terrain Modeling',
    purpose: "Understand where it's happening.",
    explanation:
      'High-resolution spatial risk modeling that maps terrain elevation contours, catchment hydrology run-offs, dynamic inundation footprints, and live storm hotspots.',
    badgeVariant: 'weather',
    icon: Map,
    theme: {
      primary: '#0284c7',
      light: '#f0f9ff',
      border: '#bae6fd',
      glow: 'rgba(14, 165, 233, 0.45)',
      gradient: ['#f0f9ff', '#e0f2fe'],
    },
    capabilities: [
      { label: 'Dynamic inundation footprint vectors', icon: Layers },
      { label: 'Catchment basin run-off models', icon: Map },
      { label: 'Real-time precipitation hotspots', icon: Activity },
      { label: 'Topographical elevation flood contours', icon: Navigation },
    ],
  },
  {
    id: 3,
    number: '03',
    title: 'R.A.I. EMERGENCY',
    shortName: 'Emergency',
    route: '/emergency',
    tagline: 'Life Safety & Early Warning Broadcast',
    purpose: 'Know how to respond.',
    explanation:
      'Standardized early warning broadcast protocols aligning with civil defense guidelines to direct evacuations, monitor flood surges, and locate accessible safe havens.',
    badgeVariant: 'caution',
    icon: AlertTriangle,
    theme: {
      primary: '#d97706',
      light: '#fffbeb',
      border: '#fde68a',
      glow: 'rgba(245, 158, 11, 0.45)',
      gradient: ['#fffbeb', '#fef3c7'],
    },
    capabilities: [
      { label: 'Multi-tiered warning broadcasts (Advisory to Evac)', icon: ShieldAlert },
      { label: 'Verified safe-haven shelter capacity', icon: AlertTriangle },
      { label: 'Evacuation corridor safety routing', icon: Navigation },
      { label: 'Civil defense alert synchronization', icon: Activity },
    ],
  },
  {
    id: 4,
    number: '04',
    title: 'R.A.I. RELIEF',
    shortName: 'Relief',
    route: '/relief',
    tagline: 'Civic Coordination & Resource Logistics',
    purpose: 'Connect help with affected communities.',
    explanation:
      'Civic resource matching system verifying emergency supply shortages (clean water, medical kits, sandbags) and synchronizing NGO relief logistics with municipal aid.',
    badgeVariant: 'safe',
    icon: HeartHandshake,
    theme: {
      primary: '#10b981',
      light: '#f0fdf4',
      border: '#bbf7d0',
      glow: 'rgba(16, 185, 129, 0.45)',
      gradient: ['#f0fdf4', '#dcfce7'],
    },
    capabilities: [
      { label: 'Essential resource shortage tracking', icon: HeartHandshake },
      { label: 'Credentialed agency & NGO matching', icon: ShieldAlert },
      { label: 'Transparent community aid quotas', icon: Sparkles },
      { label: 'Verified supply distribution hubs', icon: Map },
    ],
  },
  {
    id: 5,
    number: '05',
    title: 'R.A.I. FARMER',
    shortName: 'Farmer',
    route: '/farmer',
    tagline: 'Agronomic Guidance & Soil Saturation',
    purpose: 'Help agriculture adapt.',
    explanation:
      'Hyper-localized agronomic guidance evaluating soil saturation limits, crop growth vulnerability stages, and precision field drainage schedules to protect yields.',
    badgeVariant: 'safe',
    icon: Sprout,
    theme: {
      primary: '#16a34a',
      light: '#f0fdf4',
      border: '#86efac',
      glow: 'rgba(22, 163, 74, 0.45)',
      gradient: ['#f0fdf4', '#dcfce7'],
    },
    capabilities: [
      { label: 'Crop growth stage vulnerability matrix', icon: Wheat },
      { label: 'Soil saturation & root health forecasts', icon: Sprout },
      { label: 'Precision drainage & fertilizer timing', icon: Activity },
      { label: 'Agronomic risk mitigation guidance', icon: CheckCircle2 },
    ],
  },
];

// Helper to convert polar degrees to Cartesian coordinates
function polarToCartesian(centerX: number, centerY: number, radius: number, angleInDegrees: number) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
}

// Generate SVG Annular Sector path
function describeArcSector(
  x: number,
  y: number,
  innerRadius: number,
  outerRadius: number,
  startAngle: number,
  endAngle: number
) {
  const startOut = polarToCartesian(x, y, outerRadius, endAngle);
  const endOut = polarToCartesian(x, y, outerRadius, startAngle);
  const startIn = polarToCartesian(x, y, innerRadius, endAngle);
  const endIn = polarToCartesian(x, y, innerRadius, startAngle);

  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';

  return [
    'M', startOut.x, startOut.y,
    'A', outerRadius, outerRadius, 0, largeArcFlag, 0, endOut.x, endOut.y,
    'L', endIn.x, endIn.y,
    'A', innerRadius, innerRadius, 0, largeArcFlag, 1, startIn.x, startIn.y,
    'Z',
  ].join(' ');
}

interface FivePillarsProps {
  readonly onOpenAuth?: () => void;
}

export const FivePillars: React.FC<FivePillarsProps> = ({ onOpenAuth }) => {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const activePillar = FIVE_PILLARS_DATA[activeIndex] || FIVE_PILLARS_DATA[0]!;

  const handleAccessPillar = (route: string) => {
    navigate(route);
  };

  // Geometry configuration with generous headroom (480x480 canvas)
  const cx = 240;
  const cy = 240;
  const rIn = 88;
  const rOut = 180;
  const rNode = 134;
  const segmentGap = 4;
  const sliceAngle = 360 / 5;

  return (
    <div className={styles.pillarsContainer} id="five-pillars-experience">
      {/* LEFT: Complete Five-Pillars Visualization & Centered Login/Register Button */}
      <div className={styles.wheelSection}>
        <div className={styles.wheelWrapper}>
          <svg
            viewBox="0 0 480 480"
            className={styles.svgSystem}
            role="region"
            aria-label="Interactive 5-Pillar R.A.I. Planetary System"
          >
            <defs>
              <radialGradient id="systemAuraGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="rgba(6, 182, 212, 0.18)" />
                <stop offset="60%" stopColor="rgba(14, 165, 233, 0.07)" />
                <stop offset="100%" stopColor="transparent" />
              </radialGradient>

              <linearGradient id="planetaryCoreGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="100%" stopColor="#f0f9ff" />
              </linearGradient>

              {FIVE_PILLARS_DATA.map((pillar) => (
                <linearGradient
                  key={`pillar-grad-${pillar.id}`}
                  id={`pillarGrad-${pillar.id}`}
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="100%"
                >
                  <stop offset="0%" stopColor={pillar.theme.gradient[0]} />
                  <stop offset="100%" stopColor={pillar.theme.gradient[1]} />
                </linearGradient>
              ))}
            </defs>

            {/* Ambient Planetary Background Aura */}
            <circle cx={cx} cy={cy} r={220} fill="url(#systemAuraGlow)" />

            {/* Outer Orbital Orbit Dashed Line */}
            <circle
              cx={cx}
              cy={cy}
              r={200}
              fill="none"
              stroke="rgba(203, 213, 225, 0.55)"
              strokeWidth="1"
              strokeDasharray="4 6"
            />

            {/* Five Planetary Sectors */}
            {FIVE_PILLARS_DATA.map((pillar, idx) => {
              const isActive = activeIndex === idx;
              const startAngle = idx * sliceAngle + segmentGap / 2;
              const endAngle = (idx + 1) * sliceAngle - segmentGap / 2;
              const midAngle = (startAngle + endAngle) / 2;

              const rad = ((midAngle - 90) * Math.PI) / 180;
              const displacement = isActive ? 10 : 0;
              const dx = displacement * Math.cos(rad);
              const dy = displacement * Math.sin(rad);

              const pathD = describeArcSector(cx, cy, rIn, rOut, startAngle, endAngle);
              const nodePos = polarToCartesian(cx, cy, rNode, midAngle);
              const IconComponent = pillar.icon;

              return (
                <g
                  key={pillar.id}
                  className={cn(styles.arcSegment, isActive && styles.arcSegmentActive)}
                  style={
                    {
                      transform: `translate(${dx}px, ${dy}px) ${isActive ? 'scale(1.02)' : 'scale(1)'}`,
                      '--segment-glow': pillar.theme.glow,
                    } as React.CSSProperties
                  }
                  onMouseEnter={() => setActiveIndex(idx)}
                  onClick={() => setActiveIndex(idx)}
                  onFocus={() => setActiveIndex(idx)}
                  tabIndex={0}
                  role="button"
                  aria-pressed={isActive}
                  aria-label={`Select Pillar ${pillar.number}: ${pillar.title}`}
                >
                  {/* Sector Arc */}
                  <path
                    d={pathD}
                    fill={`url(#pillarGrad-${pillar.id})`}
                    stroke={isActive ? pillar.theme.primary : pillar.theme.border}
                    strokeWidth={isActive ? 2 : 1.25}
                    className={styles.arcPath}
                  />

                  {/* Pillar Node Icon & Typography */}
                  <g transform={`translate(${nodePos.x}, ${nodePos.y})`}>
                    <text y={-13} fill={pillar.theme.primary} className={styles.nodeNumber}>
                      {pillar.number}
                    </text>

                    <circle
                      cx={0}
                      cy={6}
                      r={16}
                      fill="#ffffff"
                      stroke={isActive ? pillar.theme.primary : pillar.theme.border}
                      strokeWidth={1.25}
                      filter="drop-shadow(0 2px 6px rgba(15, 23, 42, 0.06))"
                    />

                    <foreignObject x={-9} y={-3} width={18} height={18}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
                        <IconComponent size={13} color={pillar.theme.primary} />
                      </div>
                    </foreignObject>

                    <text y={35} fill="var(--rai-color-text-secondary)" className={styles.nodeTitle}>
                      {pillar.shortName}
                    </text>
                  </g>
                </g>
              );
            })}

            {/* Central R.A.I. Planetary Core */}
            <g
              className={styles.centerCoreGroup}
              onClick={() => setActiveIndex((prev) => (prev + 1) % FIVE_PILLARS_DATA.length)}
            >
              <circle
                cx={cx}
                cy={cy}
                r={rIn - 5}
                fill="none"
                stroke={activePillar.theme.primary}
                strokeWidth="1.25"
                strokeOpacity="0.4"
                className={styles.centerPulseRing}
              />

              <circle
                cx={cx}
                cy={cy}
                r={rIn - 10}
                fill="url(#planetaryCoreGrad)"
                stroke="rgba(226, 232, 240, 0.9)"
                strokeWidth="1.5"
                filter="drop-shadow(0 6px 18px rgba(15, 23, 42, 0.06))"
                className={styles.centerBackground}
              />

              <circle
                cx={cx}
                cy={cy}
                r={rIn - 18}
                fill={activePillar.theme.light}
                fillOpacity="0.6"
              />

              <text x={cx} y={cy - 18} className={styles.centerTag}>
                PILLAR {activePillar.number}
              </text>

              <text x={cx} y={cy + 4} className={styles.centerBrand}>
                R.A.I.
              </text>

              <text x={cx} y={cy + 20} className={styles.centerSubtitle}>
                {activePillar.shortName}
              </text>
            </g>
          </svg>
        </div>

        {/* Centered Login / Register Button Below the Wheel */}
        <div className={styles.wheelActionWrapper}>
          <Button
            variant="primary"
            size="md"
            trailingIcon={<ArrowRight size={15} />}
            onClick={onOpenAuth}
            className={styles.wheelAuthBtn}
          >
            {t('common.login')} / {t('common.register')} →
          </Button>
        </div>
      </div>

      {/* RIGHT: Synchronized Information Panel */}
      <div className={styles.detailPane}>
        {/* Subtle Ambient Glow */}
        <div
          className={styles.detailGlow}
          style={{ backgroundColor: activePillar.theme.primary }}
        />

        {/* Pillar Selector Pills */}
        <div className={styles.selectorPills} role="tablist" aria-label="Five Pillars Selector">
          {FIVE_PILLARS_DATA.map((p, idx) => {
            const isSelected = activeIndex === idx;
            return (
              <button
                key={p.id}
                type="button"
                role="tab"
                aria-selected={isSelected}
                className={cn(styles.pillButton, isSelected && styles.pillActive)}
                style={
                  {
                    '--pill-border': p.theme.primary,
                    '--pill-glow': p.theme.glow,
                  } as React.CSSProperties
                }
                onClick={() => setActiveIndex(idx)}
              >
                <span>{p.number}</span>
                <span>{p.shortName}</span>
              </button>
            );
          })}
        </div>

        {/* Panel Header */}
        <div className={styles.detailHeader}>
          <div className={styles.iconAndTitleGroup}>
            <div
              className={styles.pillarIconLarge}
              style={{
                backgroundColor: activePillar.theme.light,
                border: `1.5px solid ${activePillar.theme.border}`,
                color: activePillar.theme.primary,
              }}
            >
              {React.createElement(activePillar.icon, { size: 22 })}
            </div>
            <div className={styles.titleArea}>
              <span className={styles.pillarNumberTag} style={{ color: activePillar.theme.primary }}>
                {activePillar.number} — {activePillar.purpose}
              </span>
              <h3 className={styles.pillarTitleMain}>{activePillar.title}</h3>
            </div>
          </div>
          <Badge variant={activePillar.badgeVariant} showDot>
            Pillar {activePillar.number}
          </Badge>
        </div>

        {/* Pillar Purpose Statement */}
        <p className={styles.pillarDescription}>{activePillar.explanation}</p>

        {/* Key Capabilities */}
        <div className={styles.capabilitiesSection}>
          <span className={styles.capabilitiesHeading}>{t('pillars.keyCapabilities')}</span>
          <div className={styles.capabilitiesGrid}>
            {activePillar.capabilities.map((cap) => {
              const CapIcon = cap.icon;
              return (
                <div key={cap.label} className={styles.capabilityCard}>
                  <span
                    className={styles.capabilityDot}
                    style={{ backgroundColor: activePillar.theme.primary }}
                  />
                  <CapIcon size={14} color={activePillar.theme.primary} />
                  <span>{cap.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Subtle CTA / Status Indicator */}
        <div className={styles.actionFooter}>
          <Button
            variant="primary"
            size="md"
            trailingIcon={<ArrowRight size={15} />}
            style={{ backgroundColor: activePillar.theme.primary }}
            onClick={() => handleAccessPillar(activePillar.route)}
          >
            {t('pillars.accessBtn', { name: activePillar.shortName })}
          </Button>
        </div>
      </div>
    </div>
  );
};
