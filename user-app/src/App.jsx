import React, { useState, useEffect } from 'react';
import LessonsPage from './pages/LessonsPage';
import ProfilePage from './pages/ProfilePage';
import TabBar from './components/TabBar';
import { useTelegram } from './hooks/useTelegram';
import { getUserData } from './api/supabase';

function App() {
  const [activeTab, setActiveTab] = useState(0);
  const { tg, user: tgUser } = useTelegram();
  const [dbUser, setDbUser] = useState(null);

  useEffect(() => {
    if (tg) {
      try {
        tg.setHeaderColor('#0f0c29');
        tg.setBackgroundColor('#24243e');
      } catch (e) {
        console.error(e);
      }
    }
  }, [tg]);

  const [debugInfo, setDebugInfo] = useState('');

  useEffect(() => {
    let mounted = true;

    async function fetchUser() {
      // Даем Telegram WebApp 100 мс на инициализацию
      await new Promise(resolve => setTimeout(resolve, 100));
      if (!mounted) return;

      // Извлекаем ID из URL, если бот его передал (наш надежный запасной план)
      const urlParams = new URLSearchParams(window.location.search);
      const urlUserId = urlParams.get('user_id');

      const tgApp = window.Telegram?.WebApp;
      const tgUserObj = tgApp?.initDataUnsafe?.user;
      
      // Сначала пытаемся взять из URL, затем из Telegram
      const telegramId = urlUserId ? parseInt(urlUserId, 10) : (tgUserObj?.id || tgUser?.id || tgUser?.telegram_id);
      
      if (telegramId) {
        try {
          const { data, error } = await getUserData(telegramId);
          if (data) {
            setDbUser(data);
            return;
          } else {
            setDebugInfo(`DB Null. Err: ${JSON.stringify(error)} | ID: ${telegramId}`);
          }
        } catch (e) {
          setDebugInfo(`Crash: ${e.message} | ID: ${telegramId}`);
        }
      } else {
        const rawInitData = tgApp?.initData;
        setDebugInfo(`No ID. initData exists: ${!!rawInitData}`);
      }
      
      const firstName = tgUserObj?.first_name || tgUser?.first_name || 'Гость';
      setDbUser({
        telegram_id: telegramId || 0,
        full_name: firstName,
        balance: 0,
        streak_days: 0,
        class_group: '',
        language: 'ru',
        role: 'student'
      });
    }
    fetchUser();

    return () => { mounted = false; };
  }, [tgUser]);

  if (!dbUser) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-[#0f0c29] text-white p-6 text-center">
        <div>
          <span className="text-4xl mb-4 block">⏳</span>
          <h2 className="text-xl font-bold mb-2">Загрузка профиля...</h2>
          <p className="text-slate-400 text-sm">Если загрузка идет слишком долго, закройте приложение и отправьте боту команду /start</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col relative overflow-hidden">
      <div className="flex-1 overflow-hidden">
        {activeTab === 0 ? <LessonsPage user={dbUser} /> : <ProfilePage user={dbUser} />}
      </div>
      
      <TabBar activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}

export default App;
