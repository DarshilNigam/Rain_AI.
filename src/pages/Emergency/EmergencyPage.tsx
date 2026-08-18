import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  ShieldCheck,
  Radio,
  MapPin,
  Compass,
  PhoneCall,
  Clock,
  ExternalLink,
  RotateCcw,
  CloudRain,
  Wind,
  Zap,
  Activity,
  CheckCircle2,
  Building2,
  Info,
} from 'lucide-react';
import { Container } from '../../components/ui/Container';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { LocationSwitcher } from '../../components/ui/LocationSwitcher';
import { useLocationContext } from '../../context/LocationContext';
import { useWeatherData } from '../../hooks/useWeatherData';
import { useI18n } from '../../i18n';
import { warningService } from '../../services/warning.service';
import { emergencyService } from '../../services/emergency.service';
import { UserLocation } from '../../types/location';
import styles from './EmergencyPage.module.css';

export const EmergencyPage: React.FC = () => {
  const { location: userLocation } = useLocationContext();
  const { t, language } = useI18n();

  // Active location allows exploring emergency status across cities without mutating user profile
  const [activeLocation, setActiveLocation] = useState<UserLocation>(userLocation);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState<boolean>(false);

  // Synchronize when user changes default location via profile modal
  useEffect(() => {
    setActiveLocation(userLocation);
  }, [userLocation]);

  // Fetch real Open-Meteo weather telemetry for the active location
  const { weatherData, isLoading: weatherLoading } = useWeatherData(activeLocation);

  // Compute location-specific emergency evaluation from real telemetry
  const riskEval = warningService.evaluateEmergencyRisk(activeLocation, weatherData);
  const nationalHelplines = emergencyService.getNationalHelplines();
  const cityDisasterCell = emergencyService.getCityDisasterCell(activeLocation);

  const isExploringOtherCity = activeLocation.city !== userLocation.city;

  const handleResetToMyLocation = () => {
    setActiveLocation(userLocation);
  };

  return (
    <div className={styles.emergencyPageRoot}>
      <Container size="wide" className={styles.pageContainer}>
        {/* Top Header Banner */}
        <div className={styles.headerBanner}>
          <div className={styles.headerLeft}>
            <div className={styles.iconCircle}>
              <AlertTriangle size={22} color="#ea580c" />
            </div>
            <div className={styles.headerMeta}>
              <div className={styles.badgeRow}>
                <Badge variant="caution" showDot>
                  {language === 'hi' ? 'स्तंभ 03 • आपातकालीन व जीवन सुरक्षा' : 'Pillar 03 • Emergency & Life Safety'}
                </Badge>
                <span className={styles.centerNodeTag}>
                  ACTIVE NODE: {activeLocation.city.toUpperCase()}
                </span>
              </div>
              <h1 className={styles.title}>{t('emergency.title')}</h1>
              <p className={styles.subtitle}>
                {t('emergency.subtitle')} • 📍 {activeLocation.city}, {activeLocation.region}
              </p>
            </div>
          </div>

          <div className={styles.headerRight}>
            <button
              type="button"
              className={styles.changeCenterBtn}
              onClick={() => setIsLocationModalOpen(true)}
              title="Click to switch active city node"
            >
              <MapPin size={14} color="#ea580c" />
              <span>Location: {activeLocation.city}</span>
              <Compass size={13} className={styles.compassIcon} />
            </button>
          </div>
        </div>

        {/* Exploration Notification Bar if exploring another city */}
        {isExploringOtherCity && (
          <div className={styles.explorationBar}>
            <div className={styles.explorationInfo}>
              <Radio size={15} color="#ea580c" className={styles.pulseIcon} />
              <span>
                <strong>Viewing Emergency Intelligence for:</strong> {activeLocation.city}, {activeLocation.region}
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

        {/* 1. Emergency Status Hero Card */}
        <div
          className={styles.heroStatusCard}
          style={{
            borderColor:
              riskEval.status === 'SEVERE'
                ? '#fca5a5'
                : riskEval.status === 'ALERT'
                ? '#fdba74'
                : riskEval.status === 'WATCH'
                ? '#fde68a'
                : '#bbf7d0',
          }}
        >
          <div className={styles.heroStatusTopRow}>
            <div className={styles.heroStatusBadgeRow}>
              <div
                className={styles.statusPulseDot}
                style={{ backgroundColor: riskEval.statusColor, boxShadow: `0 0 10px ${riskEval.statusColor}` }}
              />
              <span className={styles.statusLevelText} style={{ color: riskEval.statusColor }}>
                CURRENT RISK STATUS: {riskEval.statusLabel}
              </span>
            </div>
            <span className={styles.heroLocationScope}>
              Jurisdiction: {activeLocation.city} Meteorological Sector
            </span>
          </div>

          <h2 className={styles.heroHeadline}>
            {activeLocation.city}, {activeLocation.region} • {riskEval.statusLabel} Risk Tier
          </h2>

          <p className={styles.heroDescription}>
            {weatherLoading ? 'Synchronizing live meteorological observations from Open-Meteo...' : riskEval.statusDescription}
          </p>

          <div className={styles.heroDistinctionFootnote}>
            <Info size={13} color="#64748b" />
            <span>
              <strong>Integrity Notice:</strong> Status is computed directly from real-time physical observations (precipitation, pressure, wind velocity). Official government advisories are reported separately below.
            </span>
          </div>
        </div>

        {/* 2. Real Weather Risk Signals Grid */}
        <div className={styles.signalsGrid}>
          <div className={styles.signalCard}>
            <div className={styles.signalHeader}>
              <CloudRain size={16} color="#0284c7" />
              <span className={styles.signalLabel}>PRECIPITATION SIGNAL</span>
            </div>
            <span className={styles.signalValue}>{riskEval.rainSignal}</span>
            <span className={styles.signalSub}>
              {weatherData?.current ? `Current: ${weatherData.current.precipitation} mm` : 'Synchronizing...'}
            </span>
          </div>

          <div className={styles.signalCard}>
            <div className={styles.signalHeader}>
              <Wind size={16} color="#0891b2" />
              <span className={styles.signalLabel}>WIND & GUST INTENSITY</span>
            </div>
            <span className={styles.signalValue}>{riskEval.windSignal}</span>
            <span className={styles.signalSub}>
              {weatherData?.current ? `Direction: ${weatherData.current.windDirection}°` : 'Synchronizing...'}
            </span>
          </div>

          <div className={styles.signalCard}>
            <div className={styles.signalHeader}>
              <Zap size={16} color="#d97706" />
              <span className={styles.signalLabel}>THUNDERSTORM POTENTIAL</span>
            </div>
            <span className={styles.signalValue}>{riskEval.thunderstormSignal}</span>
            <span className={styles.signalSub}>
              {weatherData?.current ? `Surface Pressure: ${weatherData.current.pressure.toFixed(0)} hPa` : 'Synchronizing...'}
            </span>
          </div>

          <div className={styles.signalCard}>
            <div className={styles.signalHeader}>
              <Clock size={16} color="#16a34a" />
              <span className={styles.signalLabel}>NEXT 6 HOURS OUTLOOK</span>
            </div>
            <span className={styles.signalValue}>{riskEval.next6hSignal}</span>
            <span className={styles.signalSub}>Short-range convective window</span>
          </div>

          <div className={styles.signalCard}>
            <div className={styles.signalHeader}>
              <Activity size={16} color="#7c3aed" />
              <span className={styles.signalLabel}>NEXT 24 HOURS PROJECTION</span>
            </div>
            <span className={styles.signalValue}>{riskEval.next24hSignal}</span>
            <span className={styles.signalSub}>Diurnal cycle accumulation</span>
          </div>
        </div>

        {/* Two-Column Middle Section: Official Warnings & Upcoming Timeline */}
        <div className={styles.middleSectionGrid}>
          {/* Left: Official Weather Warnings Layer (IMD / NDMA SACHET) */}
          <div className={styles.warningsPane}>
            <Card variant="default" padding="lg" className={styles.officialWarningCard}>
              <div className={styles.sectionTitleRow}>
                <div className={styles.titleIconBadge}>
                  <Radio size={16} color="#ea580c" />
                </div>
                <div>
                  <h3 className={styles.sectionHeading}>Official Government Weather Warnings</h3>
                  <span className={styles.sectionSubHeading}>
                    Verified feeds from India Meteorological Department (IMD) & NDMA SACHET
                  </span>
                </div>
              </div>

              {riskEval.officialWarnings.length > 0 ? (
                <div className={styles.officialAlertsList}>
                  {riskEval.officialWarnings.map((alert) => (
                    <div key={alert.id} className={styles.officialAlertItem}>
                      <div className={styles.alertItemHeader}>
                        <Badge
                          variant={
                            alert.severityColor === 'red'
                              ? 'critical'
                              : alert.severityColor === 'orange'
                              ? 'caution'
                              : 'weather'
                          }
                          showDot
                        >
                          {alert.source} • {alert.hazard}
                        </Badge>
                        <span className={styles.alertValidUntil}>Valid: {alert.validUntil}</span>
                      </div>
                      <h4 className={styles.alertHeadline}>{alert.headline}</h4>
                      <p className={styles.alertDescription}>{alert.description}</p>
                      <div className={styles.alertFooterRow}>
                        <span className={styles.alertAreaTag}>Area: {alert.area}</span>
                        <a
                          href={alert.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.viewSourceLink}
                        >
                          <span>View Official Portal</span>
                          <ExternalLink size={12} />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={styles.noOfficialWarningBox}>
                  <ShieldCheck size={24} color="#16a34a" />
                  <div className={styles.noWarningText}>
                    <strong>No active severe weather warning bulletin issued for {activeLocation.city}.</strong>
                    <p>
                      The India Meteorological Department (IMD) and National Disaster Management Authority (NDMA SACHET) do not currently report active cyclone or flash flood emergencies for this district.
                    </p>
                  </div>
                  <div className={styles.officialLinksRow}>
                    <a
                      href="https://mausam.imd.gov.in/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.portalBadgeLink}
                    >
                      <span>Check IMD National Portal</span>
                      <ExternalLink size={11} />
                    </a>
                    <a
                      href="https://sachet.ndma.gov.in/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.portalBadgeLink}
                    >
                      <span>Check NDMA SACHET Feed</span>
                      <ExternalLink size={11} />
                    </a>
                  </div>
                </div>
              )}
            </Card>
          </div>

          {/* Right: Upcoming Weather Timeline */}
          <div className={styles.timelinePane}>
            <Card variant="ice" padding="lg" className={styles.timelineCard}>
              <div className={styles.sectionTitleRow}>
                <div className={styles.titleIconBadge}>
                  <Clock size={16} color="#0284c7" />
                </div>
                <div>
                  <h3 className={styles.sectionHeading}>Upcoming Weather Trajectory</h3>
                  <span className={styles.sectionSubHeading}>
                    Real forecast steps for {activeLocation.city} (Open-Meteo)
                  </span>
                </div>
              </div>

              {riskEval.timeline.length > 0 ? (
                <div className={styles.timelineList}>
                  {riskEval.timeline.map((pt, idx) => (
                    <div key={pt.label} className={styles.timelineItem}>
                      <div className={styles.timelineMarkerCol}>
                        <div className={styles.timelineNodeDot} />
                        {idx < riskEval.timeline.length - 1 && <div className={styles.timelineLine} />}
                      </div>
                      <div className={styles.timelineContent}>
                        <div className={styles.timelineTimeRow}>
                          <span className={styles.timelineLabel}>{pt.label}</span>
                          <span className={styles.timelineHour}>{pt.timeStr}</span>
                          <span className={styles.timelineSignalBadge}>{pt.signal}</span>
                        </div>
                        <div className={styles.timelineMetricsRow}>
                          <span>Rain: <strong>{pt.rainfallMm} mm</strong> ({pt.rainProbability}% prob)</span>
                          <span>Wind: <strong>{pt.windKmh} km/h</strong></span>
                          <span>Temp: <strong>{pt.tempC}°C</strong></span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={styles.loadingTimelineBox}>
                  <span>Loading trajectory telemetry...</span>
                </div>
              )}
            </Card>
          </div>
        </div>

        {/* 3. Contextual Preparedness: "What Should I Do?" */}
        <Card variant="aiAccent" padding="lg" className={styles.preparednessCard}>
          <div className={styles.preparednessHeader}>
            <CheckCircle2 size={20} color="#0891b2" />
            <div>
              <h3 className={styles.preparednessTitle}>
                {t('emergency.whatShouldIDo')} • {language === 'hi' ? `सुरक्षा प्रोटोकॉल (${activeLocation.city})` : `Contextual Safety Protocols (${activeLocation.city})`}
              </h3>
              <p className={styles.preparednessSub}>
                {language === 'hi' ? `वर्तमान ${riskEval.statusLabel} जोखिम स्तर के अनुसार व्यावहारिक निर्देश।` : `Practical recommendations aligned with current ${riskEval.statusLabel} risk tier.`}
              </p>
            </div>
          </div>

          <div className={styles.adviceList}>
            {riskEval.preparednessAdvice.map((advice, i) => (
              <div key={i} className={styles.adviceItem}>
                <span className={styles.adviceBullet}>{i + 1}</span>
                <span className={styles.adviceText}>{advice}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* 4. Verified Emergency Helplines & Municipal Control Room */}
        <div className={styles.emergencyDirectorySection}>
          <div className={styles.sectionHeaderBanner}>
            <PhoneCall size={18} color="#ea580c" />
            <div>
              <h3 className={styles.directoryTitle}>{t('emergency.helplineTitle')}</h3>
              <span className={styles.directorySub}>
                {language === 'hi' ? `${activeLocation.city} और राष्ट्रीय स्तर के आधिकारिक आपातकालीन नंबर` : `Direct government emergency contact channels for ${activeLocation.city} and national response`}
              </span>
            </div>
          </div>

          <div className={styles.directoryGrid}>
            {/* National Helplines Cards */}
            {nationalHelplines.map((contact) => (
              <div key={contact.serviceName} className={styles.contactCard}>
                <div className={styles.contactCardTop}>
                  <div>
                    <span className={styles.contactCardName}>{contact.serviceName}</span>
                    <span className={styles.contactCardPurpose}>{contact.purpose}</span>
                  </div>
                </div>

                <div className={styles.contactCardBottom}>
                  <span className={styles.contactTelText}>{contact.number}</span>
                  <a href={`tel:${contact.number}`} className={styles.callBtn}>
                    <PhoneCall size={12} />
                    <span>{t('emergency.callNow')}</span>
                  </a>
                </div>
              </div>
            ))}

            {/* City-Specific Municipal Control Room Card */}
            <div className={`${styles.contactCard} ${styles.citySpecialCard}`}>
              <div className={styles.contactCardTop}>
                <div className={styles.cityCardBadge}>
                  <Building2 size={14} color="#0284c7" />
                  <span>LOCAL MUNICIPAL CONTROL CELL</span>
                </div>
                <span className={styles.contactCardName}>{cityDisasterCell.agencyName}</span>
                <span className={styles.contactCardPurpose}>{cityDisasterCell.description}</span>
                <span className={styles.cityAddressText}>{cityDisasterCell.address}</span>
              </div>

              <div className={styles.contactCardBottom}>
                <span className={styles.contactTelText}>{cityDisasterCell.helplineNumber}</span>
                <div className={styles.cityActionBtns}>
                  <a
                    href={`tel:${cityDisasterCell.helplineNumber.replace(/[^0-9]/g, '')}`}
                    className={styles.callBtn}
                  >
                    <PhoneCall size={12} />
                    <span>Call Cell</span>
                  </a>
                  <a
                    href={cityDisasterCell.officialPortalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.portalLinkBtn}
                  >
                    <ExternalLink size={12} />
                    <span>Portal</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Global Emergency Attribution Strip */}
        <div className={styles.attributionStrip}>
          <div className={styles.attributionItem}>
            <Activity size={13} color="#ea580c" />
            <span>
              <strong>Data Sources:</strong> Open-Meteo API (Meteorological Observations) • India Meteorological Department (IMD Warnings) • NDMA SACHET (CAP Disaster Feeds)
            </span>
          </div>
          <div className={styles.attributionItem}>
            <span>R.A.I. Emergency Module • Life Safety & Disaster Mitigation Architecture</span>
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
