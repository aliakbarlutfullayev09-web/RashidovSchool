import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Globe, Volume2, Smartphone, Check } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useHaptic } from '../hooks/useHaptic';

export default function SettingsModal({ isOpen, onClose }) {
  const { lang, setLang, t } = useLanguage();
  const { selectionChanged, impactMedium } = useHaptic();

  const [soundEnabled, setSoundEnabled] = useState(() => {
    return localStorage.getItem('rb_sound') !== 'false';
  });

  const [hapticEnabled, setHapticEnabled] = useState(() => {
    return localStorage.getItem('rb_haptic') !== 'false';
  });

  if (!isOpen) return null;

  const handleLangChange = (newLang) => {
    if (newLang !== lang) {
      selectionChanged();
      setLang(newLang);
    }
  };

  const toggleSound = () => {
    impactMedium();
    const next = !soundEnabled;
    setSoundEnabled(next);
    localStorage.setItem('rb_sound', String(next));
  };

  const toggleHaptic = () => {
    impactMedium();
    const next = !hapticEnabled;
    setHapticEnabled(next);
    localStorage.setItem('rb_haptic', String(next));
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-sm bg-[#1C1C1E] border border-white/10 rounded-[28px] p-6 shadow-2xl relative"
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/70"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-lg">
              ⚙️
            </div>
            <div>
              <h3 className="text-white font-bold text-base">{t('sozlamalar')}</h3>
              <span className="text-[11px] text-[#8E8E93]">Ilova sozlamalari</span>
            </div>
          </div>

          <div className="space-y-4">
            {/* Language Selection */}
            <div>
              <label className="text-xs text-[#8E8E93] mb-2 block font-medium">Ilova tili (Язык интерфейса)</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleLangChange('uz')}
                  className={`py-3 px-3 rounded-xl border flex items-center justify-between text-xs font-bold transition-all ${
                    lang === 'uz'
                      ? 'bg-[#007AFF] border-[#007AFF] text-white shadow-md'
                      : 'bg-[#2C2C2E] border-white/5 text-[#8E8E93] hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span>🇺🇿</span>
                    <span>O'zbekcha</span>
                  </div>
                  {lang === 'uz' && <Check className="w-4 h-4 text-white" />}
                </button>

                <button
                  onClick={() => handleLangChange('ru')}
                  className={`py-3 px-3 rounded-xl border flex items-center justify-between text-xs font-bold transition-all ${
                    lang === 'ru'
                      ? 'bg-[#007AFF] border-[#007AFF] text-white shadow-md'
                      : 'bg-[#2C2C2E] border-white/5 text-[#8E8E93] hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span>🇷🇺</span>
                    <span>Русский</span>
                  </div>
                  {lang === 'ru' && <Check className="w-4 h-4 text-white" />}
                </button>
              </div>
            </div>

            {/* Sound Toggle */}
            <div className="bg-[#2C2C2E] border border-white/5 p-3.5 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white">
                  <Volume2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-white text-xs font-bold">Ovoz effektlari</div>
                  <div className="text-[10px] text-[#8E8E93]">Test va tugmalar tovushlari</div>
                </div>
              </div>

              <button
                onClick={toggleSound}
                className={`w-12 h-6 rounded-full p-0.5 transition-colors ${soundEnabled ? 'bg-[#34C759]' : 'bg-[#3A3A3C]'}`}
              >
                <div className={`w-5 h-5 rounded-full bg-white transition-transform ${soundEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
              </button>
            </div>

            {/* Haptic Toggle */}
            <div className="bg-[#2C2C2E] border border-white/5 p-3.5 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-white text-xs font-bold">Vibratsiya (Haptic)</div>
                  <div className="text-[10px] text-[#8E8E93]">Telegram taktil aloqasi</div>
                </div>
              </div>

              <button
                onClick={toggleHaptic}
                className={`w-12 h-6 rounded-full p-0.5 transition-colors ${hapticEnabled ? 'bg-[#34C759]' : 'bg-[#3A3A3C]'}`}
              >
                <div className={`w-5 h-5 rounded-full bg-white transition-transform ${hapticEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
