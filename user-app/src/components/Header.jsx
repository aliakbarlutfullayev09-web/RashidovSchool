import React from 'react';

export default function Header({ user }) {
  const getInitials = (name) => {
    if (!name) return '?';
    return name.substring(0, 2).toUpperCase();
  };

  const firstName = user?.full_name?.split(' ')[0] || 'MEHMON';
  const balance = user?.balance || 0;
  const formattedBalance = balance.toLocaleString('ru-RU');

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-[#000000]">
      {/* Left section */}
      <div className="flex items-center gap-2">
        <div className="avatar-ring flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-tr from-pink-500 via-purple-500 to-cyan-500 p-[2px]">
          <div className="avatar-ring-inner w-full h-full bg-[#000000] rounded-full flex items-center justify-center">
            <span className="text-white text-xs font-semibold">{getInitials(firstName)}</span>
          </div>
        </div>
        
        <div className="flex flex-col justify-center">
          <div className="flex items-center gap-1.5">
            <span className="text-white text-[10px] font-bold uppercase tracking-[0.15em] leading-none">
              {firstName}
            </span>
            {user?.class_group && (
              <span className="bg-[#2C2C2E] text-white text-[9px] font-medium px-1.5 py-0.5 rounded-full leading-none">
                {user.class_group}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Center: Daily streak */}
      <div className="flex items-center gap-1 bg-[#2C2C2E] px-2.5 py-1 rounded-full">
        <span className="text-xs">🔥</span>
        <span className="text-white text-xs font-medium">{user?.streak_days || 0} kun</span>
      </div>

      {/* Right: XP balance */}
      <div className="flex items-center gap-1 bg-[#2C2C2E] px-2.5 py-1 rounded-full">
        <span className="text-xs drop-shadow-md">🧠</span>
        <span className="text-white text-xs font-medium">{formattedBalance} Neyron</span>
      </div>
    </div>
  );
}
