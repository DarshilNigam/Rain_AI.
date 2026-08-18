import { ReactNode } from 'react';

/**
 * UI & Presentation Types
 */

export type ComponentSize = 'sm' | 'md' | 'lg';
export type ComponentVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'safe' | 'caution';

export interface BaseProps {
  className?: string;
  children?: ReactNode;
  id?: string;
  'data-testid'?: string;
}

export interface NavItem {
  readonly title: string;
  readonly path: string;
  readonly description: string;
  readonly iconName: 'brain' | 'map' | 'alert-triangle' | 'heart-handshake' | 'sprout' | 'home';
  readonly pillarIndex?: number;
  readonly badge?: string;
}

export interface MetricItem {
  readonly label: string;
  readonly value: string | number;
  readonly unit?: string;
  readonly trend?: 'up' | 'down' | 'neutral';
  readonly trendDelta?: string;
  readonly status?: 'safe' | 'weather' | 'caution' | 'critical' | 'neutral';
}
