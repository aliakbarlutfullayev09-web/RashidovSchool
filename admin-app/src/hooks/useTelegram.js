import { useEffect, useState, useCallback, useRef } from 'react';

export function useTelegram() {
  const tg = typeof window !== 'undefined' ? window.Telegram?.WebApp : null;
  const [user, setUser] = useState(tg?.initDataUnsafe?.user || null);
  const [initData, setInitData] = useState(tg?.initData || '');
  const [ready, setReady] = useState(false);
  const backButtonHandlerRef = useRef(null);

  useEffect(() => {
    if (tg) {
      const lockSwipes = () => {
        try {
          tg.disableVerticalSwipes?.();
          tg.enableClosingConfirmation?.();
        } catch {}
      };
      try {
        tg.ready();
        tg.expand();
        lockSwipes();
        tg.onEvent?.('viewportChanged', lockSwipes);
        tg.onEvent?.('fullscreenChanged', lockSwipes);
        tg.onEvent?.('activated', lockSwipes);
        if (tg.initDataUnsafe?.user) {
          setUser(tg.initDataUnsafe.user);
        }
        if (tg.initData) {
          setInitData(tg.initData);
        }
        setReady(true);
        return () => {
          tg.offEvent?.('viewportChanged', lockSwipes);
          tg.offEvent?.('fullscreenChanged', lockSwipes);
          tg.offEvent?.('activated', lockSwipes);
        };
      } catch (e) {
        console.warn('Telegram WebApp is not fully available:', e);
      }
    }
    setReady(true);
  }, [tg]);

  const setBackButton = useCallback((shouldShow, onClickHandler) => {
    const backBtn = tg?.BackButton;
    if (!backBtn) return;

    try {
      if (backButtonHandlerRef.current && typeof backBtn.offClick === 'function') {
        backBtn.offClick(backButtonHandlerRef.current);
        backButtonHandlerRef.current = null;
      }

      if (shouldShow && typeof onClickHandler === 'function') {
        backButtonHandlerRef.current = onClickHandler;
        backBtn.onClick(onClickHandler);
        backBtn.show();
      } else {
        backBtn.hide();
      }
    } catch (e) {
      console.warn('BackButton error:', e);
    }
  }, [tg]);

  return {
    tg,
    user,
    initData,
    ready,
    setBackButton,
  };
}
