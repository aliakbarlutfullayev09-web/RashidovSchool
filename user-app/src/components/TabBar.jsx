import React from 'react';
import { motion } from 'framer-motion';
import { BookOpen, FileCheck2, Trophy, User } from 'lucide-react';
import { useHaptic } from '../hooks/useHaptic';
import { useLanguage } from '../context/LanguageContext';

export default function TabBar({ activeTab, onTabChange }) {
  const { selectionChanged } = useHaptic();
  const { t } = useLanguage();

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
      className="fixed left-1/2 -translate-x-1/2 w-[92%] max-w-[420px] z-40 transition-all duration-200"
      style={{
        bottom: 'calc(var(--safe-area-bottom, 0px) + 12px)'
      }}
    >
      <div className="glass-dock rounded-full px-2 py-1.5 flex items-center justify-around relative">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className="relative flex flex-col items-center justify-center flex-1 py-1.5 px-2 rounded-full cursor-pointer select-none transition-transform active:scale-95"
            >
              {/* Active Tab Sliding Pill Indicator */}
              {isActive && (
                <motion.div
                  layoutId="activeTabIndicator"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  className="absolute inset-0 bg-white/10 rounded-full"
                />
              )}

              <div className={`relative z-10 transition-colors duration-200 ${isActive ? 'text-[#007AFF]' : 'text-[#8E8E93]'}`}>
                <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
              </div>

              <span
                className={`relative z-10 text-[10px] font-semibold mt-0.5 leading-tight transition-colors duration-200 ${
                  isActive ? 'text-white' : 'text-[#8E8E93]'
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
