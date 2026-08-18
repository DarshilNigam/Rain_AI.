import React from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '../Button';
import { Badge } from '../Badge';
import styles from './AuthGateway.module.css';

interface AuthGatewayProps {
  readonly onOpenAuth: () => void;
}

export const AuthGateway: React.FC<AuthGatewayProps> = ({ onOpenAuth }) => {
  return (
    <section className={styles.gatewaySection} aria-label="Platform Access Gateway">
      {/* Ambient background aura */}
      <div className={styles.ambientGlow} />

      <div className={styles.content}>
        <div className={styles.badgeWrapper}>
          <Badge variant="ai" showDot>
            Gateway Access
          </Badge>
        </div>

        <h2 className={styles.headline}>READY TO ENTER R.A.I.?</h2>

        <p className={styles.subtitle}>
          Rainfall intelligence becomes useful when it reaches the people who need it.
        </p>

        <div className={styles.actionWrapper}>
          <Button
            variant="primary"
            size="lg"
            trailingIcon={<ArrowRight size={18} />}
            leadingIcon={<Sparkles size={16} />}
            onClick={onOpenAuth}
            className={styles.gatewayBtn}
          >
            LOGIN / REGISTER →
          </Button>
        </div>
      </div>
    </section>
  );
};
