import React from 'react';
import { ArrowLeft } from 'lucide-react';
import RashidovLogo from './RashidovLogo';

/**
 * Unified OLED Glassmorphism Header with strictly horizontally centered Rashidov SCHOOL logo.
 * Applied uniformly across all sections (Darslar, Testlar, Reyting, Profil).
 */
export default function Header({ onBack, showBackButton = false }) {
  return (
    <header 
      className="sticky top-0 z-30 w-full glass-header pointer-events-auto"
      style={{
        paddingTop: 'calc(var(--safe-area-top, 16px) + 4px)',
        paddingBottom: '8px'
      }}
    >
      <div className="relative w-full max-w-md mx-auto h-9 flex items-center justify-center px-4">
        {/* Fallback BackButton for non-Telegram browser environments */}
        {showBackButton && typeof onBack === 'function' && (
          <button
            onClick={onBack}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-[#1C1C1E]/80 border border-white/10 flex items-center justify-center text-white active:scale-95 transition-transform"
            title="Orqaga"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        )}

        {/* Strictly Horizontally Centered Logo across the entire window width */}
        <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none">
          <RashidovLogo className="h-7 pointer-events-auto" />
        </div>
      </div>

      {/* Soft gradient scrim fading out underneath */}
      <div className="absolute top-full left-0 right-0 h-5 bg-gradient-to-b from-[#0a0a0c]/85 to-transparent pointer-events-none" />
    </header>
  );
}
