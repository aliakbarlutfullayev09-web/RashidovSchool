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
import { authenticateTelegram, getUserData, syncUserSession, getSupportContacts } from './api/supabase';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { getSavedProfileColor } from './utils/profileColors';
import { Loader2 } from 'lucide-react';

function MainApp() {
  const { resolvedTheme } = useTheme();
  const { lang, setSyncUserId, syncLanguageFromDb } = useLanguage();
  const isLight = resolvedTheme === 'light';
  const [activeTab, setActiveTab] = useState(0);
  const { tg, isTelegram, user: tgUser, setBackButton } = useTelegram();
  const isTelegramWithBack = Boolean(
    tg && tg.initData !== undefined && tg.isVersionAtLeast && tg.isVersionAtLeast('6.1')
  );
  const [dbUser, setDbUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

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

      const tgApp = window.Telegram?.WebApp;
      const initData = tgApp?.initData || '';
      const tgUserObj = tgApp?.initDataUnsafe?.user;
      const photoUrl = tgUserObj?.photo_url || tgUser?.photo_url || null;

      if (!initData) {
        if (import.meta.env.DEV && import.meta.env.VITE_DEV_ALLOW_MOCK === 'true' && tgUserObj?.id) {
          const synced = await syncUserSession({
            id: tgUserObj.id,
            telegram_id: tgUserObj.id,
            first_name: tgUserObj.first_name || 'Student',
            photo_url: photoUrl,
          });
          if (mounted && synced) {
            const uid = synced.telegram_id || tgUserObj.id;
            setSyncUserId(uid);
            setDbUser({ ...synced, photo_url: synced.photo_url || photoUrl, profile_color: getSavedProfileColor(uid) });
            setLoading(false);
            return;
          }
        }
        if (mounted) {
          setAuthError('TELEGRAM_REQUIRED');
          setLoading(false);
        }
        return;
      }

      const auth = await authenticateTelegram(initData);
      if (!mounted) return;

      if (!auth.ok || !auth.user?.telegram_id) {
        setAuthError(auth.error || 'AUTH_FAILED');
        setLoading(false);
        return;
      }

      const verifiedUser = auth.user;
      const resolvedId = Number(verifiedUser.telegram_id);

      try {
        const synced = await syncUserSession({
          ...verifiedUser,
          id: resolvedId,
          telegram_id: resolvedId,
          photo_url: photoUrl
        });
        const finalUser = synced || verifiedUser;
        if (mounted) {
          const uid = finalUser.telegram_id || resolvedId;
          setSyncUserId(uid);
          if (finalUser.language === 'ru' || finalUser.language === 'uz') {
            syncLanguageFromDb(finalUser.language);
          }
          setDbUser({
            ...finalUser,
            photo_url: finalUser.photo_url || photoUrl,
            profile_color: getSavedProfileColor(uid)
          });
          setLoading(false);
        }
      } catch (e) {
        console.warn('Session sync warning:', e);
        if (mounted) {
          setSyncUserId(resolvedId);
          setDbUser({
            ...verifiedUser,
            photo_url: verifiedUser.photo_url || photoUrl,
            profile_color: getSavedProfileColor(resolvedId)
          });
          setLoading(false);
        }
      }
    }
    
    fetchUser();
    getSupportContacts().catch(() => {});

    return () => { mounted = false; };
  }, [tgUser, setSyncUserId, syncLanguageFromDb]);

  // Keep app language synced with bot /lang changes when app regains focus
  useEffect(() => {
    const uid = dbUser?.telegram_id;
    if (!uid) return;

    const refreshLangFromSupabase = async () => {
      try {
        const { data } = await getUserData(uid);
        if (data?.language === 'ru' || data?.language === 'uz') {
          syncLanguageFromDb(data.language);
        }
      } catch {}
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        refreshLangFromSupabase();
      }
    };

    window.addEventListener('focus', refreshLangFromSupabase);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('focus', refreshLangFromSupabase);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [dbUser?.telegram_id, syncLanguageFromDb]);

  if (authError || (!loading && !dbUser)) {
    return (
      <div className={`h-screen w-full flex items-center justify-center p-6 text-center ${
        isLight ? 'bg-[#F2F2F7] text-[#1C1C1E]' : 'bg-[#000000] text-white'
      }`}>
        <div className="flex flex-col items-center max-w-xs">
          <h2 className="text-xl font-bold mb-2">Rashidov School</h2>
          <p className={`text-sm ${isLight ? 'text-[#6E6E73]' : 'text-[#8E8E93]'}`}>
            {lang === 'ru'
              ? 'Пожалуйста, откройте приложение внутри Telegram-бота и подтвердите авторизацию.'
              : 'Iltimos, ilovani Telegram bot orqali oching.'}
          </p>
        </div>
      </div>
    );
  }

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
