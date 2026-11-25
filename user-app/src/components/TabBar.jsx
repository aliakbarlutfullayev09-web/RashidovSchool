import React from 'react';
import { motion } from 'framer-motion';
import { BookOpen, FileCheck2, Trophy, User } from 'lucide-react';
import { useHaptic } from '../hooks/useHaptic';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { useIsDesktop } from '../hooks/useIsDesktop';

export default function TabBar({ activeTab, onTabChange }) {
  const { selectionChanged } = useHaptic();
  const { t } = useLanguage();
  const { resolvedTheme } = useTheme();
  const isDesktop = useIsDesktop();
  const isLight = resolvedTheme === 'light';

  const handleTabClick = (tabIndex) => {
    if (activeTab !== tabIndex) {
      if (selectionChanged) selectionChanged();
      onTabChange(tabIndex);
    }
  };

  const tabs = [
    { id: 0, label: t('darslar'), icon: BookOpen },
    { id: 1, label: t('testlar'), icon: FileCheck2 },
    { id: 2, label: t('reyting'), icon: Trophy },
    { id: 3, label: t('profil'), icon: User },
  ];

  return (
    <nav 
      className={`fixed z-40 transition-all duration-200 ${
        isDesktop
          ? 'top-1/2 -translate-y-1/2 w-auto'
          : 'left-1/2 -translate-x-1/2 w-[92%] max-w-[420px]'
      }`}
      style={{
        bottom: isDesktop ? 'auto' : 'calc(var(--safe-area-bottom, 0px) + 12px)',
        top: isDesktop ? '50%' : 'auto',
        transform: isDesktop ? 'translateY(-50%)' : 'translateX(-50%)',
        left: isDesktop ? 'calc(var(--safe-area-left, 0px) + 14px)' : '50%'
      }}
    >
      <div className={`glass-dock flex items-center relative ${
        isDesktop
          ? `flex-col rounded-full p-1.5 sm:p-2 gap-1.5 sm:gap-2 shadow-2xl border ${
              isLight ? 'border-black/10' : 'border-white/10'
            }`
          : 'rounded-full px-2 py-1.5 justify-around'
      }`}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={`relative flex flex-col items-center justify-center cursor-pointer select-none transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#007AFF] ${
                isDesktop
                  ? 'flex-none w-12 h-12 sm:w-14 sm:h-14 p-1 sm:p-1.5 rounded-full'
                  : 'flex-1 py-1.5 px-2 rounded-full'
              }`}
              aria-label={tab.label}
            >
              {/* Active Tab Sliding Pill Indicator */}
              {isActive && (
                <motion.div
                  layoutId="activeTabIndicator"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  className={`absolute inset-0 rounded-full ${
                    isLight ? 'bg-blue-500/12' : 'bg-white/10'
                  }`}
                />
              )}

              <div className={`relative z-10 transition-colors duration-200 ${
                isActive ? 'text-[#007AFF]' : isLight ? 'text-[#6E6E73]' : 'text-[#8E8E93]'
              }`}>
                <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
              </div>

              <span
                className={`relative z-10 text-[10px] font-semibold mt-0.5 leading-tight transition-colors duration-200 ${
                  isActive
                    ? isLight ? 'text-[#1C1C1E]' : 'text-white'
                    : isLight ? 'text-[#6E6E73]' : 'text-[#8E8E93]'
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
