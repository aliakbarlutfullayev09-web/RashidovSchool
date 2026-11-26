import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import TabBar from './components/TabBar';
import TopUpModal from './components/TopUpModal';
import LessonsPage from './pages/LessonsPage';
import TestlarPage from './pages/TestlarPage';
import LeaderboardPage from './pages/LeaderboardPage';
import ProfilePage from './pages/ProfilePage';
import { useTelegram } from './hooks/useTelegram';
import { useIsDesktop } from './hooks/useIsDesktop';
import { getUserData, syncUserSession, getSupportContacts } from './api/supabase';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { getSavedProfileColor } from './utils/profileColors';
import { Loader2 } from 'lucide-react';

function MainApp() {
  const { resolvedTheme } = useTheme();
  const { lang } = useLanguage();
  const isLight = resolvedTheme === 'light';
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

  // Back action registered from nested views/modals in ProfilePage
  const [profileBackAction, setProfileBackAction] = useState(null);

  const registerProfileBackAction = useCallback((action) => {
    setProfileBackAction(() => action);
  }, []);

  // Track whether an actual exam session is currently in progress (not merely viewing mode_select/variants)
  const [isExamInProgress, setIsExamInProgress] = useState(false);

  // Desktop environment detection (>= 1024px with fine pointer and hover)
  const isDesktop = useIsDesktop();

  // Tab change handler respecting active exam restrictions
  const handleTabChange = useCallback((newTab) => {
    if (activeTab === 1 && isExamInProgress && typeof testlarBackAction === 'function' && newTab !== 1) {
      const msg = lang === 'ru'
        ? 'Вы уверены, что хотите выйти из теста? Результаты не сохранятся.'
        : "Test jarayonidan chiqmoqchimisiz? Natijalar saqlanmaydi.";
      if (window.confirm(msg)) {
        setIsExamInProgress(false);
        setActiveTab(newTab);
      }
      return;
    }
    if (newTab !== 1 && isExamInProgress) {
      setIsExamInProgress(false);
    }
    setActiveTab(newTab);
  }, [activeTab, isExamInProgress, testlarBackAction, lang]);

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
    } else if (activeTab === 3 && typeof profileBackAction === 'function') {
      handler = profileBackAction;
    } else if (activeTab !== 0) {
      handler = () => setActiveTab(0);
    }

    if (handler) {
      setBackButton(true, handler);
    } else {
      setBackButton(false);
    }
  }, [isVideoPlaying, isTopUpOpen, activeTab, lessonsBackAction, testlarBackAction, profileBackAction, setBackButton]);

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
      const photoUrl = tgUserObj?.photo_url || tgUser?.photo_url || null;
      const resolvedId = telegramId || 123456789;

      const rawUser = {
        id: resolvedId,
        telegram_id: resolvedId,
        first_name: firstName,
        photo_url: photoUrl
      };

      try {
        const synced = await syncUserSession(rawUser);
        if (mounted && synced) {
          setDbUser({
            ...synced,
            photo_url: synced.photo_url || photoUrl,
            profile_color: getSavedProfileColor(synced.telegram_id || resolvedId)
          });
          setLoading(false);
          return;
        }
      } catch (e) {
        console.warn('Session sync warning:', e);
      }
      
      setDbUser({
        telegram_id: resolvedId,
        full_name: firstName,
        photo_url: photoUrl,
        profile_color: getSavedProfileColor(resolvedId),
        balance: 0,
        streak_days: 1,
        class_group: '11-A',
        language: 'uz',
        role: 'student'
      });
      setLoading(false);
    }
    
    fetchUser();
    getSupportContacts().catch(() => {});

    return () => { mounted = false; };
  }, [tgUser]);

  if (loading || !dbUser) {
    return (
      <div className={`h-screen w-full flex items-center justify-center p-6 text-center ${
        isLight ? 'bg-[#F2F2F7] text-[#1C1C1E]' : 'bg-[#000000] text-white'
      }`}>
        <div className="flex flex-col items-center">
          <Loader2 className="w-10 h-10 text-[#007AFF] animate-spin mb-4" />
          <h2 className="text-xl font-bold mb-1">Rashidov School</h2>
          <p className={`text-xs max-w-[240px] ${isLight ? 'text-[#6E6E73]' : 'text-[#8E8E93]'}`}>
            {lang === 'ru' ? 'Загрузка...' : 'Yuklanmoqda...'}
          </p>
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
            onExamActiveChange={setIsExamInProgress}
          />
        );
      case 2:
        return <LeaderboardPage user={dbUser} />;
      case 3:
        return (
          <ProfilePage 
            user={dbUser} 
            onUpdateUser={(updated) => setDbUser(updated)} 
            onRegisterBackAction={registerProfileBackAction}
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
      className={`${isLight ? 'bg-[#F2F2F7] text-[#1C1C1E]' : 'bg-[#000000] text-white'} relative flex flex-col ${
        isDesktop ? 'w-full h-full min-h-screen pl-28 pr-6' : 'w-full max-w-[480px] sm:max-w-4xl mx-auto'
      }`}
      style={{
        height: 'var(--app-viewport-stable-height, 100dvh)',
        minHeight: 'var(--app-viewport-stable-height, 100dvh)'
      }}
    >
      {/* 
        Top Pinned Glass Header:
        Unified across ALL tabs (Darslar, Testlar, Reyting, Profil) with strictly centered Rashidov SCHOOL logo.
        Hidden on Desktop (desktop Mini App has native Telegram header) and during fullscreen video playback.
      */}
      {!isVideoPlaying && !isDesktop && (
        <Header 
          showBackButton={!isTelegramWithBack && (
            (activeTab === 0 && typeof lessonsBackAction === 'function') ||
            (activeTab === 1 && typeof testlarBackAction === 'function') ||
            (activeTab === 3 && typeof profileBackAction === 'function') ||
            (activeTab > 0)
          )}
          onBack={() => {
            if (activeTab === 0 && typeof lessonsBackAction === 'function') {
              lessonsBackAction();
            } else if (activeTab === 1 && typeof testlarBackAction === 'function') {
              testlarBackAction();
            } else if (activeTab === 3 && typeof profileBackAction === 'function') {
              profileBackAction();
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

      {/* Floating Bottom Navigation Dock (Hidden during video playback & active exam) */}
      {!isVideoPlaying && !isExamInProgress && (
        <TabBar 
          activeTab={activeTab} 
          onTabChange={handleTabChange} 
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
    <ThemeProvider initialTheme="dark">
      <LanguageProvider initialLang="uz">
        <MainApp />
      </LanguageProvider>
    </ThemeProvider>
  );
}
