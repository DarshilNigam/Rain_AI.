import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ShieldCheck, RefreshCw, ArrowLeft, Clock, AlertCircle, CheckCircle } from 'lucide-react';
import { OTPChallenge } from '../../../types/auth';
import { useI18n } from '../../../i18n';
import { Button } from '../Button';
import styles from './OtpInput.module.css';

interface OtpInputProps {
  readonly challenge: OTPChallenge;
  readonly onVerify: (code: string) => Promise<void>;
  readonly onResend: () => Promise<void>;
  readonly onChangeIdentifier?: () => void;
  readonly isSubmitting: boolean;
  readonly error: string | null;
  readonly devCodeNotice?: string;
}

export const OtpInput: React.FC<OtpInputProps> = ({
  challenge,
  onVerify,
  onResend,
  onChangeIdentifier,
  isSubmitting,
  error,
  devCodeNotice,
}) => {
  const { t } = useI18n();
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(() => {
    const remainingMs = challenge.resendAvailableAt - Date.now();
    return Math.max(0, Math.ceil(remainingMs / 1000));
  });
  const [isResending, setIsResending] = useState<boolean>(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Update countdown timer
  useEffect(() => {
    const updateCountdown = () => {
      const remainingMs = challenge.resendAvailableAt - Date.now();
      const sec = Math.max(0, Math.ceil(remainingMs / 1000));
      setSecondsRemaining(sec);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [challenge.resendAvailableAt]);

  // Auto-focus first input on mount
  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  const handleDigitChange = (index: number, val: string) => {
    // Only accept numeric characters
    const cleanVal = val.replace(/\D/g, '');
    if (!cleanVal) {
      const nextDigits = [...digits];
      nextDigits[index] = '';
      setDigits(nextDigits);
      return;
    }

    const lastChar = cleanVal.charAt(cleanVal.length - 1);
    const nextDigits = [...digits];
    nextDigits[index] = lastChar;
    setDigits(nextDigits);

    // Auto-advance to next box if not on last box
    if (index < 5 && inputRefs.current[index + 1]) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
        const nextDigits = [...digits];
        nextDigits[index - 1] = '';
        setDigits(nextDigits);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text/plain').replace(/\D/g, '').slice(0, 6);
    if (!pastedData) return;

    const nextDigits = [...digits];
    for (let i = 0; i < 6; i++) {
      nextDigits[i] = pastedData.charAt(i) || '';
    }
    setDigits(nextDigits);

    const focusIndex = Math.min(pastedData.length, 5);
    inputRefs.current[focusIndex]?.focus();
  };

  const fullCode = digits.join('');
  const isComplete = fullCode.length === 6;

  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      if (!isComplete || isSubmitting) return;
      await onVerify(fullCode);
    },
    [fullCode, isComplete, isSubmitting, onVerify]
  );

  // Auto-submit when all 6 digits are typed
  useEffect(() => {
    if (isComplete && !isSubmitting) {
      handleSubmit();
    }
  }, [isComplete, isSubmitting, handleSubmit]);

  const handleResendClick = async () => {
    if (secondsRemaining > 0 || isResending) return;
    setIsResending(true);
    try {
      await onResend();
      setDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setIsResending(false);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className={styles.otpContainer}>
      <div className={styles.otpHeader}>
        <div className={styles.iconCircle}>
          <ShieldCheck size={26} className={styles.shieldIcon} />
        </div>
        <h3 className={styles.otpTitle}>{t('auth_otp_title', 'Verify your account')}</h3>
        <p className={styles.otpSub}>
          {t('auth_otp_subtitle_prefix', "We've sent a 6-digit verification code to")}
        </p>
        <div className={styles.recipientBadge}>
          <span>{challenge.maskedIdentifier}</span>
          {onChangeIdentifier && (
            <button type="button" onClick={onChangeIdentifier} className={styles.changeLink}>
              {t('auth_otp_change_email', 'Change')}
            </button>
          )}
        </div>
      </div>

      {devCodeNotice && (
        <div className={styles.devNoticeCard}>
          <CheckCircle size={14} color="#10b981" />
          <span>
            <strong>Dev Mode OTP:</strong> <code className={styles.devCode}>{devCodeNotice}</code>
          </span>
        </div>
      )}

      {error && (
        <div className={styles.errorBanner}>
          <AlertCircle size={15} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className={styles.otpForm}>
        <div className={styles.digitRow} onPaste={handlePaste}>
          {digits.map((digit, index) => (
            <input
              key={index}
              ref={(el) => {
                inputRefs.current[index] = el;
              }}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={1}
              value={digit}
              onChange={(e) => handleDigitChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              className={`${styles.digitInput} ${digit ? styles.filled : ''}`}
              disabled={isSubmitting}
              autoComplete="one-time-code"
              aria-label={`Digit ${index + 1}`}
            />
          ))}
        </div>

        <Button
          type="submit"
          variant="primary"
          size="md"
          fullWidth
          disabled={!isComplete || isSubmitting}
        >
          {isSubmitting
            ? t('auth_otp_verifying', 'Verifying...')
            : t('auth_otp_verify_btn', 'Verify & Activate Account')}
        </Button>
      </form>

      <div className={styles.otpFooter}>
        {secondsRemaining > 0 ? (
          <div className={styles.countdownText}>
            <Clock size={13} />
            <span>
              {t('auth_otp_resend_countdown', 'Resend code in')} {formatTime(secondsRemaining)}
            </span>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleResendClick}
            disabled={isResending}
            className={styles.resendBtn}
          >
            <RefreshCw size={13} className={isResending ? styles.spinning : ''} />
            <span>{t('auth_otp_resend_btn', 'Resend 6-Digit Code')}</span>
          </button>
        )}

        {onChangeIdentifier && (
          <button type="button" onClick={onChangeIdentifier} className={styles.backBtn}>
            <ArrowLeft size={13} />
            <span>{t('auth_back_to_registration', 'Back to registration')}</span>
          </button>
        )}
      </div>
    </div>
  );
};
