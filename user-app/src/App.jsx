import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import TabBar from './components/TabBar';
import TopUpModal from './components/TopUpModal';
import LessonsPage from './pages/LessonsPage';
import TestlarPage from './pages/TestlarPage';
import LeaderboardPage from './pages/LeaderboardPage';
import ProfilePage from './pages/ProfilePage';
import { useTelegram } from './hooks/useTelegram';
import { getUserData } from './api/supabase';
import { LanguageProvider } from './context/LanguageContext';
import { Loader2 } from 'lucide-react';

function MainApp() {
  const [activeTab, setActiveTab] = useState(0);
  const { tg, user: tgUser } = useTelegram();
  const [dbUser, setDbUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Video playback active flag (hides TabBar)
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

  // Global TopUp Modal Trigger
  const [isTopUpOpen, setIsTopUpOpen] = useState(false);

  // Viewport / Orientation Detection
  const [isLandscapeDesktop, setIsLandscapeDesktop] = useState(
    typeof window !== 'undefined' && window.innerWidth > window.innerHeight && window.innerWidth >= 768
  );

  useEffect(() => {
    const handleResize = () => {
      setIsLandscapeDesktop(window.innerWidth > window.innerHeight && window.innerWidth >= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (tg) {
      try {
        tg.setHeaderColor('#000000');
        tg.setBackgroundColor('#000000');
        tg.expand();
      } catch (e) {
        console.error(e);
      }
    }
  }, [tg]);

  useEffect(() => {
    let mounted = true;

    async function fetchUser() {
      await new Promise(resolve => setTimeout(resolve, 80));
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
      
      const firstName = tgUserObj?.first_name || tgUser?.first_name || 'Aliakbar Lutfullayev';
      setDbUser({
        telegram_id: telegramId || 123456789,
        full_name: firstName,
        balance: 1850,
        streak_days: 7,
        class_group: '11-A',
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
      <div className="h-screen w-full flex items-center justify-center bg-[#000000] text-white p-6 text-center">
        <div className="flex flex-col items-center">
          <Loader2 className="w-10 h-10 text-[#007AFF] animate-spin mb-4" />
          <h2 className="text-xl font-bold mb-1">Rashidov Biologiya</h2>
          <p className="text-[#8E8E93] text-xs max-w-[240px]">Yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 0:
        return (
          <LessonsPage 
            user={dbUser} 
            onPlayingChange={setIsVideoPlaying}
          />
        );
      case 1:
        return <TestlarPage user={dbUser} />;
      case 2:
        return <LeaderboardPage user={dbUser} />;
      case 3:
        return (
          <ProfilePage 
            user={dbUser} 
            onUpdateUser={(updated) => setDbUser(updated)} 
          />
        );
      default:
        return (
          <LessonsPage 
            user={dbUser} 
            onPlayingChange={setIsVideoPlaying}
          />
        );
    }
  };

  return (
    <div className={`min-h-screen bg-[#000000] text-white relative flex flex-col ${
      isLandscapeDesktop ? 'max-w-5xl mx-auto' : 'w-full max-w-[480px] mx-auto'
    }`}>
      {/* 
        Top Status Bar: 
        Only shown on Testlar, Reyting, Profil tabs.
        On Lessons tab, LessonsPage displays the clean teacher/school branding header.
      */}
      {activeTab !== 0 && !isVideoPlaying && (
        <Header 
          user={dbUser} 
          onOpenTopUp={() => setIsTopUpOpen(true)} 
        />
      )}

      {/* Main Tab Content */}
      <main className="flex-1 overflow-y-auto no-scrollbar">
        {renderTabContent()}
      </main>

      {/* Floating Bottom Navigation Dock (Hidden during video playback) */}
      {!isVideoPlaying && (
        <TabBar 
          activeTab={activeTab} 
          onTabChange={setActiveTab} 
        />
      )}

      {/* Global Top-Up Modal */}
      <TopUpModal
        isOpen={isTopUpOpen}
        onClose={() => setIsTopUpOpen(false)}
        user={dbUser}
        onUpdateUser={(updated) => setDbUser(updated)}
      />
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider initialLang="uz">
      <MainApp />
    </LanguageProvider>
  );
}
