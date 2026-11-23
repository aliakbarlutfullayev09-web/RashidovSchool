import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Moon, Sun, Monitor, Globe, Volume2, VolumeX, 
  Smartphone, Bell, BellOff, Check, Sparkles, CheckCircle2 
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { useHaptic } from '../hooks/useHaptic';

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

  // Interactive test status indicator
  const [testedAt, setTestedAt] = useState(false);

  // Native Telegram WebApp BackButton integration
  useEffect(() => {
    if (!isOpen) return;

    const tg = window.Telegram?.WebApp;
    if (tg?.BackButton && tg.isVersionAtLeast && tg.isVersionAtLeast('6.1')) {
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
        try {
          tg.BackButton.offClick(handleTelegramBack);
        } catch {}
      };
    }
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
      // Immediate feedback so user hears it's working
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
      // Immediate feedback so user feels it's working
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

  // Test sound & vibration button handler
  const handleTestFeedback = () => {
    testFeedback();
    setTestedAt(true);
    setTimeout(() => {
      setTestedAt(false);
    }, 2000);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md">
        
        {/* Backdrop click dismiss */}
        <div 
          onClick={onClose} 
          className="absolute inset-0 z-0" 
          aria-label="Backdrop"
        />

        {/* Modal Window Sheet */}
        <motion.div
          initial={{ opacity: 0, y: 80, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 80, scale: 0.98 }}
          transition={{ type: 'spring', damping: 26, stiffness: 320 }}
          className={`relative z-10 w-full max-w-lg rounded-t-[32px] sm:rounded-[32px] max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border ${
            isLight 
              ? 'bg-[#F2F2F7] text-gray-900 border-black/10' 
              : 'bg-[#1C1C1E] text-white border-white/10'
          }`}
        >
          {/* Top iOS Grabber Bar for mobile sheets */}
          <div className="pt-3 pb-1 flex justify-center sm:hidden">
            <div className={`w-10 h-1.5 rounded-full ${isLight ? 'bg-black/20' : 'bg-white/20'}`} />
          </div>

          {/* Mini App System Navigation Header */}
          <div className={`px-5 py-3.5 flex items-center justify-between border-b ${
            isLight ? 'border-black/5 bg-white/70' : 'border-white/5 bg-[#161618]/70'
          } backdrop-blur-md`}>
            
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-500/15 border border-blue-500/25 flex items-center justify-center text-blue-500 font-bold text-lg">
                ⚙️
              </div>
              <div>
                <h3 className="font-extrabold text-base leading-tight">
                  {t('sozlamalar')}
                </h3>
                <span className={`text-[11px] ${isLight ? 'text-gray-500' : 'text-[#8E8E93]'}`}>
                  Rashidov EdTech • Telegram Mini App
                </span>
              </div>
            </div>

            {/* Telegram Mini App System Close Button */}
            <button
              onClick={() => {
                impactLight();
                onClose();
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 ${
                isLight 
                  ? 'bg-black/5 hover:bg-black/10 text-gray-700' 
                  : 'bg-white/10 hover:bg-white/15 text-white/90'
              }`}
              title={t('yopish')}
            >
              <span>{t('yopish')}</span>
              <X className="w-4 h-4 ml-0.5" />
            </button>
          </div>

          {/* Scrollable Content Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5 no-scrollbar">

            {/* ── SECTION 1: THEME SELECTION (Dark / Light / System) ── */}
            <div>
              <div className="flex items-center justify-between mb-2 px-1">
                <span className={`text-xs font-bold uppercase tracking-wider ${
                  isLight ? 'text-gray-500' : 'text-[#8E8E93]'
                }`}>
                  {t('mavzu_sarlavha')}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-blue-500/15 text-blue-500">
                  {theme === 'dark' ? t('mavzu_qorongu') : theme === 'light' ? t('mavzu_yorug') : t('mavzu_tizim')}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {/* Dark Theme (Default) */}
                <button
                  onClick={() => handleThemeChange('dark')}
                  className={`p-3.5 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition-all text-center relative ${
                    theme === 'dark'
                      ? 'bg-[#007AFF] border-[#007AFF] text-white shadow-lg shadow-blue-500/25'
                      : isLight
                        ? 'bg-white border-black/5 text-gray-700 hover:border-black/15'
                        : 'bg-[#2C2C2E] border-white/5 text-[#8E8E93] hover:text-white'
                  }`}
                >
                  <Moon className="w-5 h-5 mb-0.5" />
                  <span className="text-xs font-bold leading-tight">{t('mavzu_qorongu')}</span>
                  <span className={`text-[9px] ${theme === 'dark' ? 'text-white/80' : 'text-[#8E8E93]'}`}>
                    OLED Black
                  </span>
                  {theme === 'dark' && (
                    <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-white shadow" />
                  )}
                </button>

                {/* Light Theme */}
                <button
                  onClick={() => handleThemeChange('light')}
                  className={`p-3.5 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition-all text-center relative ${
                    theme === 'light'
                      ? 'bg-[#007AFF] border-[#007AFF] text-white shadow-lg shadow-blue-500/25'
                      : isLight
                        ? 'bg-white border-black/5 text-gray-700 hover:border-black/15'
                        : 'bg-[#2C2C2E] border-white/5 text-[#8E8E93] hover:text-white'
                  }`}
                >
                  <Sun className="w-5 h-5 mb-0.5" />
                  <span className="text-xs font-bold leading-tight">{t('mavzu_yorug')}</span>
                  <span className={`text-[9px] ${theme === 'light' ? 'text-white/80' : 'text-[#8E8E93]'}`}>
                    Silver Light
                  </span>
                  {theme === 'light' && (
                    <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-white shadow" />
                  )}
                </button>

                {/* System Theme */}
                <button
                  onClick={() => handleThemeChange('system')}
                  className={`p-3.5 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition-all text-center relative ${
                    theme === 'system'
                      ? 'bg-[#007AFF] border-[#007AFF] text-white shadow-lg shadow-blue-500/25'
                      : isLight
                        ? 'bg-white border-black/5 text-gray-700 hover:border-black/15'
                        : 'bg-[#2C2C2E] border-white/5 text-[#8E8E93] hover:text-white'
                  }`}
                >
                  <Monitor className="w-5 h-5 mb-0.5" />
                  <span className="text-xs font-bold leading-tight">{t('mavzu_tizim')}</span>
                  <span className={`text-[9px] ${theme === 'system' ? 'text-white/80' : 'text-[#8E8E93]'}`}>
                    Auto OS
                  </span>
                  {theme === 'system' && (
                    <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-white shadow" />
                  )}
                </button>
              </div>
            </div>

            {/* ── SECTION 2: LANGUAGE (Uzbek / Russian) ── */}
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
                  className={`p-3.5 rounded-2xl border flex items-center justify-between transition-all ${
                    lang === 'uz'
                      ? 'bg-[#007AFF] border-[#007AFF] text-white shadow-lg shadow-blue-500/20'
                      : isLight
                        ? 'bg-white border-black/5 text-gray-800 hover:border-black/15'
                        : 'bg-[#2C2C2E] border-white/5 text-[#8E8E93] hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">🇺🇿</span>
                    <div className="text-left">
                      <div className="text-xs font-bold">O'zbekcha</div>
                      <div className={`text-[10px] ${lang === 'uz' ? 'text-white/80' : 'text-[#8E8E93]'}`}>
                        Asosiy til
                      </div>
                    </div>
                  </div>
                  {lang === 'uz' && <Check className="w-4 h-4 text-white" />}
                </button>

                {/* Russian */}
                <button
                  onClick={() => handleLangChange('ru')}
                  className={`p-3.5 rounded-2xl border flex items-center justify-between transition-all ${
                    lang === 'ru'
                      ? 'bg-[#007AFF] border-[#007AFF] text-white shadow-lg shadow-blue-500/20'
                      : isLight
                        ? 'bg-white border-black/5 text-gray-800 hover:border-black/15'
                        : 'bg-[#2C2C2E] border-white/5 text-[#8E8E93] hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">🇷🇺</span>
                    <div className="text-left">
                      <div className="text-xs font-bold">Русский</div>
                      <div className={`text-[10px] ${lang === 'ru' ? 'text-white/80' : 'text-[#8E8E93]'}`}>
                        Язык перевода
                      </div>
                    </div>
                  </div>
                  {lang === 'ru' && <Check className="w-4 h-4 text-white" />}
                </button>
              </div>
            </div>

            {/* ── SECTION 3: SOUND & VIBRATION (Fixed Audio Synthesizer + Haptic) ── */}
            <div>
              <span className={`text-xs font-bold uppercase tracking-wider mb-2 block px-1 ${
                isLight ? 'text-gray-500' : 'text-[#8E8E93]'
              }`}>
                {t('ovoz_sarlavha')} & {t('vibratsiya_sarlavha')}
              </span>

              <div className={`rounded-2xl border overflow-hidden divide-y ${
                isLight 
                  ? 'bg-white border-black/5 divide-black/5' 
                  : 'bg-[#2C2C2E] border-white/5 divide-white/5'
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
                    <div>
                      <div className="text-xs font-bold">{t('ovoz_sarlavha')}</div>
                      <div className={`text-[10px] ${isLight ? 'text-gray-500' : 'text-[#8E8E93]'}`}>
                        {t('ovoz_izoh')}
                      </div>
                    </div>
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

                {/* Haptic Vibration Toggle */}
                <div className="p-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                      hapticEnabled 
                        ? 'bg-blue-500/20 text-blue-500 border border-blue-500/30' 
                        : isLight ? 'bg-black/5 text-gray-400' : 'bg-white/5 text-white/40'
                    }`}>
                      <Smartphone className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold">{t('vibratsiya_sarlavha')}</div>
                      <div className={`text-[10px] ${isLight ? 'text-gray-500' : 'text-[#8E8E93]'}`}>
                        {t('vibratsiya_izoh')}
                      </div>
                    </div>
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

                {/* Interactive Feedback Tester Button */}
                <div className="p-3.5">
                  <button
                    onClick={handleTestFeedback}
                    className={`w-full py-2.5 px-4 rounded-xl border flex items-center justify-between text-xs font-bold transition-all active:scale-[0.98] ${
                      testedAt
                        ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                        : isLight
                          ? 'bg-black/5 border-black/5 hover:bg-black/10 text-gray-800'
                          : 'bg-white/5 border-white/5 hover:bg-white/10 text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {testedAt ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Sparkles className="w-4 h-4 text-amber-400" />
                      )}
                      <span>
                        {testedAt ? (lang === 'ru' ? 'Звук и вибрация работают!' : 'Ovoz va vibratsiya ishlamoqda!') : t('sinab_korish')}
                      </span>
                    </div>

                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      testedAt 
                        ? 'bg-emerald-500 text-white' 
                        : isLight ? 'bg-black/10 text-gray-600' : 'bg-white/10 text-white/70'
                    }`}>
                      {testedAt ? '✓ 100%' : (lang === 'ru' ? 'Тест' : 'Sinash')}
                    </span>
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
                isLight ? 'bg-white border-black/5' : 'bg-[#2C2C2E] border-white/5'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    pushEnabled 
                      ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30' 
                      : isLight ? 'bg-black/5 text-gray-400' : 'bg-white/5 text-white/40'
                  }`}>
                    {pushEnabled ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
                  </div>
                  <div>
                    <div className="text-xs font-bold">{t('push_sarlavha')}</div>
                    <div className={`text-[10px] ${isLight ? 'text-gray-500' : 'text-[#8E8E93]'}`}>
                      {t('push_izoh')}
                    </div>
                  </div>
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

          {/* ── SECTION 5: SYSTEM CLOSE BUTTON FOOTER ── */}
          <div className={`p-4 border-t ${
            isLight ? 'border-black/5 bg-white/70' : 'border-white/5 bg-[#161618]/70'
          } backdrop-blur-md`}>
            <button
              onClick={() => {
                impactLight();
                onClose();
              }}
              className="w-full py-3.5 px-4 rounded-2xl bg-[#007AFF] hover:bg-[#0062CC] active:scale-[0.98] text-white font-bold text-sm shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition-all"
            >
              <Check className="w-4 h-4" />
              <span>{t('yopish')}</span>
            </button>
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
}
