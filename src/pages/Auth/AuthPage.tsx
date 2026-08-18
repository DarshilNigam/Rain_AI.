import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Container } from '../../components/ui/Container';
import { AuthModal, AuthMode } from '../../components/ui/AuthModal';
import styles from './AuthPage.module.css';

export const AuthPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Determine default mode based on route
  let initialMode: AuthMode = null;
  if (location.pathname.includes('/login')) {
    initialMode = 'login';
  } else if (location.pathname.includes('/register/farmer')) {
    initialMode = 'register-farmer';
  } else if (location.pathname.includes('/register')) {
    initialMode = 'register-user';
  }

  const handleClose = () => {
    navigate('/pillars');
  };

  return (
    <div className={styles.authPageRoot}>
      <Container size="wide">
        <div className={styles.authPageCenter}>
          <AuthModal isOpen={true} onClose={handleClose} defaultMode={initialMode} />
        </div>
      </Container>
    </div>
  );
};
