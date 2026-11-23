import React, { useState, useEffect } from 'react';
import { useTelegram } from './hooks/useTelegram';
import { mockSuperadminUser, mockTeacherUser } from './mock/data';
import Sidebar from './components/Sidebar';
import DashboardPage from './pages/DashboardPage';
import ContentPage from './pages/ContentPage';
import StaffPage from './pages/StaffPage';
import UserList from './components/UserList';
import PromoGenerator from './components/PromoGenerator';
import SupportSettings from './components/SupportSettings';
import { api } from './api/supabase';
import { Loader2 } from 'lucide-react';

function App() {
  const { tg, user: tgUser } = useTelegram();
  const [activeSection, setActiveSection] = useState('dashboard');
  const [dbUser, setDbUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Dev Mode Role Switcher
  const [mockRole, setMockRole] = useState('superadmin');

  useEffect(() => {
    if (tg) {
      try {
        tg.setHeaderColor('#000000');
        tg.setBackgroundColor('#000000');
        tg.expand();
      } catch (e) {
        console.error(e);
      }
    }
  }, [tg]);

  useEffect(() => {
    async function fetchAuth() {
      if (tgUser && tgUser.id) {
        const realUser = await api.getUser(tgUser.id);
        if (realUser) {
          let perms = realUser.permissions || { can_promo: false, can_gift: false, can_send: false };
          if (realUser.role === 'superadmin' || realUser.role === 'admin') {
            perms = { can_promo: true, can_gift: true, can_send: true };
          }
            
          setDbUser({ ...realUser, permissions: perms, assigned_subject_id: realUser.assigned_subject_id });
          setLoading(false);
          return;
        }
      }
      
      // Fallback for local browser dev
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
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#000000] text-white p-6 text-center">
        <div className="flex flex-col items-center">
          <Loader2 className="w-10 h-10 text-[#007AFF] animate-spin mb-4" />
          <h2 className="text-xl font-bold mb-1">Rashidov LMS Admin</h2>
          <p className="text-[#8E8E93] text-xs">Boshqaruv paneli yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  const effectiveSection = (() => {
    if (activeSection === 'users' && dbUser.role !== 'superadmin' && dbUser.role !== 'admin' && !dbUser.permissions?.can_gift) return 'dashboard';
    if (activeSection === 'staff' && dbUser.role !== 'superadmin' && dbUser.role !== 'admin') return 'dashboard';
    if (activeSection === 'support' && dbUser.role !== 'superadmin' && dbUser.role !== 'admin') return 'dashboard';
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
      case 'support': return <SupportSettings user={dbUser} />;
      default: return <DashboardPage user={dbUser} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#000000] text-white font-sans selection:bg-blue-600 selection:text-white">
      {/* Sidebar (Desktop left / Mobile bottom dock) */}
      <Sidebar 
        user={dbUser} 
        activeSection={effectiveSection} 
        onSectionChange={setActiveSection} 
      />
      
      {/* Main Workspace */}
      <main className="flex-1 p-4 md:p-8 pt-[calc(env(safe-area-inset-top,16px)+12px)] pb-28 md:pb-8 overflow-y-auto max-w-7xl mx-auto w-full">
        {renderContent()}
        
        {/* Dev Mode toggle (Only in DEV) */}
        {import.meta.env.DEV && (
          <div className="fixed bottom-20 md:bottom-6 right-4 z-50">
            <button 
              onClick={toggleMockRole} 
              className="bg-[#1C1C1E] border border-purple-500/40 hover:bg-purple-600/30 text-purple-300 text-xs font-bold px-3 py-2 rounded-full shadow-2xl backdrop-blur-md active:scale-95 transition-all"
            >
              ⟳ {dbUser.role === 'superadmin' ? 'Teacher Mode' : 'Superadmin Mode'}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
