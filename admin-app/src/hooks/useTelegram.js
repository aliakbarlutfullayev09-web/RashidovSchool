import { useEffect, useState } from 'react';
import { mockTeacherUser, mockSuperadminUser } from '../mock/data';

export function useTelegram() {
  const tg = window.Telegram?.WebApp;
  
  // В dev режиме используем мок-данные по умолчанию
  const initialUser = tg?.initDataUnsafe?.user || mockSuperadminUser;
  const [user, setUser] = useState(initialUser);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (tg) {
      try {
        tg.ready();
        tg.expand();
        if (tg.initDataUnsafe?.user) {
           setUser({
              ...tg.initDataUnsafe.user,
              role: tg.initDataUnsafe.start_param || 'teacher',
              permissions: { can_promo: true, can_gift: true, can_send: true }
           });
        }
      } catch (e) {
        console.warn('Telegram WebApp is not fully available:', e);
      }
    }
    setReady(true);
  }, [tg]);

  const toggleMockRole = () => {
    setUser(prev => prev.role === 'superadmin' ? mockTeacherUser : mockSuperadminUser);
  };

  return {
    tg,
    user,
    ready,
    toggleMockRole,
  };
}
