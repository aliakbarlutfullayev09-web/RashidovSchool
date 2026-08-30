import React from 'react';

export default function Sidebar({ user, activeSection, onSectionChange }) {
  const isSuperAdmin = user?.role === 'superadmin';
  const isTeacher = user?.role === 'teacher';
  
  const navItems = [
    { id: 'dashboard', label: '📊 Статистика', roles: ['superadmin', 'teacher'] },
    { id: 'content', label: '📚 Контент', roles: ['superadmin', 'teacher'] },
    { id: 'promo', label: '🎟 Промокоды', roles: ['superadmin', 'teacher'], condition: user?.permissions?.can_promo },
    { id: 'users', label: '👥 Пользователи', roles: ['superadmin'] },
    { id: 'staff', label: '👨‍🏫 Персонал', roles: ['superadmin'] },
  ];

  const visibleItems = navItems.filter(item => 
    item.roles.includes(user?.role) && (item.condition === undefined || item.condition)
  );

  return (
    <div className="w-full md:w-64 bg-slate-800 border-r border-slate-700 flex flex-col h-auto md:h-screen sticky top-0">
      <div className="p-4 border-b border-slate-700">
        <h1 className="text-xl font-bold text-white">LMS Admin</h1>
      </div>
      <nav className="flex-1 overflow-y-auto p-4 flex md:flex-col gap-2 flex-row md:overflow-visible overflow-x-auto">
        {visibleItems.map(item => (
          <button
            key={item.id}
            onClick={() => onSectionChange(item.id)}
            className={`flex items-center gap-3 p-3 rounded-lg transition-colors whitespace-nowrap ${activeSection === item.id ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700'}`}
          >
            {item.label}
          </button>
        ))}
      </nav>
      <div className="p-4 border-t border-slate-700 hidden md:block">
        <div className="text-sm font-medium text-white">{user?.full_name}</div>
        <div className="text-xs text-slate-400 mt-1">
          {isSuperAdmin ? 'Суперадмин' : 'Учитель'}
        </div>
      </div>
    </div>
  );
}
