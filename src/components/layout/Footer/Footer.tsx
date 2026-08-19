import React from 'react';
import { Link } from 'react-router-dom';
import { Container } from '../../ui/Container';
import { PRIMARY_NAV_ITEMS } from '../../../routes/routeConfig';
import styles from './Footer.module.css';

export const Footer: React.FC = () => {
  return (
    <footer className={styles.footer}>
      <Container size="wide">
        <div className={styles.grid}>
          {/* Brand & Purpose */}
          <div className={styles.brandCol}>
            <span className={styles.title}>R.A.I. — Rainfall Intelligence</span>
            <p className={styles.description}>
              An explainable AI and spatial risk intelligence platform engineered for high-precision precipitation forecasting, flood vulnerability mitigation, emergency alerting, and agronomic guidance.
            </p>
          </div>

          {/* Pillars Links */}
          <div>
            <h4 className={styles.colTitle}>Core Pillars</h4>
            <div className={styles.linkList}>
              {PRIMARY_NAV_ITEMS.map((item) => (
                <Link key={item.path} to={item.path} className={styles.link}>
                  {item.title}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className={styles.bottomBar}>
          <span>&copy; {new Date().getFullYear()} R.A.I. Rainfall Intelligence Platform. All rights reserved.</span>
          <span className={styles.systemStatusText}>Operational Climate Intelligence Grid</span>
        </div>
      </Container>
    </footer>
  );
};
