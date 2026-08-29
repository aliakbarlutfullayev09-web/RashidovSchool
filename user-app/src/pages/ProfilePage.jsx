import React from 'react';
import Profile from '../components/Profile';
import TopUp from '../components/TopUp';
import PromoCode from '../components/PromoCode';
import { mockUser } from '../mock/data';

export default function ProfilePage() {
  return (
    <div className="h-full overflow-y-auto no-scrollbar pb-24">
      <Profile user={mockUser} />
      <TopUp user={mockUser} />
      <PromoCode user={mockUser} />
      
      <p className="text-center text-xs opacity-40 mt-8 pb-4">
        Developed by @mynus_lab
      </p>
    </div>
  );
}
