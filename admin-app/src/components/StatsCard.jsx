import React from 'react';

export default function StatsCard({ icon, label, value, trend, color = 'blue' }) {
  const colorMap = {
    blue: 'from-blue-600/20 to-blue-500/10 border-blue-500/30 text-blue-400',
    purple: 'from-purple-600/20 to-purple-500/10 border-purple-500/30 text-purple-400',
    green: 'from-emerald-600/20 to-emerald-500/10 border-emerald-500/30 text-emerald-400',
    yellow: 'from-amber-600/20 to-amber-500/10 border-amber-500/30 text-amber-400',
  };

  const activeColor = colorMap[color] || colorMap.blue;

  return (
    <div className="card p-6 bg-[#1C1C1E] border border-white/5 rounded-3xl shadow-xl flex flex-col justify-between hover:border-white/10 transition-all">
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${activeColor} border flex items-center justify-center text-2xl shadow-lg`}>
          {icon}
        </div>
        {trend && (
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
            trend.startsWith('+') 
              ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300' 
              : 'bg-red-500/15 border border-red-500/30 text-red-300'
          }`}>
            {trend}
          </span>
        )}
      </div>

      <div>
        <div className="text-2xl font-extrabold text-white mb-0.5 tracking-tight">{value}</div>
        <div className="text-xs text-[#8E8E93] font-medium">{label}</div>
      </div>
    </div>
  );
}
