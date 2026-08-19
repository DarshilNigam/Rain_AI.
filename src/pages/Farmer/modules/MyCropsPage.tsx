import React, { useState } from 'react';
import { Wheat, Plus, CheckCircle, Calendar, MapPin, Droplets } from 'lucide-react';
import { Container } from '../../../components/ui/Container';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { FarmerModuleHeader } from '../components/FarmerModuleHeader';
import { useFarmerContext } from '../../../context/FarmerContext';
import { FarmerOnboardingPage } from '../onboarding/FarmerOnboardingPage';
import styles from './MyCropsPage.module.css';

export const MyCropsPage: React.FC = () => {
  const { crops, activeCropId, setActiveCropId, addCrop, fields, isProfileComplete } = useFarmerContext();

  if (!isProfileComplete) {
    return <FarmerOnboardingPage />;
  }
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [newCropName, setNewCropName] = useState('');
  const [newCropVariety, setNewCropVariety] = useState('');
  const [newCropFieldId, setNewCropFieldId] = useState(fields[0]?.id || 'field-1');
  const [newCropStage, setNewCropStage] = useState('Sowing');
  const [newCropTolerance, setNewCropTolerance] = useState<'Low' | 'Moderate' | 'High'>('Moderate');

  const handleAddCrop = (e: React.FormEvent) => {
    e.preventDefault();
    const field = fields.find((f) => f.id === newCropFieldId) || fields[0]!;
    addCrop({
      name: newCropName,
      variety: newCropVariety,
      fieldId: field.id,
      fieldName: field.name,
      sowingDate: new Date().toISOString().split('T')[0],
      currentStage: newCropStage,
      maxWaterTolerance: newCropTolerance,
      icon: '🌱',
    });
    setNewCropName('');
    setNewCropVariety('');
    setIsAddModalOpen(false);
  };

  return (
    <div className={styles.pageRoot}>
      <Container size="wide" className={styles.container}>
        <FarmerModuleHeader
          title="My Crops Registry"
          subtitle="Multi-crop seasonal monitoring, variety tracking, and field assignments"
          moduleNumber="MODULE 02"
          icon={<Wheat size={20} color="#0891b2" />}
        />

        {/* Top Actions Row */}
        <div className={styles.actionBar}>
          <div className={styles.actionLeft}>
            <span className={styles.countText}>
              <strong>{crops.length} Registered Crops</strong> in current rotation
            </span>
          </div>

          <button
            type="button"
            className={styles.addCropBtn}
            onClick={() => setIsAddModalOpen(true)}
          >
            <Plus size={15} />
            <span>Add New Crop</span>
          </button>
        </div>

        {/* Crops Grid */}
        <div className={styles.cropsGrid}>
          {crops.map((crop) => {
            const isActive = crop.id === activeCropId;

            return (
              <Card
                key={crop.id}
                variant={isActive ? 'aiAccent' : 'default'}
                padding="lg"
                className={`${styles.cropCard} ${isActive ? styles.activeCardBorder : ''}`}
              >
                <div className={styles.cardHeader}>
                  <div className={styles.cropIconWrapper}>
                    <span className={styles.cropEmoji}>{crop.icon}</span>
                  </div>

                  <div className={styles.badgeCol}>
                    {isActive ? (
                      <Badge variant="safe" showDot>
                        Active Crop Focus
                      </Badge>
                    ) : (
                      <button
                        type="button"
                        className={styles.selectActiveBtn}
                        onClick={() => setActiveCropId(crop.id)}
                      >
                        Set as Active
                      </button>
                    )}
                  </div>
                </div>

                <h3 className={styles.cropTitle}>{crop.name}</h3>
                {crop.variety && <span className={styles.varietyText}>Variety: {crop.variety}</span>}

                <div className={styles.cropMetaList}>
                  <div className={styles.metaRow}>
                    <MapPin size={13} color="#0891b2" />
                    <span>Field: <strong>{crop.fieldName}</strong></span>
                  </div>

                  <div className={styles.metaRow}>
                    <Calendar size={13} color="#ea580c" />
                    <span>Stage: <strong>{crop.currentStage}</strong></span>
                  </div>

                  <div className={styles.metaRow}>
                    <Droplets size={13} color="#0284c7" />
                    <span>Water Sensitivity: <strong>{crop.maxWaterTolerance}</strong></span>
                  </div>
                </div>

                <div className={styles.cardFooter}>
                  {isActive ? (
                    <div className={styles.activePill}>
                      <CheckCircle size={13} color="#16a34a" />
                      <span>Telemetry & AI Tailored to this Crop</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className={styles.switchFocusBtn}
                      onClick={() => setActiveCropId(crop.id)}
                    >
                      Focus Intelligence on {crop.name} →
                    </button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>

        {/* Add Crop Modal */}
        {isAddModalOpen && (
          <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
              <h3 className={styles.modalTitle}>Register New Crop</h3>
              <form onSubmit={handleAddCrop} className={styles.modalForm}>
                <div className={styles.formGroup}>
                  <label>Crop Name (e.g. Mustard, Sugarcane, Maize)</label>
                  <input
                    type="text"
                    value={newCropName}
                    onChange={(e) => setNewCropName(e.target.value)}
                    required
                    placeholder="Enter crop name"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Variety / Seed Hybrid</label>
                  <input
                    type="text"
                    value={newCropVariety}
                    onChange={(e) => setNewCropVariety(e.target.value)}
                    placeholder="e.g. Hybrid Pusa Bold"
                  />
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>Assigned Field</label>
                    <select
                      value={newCropFieldId}
                      onChange={(e) => setNewCropFieldId(e.target.value)}
                    >
                      {fields.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name} ({f.areaAcres} Acres)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label>Initial Stage</label>
                    <select
                      value={newCropStage}
                      onChange={(e) => setNewCropStage(e.target.value)}
                    >
                      <option value="Sowing">Sowing</option>
                      <option value="Germination">Germination</option>
                      <option value="Vegetative Growth">Vegetative Growth</option>
                      <option value="Flowering">Flowering</option>
                      <option value="Fruiting / Grain Filling">Fruiting / Grain Filling</option>
                      <option value="Maturity">Maturity</option>
                    </select>
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label>Water Tolerance</label>
                  <select
                    value={newCropTolerance}
                    onChange={(e) =>
                      setNewCropTolerance(e.target.value as 'Low' | 'Moderate' | 'High')
                    }
                  >
                    <option value="Low">Low (Sensitive to waterlogging)</option>
                    <option value="Moderate">Moderate (Standard drainage)</option>
                    <option value="High">High (Submergence tolerant, e.g. Paddy)</option>
                  </select>
                </div>

                <div className={styles.modalActions}>
                  <button
                    type="button"
                    className={styles.cancelBtn}
                    onClick={() => setIsAddModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className={styles.saveBtn}>
                    Add to Registry
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </Container>
    </div>
  );
};
