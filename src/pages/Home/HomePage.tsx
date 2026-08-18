import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Sparkles, Shield, CloudRain } from 'lucide-react';
import { Container } from '../../components/ui/Container';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import styles from './HomePage.module.css';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();

  const handleExplorePillars = () => {
    navigate('/pillars');
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
              Atmospheric Risk Intelligence
            </Badge>
          </div>

          {/* Primary Editorial Hero Headline */}
          <h1 className={styles.heroHeadline}>
            SEE THE RAIN
            <br />
            <span className={styles.headlineAccent}>BEFORE IT BECOMES RISK.</span>
          </h1>

          {/* Concise Supporting Statement */}
          <p className={styles.heroSubtitle}>
            R.A.I. transforms rainfall intelligence into understandable risk, actionable warnings, resilient communities, and smarter decisions.
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
              <span>Explainable AI Engine</span>
            </div>
            <div className={styles.telemetryDivider} />
            <div className={styles.telemetryItem}>
              <Shield size={13} color="var(--rai-color-safe-600)" />
              <span>Civil Defense Protocols</span>
            </div>
          </div>

          {/* ONE Primary Call-to-Action */}
          <div className={styles.ctaWrapper}>
            <Button
              variant="primary"
              size="lg"
              trailingIcon={<ArrowRight size={18} />}
              onClick={handleExplorePillars}
              className={styles.primaryCtaBtn}
            >
              EXPLORE THE FIVE PILLARS →
            </Button>
          </div>
        </div>
      </Container>
    </div>
  );
};
