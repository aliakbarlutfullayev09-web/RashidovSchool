import React from 'react';
import { mockUser } from '../mock/data';

export default function Header() {
  return (
    <div className="sticky top-0 z-10 mx-4 mt-2 mb-4 p-3 glass rounded-2xl flex justify-between items-center shadow-lg">
      <div className="flex items-center space-x-2 font-bold text-lg text-orange-400">
        <span>🔥</span>
        <span>{mockUser.streak_days}</span>
      </div>
      <div className="flex items-center space-x-2 font-bold text-lg text-blue-400">
        <span>🧠</span>
        <span>{mockUser.balance}</span>
      </div>
    </div>
  );
}
