import React, { useState, useEffect } from 'react';
import { useTelegram } from './hooks/useTelegram';
import { mockSuperadminUser, mockTeacherUser } from './mock/data';
import Sidebar from './components/Sidebar';
import ContentPage from './pages/ContentPage';
import TestsPage from './pages/TestsPage';
import StaffPage from './pages/StaffPage';
import UserList from './components/UserList';
import PromoGenerator from './components/PromoGenerator';
import SupportSettings from './components/SupportSettings';
import { authenticateTelegramAdmin } from './api/supabase';
import { Loader2, ShieldAlert } from 'lucide-react';

const DEV_MOCK_ALLOWED = import.meta.env.DEV && import.meta.env.VITE_DEV_ALLOW_MOCK === 'true';

function App() {
  const { tg, initData, ready } = useTelegram();
  const [activeSection, setActiveSection] = useState('content');
  const [dbUser, setDbUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [isDockHidden, setIsDockHidden] = useState(false);
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
    if (!ready) return;
    let mounted = true;

    async function fetchAuth() {
      const effectiveInitData = tg?.initData || initData || '';
      if (!effectiveInitData) {
        if (DEV_MOCK_ALLOWED) {
          const devUser = mockRole === 'superadmin' ? mockSuperadminUser : mockTeacherUser;
          if (mounted) {
            setDbUser(devUser);
            setAuthError(null);
            setLoading(false);
          }
          return;
        }
        if (mounted) {
          setDbUser(null);
          setAuthError('Откройте панель управления через Telegram Mini App.');
          setLoading(false);
        }
        return;
      }

      const auth = await authenticateTelegramAdmin(effectiveInitData);
      if (!mounted) return;

      if (!auth.ok || !auth.user) {
        setDbUser(null);
        setAuthError(auth.error || 'Доступ запрещён');
        setLoading(false);
        return;
      }

      const realUser = auth.user;
      if (realUser.role !== 'superadmin' && realUser.role !== 'admin' && realUser.role !== 'teacher') {
        setDbUser(null);
        setAuthError('Недостаточно прав доступа');
        setLoading(false);
        return;
      }

      let perms = realUser.permissions || { can_promo: false, can_gift: false, can_send: false };
      if (realUser.role === 'superadmin' || realUser.role === 'admin') {
        perms = { can_promo: true, can_gift: true, can_send: true };
      }

      setDbUser({ ...realUser, permissions: perms, assigned_subject_id: realUser.assigned_subject_id });
      setAuthError(null);
      setLoading(false);
    }

    fetchAuth();
    return () => {
      mounted = false;
    };
  }, [tg, initData, ready, mockRole]);

  const toggleMockRole = () => {
    if (!DEV_MOCK_ALLOWED) return;
    setMockRole(prev => prev === 'superadmin' ? 'teacher' : 'superadmin');
    setActiveSection('content');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#000000] text-white p-6 text-center">
        <div className="flex flex-col items-center">
          <Loader2 className="w-10 h-10 text-[#007AFF] animate-spin mb-4" />
          <h2 className="text-xl font-bold mb-1">Rashidov Studio</h2>
          <p className="text-[#8E8E93] text-xs">Boshqaruv paneli yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  if (authError || !dbUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#000000] text-white p-6 text-center">
        <div className="flex flex-col items-center max-w-sm">
          <ShieldAlert className="w-12 h-12 text-red-500 mb-4" />
          <h2 className="text-xl font-bold mb-2">Kirish taqiqlangan</h2>
          <p className="text-[#8E8E93] text-sm">{authError || 'Доступ запрещён'}</p>
        </div>
      </div>
    );
  }

  const effectiveSection = (() => {
    const isAdminOrSuper = dbUser.role === 'superadmin' || dbUser.role === 'admin';
    if (activeSection === 'users' && !isAdminOrSuper && !dbUser.permissions?.can_gift) return 'content';
    if (activeSection === 'staff' && !isAdminOrSuper) return 'content';
    if (activeSection === 'support' && !isAdminOrSuper) return 'content';
    if (activeSection === 'promo' && !isAdminOrSuper && !dbUser.permissions?.can_promo) return 'content';
    return activeSection;
  })();

  const renderContent = () => {
    switch (effectiveSection) {
      case 'content': return <ContentPage user={dbUser} />;
      case 'tests': return <TestsPage user={dbUser} />;
      case 'promo': return <PromoGenerator user={dbUser} />;
      case 'users': return <UserList />;
      case 'staff': return <StaffPage />;
      case 'support': return <SupportSettings user={dbUser} />;
      default: return <ContentPage user={dbUser} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#000000] text-white font-sans selection:bg-blue-600 selection:text-white">
      <Sidebar
        user={dbUser}
        activeSection={effectiveSection}
        onSectionChange={setActiveSection}
        isDockHidden={isDockHidden}
        onToggleDock={() => setIsDockHidden(prev => !prev)}
      />

      <main className="flex-1 p-4 md:p-8 pt-[calc(env(safe-area-inset-top,16px)+12px)] pb-28 md:pb-8 overflow-y-auto max-w-7xl mx-auto w-full">
        {renderContent()}

        {DEV_MOCK_ALLOWED && (
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
