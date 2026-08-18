/**
 * RainViewer Live Precipitation Radar Service
 * Fetches real meteorological radar tile frames from RainViewer free public API.
 */

export interface RadarFrameInfo {
  readonly host: string;
  readonly path: string;
  readonly time: number;
  readonly tileUrlTemplate: string;
  readonly formattedTime: string;
}

interface RainViewerApiResponse {
  readonly version: string;
  readonly generated: number;
  readonly host: string;
  readonly radar?: {
    readonly past?: readonly { readonly time: number; readonly path: string }[];
    readonly nowcast?: readonly { readonly time: number; readonly path: string }[];
  };
}

const RADAR_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache

class RadarService {
  private cachedFrame: RadarFrameInfo | null = null;
  private cacheExpiresAt: number = 0;

  /**
   * Retrieves the most recent verified radar frame from RainViewer.
   */
  public async getLatestRadarFrame(): Promise<RadarFrameInfo> {
    const now = Date.now();
    if (this.cachedFrame && this.cacheExpiresAt > now) {
      return this.cachedFrame;
    }

    try {
      const response = await fetch('https://api.rainviewer.com/public/weather-maps.json', {
        headers: {
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`RainViewer API returned status ${response.status}`);
      }

      const data: RainViewerApiResponse = await response.json();
      const host = data.host || 'https://tilecache.rainviewer.com';

      // Pick the latest available frame from past radar passes
      const pastFrames = data.radar?.past;
      if (!pastFrames || pastFrames.length === 0) {
        throw new Error('No radar frames currently available from RainViewer.');
      }

      const latest = pastFrames[pastFrames.length - 1]!;
      // Tile URL pattern with 256px tiles, color scheme 2 (Universal Blue/Cyan/Amber/Red), smoothed (1_1)
      const tileUrlTemplate = `${host}${latest.path}/256/{z}/{x}/{y}/2/1_1.png`;

      const frameDate = new Date(latest.time * 1000);
      const formattedTime = frameDate.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });

      const frameInfo: RadarFrameInfo = {
        host,
        path: latest.path,
        time: latest.time,
        tileUrlTemplate,
        formattedTime,
      };

      this.cachedFrame = frameInfo;
      this.cacheExpiresAt = now + RADAR_CACHE_TTL_MS;

      return frameInfo;
    } catch (err: unknown) {
      console.error('RadarService fetch error:', err);
      throw new Error('Live radar temporarily unavailable.');
    }
  }
}

export const radarService = new RadarService();
