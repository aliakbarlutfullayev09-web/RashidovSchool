import React, { useState, useEffect } from 'react';
import LessonsPage from './pages/LessonsPage';
import ProfilePage from './pages/ProfilePage';
import TabBar from './components/TabBar';
import { useTelegram } from './hooks/useTelegram';
import { getUserData } from './api/supabase';
import { mockUser } from './mock/data';

function App() {
  const [activeTab, setActiveTab] = useState(0);
  const { tg, user: tgUser } = useTelegram();
  const [dbUser, setDbUser] = useState(mockUser);

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
