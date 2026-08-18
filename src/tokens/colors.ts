/**
 * R.A.I. Design Tokens — Colors (TypeScript Mirror)
 */

export const colors = {
  canvas: '#f8fbfe',
  surface: {
    white: '#ffffff',
    subtle: '#f1f5f9',
    ice: '#f0f9ff',
    aqua: '#ecfeff',
    mint: '#f0fdf4',
    mist: '#e2e8f0',
  },
  border: {
    subtle: '#e2e8f0',
    default: '#cbd5e1',
    strong: '#94a3b8',
    accent: '#38bdf8',
  },
  text: {
    primary: '#0f172a',
    secondary: '#334155',
    tertiary: '#64748b',
    quaternary: '#94a3b8',
    inverse: '#ffffff',
    accent: '#0284c7',
    cyan: '#0891b2',
    mint: '#15803d',
    amber: '#b45309',
    coral: '#c2410c',
  },
  semantic: {
    safe: {
      light: '#f0fdf4',
      border: '#bbf7d0',
      main: '#16a34a',
      dark: '#15803d',
    },
    weather: {
      light: '#f0f9ff',
      border: '#bae6fd',
      main: '#0284c7',
      dark: '#0369a1',
    },
    ai: {
      light: '#ecfeff',
      border: '#a5f3fc',
      main: '#0891b2',
      dark: '#0e7490',
    },
    caution: {
      light: '#fffbeb',
      border: '#fde68a',
      main: '#d97706',
      dark: '#b45309',
    },
    highRisk: {
      light: '#fff7ed',
      border: '#ffedd5',
      main: '#ea580c',
      dark: '#c2410c',
    },
    critical: {
      light: '#fef2f2',
      border: '#fecaca',
      main: '#dc2626',
      dark: '#b91c1c',
    },
  },
} as const;

export type ColorToken = typeof colors;
