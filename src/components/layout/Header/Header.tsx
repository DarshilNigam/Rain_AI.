import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  CloudRain,
  Menu,
  X,
  LogIn,
  User,
  Sprout,
  LayoutDashboard,
  LogOut,
  ChevronDown,
  MapPin,
} from 'lucide-react';
import { Container } from '../../ui/Container';
import { Button } from '../../ui/Button';
import { Navigation } from '../Navigation';
import { AuthModal } from '../../ui/AuthModal';
import { LocationSwitcher } from '../../ui/LocationSwitcher';
import { useAuth } from '../../../context/AuthContext';
import { useLocationContext } from '../../../context/LocationContext';
import { useI18n } from '../../../i18n';
import styles from './Header.module.css';

export const Header: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const { location } = useLocationContext();
  const { language, setLanguage, t } = useI18n();
  const navigate = useNavigate();

  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [locationModalOpen, setLocationModalOpen] = useState<boolean>(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const toggleMobileMenu = () => setMobileMenuOpen((prev) => !prev);
  const closeMobileMenu = () => setMobileMenuOpen(false);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleLogout = () => {
    logout();
    setUserDropdownOpen(false);
    closeMobileMenu();
    navigate('/');
  };

  return (
    <>
      <header className={styles.header}>
        <Container size="wide">
          <div className={styles.inner}>
            {/* Brand Logo & Title (Routes to dashboard/farmer when authenticated) */}
            <Link
              to={isAuthenticated && user && user.verificationStatus === 'VERIFIED' ? (user.role === 'farmer' ? '/farmer' : '/dashboard') : '/'}
              className={styles.brandLink}
              onClick={closeMobileMenu}
            >
              <div className={styles.brandLogo}>
                <CloudRain size={20} />
              </div>
              <div className={styles.brandTextGroup}>
                <span className={styles.brandName}>{t('nav.brandTitle')}</span>
                <span className={styles.brandTagline}>{t('nav.brandSubtitle')}</span>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <div className={styles.desktopNav}>
              <Navigation />
            </div>

            {/* Right Group: Language Switcher, Location Pill, Auth Profile / Login CTA & Mobile Toggle */}
            <div className={styles.rightGroup}>
              {/* Language Switcher */}
              <div className={styles.langToggleGroup} role="group" aria-label={t('common.language')}>
                <button
                  type="button"
                  className={`${styles.langBtn} ${language === 'en' ? styles.langBtnActive : ''}`}
                  onClick={() => setLanguage('en')}
                  aria-pressed={language === 'en'}
                  title="Switch to English"
                >
                  EN
                </button>
                <span className={styles.langDivider}>|</span>
                <button
                  type="button"
                  className={`${styles.langBtn} ${language === 'hi' ? styles.langBtnActive : ''}`}
                  onClick={() => setLanguage('hi')}
                  aria-pressed={language === 'hi'}
                  title="हिंदी में बदलें"
                >
                  हिंदी
                </button>
              </div>

              {/* Location Pill (Available to all or authenticated user) */}
              <button
                type="button"
                className={styles.headerLocationPill}
                onClick={() => setLocationModalOpen(true)}
                title="Change active intelligence city / location"
              >
                <MapPin size={13} className={styles.locationPinIcon} />
                <span className={styles.locationCityText}>{location.city}</span>
                <span className={styles.locationRegionText}>{location.region}</span>
              </button>

              {isAuthenticated && user ? (
                /* Authenticated User Menu */
                <div className={styles.userMenuWrapper} ref={dropdownRef}>
                  <button
                    type="button"
                    className={styles.userMenuBtn}
                    onClick={() => setUserDropdownOpen((prev) => !prev)}
                    aria-expanded={userDropdownOpen}
                    aria-label="User account menu"
                  >
                    <div className={user.role === 'farmer' ? styles.userAvatarFarmer : styles.userAvatarGeneral}>
                      {user.role === 'farmer' ? <Sprout size={14} /> : <User size={14} />}
                    </div>
                    <span className={styles.userRoleBadge}>{user.role.toUpperCase()}</span>
                    <span className={styles.userNameShort}>{user.fullName.split(' ')[0]}</span>
                    <ChevronDown size={14} className={styles.userChevron} />
                  </button>

                  {/* Dropdown Menu */}
                  {userDropdownOpen && (
                    <div className={styles.userDropdown}>
                      <div className={styles.dropdownHeader}>
                        <span className={styles.dropdownName}>{user.fullName}</span>
                        <span className={styles.dropdownEmail}>{user.email}</span>
                        <span className={styles.dropdownRoleTag}>
                          {user.role === 'farmer' ? '🌾 Farmer Profile' : '👤 Citizen Profile'}
                        </span>
                      </div>

                      <div className={styles.dropdownDivider} />

                      <Link
                        to="/dashboard"
                        className={styles.dropdownItem}
                        onClick={() => setUserDropdownOpen(false)}
                      >
                        <LayoutDashboard size={14} />
                        <span>{t('nav.dashboard')}</span>
                      </Link>

                      {user.role === 'farmer' && (
                        <Link
                          to="/farmer"
                          className={styles.dropdownItem}
                          onClick={() => setUserDropdownOpen(false)}
                        >
                          <Sprout size={14} color="#16a34a" />
                          <span>{t('nav.farmer')}</span>
                        </Link>
                      )}

                      <button
                        type="button"
                        className={styles.dropdownItem}
                        onClick={() => {
                          setUserDropdownOpen(false);
                          setLocationModalOpen(true);
                        }}
                      >
                        <MapPin size={14} color="#06b6d4" />
                        <span>Change City Node</span>
                      </button>

                      <div className={styles.dropdownDivider} />

                      <button
                        type="button"
                        className={styles.dropdownLogoutBtn}
                        onClick={handleLogout}
                      >
                        <LogOut size={14} />
                        <span>{t('common.logout')}</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                /* Unauthenticated Login / Register CTA */
                <Button
                  variant="primary"
                  size="sm"
                  leadingIcon={<LogIn size={14} />}
                  onClick={() => setAuthModalOpen(true)}
                  className={styles.headerAuthBtn}
                >
                  {t('common.login')} / {t('common.register')}
                </Button>
              )}

              <button
                type="button"
                className={styles.mobileToggle}
                onClick={toggleMobileMenu}
                aria-expanded={mobileMenuOpen}
                aria-label="Toggle navigation menu"
              >
                {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
        </Container>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div className={styles.mobileMenu}>
            {/* Mobile Language Toggle */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0.25rem' }}>
              <span style={{ fontSize: '0.78125rem', fontWeight: 700, color: 'var(--rai-color-text-secondary)' }}>
                {t('common.language')}:
              </span>
              <div className={styles.langToggleGroup} role="group" aria-label={t('common.language')}>
                <button
                  type="button"
                  className={`${styles.langBtn} ${language === 'en' ? styles.langBtnActive : ''}`}
                  onClick={() => setLanguage('en')}
                  aria-pressed={language === 'en'}
                >
                  English
                </button>
                <span className={styles.langDivider}>|</span>
                <button
                  type="button"
                  className={`${styles.langBtn} ${language === 'hi' ? styles.langBtnActive : ''}`}
                  onClick={() => setLanguage('hi')}
                  aria-pressed={language === 'hi'}
                >
                  हिंदी
                </button>
              </div>
            </div>

            <button
              type="button"
              className={styles.mobileLocationBtn}
              onClick={() => {
                closeMobileMenu();
                setLocationModalOpen(true);
              }}
            >
              <MapPin size={15} color="#06b6d4" />
              <span>Location: {location.city}, {location.region}</span>
            </button>

            <Navigation isMobile onItemClick={closeMobileMenu} />

            <div className={styles.mobileAuthWrapper}>
              {isAuthenticated && user ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ padding: '0.5rem 0' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.875rem', display: 'block' }}>{user.fullName}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--rai-color-text-secondary)' }}>{user.email} ({user.role.toUpperCase()})</span>
                  </div>
                  <Link to="/dashboard" style={{ textDecoration: 'none' }} onClick={closeMobileMenu}>
                    <Button variant="secondary" size="md" fullWidth leadingIcon={<LayoutDashboard size={15} />}>
                      {t('nav.dashboard')}
                    </Button>
                  </Link>
                  {user.role === 'farmer' && (
                    <Link to="/farmer" style={{ textDecoration: 'none' }} onClick={closeMobileMenu}>
                      <Button variant="secondary" size="md" fullWidth leadingIcon={<Sprout size={15} color="#16a34a" />}>
                        {t('nav.farmer')}
                      </Button>
                    </Link>
                  )}
                  <Button variant="danger" size="md" fullWidth leadingIcon={<LogOut size={15} />} onClick={handleLogout}>
                    {t('common.logout')}
                  </Button>
                </div>
              ) : (
                <Button
                  variant="primary"
                  size="md"
                  fullWidth
                  leadingIcon={<LogIn size={15} />}
                  onClick={() => {
                    closeMobileMenu();
                    setAuthModalOpen(true);
                  }}
                >
                  {t('common.login')} / {t('common.register')} →
                </Button>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Global Modals */}
      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
      <LocationSwitcher isOpen={locationModalOpen} onClose={() => setLocationModalOpen(false)} />
    </>
  );
};
