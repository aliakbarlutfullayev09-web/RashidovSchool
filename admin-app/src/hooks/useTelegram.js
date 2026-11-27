import { useEffect, useState, useCallback, useRef } from 'react';
import { mockTeacherUser, mockSuperadminUser } from '../mock/data';

export function useTelegram() {
  const tg = window.Telegram?.WebApp;
  
  // В dev режиме используем мок-данные по умолчанию
  const initialUser = tg?.initDataUnsafe?.user || mockSuperadminUser;
  const [user, setUser] = useState(initialUser);
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
           setUser({
              ...tg.initDataUnsafe.user,
              role: tg.initDataUnsafe.start_param || 'teacher',
              permissions: { can_promo: true, can_gift: true, can_send: true }
           });
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

  const toggleMockRole = () => {
    setUser(prev => prev.role === 'superadmin' ? mockTeacherUser : mockSuperadminUser);
  };

  return {
    tg,
    user,
    ready,
    setBackButton,
    toggleMockRole,
  };
}
