import React from 'react';

export default function StatsCard({ icon, label, value, trend, color = 'blue' }) {
  return (
    <div className={`card p-6 border-l-4 border-${color}-500 flex flex-col justify-between`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-3xl">{icon}</span>
        {trend && (
          <span className={`text-sm font-semibold px-2 py-1 rounded bg-${trend.startsWith('+') ? 'green' : 'red'}-500/20 text-${trend.startsWith('+') ? 'green' : 'red'}-400`}>
            {trend}
          </span>
        )}
      </div>
      <div>
        <div className="text-2xl font-bold text-white">{value}</div>
        <div className="text-sm text-slate-400">{label}</div>
      </div>
    </div>
  );
}
