import React, { useState, useEffect } from 'react';
import { 
  ChevronRight, CreditCard, Settings, 
  Sparkles, Flame, User, Edit3, ShieldCheck, Headphones, Globe 
} from 'lucide-react';
import Profile from '../components/Profile';
import TopUpModal from '../components/TopUpModal';
import SettingsModal from '../components/SettingsModal';
import SupportModal from '../components/SupportModal';
import { formatCompactNeyron } from '../utils/formatters';
import { useHaptic } from '../hooks/useHaptic';
import { useLanguage } from '../context/LanguageContext';
import { getSupportContacts } from '../api/supabase';

// Telegram official SVG logo
const TelegramIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.75-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
  </svg>
);

export default function ProfilePage({ user, onUpdateUser, onRegisterBackAction }) {
  const { t, lang } = useLanguage();
  const { impactLight, impactMedium } = useHaptic();

  // Modal triggers
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isTopUpOpen, setIsTopUpOpen] = useState(false);
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Official website state (configurable via admin-app)
  const [officialWebsite, setOfficialWebsite] = useState('https://rashidovschool.uz');

  useEffect(() => {
    let mounted = true;
    getSupportContacts().then(data => {
      if (mounted && data?.website) {
        setOfficialWebsite(data.website);
      }
    }).catch(() => {});
    return () => { mounted = false; };
  }, []);

  // Synchronize modal state with Telegram Mini App BackButton
  useEffect(() => {
    if (typeof onRegisterBackAction !== 'function') return;

    if (isSupportOpen) {
      onRegisterBackAction(() => setIsSupportOpen(false));
    } else if (isSettingsOpen) {
      onRegisterBackAction(() => setIsSettingsOpen(false));
    } else if (isEditProfileOpen) {
      onRegisterBackAction(() => setIsEditProfileOpen(false));
    } else if (isTopUpOpen) {
      onRegisterBackAction(() => setIsTopUpOpen(false));
    } else {
      onRegisterBackAction(null);
    }
  }, [isSupportOpen, isSettingsOpen, isEditProfileOpen, isTopUpOpen, onRegisterBackAction]);

  const fullName = user?.full_name || 'Aliakbar Lutfullayev';
  const classGroup = user?.class_group || '11-A';
  const balance = user?.balance || 0;
  const streak = user?.streak_days || 0;

  const handleOpenChannel = () => {
    impactMedium();
    const url = 'https://t.me/rashidov_biologiya';
    if (window.Telegram?.WebApp?.openTelegramLink) {
      window.Telegram.WebApp.openTelegramLink(url);
    } else {
      window.open(url, '_blank');
    }
  };

  const handleOpenWebsite = () => {
    impactMedium();
    let url = officialWebsite || 'https://rashidovschool.uz';
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `https://${url}`;
    }
    if (window.Telegram?.WebApp?.openLink) {
      window.Telegram.WebApp.openLink(url);
    } else {
      window.open(url, '_blank');
    }
  };

  return (
    <div className="w-full pb-32 pt-2 px-4 max-w-5xl mx-auto space-y-5">
      
      {/* Profile Header Card */}
      <div className="bg-[#1C1C1E] border border-white/5 rounded-3xl p-6 shadow-2xl relative overflow-hidden flex flex-col items-center text-center">
        {/* Ambient Top Glow */}
        <div className="absolute top-0 w-64 h-32 bg-blue-500/10 blur-3xl pointer-events-none" />

        {/* Edit Button Top-Right */}
        <button
          onClick={() => {
            impactLight();
            setIsEditProfileOpen(true);
          }}
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-[#2C2C2E] border border-blue-500/20 hover:bg-[#343438] flex items-center justify-center text-blue-500 active:scale-95 transition-all"
        >
          <Edit3 className="w-4 h-4" />
        </button>

        {/* Avatar with Neon Gradient Ring */}
        <div className="relative mb-3">
          <div className="avatar-ring w-24 h-24 p-[3px] rounded-full shadow-[0_0_25px_rgba(0,122,255,0.3)]">
            <div className="avatar-ring-inner w-full h-full bg-[#161618] rounded-full flex items-center justify-center text-2xl font-black text-white">
              {fullName.substring(0, 2).toUpperCase()}
            </div>
          </div>
          {/* Online / Verified check badge */}
          <div className="absolute bottom-1 right-1 bg-[#007AFF] text-white p-1 rounded-full border-2 border-black">
            <ShieldCheck className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Name & Class Badge */}
        <h2 className="text-xl font-bold text-white mb-1">{fullName}</h2>
        <div className="flex items-center gap-2 mb-4">
          <span className="bg-[#2C2C2E] text-white/90 text-xs font-bold px-3 py-1 rounded-full border border-white/5">
            {classGroup}
          </span>
          <span className="text-xs text-[#8E8E93]">Rashidov School</span>
        </div>

        {/* Badges Grid (Tree of Knowledge Stage, Streak, Neyron) */}
        <div className="grid grid-cols-3 gap-2 w-full pt-2">
          
          <div className="bg-[#2C2C2E] border border-white/5 p-3 rounded-2xl flex flex-col items-center">
            <span className="text-lg mb-0.5">🌳</span>
            <span className="text-[10px] text-[#8E8E93] leading-none mb-1">Daraxt</span>
            <span className="text-xs font-bold text-emerald-400">Nihol</span>
          </div>

          <div className="bg-[#2C2C2E] border border-white/5 p-3 rounded-2xl flex flex-col items-center">
            <span className="text-lg mb-0.5">🔥</span>
            <span className="text-[10px] text-[#8E8E93] leading-none mb-1">Streak</span>
            <span className="text-xs font-bold text-amber-400">{streak} kun</span>
          </div>

          <button
            onClick={() => {
              impactLight();
              setIsTopUpOpen(true);
            }}
            className="bg-[#2C2C2E] border border-blue-500/20 hover:border-blue-500/40 p-3 rounded-2xl flex flex-col items-center active:scale-95 transition-all"
          >
            <span className="text-lg mb-0.5">🧠</span>
            <span className="text-[10px] text-[#8E8E93] leading-none mb-1">Balans</span>
            <span className="text-xs font-bold text-blue-400 truncate max-w-[80px]">
              {formatCompactNeyron(balance)}
            </span>
          </button>

        </div>
      </div>

      {/* iOS-Style Grouped Squircle Menu (Every Row is Clickable) */}
      <div className="card-grouped bg-[#1C1C1E] border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
        
        {/* Row 1: Balansni to'ldirish (Dark Blue Squircle) */}
        <div
          onClick={() => {
            impactLight();
            setIsTopUpOpen(true);
          }}
          className="card-row flex items-center justify-between p-4 cursor-pointer hover:bg-white/[0.03] transition-colors border-b border-white/[0.04]"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/15 border border-blue-500/30 flex items-center justify-center text-blue-500">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-white text-sm block">
                {lang === 'ru' ? 'Пополнить баланс' : "Balansni to'ldirish"}
              </span>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-[#8E8E93]" />
        </div>

        {/* Row 2: Sozlamalar (Dark Blue Squircle) */}
        <div
          onClick={() => {
            impactLight();
            setIsSettingsOpen(true);
          }}
          className="card-row flex items-center justify-between p-4 cursor-pointer hover:bg-white/[0.03] transition-colors border-b border-white/[0.04]"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/15 border border-blue-500/30 flex items-center justify-center text-blue-500">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-white text-sm block">{t('sozlamalar')}</span>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-[#8E8E93]" />
        </div>

        {/* Row 3: Aloqa va yordam (Dark Blue Squircle) */}
        <div
          onClick={() => {
            impactLight();
            setIsSupportOpen(true);
          }}
          className="card-row flex items-center justify-between p-4 cursor-pointer hover:bg-white/[0.03] transition-colors border-b border-white/[0.04]"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/15 border border-blue-500/30 flex items-center justify-center text-blue-500">
              <Headphones className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-white text-sm block">
                {lang === 'ru' ? 'Связь и помощь' : 'Aloqa va yordam'}
              </span>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-[#8E8E93]" />
        </div>

        {/* Row 4: Telegram Kanal (Dark Blue Squircle + Official Telegram Logo) */}
        <div
          onClick={handleOpenChannel}
          className="card-row flex items-center justify-between p-4 cursor-pointer hover:bg-white/[0.03] transition-colors border-b border-white/[0.04]"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/15 border border-blue-500/30 flex items-center justify-center text-blue-500">
              <TelegramIcon className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-white text-sm block">
                {lang === 'ru' ? 'Официальный канал' : 'Rasmiy kanal'}
              </span>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-[#8E8E93]" />
        </div>

        {/* Row 5: Rasmiy sayt (Dark Blue Squircle) */}
        <div
          onClick={handleOpenWebsite}
          className="card-row flex items-center justify-between p-4 cursor-pointer hover:bg-white/[0.03] transition-colors"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/15 border border-blue-500/30 flex items-center justify-center text-blue-500">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-white text-sm block">
                {lang === 'ru' ? 'Официальный сайт' : 'Rasmiy sayt'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-[#8E8E93] font-mono hidden sm:inline">
              {officialWebsite.replace(/^https?:\/\//, '')}
            </span>
            <ChevronRight className="w-5 h-5 text-[#8E8E93]" />
          </div>
        </div>

      </div>

      {/* Footer Branding */}
      <p className="text-center text-[11px] text-[#8E8E93]/50 pt-2 pb-6 tracking-wider">
        Rashidov School &nbsp;&bull;&nbsp; since 2023
      </p>

      {/* Modals */}
      <Profile
        user={user}
        isOpen={isEditProfileOpen}
        onClose={() => setIsEditProfileOpen(false)}
        onUpdateUser={onUpdateUser}
      />

      <TopUpModal
        isOpen={isTopUpOpen}
        onClose={() => setIsTopUpOpen(false)}
        user={user}
        onUpdateUser={onUpdateUser}
      />

      <SupportModal
        isOpen={isSupportOpen}
        onClose={() => setIsSupportOpen(false)}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

    </div>
  );
}
