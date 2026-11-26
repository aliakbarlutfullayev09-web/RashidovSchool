import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Phone, Headphones, Dna, FlaskConical, Settings, X 
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { useHaptic } from '../hooks/useHaptic';
import { useIsDesktop } from '../hooks/useIsDesktop';
import { getSupportContacts, getCachedSupportContacts, DEFAULT_SUPPORT_CONTACTS } from '../api/supabase';

// Telegram official paper plane SVG logo
const TelegramIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.75-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
  </svg>
);

export default function SupportModal({ isOpen, onClose, inlineDesktop = false }) {
  const { lang, t } = useLanguage();
  const { resolvedTheme } = useTheme();
  const { impactLight, impactMedium } = useHaptic();
  const isDesktop = useIsDesktop();

  const isLight = resolvedTheme === 'light';

  const [contacts, setContacts] = useState(() => getCachedSupportContacts());
  const [loading, setLoading] = useState(() => !getCachedSupportContacts());

  // Fetch fresh support contacts from Supabase without flashing stub defaults
  useEffect(() => {
    if (!isOpen) return;
    let mounted = true;

    const cached = getCachedSupportContacts();
    if (cached) {
      setContacts(cached);
      setLoading(false);
    }

    async function loadContacts() {
      try {
        const data = await getSupportContacts();
        if (mounted && data) {
          setContacts(data);
        }
      } catch (e) {
        console.warn('Error loading support contacts:', e);
        if (mounted && !getCachedSupportContacts()) {
          setContacts(DEFAULT_SUPPORT_CONTACTS);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadContacts();
    return () => { mounted = false; };
  }, [isOpen]);

  // Native Telegram WebApp BackButton coordination & title sync
  useEffect(() => {
    if (!isOpen) return;

    const prevTitle = document.title;
    document.title = lang === 'ru' ? 'Связь и помощь' : 'Aloqa va yordam';

    const tg = window.Telegram?.WebApp;
    if (tg?.BackButton) {
      const handleBack = () => {
        onClose();
      };

      try {
        tg.BackButton.show();
        tg.BackButton.onClick(handleBack);
      } catch (e) {
        console.warn('BackButton error in SupportModal:', e);
      }

      return () => {
        document.title = prevTitle;
        try {
          tg.BackButton.offClick(handleBack);
          tg.BackButton.hide();
        } catch {}
      };
    }

    return () => {
      document.title = prevTitle;
    };
  }, [isOpen, onClose, lang]);

  // Keyboard Escape listener
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleOpenTelegram = (usernameOrLink) => {
    impactMedium();
    if (!usernameOrLink) return;

    let clean = usernameOrLink.trim();
    let url = clean;
    if (clean.startsWith('@')) {
      url = `https://t.me/${clean.substring(1)}`;
    } else if (!clean.startsWith('http')) {
      url = `https://t.me/${clean}`;
    }

    const tg = window.Telegram?.WebApp;
    if (tg?.openTelegramLink) {
      tg.openTelegramLink(url);
    } else {
      window.open(url, '_blank');
    }
  };

  const handleCallPhone = (phone) => {
    impactMedium();
    if (!phone) return;
    const cleanNumber = phone.replace(/[^0-9+]/g, '');
    window.location.href = `tel:${cleanNumber}`;
  };

  const safeContacts = contacts || DEFAULT_SUPPORT_CONTACTS;

  const categories = [
    {
      id: 'bio',
      title: lang === 'ru' ? 'Вопросы по биологии' : 'Biologiya bo‘yicha savollar',
      icon: <Dna className="w-4 h-4 text-emerald-400" />,
      iconBg: 'bg-emerald-500/15 border-emerald-500/25',
      data: safeContacts.bio || DEFAULT_SUPPORT_CONTACTS.bio
    },
    {
      id: 'chem',
      title: lang === 'ru' ? 'Вопросы по химии' : 'Kimyo bo‘yicha savollar',
      icon: <FlaskConical className="w-4 h-4 text-purple-400" />,
      iconBg: 'bg-purple-500/15 border-purple-500/25',
      data: safeContacts.chem || DEFAULT_SUPPORT_CONTACTS.chem
    },
    {
      id: 'tech',
      title: lang === 'ru' ? 'Техническая поддержка' : 'Texnik va boshqa masalalar',
      icon: <Settings className="w-4 h-4 text-blue-400" />,
      iconBg: 'bg-blue-500/15 border-blue-500/25',
      data: safeContacts.tech || DEFAULT_SUPPORT_CONTACTS.tech
    }
  ];

  const modalContent = (
    <motion.div
      initial={isDesktop && inlineDesktop ? { opacity: 0 } : { opacity: 0, scale: 0.98, x: isDesktop ? 15 : 0 }}
      animate={isDesktop && inlineDesktop ? { opacity: 1 } : { opacity: 1, scale: 1, x: 0 }}
      exit={isDesktop && inlineDesktop ? { opacity: 0 } : { opacity: 0, scale: 0.98, x: isDesktop ? 15 : 0 }}
      transition={{ duration: 0.18 }}
      className={`${
        isDesktop && inlineDesktop
          ? 'w-full rounded-[32px] border border-white/10 shadow-2xl overflow-hidden flex flex-col select-none'
          : isDesktop
          ? 'fixed z-10 flex flex-col select-none pointer-events-auto right-10 top-1/2 -translate-y-1/2 w-[420px] max-w-[420px] h-[min(720px,calc(100vh-60px))] rounded-[32px] border border-white/10 shadow-2xl overflow-hidden'
          : 'fixed inset-0 z-10 flex flex-col select-none pointer-events-auto'
      } ${
        isLight 
          ? 'bg-[#F2F2F7] text-gray-900 border-black/10' 
          : 'bg-[#121214] text-white'
      }`}
    >
          {/* Header with centered title between Telegram's back and menu controls */}
          <div 
            className={`relative px-4 pb-3 flex items-center justify-center border-b ${
              isLight ? 'border-black/5 bg-white/80' : 'border-white/5 bg-[#121214]/80'
            } backdrop-blur-xl shrink-0`}
            style={{
              paddingTop: isDesktop ? '16px' : 'max(calc(var(--safe-area-top, 0px) + 6px), 12px)'
            }}
          >
            {/* Centered Title */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-400 font-bold shrink-0">
                <Headphones className="w-4 h-4 text-emerald-400" />
              </div>
              <h3 className="font-extrabold text-base leading-tight text-center">
                {lang === 'ru' ? 'Связь и помощь' : 'Aloqa va yordam'}
              </h3>
            </div>

            {/* Close Button (Desktop and Mobile Web browsers) */}
            {(isDesktop || (typeof window !== 'undefined' && !window.Telegram?.WebApp?.initData)) && (
              <button
                type="button"
                onClick={onClose}
                aria-label={lang === 'ru' ? 'Закрыть' : 'Yopish'}
                className={`absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                  isLight
                    ? 'bg-black/5 hover:bg-black/10 text-gray-700'
                    : 'bg-white/10 hover:bg-white/20 text-white/80 hover:text-white'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

        {/* Scrollable Compact Cards Content (unified page scroll when inlineDesktop) */}
        <div 
          className={isDesktop && inlineDesktop ? 'p-4 space-y-3' : 'flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar'}
          style={{
            paddingBottom: isDesktop && inlineDesktop ? '20px' : 'max(calc(var(--safe-area-bottom, 0px) + 24px), 32px)'
          }}
        >
          {loading && !contacts ? (
            [0, 1, 2].map((skeletonIdx) => (
              <div
                key={skeletonIdx}
                className={`p-3.5 rounded-2xl border animate-pulse ${
                  isLight ? 'bg-white border-black/5 shadow-sm' : 'bg-[#1C1C1E] border-white/5 shadow-md'
                }`}
              >
                <div className="flex items-center gap-2.5 mb-2.5">
                  <div className={`w-8 h-8 rounded-xl ${isLight ? 'bg-gray-200' : 'bg-white/10'}`} />
                  <div className={`h-4 w-40 rounded-lg ${isLight ? 'bg-gray-200' : 'bg-white/10'}`} />
                </div>
                <div className="flex items-center gap-2">
                  <div className={`flex-1 h-9 rounded-xl ${isLight ? 'bg-gray-100' : 'bg-white/5'}`} />
                  <div className={`w-28 h-9 rounded-xl ${isLight ? 'bg-gray-100' : 'bg-white/5'}`} />
                </div>
              </div>
            ))
          ) : (
            categories.map((cat) => {
            const tgHandle = cat.data?.telegram || '@rashidov_support';
            const phoneNum = cat.data?.phone || '+998 71 200 00 00';

            return (
              <div
                key={cat.id}
                className={`p-3.5 rounded-2xl border transition-all ${
                  isLight 
                    ? 'bg-white border-black/5 shadow-sm' 
                    : 'bg-[#1C1C1E] border-white/5 shadow-md'
                }`}
              >
                {/* Compact Header: SVG Icon + Title */}
                <div className="flex items-center gap-2.5 mb-2.5">
                  <div className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 ${cat.iconBg}`}>
                    {cat.icon}
                  </div>
                  <h4 className={`font-bold text-sm leading-tight ${isLight ? 'text-[#1C1C1E]' : 'text-white/95'}`}>
                    {cat.title}
                  </h4>
                </div>

                {/* Action Buttons Row: Qo'ng'iroq (Phone number) + Telegram */}
                <div className="flex items-center gap-2">
                  
                  {/* Phone Call Button (Displays phone number directly) */}
                  <button
                    onClick={() => handleCallPhone(phoneNum)}
                    className={`flex-1 py-2.5 px-3 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 flex items-center justify-center gap-2 font-bold text-xs active:scale-[0.98] transition-all min-w-0 ${
                      isLight ? 'text-emerald-700' : 'text-emerald-400'
                    }`}
                    title={phoneNum}
                  >
                    <Phone className="w-3.5 h-3.5 shrink-0" />
                    <span className="font-mono text-[11px] sm:text-xs truncate">{phoneNum}</span>
                  </button>

                  {/* Telegram Button with TG Logo and "Telegram" */}
                  <button
                    onClick={() => handleOpenTelegram(tgHandle)}
                    className="py-2.5 px-4 rounded-xl bg-[#229ED9]/15 hover:bg-[#229ED9]/25 border border-[#229ED9]/30 flex items-center justify-center gap-2 text-[#229ED9] active:scale-[0.98] transition-all group shrink-0"
                  >
                    <TelegramIcon className="w-4 h-4 shrink-0 text-[#229ED9]" />
                    <span className="font-bold text-xs shrink-0">Telegram</span>
                  </button>

                </div>
              </div>
            );
            })
          )}
        </div>
      </motion.div>
  );

  if (isDesktop && inlineDesktop) {
    return modalContent;
  }

  return (
    <AnimatePresence>
      <div className={`fixed inset-0 z-[120] ${isDesktop ? 'pointer-events-auto' : 'pointer-events-none'}`}>
        {isDesktop && (
          <div 
            onClick={onClose} 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto transition-opacity" 
          />
        )}
        {modalContent}
      </div>
    </AnimatePresence>
  );
}
