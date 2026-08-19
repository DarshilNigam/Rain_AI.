import React from 'react';
import { Activity, CheckCircle2, AlertCircle, Droplets, Info } from 'lucide-react';
import { Container } from '../../../components/ui/Container';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { FarmerModuleHeader } from '../components/FarmerModuleHeader';
import { useFarmerContext } from '../../../context/FarmerContext';
import { FarmerOnboardingPage } from '../onboarding/FarmerOnboardingPage';
import styles from './CropStagePage.module.css';

interface StageDefinition {
  readonly id: string;
  readonly name: string;
  readonly dayRange: string;
  readonly description: string;
  readonly waterNeed: 'Low' | 'Moderate' | 'Critical' | 'Minimal';
  readonly vulnerability: string;
  readonly actionTip: string;
}

const STAGES: readonly StageDefinition[] = [
  {
    id: 'sowing',
    name: 'Sowing / Seeding',
    dayRange: 'Days 0–7',
    description: 'Seed placement into prepared seedbed with optimal base soil moisture.',
    waterNeed: 'Moderate',
    vulnerability: 'Heavy downpours can wash away topsoil seeds and cause crust formation.',
    actionTip: 'Ensure seedbed has fine tilth and clear drainage channels before heavy rain.',
  },
  {
    id: 'germination',
    name: 'Germination & Emergence',
    dayRange: 'Days 8–18',
    description: 'First radicle and shoot emergence from the soil surface.',
    waterNeed: 'Moderate',
    vulnerability: 'Submergence for >24 hours leads to seedling rot and fungal damping-off.',
    actionTip: 'Prevent standing water; maintain soil porosity for root oxygenation.',
  },
  {
    id: 'vegetative',
    name: 'Vegetative Growth',
    dayRange: 'Days 19–50',
    description: 'Rapid canopy expansion, tillering/branching, and deep root establishment.',
    waterNeed: 'Moderate',
    vulnerability: 'Extended dry spells restrict leaf area index; high nitrogen leaching with excessive rain.',
    actionTip: 'Optimal time for weed management and split nitrogen application ahead of light showers.',
  },
  {
    id: 'flowering',
    name: 'Flowering / Anthesis',
    dayRange: 'Days 51–75',
    description: 'Pollen shedding, spike emergence, and crucial floral fertilization.',
    waterNeed: 'Critical',
    vulnerability: 'Peak sensitive phase. Rain during pollination washes away pollen; moisture stress causes flower drop.',
    actionTip: 'Hold chemical spraying during active rainfall; avoid moisture stress at all costs.',
  },
  {
    id: 'fruiting',
    name: 'Fruiting / Grain Filling',
    dayRange: 'Days 76–105',
    description: 'Photosynthate translocation into grain/boll development (milky to dough stage).',
    waterNeed: 'Critical',
    vulnerability: 'High wind gusts cause crop lodging; humid stagnant air promotes fungal earhead blight.',
    actionTip: 'Maintain uniform root moisture; inspect for pest outbreaks under high humidity.',
  },
  {
    id: 'maturity',
    name: 'Physiological Maturity',
    dayRange: 'Days 106–125',
    description: 'Grains harden, foliage yellows, and moisture content drops below 20%.',
    waterNeed: 'Minimal',
    vulnerability: 'Unseasonal showers cause pre-harvest sprouting and grain discoloration.',
    actionTip: 'Stop all irrigation 10-14 days before targeted harvest date.',
  },
  {
    id: 'harvest',
    name: 'Harvest Ready',
    dayRange: 'Days 126+',
    description: 'Optimal dry matter accumulation ready for manual or combine harvesting.',
    waterNeed: 'Minimal',
    vulnerability: 'Rain completely halts combine machinery and increases post-harvest drying losses.',
    actionTip: 'Harvest during clear weather windows forecasted by R.A.I. weather radar.',
  },
];

export const CropStagePage: React.FC = () => {
  const { activeCrop, updateCropStage, crops, setActiveCropId, isProfileComplete } = useFarmerContext();

  if (!isProfileComplete) {
    return <FarmerOnboardingPage />;
  }

  const currentStageIndex = STAGES.findIndex(
    (s) => s.name.toLowerCase().includes(activeCrop.currentStage.toLowerCase())
  );
  const activeStageDef = STAGES[currentStageIndex >= 0 ? currentStageIndex : 2]!;

  return (
    <div className={styles.pageRoot}>
      <Container size="wide" className={styles.container}>
        <FarmerModuleHeader
          title="Crop Stage & Phenology"
          subtitle={`Tracking physiological growth phase and weather vulnerabilities for ${activeCrop.name}`}
          moduleNumber="MODULE 03"
          icon={<Activity size={20} color="#0284c7" />}
        />

        {/* Crop Selector Switcher */}
        <div className={styles.cropSelectorBar}>
          <span className={styles.selectorLabel}>ACTIVE CROP FOCUS:</span>
          <div className={styles.cropTabs}>
            {crops.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`${styles.cropTab} ${c.id === activeCrop.id ? styles.activeCropTab : ''}`}
                onClick={() => setActiveCropId(c.id)}
              >
                <span>{c.icon} {c.name}</span>
                <span className={styles.tabStagePill}>{c.currentStage}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Active Stage Spotlight Hero */}
        <Card variant="aiAccent" padding="lg" className={styles.spotlightCard}>
          <div className={styles.spotlightTop}>
            <div>
              <div className={styles.stageTagRow}>
                <Badge variant="safe" showDot>
                  Current Phase
                </Badge>
                <span className={styles.stageRange}>{activeStageDef.dayRange}</span>
              </div>
              <h2 className={styles.stageName}>
                {activeCrop.name} • {activeStageDef.name}
              </h2>
              <p className={styles.stageDesc}>{activeStageDef.description}</p>
            </div>

            <div className={styles.waterBadgeCol}>
              <span className={styles.waterLabel}>WATER REQUIREMENT</span>
              <span
                className={`${styles.waterNeedBadge} ${
                  activeStageDef.waterNeed === 'Critical'
                    ? styles.criticalWater
                    : activeStageDef.waterNeed === 'Moderate'
                    ? styles.moderateWater
                    : styles.minimalWater
                }`}
              >
                <Droplets size={14} />
                <span>{activeStageDef.waterNeed} Need</span>
              </span>
            </div>
          </div>

          <div className={styles.vulnerabilityGrid}>
            <div className={styles.vulnBox}>
              <AlertCircle size={16} color="#ea580c" />
              <div>
                <strong>Key Weather Vulnerability:</strong>
                <p>{activeStageDef.vulnerability}</p>
              </div>
            </div>

            <div className={styles.actionBox}>
              <Info size={16} color="#0891b2" />
              <div>
                <strong>Agronomic Recommendation:</strong>
                <p>{activeStageDef.actionTip}</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Full Phenological Stage Track */}
        <div className={styles.trackSection}>
          <h3 className={styles.trackHeading}>Crop Growth Progression Track</h3>
          <p className={styles.trackSub}>Click any stage to update the active phase of your {activeCrop.name}</p>

          <div className={styles.stagesList}>
            {STAGES.map((st, idx) => {
              const isCurrent = st.name === activeCrop.currentStage;
              const isPast = currentStageIndex >= 0 && idx < currentStageIndex;

              return (
                <div
                  key={st.id}
                  className={`${styles.stageRowItem} ${isCurrent ? styles.currentStageRow : ''} ${
                    isPast ? styles.pastStageRow : ''
                  }`}
                  onClick={() => updateCropStage(activeCrop.id, st.name)}
                >
                  <div className={styles.stageIndexBadge}>
                    {isPast ? <CheckCircle2 size={16} color="#16a34a" /> : <span>0{idx + 1}</span>}
                  </div>

                  <div className={styles.stageItemInfo}>
                    <div className={styles.stageItemTop}>
                      <strong className={styles.stageItemName}>{st.name}</strong>
                      <span className={styles.stageItemDays}>{st.dayRange}</span>
                      {isCurrent && (
                        <span className={styles.activePillTag}>ACTIVE FOCUS</span>
                      )}
                    </div>
                    <span className={styles.stageItemSummary}>{st.description}</span>
                  </div>

                  <button
                    type="button"
                    className={styles.updateStageBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      updateCropStage(activeCrop.id, st.name);
                    }}
                  >
                    {isCurrent ? 'Current Phase' : 'Set to this Phase'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </Container>
    </div>
  );
};
