import React from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types/auth';
import { Container } from '../ui/Container';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { ShieldAlert, ArrowRight, Home } from 'lucide-react';

interface ProtectedRouteProps {
  readonly children: React.ReactNode;
  readonly requiredRole?: UserRole;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRole }) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <Container size="wide">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
          <span style={{ fontFamily: 'var(--rai-font-mono)', fontSize: '0.875rem', color: 'var(--rai-color-text-cyan)' }}>
            Synchronizing telemetry session...
          </span>
        </div>
      </Container>
    );
  }

  if (!isAuthenticated || !user || user.verificationStatus !== 'VERIFIED') {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (requiredRole && user.role !== requiredRole) {
    return (
      <Container size="content">
        <div style={{ padding: '3rem 0', maxWidth: '540px', margin: '0 auto' }}>
          <Card variant="default" padding="lg">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center', textAlign: 'center' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d97706' }}>
                <ShieldAlert size={24} />
              </div>
              <Badge variant="caution" showDot>
                Role Restricted
              </Badge>
              <h2 style={{ fontFamily: 'var(--rai-font-display)', fontSize: '1.35rem', fontWeight: 800, margin: 0 }}>
                {requiredRole === 'farmer' ? 'Farmer Clearance Required' : 'User Access Only'}
              </h2>
              <p style={{ fontFamily: 'var(--rai-font-body)', fontSize: '0.84375rem', color: 'var(--rai-color-text-secondary)', margin: 0, lineHeight: 1.45 }}>
                Your current account is authenticated as <strong>{user.role.toUpperCase()}</strong> ({user.email}). This stream is specifically tailored for {requiredRole === 'farmer' ? 'agricultural farmers and rural growers' : 'general citizens'}.
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                <Link to="/dashboard" style={{ textDecoration: 'none' }}>
                  <Button variant="primary" size="sm" trailingIcon={<ArrowRight size={14} />}>
                    Go to Your Dashboard
                  </Button>
                </Link>
                <Link to="/" style={{ textDecoration: 'none' }}>
                  <Button variant="secondary" size="sm" leadingIcon={<Home size={14} />}>
                    Home
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        </div>
      </Container>
    );
  }

  return <>{children}</>;
};
