import { useEffect, useState } from 'react';

export function useTelegram() {
  const tg = window.Telegram?.WebApp;
  const initialUser = tg?.initDataUnsafe?.user || null;
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
