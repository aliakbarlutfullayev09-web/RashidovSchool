import React from 'react';
import { Trophy, Sparkles } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function LeaderboardPage({ user }) {
  const { t } = useLanguage();

  return (
    <div 
      className="w-full min-h-[calc(var(--app-viewport-stable-height,100dvh)-80px)] px-4 max-w-md mx-auto flex flex-col items-center justify-center text-center select-none"
      style={{
        paddingTop: 'calc(var(--safe-area-top, 16px) + 20px)',
        paddingBottom: 'calc(var(--safe-area-bottom, 0px) + 96px)'
      }}
    >
      {/* Ambient Glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Glowing Trophy Icon with Sparkles */}
      <div className="relative mb-5 z-10">
        <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-amber-500/20 via-yellow-400/10 to-amber-600/5 border border-amber-500/30 flex items-center justify-center shadow-[0_0_50px_rgba(245,158,11,0.22)]">
          <Trophy className="w-12 h-12 text-amber-400 drop-shadow-[0_0_15px_rgba(245,158,11,0.7)]" />
        </div>
        <div className="absolute -top-2 -right-2 bg-[#1C1C1E] border border-amber-500/40 p-1.5 rounded-full shadow-lg">
          <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
        </div>
      </div>

      {/* "Tez kunlarda" Glowing Pill Badge */}
      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-black uppercase tracking-wider mb-3 shadow-[0_0_20px_rgba(245,158,11,0.2)] z-10">
        <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
        <span>Tez kunlarda</span>
      </div>

      {/* Section Title */}
      <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-wide font-sans z-10">
        Reyting
      </h2>
    </div>
  );
}
