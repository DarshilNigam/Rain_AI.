import React, { HTMLAttributes } from 'react';
import { cn } from '../../../utils/classNames';
import styles from './Card.module.css';

export type CardVariant = 'default' | 'ice' | 'elevated' | 'aiAccent' | 'alertCritical';
export type CardPadding = 'none' | 'sm' | 'md' | 'lg';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  readonly variant?: CardVariant;
  readonly padding?: CardPadding;
  readonly isInteractive?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  variant = 'default',
  padding = 'md',
  isInteractive = false,
  ...props
}) => {
  const paddingClass = {
    none: styles.padNone,
    sm: styles.padSm,
    md: styles.padMd,
    lg: styles.padLg,
  }[padding];

  return (
    <div
      className={cn(
        styles.card,
        styles[variant],
        paddingClass,
        isInteractive && styles.interactive,
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
