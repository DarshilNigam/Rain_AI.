import React, { HTMLAttributes } from 'react';
import { cn } from '../../../utils/classNames';
import styles from './Container.module.css';

export interface ContainerProps extends HTMLAttributes<HTMLDivElement> {
  readonly size?: 'content' | 'wide' | 'full';
}

export const Container: React.FC<ContainerProps> = ({
  children,
  className,
  size = 'content',
  ...props
}) => {
  return (
    <div className={cn(styles.container, styles[size], className)} {...props}>
      {children}
    </div>
  );
};
