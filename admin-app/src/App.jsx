import React, { useState } from 'react';
import { useTelegram } from './hooks/useTelegram';
import { mockSuperadminUser, mockTeacherUser } from './mock/data';
import Sidebar from './components/Sidebar';
import DashboardPage from './pages/DashboardPage';
import ContentPage from './pages/ContentPage';
import StaffPage from './pages/StaffPage';
import UserList from './components/UserList';
import PromoGenerator from './components/PromoGenerator';

function App() {
  const { tg } = useTelegram();
  const [activeSection, setActiveSection] = useState('dashboard');

  // ── Определение роли ──
  // В проде: бот передаёт данные через initData
  // В dev-режиме: используем мок для тестирования
  const [mockRole, setMockRole] = useState('superadmin');
  
  const getUser = () => {
    // Попытка получить из Telegram initData
    if (tg?.initDataUnsafe?.user) {
      // В реальном приложении роль приходит через start_param или из БД
      return {
        ...tg.initDataUnsafe.user,
        role: tg.initDataUnsafe.start_param || 'teacher',
        permissions: { can_promo: true, can_gift: true, can_send: true }
      };
    }
    // Фолбэк на мок
    return mockRole === 'superadmin' ? mockSuperadminUser : mockTeacherUser;
  };

  const user = getUser();

  const toggleMockRole = () => {
    setMockRole(prev => prev === 'superadmin' ? 'teacher' : 'superadmin');
    setActiveSection('dashboard'); // сброс при переключении
  };

  // Защита маршрутов — через useEffect чтобы не вызывать setState в рендере
  const effectiveSection = (() => {
    if (activeSection === 'users' && user.role !== 'superadmin') return 'dashboard';
    if (activeSection === 'staff' && user.role !== 'superadmin') return 'dashboard';
    if (activeSection === 'promo' && !user.permissions?.can_promo) return 'dashboard';
    return activeSection;
  })();

  const renderContent = () => {
    switch (effectiveSection) {
      case 'dashboard': return <DashboardPage user={user} />;
      case 'content': return <ContentPage user={user} />;
      case 'promo': return <PromoGenerator user={user} />;
      case 'users': return <UserList />;
      case 'staff': return <StaffPage />;
      default: return <DashboardPage user={user} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-900 text-slate-200 font-sans">
      <Sidebar user={user} activeSection={effectiveSection} onSectionChange={setActiveSection} />
      
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        {renderContent()}
        
        {/* Dev Mode toggle для тестирования ролей */}
        {import.meta.env.DEV && (
          <div className="fixed bottom-4 right-4 z-50">
            <button 
              onClick={toggleMockRole} 
              className="bg-purple-600 hover:bg-purple-700 text-white text-xs px-3 py-2 rounded-full shadow-lg"
            >
              ⟳ {user.role === 'superadmin' ? 'Teacher' : 'Superadmin'}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
