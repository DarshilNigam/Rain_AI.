import { NavItem } from '../types/ui';

export const PRIMARY_NAV_ITEMS: readonly NavItem[] = [
  {
    title: 'Five Pillars',
    path: '/pillars',
    description: 'The 5 Core R.A.I. Intelligence Pillars',
    iconName: 'brain',
    pillarIndex: 1,
  },
  {
    title: 'Intelligence',
    path: '/intelligence',
    description: 'XAI Precipitation Forecasts & Drivers',
    iconName: 'brain',
    pillarIndex: 1,
  },
  {
    title: 'Risk Map',
    path: '/risk-map',
    description: 'Geospatial Inundation & Hotspot Layers',
    iconName: 'map',
    pillarIndex: 2,
  },
  {
    title: 'Emergency',
    path: '/emergency',
    description: 'Real-time Alerts & Evacuation Protocols',
    iconName: 'alert-triangle',
    pillarIndex: 3,
  },
  {
    title: 'Relief',
    path: '/relief',
    description: 'Resource Mobilization & Coordination',
    iconName: 'heart-handshake',
    pillarIndex: 4,
  },
  {
    title: 'Farmer',
    path: '/farmer',
    description: 'Agronomic Guidance & Crop Vulnerability',
    iconName: 'sprout',
    pillarIndex: 5,
  },
] as const;
