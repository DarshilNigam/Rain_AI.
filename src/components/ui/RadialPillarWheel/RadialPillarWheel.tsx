import React, { useState } from 'react';
import { Link } from 'react-router-dom';
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
  LucideIcon,
} from 'lucide-react';
import { Button } from '../Button';
import { Badge } from '../Badge';
import { cn } from '../../../utils/classNames';
import styles from './RadialPillarWheel.module.css';

export interface PillarData {
  readonly id: number;
  readonly pillarIndex: number;
  readonly title: string;
  readonly shortLabel: string;
  readonly route: string;
  readonly tag: string;
  readonly badgeVariant: 'ai' | 'weather' | 'caution' | 'safe' | 'highRisk';
  readonly icon: LucideIcon;
  readonly theme: {
    readonly primary: string;
    readonly light: string;
    readonly border: string;
    readonly glow: string;
    readonly gradient: [string, string];
  };
  readonly description: string;
  readonly capabilities: readonly {
    readonly label: string;
    readonly icon: LucideIcon;
  }[];
}

export const PILLARS_CATALOG: readonly PillarData[] = [
  {
    id: 1,
    pillarIndex: 1,
    title: 'R.A.I. Intelligence',
    shortLabel: 'Intelligence',
    route: '/intelligence',
    tag: 'Explainable AI',
    badgeVariant: 'ai',
    icon: Brain,
    theme: {
      primary: '#0891b2',
      light: '#ecfeff',
      border: '#a5f3fc',
      glow: 'rgba(6, 182, 212, 0.45)',
      gradient: ['#ecfeff', '#cffafe'],
    },
    description:
      'Multi-horizon rainfall forecasting engine decoding complex atmospheric drivers into transparent SHAP attributions, probability bounds, and meteorological explanations.',
    capabilities: [
      { label: 'SHAP Feature Contribution Weights', icon: Sparkles },
      { label: 'Multi-Horizon Forecast Uncertainty Bounds', icon: Activity },
      { label: 'Natural-Language Synoptic Summaries', icon: Brain },
    ],
  },
  {
    id: 2,
    pillarIndex: 2,
    title: 'R.A.I. Risk Map',
    shortLabel: 'Risk Map',
    route: '/risk-map',
    tag: 'Geospatial Physics',
    badgeVariant: 'weather',
    icon: Map,
    theme: {
      primary: '#0284c7',
      light: '#f0f9ff',
      border: '#bae6fd',
      glow: 'rgba(14, 165, 233, 0.45)',
      gradient: ['#f0f9ff', '#e0f2fe'],
    },
    description:
      'High-resolution spatial risk modeling that maps terrain elevation contours, catchment hydrology run-offs, dynamic inundation footprints, and live storm hotspots.',
    capabilities: [
      { label: 'Dynamic Inundation Footprint Vectors', icon: Layers },
      { label: 'Catchment Basin Run-Off Models', icon: Map },
      { label: 'Real-Time Precipitation Hotspots', icon: Activity },
    ],
  },
  {
    id: 3,
    pillarIndex: 3,
    title: 'R.A.I. Emergency',
    shortLabel: 'Emergency',
    route: '/emergency',
    tag: 'Life Safety',
    badgeVariant: 'caution',
    icon: AlertTriangle,
    theme: {
      primary: '#d97706',
      light: '#fffbeb',
      border: '#fde68a',
      glow: 'rgba(245, 158, 11, 0.45)',
      gradient: ['#fffbeb', '#fef3c7'],
    },
    description:
      'Standardized early warning broadcast protocols aligning with civil defense guidelines to direct evacuations, monitor flood surges, and locate accessible safe havens.',
    capabilities: [
      { label: 'Multi-Tiered Warning Broadcasts', icon: ShieldAlert },
      { label: 'Verified Safe-Haven Shelter Capacity', icon: AlertTriangle },
      { label: 'Evacuation Corridor Safety Routing', icon: Layers },
    ],
  },
  {
    id: 4,
    pillarIndex: 4,
    title: 'R.A.I. Relief',
    shortLabel: 'Relief',
    route: '/relief',
    tag: 'Civic Coordination',
    badgeVariant: 'safe',
    icon: HeartHandshake,
    theme: {
      primary: '#10b981',
      light: '#f0fdf4',
      border: '#bbf7d0',
      glow: 'rgba(16, 185, 129, 0.45)',
      gradient: ['#f0fdf4', '#dcfce7'],
    },
    description:
      'Civic resource matching system verifying emergency supply shortages (clean water, medical kits, sandbags) and synchronizing NGO relief logistics with municipal aid.',
    capabilities: [
      { label: 'Essential Resource Shortage Tracking', icon: HeartHandshake },
      { label: 'Credentialed Agency Matching', icon: ShieldAlert },
      { label: 'Transparent Community Aid Quotas', icon: Sparkles },
    ],
  },
  {
    id: 5,
    pillarIndex: 5,
    title: 'R.A.I. Farmer',
    shortLabel: 'Farmer',
    route: '/farmer',
    tag: 'Agronomic Guidance',
    badgeVariant: 'safe',
    icon: Sprout,
    theme: {
      primary: '#16a34a',
      light: '#f0fdf4',
      border: '#86efac',
      glow: 'rgba(22, 163, 74, 0.45)',
      gradient: ['#f0fdf4', '#dcfce7'],
    },
    description:
      'Hyper-localized agronomic guidance evaluating soil saturation limits, crop growth vulnerability stages, and precision field drainage schedules to protect yields.',
    capabilities: [
      { label: 'Crop Growth Stage Vulnerability Matrix', icon: Wheat },
      { label: 'Soil Saturation & Root Health Forecasts', icon: Sprout },
      { label: 'Precision Drainage & Fertilizer Timing', icon: Activity },
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

export interface RadialPillarWheelProps {
  readonly initialActiveIndex?: number;
  readonly onSelectPillar?: (pillar: PillarData) => void;
}

export const RadialPillarWheel: React.FC<RadialPillarWheelProps> = ({
  initialActiveIndex = 0,
  onSelectPillar,
}) => {
  const [activePillarIndex, setActivePillarIndex] = useState<number>(initialActiveIndex);
  const activePillar = PILLARS_CATALOG[activePillarIndex] || PILLARS_CATALOG[0]!;

  const handleSelect = (idx: number) => {
    setActivePillarIndex(idx);
    const selected = PILLARS_CATALOG[idx];
    if (selected && onSelectPillar) {
      onSelectPillar(selected);
    }
  };

  // Compact geometric center & radii (460x460 canvas, ~25% scaled down)
  const cx = 230;
  const cy = 230;
  const rIn = 82;
  const rOut = 168;
  const rNode = 126;
  const segmentGap = 4; // degrees gap between slices
  const sliceAngle = 360 / 5; // 72 degrees each

  return (
    <div className={styles.wheelContainer} id="pillars-wheel">
      {/* Visual Radial Wheel (SVG Geometry + Interactive Nodes) */}
      <div className={styles.wheelVisualWrapper}>
        <svg
          viewBox="0 0 460 460"
          className={styles.svgWheel}
          role="region"
          aria-label="Interactive R.A.I. 5 Pillars Wheel"
        >
          <defs>
            {/* Ambient Radial Background Glow */}
            <radialGradient id="wheelAmbientGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(6, 182, 212, 0.14)" />
              <stop offset="60%" stopColor="rgba(14, 165, 233, 0.05)" />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>

            {/* Core Gradient */}
            <linearGradient id="centerCoreGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#f0f9ff" />
            </linearGradient>

            {/* Individual Segment Gradients */}
            {PILLARS_CATALOG.map((pillar) => (
              <linearGradient
                key={`grad-${pillar.id}`}
                id={`segGrad-${pillar.id}`}
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

          {/* Background Ambient Aura */}
          <circle cx={cx} cy={cy} r={205} fill="url(#wheelAmbientGlow)" />

          {/* Outer Orbital Orbit Ring */}
          <circle
            cx={cx}
            cy={cy}
            r={186}
            fill="none"
            stroke="rgba(203, 213, 225, 0.45)"
            strokeWidth="1"
            strokeDasharray="4 6"
          />

          {/* The 5 Radial Segments */}
          {PILLARS_CATALOG.map((pillar, idx) => {
            const isActive = activePillarIndex === idx;
            const startAngle = idx * sliceAngle + segmentGap / 2;
            const endAngle = (idx + 1) * sliceAngle - segmentGap / 2;
            const midAngle = (startAngle + endAngle) / 2;

            // Compute outward translation vector when active
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
                style={{
                  transform: `translate(${dx}px, ${dy}px) ${isActive ? 'scale(1.02)' : 'scale(1)'}`,
                  '--segment-glow': pillar.theme.glow,
                } as React.CSSProperties}
                onMouseEnter={() => handleSelect(idx)}
                onClick={() => handleSelect(idx)}
                onFocus={() => handleSelect(idx)}
                tabIndex={0}
                role="button"
                aria-pressed={isActive}
                aria-label={`Select Pillar ${pillar.pillarIndex}: ${pillar.title}`}
              >
                {/* Sector Slice */}
                <path
                  d={pathD}
                  fill={`url(#segGrad-${pillar.id})`}
                  stroke={isActive ? pillar.theme.primary : pillar.theme.border}
                  strokeWidth={isActive ? 2 : 1.25}
                  className={styles.arcPath}
                />

                {/* Node Label & Icon inside the Slice */}
                <g transform={`translate(${nodePos.x}, ${nodePos.y})`}>
                  {/* Number Badge */}
                  <text
                    y={-12}
                    fill={pillar.theme.primary}
                    className={styles.nodeNumber}
                  >
                    0{pillar.pillarIndex}
                  </text>

                  {/* Icon Circle */}
                  <circle
                    cx={0}
                    cy={5}
                    r={15}
                    fill="#ffffff"
                    stroke={isActive ? pillar.theme.primary : pillar.theme.border}
                    strokeWidth={1.25}
                    filter="drop-shadow(0 2px 5px rgba(15, 23, 42, 0.05))"
                  />

                  {/* SVG Icon via foreignObject */}
                  <foreignObject x={-8} y={-3} width={16} height={16}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
                      <IconComponent size={12} color={pillar.theme.primary} />
                    </div>
                  </foreignObject>

                  {/* Short Pillar Label */}
                  <text
                    y={32}
                    fill="var(--rai-color-text-secondary)"
                    className={styles.nodeTitle}
                  >
                    {pillar.shortLabel}
                  </text>
                </g>
              </g>
            );
          })}

          {/* Central R.A.I. Hub */}
          <g
            className={styles.centerCoreGroup}
            onClick={() => handleSelect((activePillarIndex + 1) % PILLARS_CATALOG.length)}
          >
            {/* Concentric Pulse Ring */}
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

            {/* Solid Center Disc with Glass Background */}
            <circle
              cx={cx}
              cy={cy}
              r={rIn - 10}
              fill="url(#centerCoreGrad)"
              stroke="rgba(226, 232, 240, 0.9)"
              strokeWidth="1.5"
              filter="drop-shadow(0 6px 18px rgba(15, 23, 42, 0.06))"
              className={styles.centerBackground}
            />

            {/* Inner Atmospheric Tint */}
            <circle
              cx={cx}
              cy={cy}
              r={rIn - 18}
              fill={activePillar.theme.light}
              fillOpacity="0.6"
            />

            {/* Center Dynamic Brand Typography */}
            <text x={cx} y={cy - 18} className={styles.centerTag}>
              PILLAR 0{activePillar.pillarIndex}
            </text>

            <text x={cx} y={cy + 4} className={styles.centerBrand}>
              R.A.I.
            </text>

            <text x={cx} y={cy + 19} className={styles.centerSubtitle}>
              {activePillar.shortLabel}
            </text>
          </g>
        </svg>
      </div>

      {/* Right Column: Compact Active Pillar Experience Card */}
      <div className={styles.detailPane}>
        {/* Ambient Glow Accent */}
        <div
          className={styles.detailGlow}
          style={{ backgroundColor: activePillar.theme.primary }}
        />

        {/* Quick Selector Pills */}
        <div className={styles.selectorPills} role="tablist" aria-label="Pillars Selection">
          {PILLARS_CATALOG.map((p, idx) => {
            const isSelected = activePillarIndex === idx;
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
                onClick={() => handleSelect(idx)}
              >
                <span>0{p.pillarIndex}</span>
                <span>{p.shortLabel}</span>
              </button>
            );
          })}
        </div>

        {/* Pillar Header */}
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
              {React.createElement(activePillar.icon, { size: 20 })}
            </div>
            <div className={styles.titleArea}>
              <span
                className={styles.pillarTagline}
                style={{ color: activePillar.theme.primary }}
              >
                {activePillar.tag}
              </span>
              <h3 className={styles.pillarTitleMain}>{activePillar.title}</h3>
            </div>
          </div>
          <Badge variant={activePillar.badgeVariant} showDot>
            Pillar {activePillar.pillarIndex}
          </Badge>
        </div>

        {/* Pillar Statement */}
        <p className={styles.pillarDescription}>{activePillar.description}</p>

        {/* Core Capabilities */}
        <div className={styles.capabilitiesSection}>
          <span className={styles.capabilitiesHeading}>Key Capabilities</span>
          <div className={styles.capabilitiesGrid}>
            {activePillar.capabilities.map((cap) => {
              const CapIcon = cap.icon;
              return (
                <div key={cap.label} className={styles.capabilityCard}>
                  <span
                    className={styles.capabilityDot}
                    style={{ backgroundColor: activePillar.theme.primary }}
                  />
                  <CapIcon size={13} color={activePillar.theme.primary} />
                  <span>{cap.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Button */}
        <div className={styles.actionFooter}>
          <Link to={activePillar.route} style={{ textDecoration: 'none' }}>
            <Button
              variant="primary"
              size="sm"
              trailingIcon={<ArrowRight size={14} />}
              style={{
                backgroundColor: activePillar.theme.primary,
              }}
            >
              Explore {activePillar.shortLabel} Pillar
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};
