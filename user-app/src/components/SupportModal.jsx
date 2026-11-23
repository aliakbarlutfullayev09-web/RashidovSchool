import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Send, Phone, MessageSquare, Headphones, 
  ExternalLink, Check, Copy, Sparkles, HelpCircle 
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { useHaptic } from '../hooks/useHaptic';
import { getSupportContacts, DEFAULT_SUPPORT_CONTACTS } from '../api/supabase';

export default function SupportModal({ isOpen, onClose }) {
  const { lang, t } = useLanguage();
  const { resolvedTheme } = useTheme();
  const { impactLight, impactMedium } = useHaptic();

  const isLight = resolvedTheme === 'light';

  const [contacts, setContacts] = useState(DEFAULT_SUPPORT_CONTACTS);
  const [loading, setLoading] = useState(true);
  const [copiedKey, setCopiedKey] = useState(null);

  // Fetch support contacts from Supabase
  useEffect(() => {
    if (!isOpen) return;
    let mounted = true;

    async function loadContacts() {
      try {
        const data = await getSupportContacts();
        if (mounted && data) {
          setContacts(data);
        }
      } catch (e) {
        console.warn('Error loading support contacts:', e);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadContacts();
    return () => { mounted = false; };
  }, [isOpen]);

  // Native Telegram WebApp BackButton coordination
  useEffect(() => {
    if (!isOpen) return;

    const tg = window.Telegram?.WebApp;
    if (tg?.BackButton && tg.isVersionAtLeast && tg.isVersionAtLeast('6.1')) {
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
        try {
          tg.BackButton.offClick(handleBack);
        } catch {}
      };
    }
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

  const handleCopy = (text, key) => {
    impactLight();
    navigator.clipboard?.writeText(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey(null);
    }, 1800);
  };

  const categories = [
    {
      id: 'bio',
      title: lang === 'ru' ? 'Вопросы по биологии' : 'Biologiya bo‘yicha savollar',
      desc: lang === 'ru' ? 'Уроки, темы, тесты и олимпиадные задания' : 'Mavzular, darslar va biologiya testlari bo‘yicha',
      icon: '🧬',
      badgeColor: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30',
      data: contacts.bio || DEFAULT_SUPPORT_CONTACTS.bio
    },
    {
      id: 'chem',
      title: lang === 'ru' ? 'Вопросы по химии' : 'Kimyo bo‘yicha savollar',
      desc: lang === 'ru' ? 'Задачи, химические реакции и сложные тесты' : 'Kimyo darslari, masalalar va tushunarsiz testlar',
      icon: '🧪',
      badgeColor: 'text-purple-400 bg-purple-500/15 border-purple-500/30',
      data: contacts.chem || DEFAULT_SUPPORT_CONTACTS.chem
    },
    {
      id: 'tech',
      title: lang === 'ru' ? 'Техническая поддержка' : 'Texnik va boshqa masalalar',
      desc: lang === 'ru' ? 'Работа приложения, баланс, Stars и доступ' : 'Ilova ishlashi, to‘lovlar va hisob masalalari',
      icon: '⚙️',
      badgeColor: 'text-blue-400 bg-blue-500/15 border-blue-500/30',
      data: contacts.tech || DEFAULT_SUPPORT_CONTACTS.tech
    }
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md">
        
        {/* Backdrop dismiss */}
        <div 
          onClick={onClose} 
          className="absolute inset-0 z-0" 
          aria-label="Backdrop"
        />

        {/* Modal Sheet Container */}
        <motion.div
          initial={{ opacity: 0, y: 80, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 80, scale: 0.98 }}
          transition={{ type: 'spring', damping: 26, stiffness: 320 }}
          className={`relative z-10 w-full max-w-lg rounded-t-[32px] sm:rounded-[32px] max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border ${
            isLight 
              ? 'bg-[#F2F2F7] text-gray-900 border-black/10' 
              : 'bg-[#1C1C1E] text-white border-white/10'
          }`}
        >
          {/* Top iOS Grabber Bar */}
          <div className="pt-3 pb-1 flex justify-center sm:hidden">
            <div className={`w-10 h-1.5 rounded-full ${isLight ? 'bg-black/20' : 'bg-white/20'}`} />
          </div>

          {/* Mini App System Navigation Header */}
          <div className={`px-5 py-3.5 flex items-center justify-between border-b ${
            isLight ? 'border-black/5 bg-white/70' : 'border-white/5 bg-[#161618]/70'
          } backdrop-blur-md`}>
            
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-400 font-bold text-lg">
                <Headphones className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h3 className="font-extrabold text-base leading-tight">
                  {lang === 'ru' ? 'Связь и помощь' : 'Aloqa va yordam'}
                </h3>
                <span className={`text-[11px] ${isLight ? 'text-gray-500' : 'text-[#8E8E93]'}`}>
                  Rashidov EdTech • Mentorlar va texnik xizmat
                </span>
              </div>
            </div>

            {/* Telegram Mini App System Close Button */}
            <button
              onClick={() => {
                impactLight();
                onClose();
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 ${
                isLight 
                  ? 'bg-black/5 hover:bg-black/10 text-gray-700' 
                  : 'bg-white/10 hover:bg-white/15 text-white/90'
              }`}
              title={t('yopish')}
            >
              <span>{t('yopish')}</span>
              <X className="w-4 h-4 ml-0.5" />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 no-scrollbar">
            
            <p className={`text-xs px-1 ${isLight ? 'text-gray-600' : 'text-[#8E8E93]'}`}>
              {lang === 'ru'
                ? 'Выберите подходящую категорию для связи с профильным преподавателем или технической поддержкой:'
                : 'Savolingiz mavzusiga mos bo‘limni tanlang va to‘g‘ridan-to‘g‘ri mentor yoki texnik xizmatga murojaat qiling:'}
            </p>

            {categories.map((cat) => {
              const tgHandle = cat.data?.telegram || '@rashidov_support';
              const phoneNum = cat.data?.phone || '+998 71 200 00 00';
              const isTgCopied = copiedKey === `${cat.id}-tg`;
              const isPhoneCopied = copiedKey === `${cat.id}-phone`;

              return (
                <div
                  key={cat.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    isLight 
                      ? 'bg-white border-black/5 shadow-sm' 
                      : 'bg-[#2C2C2E] border-white/5'
                  }`}
                >
                  {/* Category Header */}
                  <div className="flex items-start gap-3 mb-3.5">
                    <div className="text-2xl p-2 rounded-xl bg-black/10 flex items-center justify-center">
                      {cat.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-sm leading-tight flex items-center gap-2">
                        <span>{cat.title}</span>
                      </h4>
                      <p className={`text-[11px] mt-0.5 leading-snug ${isLight ? 'text-gray-500' : 'text-[#8E8E93]'}`}>
                        {cat.desc}
                      </p>
                    </div>
                  </div>

                  {/* Action Buttons Grid: Telegram + Phone */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    
                    {/* Telegram Button */}
                    <button
                      onClick={() => handleOpenTelegram(tgHandle)}
                      className="py-2.5 px-3 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 flex items-center justify-between text-sky-400 font-bold text-xs active:scale-[0.98] transition-all group"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Send className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">{tgHandle}</span>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 flex-shrink-0 ml-1" />
                    </button>

                    {/* Phone Call Button */}
                    <button
                      onClick={() => handleCallPhone(phoneNum)}
                      className="py-2.5 px-3 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 flex items-center justify-between text-emerald-400 font-bold text-xs active:scale-[0.98] transition-all group"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Phone className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">{phoneNum}</span>
                      </div>
                      <span className="text-[10px] uppercase tracking-wide opacity-80 flex-shrink-0 ml-1">
                        {lang === 'ru' ? 'Вызов' : 'Qo‘ng‘iroq'}
                      </span>
                    </button>

                  </div>
                </div>
              );
            })}

            {/* Note banner */}
            <div className={`p-3.5 rounded-2xl border text-center ${
              isLight ? 'bg-blue-500/5 border-blue-500/15' : 'bg-blue-500/10 border-blue-500/20'
            }`}>
              <div className="flex items-center justify-center gap-1.5 text-blue-400 font-bold text-xs mb-0.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{lang === 'ru' ? 'Режим работы поддержки' : 'Yordam xizmati tartibi'}</span>
              </div>
              <p className={`text-[11px] ${isLight ? 'text-gray-500' : 'text-[#8E8E93]'}`}>
                {lang === 'ru' 
                  ? 'Преподаватели и операторы отвечают ежедневно с 09:00 до 21:00' 
                  : 'Ustozlar va operatorlar har kuni soat 09:00 dan 21:00 gacha xizmatda'}
              </p>
            </div>

          </div>

          {/* Mini App System Close Button Footer */}
          <div className={`p-4 border-t ${
            isLight ? 'border-black/5 bg-white/70' : 'border-white/5 bg-[#161618]/70'
          } backdrop-blur-md`}>
            <button
              onClick={() => {
                impactLight();
                onClose();
              }}
              className="w-full py-3.5 px-4 rounded-2xl bg-[#007AFF] hover:bg-[#0062CC] active:scale-[0.98] text-white font-bold text-sm shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition-all"
            >
              <Check className="w-4 h-4" />
              <span>{t('yopish')}</span>
            </button>
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
}
