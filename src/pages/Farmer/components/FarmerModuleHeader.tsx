import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Sparkles, Settings } from 'lucide-react';
import { useFarmerContext } from '../../../context/FarmerContext';
import styles from './FarmerModuleHeader.module.css';

interface FarmerModuleHeaderProps {
  readonly title: string;
  readonly subtitle: string;
  readonly moduleNumber?: string;
  readonly icon?: React.ReactNode;
}

export const FarmerModuleHeader: React.FC<FarmerModuleHeaderProps> = ({
  title,
  subtitle,
  moduleNumber,
  icon,
}) => {
  const navigate = useNavigate();
  const { farmerLocation, activeCrop } = useFarmerContext();

  return (
    <div className={styles.headerWrapper}>
      {/* Top Nav & Breadcrumb Bar */}
      <div className={styles.topBar}>
        <button
          type="button"
          className={styles.backBtn}
          onClick={() => navigate('/farmer')}
          title="Return to Farmer Command Center"
        >
          <ArrowLeft size={14} />
          <span>← Farmer Command Center</span>
        </button>

        <div className={styles.metaRight}>
          <div className={styles.locationPill}>
            <MapPin size={12} color="#16a34a" />
            <span>
              {farmerLocation.village}, {farmerLocation.district}, {farmerLocation.state}
            </span>
            <button
              type="button"
              className={styles.changeLocBtn}
              onClick={() => navigate('/farmer/profile/edit')}
              title="Change Farm Location"
            >
              <Settings size={10} />
              <span>Change</span>
            </button>
          </div>

          <div className={styles.activeCropPill}>
            <span className={styles.cropIcon}>{activeCrop.icon}</span>
            <span>Active: {activeCrop.name} ({activeCrop.currentStage})</span>
          </div>
        </div>
      </div>

      {/* Main Title Banner */}
      <div className={styles.titleCard}>
        <div className={styles.titleLeft}>
          {icon && <div className={styles.iconCircle}>{icon}</div>}
          <div>
            <div className={styles.breadcrumbRow}>
              <span className={styles.breadcrumb}>R.A.I.</span>
              <span className={styles.separator}>/</span>
              <span className={styles.breadcrumb}>Farmer Intelligence</span>
              {moduleNumber && (
                <>
                  <span className={styles.separator}>/</span>
                  <span className={styles.moduleTag}>{moduleNumber}</span>
                </>
              )}
            </div>
            <h1 className={styles.title}>{title}</h1>
            <p className={styles.subtitle}>{subtitle}</p>
          </div>
        </div>

        <div className={styles.aiAssistQuickAction}>
          <button
            type="button"
            className={styles.openAiBtn}
            onClick={() => navigate('/farmer/ai')}
          >
            <Sparkles size={13} color="#16a34a" />
            <span>Consult Farmer AI</span>
          </button>
        </div>
      </div>
    </div>
  );
};
