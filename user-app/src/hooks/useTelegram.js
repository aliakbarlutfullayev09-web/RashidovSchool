import { useEffect, useState, useCallback, useRef } from 'react';

/**
 * Enhanced Telegram Mini App hook for Rashidov School.
 * Handles Safe Areas, Viewport geometry, BackButton, Swipes, and OLED Header colors.
 * Strictly adheres to Telegram WebApp API (https://core.telegram.org/bots/webapps).
 */
export function useTelegram() {
  const tg = typeof window !== 'undefined' ? window.Telegram?.WebApp : null;
  const isTelegram = Boolean(tg && tg.initData !== undefined);
  const initialUser = tg?.initDataUnsafe?.user || null;
  const [user, setUser] = useState(initialUser);

  const backButtonHandlerRef = useRef(null);

  // 1. Safe Area & Viewport Geometry Calculator
  const updateGeometry = useCallback(() => {
    if (typeof window === 'undefined') return;

    let topInset = 0;
    let bottomInset = 0;
    let leftInset = 0;
    let rightInset = 0;
    let stableHeight = window.innerHeight;

    if (tg) {
      // safeAreaInset (Telegram 8.0+)
      const safeArea = tg.safeAreaInset || {};
      // contentSafeAreaInset (Telegram 8.0+): Telegram header + controls area
      const contentSafeArea = tg.contentSafeAreaInset || {};
      const isFullscreen = Boolean(tg.isFullscreen);

      if (isFullscreen) {
        // In fullscreen mode, the app renders edge-to-edge under device status/nav bars
        topInset = Math.max(
          Number(safeArea.top) || 0,
          Number(contentSafeArea.top) || 0
        );
        bottomInset = Math.max(
          Number(safeArea.bottom) || 0,
          Number(contentSafeArea.bottom) || 0
        );
      } else {
        // In standard mode, the webview is already framed below Telegram's header and above any chat controls.
        // We only respect device safeArea (notch / home indicator), preventing double padding.
        topInset = Number(safeArea.top) || 0;
        bottomInset = Number(safeArea.bottom) || 0;
      }

      leftInset = Math.max(
        Number(contentSafeArea.left) || 0,
        Number(safeArea.left) || 0
      );
      rightInset = Math.max(
        Number(contentSafeArea.right) || 0,
        Number(safeArea.right) || 0
      );

      if (tg.viewportStableHeight && tg.viewportStableHeight > 0) {
        stableHeight = tg.viewportStableHeight;
      }
    }

    // Fallback: If in Telegram and topInset is 0 in fullscreen, provide comfortable status bar breathing room
    if (isTelegram && topInset === 0 && Boolean(tg?.isFullscreen)) {
      topInset = 40;
    } else if (!isTelegram && topInset === 0) {
      topInset = 16; // Standard non-Telegram viewport breathing room
    }

    const docStyle = document.documentElement.style;
    docStyle.setProperty('--safe-area-top', `${topInset}px`);
    docStyle.setProperty('--safe-area-bottom', `${bottomInset}px`);
    docStyle.setProperty('--safe-area-left', `${leftInset}px`);
    docStyle.setProperty('--safe-area-right', `${rightInset}px`);
    docStyle.setProperty('--app-viewport-stable-height', `${stableHeight}px`);
  }, [tg, isTelegram]);

  // 2. Initialize Telegram WebApp settings & event listeners
  useEffect(() => {
    if (!tg) {
      updateGeometry();
      return;
    }

    try {
      tg.ready();
      tg.expand();

      // Unified Telegram 8.0+ Fullscreen request
      if (
        tg.isVersionAtLeast &&
        tg.isVersionAtLeast('8.0') &&
        typeof tg.requestFullscreen === 'function'
      ) {
        tg.requestFullscreen().catch(() => {});
      }

      if (tg.initDataUnsafe?.user) {
        setUser(tg.initDataUnsafe.user);
      }

      // OLED Dark Header & Background seamlessly matching app
      if (tg.isVersionAtLeast && tg.isVersionAtLeast('6.1')) {
        if (typeof tg.setHeaderColor === 'function') {
          tg.setHeaderColor('#000000');
        }
        if (typeof tg.setBackgroundColor === 'function') {
          tg.setBackgroundColor('#000000');
        }
      }

      // Accidental closure prevention via vertical swipes (v7.7+)
      if (tg.isVersionAtLeast && tg.isVersionAtLeast('7.7')) {
        if (typeof tg.disableVerticalSwipes === 'function') {
          tg.disableVerticalSwipes();
        }
      }

      updateGeometry();

      // Subscribe to Telegram geometry and fullscreen events
      if (typeof tg.onEvent === 'function') {
        tg.onEvent('safeAreaChanged', updateGeometry);
        tg.onEvent('contentSafeAreaChanged', updateGeometry);
        tg.onEvent('viewportChanged', updateGeometry);
        tg.onEvent('fullscreenChanged', updateGeometry);
        tg.onEvent('fullscreenFailed', updateGeometry);
      }

      window.addEventListener('resize', updateGeometry);
      window.addEventListener('orientationchange', updateGeometry);

      return () => {
        if (typeof tg.offEvent === 'function') {
          tg.offEvent('safeAreaChanged', updateGeometry);
          tg.offEvent('contentSafeAreaChanged', updateGeometry);
          tg.offEvent('viewportChanged', updateGeometry);
          tg.offEvent('fullscreenChanged', updateGeometry);
          tg.offEvent('fullscreenFailed', updateGeometry);
        }
        window.removeEventListener('resize', updateGeometry);
        window.removeEventListener('orientationchange', updateGeometry);
      };
    } catch (e) {
      console.warn('Telegram WebApp setup error:', e);
      updateGeometry();
    }
  }, [tg, updateGeometry]);

  // 3. BackButton single-handler management
  const setBackButton = useCallback((shouldShow, onClickHandler) => {
    if (!tg || !tg.BackButton || !tg.isVersionAtLeast || !tg.isVersionAtLeast('6.1')) {
      return;
    }

    try {
      // Clean up previous handler if present
      if (backButtonHandlerRef.current && typeof tg.BackButton.offClick === 'function') {
        tg.BackButton.offClick(backButtonHandlerRef.current);
        backButtonHandlerRef.current = null;
      }

      if (shouldShow && typeof onClickHandler === 'function') {
        backButtonHandlerRef.current = onClickHandler;
        tg.BackButton.onClick(onClickHandler);
        tg.BackButton.show();
      } else {
        tg.BackButton.hide();
      }
    } catch (e) {
      console.warn('BackButton error:', e);
    }
  }, [tg]);

  // 4. Closing confirmation management (only for critical actions like active exams)
  const setClosingConfirmation = useCallback((enabled) => {
    if (!tg || !tg.isVersionAtLeast || !tg.isVersionAtLeast('6.2')) {
      return;
    }
    try {
      if (enabled && typeof tg.enableClosingConfirmation === 'function') {
        tg.enableClosingConfirmation();
      } else if (!enabled && typeof tg.disableClosingConfirmation === 'function') {
        tg.disableClosingConfirmation();
      }
    } catch (e) {
      console.warn('ClosingConfirmation error:', e);
    }
  }, [tg]);

  // 5. Vertical Swipes management (Telegram WebApp 7.7+)
  const disableVerticalSwipes = useCallback(() => {
    if (tg?.isVersionAtLeast && tg.isVersionAtLeast('7.7') && typeof tg.disableVerticalSwipes === 'function') {
      try {
        tg.disableVerticalSwipes();
      } catch (e) {
        console.warn('disableVerticalSwipes error:', e);
      }
    }
  }, [tg]);

  const enableVerticalSwipes = useCallback(() => {
    if (tg?.isVersionAtLeast && tg.isVersionAtLeast('7.7') && typeof tg.enableVerticalSwipes === 'function') {
      try {
        tg.enableVerticalSwipes();
      } catch (e) {
        console.warn('enableVerticalSwipes error:', e);
      }
    }
  }, [tg]);

  const close = () => tg?.close?.();
  const sendData = (data) => tg?.sendData?.(data);

  return {
    tg,
    isTelegram,
    user,
    queryId: tg?.initDataUnsafe?.query_id,
    setBackButton,
    setClosingConfirmation,
    disableVerticalSwipes,
    enableVerticalSwipes,
    close,
    sendData,
  };
}
