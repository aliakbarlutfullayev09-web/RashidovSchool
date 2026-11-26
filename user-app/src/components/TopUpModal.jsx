import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Wallet, Ticket, Gift, Clock, Loader2, CheckCircle2, AlertCircle
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { useHaptic } from '../hooks/useHaptic';
import { useIsDesktop } from '../hooks/useIsDesktop';
import { applyPromoCode, createStarsInvoiceLink, getUserData } from '../api/supabase';

const STARS_PACKAGES = [
  { stars: 5, neyrons: 1250 },
  { stars: 100, neyrons: 25000 },
  { stars: 400, neyrons: 100000 },
  { stars: 600, neyrons: 150000 },
  { stars: 1000, neyrons: 250000 },
  { stars: 3500, neyrons: 1000000, hit: true }
];

// Crisp SVG Neuron / Brain icon (replaces brain emoji)
const NeuronSvgIcon = ({ className = "w-7 h-7" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-1.54" />
    <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-1.54" />
  </svg>
);

// Authentic rounded Telegram Star SVG icon (replaces star emoji)
const TelegramStarIcon = ({ className = "w-3.5 h-3.5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12.001 2.5c.63 0 1.21.35 1.5.91l2.12 4.11 4.55.73c.62.1 1.13.53 1.32 1.13.19.6.02 1.25-.44 1.68l-3.25 3.24.71 4.55c.1.62-.16 1.24-.67 1.61-.51.37-1.18.42-1.74.13L12 18.48l-4.1 2.11c-.56.29-1.23.24-1.74-.13a1.69 1.69 0 0 1-.67-1.61l.71-4.55-3.25-3.24a1.68 1.68 0 0 1-.44-1.68c.19-.6.7-1.03 1.32-1.13l4.55-.73 2.12-4.11c.29-.56.87-.91 1.5-.91z" />
  </svg>
);

export default function TopUpModal({ isOpen, onClose, user, onUpdateUser, inlineDesktop = false }) {
  const { lang } = useLanguage();
  const { resolvedTheme } = useTheme();
  const { selectionChanged, notificationSuccess, notificationError, impactMedium } = useHaptic();
  const isDesktop = useIsDesktop();
  const isLight = resolvedTheme === 'light';

  const [activeTab, setActiveTab] = useState('stars'); // 'stars' | 'promo' | 'quests'

  // Stars invoice state
  const [buyingStars, setBuyingStars] = useState(null);
  const [starsFeedback, setStarsFeedback] = useState(null);

  // Promo state
  const [promoInput, setPromoInput] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoMessage, setPromoMessage] = useState(null);

  // Native Telegram WebApp BackButton coordination & title sync (matches SettingsModal & SupportModal)
  useEffect(() => {
    if (!isOpen) return;

    const prevTitle = document.title;
    document.title = lang === 'ru' ? 'Баланс' : 'Balans';

    const tg = window.Telegram?.WebApp;
    if (tg?.BackButton) {
      const handleTelegramBack = () => {
        onClose();
      };

      try {
        tg.BackButton.show();
        tg.BackButton.onClick(handleTelegramBack);
      } catch (e) {
        console.warn('Telegram BackButton attach error in TopUpModal:', e);
      }

      return () => {
        document.title = prevTitle;
        try {
          tg.BackButton.offClick(handleTelegramBack);
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
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleTabSwitch = (tab) => {
    if (tab !== activeTab) {
      selectionChanged();
      setActiveTab(tab);
      setStarsFeedback(null);
    }
  };

  const refreshBalanceAfterPayment = async (creditedNeurons) => {
    if (!user?.telegram_id) return;
    const initialBalance = Number(user?.balance || 0);

    // Poll briefly so webhook update from bot/handlers/payments.py reflects right away
    for (let attempt = 0; attempt < 3; attempt++) {
      await new Promise((r) => setTimeout(r, 450));
      try {
        const { data } = await getUserData(user.telegram_id);
        if (data && Number(data.balance) > initialBalance) {
          if (onUpdateUser) onUpdateUser({ ...user, ...data });
          return;
        }
      } catch {}
    }

    if (onUpdateUser) {
      onUpdateUser({ ...user, balance: initialBalance + creditedNeurons });
    }
  };

  const handleBuyStars = async (pkg) => {
    if (buyingStars !== null) return;
    impactMedium();
    setStarsFeedback(null);
    setBuyingStars(pkg.stars);

    try {
      const tg = window.Telegram?.WebApp;
      if (!tg || typeof tg.openInvoice !== 'function') {
        notificationError();
        setStarsFeedback({
          type: 'error',
          text: lang === 'ru'
            ? 'Оплата через Telegram Stars доступна внутри приложения Telegram.'
            : "Telegram Stars orqali to'lov faqat Telegram ilovasi ichida ishlaydi."
        });
        setBuyingStars(null);
        return;
      }

      const res = await createStarsInvoiceLink(pkg.stars, user?.telegram_id);
      if (!res?.ok || !res?.invoiceUrl) {
        notificationError();
        setStarsFeedback({
          type: 'error',
          text: res?.code === 'BOT_TOKEN_MISSING'
            ? (lang === 'ru'
                ? 'Счёт на оплату не настроен (отсутствует BOT_TOKEN на сервере).'
                : "To'lov schyotini yaratish uchun serverda BOT_TOKEN sozlanmagan.")
            : (res?.error || (lang === 'ru'
                ? 'Не удалось открыть счёт на оплату. Попробуйте позже.'
                : "To'lov schyotini ochib bo'lmadi. Keyinroq urinib ko'ring."))
        });
        setBuyingStars(null);
        return;
      }

      tg.openInvoice(res.invoiceUrl, async (status) => {
        setBuyingStars(null);
        if (status === 'paid') {
          notificationSuccess();
          setStarsFeedback({
            type: 'success',
            text: lang === 'ru'
              ? `+${pkg.neyrons.toLocaleString('ru-RU')} Нейронов зачислено!`
              : `+${pkg.neyrons.toLocaleString('ru-RU')} Neyron hisobingizga qo'shildi!`
          });
          await refreshBalanceAfterPayment(pkg.neyrons);
        } else if (status === 'failed') {
          notificationError();
          setStarsFeedback({
            type: 'error',
            text: lang === 'ru'
              ? 'Оплата не прошла. Попробуйте ещё раз.'
              : "To'lov amalga oshmadi. Qayta urinib ko'ring."
          });
        }
      });
    } catch (err) {
      notificationError();
      setStarsFeedback({
        type: 'error',
        text: err?.message || (lang === 'ru' ? 'Ошибка соединения' : 'Aloqa xatosi')
      });
      setBuyingStars(null);
    }
  };

  const handleApplyPromo = async () => {
    if (!promoInput.trim()) return;
    setPromoLoading(true);
    setPromoMessage(null);
    impactMedium();

    try {
      const res = await applyPromoCode(user?.telegram_id, promoInput.trim(), lang);
      if (res.success) {
        notificationSuccess();
        const unitLabel = lang === 'ru' ? 'Нейронов' : 'Neyron';
        const addedMsg = lang === 'ru'
          ? `+${res.bonus} ${unitLabel} зачислено!`
          : `+${res.bonus} ${unitLabel} qo'shildi!`;
        setPromoMessage({ type: 'success', text: res.message || addedMsg });
        if (onUpdateUser && res.bonus) {
          onUpdateUser({ ...user, balance: (user.balance || 0) + res.bonus });
        }
        setPromoInput('');
      } else {
        notificationError();
        setPromoMessage({
          type: 'error',
          text: res.message || (lang === 'ru' ? 'Неверный промокод' : 'Xato promo-kod')
        });
      }
    } catch (err) {
      notificationError();
      setPromoMessage({
        type: 'error',
        text: lang === 'ru' ? 'Ошибка соединения с сервером' : 'Server bilan aloqa uzildi'
      });
    } finally {
      setPromoLoading(false);
    }
  };

  const modalContent = (
    <motion.div
      initial={isDesktop && inlineDesktop ? { opacity: 0 } : { opacity: 0, scale: 0.98, x: isDesktop ? 15 : 0 }}
      animate={isDesktop && inlineDesktop ? { opacity: 1 } : { opacity: 1, scale: 1, x: 0 }}
      exit={isDesktop && inlineDesktop ? { opacity: 0 } : { opacity: 0, scale: 0.98, x: isDesktop ? 15 : 0 }}
      transition={{ duration: 0.18 }}
      className={`${
        isDesktop && inlineDesktop
          ? 'w-full rounded-[32px] border shadow-2xl overflow-hidden flex flex-col select-none'
          : isDesktop
          ? 'fixed z-10 flex flex-col select-none pointer-events-auto right-10 top-1/2 -translate-y-1/2 w-[420px] max-w-[420px] h-[min(720px,calc(100vh-60px))] rounded-[32px] border shadow-2xl overflow-hidden'
          : 'fixed inset-0 z-10 flex flex-col select-none pointer-events-auto'
      } ${
        isLight
          ? 'bg-[#F2F2F7] text-gray-900 border-black/10'
          : 'bg-[#121214] text-white border-white/10'
      }`}
    >
      {/* Header matching SettingsModal & SupportModal (centered between Telegram native controls on mobile) */}
      <div
        className={`relative px-4 pb-3 flex items-center justify-center border-b ${
          isLight ? 'border-black/5 bg-white/80' : 'border-white/5 bg-[#121214]/80'
        } backdrop-blur-xl shrink-0`}
        style={{
          paddingTop: isDesktop ? '16px' : 'max(calc(var(--safe-area-top, 0px) + 6px), 12px)'
        }}
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-500/15 border border-blue-500/25 flex items-center justify-center text-blue-400 font-bold shrink-0">
            <Wallet className="w-4 h-4 text-blue-400" />
          </div>
          <h3 className="font-extrabold text-base leading-tight text-center">
            {lang === 'ru' ? 'Баланс' : 'Balans'}
          </h3>
        </div>

        {/* Close Button (Desktop and Mobile Web; Telegram native BackButton handles inside Mini App) */}
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

      {/* Scrollable Compact Body (unified page scroll when inlineDesktop) */}
      <div
        className={isDesktop && inlineDesktop ? 'p-4 space-y-4' : 'flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar'}
        style={{
          paddingBottom: isDesktop && inlineDesktop ? '20px' : 'max(calc(var(--safe-area-bottom, 0px) + 24px), 32px)'
        }}
      >
        {/* Top Balance Overview & Tabs Card */}
        <div className={`p-4 rounded-2xl border flex flex-col items-center ${
          isLight ? 'bg-white border-black/5 shadow-sm' : 'bg-[#1C1C1E] border-white/5 shadow-md'
        }`}>
          <div className="relative mb-2">
            <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full" />
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-blue-600/25 border border-blue-400/35 flex items-center justify-center text-blue-400 shadow-lg relative">
              <NeuronSvgIcon className="w-7 h-7" />
            </div>
          </div>

          <h4 className={`font-bold text-base text-center ${isLight ? 'text-gray-900' : 'text-white'}`}>
            {lang === 'ru' ? 'Пополнение нейронов' : 'Neyronlarni xarid qilish'}
          </h4>
          <p className={`text-xs text-center mt-0.5 ${isLight ? 'text-gray-500' : 'text-[#8E8E93]'}`}>
            {lang === 'ru' ? 'Баланс: ' : 'Balans: '}
            <span className="text-blue-500 font-bold">
              {user?.balance?.toLocaleString('ru-RU') || 0} {lang === 'ru' ? 'Нейронов' : 'Neyron'}
            </span>
          </p>

          {/* Segmented 3 Tabs with SVG Icons Only */}
          <div className={`grid grid-cols-3 gap-1.5 w-full p-1 rounded-2xl mt-4 ${
            isLight ? 'bg-gray-100' : 'bg-[#242426]'
          }`}>
            <button
              type="button"
              onClick={() => handleTabSwitch('stars')}
              className={`py-2 px-1 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'stars'
                  ? 'bg-[#007AFF] text-white shadow-md'
                  : isLight ? 'text-gray-500 hover:text-gray-900' : 'text-[#8E8E93] hover:text-white'
              }`}
            >
              <span>Stars</span>
              <TelegramStarIcon className={`w-3.5 h-3.5 shrink-0 ${activeTab === 'stars' ? 'text-amber-300' : 'text-amber-400'}`} />
            </button>

            <button
              type="button"
              onClick={() => handleTabSwitch('promo')}
              className={`py-2 px-1 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'promo'
                  ? 'bg-[#007AFF] text-white shadow-md'
                  : isLight ? 'text-gray-500 hover:text-gray-900' : 'text-[#8E8E93] hover:text-white'
              }`}
            >
              <span>{lang === 'ru' ? 'Промо' : 'Promo'}</span>
              <Ticket className="w-3.5 h-3.5 shrink-0" />
            </button>

            <button
              type="button"
              onClick={() => handleTabSwitch('quests')}
              className={`py-2 px-1 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'quests'
                  ? 'bg-[#007AFF] text-white shadow-md'
                  : isLight ? 'text-gray-500 hover:text-gray-900' : 'text-[#8E8E93] hover:text-white'
              }`}
            >
              <span>{lang === 'ru' ? 'Бесплатно' : 'Bepul'}</span>
              <Gift className="w-3.5 h-3.5 shrink-0" />
            </button>
          </div>
        </div>

        {/* TAB 1: TELEGRAM STARS */}
        {activeTab === 'stars' && (
          <div className="space-y-3">
            {starsFeedback && (
              <div className={`p-3 rounded-2xl text-xs font-semibold flex items-center gap-2 border ${
                starsFeedback.type === 'success'
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                  : 'bg-red-500/15 text-red-400 border-red-500/30'
              }`}>
                {starsFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                <span>{starsFeedback.text}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              {STARS_PACKAGES.map((pkg, idx) => {
                const isPkgLoading = buyingStars === pkg.stars;
                return (
                  <button
                    key={idx}
                    type="button"
                    disabled={buyingStars !== null}
                    onClick={() => handleBuyStars(pkg)}
                    className={`border p-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all active:scale-95 relative disabled:opacity-70 ${
                      isLight
                        ? 'bg-white hover:bg-gray-50 border-black/5 shadow-sm'
                        : 'bg-[#1C1C1E] hover:bg-[#242426] border-white/5 shadow-md'
                    }`}
                  >
                    {pkg.hit && (
                      <div className="absolute top-0 right-0 bg-red-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-bl-lg rounded-tr-2xl">
                        {lang === 'ru' ? 'ХИТ' : 'XIT'}
                      </div>
                    )}
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                      {isPkgLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
                      ) : (
                        <NeuronSvgIcon className="w-5 h-5" />
                      )}
                    </div>
                    <div className={`font-bold text-sm ${isLight ? 'text-gray-900' : 'text-white'}`}>
                      +{pkg.neyrons.toLocaleString('ru-RU')}
                    </div>
                    <div className={`bg-amber-500/15 border border-amber-500/30 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${
                      isLight ? 'text-amber-600' : 'text-amber-400'
                    }`}>
                      <span>{pkg.stars}</span>
                      <TelegramStarIcon className={`w-3.5 h-3.5 ${isLight ? 'text-amber-500' : 'text-amber-400'}`} />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: PROMO */}
        {activeTab === 'promo' && (
          <div className="space-y-4">
            <div className={`border p-5 rounded-2xl flex flex-col gap-3 ${
              isLight ? 'bg-white border-black/5 shadow-sm' : 'bg-[#1C1C1E] border-white/5 shadow-md'
            }`}>
              <label className={`text-xs ${isLight ? 'text-gray-500' : 'text-[#8E8E93]'}`}>
                {lang === 'ru' ? 'Введите промокод:' : 'Promo-kodni kiriting:'}
              </label>
              <input
                type="text"
                value={promoInput}
                onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                placeholder="BIO2026"
                className={`w-full border rounded-xl p-3.5 font-bold tracking-wider text-center text-lg outline-none focus:border-[#007AFF] ${
                  isLight
                    ? 'bg-gray-100 border-black/10 text-gray-900 placeholder-gray-400'
                    : 'bg-[#2C2C2E] border-white/10 text-white placeholder-[#636366]'
                }`}
              />

              {promoMessage && (
                <div className={`p-3 rounded-xl text-xs font-medium text-center ${
                  promoMessage.type === 'success'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-red-500/20 text-red-400 border border-red-500/30'
                }`}>
                  {promoMessage.text}
                </div>
              )}

              <button
                type="button"
                onClick={handleApplyPromo}
                disabled={promoLoading || !promoInput.trim()}
                className="w-full bg-[#007AFF] hover:bg-blue-600 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl transition-all active:scale-95"
              >
                {promoLoading
                  ? (lang === 'ru' ? 'Проверка...' : 'Tekshirilmoqda...')
                  : (lang === 'ru' ? 'Активировать' : 'Faollashtirish')}
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: BEPUL ("Tez kunlarda") */}
        {activeTab === 'quests' && (
          <div className={`border rounded-2xl py-14 px-6 flex flex-col items-center justify-center text-center ${
            isLight ? 'bg-white border-black/5 shadow-sm' : 'bg-[#1C1C1E] border-white/5 shadow-md'
          }`}>
            <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center mb-3 ${
              isLight
                ? 'bg-blue-500/10 border-blue-500/20 text-blue-500'
                : 'bg-white/5 border-white/10 text-[#8E8E93]'
            }`}>
              <Clock className="w-6 h-6" />
            </div>
            <p className={`text-sm font-semibold ${isLight ? 'text-gray-500' : 'text-[#8E8E93]'}`}>
              {lang === 'ru' ? 'Скоро' : 'Tez kunlarda'}
            </p>
          </div>
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
