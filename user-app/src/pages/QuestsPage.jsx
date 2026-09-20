import React from 'react';
import Header from '../components/Header';
import { motion } from 'framer-motion';

export default function QuestsPage({ user = { streak_days: 3, xp: 1200 } }) {
  const streakDays = 7;
  const currentStreak = user?.streak_days || 0;

  const quests = [
    { id: 1, title: "1 ta dars ko'ring", xp: 50, icon: "📹", completed: true },
    { id: 2, title: "1 ta testni toping", xp: 100, icon: "📝", completed: false },
    { id: 3, title: "Do'stingizni taklif qiling", xp: 200, icon: "👥", completed: false },
    { id: 4, title: "Streak saqlang", xp: 75, icon: "🔥", completed: true },
    { id: 5, title: "AI Tahlilni o'qing", xp: 150, icon: "🧠", completed: false },
  ];

  const completedQuests = quests.filter(q => q.completed).length;
  const totalQuests = quests.length;
  const totalXpAvailable = quests.reduce((sum, q) => sum + (q.completed ? 0 : q.xp), 0);

  return (
    <div className="min-h-screen bg-[#000000] pb-32">
      <Header user={user} />
      
      <main className="px-4 mt-6">
        {/* Streak Section */}
        <div className="mb-8">
          <h2 className="text-lg font-bold mb-3 text-white flex items-center gap-2">
            🔥 Haftalik Streak
          </h2>
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: streakDays }).map((_, index) => {
              const day = index + 1;
              const isCompleted = day < currentStreak;
              const isActive = day === currentStreak;
              const isFuture = day > currentStreak;
              const isLast = day === streakDays;
              
              let stateClass = "streak-day bg-[#1C1C1E] border-white/5";
              if (isCompleted) stateClass = "streak-day-completed bg-green-500/10 border-green-500/30";
              if (isActive) stateClass = "streak-day-active bg-blue-500/20 border-blue-500 animate-pulse glow";

              return (
                <div 
                  key={day}
                  className={`flex flex-col items-center justify-center py-3 rounded-xl border ${stateClass}`}
                >
                  <span className="text-[10px] text-white/50 mb-1">{day}-kun</span>
                  {isLast ? (
                    <div className="flex flex-col items-center">
                      <span className={`text-lg mb-1 drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]`}>🎁</span>
                      <span className="text-[10px] font-bold text-white">500 XP</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <span className={`text-sm mb-1 ${isCompleted || isActive ? 'opacity-100' : 'opacity-40'}`}>⭐</span>
                      <span className={`text-[10px] font-bold ${isCompleted || isActive ? 'text-white' : 'text-white/30'}`}>50 XP</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Quests Section */}
        <div>
          <div className="flex justify-between items-end mb-3 mt-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              ⚡ Kunlik Vazifalar
            </h2>
            <div className="text-xs font-medium bg-[#1C1C1E] px-2 py-1 rounded-lg border border-white/10 text-white/70">
              +{totalXpAvailable} XP
            </div>
          </div>
          
          <div className="mb-4">
            <div className="flex justify-between text-xs text-white/50 mb-2">
              <span>Jarayon</span>
              <span>{completedQuests}/{totalQuests} vazifa bajarildi</span>
            </div>
            <div className="h-2 w-full bg-[#1C1C1E] rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-blue-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${(completedQuests / totalQuests) * 100}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>

          <div className="space-y-3">
            {quests.map(quest => (
              <motion.div 
                key={quest.id}
                whileTap={{ scale: 0.98 }}
                className={`card p-4 rounded-[20px] border flex items-center justify-between gap-3 ${
                  quest.completed 
                    ? 'bg-[#1C1C1E]/50 border-white/5 opacity-70' 
                    : 'bg-[#1C1C1E] border-white/10'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`text-2xl p-2 rounded-xl ${quest.completed ? 'bg-white/5' : 'bg-[#2C2C2E]'}`}>
                    {quest.icon}
                  </div>
                  <div>
                    <h3 className={`font-medium ${quest.completed ? 'text-white/70 line-through' : 'text-white'}`}>
                      {quest.title}
                    </h3>
                    <span className="inline-block bg-[#2C2C2E] px-2 py-0.5 rounded text-[10px] text-yellow-400 font-bold mt-1">+{quest.xp} XP</span>
                  </div>
                </div>
                
                <div>
                  {quest.completed ? (
                    <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  ) : (
                    <div className="w-6 h-6 rounded-full border-2 border-[#333336]"></div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
