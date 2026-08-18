import { useMediaQuery } from './useMediaQuery';

/**
 * Check if the user has requested reduced motion
 */
export function usePrefersReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)');
}
