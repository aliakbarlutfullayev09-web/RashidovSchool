import React, { useState, useEffect } from 'react';
import LessonsPage from './pages/LessonsPage';
import ProfilePage from './pages/ProfilePage';
import TabBar from './components/TabBar';
import { useTelegram } from './hooks/useTelegram';

function App() {
  const [activeTab, setActiveTab] = useState(0);
  const { tg } = useTelegram();

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

  return (
    <div className="h-full w-full flex flex-col relative overflow-hidden">
      <div className="flex-1 overflow-hidden">
        {activeTab === 0 ? <LessonsPage /> : <ProfilePage />}
      </div>
      
      <TabBar activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}

export default App;
