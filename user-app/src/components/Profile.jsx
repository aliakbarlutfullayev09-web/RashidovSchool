import React from 'react';

export default function Profile({ user }) {
  const initials = user.full_name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  return (
    <div className="flex flex-col items-center pt-8 pb-6 px-4">
      {/* Avatar */}
      <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-3xl font-bold shadow-xl border-4 border-white/10 mb-4">
        {initials}
      </div>

      {/* Name & Class */}
      <h1 className="text-2xl font-bold mb-1">{user.full_name}</h1>
      <span className="px-3 py-1 bg-white/10 rounded-full text-xs font-semibold mb-6">
        Класс: {user.class_group}
      </span>

      {/* Balance Card */}
      <div className="w-full glass-strong rounded-3xl p-6 mb-4 flex flex-col items-center">
        <span className="text-gray-300 text-sm mb-2">Ваш баланс</span>
        <div className="flex items-center space-x-2 text-4xl font-bold text-blue-400">
          <span>🧠</span>
          <span>{user.balance}</span>
        </div>
        <span className="text-xs text-blue-200/50 mt-1">Нейронов</span>
      </div>

      {/* Streak */}
      <div className="w-full glass rounded-2xl p-4 flex items-center justify-between">
        <span className="font-semibold">Ударный режим:</span>
        <div className="flex items-center space-x-1 text-orange-400 font-bold text-lg">
          <span>🔥</span>
          <span>{user.streak_days} дней подряд</span>
        </div>
      </div>
    </div>
  );
}
