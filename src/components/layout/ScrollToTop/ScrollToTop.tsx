import { useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Ensure browser history scroll restoration does not interfere with SPA route navigation
if (typeof window !== 'undefined' && 'scrollRestoration' in window.history) {
  window.history.scrollRestoration = 'manual';
}

/**
 * Global Route Scroll-to-Top Handler
 * Synchronously resets viewport scroll position to (0, 0) before paint on route transitions,
 * while preserving deliberate internal hash anchor jumps (e.g. #pillars-wheel).
 */
export const ScrollToTop: React.FC = () => {
  const { pathname, search, hash } = useLocation();

  useLayoutEffect(() => {
    if (hash) {
      // Defer anchor scroll so target element is painted and accessible
      const timeoutId = setTimeout(() => {
        const elementId = hash.replace('#', '');
        const targetElement = document.getElementById(elementId);
        if (targetElement) {
          targetElement.scrollIntoView({ behavior: 'smooth' });
        }
      }, 0);
      return () => clearTimeout(timeoutId);
    }

    // Immediate synchronous reset before browser paint on any route change
    try {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
    } catch {
      window.scrollTo(0, 0);
    }

    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;

    const rootElement = document.getElementById('root');
    if (rootElement) {
      rootElement.scrollTop = 0;
    }

    // Safety fallback for browsers or async layout rendering
    const rafId = requestAnimationFrame(() => {
      try {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
      } catch {
        window.scrollTo(0, 0);
      }
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    });

    return () => cancelAnimationFrame(rafId);
  }, [pathname, search, hash]);

  return null;
};
