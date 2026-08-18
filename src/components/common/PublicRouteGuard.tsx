import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Container } from '../ui/Container';

interface PublicRouteGuardProps {
  readonly children: React.ReactNode;
}

/**
 * PublicRouteGuard locks public entry routes (/, /auth, /login, /register) from authenticated users.
 * When an authenticated user accesses a public-only route or clicks Home, they are redirected
 * directly to their active command surface (/farmer for growers, /dashboard for citizens).
 */
export const PublicRouteGuard: React.FC<PublicRouteGuardProps> = ({ children }) => {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Container size="wide">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
          <span style={{ fontFamily: 'var(--rai-font-mono)', fontSize: '0.875rem', color: 'var(--rai-color-text-cyan)' }}>
            Verifying telemetry session...
          </span>
        </div>
      </Container>
    );
  }

  // If user is authenticated and verified, redirect to dashboard or farmer command surface
  if (isAuthenticated && user && user.verificationStatus === 'VERIFIED') {
    const destination = user.role === 'farmer' ? '/farmer' : '/dashboard';
    return <Navigate to={destination} replace />;
  }

  return <>{children}</>;
};
