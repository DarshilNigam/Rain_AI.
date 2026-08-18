/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_TITLE?: string;
  readonly VITE_APP_ENV?: string;
  readonly VITE_APP_VERSION?: string;
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_PREDICTION_SERVICE_URL?: string;
  readonly VITE_RISK_MAP_SERVICE_URL?: string;
  readonly VITE_EMERGENCY_SERVICE_URL?: string;
  readonly VITE_RELIEF_SERVICE_URL?: string;
  readonly VITE_FARMER_SERVICE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
