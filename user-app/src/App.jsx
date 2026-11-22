import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import TabBar from './components/TabBar';
import TopUpModal from './components/TopUpModal';
import LessonsPage from './pages/LessonsPage';
import TestlarPage from './pages/TestlarPage';
import LeaderboardPage from './pages/LeaderboardPage';
import ProfilePage from './pages/ProfilePage';
import { useTelegram } from './hooks/useTelegram';
import { getUserData, syncUserSession } from './api/supabase';
import { LanguageProvider } from './context/LanguageContext';
import { Loader2 } from 'lucide-react';

function MainApp() {
  const [activeTab, setActiveTab] = useState(0);
  const { tg, isTelegram, user: tgUser, setBackButton } = useTelegram();
  const isTelegramWithBack = Boolean(
    tg && tg.initData !== undefined && tg.isVersionAtLeast && tg.isVersionAtLeast('6.1')
  );
  const [dbUser, setDbUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Video playback active flag (hides TabBar)
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

  // Global TopUp Modal Trigger
  const [isTopUpOpen, setIsTopUpOpen] = useState(false);

  // Back action registered from nested views (e.g. LessonsPage views)
  const [lessonsBackAction, setLessonsBackAction] = useState(null);

  const registerLessonsBackAction = useCallback((action) => {
    // Explicitly wrap in functional setter so React does not execute the action callback during state update
    setLessonsBackAction(() => action);
  }, []);

  // Back action registered from nested views in TestlarPage
  const [testlarBackAction, setTestlarBackAction] = useState(null);

  const registerTestlarBackAction = useCallback((action) => {
    setTestlarBackAction(() => action);
  }, []);

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

  // Coordinated Navigation-Level BackButton Handler (Telegram WebApp 6.1+)
  useEffect(() => {
    let handler = null;

    if (isVideoPlaying) {
      handler = () => {
        if (typeof window !== 'undefined' && typeof window.__rb_exit_video === 'function') {
          window.__rb_exit_video();
        } else {
          setIsVideoPlaying(false);
        }
      };
    } else if (isTopUpOpen) {
      handler = () => setIsTopUpOpen(false);
    } else if (activeTab === 0 && typeof lessonsBackAction === 'function') {
      handler = lessonsBackAction;
    } else if (activeTab === 1 && typeof testlarBackAction === 'function') {
      handler = testlarBackAction;
    } else if (activeTab !== 0) {
      handler = () => setActiveTab(0);
    }

    if (handler) {
      setBackButton(true, handler);
    } else {
      setBackButton(false);
    }
  }, [isVideoPlaying, isTopUpOpen, activeTab, lessonsBackAction, testlarBackAction, setBackButton]);

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
      const firstName = tgUserObj?.first_name || tgUser?.first_name || 'Aliakbar Lutfullayev';

      const rawUser = {
        id: telegramId || 123456789,
        telegram_id: telegramId || 123456789,
        first_name: firstName
      };

      try {
        const synced = await syncUserSession(rawUser);
        if (mounted && synced) {
          setDbUser(synced);
          setLoading(false);
          return;
        }
      } catch (e) {
        console.warn('Session sync warning:', e);
      }
      
      setDbUser({
        telegram_id: telegramId || 123456789,
        full_name: firstName,
        balance: 1000,
        streak_days: 1,
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
            onRegisterBackAction={registerLessonsBackAction}
          />
        );
      case 1:
        return (
          <TestlarPage 
            user={dbUser} 
            onRegisterBackAction={registerTestlarBackAction}
          />
        );
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
            onRegisterBackAction={registerLessonsBackAction}
          />
        );
    }
  };

  return (
    <div 
      className={`bg-[#000000] text-white relative flex flex-col ${
        isLandscapeDesktop ? 'max-w-5xl mx-auto' : 'w-full max-w-[480px] mx-auto'
      }`}
      style={{
        height: 'var(--app-viewport-stable-height, 100dvh)',
        minHeight: 'var(--app-viewport-stable-height, 100dvh)'
      }}
    >
      {/* 
        Top Pinned Glass Header:
        Unified across ALL tabs (Darslar, Testlar, Reyting, Profil) with strictly centered Rashidov SCHOOL logo.
        Hidden during fullscreen video playback.
      */}
      {!isVideoPlaying && (
        <Header 
          showBackButton={!isTelegramWithBack && (
            (activeTab === 0 && typeof lessonsBackAction === 'function') ||
            (activeTab === 1 && typeof testlarBackAction === 'function') ||
            (activeTab > 1)
          )}
          onBack={() => {
            if (activeTab === 0 && typeof lessonsBackAction === 'function') {
              lessonsBackAction();
            } else if (activeTab === 1 && typeof testlarBackAction === 'function') {
              testlarBackAction();
            } else if (activeTab !== 0) {
              setActiveTab(0);
            }
          }}
        />
      )}

      {/* Main Tab Content */}
      <main className={`flex-1 min-h-0 no-scrollbar ${
        (activeTab === 0 && !lessonsBackAction) || (activeTab === 1 && !testlarBackAction) || activeTab === 2
          ? 'overflow-hidden flex flex-col' 
          : 'overflow-y-auto app-scroll-container'
      }`}>
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
