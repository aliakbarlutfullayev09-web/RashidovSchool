import React, { useState, useEffect } from 'react';
import StatsCard from '../components/StatsCard';
import RedZones from '../components/RedZones';
import { api } from '../api/supabase';
import { Sparkles, BarChart2 } from 'lucide-react';

export default function DashboardPage({ user }) {
  const [stats, setStats] = useState(null);
  const [redZones, setRedZones] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    const s = user?.role === 'superadmin' || user?.role === 'admin' 
      ? await api.getAllStats() 
      : await api.getSubjectStats(user?.assigned_subject_id || user?.subject?.id);
    const rz = await api.getRedZones(user?.assigned_subject_id || user?.subject?.id);
    setStats(s);
    setRedZones(rz);
    setLoading(false);
  };

  if (loading || !stats) {
    return (
      <div className="card p-12 text-center text-[#8E8E93] text-xs">
        Statistika yuklanmoqda...
      </div>
    );
  }

  const title = user?.role === 'superadmin' || user?.role === 'admin'
    ? 'Umumiy platforma statistikasi'
    : `Fan statistikasi: ${user?.subject?.name || 'Biologiya'}`;

  return (
    <div className="space-y-6 text-white pb-24">
      {/* Page Title */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-white tracking-tight">
            {title}
          </h1>
          <p className="text-xs text-[#8E8E93] mt-0.5">Real vaqt rejimida yangilanadigan ko'rsatkichlar</p>
        </div>

        <button 
          onClick={loadData}
          className="bg-[#1C1C1E] border border-white/5 hover:border-white/10 text-white text-xs font-bold px-3.5 py-2 rounded-2xl flex items-center gap-1.5 active:scale-95 transition-all shadow-md"
        >
          <span>⟳ Yangilash</span>
        </button>
      </div>
      
      {/* 4 Stats Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard 
          icon="👥" 
          label="Jami o'quvchilar" 
          value={stats.total_students?.toLocaleString('ru-RU') || 0} 
          trend="+12%" 
          color="blue" 
        />
        <StatsCard 
          icon="📚" 
          label="Yuklangan darslar" 
          value={stats.total_lessons || 0} 
          color="purple" 
        />
        <StatsCard 
          icon="📝" 
          label="Topshirilgan testlar" 
          value={stats.total_tests_taken?.toLocaleString('ru-RU') || 0} 
          trend="+5%" 
          color="green" 
        />
        <StatsCard 
          icon="⭐️" 
          label="O'rtacha yulduzlar" 
          value={stats.avg_score || 0} 
          color="yellow" 
        />
      </div>

      {/* Red Zones (Students at risk / difficult questions) */}
      <RedZones questions={redZones} />
    </div>
  );
}
