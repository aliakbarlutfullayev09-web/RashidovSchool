import { useEffect, useState } from 'react';
import { mockUser } from '../mock/data';

export function useTelegram() {
  const tg = window.Telegram?.WebApp;
  // Fallback to mock user if not in Telegram (for localhost testing)
  const initialUser = tg?.initDataUnsafe?.user || mockUser;
  const [user, setUser] = useState(initialUser);

  useEffect(() => {
    if (tg) {
      try {
        tg.ready();
        tg.expand();
        if (tg.initDataUnsafe?.user) {
          setUser(tg.initDataUnsafe.user);
        }
      } catch (e) {
        console.warn('Telegram WebApp is not fully available:', e);
      }
    }
  }, [tg]);

  const close = () => tg?.close();
  const sendData = (data) => tg?.sendData(data);

  return {
    tg,
    user,
    queryId: tg?.initDataUnsafe?.query_id,
    close,
    sendData,
  };
}
