/**
 * R.A.I. Design Tokens — Motion & Transitions
 */

export const motion = {
  easings: {
    standard: 'cubic-bezier(0.2, 0, 0, 1)',
    smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
    bounceSubtle: 'cubic-bezier(0.34, 1.4, 0.64, 1)',
  },
  durations: {
    instant: '100ms',
    fast: '180ms',
    normal: '260ms',
    slow: '400ms',
    deliberate: '700ms',
  },
} as const;
