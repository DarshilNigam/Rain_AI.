import React from 'react';
import { cn } from '../../../utils/classNames';
import styles from './MetricDisplay.module.css';

export interface MetricDisplayProps {
  readonly label: string;
  readonly value: string | number;
  readonly unit?: string;
  readonly size?: 'sm' | 'md' | 'lg';
  readonly trendDelta?: string;
  readonly status?: 'safe' | 'caution' | 'critical' | 'neutral';
  readonly className?: string;
}

export const MetricDisplay: React.FC<MetricDisplayProps> = ({
  label,
  value,
  unit,
  size = 'md',
  trendDelta,
  status = 'neutral',
  className,
}) => {
  const statusClass = {
    safe: styles.trendSafe,
    caution: styles.trendCaution,
    critical: styles.trendCritical,
    neutral: '',
  }[status];

  return (
    <div className={cn(styles.metricContainer, className)}>
      <span className={styles.label}>{label}</span>
      <div className={styles.valueRow}>
        <span className={cn(styles.value, styles[size])}>{value}</span>
        {unit && <span className={styles.unit}>{unit}</span>}
      </div>
      {trendDelta && (
        <div className={cn(styles.trendRow, statusClass)}>
          <span>{trendDelta}</span>
        </div>
      )}
    </div>
  );
};
