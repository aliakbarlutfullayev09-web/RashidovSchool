import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronRight, CreditCard, Settings, 
  Sparkles, Edit3, Headphones, Globe, Dna, FlaskConical, Atom
} from 'lucide-react';
import Profile from '../components/Profile';
import TopUpModal from '../components/TopUpModal';
import SettingsModal from '../components/SettingsModal';
import SupportModal from '../components/SupportModal';
import { formatCompactNeyron } from '../utils/formatters';
import {
  getProfileColorPreset,
  getSavedProfileColor,
  getOrCreateRandomAvatarGradient,
} from '../utils/profileColors';
import { useHaptic } from '../hooks/useHaptic';
import { useLanguage } from '../context/LanguageContext';
import { useIsDesktop } from '../hooks/useIsDesktop';
import { getSupportContacts } from '../api/supabase';

// Telegram official paper plane SVG logo
const TelegramIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.75-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
  </svg>
);

// Official Telegram Verified Checkmark SVG Badge (scalloped blue seal + white checkmark)
const TelegramVerifiedBadge = ({ className = "w-6 h-6" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" aria-label="Verified">
    <path
      d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.66-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.33 2.19c-1.4-.46-2.91-.2-3.92.81s-1.26 2.52-.8 3.91c-1.31.67-2.2 1.91-2.2 3.34s.89 2.67 2.2 3.34c-.46 1.39-.21 2.9.8 3.91s2.52 1.26 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.68-.88 3.34-2.19c1.39.45 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34z"
      fill="#2AABEE"
    />
    <path
      d="M7.6 12.3L10.5 15.2L16.6 9.1"
      stroke="#FFFFFF"
      strokeWidth="2.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default function ProfilePage({ user, onUpdateUser, onRegisterBackAction }) {
  const { t, lang } = useLanguage();
  const { impactLight, impactMedium } = useHaptic();
  const isDesktop = useIsDesktop();

  // Modal triggers
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isTopUpOpen, setIsTopUpOpen] = useState(false);
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Avatar image fallback state
  const [imgError, setImgError] = useState(false);
  useEffect(() => {
    setImgError(false);
  }, [user?.photo_url]);

  // Rank ("O'rin") tile tap animation & floating "Tez kunlarda ..." popup state
  const [isRankGrayed, setIsRankGrayed] = useState(false);
  const [rankPopups, setRankPopups] = useState([]);
  const rankGrayTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (rankGrayTimerRef.current) clearTimeout(rankGrayTimerRef.current);
    };
  }, []);

  const handleRankTap = (e) => {
    impactLight();
    const rect = e.currentTarget.getBoundingClientRect();
    const hasCoords = e.clientX !== 0 || e.clientY !== 0;
    const x = hasCoords ? e.clientX - rect.left : rect.width / 2;
    const y = hasCoords ? e.clientY - rect.top : rect.height * 0.35;

    setIsRankGrayed(true);
    if (rankGrayTimerRef.current) clearTimeout(rankGrayTimerRef.current);
    rankGrayTimerRef.current = setTimeout(() => {
      setIsRankGrayed(false);
    }, 1000);

    const popupId = `${Date.now()}_${Math.random()}`;
    setRankPopups((prev) => [...prev.slice(-2), { id: popupId, x, y }]);
    setTimeout(() => {
      setRankPopups((prev) => prev.filter((p) => p.id !== popupId));
    }, 1100);
  };

  const isAnyModalOpen = isEditProfileOpen || isTopUpOpen || isSupportOpen || isSettingsOpen;

  const toggleModal = (modalName) => {
    impactLight();
    if (modalName === 'settings') {
      setIsSupportOpen(false);
      setIsTopUpOpen(false);
      setIsEditProfileOpen(false);
      setIsSettingsOpen(prev => isDesktop ? !prev : true);
    } else if (modalName === 'support') {
      setIsSettingsOpen(false);
      setIsTopUpOpen(false);
      setIsEditProfileOpen(false);
      setIsSupportOpen(prev => isDesktop ? !prev : true);
    } else if (modalName === 'topup') {
      setIsSettingsOpen(false);
      setIsSupportOpen(false);
      setIsEditProfileOpen(false);
      setIsTopUpOpen(prev => isDesktop ? !prev : true);
    } else if (modalName === 'profile') {
      setIsSettingsOpen(false);
      setIsSupportOpen(false);
      setIsTopUpOpen(false);
      setIsEditProfileOpen(prev => isDesktop ? !prev : true);
    }
  };

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
  const firstLetter = (fullName.trim().charAt(0) || 'A').toUpperCase();
  const hasPhoto = Boolean(user?.photo_url) && !imgError;

  const profilePreset = getProfileColorPreset(
    user?.profile_color || getSavedProfileColor(user?.telegram_id)
  );
  const randomAvatarBg = getOrCreateRandomAvatarGradient(user?.telegram_id || user?.id);

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
    <div className={`w-full pb-32 pt-2 px-4 transition-all duration-300 ${
      isDesktop 
        ? isAnyModalOpen
          ? 'max-w-5xl mx-auto flex flex-row items-start justify-center gap-4 lg:gap-8' 
          : 'max-w-3xl mx-auto flex flex-col items-center justify-center'
        : 'max-w-5xl mx-auto space-y-5'
    }`}>
      {/* Profile Column (compresses fluidly when modal opens, stretches to full max-w-3xl otherwise) */}
      <div className={`space-y-5 transition-all duration-300 ease-out ${
        isDesktop 
          ? isAnyModalOpen ? 'flex-1 min-w-[250px] max-w-[390px]' : 'w-full'
          : 'w-full'
      }`}>
        {/* Profile Header Card */}
      <div className="bg-[#1C1C1E] border border-white/5 rounded-3xl p-6 shadow-2xl relative overflow-hidden flex flex-col items-center text-center">
        {/* Telegram-Style Colored Profile Header Backdrop behind/around Avatar */}
        <div
          data-profile-color={profilePreset.id}
          className="absolute inset-x-0 top-0 h-52 pointer-events-none transition-all duration-300"
          style={{
            background: `radial-gradient(ellipse 95% 85% at 50% 0%, ${profilePreset.hex}66 0%, ${profilePreset.accent}22 50%, transparent 100%)`,
          }}
        >
          {/* Subtle Telegram-style floating background pattern icons around the avatar */}
          <div className="relative w-full h-full max-w-xs mx-auto opacity-[0.14]" style={{ color: profilePreset.accent }}>
            <Dna className="w-5 h-5 absolute top-5 left-12 -rotate-12" />
            <Sparkles className="w-4 h-4 absolute top-14 left-5 rotate-12" />
            <Atom className="w-5 h-5 absolute top-24 left-14 rotate-45" />
            <FlaskConical className="w-5 h-5 absolute top-6 right-12 rotate-12" />
            <Sparkles className="w-4 h-4 absolute top-16 right-5 -rotate-12" />
            <Dna className="w-4 h-4 absolute top-24 right-14 -rotate-45" />
          </div>
        </div>

        {/* Edit Button Top-Right */}
        <button
          onClick={() => toggleModal('profile')}
          className={`absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-black/25 backdrop-blur-md border flex items-center justify-center text-white/90 active:scale-95 transition-all ${
            isDesktop && isEditProfileOpen ? 'border-white/50 ring-2 ring-white/30 bg-black/40' : 'border-white/10 hover:bg-black/40'
          }`}
          title="Tahrirlash"
        >
          <Edit3 className="w-4 h-4" />
        </button>

        {/* Avatar (Clean Telegram Photo or First Letter + Random Background, No Rainbow Ring) */}
        <div className="relative z-10 mb-3 mt-1">
          <div className="w-24 h-24 rounded-full overflow-hidden shadow-xl border-2 border-white/15 bg-[#161618] flex items-center justify-center">
            {hasPhoto ? (
              <img
                src={user.photo_url}
                alt={fullName}
                onError={() => setImgError(true)}
                className="w-full h-full object-cover"
              />
            ) : (
              <div
                data-avatar-fallback="true"
                className="w-full h-full flex items-center justify-center text-4xl font-black text-white select-none"
                style={{
                  background: `linear-gradient(135deg, ${randomAvatarBg.from}, ${randomAvatarBg.to})`,
                }}
              >
                {firstLetter}
              </div>
            )}
          </div>
          {/* Official Telegram Verified Checkmark Badge */}
          <div
            data-verified-badge="telegram"
            className="absolute bottom-0 right-0 rounded-full bg-[#1C1C1E] p-[2px] shadow-md flex items-center justify-center"
          >
            <TelegramVerifiedBadge className="w-6 h-6" />
          </div>
        </div>

        {/* Name & Centered Class Badge */}
        <h2 className="relative z-10 text-xl font-bold text-white mb-1.5">{fullName}</h2>
        <div className="relative z-10 flex items-center justify-center mb-4">
          <span className="bg-white/10 backdrop-blur-sm text-white/95 text-xs font-bold px-3.5 py-1 rounded-full border border-white/10">
            {classGroup}
          </span>
        </div>

        {/* Badges Grid (O'rin, Streak, Balans) */}
        <div className="relative z-10 grid grid-cols-3 gap-2 w-full pt-2">
          
          <button
            type="button"
            onClick={handleRankTap}
            className={`relative overflow-visible border p-3 rounded-2xl flex flex-col items-center justify-center cursor-pointer select-none transition-all duration-150 ${
              isRankGrayed
                ? 'bg-[#3A3A3C]/70 border-white/10 grayscale opacity-60 scale-[0.98]'
                : 'bg-[#2C2C2E] border-white/5 hover:border-white/10 active:scale-95'
            }`}
          >
            <span className="text-xl font-bold text-white/80 leading-none mb-1.5">-</span>
            <span className={`text-xs font-bold transition-colors ${isRankGrayed ? 'text-[#8E8E93]' : 'text-emerald-400'}`}>
              O'rin
            </span>

            {/* Floating gray "Tez kunlarda ..." popup anchored to exact tap point */}
            <AnimatePresence>
              {rankPopups.map((popup) => (
                <motion.span
                  key={popup.id}
                  initial={{ opacity: 0, y: 4, scale: 0.9 }}
                  animate={{ opacity: 1, y: -12, scale: 1 }}
                  exit={{ opacity: 0, y: -22, scale: 0.95 }}
                  transition={{ duration: 0.25 }}
                  style={{ left: popup.x, top: popup.y }}
                  className="absolute -translate-x-1/2 -translate-y-full z-50 pointer-events-none whitespace-nowrap px-2.5 py-1 rounded-full bg-[#242426]/95 border border-white/10 text-[11px] font-semibold text-[#8E8E93] shadow-xl"
                >
                  Tez kunlarda ...
                </motion.span>
              ))}
            </AnimatePresence>
          </button>

          <div className="bg-[#2C2C2E] border border-white/5 p-3 rounded-2xl flex flex-col items-center">
            <span className="text-lg mb-0.5">🔥</span>
            <span className="text-[10px] text-[#8E8E93] leading-none mb-1">Streak</span>
            <span className="text-xs font-bold text-amber-400">{streak} kun</span>
          </div>

          <button
            onClick={() => toggleModal('topup')}
            className={`bg-[#2C2C2E] border p-3 rounded-2xl flex flex-col items-center active:scale-95 transition-all ${
              isDesktop && isTopUpOpen ? 'border-blue-500 ring-2 ring-blue-500/50 bg-[#343438]' : 'border-blue-500/20 hover:border-blue-500/40'
            }`}
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
          onClick={() => toggleModal('topup')}
          className={`card-row flex items-center justify-between p-4 cursor-pointer transition-colors border-b border-white/[0.04] ${
            isDesktop && isTopUpOpen ? 'bg-white/[0.08] ring-1 ring-blue-500/50' : 'hover:bg-white/[0.03]'
          }`}
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
          <ChevronRight className={`w-5 h-5 transition-transform ${isDesktop && isTopUpOpen ? 'text-blue-400 translate-x-1' : 'text-[#8E8E93]'}`} />
        </div>

        {/* Row 2: Sozlamalar (Dark Blue Squircle) */}
        <div
          onClick={() => toggleModal('settings')}
          className={`card-row flex items-center justify-between p-4 cursor-pointer transition-colors border-b border-white/[0.04] ${
            isDesktop && isSettingsOpen ? 'bg-white/[0.08] ring-1 ring-blue-500/50' : 'hover:bg-white/[0.03]'
          }`}
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/15 border border-blue-500/30 flex items-center justify-center text-blue-500">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-white text-sm block">{t('sozlamalar')}</span>
            </div>
          </div>
          <ChevronRight className={`w-5 h-5 transition-transform ${isDesktop && isSettingsOpen ? 'text-blue-400 translate-x-1' : 'text-[#8E8E93]'}`} />
        </div>

        {/* Row 3: Aloqa va yordam (Dark Blue Squircle) */}
        <div
          onClick={() => toggleModal('support')}
          className={`card-row flex items-center justify-between p-4 cursor-pointer transition-colors border-b border-white/[0.04] ${
            isDesktop && isSupportOpen ? 'bg-white/[0.08] ring-1 ring-emerald-500/50' : 'hover:bg-white/[0.03]'
          }`}
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
          <ChevronRight className={`w-5 h-5 transition-transform ${isDesktop && isSupportOpen ? 'text-emerald-400 translate-x-1' : 'text-[#8E8E93]'}`} />
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

      </div>

      {/* Desktop In-Flow Detail Panel (Opens on the Right side when item is clicked) */}
      {isDesktop && isAnyModalOpen && (
        <div className="flex-1 min-w-[260px] max-w-[420px] sticky top-4 animate-in fade-in slide-in-from-right-4 duration-300">
          {isSettingsOpen && (
            <SettingsModal
              isOpen={isSettingsOpen}
              onClose={() => setIsSettingsOpen(false)}
              inlineDesktop={true}
            />
          )}
          {isSupportOpen && (
            <SupportModal
              isOpen={isSupportOpen}
              onClose={() => setIsSupportOpen(false)}
              inlineDesktop={true}
            />
          )}
          {isTopUpOpen && (
            <TopUpModal
              isOpen={isTopUpOpen}
              onClose={() => setIsTopUpOpen(false)}
              user={user}
              onUpdateUser={onUpdateUser}
              inlineDesktop={true}
            />
          )}
          {isEditProfileOpen && (
            <Profile
              user={user}
              isOpen={isEditProfileOpen}
              onClose={() => setIsEditProfileOpen(false)}
              onUpdateUser={onUpdateUser}
              inlineDesktop={true}
            />
          )}
        </div>
      )}

      {/* Mobile Modals (Fullscreen overlay on mobile) */}
      {!isDesktop && (
        <>
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
        </>
      )}

    </div>
  );
}
