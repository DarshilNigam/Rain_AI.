import React, { useEffect, useState } from 'react';
import styles from './CinematicIntro.module.css';

interface CinematicIntroProps {
  readonly onComplete?: () => void;
}

export const CinematicIntro: React.FC<CinematicIntroProps> = ({ onComplete }) => {
  const [phase, setPhase] = useState<'initial' | 'glow' | 'brand' | 'sub' | 'peak' | 'exit' | 'done'>('initial');

  useEffect(() => {
    // Respect prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      setPhase('done');
      onComplete?.();
      return;
    }

    // Cinematic Reveal Sequence (approx 1.8 seconds total)
    const t1 = setTimeout(() => setPhase('glow'), 150);
    const t2 = setTimeout(() => setPhase('brand'), 350);
    const t3 = setTimeout(() => setPhase('sub'), 750);
    const t4 = setTimeout(() => setPhase('peak'), 1300);
    const t5 = setTimeout(() => setPhase('exit'), 1650);
    const t6 = setTimeout(() => {
      setPhase('done');
      onComplete?.();
    }, 2100);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
      clearTimeout(t6);
    };
  }, [onComplete]);

  if (phase === 'done') {
    return null;
  }

  return (
    <div
      className={`${styles.introContainer} ${phase === 'exit' ? styles.introExit : ''}`}
      aria-hidden={phase === 'exit'}
      role="region"
      aria-label="R.A.I. Product Intro"
    >
      {/* Subtle Atmospheric Light & Mist Haze */}
      <div className={`${styles.ambientAura} ${phase !== 'initial' ? styles.auraActive : ''}`} />
      <div className={styles.particleCanvas} />

      {/* Brand Reveal Core */}
      <div className={styles.centerContent}>
        {/* R.A.I. Title */}
        <h1
          className={`${styles.brandTitle} ${
            phase === 'brand' || phase === 'sub' || phase === 'peak' || phase === 'exit'
              ? styles.brandVisible
              : ''
          }`}
        >
          R.A.I.
        </h1>

        {/* Rainfall Intelligence Subtitle */}
        <span
          className={`${styles.subTitle} ${
            phase === 'sub' || phase === 'peak' || phase === 'exit' ? styles.subVisible : ''
          }`}
        >
          RAINFALL INTELLIGENCE
        </span>

        {/* Refined Atmospheric Flare Line */}
        <div
          className={`${styles.flareLine} ${
            phase === 'peak' || phase === 'exit' ? styles.flareActive : ''
          }`}
        />
      </div>

      {/* Skip Button for Accessibility */}
      <button
        type="button"
        className={styles.skipButton}
        onClick={() => {
          setPhase('done');
          onComplete?.();
        }}
      >
        Skip Intro
      </button>
    </div>
  );
};
