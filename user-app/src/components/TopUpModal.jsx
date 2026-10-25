import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Copy, Sparkles, Star, CreditCard, Ticket, Gift, ExternalLink } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useHaptic } from '../hooks/useHaptic';
import { applyPromoCode } from '../api/supabase';

const CLICK_PACKAGES = [
  { neyrons: 25000, priceUzs: 25000, label: "25 000 UZS", discount: null },
  { neyrons: 65000, priceUzs: 56250, label: "56 250 UZS", discount: "-15%" },
  { neyrons: 150000, priceUzs: 112500, label: "112 500 UZS", discount: "-25%", popular: true },
  { neyrons: 1000000, priceUzs: 650000, label: "650 000 UZS", discount: "-35%" }
];

const STARS_PACKAGES = [
  { stars: 5, neyrons: 1250 },
  { stars: 100, neyrons: 25000 },
  { stars: 400, neyrons: 100000 },
  { stars: 600, neyrons: 150000 },
  { stars: 1000, neyrons: 250000 },
  { stars: 3500, neyrons: 1000000, hit: true }
];

const DAILY_QUESTS = [
  { id: 'quest_1', title: "1 ta darsni to'liq ko'rish", reward: 100, icon: "▶️", progress: "1/1", done: true },
  { id: 'quest_2', title: "Kanalga a'zo bo'lish", reward: 150, icon: "📢", progress: "0/1", done: false, link: "https://t.me/rashidov_biologiya" },
  { id: 'quest_3', title: "Do'stni taklif qilish", reward: 300, icon: "👥", progress: "0/1", done: false, action: "share" }
];

export default function TopUpModal({ isOpen, onClose, user, onUpdateUser }) {
  const { t, lang } = useLanguage();
  const { selectionChanged, notificationSuccess, notificationError, impactMedium } = useHaptic();
  const [activeTab, setActiveTab] = useState('click'); // 'click' | 'stars' | 'promo' | 'quests'

  // Promo state
  const [promoInput, setPromoInput] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoMessage, setPromoMessage] = useState(null);

  if (!isOpen) return null;

  const handleTabSwitch = (tab) => {
    if (tab !== activeTab) {
      selectionChanged();
      setActiveTab(tab);
    }
  };

  const handleBuyClick = (pkg) => {
    impactMedium();
    const link = lang === 'uz' ? 'https://t.me/m/LC4tlXF_NjRi' : 'https://t.me/m/nmt7omDSMjEy';
    if (window.Telegram?.WebApp?.openTelegramLink) {
      window.Telegram.WebApp.openTelegramLink(link);
    } else {
      window.open(link, '_blank');
    }
  };

  const handleBuyStars = (pkg) => {
    impactMedium();
    if (window.Telegram?.WebApp?.openTelegramLink) {
      window.Telegram.WebApp.openTelegramLink(`https://t.me/RashidovSchool_bot?start=buy_${pkg.stars}`);
    } else {
      alert(`Telegram Stars: ${pkg.stars} ⭐️`);
    }
  };

  const handleApplyPromo = async () => {
    if (!promoInput.trim()) return;
    setPromoLoading(true);
    setPromoMessage(null);
    impactMedium();

    try {
      const res = await applyPromoCode(user?.telegram_id, promoInput.trim());
      if (res.success) {
        notificationSuccess();
        setPromoMessage({ type: 'success', text: res.message || `+${res.bonus} Neyron qo'shildi!` });
        if (onUpdateUser && res.bonus) {
          onUpdateUser({ ...user, balance: (user.balance || 0) + res.bonus });
        }
        setPromoInput('');
      } else {
        notificationError();
        setPromoMessage({ type: 'error', text: res.message || 'Xato promo-kod' });
      }
    } catch (err) {
      notificationError();
      setPromoMessage({ type: 'error', text: 'Server bilan aloqa uzildi' });
    } finally {
      setPromoLoading(false);
    }
  };

  const handleQuestAction = (quest) => {
    impactMedium();
    if (quest.link) {
      if (window.Telegram?.WebApp?.openTelegramLink) {
        window.Telegram.WebApp.openTelegramLink(quest.link);
      } else {
        window.open(quest.link, '_blank');
      }
    } else if (quest.action === 'share') {
      const shareUrl = `https://t.me/share/url?url=https://t.me/RashidovSchool_bot?start=ref_${user?.telegram_id || ''}&text=${encodeURIComponent("Rashidov Biologiya platformasida bepul darslar va testlar!")}`;
      if (window.Telegram?.WebApp?.openTelegramLink) {
        window.Telegram.WebApp.openTelegramLink(shareUrl);
      } else {
        window.open(shareUrl, '_blank');
      }
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, y: '100%' }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: '100%' }}
          transition={{ type: "spring", damping: 26, stiffness: 320 }}
          className="w-full max-w-lg bg-[#161618] border border-white/10 rounded-t-[32px] sm:rounded-[32px] overflow-hidden flex flex-col max-h-[90vh] shadow-2xl relative"
        >
          {/* Header with 3D Glowing Brain */}
          <div className="relative pt-6 pb-4 px-6 flex flex-col items-center bg-gradient-to-b from-[#1C1C1E] to-[#161618] border-b border-white/5">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/70"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="relative mb-2">
              <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full"></div>
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-500/30 to-blue-600/30 border border-blue-400/40 flex items-center justify-center text-3xl shadow-lg relative">
                🧠
              </div>
            </div>

            <h3 className="text-white font-bold text-lg text-center">Neyronlarni xarid qilish</h3>
            <p className="text-xs text-[#8E8E93] text-center mt-0.5">
              Joriy balans: <span className="text-blue-400 font-bold">{user?.balance?.toLocaleString('ru-RU') || 0} Neyron</span>
            </p>

            {/* Segmented 4 Tabs */}
            <div className="grid grid-cols-4 gap-1 w-full bg-[#242426] p-1 rounded-2xl mt-4">
              <button
                onClick={() => handleTabSwitch('click')}
                className={`py-2 text-[11px] font-bold rounded-xl transition-all flex items-center justify-center gap-1 ${
                  activeTab === 'click' ? 'bg-[#007AFF] text-white shadow-md' : 'text-[#8E8E93] hover:text-white'
                }`}
              >
                <span>Click</span>
              </button>
              <button
                onClick={() => handleTabSwitch('stars')}
                className={`py-2 text-[11px] font-bold rounded-xl transition-all flex items-center justify-center gap-1 ${
                  activeTab === 'stars' ? 'bg-[#007AFF] text-white shadow-md' : 'text-[#8E8E93] hover:text-white'
                }`}
              >
                <span>Stars</span>
                <span className="text-yellow-400">⭐️</span>
              </button>
              <button
                onClick={() => handleTabSwitch('promo')}
                className={`py-2 text-[11px] font-bold rounded-xl transition-all flex items-center justify-center gap-1 ${
                  activeTab === 'promo' ? 'bg-[#007AFF] text-white shadow-md' : 'text-[#8E8E93] hover:text-white'
                }`}
              >
                <span>Promo</span>
                <span>🎟</span>
              </button>
              <button
                onClick={() => handleTabSwitch('quests')}
                className={`py-2 text-[11px] font-bold rounded-xl transition-all flex items-center justify-center gap-1 ${
                  activeTab === 'quests' ? 'bg-[#007AFF] text-white shadow-md' : 'text-[#8E8E93] hover:text-white'
                }`}
              >
                <span>Bepul</span>
                <span>🎁</span>
              </button>
            </div>
          </div>

          {/* Modal Content */}
          <div className="p-5 overflow-y-auto space-y-3 pb-8">
            {/* TAB 1: CLICK UZS */}
            {activeTab === 'click' && (
              <div className="space-y-3">
                <p className="text-xs text-[#8E8E93] mb-2">Click orqali to'g'ridan-to'g'ri so'mda xarid qiling:</p>
                {CLICK_PACKAGES.map((pkg, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleBuyClick(pkg)}
                    className="w-full bg-[#1C1C1E] hover:bg-[#242426] border border-white/5 p-4 rounded-2xl flex items-center justify-between transition-all active:scale-[0.98] relative overflow-hidden group"
                  >
                    {pkg.popular && (
                      <div className="absolute top-0 right-0 bg-[#007AFF] text-white text-[9px] font-extrabold px-2 py-0.5 rounded-bl-lg">
                        TAVSIYA
                      </div>
                    )}
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-xl">
                        🧠
                      </div>
                      <div className="text-left">
                        <div className="font-bold text-white text-base">+{pkg.neyrons.toLocaleString('ru-RU')} Neyron</div>
                        <div className="text-xs text-[#8E8E93]">Tezkor hisobga o'tkazish</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {pkg.discount && (
                        <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                          {pkg.discount}
                        </span>
                      )}
                      <div className="bg-[#2C2C2E] group-hover:bg-[#007AFF] text-white font-bold text-xs px-3 py-2 rounded-xl transition-colors">
                        {pkg.label}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* TAB 2: STARS */}
            {activeTab === 'stars' && (
              <div className="grid grid-cols-2 gap-3">
                {STARS_PACKAGES.map((pkg, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleBuyStars(pkg)}
                    className="bg-[#1C1C1E] hover:bg-[#242426] border border-white/5 p-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all active:scale-95 relative"
                  >
                    {pkg.hit && (
                      <div className="absolute top-0 right-0 bg-red-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-bl-lg">
                        XIT
                      </div>
                    )}
                    <div className="text-2xl">🧠</div>
                    <div className="font-bold text-white text-sm">+{pkg.neyrons.toLocaleString('ru-RU')}</div>
                    <div className="bg-yellow-500/15 border border-yellow-500/30 text-yellow-300 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                      <span>{pkg.stars}</span>
                      <span>⭐️</span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* TAB 3: PROMO */}
            {activeTab === 'promo' && (
              <div className="space-y-4 pt-2">
                <div className="bg-[#1C1C1E] border border-white/5 p-5 rounded-2xl flex flex-col gap-3">
                  <label className="text-xs text-[#8E8E93]">Promo-kodni kiriting:</label>
                  <input
                    type="text"
                    value={promoInput}
                    onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                    placeholder="BIO2026"
                    className="w-full bg-[#2C2C2E] border border-white/10 rounded-xl p-3.5 text-white font-bold tracking-wider placeholder-[#636366] text-center text-lg outline-none focus:border-[#007AFF]"
                  />
                  
                  {promoMessage && (
                    <div className={`p-3 rounded-xl text-xs font-medium text-center ${
                      promoMessage.type === 'success' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'
                    }`}>
                      {promoMessage.text}
                    </div>
                  )}

                  <button
                    onClick={handleApplyPromo}
                    disabled={promoLoading || !promoInput.trim()}
                    className="w-full bg-[#007AFF] hover:bg-blue-600 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl transition-all active:scale-95"
                  >
                    {promoLoading ? 'Tekshirilmoqda...' : 'Faollashtirish'}
                  </button>
                </div>
              </div>
            )}

            {/* TAB 4: FREE QUESTS & 7-DAY STREAK */}
            {activeTab === 'quests' && (
              <div className="space-y-4">
                {/* 7-Day Streak Rewards */}
                <div>
                  <h4 className="text-xs font-bold text-[#8E8E93] mb-2 uppercase tracking-wider">7 kunlik Streak mukofotlari</h4>
                  <div className="grid grid-cols-7 gap-1.5">
                    {[1, 2, 3, 4, 5, 6, 7].map((day) => {
                      const currentStreak = user?.streak_days || 0;
                      const isReached = currentStreak >= day;
                      return (
                        <div
                          key={day}
                          className={`p-2 rounded-xl flex flex-col items-center justify-center border text-center ${
                            isReached
                              ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                              : 'bg-[#1C1C1E] border-white/5 text-[#636366]'
                          }`}
                        >
                          <span className="text-[10px] font-bold">{day}-kun</span>
                          <span className="text-sm my-0.5">{day === 7 ? '🎁' : '🔥'}</span>
                          <span className="text-[9px] font-bold">+{day * 50}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Daily Quests */}
                <div className="space-y-2 pt-2">
                  <h4 className="text-xs font-bold text-[#8E8E93] mb-2 uppercase tracking-wider">Kundalik vazifalar</h4>
                  {DAILY_QUESTS.map((quest) => (
                    <div
                      key={quest.id}
                      className="bg-[#1C1C1E] border border-white/5 p-3.5 rounded-2xl flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{quest.icon}</span>
                        <div>
                          <div className="text-white text-xs font-bold">{quest.title}</div>
                          <div className="text-[10px] text-emerald-400 font-medium">+{quest.reward} Neyron</div>
                        </div>
                      </div>

                      {quest.done ? (
                        <span className="bg-emerald-500/20 text-emerald-400 text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                          <Check className="w-3 h-3" /> Bajarildi
                        </span>
                      ) : (
                        <button
                          onClick={() => handleQuestAction(quest)}
                          className="bg-[#007AFF] hover:bg-blue-600 text-white text-[11px] font-bold px-3 py-1.5 rounded-full transition-all active:scale-95"
                        >
                          Bajarish
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
