import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Layers,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Eye,
  EyeOff,
} from 'lucide-react';
import { UserLocation, PRESET_CITIES } from '../../../types/location';
import { radarService, RadarFrameInfo } from '../../../services/radar.service';
import styles from './InteractiveRiskMap.module.css';

interface InteractiveRiskMapProps {
  readonly userLocation: UserLocation;
  readonly activeLocation: UserLocation;
  readonly onSelectCity: (loc: UserLocation) => void;
  readonly radarEnabled: boolean;
  readonly onToggleRadar: () => void;
  readonly className?: string;
}

export const InteractiveRiskMap: React.FC<InteractiveRiskMapProps> = ({
  userLocation,
  activeLocation,
  onSelectCity,
  radarEnabled,
  onToggleRadar,
  className,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const stationMarkersRef = useRef<Map<string, L.Marker>>(new Map());
  const radarLayerRef = useRef<L.TileLayer | null>(null);

  const [radarFrame, setRadarFrame] = useState<RadarFrameInfo | null>(null);
  const [radarLoading, setRadarLoading] = useState<boolean>(false);
  const [radarError, setRadarError] = useState<string | null>(null);
  const [mapInitialized, setMapInitialized] = useState<boolean>(false);

  // Helper to construct custom HTML icons based on active/saved status
  const getCityIcon = useCallback(
    (cityObj: UserLocation, isActive: boolean, isUserSaved: boolean) => {
      if (isActive) {
        return L.divIcon({
          className: styles.activeMarkerWrapper,
          html: `
            <div class="${styles.activePulseRing}"></div>
            <div class="${styles.activeCoreDot}"></div>
            <div class="${styles.activeLabelPill}">
              <span>📍 ${cityObj.city}</span>
            </div>
          `,
          iconSize: [120, 38],
          iconAnchor: [60, 19],
        });
      }

      if (isUserSaved) {
        return L.divIcon({
          className: styles.savedMarkerWrapper,
          html: `
            <div class="${styles.savedDot}"></div>
            <div class="${styles.savedLabelPill}">
              <span>🏠 ${cityObj.city} (My Node)</span>
            </div>
          `,
          iconSize: [120, 32],
          iconAnchor: [60, 16],
        });
      }

      return L.divIcon({
        className: styles.stationMarkerWrapper,
        html: `
          <div class="${styles.stationDot}"></div>
          <div class="${styles.stationLabel}">
            <span>${cityObj.city}</span>
          </div>
        `,
        iconSize: [90, 28],
        iconAnchor: [45, 14],
      });
    },
    []
  );

  // 1. Initialize Map on Mount
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [activeLocation.lat, activeLocation.lng],
      zoom: 9,
      minZoom: 4,
      maxZoom: 18,
      zoomControl: false,
      attributionControl: false,
    });

    // Atmospheric Light Base Map (CartoDB Positron / OSM)
    const baseLayer = L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
      {
        subdomains: 'abcd',
        minZoom: 3,
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener">CARTO</a>',
      }
    );
    baseLayer.addTo(map);

    // Transparent attribution
    L.control
      .attribution({
        position: 'bottomleft',
        prefix: false,
      })
      .addAttribution(
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> | Radar &copy; <a href="https://www.rainviewer.com/api.html" target="_blank" rel="noopener">RainViewer</a>'
      )
      .addTo(map);

    // Render All Supported Indian Cities as Interactive Clickable Markers
    PRESET_CITIES.forEach((cityObj) => {
      const isActive = cityObj.city === activeLocation.city;
      const isUserSaved = cityObj.city === userLocation.city;

      const marker = L.marker([cityObj.lat, cityObj.lng], {
        icon: getCityIcon(cityObj, isActive, isUserSaved),
        zIndexOffset: isActive ? 2000 : isUserSaved ? 1500 : 1000,
      }).addTo(map);

      // Handle direct city click/touch
      marker.on('click', () => {
        onSelectCity(cityObj);
      });

      stationMarkersRef.current.set(cityObj.city, marker);
    });

    mapInstanceRef.current = map;
    setMapInitialized(true);

    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 250);

    return () => {
      clearTimeout(timer);
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []); // Run once on mount

  // 2. Update Marker Visuals and Pan when activeLocation changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapInitialized) return;

    // Update icons for all markers
    PRESET_CITIES.forEach((cityObj) => {
      const marker = stationMarkersRef.current.get(cityObj.city);
      if (!marker) return;

      const isActive = cityObj.city === activeLocation.city;
      const isUserSaved = cityObj.city === userLocation.city;

      marker.setIcon(getCityIcon(cityObj, isActive, isUserSaved));
      marker.setZIndexOffset(isActive ? 2500 : isUserSaved ? 1500 : 1000);
    });

    // Smoothly fly map to newly active city
    map.flyTo([activeLocation.lat, activeLocation.lng], 10, {
      duration: 0.9,
      easeLinearity: 0.25,
    });
  }, [activeLocation, userLocation, mapInitialized, getCityIcon]);

  // 3. Fetch RainViewer Radar Frame
  useEffect(() => {
    let isMounted = true;
    setRadarLoading(true);
    setRadarError(null);

    radarService
      .getLatestRadarFrame()
      .then((frame) => {
        if (isMounted) {
          setRadarFrame(frame);
          setRadarLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          setRadarError(err instanceof Error ? err.message : 'Live radar temporarily unavailable.');
          setRadarLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // 4. Manage Radar Tile Layer with maxNativeZoom: 12 safeguard
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapInitialized) return;

    if (radarEnabled && radarFrame) {
      if (radarLayerRef.current) {
        map.removeLayer(radarLayerRef.current);
      }

      const layer = L.tileLayer(radarFrame.tileUrlTemplate, {
        opacity: 0.72,
        zIndex: 200,
        minZoom: 2,
        maxNativeZoom: 12, // Critical: Prevents "Zoom Level Not Supported" errors at high zoom
        maxZoom: 19,
      });

      layer.addTo(map);
      radarLayerRef.current = layer;
    } else if (!radarEnabled && radarLayerRef.current) {
      map.removeLayer(radarLayerRef.current);
      radarLayerRef.current = null;
    }
  }, [radarEnabled, radarFrame, mapInitialized]);

  // Minimal Control Callbacks
  const handleZoomIn = useCallback(() => {
    mapInstanceRef.current?.zoomIn();
  }, []);

  const handleZoomOut = useCallback(() => {
    mapInstanceRef.current?.zoomOut();
  }, []);

  const handleResetToMyLocation = useCallback(() => {
    onSelectCity(userLocation);
    mapInstanceRef.current?.flyTo([userLocation.lat, userLocation.lng], 10, {
      duration: 0.9,
    });
  }, [userLocation, onSelectCity]);

  const isAtUserLocation = activeLocation.city === userLocation.city;

  return (
    <div className={`${styles.riskMapRoot} ${className || ''}`}>
      {/* Leaflet DOM Canvas */}
      <div ref={mapContainerRef} className={styles.mapCanvas} />

      {/* Top Left: Active Status Indicator */}
      <div className={styles.topStatusOverlay}>
        <div className={styles.statusPill}>
          <div className={radarEnabled && radarFrame ? styles.liveGreenDot : styles.grayDot} />
          <span className={styles.statusLabel}>
            {radarLoading
              ? 'LOADING PRECIPITATION RADAR...'
              : radarError
              ? radarError
              : radarEnabled && radarFrame
              ? `LIVE PRECIPITATION RADAR • ${radarFrame.formattedTime}`
              : 'RADAR OVERLAY: PAUSED'}
          </span>
        </div>
      </div>

      {/* Top Right: Interactive Controls */}
      <div className={styles.controlsOverlay}>
        {/* Reset to My Location Button */}
        {!isAtUserLocation && (
          <button
            type="button"
            className={`${styles.controlBtn} ${styles.resetMyLocationBtn}`}
            onClick={handleResetToMyLocation}
            title={`Reset focus to your saved location (${userLocation.city})`}
            aria-label="Reset map to my saved location"
          >
            <RotateCcw size={14} className={styles.resetIcon} />
            <span className={styles.controlText}>Reset to {userLocation.city}</span>
          </button>
        )}

        {/* Radar Toggle Button */}
        <button
          type="button"
          className={`${styles.controlBtn} ${radarEnabled ? styles.controlBtnActive : ''}`}
          onClick={onToggleRadar}
          title={radarEnabled ? 'Turn Radar OFF' : 'Turn Radar ON'}
          aria-label="Toggle Rain Radar"
        >
          <Layers size={15} color={radarEnabled ? '#0891b2' : '#64748b'} />
          <span className={styles.controlText}>
            RADAR: {radarEnabled ? 'ON' : 'OFF'}
          </span>
          {radarEnabled ? <Eye size={13} color="#0891b2" /> : <EyeOff size={13} color="#64748b" />}
        </button>

        {/* Zoom Controls */}
        <div className={styles.zoomButtonGroup}>
          <button
            type="button"
            className={styles.zoomBtn}
            onClick={handleZoomIn}
            aria-label="Zoom in"
            title="Zoom In"
          >
            <ZoomIn size={15} />
          </button>
          <button
            type="button"
            className={styles.zoomBtn}
            onClick={handleZoomOut}
            aria-label="Zoom out"
            title="Zoom Out"
          >
            <ZoomOut size={15} />
          </button>
        </div>
      </div>

      {/* Bottom Floating Legend Bar (Rainfall Intensity) */}
      <div className={styles.bottomLegendBar}>
        <div className={styles.legendHeaderRow}>
          <span className={styles.legendTitle}>RAINFALL INTENSITY</span>
          <span className={styles.legendSub}>RainViewer Radar Scale</span>
        </div>
        <div className={styles.legendColorBar}>
          <div className={styles.legendColorStep} style={{ backgroundColor: 'rgba(0, 160, 255, 0.85)' }} />
          <div className={styles.legendColorStep} style={{ backgroundColor: 'rgba(34, 197, 94, 0.9)' }} />
          <div className={styles.legendColorStep} style={{ backgroundColor: 'rgba(234, 179, 8, 0.95)' }} />
          <div className={styles.legendColorStep} style={{ backgroundColor: 'rgba(239, 68, 68, 0.98)' }} />
        </div>
        <div className={styles.legendLabels}>
          <span>🔵 Light</span>
          <span>🟢 Moderate</span>
          <span>🟡 Heavy</span>
          <span>🔴 Very Heavy</span>
        </div>
      </div>
    </div>
  );
};
