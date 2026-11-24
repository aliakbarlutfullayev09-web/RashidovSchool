import { useState, useEffect } from 'react';

/**
 * Hook to detect Telegram Desktop / Desktop Browser or Landscape Orientation:
 * 1. Traditional Desktop PC / Mac / Laptop with mouse/trackpad (>= 1024px with hover & pointer: fine)
 * 2. Mobile phones and tablets ONLY in landscape orientation (orientation: landscape and min-width: 560px)
 * 
 * In portrait orientation on phones & tablets, this returns false (pure mobile layout).
 * In landscape orientation on phones & tablets, this returns true (desktop layout).
 */
export const DESKTOP_MEDIA_QUERY = '(min-width: 1024px) and (hover: hover) and (pointer: fine), (orientation: landscape) and (min-width: 560px)';

export function checkIsDesktop() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia(DESKTOP_MEDIA_QUERY).matches;
}

export function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(checkIsDesktop);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia(DESKTOP_MEDIA_QUERY);
    const handler = (e) => {
      setIsDesktop(e.matches);
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handler);
    } else {
      mediaQuery.addListener(handler);
    }

    const handleResizeOrOrientation = () => {
      setIsDesktop(checkIsDesktop());
    };

    window.addEventListener('resize', handleResizeOrOrientation);
    window.addEventListener('orientationchange', handleResizeOrOrientation);
    if (screen?.orientation?.addEventListener) {
      screen.orientation.addEventListener('change', handleResizeOrOrientation);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handler);
      } else {
        mediaQuery.removeListener(handler);
      }
      window.removeEventListener('resize', handleResizeOrOrientation);
      window.removeEventListener('orientationchange', handleResizeOrOrientation);
      if (screen?.orientation?.removeEventListener) {
        screen.orientation.removeEventListener('change', handleResizeOrOrientation);
      }
    };
  }, []);

  return isDesktop;
}
