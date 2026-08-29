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

  useEffect(() => {
    async function fetchUser() {
      if (tgUser && tgUser.id) {
        const { data } = await getUserData(tgUser.id);
        if (data) {
          setDbUser(data);
        }
      }
    }
    fetchUser();
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
