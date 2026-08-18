import React, { HTMLAttributes } from 'react';
import { cn } from '../../../utils/classNames';
import styles from './Badge.module.css';

export type BadgeVariant = 'safe' | 'weather' | 'ai' | 'caution' | 'highRisk' | 'critical' | 'neutral';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  readonly variant?: BadgeVariant;
  readonly showDot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  className,
  variant = 'neutral',
  showDot = true,
  ...props
}) => {
  return (
    <span className={cn(styles.badge, styles[variant], className)} {...props}>
      {showDot && <span className={styles.dot} />}
      {children}
    </span>
  );
};
