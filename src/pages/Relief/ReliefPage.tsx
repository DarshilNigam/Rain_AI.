import React, { useState, useEffect } from 'react';
import {
  HeartHandshake,
  MapPin,
  Compass,
  PhoneCall,
  Activity,
  CheckCircle2,
  Building2,
  ExternalLink,
  ShieldCheck,
  RotateCcw,
  Radio,
  Ambulance,
  Home,
  Droplets,
  LifeBuoy,
} from 'lucide-react';
import { Container } from '../../components/ui/Container';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { LocationSwitcher } from '../../components/ui/LocationSwitcher';
import { useLocationContext } from '../../context/LocationContext';
import { useI18n } from '../../i18n';
import { reliefService } from '../../services/relief.service';
import { emergencyService } from '../../services/emergency.service';
import { UserLocation } from '../../types/location';
import styles from './ReliefPage.module.css';

export const ReliefPage: React.FC = () => {
  const { location: userLocation } = useLocationContext();
  const { t, language } = useI18n();

  // Active location allows exploring relief logistics across cities without mutating user profile
  const [activeLocation, setActiveLocation] = useState<UserLocation>(userLocation);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState<boolean>(false);

  // Synchronize when user changes default location via profile modal
  useEffect(() => {
    setActiveLocation(userLocation);
  }, [userLocation]);

  const sdma = reliefService.getStateDisasterAuthority(activeLocation);
  const reliefResources = reliefService.getReliefResources(activeLocation);
  const nationalHelplines = emergencyService.getNationalHelplines();
  const cityDisasterCell = emergencyService.getCityDisasterCell(activeLocation);

  const isExploringOtherCity = activeLocation.city !== userLocation.city;

  const handleResetToMyLocation = () => {
    setActiveLocation(userLocation);
  };

  const getCategoryIcon = (iconName: string) => {
    switch (iconName) {
      case 'shelter':
        return <Home size={18} color="#0891b2" />;
      case 'medical':
        return <Ambulance size={18} color="#0284c7" />;
      case 'water':
      case 'food':
        return <Droplets size={18} color="#10b981" />;
      case 'rescue':
        return <LifeBuoy size={18} color="#ea580c" />;
      default:
        return <Building2 size={18} color="#7c3aed" />;
    }
  };

  return (
    <div className={styles.reliefPageRoot}>
      <Container size="wide" className={styles.pageContainer}>
        {/* Top Header Banner */}
        <div className={styles.headerBanner}>
          <div className={styles.headerLeft}>
            <div className={styles.iconCircle}>
              <HeartHandshake size={22} color="#10b981" />
            </div>
            <div className={styles.headerMeta}>
              <div className={styles.badgeRow}>
                <Badge variant="safe" showDot>
                  {language === 'hi' ? 'स्तंभ 04 • राहत एवं नागरिक सहायता' : 'Pillar 04 • Civic Relief & Aid Logistics'}
                </Badge>
                <span className={styles.centerNodeTag}>
                  ACTIVE CIVIC HUB: {activeLocation.city.toUpperCase()}
                </span>
              </div>
              <h1 className={styles.title}>{t('relief.title')}</h1>
              <p className={styles.subtitle}>
                {t('relief.subtitle')} • 📍 {activeLocation.city}, {activeLocation.region}
              </p>
            </div>
          </div>

          <div className={styles.headerRight}>
            <button
              type="button"
              className={styles.changeCenterBtn}
              onClick={() => setIsLocationModalOpen(true)}
              title="Click to switch active relief node"
            >
              <MapPin size={14} color="#10b981" />
              <span>Location: {activeLocation.city}</span>
              <Compass size={13} className={styles.compassIcon} />
            </button>
          </div>
        </div>

        {/* Exploration Notification Bar if exploring another city */}
        {isExploringOtherCity && (
          <div className={styles.explorationBar}>
            <div className={styles.explorationInfo}>
              <Radio size={15} color="#10b981" className={styles.pulseIcon} />
              <span>
                <strong>Viewing Relief Resources for:</strong> {activeLocation.city}, {activeLocation.region}
              </span>
            </div>
            <button
              type="button"
              className={styles.resetMyLocationBtn}
              onClick={handleResetToMyLocation}
            >
              <RotateCcw size={13} />
              <span>Reset to My Location ({userLocation.city})</span>
            </button>
          </div>
        )}

        {/* Localized Relief Hub Overview Hero */}
        <div className={styles.hubSummaryCard}>
          <div className={styles.hubTopRow}>
            <div className={styles.hubStatusBadge}>
              <CheckCircle2 size={16} color="#16a34a" />
              <span>Verified Civic Logistics Scope: {activeLocation.city} District</span>
            </div>
            <span className={styles.sdmaBadgeText}>{sdma.authorityName}</span>
          </div>

          <h2 className={styles.hubTitle}>
            Verified Relief & Humanitarian Logistics Network ({activeLocation.city})
          </h2>

          <p className={styles.hubDesc}>
            R.A.I. Relief coordinates authenticated disaster support channels (temporary safe havens, medical triage, potable drinking water quotas, and rescue task forces) directly mapped to verified municipal and state disaster management registries.
          </p>
        </div>

        {/* 1. Emergency Helplines & Municipal Control Center */}
        <div className={styles.sectionContainer}>
          <div className={styles.sectionHeaderBanner}>
            <PhoneCall size={18} color="#0891b2" />
            <div>
              <h3 className={styles.sectionTitle}>Direct Emergency & Life-Support Helplines</h3>
              <span className={styles.sectionSub}>
                Verified public helplines for urgent medical, rescue, and flood control assistance in {activeLocation.city}
              </span>
            </div>
          </div>

          <div className={styles.helplinesGrid}>
            {/* National Helplines */}
            {nationalHelplines.slice(0, 4).map((h) => (
              <div key={h.serviceName} className={styles.helplineCard}>
                <div className={styles.helplineCardTop}>
                  <span className={styles.helplineName}>{h.serviceName}</span>
                  <span className={styles.helplinePurpose}>{h.purpose}</span>
                </div>
                <div className={styles.helplineCardBottom}>
                  <span className={styles.helplineNumber}>{h.number}</span>
                  <a href={`tel:${h.number}`} className={styles.callBtn}>
                    <PhoneCall size={12} />
                    <span>Call Helpline</span>
                  </a>
                </div>
              </div>
            ))}

            {/* City Control Center */}
            <div className={`${styles.helplineCard} ${styles.citySpecialCard}`}>
              <div className={styles.helplineCardTop}>
                <div className={styles.cityBadge}>
                  <Building2 size={13} color="#0284c7" />
                  <span>DISTRICT DISASTER CELL</span>
                </div>
                <span className={styles.helplineName}>{cityDisasterCell.agencyName}</span>
                <span className={styles.helplinePurpose}>{cityDisasterCell.description}</span>
              </div>
              <div className={styles.helplineCardBottom}>
                <span className={styles.helplineNumber}>{cityDisasterCell.helplineNumber}</span>
                <a
                  href={`tel:${cityDisasterCell.helplineNumber.replace(/[^0-9]/g, '')}`}
                  className={styles.callBtn}
                >
                  <PhoneCall size={12} />
                  <span>Call Cell</span>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Verified Relief Resource Categories */}
        <div className={styles.sectionContainer}>
          <div className={styles.sectionHeaderBanner}>
            <ShieldCheck size={18} color="#10b981" />
            <div>
              <h3 className={styles.sectionTitle}>Local Relief & Humanitarian Resources</h3>
              <span className={styles.sectionSub}>
                Verified civic allocation categories operating in {activeLocation.city}, {activeLocation.region}
              </span>
            </div>
          </div>

          <div className={styles.resourcesGrid}>
            {reliefResources.map((res) => (
              <Card key={res.id} variant="default" padding="lg" className={styles.resourceCard}>
                <div className={styles.resourceCardTop}>
                  <div className={styles.resourceIconCircle}>
                    {getCategoryIcon(res.iconName)}
                  </div>
                  <Badge variant={res.status === 'Available' ? 'safe' : 'weather'} showDot>
                    {res.status}
                  </Badge>
                </div>

                <h4 className={styles.resourceTitle}>{res.categoryTitle}</h4>
                <p className={styles.resourceDescription}>{res.description}</p>

                <div className={styles.resourceAgencyBlock}>
                  <span className={styles.agencyLabel}>COORDINATING AUTHORITY</span>
                  <span className={styles.agencyName}>{res.primaryAgency}</span>
                </div>

                <div className={styles.resourceFooter}>
                  <span className={styles.resourceContactText}>{res.contactOrPortal}</span>
                  {res.contactOrPortal.startsWith('http') && (
                    <a
                      href={res.contactOrPortal}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.openPortalBtn}
                    >
                      <span>Official Portal</span>
                      <ExternalLink size={12} />
                    </a>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* 3. State Disaster Management Authority Card */}
        <Card variant="ice" padding="lg" className={styles.sdmaCard}>
          <div className={styles.sdmaCardContent}>
            <div className={styles.sdmaLeft}>
              <div className={styles.sdmaIcon}>
                <Building2 size={24} color="#0284c7" />
              </div>
              <div>
                <span className={styles.sdmaSuperTag}>APEX STATUTORY AUTHORITY • {activeLocation.region.toUpperCase()}</span>
                <h3 className={styles.sdmaTitle}>{sdma.authorityName}</h3>
                <p className={styles.sdmaDesc}>
                  Official state authority governing disaster mitigation, rehabilitation assistance, emergency relief funds, and district collectorate coordination across {activeLocation.region}.
                </p>
                <div className={styles.sdmaMetaRow}>
                  <span>Control Room: <strong>{sdma.controlRoomTel}</strong></span>
                  <span>Emergency Email: <strong>{sdma.emergencyEmail}</strong></span>
                </div>
              </div>
            </div>

            <div className={styles.sdmaRight}>
              <a
                href={sdma.portalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.sdmaPortalBtn}
              >
                <span>Visit Official SDMA Portal</span>
                <ExternalLink size={14} />
              </a>
            </div>
          </div>
        </Card>

        {/* Global Attribution & Integrity Notice */}
        <div className={styles.attributionStrip}>
          <div className={styles.attributionItem}>
            <Activity size={13} color="#10b981" />
            <span>
              <strong>Data Trust Policy:</strong> R.A.I. displays only verified public disaster registries and government emergency response networks. Unverified third-party donation links are strictly filtered.
            </span>
          </div>
          <div className={styles.attributionItem}>
            <span>R.A.I. Relief Module • Civic Aid Coordination Architecture</span>
          </div>
        </div>
      </Container>

      {/* Location Switcher Modal */}
      <LocationSwitcher
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
      />
    </div>
  );
};
