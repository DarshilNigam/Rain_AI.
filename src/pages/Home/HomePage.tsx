import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Sparkles, Shield, CloudRain, Activity, Zap } from 'lucide-react';
import { Container } from '../../components/ui/Container';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import styles from './HomePage.module.css';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();

  const handleExplorePillars = () => {
    navigate('/pillars');
  };

  const handleTryPrediction = () => {
    navigate('/risk-map');
  };

  return (
    <div className={styles.welcomeRoot}>
      <Container size="wide" className={styles.welcomeContainer}>
        {/* Living Ambient Light Aura */}
        <div className={styles.ambientAura} aria-hidden="true" />

        <div className={styles.welcomeContent}>
          {/* Top Pill Badge */}
          <div className={styles.badgeWrapper}>
            <Badge variant="ai" showDot>
              SIH1521 — Explainable AI Platform
            </Badge>
          </div>

          {/* Primary Editorial Hero Headline */}
          <h1 className={styles.heroHeadline}>
            R.A.I.
            <br />
            <span className={styles.headlineAccent}>Rainfall Intelligence & Explainable AI</span>
          </h1>

          {/* Concise Supporting Statement */}
          <p className={styles.heroSubtitle}>
            Predicting high-impact heavy rainfall events 24 hours in advance with mathematical TreeSHAP explainability, transparent physical reasoning, and actionable civil alerts.
          </p>

          {/* Telemetry Micro-Pills */}
          <div className={styles.telemetryStrip}>
            <div className={styles.telemetryItem}>
              <CloudRain size={13} color="var(--rai-color-weather-600)" />
              <span>Multi-Horizon Precipitation</span>
            </div>
            <div className={styles.telemetryDivider} />
            <div className={styles.telemetryItem}>
              <Sparkles size={13} color="var(--rai-color-ai-600)" />
              <span>TreeSHAP Attribution</span>
            </div>
            <div className={styles.telemetryDivider} />
            <div className={styles.telemetryItem}>
              <Shield size={13} color="var(--rai-color-safe-600)" />
              <span>IMD-Aligned Warnings</span>
            </div>
          </div>

          {/* Dual Call-to-Action Group */}
          <div className={styles.ctaWrapper}>
            <Button
              variant="primary"
              size="lg"
              trailingIcon={<ArrowRight size={18} />}
              onClick={handleExplorePillars}
              className={styles.primaryCtaBtn}
            >
              Explore Rainfall Intelligence
            </Button>
            <Button
              variant="secondary"
              size="lg"
              trailingIcon={<Zap size={18} />}
              onClick={handleTryPrediction}
              className={styles.secondaryCtaBtn}
            >
              Try Prediction
            </Button>
          </div>

          {/* Lightweight Climate-Tech Telemetry Preview Card */}
          <div className={styles.previewCard} onClick={handleTryPrediction} role="button" tabIndex={0}>
            <div className={styles.previewCardHeader}>
              <div className={styles.previewCardTitle}>
                <Activity size={16} className={styles.pulseIcon} />
                <span>Live AI Telemetry Preview &bull; 24-Hour Horizon</span>
              </div>
              <span className={styles.previewStatusBadge}>MODEL READY &bull; &tau; = 0.015</span>
            </div>
            
            <div className={styles.previewMetricsGrid}>
              <div className={styles.previewMetric}>
                <span className={styles.metricLabel}>Heavy Rain Risk</span>
                <span className={styles.metricValueHigh}>HIGH RISK</span>
              </div>
              <div className={styles.previewMetric}>
                <span className={styles.metricLabel}>Calibrated Probability</span>
                <span className={styles.metricValue}>3.8% (Elevated)</span>
              </div>
              <div className={styles.previewMetric}>
                <span className={styles.metricLabel}>Primary Driver</span>
                <span className={styles.metricValue}>Dew Point (+0.41)</span>
              </div>
              <div className={styles.previewMetric}>
                <span className={styles.metricLabel}>Operational Status</span>
                <span className={styles.metricValueSafe}>WATCH ACTIVE</span>
              </div>
            </div>

            <div className={styles.previewCardFooter}>
              <span>Interactive 4-Layer Inspector &bull; Click to open live Doppler Radar &rarr;</span>
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
};
