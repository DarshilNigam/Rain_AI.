/**
 * R.A.I. Design Tokens — Typography
 */

export const typography = {
  fonts: {
    display: "'Sora', 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
    body: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    mono: "'JetBrains Mono', monospace",
  },
  weights: {
    light: 300,
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extraBold: 800,
  },
  lineHeights: {
    tight: 1.08,
    snug: 1.2,
    normal: 1.5,
    relaxed: 1.625,
  },
} as const;
