import React from 'react';
import { NavLink } from 'react-router-dom';
import { Brain, Map, AlertTriangle, HeartHandshake, Sprout, Layers } from 'lucide-react';
import { PRIMARY_NAV_ITEMS } from '../../../routes/routeConfig';
import { useI18n } from '../../../i18n';
import { cn } from '../../../utils/classNames';
import styles from './Navigation.module.css';

const ICON_MAP = {
  brain: Brain,
  map: Map,
  'alert-triangle': AlertTriangle,
  'heart-handshake': HeartHandshake,
  sprout: Sprout,
  home: Layers,
};

const NAV_TITLE_KEYS: Record<string, string> = {
  '/pillars': 'nav.fivePillars',
  '/intelligence': 'nav.intelligence',
  '/risk-map': 'nav.riskMap',
  '/emergency': 'nav.emergency',
  '/relief': 'nav.relief',
  '/farmer': 'nav.farmer',
};

export interface NavigationProps {
  readonly isMobile?: boolean;
  readonly onItemClick?: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({ isMobile = false, onItemClick }) => {
  const { t } = useI18n();

  return (
    <nav className={isMobile ? styles.mobileNav : styles.nav} aria-label="Main Navigation">
      {PRIMARY_NAV_ITEMS.map((item) => {
        const IconComponent = ICON_MAP[item.iconName] || Brain;
        const translationKey = NAV_TITLE_KEYS[item.path];
        const title = translationKey ? t(translationKey) : item.title;

        return (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={onItemClick}
            className={({ isActive }) => cn(styles.navLink, isActive && styles.active)}
          >
            <span className={styles.icon}>
              <IconComponent size={16} />
            </span>
            <span>{title}</span>
          </NavLink>
        );
      })}
    </nav>
  );
};
