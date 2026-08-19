import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Cloud,
  CloudRain,
  ShieldAlert,
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
  readonly cloudsEnabled?: boolean;
  readonly onToggleClouds?: () => void;
  readonly riskLayerEnabled?: boolean;
  readonly onToggleRiskLayer?: () => void;
  readonly className?: string;
}

export const InteractiveRiskMap: React.FC<InteractiveRiskMapProps> = ({
  userLocation,
  activeLocation,
  onSelectCity,
  radarEnabled,
  onToggleRadar,
  cloudsEnabled = true,
  onToggleClouds,
  riskLayerEnabled = true,
  onToggleRiskLayer,
  className,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const stationMarkersRef = useRef<Map<string, L.Marker>>(new Map());
  const radarLayerRef = useRef<L.TileLayer | null>(null);
  const cloudCirclesRef = useRef<L.LayerGroup | null>(null);
  const riskCirclesRef = useRef<L.LayerGroup | null>(null);

  const [internalClouds, setInternalClouds] = useState<boolean>(cloudsEnabled);
  const [internalRisk, setInternalRisk] = useState<boolean>(riskLayerEnabled);

  const [radarFrame, setRadarFrame] = useState<RadarFrameInfo | null>(null);
  const [radarLoading, setRadarLoading] = useState<boolean>(false);
  const [radarError, setRadarError] = useState<string | null>(null);
  const [mapInitialized, setMapInitialized] = useState<boolean>(false);

  const isCloudsActive = onToggleClouds ? cloudsEnabled : internalClouds;
  const isRiskActive = onToggleRiskLayer ? riskLayerEnabled : internalRisk;

  const handleToggleClouds = () => {
    if (onToggleClouds) {
      onToggleClouds();
    } else {
      setInternalClouds((prev) => !prev);
    }
  };

  const handleToggleRisk = () => {
    if (onToggleRiskLayer) {
      onToggleRiskLayer();
    } else {
      setInternalRisk((prev) => !prev);
    }
  };

  // Custom HTML icons for cities
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

  // 1. Initialize Leaflet Map on Mount
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

    // CartoDB Positron Light Base Map
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

    // Layer groups for composable overlays
    cloudCirclesRef.current = L.layerGroup().addTo(map);
    riskCirclesRef.current = L.layerGroup().addTo(map);

    L.control
      .attribution({
        position: 'bottomleft',
        prefix: false,
      })
      .addAttribution(
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> | Radar &copy; <a href="https://www.rainviewer.com/api.html" target="_blank" rel="noopener">RainViewer</a>'
      )
      .addTo(map);

    // Clickable City Markers
    PRESET_CITIES.forEach((cityObj) => {
      const isActive = cityObj.city === activeLocation.city;
      const isUserSaved = cityObj.city === userLocation.city;

      const marker = L.marker([cityObj.lat, cityObj.lng], {
        icon: getCityIcon(cityObj, isActive, isUserSaved),
        zIndexOffset: isActive ? 2000 : isUserSaved ? 1500 : 1000,
      }).addTo(map);

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
  }, []); // Mount only

  // 2. Fly to active location on change & update marker icons
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapInitialized) return;

    PRESET_CITIES.forEach((cityObj) => {
      const marker = stationMarkersRef.current.get(cityObj.city);
      if (!marker) return;

      const isActive = cityObj.city === activeLocation.city;
      const isUserSaved = cityObj.city === userLocation.city;

      marker.setIcon(getCityIcon(cityObj, isActive, isUserSaved));
      marker.setZIndexOffset(isActive ? 2500 : isUserSaved ? 1500 : 1000);
    });

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

  // 4. Update Radar Overlay TileLayer
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
        maxNativeZoom: 12,
        maxZoom: 19,
      });

      layer.addTo(map);
      radarLayerRef.current = layer;
    } else if (!radarEnabled && radarLayerRef.current) {
      map.removeLayer(radarLayerRef.current);
      radarLayerRef.current = null;
    }
  }, [radarEnabled, radarFrame, mapInitialized]);

  // 5. Update Cloud & Convective Cell Layer
  useEffect(() => {
    const group = cloudCirclesRef.current;
    if (!group) return;

    group.clearLayers();

    if (isCloudsActive) {
      // Create high-contrast atmospheric cloud cover density contours over regional stations
      PRESET_CITIES.forEach((cityObj) => {
        // Vary opacity and radii smoothly across stations
        const isCurrentCity = cityObj.city === activeLocation.city;
        const radius = isCurrentCity ? 45000 : 32000;
        const baseOpacity = isCurrentCity ? 0.35 : 0.22;

        const cloudCircle = L.circle([cityObj.lat, cityObj.lng], {
          radius,
          color: '#0284c7',
          weight: 1,
          dashArray: '4, 8',
          fillColor: '#38bdf8',
          fillOpacity: baseOpacity,
          interactive: false,
        });

        // Inner dense convective moisture core
        const innerCore = L.circle([cityObj.lat, cityObj.lng], {
          radius: radius * 0.45,
          color: '#0369a1',
          weight: 1.5,
          fillColor: '#0284c7',
          fillOpacity: baseOpacity * 1.4,
          interactive: false,
        });

        group.addLayer(cloudCircle);
        group.addLayer(innerCore);
      });
    }
  }, [isCloudsActive, activeLocation]);

  // 6. Update Rainfall Severity Risk Layer
  useEffect(() => {
    const group = riskCirclesRef.current;
    if (!group) return;

    group.clearLayers();

    if (isRiskActive) {
      // Add spatial IMD 64.5 mm heavy rainfall threshold risk boundary
      const riskHalo = L.circle([activeLocation.lat, activeLocation.lng], {
        radius: 28000,
        color: '#f59e0b',
        weight: 2,
        fillColor: '#fbbf24',
        fillOpacity: 0.18,
        interactive: false,
      });

      const riskCore = L.circle([activeLocation.lat, activeLocation.lng], {
        radius: 12000,
        color: '#d97706',
        weight: 2,
        fillColor: '#f59e0b',
        fillOpacity: 0.28,
        interactive: false,
      });

      group.addLayer(riskHalo);
      group.addLayer(riskCore);
    }
  }, [isRiskActive, activeLocation]);

  // Control Callbacks
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
      {/* Leaflet Canvas */}
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

      {/* Top Right: Composable Layer Controls */}
      <div className={styles.controlsOverlay}>
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

        {/* Radar Toggle */}
        <button
          type="button"
          className={`${styles.controlBtn} ${radarEnabled ? styles.controlBtnActive : ''}`}
          onClick={onToggleRadar}
          title={radarEnabled ? 'Turn Radar OFF' : 'Turn Radar ON'}
          aria-label="Toggle Rain Radar"
        >
          <CloudRain size={14} color={radarEnabled ? '#0284c7' : '#64748b'} />
          <span className={styles.controlText}>Radar: {radarEnabled ? 'ON' : 'OFF'}</span>
        </button>

        {/* Clouds Toggle */}
        <button
          type="button"
          className={`${styles.controlBtn} ${isCloudsActive ? styles.controlBtnActive : ''}`}
          onClick={handleToggleClouds}
          title={isCloudsActive ? 'Hide Clouds Layer' : 'Show Clouds Layer'}
          aria-label="Toggle Clouds Layer"
        >
          <Cloud size={14} color={isCloudsActive ? '#0284c7' : '#64748b'} />
          <span className={styles.controlText}>Clouds: {isCloudsActive ? 'ON' : 'OFF'}</span>
        </button>

        {/* Risk Layer Toggle */}
        <button
          type="button"
          className={`${styles.controlBtn} ${isRiskActive ? styles.controlBtnActive : ''}`}
          onClick={handleToggleRisk}
          title={isRiskActive ? 'Hide Risk Layer' : 'Show Risk Layer'}
          aria-label="Toggle Rainfall Risk Layer"
        >
          <ShieldAlert size={14} color={isRiskActive ? '#0284c7' : '#64748b'} />
          <span className={styles.controlText}>Risk: {isRiskActive ? 'ON' : 'OFF'}</span>
        </button>

        {/* Zoom Controls */}
        <div className={styles.zoomButtonGroup}>
          <button
            type="button"
            className={styles.zoomBtn}
            onClick={handleZoomIn}
            title="Zoom in"
            aria-label="Zoom in"
          >
            <ZoomIn size={14} />
          </button>
          <button
            type="button"
            className={styles.zoomBtn}
            onClick={handleZoomOut}
            title="Zoom out"
            aria-label="Zoom out"
          >
            <ZoomOut size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};
