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
import { useTheme } from '../context/ThemeContext';
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

// Crisp SVG Streak Flame icon
const StreakFlameSvgIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <defs>
      <linearGradient id="streakFlameGrad" x1="12" y1="2" x2="12" y2="22" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FF9F0A" />
        <stop offset="100%" stopColor="#FF3B30" />
      </linearGradient>
    </defs>
    <path
      d="M12.7 2.4c.2 2.4-.7 4.2-2.2 5.6-1.2 1.1-1.7 2.1-1.7 3.3 0 1 .4 1.8 1.2 2.4-.3-.9-.1-1.9.6-2.8.5-.7 1.3-1.2 2-1.7 1.1-.8 1.7-1.9 1.9-3.2 2.3 1.7 3.8 4.4 3.8 7.3 0 3.7-2.8 6.7-6.3 6.7S5.7 17 5.7 13.3c0-2.7 1.2-5 3.3-7.1 1.4-1.4 2.7-2.4 3.7-3.8z"
      fill="url(#streakFlameGrad)"
    />
    <path
      d="M12.2 19.6c1.7 0 3-1.3 3-3 0-1.1-.6-2.1-1.4-2.8-.1.9-.6 1.5-1.3 1.9-.6.4-1 .9-1 1.6 0 1.2.6 2.3 1.7 2.3z"
      fill="#FFD60A"
    />
  </svg>
);

// Crisp SVG Neuron / Brain icon matching TopUpModal
const NeuronSvgIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-1.54" />
    <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-1.54" />
  </svg>
);

export default function ProfilePage({ user, onUpdateUser, onRegisterBackAction }) {
  const { t, lang } = useLanguage();
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === 'light';
  const { impactLight, impactMedium } = useHaptic();
  const isDesktop = useIsDesktop();

  // Modal triggers
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isTopUpOpen, setIsTopUpOpen] = useState(false);
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [previewProfileColor, setPreviewProfileColor] = useState(null);

  useEffect(() => {
    if (!isEditProfileOpen) {
      setPreviewProfileColor(null);
    }
  }, [isEditProfileOpen]);

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

  const activeProfileColor =
    (isEditProfileOpen && previewProfileColor) ||
    user?.profile_color ||
    getSavedProfileColor(user?.telegram_id);
  const profilePreset = getProfileColorPreset(activeProfileColor);
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
    <motion.div
      initial={false}
      animate={isDesktop ? { maxWidth: isAnyModalOpen ? 860 : 768 } : undefined}
      transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
      className={`w-full mx-auto px-4 flex flex-col ${
        isDesktop ? 'pb-10 pt-4 items-center' : 'pb-32 pt-2 max-w-5xl'
      }`}
    >
      {/* Dual-Column Row on Desktop (unified page scroll; left column smoothly expands rightward on close) */}
      <div className={isDesktop ? 'w-full flex flex-row items-start justify-center' : 'w-full space-y-5'}>
        {/* Profile Column */}
        <div className={isDesktop ? 'flex-1 min-w-0 space-y-5' : 'w-full space-y-5'}>
        {/* Profile Header Card */}
      <div className={`border rounded-3xl p-6 relative overflow-hidden flex flex-col items-center text-center transition-colors ${
        isLight ? 'bg-white border-black/[0.06] shadow-lg' : 'bg-[#1C1C1E] border-white/5 shadow-2xl'
      }`}>
        {/* Telegram-Style Colored Profile Header Backdrop behind/around Avatar (full-card inset-0 prevents any horizontal seam) */}
        <div
          data-profile-color={profilePreset.id}
          className="absolute inset-0 pointer-events-none transition-all duration-300"
          style={{
            background: isLight
              ? `radial-gradient(ellipse 100% 56% at 50% 14%, ${profilePreset.hex}EB 0%, ${profilePreset.accent}88 38%, ${profilePreset.hex}24 68%, transparent 100%)`
              : `radial-gradient(ellipse 100% 56% at 50% 14%, ${profilePreset.hex}D9 0%, ${profilePreset.accent}66 38%, ${profilePreset.hex}1F 68%, transparent 100%)`,
          }}
        >
          {/* Ambient glow halo centered directly behind/around the avatar */}
          <div
            aria-hidden="true"
            className="absolute left-1/2 top-[76px] -translate-x-1/2 -translate-y-1/2 w-44 h-44 rounded-full blur-2xl pointer-events-none transition-all duration-300"
            style={{
              background: `radial-gradient(circle, ${profilePreset.accent}${isLight ? 'A6' : '88'} 0%, ${profilePreset.hex}${isLight ? '73' : '54'} 55%, transparent 78%)`,
            }}
          />
          {/* Subtle Telegram-style floating background pattern icons around the avatar */}
          <div
            className={`relative w-full h-56 max-w-xs mx-auto transition-colors duration-300 ${isLight ? 'opacity-[0.46]' : 'opacity-[0.34]'}`}
            style={{ color: isLight ? profilePreset.hex : profilePreset.accent }}
          >
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
          className={`absolute top-4 right-4 z-20 w-9 h-9 rounded-full backdrop-blur-md border flex items-center justify-center active:scale-95 transition-all ${
            isDesktop && isEditProfileOpen
              ? 'border-[#007AFF] ring-2 ring-blue-500/30 bg-blue-500/15 text-[#007AFF]'
              : isLight
              ? 'bg-white/70 hover:bg-white/90 border-black/[0.08] text-[#1C1C1E] shadow-sm'
              : 'bg-black/25 border-white/10 hover:bg-black/40 text-white/90'
          }`}
          title={lang === 'ru' ? 'Редактировать' : 'Tahrirlash'}
        >
          <Edit3 className="w-4 h-4" />
        </button>

        {/* Avatar (Clean Telegram Photo or First Letter + Random Background, No Rainbow Ring) */}
        <div className="relative z-10 mb-3 mt-1">
          <div className={`w-24 h-24 rounded-full overflow-hidden shadow-xl border-2 flex items-center justify-center ${
            isLight ? 'border-white bg-gray-100' : 'border-white/15 bg-[#161618]'
          }`}>
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
          {/* Official Telegram Verified Checkmark Badge (no background circle) */}
          <div
            data-verified-badge="telegram"
            className="absolute -bottom-0.5 -right-0.5 flex items-center justify-center pointer-events-none"
          >
            <TelegramVerifiedBadge className="w-6 h-6 drop-shadow-sm" />
          </div>
        </div>

        {/* Name & Centered Class Badge */}
        <h2 className={`relative z-10 text-xl font-bold mb-1.5 ${isLight ? 'text-[#1C1C1E]' : 'text-white'}`}>
          {fullName}
        </h2>
        <div className="relative z-10 flex items-center justify-center mb-4">
          <span className={`backdrop-blur-sm text-xs font-bold px-3.5 py-1 rounded-full border ${
            isLight
              ? 'bg-black/[0.06] text-[#1C1C1E] border-black/[0.08]'
              : 'bg-white/10 text-white/95 border-white/10'
          }`}>
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
                ? isLight
                  ? 'bg-gray-200 border-gray-300 opacity-70 scale-[0.98]'
                  : 'bg-[#3A3A3C]/70 border-white/10 grayscale opacity-60 scale-[0.98]'
                : isLight
                ? 'bg-[#F2F2F7] border-black/[0.06] hover:border-black/15 active:scale-95'
                : 'bg-[#2C2C2E] border-white/5 hover:border-white/10 active:scale-95'
            }`}
          >
            <span className={`text-xl font-bold leading-none mb-1.5 ${isLight ? 'text-[#1C1C1E]' : 'text-white/80'}`}>-</span>
            <span className={`text-xs font-bold transition-colors ${
              isRankGrayed
                ? 'text-[#8E8E93]'
                : isLight ? 'text-emerald-600' : 'text-emerald-400'
            }`}>
              {lang === 'ru' ? 'Место' : "O'rin"}
            </span>

            {/* Floating gray "Tez kunlarda ..." / "Скоро ..." popup anchored above exact tap point */}
            <AnimatePresence>
              {rankPopups.map((popup) => (
                <motion.span
                  key={popup.id}
                  initial={{ opacity: 0, y: -4, scale: 0.9 }}
                  animate={{ opacity: 1, y: -22, scale: 1 }}
                  exit={{ opacity: 0, y: -32, scale: 0.95 }}
                  transition={{ duration: 0.25 }}
                  style={{ left: popup.x, top: Math.min(popup.y, 18) }}
                  className={`absolute -translate-x-1/2 -translate-y-full z-50 pointer-events-none whitespace-nowrap px-2 py-0.5 rounded-full border text-[10px] font-semibold shadow-lg ${
                    isLight
                      ? 'bg-[#E5E5EA]/95 border-black/10 text-gray-600'
                      : 'bg-[#3A3A3C]/95 border-white/10 text-[#AEAEB2]'
                  }`}
                >
                  {lang === 'ru' ? 'Скоро ...' : 'Tez kunlarda ...'}
                </motion.span>
              ))}
            </AnimatePresence>
          </button>

          <div className={`border p-3 rounded-2xl flex flex-col items-center ${
            isLight ? 'bg-[#F2F2F7] border-black/[0.06]' : 'bg-[#2C2C2E] border-white/5'
          }`}>
            <StreakFlameSvgIcon className="w-5 h-5 mb-1" />
            <span className={`text-[10px] leading-none mb-1 ${isLight ? 'text-gray-500' : 'text-[#8E8E93]'}`}>
              {lang === 'ru' ? 'Серия' : 'Streak'}
            </span>
            <span className={`text-xs font-bold ${isLight ? 'text-amber-600' : 'text-amber-400'}`}>
              {streak} {lang === 'ru' ? 'дн.' : 'kun'}
            </span>
          </div>

          <button
            onClick={() => toggleModal('topup')}
            className={`border p-3 rounded-2xl flex flex-col items-center active:scale-95 transition-all ${
              isDesktop && isTopUpOpen
                ? isLight
                  ? 'border-blue-500 ring-2 ring-blue-500/30 bg-blue-50'
                  : 'border-blue-500 ring-2 ring-blue-500/50 bg-[#343438]'
                : isLight
                ? 'bg-[#F2F2F7] border-blue-500/25 hover:border-blue-500/45'
                : 'bg-[#2C2C2E] border-blue-500/20 hover:border-blue-500/40'
            }`}
          >
            <NeuronSvgIcon className={`w-5 h-5 mb-1 ${isLight ? 'text-[#007AFF]' : 'text-blue-400'}`} />
            <span className={`text-[10px] leading-none mb-1 ${isLight ? 'text-gray-500' : 'text-[#8E8E93]'}`}>
              {lang === 'ru' ? 'Баланс' : 'Balans'}
            </span>
            <span className={`text-xs font-bold truncate max-w-[80px] ${isLight ? 'text-blue-600' : 'text-blue-400'}`}>
              {formatCompactNeyron(balance)}
            </span>
          </button>

        </div>
      </div>

      {/* iOS-Style Grouped Squircle Menu (Every Row is Clickable) */}
      <div className={`card-grouped border rounded-3xl overflow-hidden ${
        isLight ? 'bg-white border-black/[0.06] shadow-lg' : 'bg-[#1C1C1E] border-white/5 shadow-2xl'
      }`}>
        
        {/* Row 1: Balansni to'ldirish (Dark Blue Squircle) */}
        <div
          onClick={() => toggleModal('topup')}
          className={`card-row flex items-center justify-between p-4 cursor-pointer transition-colors border-b ${
            isLight ? 'border-black/[0.06]' : 'border-white/[0.04]'
          } ${
            isDesktop && isTopUpOpen
              ? isLight ? 'bg-blue-50/70 ring-1 ring-blue-500/40' : 'bg-white/[0.08] ring-1 ring-blue-500/50'
              : isLight ? 'hover:bg-black/[0.02]' : 'hover:bg-white/[0.03]'
          }`}
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/15 border border-blue-500/30 flex items-center justify-center text-blue-500">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <span className={`font-bold text-sm block ${isLight ? 'text-[#1C1C1E]' : 'text-white'}`}>
                {lang === 'ru' ? 'Пополнить баланс' : "Balansni to'ldirish"}
              </span>
            </div>
          </div>
          <ChevronRight className={`w-5 h-5 transition-transform ${isDesktop && isTopUpOpen ? 'text-blue-500 translate-x-1' : 'text-[#8E8E93]'}`} />
        </div>

        {/* Row 2: Sozlamalar (Dark Blue Squircle) */}
        <div
          onClick={() => toggleModal('settings')}
          className={`card-row flex items-center justify-between p-4 cursor-pointer transition-colors border-b ${
            isLight ? 'border-black/[0.06]' : 'border-white/[0.04]'
          } ${
            isDesktop && isSettingsOpen
              ? isLight ? 'bg-blue-50/70 ring-1 ring-blue-500/40' : 'bg-white/[0.08] ring-1 ring-blue-500/50'
              : isLight ? 'hover:bg-black/[0.02]' : 'hover:bg-white/[0.03]'
          }`}
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/15 border border-blue-500/30 flex items-center justify-center text-blue-500">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <span className={`font-bold text-sm block ${isLight ? 'text-[#1C1C1E]' : 'text-white'}`}>{t('sozlamalar')}</span>
            </div>
          </div>
          <ChevronRight className={`w-5 h-5 transition-transform ${isDesktop && isSettingsOpen ? 'text-blue-500 translate-x-1' : 'text-[#8E8E93]'}`} />
        </div>

        {/* Row 3: Aloqa va yordam (Dark Blue Squircle) */}
        <div
          onClick={() => toggleModal('support')}
          className={`card-row flex items-center justify-between p-4 cursor-pointer transition-colors border-b ${
            isLight ? 'border-black/[0.06]' : 'border-white/[0.04]'
          } ${
            isDesktop && isSupportOpen
              ? isLight ? 'bg-emerald-50/70 ring-1 ring-emerald-500/40' : 'bg-white/[0.08] ring-1 ring-emerald-500/50'
              : isLight ? 'hover:bg-black/[0.02]' : 'hover:bg-white/[0.03]'
          }`}
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/15 border border-blue-500/30 flex items-center justify-center text-blue-500">
              <Headphones className="w-5 h-5" />
            </div>
            <div>
              <span className={`font-bold text-sm block ${isLight ? 'text-[#1C1C1E]' : 'text-white'}`}>
                {lang === 'ru' ? 'Связь и помощь' : 'Aloqa va yordam'}
              </span>
            </div>
          </div>
          <ChevronRight className={`w-5 h-5 transition-transform ${isDesktop && isSupportOpen ? 'text-emerald-500 translate-x-1' : 'text-[#8E8E93]'}`} />
        </div>

        {/* Row 4: Telegram Kanal (Dark Blue Squircle + Official Telegram Logo) */}
        <div
          onClick={handleOpenChannel}
          className={`card-row flex items-center justify-between p-4 cursor-pointer transition-colors border-b ${
            isLight ? 'border-black/[0.06] hover:bg-black/[0.02]' : 'border-white/[0.04] hover:bg-white/[0.03]'
          }`}
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/15 border border-blue-500/30 flex items-center justify-center text-blue-500">
              <TelegramIcon className="w-5 h-5" />
            </div>
            <div>
              <span className={`font-bold text-sm block ${isLight ? 'text-[#1C1C1E]' : 'text-white'}`}>
                {lang === 'ru' ? 'Официальный канал' : 'Rasmiy kanal'}
              </span>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-[#8E8E93]" />
        </div>

        {/* Row 5: Rasmiy sayt (Dark Blue Squircle) */}
        <div
          onClick={handleOpenWebsite}
          className={`card-row flex items-center justify-between p-4 cursor-pointer transition-colors ${
            isLight ? 'hover:bg-black/[0.02]' : 'hover:bg-white/[0.03]'
          }`}
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/15 border border-blue-500/30 flex items-center justify-center text-blue-500">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <span className={`font-bold text-sm block ${isLight ? 'text-[#1C1C1E]' : 'text-white'}`}>
                {lang === 'ru' ? 'Официальный сайт' : 'Rasmiy sayt'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className={`text-xs text-[#8E8E93] font-mono whitespace-nowrap ${
              isDesktop && isAnyModalOpen ? 'hidden xl:inline' : 'hidden sm:inline'
            }`}>
              {officialWebsite.replace(/^https?:\/\//, '')}
            </span>
            <ChevronRight className="w-5 h-5 text-[#8E8E93]" />
          </div>
        </div>

      </div>

      </div>

      {/* Desktop In-Flow Detail Panel (smoothly expands/collapses width; padded inset prevents corner shadow clipping) */}
      {isDesktop && (
        <AnimatePresence initial={false}>
          {isAnyModalOpen && (
            <motion.div
              key="desktop-detail-panel"
              initial={{ width: 0, marginLeft: 0, opacity: 0 }}
              animate={{ width: 444, marginLeft: 12, opacity: 1 }}
              exit={{ width: 0, marginLeft: 0, opacity: 0 }}
              transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
              className="shrink-0 overflow-hidden px-3 py-4 -my-4 -mr-3"
            >
              <div className="w-[420px] min-w-[420px]">
                <AnimatePresence mode="wait" initial={false}>
                  {isSettingsOpen && (
                    <SettingsModal
                      key="settings"
                      isOpen={isSettingsOpen}
                      onClose={() => setIsSettingsOpen(false)}
                      inlineDesktop={true}
                    />
                  )}
                  {isSupportOpen && (
                    <SupportModal
                      key="support"
                      isOpen={isSupportOpen}
                      onClose={() => setIsSupportOpen(false)}
                      inlineDesktop={true}
                    />
                  )}
                  {isTopUpOpen && (
                    <TopUpModal
                      key="topup"
                      isOpen={isTopUpOpen}
                      onClose={() => setIsTopUpOpen(false)}
                      user={user}
                      onUpdateUser={onUpdateUser}
                      inlineDesktop={true}
                    />
                  )}
                  {isEditProfileOpen && (
                    <Profile
                      key="edit-profile"
                      user={user}
                      isOpen={isEditProfileOpen}
                      onClose={() => {
                        setPreviewProfileColor(null);
                        setIsEditProfileOpen(false);
                      }}
                      onUpdateUser={onUpdateUser}
                      onPreviewColor={setPreviewProfileColor}
                      inlineDesktop={true}
                    />
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      </div>

      {/* Always-Centered Footer Branding across single and dual-column layouts */}
      <p
        data-testid="profile-footer"
        className="w-full text-center text-[11px] text-[#8E8E93]/50 pt-6 pb-4 tracking-wider"
      >
        Rashidov School &nbsp;&bull;&nbsp; since 2023
      </p>

      {/* Mobile Modals (Fullscreen overlay on mobile) */}
      {!isDesktop && (
        <>
          <Profile
            user={user}
            isOpen={isEditProfileOpen}
            onClose={() => {
              setPreviewProfileColor(null);
              setIsEditProfileOpen(false);
            }}
            onUpdateUser={onUpdateUser}
            onPreviewColor={setPreviewProfileColor}
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

    </motion.div>
  );
}
