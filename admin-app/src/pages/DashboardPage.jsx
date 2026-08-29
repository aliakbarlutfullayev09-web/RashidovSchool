import React, { useState, useEffect } from 'react';
import StatsCard from '../components/StatsCard';
import RedZones from '../components/RedZones';
import { api } from '../api/supabase';

export default function DashboardPage({ user }) {
  const [stats, setStats] = useState(null);
  const [redZones, setRedZones] = useState([]);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    const s = user.role === 'superadmin' ? await api.getAllStats() : await api.getSubjectStats(user.subject?.id);
    const rz = await api.getRedZones(user.subject?.id);
    setStats(s);
    setRedZones(rz);
  };

  if (!stats) return <div className="text-slate-400 p-8 text-center">Загрузка...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white mb-6">
        {user.role === 'superadmin' ? 'Общая статистика платформы' : `Статистика: ${user.subject?.name}`}
      </h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard icon="👥" label="Учеников" value={stats.total_students} trend="+12%" color="blue" />
        <StatsCard icon="📚" label="Уроков" value={stats.total_lessons} color="purple" />
        <StatsCard icon="📝" label="Пройдено тестов" value={stats.total_tests_taken} trend="+5%" color="green" />
        <StatsCard icon="📈" label="Средний балл" value={`${stats.avg_score}%`} trend="-2%" color="yellow" />
      </div>

      <RedZones questions={redZones} />
    </div>
  );
}
