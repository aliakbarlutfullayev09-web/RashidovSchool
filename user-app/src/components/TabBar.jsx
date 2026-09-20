import React from 'react';
import { useHaptic } from '../hooks/useHaptic';
import { Brain, BookOpen, Dna, Trophy, Gamepad2, Swords, User } from 'lucide-react';

export default function TabBar({ activeTab, onTabChange, balance }) {
  const { selectionChanged } = useHaptic();

  const handleTabClick = (tabIndex) => {
    if (tabIndex !== undefined && activeTab !== tabIndex) {
      if (selectionChanged) selectionChanged();
      onTabChange(tabIndex);
    }
  };

  const formattedBalance = (balance || 0).toLocaleString('ru-RU');

  const navItems = [
    { label: formattedBalance, icon: Brain, isBalance: true },
    { label: 'Darslar', icon: Dna, tabIndex: 0 },
    { label: 'Reyting', icon: Trophy, tabIndex: 1 },
    { label: 'Arena', icon: Swords, tabIndex: 2 },
    { label: 'Profil', icon: User, tabIndex: 3 }
  ];

  return (
    <div className="fixed z-50 bottom-4 left-4 right-4 md:bottom-auto md:top-1/2 md:-translate-y-1/2 md:left-4 md:right-auto md:w-[72px]">
      <div className="bg-[#111113]/90 backdrop-blur-xl border border-white/5 rounded-[24px] md:rounded-[32px] px-2 py-3 md:py-6 flex flex-row md:flex-col justify-around md:justify-start md:gap-8 items-center shadow-2xl w-full">
        
        {navItems.map((item, idx) => {
          const isActive = activeTab === item.tabIndex && !item.isBalance;
          const Icon = item.icon;
          
          return (
            <button
              key={idx}
              onClick={() => handleTabClick(item.tabIndex)}
              className={`flex flex-col items-center justify-center min-w-[56px] relative transition-all duration-200 ${item.isBalance ? 'cursor-default' : 'cursor-pointer active:scale-95'}`}
            >
              <div className={`mb-1 p-1.5 rounded-full transition-colors ${isActive ? 'bg-white/10 text-white' : 'text-[#8E8E93]'}`}>
                <Icon className="w-[22px] h-[22px]" strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span 
                className={`text-[10px] font-medium leading-none ${isActive ? 'text-white' : 'text-[#8E8E93]'}`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
        
      </div>
    </div>
  );
}
