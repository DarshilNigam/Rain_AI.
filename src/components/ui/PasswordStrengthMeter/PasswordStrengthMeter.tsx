import React from 'react';
import { Check, X } from 'lucide-react';
import { PasswordPolicyCheck } from '../../../types/auth';
import { useI18n } from '../../../i18n';
import styles from './PasswordStrengthMeter.module.css';

interface PasswordStrengthMeterProps {
  readonly policy: PasswordPolicyCheck;
  readonly showChecklist?: boolean;
}

export const PasswordStrengthMeter: React.FC<PasswordStrengthMeterProps> = ({
  policy,
  showChecklist = true,
}) => {
  const { t } = useI18n();

  const getStrengthLevel = () => {
    switch (policy.strength) {
      case 'STRONG':
        return { count: 4, label: t('auth_password_strength_strong', 'Strong'), colorClass: styles.strong };
      case 'GOOD':
        return { count: 3, label: t('auth_password_strength_good', 'Good'), colorClass: styles.good };
      case 'FAIR':
        return { count: 2, label: t('auth_password_strength_fair', 'Fair'), colorClass: styles.fair };
      default:
        return { count: 1, label: t('auth_password_strength_weak', 'Weak'), colorClass: styles.weak };
    }
  };

  const current = getStrengthLevel();

  const rules = [
    { label: t('auth_password_req_12_chars', '12+ characters'), met: policy.isMinLength },
    { label: t('auth_password_req_uppercase', 'Uppercase letter (A-Z)'), met: policy.hasUppercase },
    { label: t('auth_password_req_lowercase', 'Lowercase letter (a-z)'), met: policy.hasLowercase },
    { label: t('auth_password_req_number', 'Number (0-9)'), met: policy.hasNumber },
    { label: t('auth_password_req_special', 'Special character (!@#$%^&*)'), met: policy.hasSpecialChar },
  ];

  return (
    <div className={styles.meterContainer}>
      <div className={styles.strengthHeader}>
        <span className={styles.headerLabel}>{t('auth_password_strength_label', 'Password Strength')}:</span>
        <span className={`${styles.strengthBadge} ${current.colorClass}`}>{current.label}</span>
      </div>

      <div className={styles.barsRow}>
        {[1, 2, 3, 4].map((step) => (
          <div
            key={step}
            className={`${styles.barSegment} ${step <= current.count ? current.colorClass : styles.inactiveBar}`}
          />
        ))}
      </div>

      {showChecklist && (
        <div className={styles.checklistGrid}>
          {rules.map((rule, idx) => (
            <div key={idx} className={`${styles.checkItem} ${rule.met ? styles.met : styles.unmet}`}>
              {rule.met ? (
                <Check size={13} className={styles.checkIcon} />
              ) : (
                <X size={13} className={styles.xIcon} />
              )}
              <span>{rule.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
