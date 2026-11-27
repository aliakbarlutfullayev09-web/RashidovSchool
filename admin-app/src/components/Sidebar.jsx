import React from 'react';
import { 
  BookOpen, ClipboardList, Ticket, Users, GraduationCap, Headphones,
  Sun, Moon, PanelLeftClose, PanelLeftOpen, EyeOff
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function Sidebar({ user, activeSection, onSectionChange, isDockHidden = false, onToggleDock }) {
  const isSuperAdmin = user?.role === 'superadmin' || user?.role === 'admin';
  const { isLight, setTheme, toggleTheme } = useTheme();

  const navItems = [
    { id: 'content', label: 'Контент', icon: BookOpen, roles: ['superadmin', 'admin', 'teacher'] },
    { id: 'tests', label: 'Testlar', icon: ClipboardList, roles: ['superadmin', 'admin', 'teacher'] },
    { id: 'promo', label: 'Промокоды', icon: Ticket, roles: ['superadmin', 'admin', 'teacher'], condition: user?.permissions?.can_promo },
    { id: 'users', label: 'Ученики', icon: Users, roles: ['superadmin', 'admin', 'teacher'], condition: user?.permissions?.can_gift },
    { id: 'staff', label: 'Персонал', icon: GraduationCap, roles: ['superadmin', 'admin'] },
    { id: 'support', label: 'Aloqa & Yordam', icon: Headphones, roles: ['superadmin', 'admin'] },
  ];

  const visibleItems = navItems.filter(item => 
    item.roles.includes(user?.role) && (isSuperAdmin || item.condition === undefined || item.condition)
  );

  if (isDockHidden) {
    return (
      <button
        type="button"
        onClick={onToggleDock}
        data-testid="restore-dock-btn"
        className="fixed bottom-5 left-4 z-50 flex items-center gap-2 px-3.5 py-2.5 rounded-full bg-[#1C1C1E]/95 border border-white/10 text-white text-xs font-bold shadow-2xl backdrop-blur-xl hover:border-blue-500/40 active:scale-95 transition-all cursor-pointer"
        title="Dokni ko'rsatish"
      >
        <PanelLeftOpen className="w-4 h-4 text-[#007AFF]" />
        <span>Menyu</span>
      </button>
    );
  }

  return (
    <>
      {/* ── DESKTOP & TABLET LANDSCAPE SIDEBAR ── */}
      <aside className="hidden md:flex w-64 bg-[#121214] border-r border-white/[0.06] flex-col h-screen sticky top-0 z-30 select-none">
        
        {/* Brand Header */}
        <div className="p-5 border-b border-white/[0.06] flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-[#1C1C1E] border border-white/10 flex items-center justify-center p-1.5 shadow-lg shadow-blue-500/15 shrink-0">
              <img
                src="/rashidov-logo-original.png"
                alt="Rashidov Studio"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="min-w-0">
              <h1 className="text-white font-extrabold text-sm leading-tight tracking-wide truncate">
                Rashidov Studio
              </h1>
              <span className="text-[11px] text-[#8E8E93] font-medium">Boshqaruv paneli</span>
            </div>
          </div>
          {onToggleDock && (
            <button
              type="button"
              onClick={onToggleDock}
              data-testid="hide-dock-desktop-btn"
              className="w-8 h-8 rounded-xl bg-[#1C1C1E] hover:bg-[#2C2C2E] border border-white/10 text-[#8E8E93] hover:text-white flex items-center justify-center shrink-0 transition-colors cursor-pointer"
              title="Dokni yashirish"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          )}
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

        {/* Bottom Theme Switcher & Hide Dock */}
        <div className="p-4 border-t border-white/[0.06] bg-[#161618] space-y-2.5">
          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-[#1C1C1E] border border-white/10">
            <button
              type="button"
              onClick={() => setTheme('light')}
              data-testid="theme-light-btn"
              className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                isLight
                  ? 'bg-[#007AFF] text-white shadow-sm'
                  : 'text-[#8E8E93] hover:text-white'
              }`}
            >
              <Sun className="w-3.5 h-3.5" />
              <span>Yorug‘</span>
            </button>
            <button
              type="button"
              onClick={() => setTheme('dark')}
              data-testid="theme-dark-btn"
              className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                !isLight
                  ? 'bg-[#007AFF] text-white shadow-sm'
                  : 'text-[#8E8E93] hover:text-white'
              }`}
            >
              <Moon className="w-3.5 h-3.5" />
              <span>Tungi</span>
            </button>
          </div>

          {onToggleDock && (
            <button
              type="button"
              onClick={onToggleDock}
              data-testid="hide-dock-footer-btn"
              className="w-full py-2 px-3 rounded-xl bg-[#1C1C1E] hover:bg-[#2C2C2E] border border-white/10 text-xs font-semibold text-[#8E8E93] hover:text-white flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <EyeOff className="w-3.5 h-3.5" />
              <span>Dokni yashirish</span>
            </button>
          )}
        </div>
      </aside>

      {/* ── MOBILE & TABLET PORTRAIT FLOATING BOTTOM DOCK ── */}
      <nav className="md:hidden fixed bottom-4 left-1/2 -translate-x-1/2 w-[94%] max-w-[560px] z-40 select-none">
        <div className="bg-[#121214]/95 backdrop-blur-xl border border-[#333336] rounded-full px-2 py-1.5 flex items-center justify-around gap-0.5 overflow-x-auto no-scrollbar shadow-2xl">
          {visibleItems.map(item => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSectionChange(item.id)}
                className={`flex flex-col items-center justify-center flex-1 min-w-[48px] py-1.5 px-1.5 rounded-full cursor-pointer transition-all active:scale-95 whitespace-nowrap ${
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

          <button
            type="button"
            onClick={toggleTheme}
            data-testid="theme-mobile-toggle-btn"
            className="flex flex-col items-center justify-center min-w-[44px] py-1.5 px-1.5 rounded-full cursor-pointer transition-all active:scale-95 text-[#8E8E93] hover:text-white whitespace-nowrap"
            title={isLight ? 'Tungi rejim' : 'Yorug‘ rejim'}
          >
            <div className="p-1 rounded-full">
              {isLight ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </div>
            <span className="text-[10px] font-semibold mt-0.5 leading-tight">
              {isLight ? 'Tungi' : 'Yorug‘'}
            </span>
          </button>

          {onToggleDock && (
            <button
              type="button"
              onClick={onToggleDock}
              data-testid="hide-dock-mobile-btn"
              className="flex flex-col items-center justify-center min-w-[44px] py-1.5 px-1.5 rounded-full cursor-pointer transition-all active:scale-95 text-[#8E8E93] hover:text-white whitespace-nowrap"
              title="Dokni yashirish"
            >
              <div className="p-1 rounded-full">
                <EyeOff className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-semibold mt-0.5 leading-tight">Yashirish</span>
            </button>
          )}
        </div>
      </nav>
    </>
  );
}
