import React from 'react';
import Profile from '../components/Profile';
import TopUp from '../components/TopUp';
import PromoCode from '../components/PromoCode';

export default function ProfilePage({ user }) {
  if (!user) return <div className="h-full flex items-center justify-center text-white">Загрузка...</div>;

  return (
    <div className="h-full overflow-y-auto no-scrollbar pb-24">
      <Profile user={user} />
      <TopUp user={user} />
      <PromoCode user={user} />
      
      <p className="text-center text-xs opacity-40 mt-8 pb-4">
        Developed by @mynus_lab
      </p>
    </div>
  );
}
