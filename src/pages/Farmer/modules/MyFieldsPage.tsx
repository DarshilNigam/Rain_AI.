import React, { useState } from 'react';
import { Grid, Plus, MapPin, Layers, Droplets, Edit3 } from 'lucide-react';
import { Container } from '../../../components/ui/Container';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { FarmerModuleHeader } from '../components/FarmerModuleHeader';
import { useFarmerContext } from '../../../context/FarmerContext';
import { FarmField } from '../../../types/farmer';
import styles from './MyFieldsPage.module.css';

export const MyFieldsPage: React.FC = () => {
  const { fields, addField, crops } = useFarmerContext();
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [editingField, setEditingField] = useState<FarmField | null>(null);

  const [name, setName] = useState('');
  const [area, setArea] = useState<number>(3.5);
  const [cropId, setCropId] = useState(crops[0]?.id || '');
  const [soilTexture, setSoilTexture] = useState('Clayey / Black Cotton');
  const [irrigationMethod, setIrrigationMethod] = useState('Drip Sprinkler');

  const handleAddField = (e: React.FormEvent) => {
    e.preventDefault();
    const assignedCrop = crops.find((c) => c.id === cropId);
    addField({
      name,
      areaAcres: area,
      cropId: assignedCrop?.id,
      cropName: assignedCrop?.name || 'Fallow',
      soilTexture,
      irrigationMethod,
    });
    setName('');
    setIsAddModalOpen(false);
  };

  const totalFarmAcreage = fields.reduce((sum, f) => sum + f.areaAcres, 0);

  return (
    <div className={styles.pageRoot}>
      <Container size="wide" className={styles.container}>
        <FarmerModuleHeader
          title="My Fields & Plot Boundaries"
          subtitle="Multi-parcel field division, soil mapping, and plot-level acreage"
          moduleNumber="MODULE 10"
          icon={<Grid size={20} color="#16a34a" />}
        />

        {/* Top Actions Row */}
        <div className={styles.actionBar}>
          <div>
            <span className={styles.countText}>
              <strong>{fields.length} Field Plots Registered</strong> ({totalFarmAcreage.toFixed(1)} Total Acres)
            </span>
          </div>

          <button
            type="button"
            className={styles.addFieldBtn}
            onClick={() => setIsAddModalOpen(true)}
          >
            <Plus size={15} />
            <span>Add New Field Plot</span>
          </button>
        </div>

        {/* Fields Grid */}
        <div className={styles.fieldsGrid}>
          {fields.map((field) => (
            <Card key={field.id} variant="default" padding="lg" className={styles.fieldCard}>
              <div className={styles.fieldHeader}>
                <div className={styles.fieldIconCircle}>
                  <Grid size={18} color="#16a34a" />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Badge variant="safe" showDot>
                    {field.areaAcres} Acres
                  </Badge>
                  <button
                    type="button"
                    className={styles.editFieldSmallBtn}
                    onClick={() => setEditingField(field)}
                    title="Edit Field Plot"
                  >
                    <Edit3 size={12} />
                  </button>
                </div>
              </div>

              <h3 className={styles.fieldName}>{field.name}</h3>

              <div className={styles.propsList}>
                <div className={styles.propRow}>
                  <Layers size={13} color="#0891b2" />
                  <span>Crop: <strong>{field.cropName || 'Fallow / Unseeded'}</strong></span>
                </div>

                <div className={styles.propRow}>
                  <MapPin size={13} color="#ea580c" />
                  <span>Soil Texture: <strong>{field.soilTexture}</strong></span>
                </div>

                <div className={styles.propRow}>
                  <Droplets size={13} color="#0284c7" />
                  <span>Irrigation: <strong>{field.irrigationMethod}</strong></span>
                </div>
              </div>

              <div className={styles.fieldFooter}>
                <span className={styles.gisReadyTag}>GIS Boundary: GeoJSON Ready</span>
              </div>
            </Card>
          ))}
        </div>

        {/* Add Field Modal */}
        {isAddModalOpen && (
          <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
              <h3 className={styles.modalTitle}>Register New Field Parcel</h3>
              <form onSubmit={handleAddField} className={styles.modalForm}>
                <div className={styles.formGroup}>
                  <label>Field Name (e.g. West Canal Plot)</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="Enter field name"
                  />
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>Acreage (Acres)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={area}
                      onChange={(e) => setArea(parseFloat(e.target.value) || 0)}
                      required
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label>Assigned Crop</label>
                    <select value={cropId} onChange={(e) => setCropId(e.target.value)}>
                      <option value="">-- Fallow / None --</option>
                      {crops.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.variety || 'Standard'})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>Soil Texture</label>
                    <select
                      value={soilTexture}
                      onChange={(e) => setSoilTexture(e.target.value)}
                    >
                      <option value="Clayey / Black Cotton">Clayey / Black Cotton</option>
                      <option value="Alluvial Silt Loam">Alluvial Silt Loam</option>
                      <option value="Red Sandy Loam">Red Sandy Loam</option>
                      <option value="Sandy Loam">Sandy Loam</option>
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label>Irrigation System</label>
                    <select
                      value={irrigationMethod}
                      onChange={(e) => setIrrigationMethod(e.target.value)}
                    >
                      <option value="Drip / Furrow">Drip / Furrow</option>
                      <option value="Canal Flooding">Canal Flooding</option>
                      <option value="Drip Sprinkler">Drip Sprinkler</option>
                      <option value="Tube-well Border">Tube-well Border</option>
                    </select>
                  </div>
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
                    Save Field Plot
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Quick Edit Field Modal */}
        {editingField && (
          <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
              <h3 className={styles.modalTitle}>Edit Field: {editingField.name}</h3>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setEditingField(null);
                }}
                className={styles.modalForm}
              >
                <div className={styles.formGroup}>
                  <label>Field Name</label>
                  <input
                    type="text"
                    defaultValue={editingField.name}
                    required
                  />
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>Acreage (Acres)</label>
                    <input
                      type="number"
                      step="0.1"
                      defaultValue={editingField.areaAcres}
                      required
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label>Soil Texture</label>
                    <select defaultValue={editingField.soilTexture}>
                      <option value="Clayey / Black Cotton">Clayey / Black Cotton</option>
                      <option value="Alluvial Silt Loam">Alluvial Silt Loam</option>
                      <option value="Red Sandy Loam">Red Sandy Loam</option>
                      <option value="Sandy Loam">Sandy Loam</option>
                    </select>
                  </div>
                </div>

                <div className={styles.modalActions}>
                  <button
                    type="button"
                    className={styles.cancelBtn}
                    onClick={() => setEditingField(null)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className={styles.saveBtn}>
                    Update Field
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
