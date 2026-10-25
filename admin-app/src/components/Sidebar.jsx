import React from 'react';
import { 
  BarChart3, BookOpen, Ticket, Users, GraduationCap, ShieldCheck 
} from 'lucide-react';

export default function Sidebar({ user, activeSection, onSectionChange }) {
  const isSuperAdmin = user?.role === 'superadmin';
  const roleName = isSuperAdmin ? 'Суперадмин' : 'Учитель';

  const navItems = [
    { id: 'dashboard', label: 'Статистика', icon: BarChart3, roles: ['superadmin', 'teacher'] },
    { id: 'content', label: 'Контент', icon: BookOpen, roles: ['superadmin', 'teacher'] },
    { id: 'promo', label: 'Промокоды', icon: Ticket, roles: ['superadmin', 'teacher'], condition: user?.permissions?.can_promo },
    { id: 'users', label: 'Ученики', icon: Users, roles: ['superadmin', 'teacher'], condition: user?.permissions?.can_gift },
    { id: 'staff', label: 'Персонал', icon: GraduationCap, roles: ['superadmin'] },
  ];

  const visibleItems = navItems.filter(item => 
    item.roles.includes(user?.role) && (item.condition === undefined || item.condition)
  );

  return (
    <>
      {/* ── DESKTOP & TABLET LANDSCAPE SIDEBAR ── */}
      <aside className="hidden md:flex w-64 bg-[#121214] border-r border-white/[0.06] flex-col h-screen sticky top-0 z-30 select-none">
        
        {/* Brand Header */}
        <div className="p-5 border-b border-white/[0.06] flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-lg shadow-lg shadow-blue-500/25">
            🧬
          </div>
          <div>
            <h1 className="text-white font-extrabold text-sm leading-tight tracking-wide">
              Rashidov LMS
            </h1>
            <span className="text-[11px] text-[#8E8E93] font-medium">Boshqaruv paneli</span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
          {visibleItems.map(item => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSectionChange(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-xs transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#007AFF] text-white shadow-lg shadow-blue-500/25'
                    : 'text-[#8E8E93] hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" strokeWidth={isActive ? 2.5 : 2} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* User Card Bottom */}
        <div className="p-4 border-t border-white/[0.06] bg-[#161618]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-500 to-purple-600 p-[1.5px] flex-shrink-0">
              <div className="w-full h-full rounded-full bg-[#1C1C1E] flex items-center justify-center text-xs font-bold text-white">
                {(user?.full_name || 'Admin').substring(0, 2).toUpperCase()}
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-white truncate leading-tight">
                {user?.full_name || 'Администратор'}
              </div>
              <div className="flex items-center gap-1 text-[10px] text-blue-400 font-semibold mt-0.5">
                <ShieldCheck className="w-3 h-3" />
                <span>{roleName}</span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* ── MOBILE & TABLET PORTRAIT FLOATING BOTTOM DOCK ── */}
      <nav className="md:hidden fixed bottom-4 left-1/2 -translate-x-1/2 w-[92%] max-w-[440px] z-40 select-none">
        <div className="bg-[#121214]/95 backdrop-blur-xl border border-[#333336] rounded-full px-2 py-1.5 flex items-center justify-around shadow-2xl">
          {visibleItems.map(item => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSectionChange(item.id)}
                className={`flex flex-col items-center justify-center flex-1 py-1.5 px-2 rounded-full cursor-pointer transition-all active:scale-95 ${
                  isActive ? 'text-[#007AFF]' : 'text-[#8E8E93]'
                }`}
              >
                <div className={`p-1 rounded-full transition-colors ${isActive ? 'bg-blue-500/10' : ''}`}>
                  <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
                </div>
                <span className={`text-[10px] font-semibold mt-0.5 leading-tight ${isActive ? 'text-white' : 'text-[#8E8E93]'}`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
