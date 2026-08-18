import React, { useState } from 'react';
import { Container } from '../../components/ui/Container';
import { FivePillars } from '../../components/ui/FivePillars';
import { AuthModal } from '../../components/ui/AuthModal';
import styles from './PillarsPage.module.css';

export const PillarsPage: React.FC = () => {
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(false);

  return (
    <div className={styles.pillarsPageRoot}>
      {/* 5-Pillar System Section with Centered Login / Register */}
      <Container size="wide" className={styles.viewportContainer}>
        <div className={styles.viewportHeroLayout}>
          <FivePillars onOpenAuth={() => setIsAuthOpen(true)} />
        </div>
      </Container>

      {/* 3D Auth Choice Modal */}
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </div>
  );
};
