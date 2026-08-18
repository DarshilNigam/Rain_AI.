import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, Search, Compass, Check, X, Navigation, Loader2, Globe, Sparkles } from 'lucide-react';
import { UserLocation, PRESET_CITIES } from '../../../types/location';
import { useLocationContext } from '../../../context/LocationContext';
import { geocodingService } from '../../../services/geocoding.service';
import styles from './LocationSwitcher.module.css';

interface LocationSwitcherProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
}

export const LocationSwitcher: React.FC<LocationSwitcherProps> = ({ isOpen, onClose }) => {
  const { location, setLocation, detectCurrentLocation, isLocating, locationError } = useLocationContext();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<UserLocation[]>(() => [...PRESET_CITIES.slice(0, 16)]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const resultsContainerRef = useRef<HTMLDivElement>(null);

  // Reset search when modal opens or closes
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setSearchResults([...PRESET_CITIES.slice(0, 16)]);
      setIsSearching(false);
      setHighlightedIndex(-1);
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Debounced dynamic geocoding search
  useEffect(() => {
    if (!isOpen) return;

    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setSearchResults([...PRESET_CITIES.slice(0, 16)]);
      setIsSearching(false);
      setHighlightedIndex(-1);
      return;
    }

    setIsSearching(true);
    const handler = setTimeout(async () => {
      try {
        const results = await geocodingService.searchLocations(trimmed, 12);
        setSearchResults(results);
        setHighlightedIndex(-1);
      } catch (err) {
        console.error('[LocationSwitcher] Geocoding error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 220);

    return () => clearTimeout(handler);
  }, [searchQuery, isOpen]);

  const handleSelect = useCallback(
    (selectedLoc: UserLocation) => {
      setLocation(selectedLoc);
      onClose();
    },
    [setLocation, onClose]
  );

  const handleDetect = async () => {
    try {
      await detectCurrentLocation();
      onClose();
    } catch {
      // Handled via context
    }
  };

  // Keyboard Navigation: ArrowDown, ArrowUp, Enter, Escape
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      onClose();
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => {
        const next = prev + 1 >= searchResults.length ? 0 : prev + 1;
        scrollToHighlighted(next);
        return next;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => {
        const next = prev - 1 < 0 ? searchResults.length - 1 : prev - 1;
        scrollToHighlighted(next);
        return next;
      });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < searchResults.length) {
        handleSelect(searchResults[highlightedIndex]!);
      } else if (searchResults.length > 0) {
        handleSelect(searchResults[0]!);
      }
    }
  };

  const scrollToHighlighted = (index: number) => {
    if (!resultsContainerRef.current) return;
    const cards = resultsContainerRef.current.children;
    if (cards[index]) {
      (cards[index] as HTMLElement).scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  };

  if (!isOpen) {
    return null;
  }

  const isQueryEmpty = !searchQuery.trim();

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="location-dialog-title">
      <div className={styles.backdrop} onClick={onClose} />
      <div className={styles.dialog}>
        <div className={styles.header}>
          <div className={styles.titleGroup}>
            <div className={styles.iconCircle}>
              <MapPin size={18} color="var(--rai-color-ai-600)" />
            </div>
            <div>
              <h3 id="location-dialog-title" className={styles.title}>
                Select City / Location Node
              </h3>
              <p className={styles.subtitle}>
                R.A.I. synchronizes precipitation intelligence and meteorological models to your active city.
              </p>
            </div>
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close location selector">
            <X size={16} />
          </button>
        </div>

        {/* Current Location Trigger */}
        <button
          type="button"
          className={styles.currentLocationBtn}
          onClick={handleDetect}
          disabled={isLocating}
        >
          <Compass size={16} className={isLocating ? styles.spinIcon : ''} />
          <div className={styles.currentLocationText}>
            <span className={styles.currentLocationTitle}>
              {isLocating ? 'Acquiring GPS Telemetry Coordinates...' : 'Use My Current Location'}
            </span>
            <span className={styles.currentLocationDesc}>
              Detect regional catchment basin via browser geolocation
            </span>
          </div>
          <Navigation size={14} className={styles.arrowIcon} />
        </button>

        {locationError && (
          <div className={styles.errorBanner} role="alert">
            <span>{locationError}</span>
          </div>
        )}

        {/* Dynamic Search Input with Instant Indicator */}
        <div className={styles.searchWrapper}>
          <Search size={15} className={styles.searchIcon} />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Type any Indian city, town, district, or global city..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className={styles.searchInput}
            aria-autocomplete="list"
            aria-controls="location-results-grid"
          />
          {isSearching ? (
            <Loader2 size={15} className={styles.searchSpinner} />
          ) : searchQuery ? (
            <button
              type="button"
              className={styles.clearSearchBtn}
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
            >
              <X size={13} />
            </button>
          ) : null}
        </div>

        {/* Results Container */}
        <div className={styles.citiesList}>
          <div className={styles.listHeaderRow}>
            <span className={styles.listHeading}>
              {isQueryEmpty ? (
                <>
                  <Sparkles size={11} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                  POPULAR INTELLIGENCE NODES
                </>
              ) : (
                <>
                  <Globe size={11} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                  SEARCH RESULTS ({searchResults.length})
                </>
              )}
            </span>
            {searchQuery && (
              <span className={styles.searchHintText}>
                Use ↑ ↓ arrows and press Enter to select
              </span>
            )}
          </div>

          {searchResults.length === 0 && !isSearching ? (
            <div className={styles.emptyState}>
              <MapPin size={28} className={styles.emptyIcon} />
              <h4 className={styles.emptyTitle}>No Locations Found</h4>
              <p className={styles.emptyDesc}>
                We couldn&apos;t find any matches for &ldquo;<strong>{searchQuery}</strong>&rdquo;. Try searching for a nearby district, state, or major city name.
              </p>
            </div>
          ) : (
            <div id="location-results-grid" ref={resultsContainerRef} className={styles.citiesGrid}>
              {searchResults.map((c, index) => {
                const isSelected =
                  c.city.toLowerCase() === location.city.toLowerCase() &&
                  (Math.abs(c.lat - location.lat) < 0.1 || c.region.toLowerCase() === location.region.toLowerCase());
                const isHighlighted = index === highlightedIndex;

                return (
                  <button
                    key={`${c.city}_${c.lat}_${c.lng}_${index}`}
                    type="button"
                    className={`${styles.cityCard} ${isSelected ? styles.cityCardActive : ''} ${
                      isHighlighted ? styles.cityCardHighlighted : ''
                    }`}
                    onClick={() => handleSelect(c)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                  >
                    <div className={styles.cityCardMeta}>
                      <div className={styles.cityNameRow}>
                        <span className={styles.cityName}>{c.city}</span>
                        {c.country !== 'India' && (
                          <span className={styles.countryBadge}>{c.country}</span>
                        )}
                      </div>
                      <span className={styles.cityRegion}>
                        {c.region}{c.country ? `, ${c.country}` : ''}
                      </span>
                      <span className={styles.cityCoords}>
                        {c.lat.toFixed(2)}° N, {c.lng.toFixed(2)}° E
                      </span>
                    </div>
                    {isSelected && (
                      <div className={styles.checkBadge}>
                        <Check size={13} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
