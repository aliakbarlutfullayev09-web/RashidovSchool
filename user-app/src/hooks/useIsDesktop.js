import { useState, useEffect } from 'react';

/**
 * Hook to detect Telegram Desktop / Desktop Browser environment:
 * Useful width >= 1024px with a fine pointer (mouse/trackpad) and hover capability.
 * Strictly adheres to CSS media queries: NO User-Agent or device name sniffing.
 * Window resize changes layout reactively without re-creating component state.
 */
export function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(min-width: 1024px) and (hover: hover) and (pointer: fine)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(min-width: 1024px) and (hover: hover) and (pointer: fine)');
    const handler = (e) => {
      setIsDesktop(e.matches);
    };

    // Listen to media query changes
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handler);
    } else {
      mediaQuery.addListener(handler);
    }

    // Also listen to window resize as universal fallback
    const handleResize = () => {
      setIsDesktop(window.matchMedia('(min-width: 1024px) and (hover: hover) and (pointer: fine)').matches);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handler);
      } else {
        mediaQuery.removeListener(handler);
      }
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return isDesktop;
}
