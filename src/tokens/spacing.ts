/**
 * R.A.I. Design Tokens — Spacing & Layout
 */

export const spacing = {
  '2xs': '0.125rem', // 2px
  xs: '0.25rem',     // 4px
  sm: '0.5rem',      // 8px
  md: '0.75rem',     // 12px
  base: '1rem',      // 16px
  lg: '1.5rem',      // 24px
  xl: '2rem',        // 32px
  '2xl': '3rem',     // 48px
  '3xl': '4rem',     // 64px
  '4xl': '6rem',     // 96px
} as const;

export const radii = {
  xs: '4px',
  sm: '6px',
  md: '10px',
  lg: '16px',
  xl: '24px',
  full: '9999px',
} as const;

export const zIndex = {
  base: 0,
  card: 10,
  header: 100,
  sticky: 200,
  dropdown: 500,
  drawer: 800,
  modal: 1000,
  toast: 1100,
  tooltip: 1200,
} as const;
