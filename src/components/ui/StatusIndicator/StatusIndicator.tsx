import React from 'react';
import { cn } from '../../../utils/classNames';
import styles from './StatusIndicator.module.css';

export type SystemStatus = 'online' | 'syncing' | 'warning' | 'offline';

export interface StatusIndicatorProps {
  readonly status?: SystemStatus;
  readonly label?: string;
  readonly className?: string;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status = 'online',
  label,
  className,
}) => {
  return (
    <div className={cn(styles.indicator, styles[status], className)}>
      <span className={styles.pingWrapper}>
        <span className={styles.pulseRing} />
        <span className={styles.coreDot} />
      </span>
      {label && <span>{label}</span>}
    </div>
  );
};
