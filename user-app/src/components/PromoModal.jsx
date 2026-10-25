import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, CheckCircle2 } from 'lucide-react';
import { applyPromoCode } from '../api/supabase';
import { useHaptic } from '../hooks/useHaptic';

export default function PromoModal({ isOpen, onClose, user, onUpdateUser }) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const { notificationSuccess, notificationError, impactMedium } = useHaptic();

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!code.trim() || loading) return;

    setLoading(true);
    setResult(null);
    impactMedium();

    try {
      const res = await applyPromoCode(user?.telegram_id, code.trim());
      if (res.success) {
        notificationSuccess();
        setResult({ success: true, message: res.message || `+${res.bonus} Neyron qo'shildi!` });
        setShowConfetti(true);
        if (onUpdateUser && res.bonus) {
          onUpdateUser({ ...user, balance: (user.balance || 0) + res.bonus });
        }
        setTimeout(() => setShowConfetti(false), 3000);
      } else {
        notificationError();
        setResult({ success: false, message: res.message || 'Промокод не найден' });
      }
    } catch (err) {
      notificationError();
      setResult({ success: false, message: 'Server bilan aloqa uzildi' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        {/* Confetti particles */}
        {showConfetti && (
          <div className="fixed inset-0 pointer-events-none z-[120]">
            {Array.from({ length: 40 }).map((_, i) => (
              <div
                key={i}
                className="confetti-particle"
                style={{
                  left: `${Math.random() * 100}%`,
                  backgroundColor: ['#007AFF', '#34C759', '#FFD60A', '#FF2D55', '#AF52DE'][i % 5],
                  animationDelay: `${Math.random() * 0.5}s`,
                  animationDuration: `${1.5 + Math.random()}s`
                }}
              />
            ))}
          </div>
        )}

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-sm bg-[#1C1C1E] border border-white/10 rounded-[28px] p-6 shadow-2xl relative"
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/70"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-2xl mb-4">
              🎟
            </div>
            <h3 className="text-white font-bold text-lg mb-1">Promo-kod faollashtirish</h3>
            <p className="text-xs text-[#8E8E93] mb-5">
              Ustoz yoki kanalda berilgan maxsus kodni kiriting va bepul Neyronlarga ega bo'ling.
            </p>

            <form onSubmit={handleSubmit} className="w-full space-y-3">
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="BIO2026"
                className="w-full bg-[#2C2C2E] border border-white/10 rounded-2xl py-3.5 px-4 text-center text-white font-bold tracking-widest text-lg outline-none focus:border-[#007AFF] uppercase placeholder-[#636366]"
              />

              {result && (
                <div className={`p-3 rounded-xl text-xs font-medium ${
                  result.success 
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center gap-1.5' 
                    : 'bg-red-500/20 text-red-400 border border-red-500/30'
                }`}>
                  {result.success && <CheckCircle2 className="w-4 h-4" />}
                  <span>{result.message}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !code.trim()}
                className="w-full bg-[#007AFF] hover:bg-blue-600 disabled:opacity-50 text-white font-bold py-3.5 rounded-2xl transition-all active:scale-95 shadow-lg shadow-blue-500/20"
              >
                {loading ? 'Tekshirilmoqda...' : 'Faollashtirish'}
              </button>
            </form>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
