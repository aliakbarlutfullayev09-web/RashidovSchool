import React from 'react';
import { useHaptic } from '../hooks/useHaptic';

export default function TabBar({ activeTab, onTabChange }) {
  const { selectionChanged } = useHaptic();

  const handleTabClick = (index) => {
    if (activeTab !== index) {
      selectionChanged();
      onTabChange(index);
    }
  };

  return (
    <div className="fixed bottom-0 w-full glass pb-safe pt-2 px-6 z-20 shadow-2xl pb-6">
      <div className="flex justify-around items-center h-14">
        <button
          onClick={() => handleTabClick(0)}
          className={`flex flex-col items-center justify-center w-20 transition-colors ${activeTab === 0 ? 'text-white' : 'text-gray-400'}`}
        >
          <span className="text-2xl mb-1">📚</span>
          <span className="text-xs font-medium">Уроки</span>
          {activeTab === 0 && <div className="h-1 w-1 bg-blue-400 rounded-full mt-1"></div>}
        </button>
        <button
          onClick={() => handleTabClick(1)}
          className={`flex flex-col items-center justify-center w-20 transition-colors ${activeTab === 1 ? 'text-white' : 'text-gray-400'}`}
        >
          <span className="text-2xl mb-1">👤</span>
          <span className="text-xs font-medium">Профиль</span>
          {activeTab === 1 && <div className="h-1 w-1 bg-blue-400 rounded-full mt-1"></div>}
        </button>
      </div>
    </div>
  );
}
