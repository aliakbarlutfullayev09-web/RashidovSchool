import React, { useState, useEffect } from 'react';
import LessonsPage from './pages/LessonsPage';
import ProfilePage from './pages/ProfilePage';
import Header from './components/Header';
import TabBar from './components/TabBar';
import { useTelegram } from './hooks/useTelegram';
import { getUserData } from './api/supabase';
import { Loader2 } from 'lucide-react';

import QuestsPage from './pages/QuestsPage';
import ArenaPage from './pages/ArenaPage';

function App() {
  const [activeTab, setActiveTab] = useState(0);
  const { tg, user: tgUser } = useTelegram();
  const [dbUser, setDbUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (tg) {
      try {
        tg.setHeaderColor('#000000');
        tg.setBackgroundColor('#000000');
      } catch (e) {
        console.error(e);
      }
    }
  }, [tg]);

  useEffect(() => {
    let mounted = true;

    async function fetchUser() {
      await new Promise(resolve => setTimeout(resolve, 100));
      if (!mounted) return;

      const urlParams = new URLSearchParams(window.location.search);
      const urlUserId = urlParams.get('user_id');

      const tgApp = window.Telegram?.WebApp;
      const tgUserObj = tgApp?.initDataUnsafe?.user;
      
      const telegramId = urlUserId ? parseInt(urlUserId, 10) : (tgUserObj?.id || tgUser?.id || tgUser?.telegram_id);
      
      if (telegramId) {
        try {
          const { data, error } = await getUserData(telegramId);
          if (data) {
            setDbUser(data);
            setLoading(false);
            return;
          }
        } catch (e) {
          console.error(`Crash: ${e.message} | ID: ${telegramId}`);
        }
      }
      
      const firstName = tgUserObj?.first_name || tgUser?.first_name || 'Mehmon';
      setDbUser({
        telegram_id: telegramId || 0,
        full_name: firstName,
        balance: 0,
        streak_days: 0,
        class_group: '',
        language: 'uz',
        role: 'student'
      });
      setLoading(false);
    }
    
    fetchUser();

    return () => { mounted = false; };
  }, [tgUser]);

  if (loading || !dbUser) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-[#000000] text-white p-6 text-center">
        <div className="flex flex-col items-center">
          <Loader2 className="w-10 h-10 text-cyan-400 animate-spin mb-4" />
          <h2 className="text-xl font-bold mb-2">Profil yuklanmoqda...</h2>
          <p className="text-[#8E8E93] text-sm max-w-[250px]">Agar yuklash uzoq davom etsa, ilovani yopib, botga /start buyrug'ini yuboring</p>
        </div>
      </div>
    );
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 0: return <LessonsPage user={dbUser} />;
      case 1: return <QuestsPage />;
      case 2: return <ArenaPage />;
      case 3: return <ProfilePage user={dbUser} />;
      default: return <LessonsPage user={dbUser} />;
    }
  };

  return (
    <div className="h-full w-full flex flex-col relative overflow-hidden bg-[#000000] text-white md:pl-[100px]">
      <Header user={dbUser} />
      
      <div className="flex-1 overflow-y-auto pb-24 md:pb-0">
        {renderTabContent()}
      </div>
      
      <TabBar 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
        balance={dbUser?.balance} 
      />
    </div>
  );
}

export default App;
