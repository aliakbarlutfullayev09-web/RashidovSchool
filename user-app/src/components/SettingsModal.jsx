import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Moon, Sun, Monitor, Volume2, VolumeX, 
  Smartphone, Bell, BellOff, Check, Settings 
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { useHaptic } from '../hooks/useHaptic';

// Authentic SVG Flag of Uzbekistan
const UzbekFlag = ({ className = "w-6 h-4" }) => (
  <svg className={`${className} rounded-[3px] shadow-sm shrink-0`} viewBox="0 0 640 480">
    <path fill="#0099b5" d="M0 0h640v160H0z"/>
    <path fill="#ce1126" d="M0 155h640v10H0z"/>
    <path fill="#ffffff" d="M0 160h640v160H0z"/>
    <path fill="#ce1126" d="M0 315h640v10H0z"/>
    <path fill="#1eb53a" d="M0 320h640v160H0z"/>
    <circle cx="80" cy="80" r="50" fill="#ffffff"/>
    <circle cx="95" cy="80" r="42" fill="#0099b5"/>
    <g fill="#ffffff">
      <circle cx="150" cy="45" r="7"/>
      <circle cx="175" cy="45" r="7"/>
      <circle cx="200" cy="45" r="7"/>
      <circle cx="150" cy="80" r="7"/>
      <circle cx="175" cy="80" r="7"/>
      <circle cx="200" cy="80" r="7"/>
      <circle cx="125" cy="80" r="7"/>
      <circle cx="150" cy="115" r="7"/>
      <circle cx="175" cy="115" r="7"/>
      <circle cx="200" cy="115" r="7"/>
      <circle cx="125" cy="115" r="7"/>
      <circle cx="100" cy="115" r="7"/>
    </g>
  </svg>
);

// Authentic SVG Flag of Russia
const RussianFlag = ({ className = "w-6 h-4" }) => (
  <svg className={`${className} rounded-[3px] shadow-sm shrink-0`} viewBox="0 0 640 480">
    <path fill="#ffffff" d="M0 0h640v160H0z"/>
    <path fill="#0039a6" d="M0 160h640v160H0z"/>
    <path fill="#d52b1e" d="M0 320h640v160H0z"/>
  </svg>
);

export default function SettingsModal({ isOpen, onClose }) {
  const { lang, setLang, t } = useLanguage();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { selectionChanged, impactLight, impactMedium, testFeedback } = useHaptic();

  const isLight = resolvedTheme === 'light';

  // Audio / Sound state
  const [soundEnabled, setSoundEnabled] = useState(() => {
    return localStorage.getItem('rb_sound') !== 'false';
  });

  // Haptic / Vibration state
  const [hapticEnabled, setHapticEnabled] = useState(() => {
    return localStorage.getItem('rb_haptic') !== 'false';
  });

  // Push notifications state
  const [pushEnabled, setPushEnabled] = useState(() => {
    return localStorage.getItem('rb_push_notifications') !== 'false';
  });

  // Native Telegram WebApp BackButton integration
  useEffect(() => {
    if (!isOpen) return;

    // Sync document.title for Telegram native header
    const prevTitle = document.title;
    document.title = t('sozlamalar');

    const tg = window.Telegram?.WebApp;
    if (tg?.BackButton) {
      const handleTelegramBack = () => {
        onClose();
      };
      
      try {
        tg.BackButton.show();
        tg.BackButton.onClick(handleTelegramBack);
      } catch (e) {
        console.warn('Telegram BackButton attach error in SettingsModal:', e);
      }

      return () => {
        document.title = prevTitle;
        try {
          tg.BackButton.offClick(handleTelegramBack);
          tg.BackButton.hide();
        } catch {}
      };
    }

    return () => {
      document.title = prevTitle;
    };
  }, [isOpen, onClose, t]);

  // Keyboard Escape listener
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Theme switch handler
  const handleThemeChange = (newTheme) => {
    if (newTheme !== theme) {
      selectionChanged();
      setTheme(newTheme);
    }
  };

  // Language switch handler
  const handleLangChange = (newLang) => {
    if (newLang !== lang) {
      selectionChanged();
      setLang(newLang);
    }
  };

  // Sound toggle handler
  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    localStorage.setItem('rb_sound', String(next));
    if (next) {
      setTimeout(() => {
        testFeedback();
      }, 50);
    } else {
      impactLight();
    }
  };

  // Haptic toggle handler
  const toggleHaptic = () => {
    const next = !hapticEnabled;
    setHapticEnabled(next);
    localStorage.setItem('rb_haptic', String(next));
    if (next) {
      setTimeout(() => {
        impactMedium();
      }, 50);
    }
  };

  // Push notification toggle handler
  const togglePush = () => {
    impactLight();
    const next = !pushEnabled;
    setPushEnabled(next);
    localStorage.setItem('rb_push_notifications', String(next));
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.99 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.99 }}
        transition={{ duration: 0.18 }}
        className={`fixed inset-0 z-[120] flex flex-col select-none ${
          isLight 
            ? 'bg-[#F2F2F7] text-gray-900' 
            : 'bg-[#000000] text-white'
        }`}
      >
        {/* Fullscreen Header with centered title between Telegram's back and menu controls */}
        <div 
          className={`px-4 pb-3 flex items-center justify-center border-b ${
            isLight ? 'border-black/5 bg-white/80' : 'border-white/5 bg-[#121214]/80'
          } backdrop-blur-xl shrink-0`}
          style={{
            paddingTop: 'max(calc(var(--safe-area-top, 0px) + 6px), 12px)'
          }}
        >
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-500/15 border border-blue-500/25 flex items-center justify-center text-blue-400 font-bold shrink-0">
              <Settings className="w-4 h-4 text-blue-400" />
            </div>
            <h3 className="font-extrabold text-base leading-tight text-center">
              {t('sozlamalar')}
            </h3>
          </div>
        </div>

        {/* Scrollable Compact Settings Body */}
        <div 
          className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar"
          style={{
            paddingBottom: 'max(calc(var(--safe-area-bottom, 0px) + 24px), 32px)'
          }}
        >

          {/* ── SECTION 1: THEME SELECTION (Dark / Light / System) ── */}
          <div>
            <span className={`text-xs font-bold uppercase tracking-wider mb-2 block px-1 ${
              isLight ? 'text-gray-500' : 'text-[#8E8E93]'
            }`}>
              {t('mavzu_sarlavha')}
            </span>

            <div className="grid grid-cols-3 gap-2">
              {/* Dark Theme (Default) */}
              <button
                onClick={() => handleThemeChange('dark')}
                className={`py-3 px-2 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition-all text-center relative ${
                  theme === 'dark'
                    ? 'bg-[#007AFF] border-[#007AFF] text-white shadow-lg shadow-blue-500/25'
                    : isLight
                      ? 'bg-white border-black/5 text-gray-700 hover:border-black/15'
                      : 'bg-[#1C1C1E] border-white/5 text-[#8E8E93] hover:text-white'
                }`}
              >
                <Moon className="w-5 h-5" />
                <span className="text-xs font-bold leading-tight">{t('mavzu_qorongu')}</span>
                {theme === 'dark' && (
                  <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-white shadow" />
                )}
              </button>

              {/* Light Theme */}
              <button
                onClick={() => handleThemeChange('light')}
                className={`py-3 px-2 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition-all text-center relative ${
                  theme === 'light'
                    ? 'bg-[#007AFF] border-[#007AFF] text-white shadow-lg shadow-blue-500/25'
                    : isLight
                      ? 'bg-white border-black/5 text-gray-700 hover:border-black/15'
                      : 'bg-[#1C1C1E] border-white/5 text-[#8E8E93] hover:text-white'
                }`}
              >
                <Sun className="w-5 h-5" />
                <span className="text-xs font-bold leading-tight">{t('mavzu_yorug')}</span>
                {theme === 'light' && (
                  <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-white shadow" />
                )}
              </button>

              {/* System Theme */}
              <button
                onClick={() => handleThemeChange('system')}
                className={`py-3 px-2 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition-all text-center relative ${
                  theme === 'system'
                    ? 'bg-[#007AFF] border-[#007AFF] text-white shadow-lg shadow-blue-500/25'
                    : isLight
                      ? 'bg-white border-black/5 text-gray-700 hover:border-black/15'
                      : 'bg-[#1C1C1E] border-white/5 text-[#8E8E93] hover:text-white'
                }`}
              >
                <Monitor className="w-5 h-5" />
                <span className="text-xs font-bold leading-tight">{t('mavzu_tizim')}</span>
                {theme === 'system' && (
                  <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-white shadow" />
                )}
              </button>
            </div>
          </div>

          {/* ── SECTION 2: LANGUAGE (Uzbek / Russian with Real SVG Flags) ── */}
          <div>
            <span className={`text-xs font-bold uppercase tracking-wider mb-2 block px-1 ${
              isLight ? 'text-gray-500' : 'text-[#8E8E93]'
            }`}>
              {t('til_sarlavha')}
            </span>

            <div className="grid grid-cols-2 gap-2">
              {/* Uzbek (Default) */}
              <button
                onClick={() => handleLangChange('uz')}
                className={`p-3 rounded-2xl border flex items-center justify-between transition-all ${
                  lang === 'uz'
                    ? 'bg-[#007AFF] border-[#007AFF] text-white shadow-lg shadow-blue-500/20'
                    : isLight
                      ? 'bg-white border-black/5 text-gray-800 hover:border-black/15'
                      : 'bg-[#1C1C1E] border-white/5 text-[#8E8E93] hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <UzbekFlag className="w-6 h-4" />
                  <span className="text-xs font-bold">O'zbekcha</span>
                </div>
                {lang === 'uz' && <Check className="w-4 h-4 text-white shrink-0" />}
              </button>

              {/* Russian */}
              <button
                onClick={() => handleLangChange('ru')}
                className={`p-3 rounded-2xl border flex items-center justify-between transition-all ${
                  lang === 'ru'
                    ? 'bg-[#007AFF] border-[#007AFF] text-white shadow-lg shadow-blue-500/20'
                    : isLight
                      ? 'bg-white border-black/5 text-gray-800 hover:border-black/15'
                      : 'bg-[#1C1C1E] border-white/5 text-[#8E8E93] hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <RussianFlag className="w-6 h-4" />
                  <span className="text-xs font-bold">Русский</span>
                </div>
                {lang === 'ru' && <Check className="w-4 h-4 text-white shrink-0" />}
              </button>
            </div>
          </div>

          {/* ── SECTION 3: SOUND & VIBRATION ── */}
          <div>
            <span className={`text-xs font-bold uppercase tracking-wider mb-2 block px-1 ${
              isLight ? 'text-gray-500' : 'text-[#8E8E93]'
            }`}>
              {t('ovoz_sarlavha')} & {t('vibratsiya_sarlavha')}
            </span>

            <div className={`rounded-2xl border overflow-hidden divide-y ${
              isLight 
                ? 'bg-white border-black/5 divide-black/5' 
                : 'bg-[#1C1C1E] border-white/5 divide-white/5 shadow-md'
            }`}>
              {/* Sound FX Toggle */}
              <div className="p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    soundEnabled 
                      ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30' 
                      : isLight ? 'bg-black/5 text-gray-400' : 'bg-white/5 text-white/40'
                  }`}>
                    {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                  </div>
                  <span className="text-xs font-bold">{t('ovoz_sarlavha')}</span>
                </div>

                {/* iOS Style Toggle Switch */}
                <button
                  onClick={toggleSound}
                  className={`w-12 h-7 rounded-full p-0.5 transition-colors duration-200 ease-in-out focus:outline-none ${
                    soundEnabled ? 'bg-[#34C759]' : isLight ? 'bg-gray-300' : 'bg-[#3A3A3C]'
                  }`}
                >
                  <div className={`w-6 h-6 rounded-full bg-white shadow-md transform transition-transform duration-200 ease-in-out ${
                    soundEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              {/* Vibration Toggle */}
              <div className="p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    hapticEnabled 
                      ? 'bg-blue-500/20 text-blue-500 border border-blue-500/30' 
                      : isLight ? 'bg-black/5 text-gray-400' : 'bg-white/5 text-white/40'
                  }`}>
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold">{t('vibratsiya_sarlavha')}</span>
                </div>

                {/* iOS Style Toggle Switch */}
                <button
                  onClick={toggleHaptic}
                  className={`w-12 h-7 rounded-full p-0.5 transition-colors duration-200 ease-in-out focus:outline-none ${
                    hapticEnabled ? 'bg-[#34C759]' : isLight ? 'bg-gray-300' : 'bg-[#3A3A3C]'
                  }`}
                >
                  <div className={`w-6 h-6 rounded-full bg-white shadow-md transform transition-transform duration-200 ease-in-out ${
                    hapticEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>
            </div>
          </div>

          {/* ── SECTION 4: PUSH NOTIFICATIONS ── */}
          <div>
            <span className={`text-xs font-bold uppercase tracking-wider mb-2 block px-1 ${
              isLight ? 'text-gray-500' : 'text-[#8E8E93]'
            }`}>
              {t('push_sarlavha')}
            </span>

            <div className={`rounded-2xl border p-3.5 flex items-center justify-between ${
              isLight ? 'bg-white border-black/5' : 'bg-[#1C1C1E] border-white/5 shadow-md'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                  pushEnabled 
                    ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30' 
                    : isLight ? 'bg-black/5 text-gray-400' : 'bg-white/5 text-white/40'
                }`}>
                  {pushEnabled ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
                </div>
                <span className="text-xs font-bold">{t('push_sarlavha')}</span>
              </div>

              {/* iOS Style Toggle Switch */}
              <button
                onClick={togglePush}
                className={`w-12 h-7 rounded-full p-0.5 transition-colors duration-200 ease-in-out focus:outline-none ${
                  pushEnabled ? 'bg-[#34C759]' : isLight ? 'bg-gray-300' : 'bg-[#3A3A3C]'
                }`}
              >
                <div className={`w-6 h-6 rounded-full bg-white shadow-md transform transition-transform duration-200 ease-in-out ${
                  pushEnabled ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </button>
            </div>
          </div>

        </div>
      </motion.div>
    </AnimatePresence>
  );
}
