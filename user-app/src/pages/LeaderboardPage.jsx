import React from 'react';
import { Trophy } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';

export default function LeaderboardPage({ user }) {
  const { t, lang } = useLanguage();
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === 'light';

  return (
    <div 
      className="w-full h-full flex-1 min-h-0 overflow-hidden px-4 max-w-md mx-auto flex flex-col items-center justify-center text-center select-none relative"
      style={{
        paddingBottom: 'calc(var(--safe-area-bottom, 0px) + 74px)'
      }}
    >
      {/* Ambient Glow */}
      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full blur-3xl pointer-events-none ${
        isLight ? 'bg-amber-400/20' : 'bg-amber-500/10'
      }`} />

      {/* Glowing Trophy Icon */}
      <div className="relative mb-5 z-10">
        <div className={`w-24 h-24 rounded-3xl border flex items-center justify-center ${
          isLight
            ? 'bg-gradient-to-tr from-amber-100 via-amber-50 to-white border-amber-400/45 shadow-[0_12px_36px_rgba(245,158,11,0.2)]'
            : 'bg-gradient-to-tr from-amber-500/20 via-yellow-400/10 to-amber-600/5 border-amber-500/30 shadow-[0_0_50px_rgba(245,158,11,0.22)]'
        }`}>
          <Trophy className={`w-12 h-12 ${
            isLight
              ? 'text-amber-500 drop-shadow-[0_2px_10px_rgba(245,158,11,0.35)]'
              : 'text-amber-400 drop-shadow-[0_0_15px_rgba(245,158,11,0.7)]'
          }`} />
        </div>
      </div>

      {/* "Tez kunlarda" / "Скоро" Glowing Pill Badge */}
      <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-black uppercase tracking-wider mb-3 z-10 ${
        isLight
          ? 'bg-amber-500/15 border-amber-500/35 text-amber-700 shadow-sm'
          : 'bg-amber-500/15 border-amber-500/30 text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.2)]'
      }`}>
        <span className={`w-2 h-2 rounded-full animate-ping ${isLight ? 'bg-amber-500' : 'bg-amber-400'}`} />
        <span>{lang === 'ru' ? 'Скоро' : 'Tez kunlarda'}</span>
      </div>

      {/* Section Title */}
      <h2 className={`text-2xl sm:text-3xl font-black uppercase tracking-wide font-sans z-10 ${
        isLight ? 'text-[#1C1C1E]' : 'text-white'
      }`}>
        {t('reyting')}
      </h2>
    </div>
  );
}
