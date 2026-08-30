import React, { useState, useEffect } from 'react';
import { useTelegram } from './hooks/useTelegram';
import { mockSuperadminUser, mockTeacherUser } from './mock/data';
import Sidebar from './components/Sidebar';
import DashboardPage from './pages/DashboardPage';
import ContentPage from './pages/ContentPage';
import StaffPage from './pages/StaffPage';
import UserList from './components/UserList';
import PromoGenerator from './components/PromoGenerator';
import { api } from './api/supabase';

function App() {
  const { tg, user: tgUser } = useTelegram();
  const [activeSection, setActiveSection] = useState('dashboard');
  const [dbUser, setDbUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Dev Mode Toggle (сохраняем для тестирования)
  const [mockRole, setMockRole] = useState('superadmin');

  useEffect(() => {
    async function fetchAuth() {
      if (tgUser && tgUser.id) {
        const realUser = await api.getUser(tgUser.id);
        if (realUser) {
          let perms = realUser.permissions || { can_promo: false, can_gift: false, can_send: false };
          if (realUser.role === 'superadmin') {
            perms = { can_promo: true, can_gift: true, can_send: true };
          }
            
          setDbUser({ ...realUser, permissions: perms, assigned_subject_id: realUser.assigned_subject_id });
          setLoading(false);
          return;
        }
      }
      
      // Фолбэк для локального запуска в браузере
      const fallback = mockRole === 'superadmin' ? mockSuperadminUser : mockTeacherUser;
      setDbUser(fallback);
      setLoading(false);
    }
    fetchAuth();
  }, [tgUser, mockRole]);

  const toggleMockRole = () => {
    setMockRole(prev => prev === 'superadmin' ? 'teacher' : 'superadmin');
    setActiveSection('dashboard');
  };

  if (loading || !dbUser) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">Загрузка панели...</div>;
  }

  const effectiveSection = (() => {
    if (activeSection === 'users' && dbUser.role !== 'superadmin' && !dbUser.permissions?.can_gift) return 'dashboard';
    if (activeSection === 'staff' && dbUser.role !== 'superadmin') return 'dashboard';
    if (activeSection === 'promo' && !dbUser.permissions?.can_promo) return 'dashboard';
    return activeSection;
  })();

  const renderContent = () => {
    switch (effectiveSection) {
      case 'dashboard': return <DashboardPage user={dbUser} />;
      case 'content': return <ContentPage user={dbUser} />;
      case 'promo': return <PromoGenerator user={dbUser} />;
      case 'users': return <UserList />;
      case 'staff': return <StaffPage />;
      default: return <DashboardPage user={dbUser} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-900 text-slate-200 font-sans">
      <Sidebar user={dbUser} activeSection={effectiveSection} onSectionChange={setActiveSection} />
      
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        {renderContent()}
        
        {/* Dev Mode toggle для тестирования ролей */}
        {import.meta.env.DEV && (
          <div className="fixed bottom-4 right-4 z-50">
            <button 
              onClick={toggleMockRole} 
              className="bg-purple-600 hover:bg-purple-700 text-white text-xs px-3 py-2 rounded-full shadow-lg"
            >
              ⟳ {dbUser.role === 'superadmin' ? 'Teacher' : 'Superadmin'}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
