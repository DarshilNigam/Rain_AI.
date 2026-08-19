import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LogIn,
  Users,
  Sprout,
  ArrowRight,
  X,
  ArrowLeft,
  Eye,
  EyeOff,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Compass,
  Search,
  Lock,
  KeyRound,
  ShieldAlert,
} from 'lucide-react';
import { Badge } from '../Badge';
import { Button } from '../Button';
import { useAuth } from '../../../context/AuthContext';
import { useI18n } from '../../../i18n';
import { UserLocation, PRESET_CITIES, DEFAULT_USER_LOCATION } from '../../../types/location';
import { OTPChallenge, PasswordPolicyCheck } from '../../../types/auth';
import { CryptoService } from '../../../services/crypto.service';
import { UnverifiedAccountError } from '../../../services/auth.service';
import { PasswordStrengthMeter } from '../PasswordStrengthMeter/PasswordStrengthMeter';
import { OtpInput } from '../OtpInput/OtpInput';
import styles from './AuthModal.module.css';

export type AuthMode =
  | 'login'
  | 'register-user'
  | 'register-farmer'
  | 'otp-verification'
  | 'forgot-password-email'
  | 'forgot-password-otp'
  | 'forgot-password-new'
  | null;

interface AuthModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly defaultMode?: AuthMode;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, defaultMode = null }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    login,
    initiateRegisterUser,
    initiateRegisterFarmer,
    verifyRegistrationOTP,
    resendOTP,
    requestAccountOTP,
    resetPassword,
  } = useAuth();
  const { t } = useI18n();

  const fromState = (location.state as { from?: { pathname?: string; search?: string } } | null)?.from;
  const redirectPath = fromState ? `${fromState.pathname || ''}${fromState.search || ''}` : null;

  const [mode, setMode] = useState<AuthMode>(defaultMode);
  const [activeCard, setActiveCard] = useState<'login' | 'user' | 'farmer' | null>(null);

  // Form State: Common
  const [fullName, setFullName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(() => {
    try {
      return typeof localStorage !== 'undefined' && localStorage.getItem('rai_remember_me') === 'true';
    } catch {
      return false;
    }
  });

  // Form State: Password Reset
  const [resetCode, setResetCode] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmNewPassword, setConfirmNewPassword] = useState<string>('');
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);

  // Form State: Citizen Location
  const [selectedUserCity, setSelectedUserCity] = useState<UserLocation>(DEFAULT_USER_LOCATION);
  const [citySearchQuery, setCitySearchQuery] = useState<string>('');
  const [showCityDropdown, setShowCityDropdown] = useState<boolean>(false);

  // Form State: Farmer Specific (Location Only)
  const [villageArea, setVillageArea] = useState<string>('');
  const [district, setDistrict] = useState<string>('');
  const [farmLocationLabel, setFarmLocationLabel] = useState<string>('');
  const [farmCoords, setFarmCoords] = useState<{ lat: number; lng: number }>({ lat: 18.5204, lng: 73.8567 });
  const [isLocating, setIsLocating] = useState<boolean>(false);

  // Challenge & Verification State
  const [activeChallenge, setActiveChallenge] = useState<OTPChallenge | null>(null);
  const [devCodeNotice, setDevCodeNotice] = useState<string | undefined>(undefined);
  const [unverifiedEmailPrompt, setUnverifiedEmailPrompt] = useState<string | null>(null);

  // UI Flow States
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successState, setSuccessState] = useState<{ role: 'user' | 'farmer'; name: string } | null>(null);

  // Live password policy evaluations
  const registrationPasswordPolicy: PasswordPolicyCheck = CryptoService.evaluatePasswordPolicy(password);
  const resetPasswordPolicy: PasswordPolicyCheck = CryptoService.evaluatePasswordPolicy(newPassword);

  useEffect(() => {
    if (defaultMode) {
      setMode(defaultMode);
    } else {
      setMode(null);
    }
    setFormError(null);
    setSuccessState(null);
    setActiveChallenge(null);
    setDevCodeNotice(undefined);
    setUnverifiedEmailPrompt(null);
    setPassword('');
    setConfirmPassword('');

    // Pre-fill email if Remember Me was enabled
    try {
      if (typeof localStorage !== 'undefined' && localStorage.getItem('rai_remember_me') === 'true') {
        const remembered = localStorage.getItem('rai_remembered_email');
        if (remembered) {
          setEmail(remembered);
          setRememberMe(true);
        }
      }
    } catch {
      // ignore
    }
  }, [defaultMode, isOpen]);

  // Handle ESC key and scroll locking
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  // Geolocation Handler for Citizen
  const handleUseCitizenLocation = () => {
    if (!navigator.geolocation) {
      setFormError('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    setFormError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = parseFloat(pos.coords.latitude.toFixed(4));
        const lng = parseFloat(pos.coords.longitude.toFixed(4));

        let bestMatch: UserLocation = PRESET_CITIES[0]!;
        let minDistance = Infinity;
        for (const city of PRESET_CITIES) {
          const dist = Math.hypot(city.lat - lat, city.lng - lng);
          if (dist < minDistance) {
            minDistance = dist;
            bestMatch = city;
          }
        }

        if (minDistance < 0.6) {
          setSelectedUserCity({ ...bestMatch, lat, lng });
        } else {
          setSelectedUserCity({
            city: `GPS Location (${lat.toFixed(2)}°N, ${lng.toFixed(2)}°E)`,
            region: bestMatch.region || 'Regional Catchment',
            country: 'India',
            lat,
            lng,
            formattedAddress: `Current Location: [${lat}° N, ${lng}° E]`,
          });
        }
        setIsLocating(false);
      },
      (err) => {
        setIsLocating(false);
        let msg = 'Unable to detect location. You can select your city manually from the search box.';
        if (err.code === 1) {
          msg = 'Location permission was denied. Please allow location access or select your city manually below.';
        } else if (err.code === 3) {
          msg = 'Location request timed out. Please try again or select your city manually.';
        }
        setFormError(msg);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Geolocation Handler for Farmer
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setFormError('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    setFormError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = parseFloat(pos.coords.latitude.toFixed(4));
        const lng = parseFloat(pos.coords.longitude.toFixed(4));
        setFarmCoords({ lat, lng });
        const generatedLabel = `GPS: [${lat}° N, ${lng}° E] Catchment Area`;
        setFarmLocationLabel(generatedLabel);

        let bestMatch: UserLocation = PRESET_CITIES[0]!;
        let minDistance = Infinity;
        for (const city of PRESET_CITIES) {
          const dist = Math.hypot(city.lat - lat, city.lng - lng);
          if (dist < minDistance) {
            minDistance = dist;
            bestMatch = city;
          }
        }
        if (!villageArea) setVillageArea(bestMatch.city);
        if (!district) setDistrict(bestMatch.region);
        setIsLocating(false);
      },
      (err) => {
        setIsLocating(false);
        let msg = 'Unable to detect farm coordinates. Please enter your village/district manually.';
        if (err.code === 1) {
          msg = 'Location permission was denied. Please enter your farm coordinates/village manually below.';
        } else if (err.code === 3) {
          msg = 'Location request timed out. Please try again or enter your farm coordinates manually.';
        }
        setFormError(msg);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Submit Handler: LOGIN
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setUnverifiedEmailPrompt(null);
    setIsSubmitting(true);

    const submittedEmail = email.trim().toLowerCase();
    const submittedPassword = password;
    // STRICT SECURITY: Immediately clear password state from React memory
    setPassword('');

    try {
      const user = await login({ email: submittedEmail, password: submittedPassword, rememberMe });
      // Manage non-sensitive convenience persistence
      try {
        if (rememberMe) {
          localStorage.setItem('rai_remember_me', 'true');
          localStorage.setItem('rai_remembered_email', submittedEmail);
        } else {
          localStorage.removeItem('rai_remember_me');
          localStorage.removeItem('rai_remembered_email');
        }
      } catch {
        // ignore
      }
      onClose();
      const destination = redirectPath || (user.role === 'farmer' ? '/farmer' : '/dashboard');
      navigate(destination, { replace: true });
    } catch (err: unknown) {
      if (err instanceof UnverifiedAccountError) {
        setUnverifiedEmailPrompt(err.email);
        setFormError(t('auth_unverified_notice', 'Your account still needs verification.'));
      } else {
        setFormError(err instanceof Error ? err.message : 'Invalid credentials. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Trigger verification flow for an unverified account during login
  const handleVerifyUnverifiedAccount = async () => {
    if (!unverifiedEmailPrompt) return;
    setFormError(null);
    setIsSubmitting(true);
    try {
      const { challenge, delivery } = await requestAccountOTP(unverifiedEmailPrompt, 'LOGIN_VERIFICATION');
      setActiveChallenge(challenge);
      setDevCodeNotice(delivery.devCode);
      setMode('otp-verification');
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to generate verification code.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Handler: REGISTER USER
  const handleRegisterUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!registrationPasswordPolicy.isValid) {
      setFormError(registrationPasswordPolicy.feedbackMessages[0] || 'Password does not meet the security requirements.');
      return;
    }
    if (password !== confirmPassword) {
      setFormError('Passwords do not match. Please verify.');
      return;
    }

    const submittedPassword = password;
    const submittedConfirm = confirmPassword;
    // STRICT SECURITY: Immediately clear password state from React memory
    setPassword('');
    setConfirmPassword('');

    setIsSubmitting(true);
    try {
      const { challenge, delivery } = await initiateRegisterUser({
        fullName,
        email,
        password: submittedPassword,
        confirmPassword: submittedConfirm,
        location: selectedUserCity,
      });
      setActiveChallenge(challenge);
      setDevCodeNotice(delivery.devCode);
      setMode('otp-verification');
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'User registration failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Handler: REGISTER FARMER
  const handleRegisterFarmerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!registrationPasswordPolicy.isValid) {
      setFormError(registrationPasswordPolicy.feedbackMessages[0] || 'Password does not meet the security requirements.');
      return;
    }
    if (password !== confirmPassword) {
      setFormError('Passwords do not match. Please verify.');
      return;
    }

    const submittedPassword = password;
    const submittedConfirm = confirmPassword;
    // STRICT SECURITY: Immediately clear password state from React memory
    setPassword('');
    setConfirmPassword('');

    setIsSubmitting(true);
    try {
      const label = farmLocationLabel.trim() || `${villageArea || 'Sector 1'}, ${district || 'Agri Zone'}`;
      const { challenge, delivery } = await initiateRegisterFarmer({
        fullName,
        email,
        password: submittedPassword,
        confirmPassword: submittedConfirm,
        villageArea,
        district,
        farmLocation: {
          lat: farmCoords.lat,
          lng: farmCoords.lng,
          addressLabel: label,
        },
      });
      setActiveChallenge(challenge);
      setDevCodeNotice(delivery.devCode);
      setMode('otp-verification');
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Farmer registration failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // OTP Verification Handler
  const handleVerifyOTP = async (code: string) => {
    if (!activeChallenge) return;
    setFormError(null);
    setIsSubmitting(true);

    try {
      if (activeChallenge.purpose === 'PASSWORD_RESET') {
        // Store validated code and proceed to new password entry
        setResetCode(code);
        setMode('forgot-password-new');
        return;
      }

      const verifiedUser = await verifyRegistrationOTP(activeChallenge.challengeId, code);
      setSuccessState({ role: verifiedUser.role, name: verifiedUser.fullName });
      setTimeout(() => {
        onClose();
        const destination = redirectPath || (verifiedUser.role === 'farmer' ? '/farmer' : '/dashboard');
        navigate(destination, { replace: true });
      }, 1200);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Invalid code.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Resend OTP Handler
  const handleResendOTP = async () => {
    if (!activeChallenge) return;
    setFormError(null);
    try {
      const { challenge, delivery } = await resendOTP(activeChallenge.challengeId);
      setActiveChallenge(challenge);
      setDevCodeNotice(delivery.devCode);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Could not resend code.');
    }
  };

  // Password Reset Step 1: Request OTP
  const handleRequestPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      const { challenge, delivery } = await requestAccountOTP(email, 'PASSWORD_RESET');
      setActiveChallenge(challenge);
      setDevCodeNotice(delivery.devCode);
      setMode('forgot-password-otp');
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to issue password reset code.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Password Reset Step 3: Set New Password
  const handleSetNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!resetPasswordPolicy.isValid) {
      setFormError(resetPasswordPolicy.feedbackMessages[0] || 'Password does not meet the security requirements.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setFormError('Passwords do not match. Please verify.');
      return;
    }
    if (!activeChallenge) {
      setFormError('Reset session expired. Please start again.');
      return;
    }

    setIsSubmitting(true);
    try {
      await resetPassword({
        email: activeChallenge.identifier,
        challengeId: activeChallenge.challengeId,
        code: resetCode,
        newPassword,
        confirmNewPassword,
      });
      // Return to login with clear password state
      setPassword('');
      setConfirmPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setMode('login');
      setFormError(null);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to update password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredPresetCities = PRESET_CITIES.filter(
    (c) =>
      c.city.toLowerCase().includes(citySearchQuery.toLowerCase()) ||
      c.region.toLowerCase().includes(citySearchQuery.toLowerCase())
  );

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="auth-modal-title">
      {/* Background backdrop blur */}
      <div className={styles.backdrop} onClick={onClose} />

      {/* Modal Dialog Window */}
      <div className={styles.dialog}>
        {/* Close Button */}
        <button
          type="button"
          className={styles.closeBtn}
          onClick={onClose}
          aria-label="Close authentication modal"
        >
          <X size={18} />
        </button>

        {/* Ambient atmospheric aura inside modal */}
        <div className={styles.modalAura} />

        {/* 1. SELECTION GATEWAY (3D CARDS) */}
        {mode === null && !successState && (
          <div className={styles.selectionView}>
            {fromState && (
              <div className={styles.loginRequiredBanner}>
                <div className={styles.loginRequiredIcon}>
                  <Lock size={15} />
                </div>
                <div className={styles.loginRequiredText}>
                  <span className={styles.loginRequiredTitle}>{t('auth.requiredTitle')}</span>
                  <span className={styles.loginRequiredSubtitle}>{t('auth.requiredDesc')}</span>
                </div>
              </div>
            )}
            <div className={styles.modalHeader}>
              <span className={styles.brandSuperTag}>R.A.I. • RAINFALL INTELLIGENCE</span>
              <h2 id="auth-modal-title" className={styles.modalTitle}>
                {t('auth.title')}
              </h2>
              <p className={styles.modalSubtitle}>{t('auth.subtitle')}</p>
            </div>

            <div className={styles.cardsGrid}>
              {/* CARD 01: LOGIN */}
              <div
                className={`${styles.card3d} ${styles.cardLogin} ${activeCard === 'login' ? styles.cardActive : ''}`}
                onMouseEnter={() => setActiveCard('login')}
                onMouseLeave={() => setActiveCard(null)}
                onClick={() => {
                  setMode('login');
                  setFormError(null);
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && setMode('login')}
              >
                <div className={styles.cardGlow} />
                <div className={styles.cardHeader}>
                  <div className={styles.iconCircle}>
                    <LogIn size={18} color="#0284c7" />
                  </div>
                </div>
                <div className={styles.cardBody}>
                  <h3 className={styles.cardTitle}>{t('auth.loginCardTitle')}</h3>
                  <p className={styles.cardDesc}>&quot;Already part of R.A.I.?&quot;</p>
                  <p className={styles.cardDesc} style={{ marginTop: '4px', opacity: 0.85 }}>
                    {t('auth.loginCardDesc')}
                  </p>
                </div>
                <div className={styles.cardFooter}>
                  <Button
                    variant="primary"
                    size="sm"
                    fullWidth
                    trailingIcon={<ArrowRight size={14} />}
                    onClick={(e) => {
                      e.stopPropagation();
                      setMode('login');
                    }}
                  >
                    {t('common.continue')} →
                  </Button>
                </div>
              </div>

              {/* CARD 02: REGISTER AS USER */}
              <div
                className={`${styles.card3d} ${styles.cardUser} ${activeCard === 'user' ? styles.cardActive : ''}`}
                onMouseEnter={() => setActiveCard('user')}
                onMouseLeave={() => setActiveCard(null)}
                onClick={() => {
                  setMode('register-user');
                  setFormError(null);
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && setMode('register-user')}
              >
                <div className={styles.cardGlow} />
                <div className={styles.cardHeader}>
                  <div className={styles.iconCircle}>
                    <Users size={18} color="#0891b2" />
                  </div>
                </div>
                <div className={styles.cardBody}>
                  <h3 className={styles.cardTitle}>{t('auth.userCardTitle')}</h3>
                  <p className={styles.cardDesc}>&quot;Rainfall intelligence for everyday decisions.&quot;</p>
                  <p className={styles.cardDesc} style={{ marginTop: '4px', opacity: 0.85 }}>
                    {t('auth.userCardDesc')}
                  </p>
                </div>
                <div className={styles.cardFooter}>
                  <Button
                    variant="primary"
                    size="sm"
                    fullWidth
                    trailingIcon={<ArrowRight size={14} />}
                    style={{ backgroundColor: '#0891b2' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setMode('register-user');
                    }}
                  >
                    {t('common.register')} →
                  </Button>
                </div>
              </div>

              {/* CARD 03: REGISTER AS FARMER */}
              <div
                className={`${styles.card3d} ${styles.cardFarmer} ${activeCard === 'farmer' ? styles.cardActive : ''}`}
                onMouseEnter={() => setActiveCard('farmer')}
                onMouseLeave={() => setActiveCard(null)}
                onClick={() => {
                  setMode('register-farmer');
                  setFormError(null);
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && setMode('register-farmer')}
              >
                <div className={styles.cardGlow} />
                <div className={styles.cardHeader}>
                  <div className={styles.iconCircle}>
                    <Sprout size={18} color="#16a34a" />
                  </div>
                </div>
                <div className={styles.cardBody}>
                  <h3 className={styles.cardTitle}>{t('auth.farmerCardTitle')}</h3>
                  <p className={styles.cardDesc}>&quot;Intelligence built around your farm.&quot;</p>
                  <p className={styles.cardDesc} style={{ marginTop: '4px', opacity: 0.85 }}>
                    {t('auth.farmerCardDesc')}
                  </p>
                </div>
                <div className={styles.cardFooter}>
                  <Button
                    variant="primary"
                    size="sm"
                    fullWidth
                    trailingIcon={<ArrowRight size={14} />}
                    style={{ backgroundColor: '#16a34a' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setMode('register-farmer');
                    }}
                  >
                    {t('auth.farmerCardTitle')} →
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. LOGIN VIEW */}
        {mode === 'login' && !successState && (
          <div className={styles.formView}>
            <button type="button" className={styles.backBtn} onClick={() => setMode(null)}>
              <ArrowLeft size={14} />
              <span>Back to Selection</span>
            </button>

            <div className={styles.formHeader}>
              <span className={styles.formSuperTag}>MEMBER AUTHENTICATION</span>
              <h2 className={styles.formTitle}>WELCOME BACK</h2>
              <p className={styles.formSubtitle}>Continue your rainfall intelligence journey.</p>
            </div>

            {formError && (
              <div className={styles.formErrorBanner} role="alert">
                <AlertCircle size={15} />
                <span>{formError}</span>
              </div>
            )}

            {unverifiedEmailPrompt && (
              <div className={styles.unverifiedNoticeBox}>
                <div className={styles.unverifiedNoticeText}>
                  <ShieldAlert size={16} color="#d97706" />
                  <span>{t('auth_unverified_notice', 'Your account still needs verification.')}</span>
                </div>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={handleVerifyUnverifiedAccount}
                  disabled={isSubmitting}
                  style={{ backgroundColor: '#d97706' }}
                >
                  {t('auth_verify_now', 'Verify now')} →
                </Button>
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className={styles.formFields}>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel} htmlFor="login-email">
                  {t('auth.email', 'EMAIL ADDRESS')}
                </label>
                <input
                  id="login-email"
                  type="email"
                  required
                  placeholder="name@domain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={styles.inputField}
                  autoComplete="email"
                />
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel} htmlFor="login-password">
                  {t('auth.password', 'PASSWORD')}
                </label>
                <div className={styles.inputWrapper}>
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={styles.inputField}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className={styles.togglePassBtn}
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <button
                  type="button"
                  className={styles.forgotPassLink}
                  onClick={() => {
                    setMode('forgot-password-email');
                    setFormError(null);
                  }}
                >
                  {t('auth_forgot_password', 'Forgot password?')}
                </button>
              </div>

              <div className={styles.rememberMeGroup}>
                <label className={styles.checkboxLabel} htmlFor="remember-me-checkbox">
                  <input
                    id="remember-me-checkbox"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className={styles.checkboxInput}
                  />
                  <span>Remember me on this device</span>
                </label>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="md"
                fullWidth
                disabled={isSubmitting}
                trailingIcon={<ArrowRight size={15} />}
              >
                {isSubmitting ? 'Verifying Credentials...' : 'LOGIN →'}
              </Button>
            </form>

            <div className={styles.formSecondaryActions}>
              <span>New to R.A.I.?</span>
              <button
                type="button"
                className={styles.switchAuthBtn}
                onClick={() => {
                  setMode('register-user');
                  setFormError(null);
                }}
              >
                REGISTER AS USER
              </button>
              <span>•</span>
              <button
                type="button"
                className={styles.switchAuthBtn}
                onClick={() => {
                  setMode('register-farmer');
                  setFormError(null);
                }}
              >
                REGISTER AS FARMER
              </button>
            </div>
          </div>
        )}

        {/* 3. REGISTER AS USER VIEW */}
        {mode === 'register-user' && !successState && (
          <div className={styles.formView}>
            <button type="button" className={styles.backBtn} onClick={() => setMode(null)}>
              <ArrowLeft size={14} />
              <span>Back to Selection</span>
            </button>

            <div className={styles.formHeader}>
              <span className={styles.formSuperTag}>GENERAL ACCESS</span>
              <h2 className={styles.formTitle}>CREATE YOUR R.A.I. ACCOUNT</h2>
              <p className={styles.formSubtitle}>Start understanding rainfall before it becomes risk.</p>
            </div>

            {formError && (
              <div className={styles.formErrorBanner} role="alert">
                <AlertCircle size={15} />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleRegisterUserSubmit} className={styles.formFields}>
              <div className={styles.formRowTwo}>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel} htmlFor="reg-fullname">
                    {t('auth.fullName', 'FULL NAME')}
                  </label>
                  <input
                    id="reg-fullname"
                    type="text"
                    required
                    placeholder="e.g. Darshil Patel"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className={styles.inputField}
                    autoComplete="name"
                  />
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel} htmlFor="reg-email">
                    {t('auth.email', 'EMAIL ADDRESS')}
                  </label>
                  <input
                    id="reg-email"
                    type="email"
                    required
                    placeholder="name@domain.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={styles.inputField}
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* Citizen Location Picker */}
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>{t('auth.selectCity', 'YOUR CITY / LOCATION NODE')}</label>
                <div className={styles.locationSelectorBox}>
                  <div className={styles.locationTopRow}>
                    <div className={styles.locationBadge}>
                      <MapPin size={14} color="#0891b2" />
                      <span>
                        {selectedUserCity.city}, {selectedUserCity.region} ({selectedUserCity.lat}° N, {selectedUserCity.lng}° E)
                      </span>
                    </div>
                    <button
                      type="button"
                      className={styles.useLocationBtn}
                      onClick={handleUseCitizenLocation}
                      disabled={isLocating}
                    >
                      <Compass size={13} />
                      <span>{isLocating ? 'Detecting GPS...' : 'Use Current Location'}</span>
                    </button>
                  </div>

                  <div style={{ position: 'relative', marginTop: '0.35rem' }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        padding: '0 0.6rem',
                        height: '34px',
                        borderRadius: 'var(--rai-radius-md)',
                        border: '1px solid var(--rai-color-border-subtle)',
                        backgroundColor: '#ffffff',
                      }}
                    >
                      <Search size={13} color="#94a3b8" />
                      <input
                        type="text"
                        placeholder="Search city (e.g. Ahmedabad, Mumbai, Delhi, Pune)..."
                        value={citySearchQuery}
                        onChange={(e) => {
                          setCitySearchQuery(e.target.value);
                          setShowCityDropdown(true);
                        }}
                        onFocus={() => setShowCityDropdown(true)}
                        style={{
                          border: 'none',
                          outline: 'none',
                          width: '100%',
                          fontSize: '0.75rem',
                          fontFamily: 'var(--rai-font-body)',
                        }}
                      />
                    </div>

                    {showCityDropdown && (
                      <div
                        style={{
                          position: 'absolute',
                          top: '100%',
                          left: 0,
                          right: 0,
                          maxHeight: '130px',
                          overflowY: 'auto',
                          backgroundColor: '#ffffff',
                          border: '1px solid var(--rai-color-border-subtle)',
                          borderRadius: 'var(--rai-radius-md)',
                          boxShadow: '0 4px 12px rgba(15,23,42,0.1)',
                          zIndex: 50,
                          marginTop: '2px',
                        }}
                      >
                        {filteredPresetCities.map((city) => (
                          <div
                            key={city.city}
                            style={{
                              padding: '0.35rem 0.6rem',
                              fontSize: '0.71875rem',
                              cursor: 'pointer',
                              display: 'flex',
                              justifyContent: 'space-between',
                              borderBottom: '1px solid #f1f5f9',
                              backgroundColor: selectedUserCity.city === city.city ? '#ecfeff' : '#ffffff',
                            }}
                            onClick={() => {
                              setSelectedUserCity(city);
                              setCitySearchQuery(city.city);
                              setShowCityDropdown(false);
                            }}
                          >
                            <strong>{city.city}</strong>
                            <span style={{ color: '#64748b' }}>{city.region}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className={styles.formRowTwo}>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel} htmlFor="reg-password">
                    {t('auth.password', 'PASSWORD')}
                  </label>
                  <div className={styles.inputWrapper}>
                    <input
                      id="reg-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="Min 12 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={styles.inputField}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className={styles.togglePassBtn}
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel} htmlFor="reg-confirm-password">
                    {t('auth.confirmPassword', 'CONFIRM PASSWORD')}
                  </label>
                  <input
                    id="reg-confirm-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Repeat password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={styles.inputField}
                    autoComplete="new-password"
                  />
                </div>
              </div>

              {/* Live Password Strength Meter */}
              {password && <PasswordStrengthMeter policy={registrationPasswordPolicy} />}

              <Button
                type="submit"
                variant="primary"
                size="md"
                fullWidth
                disabled={isSubmitting}
                style={{ backgroundColor: '#0891b2' }}
                trailingIcon={<ArrowRight size={15} />}
              >
                {isSubmitting ? 'Validating & Issuing OTP...' : 'CONTINUE TO OTP VERIFICATION →'}
              </Button>
            </form>

            <div className={styles.formSecondaryActions}>
              <span>Already have an account?</span>
              <button
                type="button"
                className={styles.switchAuthBtn}
                onClick={() => {
                  setMode('login');
                  setFormError(null);
                }}
              >
                LOG IN HERE →
              </button>
            </div>
          </div>
        )}

        {/* 4. REGISTER AS FARMER VIEW */}
        {mode === 'register-farmer' && !successState && (
          <div className={styles.formView}>
            <button type="button" className={styles.backBtn} onClick={() => setMode(null)}>
              <ArrowLeft size={14} />
              <span>Back to Selection</span>
            </button>

            <div className={styles.formHeader}>
              <span className={styles.formSuperTag} style={{ color: '#16a34a' }}>
                AGRONOMIC REVISION
              </span>
              <h2 className={styles.formTitle}>WELCOME, FARMER</h2>
              <p className={styles.formSubtitle}>R.A.I. connects rainfall intelligence to your farm.</p>
            </div>

            {formError && (
              <div className={styles.formErrorBanner} role="alert">
                <AlertCircle size={15} />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleRegisterFarmerSubmit} className={styles.formFields}>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>STEP 1: YOUR IDENTITY</label>
                <div className={styles.formRowTwo}>
                  <input
                    type="text"
                    required
                    placeholder="Full Name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className={styles.inputField}
                    autoComplete="name"
                  />
                  <input
                    type="email"
                    required
                    placeholder="Email Address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={styles.inputField}
                    autoComplete="email"
                  />
                </div>
                <div className={styles.formRowTwo} style={{ marginTop: '0.4rem' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Password (12+ chars)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={styles.inputField}
                    autoComplete="new-password"
                  />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Confirm Password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={styles.inputField}
                    autoComplete="new-password"
                  />
                </div>
                {password && <PasswordStrengthMeter policy={registrationPasswordPolicy} />}
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>STEP 2: YOUR LOCATION</label>
                <div className={styles.formRowTwo}>
                  <input
                    type="text"
                    required
                    placeholder={t('auth.villageArea', 'Village / Block Area')}
                    value={villageArea}
                    onChange={(e) => setVillageArea(e.target.value)}
                    className={styles.inputField}
                  />
                  <input
                    type="text"
                    required
                    placeholder={t('auth.district', 'District')}
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className={styles.inputField}
                  />
                </div>

                <div className={styles.locationSelectorBox} style={{ marginTop: '0.4rem' }}>
                  <div className={styles.locationTopRow}>
                    <div className={styles.locationBadge}>
                      <MapPin size={14} />
                      <span>
                        {farmCoords.lat}° N, {farmCoords.lng}° E
                      </span>
                    </div>
                    <button
                      type="button"
                      className={styles.useLocationBtn}
                      onClick={handleUseCurrentLocation}
                      disabled={isLocating}
                    >
                      <Compass size={13} />
                      <span>{isLocating ? 'Detecting...' : 'Use My Current Location'}</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="Farm Location (e.g. Sector 4, Northern Catchment Field)"
                    value={farmLocationLabel}
                    onChange={(e) => setFarmLocationLabel(e.target.value)}
                    className={styles.inputField}
                    style={{ height: '36px', backgroundColor: '#ffffff' }}
                  />
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="md"
                fullWidth
                disabled={isSubmitting}
                style={{ backgroundColor: '#16a34a' }}
                trailingIcon={<ArrowRight size={15} />}
              >
                {isSubmitting ? 'Validating & Issuing OTP...' : 'CONTINUE TO OTP VERIFICATION →'}
              </Button>
            </form>

            <div className={styles.formSecondaryActions}>
              <span>Already registered as a farmer?</span>
              <button
                type="button"
                className={styles.switchAuthBtn}
                onClick={() => {
                  setMode('login');
                  setFormError(null);
                }}
              >
                LOG IN →
              </button>
            </div>
          </div>
        )}

        {/* 5. OTP VERIFICATION VIEW */}
        {mode === 'otp-verification' && activeChallenge && !successState && (
          <div className={styles.formView}>
            <OtpInput
              challenge={activeChallenge}
              onVerify={handleVerifyOTP}
              onResend={handleResendOTP}
              onChangeIdentifier={() => {
                setMode(fullName ? 'register-user' : 'login');
                setActiveChallenge(null);
                setFormError(null);
              }}
              isSubmitting={isSubmitting}
              error={formError}
              devCodeNotice={devCodeNotice}
            />
          </div>
        )}

        {/* 6. FORGOT PASSWORD - STEP 1: ENTER EMAIL */}
        {mode === 'forgot-password-email' && !successState && (
          <div className={styles.formView}>
            <button type="button" className={styles.backBtn} onClick={() => setMode('login')}>
              <ArrowLeft size={14} />
              <span>Back to Login</span>
            </button>

            <div className={styles.formHeader}>
              <div className={styles.iconCircle} style={{ margin: '0 auto 0.5rem' }}>
                <KeyRound size={22} color="#0891b2" />
              </div>
              <h2 className={styles.formTitle}>{t('auth_reset_password_title', 'Reset your password')}</h2>
              <p className={styles.formSubtitle}>
                {t('auth_reset_password_desc', 'Enter your registered email to receive a 6-digit verification code.')}
              </p>
            </div>

            {formError && (
              <div className={styles.formErrorBanner} role="alert">
                <AlertCircle size={15} />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleRequestPasswordReset} className={styles.formFields}>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel} htmlFor="reset-email">
                  {t('auth.email', 'EMAIL ADDRESS')}
                </label>
                <input
                  id="reset-email"
                  type="email"
                  required
                  placeholder="name@domain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={styles.inputField}
                  autoComplete="email"
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                size="md"
                fullWidth
                disabled={isSubmitting}
                trailingIcon={<ArrowRight size={15} />}
              >
                {isSubmitting ? 'Dispatching Code...' : 'SEND 6-DIGIT CODE →'}
              </Button>
            </form>
          </div>
        )}

        {/* 7. FORGOT PASSWORD - STEP 2: ENTER OTP */}
        {mode === 'forgot-password-otp' && activeChallenge && !successState && (
          <div className={styles.formView}>
            <OtpInput
              challenge={activeChallenge}
              onVerify={handleVerifyOTP}
              onResend={handleResendOTP}
              onChangeIdentifier={() => {
                setMode('forgot-password-email');
                setActiveChallenge(null);
                setFormError(null);
              }}
              isSubmitting={isSubmitting}
              error={formError}
              devCodeNotice={devCodeNotice}
            />
          </div>
        )}

        {/* 8. FORGOT PASSWORD - STEP 3: SET NEW PASSWORD */}
        {mode === 'forgot-password-new' && !successState && (
          <div className={styles.formView}>
            <div className={styles.formHeader}>
              <span className={styles.formSuperTag}>CREDENTIAL RECOVERY</span>
              <h2 className={styles.formTitle}>SET NEW PASSWORD</h2>
              <p className={styles.formSubtitle}>Create a secure new password for your account.</p>
            </div>

            {formError && (
              <div className={styles.formErrorBanner} role="alert">
                <AlertCircle size={15} />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSetNewPassword} className={styles.formFields}>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel} htmlFor="new-password">
                  {t('auth_new_password', 'NEW PASSWORD')}
                </label>
                <div className={styles.inputWrapper}>
                  <input
                    id="new-password"
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    placeholder="Min 12 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className={styles.inputField}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className={styles.togglePassBtn}
                    onClick={() => setShowNewPassword((prev) => !prev)}
                    aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                  >
                    {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel} htmlFor="confirm-new-password">
                  {t('auth_confirm_new_password', 'CONFIRM NEW PASSWORD')}
                </label>
                <input
                  id="confirm-new-password"
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  placeholder="Repeat new password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  className={styles.inputField}
                  autoComplete="new-password"
                />
              </div>

              {newPassword && <PasswordStrengthMeter policy={resetPasswordPolicy} />}

              <Button
                type="submit"
                variant="primary"
                size="md"
                fullWidth
                disabled={isSubmitting}
                trailingIcon={<ArrowRight size={15} />}
              >
                {isSubmitting ? 'Updating Password...' : t('auth_reset_btn', 'Update Password & Sign In')}
              </Button>
            </form>
          </div>
        )}

        {/* 9. SUCCESS CONFIRMATION STATE */}
        {successState && (
          <div className={styles.successView}>
            <div className={styles.successIconWrapper}>
              <CheckCircle2 size={32} />
            </div>
            <Badge variant="safe" showDot>
              Identity & OTP Verified
            </Badge>
            <h2 className={styles.successTitle}>
              {successState.role === 'farmer' ? 'WELCOME TO R.A.I., FARMER.' : 'ACCOUNT ACTIVATED.'}
            </h2>
            <p className={styles.successSubtitle}>
              {successState.role === 'farmer'
                ? 'Your farm location and verified identity are now active. Meteorological intelligence is synchronized.'
                : `Welcome ${successState.name}. Your verified rainfall intelligence node is active.`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
