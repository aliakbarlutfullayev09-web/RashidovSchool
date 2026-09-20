import React, { useState } from 'react';
import Profile from '../components/Profile';
import PromoCode from '../components/PromoCode';
import TopUp from '../components/TopUp';
import { ChevronRight, Settings, User, Microscope, CreditCard, Send } from 'lucide-react';

export default function ProfilePage({ user }) {
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isPromoOpen, setIsPromoOpen] = useState(false);
  const [isTopUpOpen, setIsTopUpOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#000000] text-white p-4 md:p-8 pb-24 md:pb-8">
      <div className="w-full max-w-3xl mx-auto">
        
        {/* Avatar Section */}
        <div className="flex flex-col items-center mt-8 mb-12">
          {/* Custom Avatar matching photo: dark circle with glowing crescent */}
          <div className="relative w-[120px] h-[120px] rounded-full bg-[#050505] flex items-center justify-center shadow-[inset_0_0_20px_rgba(0,0,0,1)] mb-6">
            <div className="absolute top-0 right-0 w-full h-full rounded-full" 
                 style={{
                   background: 'radial-gradient(circle at 75% 25%, rgba(0,255,255,0.4), transparent 40%), radial-gradient(circle at 85% 50%, rgba(255,0,255,0.4), transparent 40%)',
                   maskImage: 'radial-gradient(circle, transparent 64%, black 65%)',
                   WebkitMaskImage: 'radial-gradient(circle, transparent 64%, black 65%)',
                   opacity: 0.8
                 }}
            />
          </div>
          
          <h1 className="text-2xl font-bold tracking-[0.25em] uppercase text-white">
            {user?.name || 'A L I'}
          </h1>
        </div>

        {/* Standalone "Мой профиль" Card */}
        <div 
          className="card bg-[#1C1C1E] rounded-[24px] p-4 flex items-center justify-between mb-4 cursor-pointer hover:bg-white/[0.04] transition-colors"
          onClick={() => setIsEditProfileOpen(true)}
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-[12px] bg-[#FF2D55] flex items-center justify-center text-white">
              <User className="w-5 h-5" fill="currentColor" strokeWidth={1.5} />
            </div>
            <span className="font-semibold text-[16px]">Profil</span>
          </div>
          <ChevronRight className="w-5 h-5 text-[#8E8E93]" />
        </div>

        {/* Grouped Links Card */}
        <div className="card-grouped bg-[#1C1C1E] rounded-[24px] overflow-hidden flex flex-col mb-8">
          
          <div className="card-row flex items-center justify-between p-4 border-b border-white/[0.04] cursor-pointer hover:bg-white/[0.04] transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-[12px] bg-[#8B5CF6] flex items-center justify-center text-white">
                <Microscope className="w-5 h-5" strokeWidth={2.5} />
              </div>
              <span className="font-medium text-[16px]">Таҳлил</span>
            </div>
            <ChevronRight className="w-5 h-5 text-[#8E8E93]" />
          </div>

          <div className="card-row flex items-center justify-between p-4 border-b border-white/[0.04] cursor-pointer hover:bg-white/[0.04] transition-colors" onClick={() => setIsTopUpOpen(true)}>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-[12px] bg-[#10B981] flex items-center justify-center text-white">
                <CreditCard className="w-5 h-5" strokeWidth={2.5} />
              </div>
              <span className="font-medium text-[16px]">Balansni to'ldirish</span>
            </div>
            <ChevronRight className="w-5 h-5 text-[#8E8E93]" />
          </div>

          <div 
            className="card-row flex items-center justify-between p-4 border-b border-white/[0.04] cursor-pointer hover:bg-white/[0.04] transition-colors"
            onClick={() => window.Telegram?.WebApp?.openTelegramLink?.('https://t.me/rashidov_biologiya')}
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-[12px] bg-[#0EA5E9] flex items-center justify-center text-white">
                <Send className="w-5 h-5 ml-[-2px]" fill="currentColor" strokeWidth={1} />
              </div>
              <span className="font-medium text-[16px]">Telegram kanal</span>
            </div>
            <ChevronRight className="w-5 h-5 text-[#8E8E93]" />
          </div>

          <div className="card-row flex items-center justify-between p-4 cursor-pointer hover:bg-white/[0.04] transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-[12px] bg-[#3B82F6] flex items-center justify-center text-white">
                <Settings className="w-5 h-5" fill="currentColor" strokeWidth={1} />
              </div>
              <span className="font-medium text-[16px]">Sozlamalar</span>
            </div>
            <ChevronRight className="w-5 h-5 text-[#8E8E93]" />
          </div>

        </div>

        {isTopUpOpen ? (
          <div className="mb-8">
            <TopUp user={user} onBack={() => setIsTopUpOpen(false)} />
          </div>
        ) : isPromoOpen ? (
          <div className="mb-8">
            <PromoCode user={user} />
          </div>
        ) : null}

      </div>
      
      <Profile user={user} isOpen={isEditProfileOpen} onClose={() => setIsEditProfileOpen(false)} />
    </div>
  );
}
