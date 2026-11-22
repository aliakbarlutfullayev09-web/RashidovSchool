import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Flame, Sparkles } from 'lucide-react';
import { formatCompactNeyron } from '../utils/formatters';
import { useLanguage } from '../context/LanguageContext';
import { useHaptic } from '../hooks/useHaptic';

export default function Header({ user, onOpenTopUp }) {
  const { t } = useLanguage();
  const { impactLight } = useHaptic();
  const [showStreakTooltip, setShowStreakTooltip] = useState(false);

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length > 1) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const fullName = user?.full_name || 'Foydalanuvchi';
  const classGroup = user?.class_group || 'Abituriyent';
  const balance = user?.balance || 0;
  const streak = user?.streak_days || 0;

  const handleStreakClick = () => {
    impactLight();
    setShowStreakTooltip(prev => !prev);
    setTimeout(() => {
      setShowStreakTooltip(false);
    }, 3500);
  };

  return (
    <header 
      className="w-full bg-[#000000] sticky top-0 z-30 pb-3 px-4 border-b border-white/[0.04]"
      style={{
        paddingTop: 'calc(var(--safe-area-top, 16px) + 8px)'
      }}
    >
      <div className="flex items-center justify-between gap-2 max-w-5xl mx-auto">
        
        {/* Left: Avatar + Name + Class */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="avatar-ring flex-shrink-0 w-10 h-10 p-[2px] rounded-full">
            <div className="avatar-ring-inner w-full h-full bg-[#1C1C1E] rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold tracking-tight">
                {getInitials(fullName)}
              </span>
            </div>
          </div>

          <div className="flex flex-col min-w-0 justify-center">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-white text-[13px] font-bold truncate leading-tight">
                {fullName}
              </span>
              <span className="flex-shrink-0 bg-[#2C2C2E] border border-white/5 text-white/90 text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                {classGroup}
              </span>
            </div>
            <span className="text-[10px] text-[#8E8E93] leading-tight">
              {t('rashidov_school')}
            </span>
          </div>
        </div>

        {/* Center & Right Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          
          {/* Center: Daily Streak */}
          <div className="relative">
            <button
              onClick={handleStreakClick}
              className="flex items-center gap-1.5 bg-[#1C1C1E] border border-amber-500/30 px-2.5 py-1.5 rounded-full active:scale-95 transition-transform"
            >
              <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              <span className="text-white text-xs font-bold whitespace-nowrap">
                {streak} {t('kun')}
              </span>
            </button>

            {/* Streak Tooltip Toast */}
            <AnimatePresence>
              {showStreakTooltip && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 5, scale: 0.95 }}
                  className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-56 p-3 rounded-2xl bg-[#1C1C1E] border border-amber-500/30 text-white shadow-2xl z-50 text-[11px] leading-relaxed text-center"
                >
                  <div className="flex items-center justify-center gap-1 text-amber-400 font-bold mb-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Streak Bonusi</span>
                  </div>
                  <p className="text-[#8E8E93]">{t('streak_tooltip')}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right: Interactive Neyron Balance Pill */}
          <button
            onClick={() => {
              impactLight();
              if (onOpenTopUp) onOpenTopUp();
            }}
            className="flex items-center gap-1.5 bg-[#1C1C1E] border border-[#007AFF]/30 pl-2.5 pr-1.5 py-1.5 rounded-full active:scale-95 transition-transform group"
          >
            <span className="text-xs">🧠</span>
            <span className="text-white text-xs font-bold max-w-[80px] truncate leading-none">
              {formatCompactNeyron(balance)}
            </span>
            <div className="w-4 h-4 rounded-full bg-[#007AFF] flex items-center justify-center text-white ml-0.5 group-hover:scale-110 transition-transform">
              <Plus className="w-3 h-3 stroke-[3]" />
            </div>
          </button>

        </div>

      </div>
    </header>
  );
}
