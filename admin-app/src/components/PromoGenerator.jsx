import React, { useState, useEffect } from 'react';
import { api, supabase } from '../api/supabase';
import { Ticket, Sparkles, Copy, Check, Coins, Users, Plus, Hash } from 'lucide-react';

export default function PromoGenerator({ user }) {
  const [code, setCode] = useState('');
  const [bonus, setBonus] = useState(100);
  const [maxUses, setMaxUses] = useState(10);
  const [promos, setPromos] = useState([]);
  const [copiedCode, setCopiedCode] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    loadPromos();
  }, []);

  const loadPromos = async () => {
    setLoadError('');
    try {
      const { data, error } = await supabase
        .from('promo_codes')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) {
        setLoadError(error.message || 'Promokodlarni yuklashda xatolik');
        return;
      }
      if (data) {
        setPromos(
          data.map(p => ({
            code: p.code,
            bonus: p.bonus_amount,
            maxUses: p.max_uses,
            currentUses: p.current_uses || 0,
            createdAt: p.created_at
          }))
        );
      }
    } catch (e) {
      setLoadError(e?.message || 'Promokodlarni yuklashda xatolik');
    }
  };

  const generateRandomCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCode(result);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true);
    const newPromo = await api.generatePromo(
      code.trim().toUpperCase(), 
      bonus, 
      maxUses, 
      user?.telegram_id || 0
    );
    setLoading(false);
    if (newPromo) {
      setPromos([newPromo, ...promos]);
      setCode('');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 text-white">
      {/* Create Promo Card */}
      <div className="card p-6 bg-[#1C1C1E] border border-white/5 rounded-3xl shadow-2xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-[#007AFF]">
            <Ticket className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Yangi promokod yaratish</h2>
            <p className="text-xs text-[#8E8E93]">O'quvchilarga neyronlar ulashish uchun promokodlar</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-[#8E8E93] mb-1.5 uppercase tracking-wider">
              Promokod kodi
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Hash className="w-4 h-4 text-[#8E8E93] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input 
                  type="text" 
                  value={code} 
                  onChange={e => setCode(e.target.value.toUpperCase())} 
                  className="input-field !pl-10 uppercase font-mono tracking-wider font-bold" 
                  required
                />
              </div>
              <button 
                type="button" 
                onClick={generateRandomCode} 
                className="bg-[#2C2C2E] hover:bg-[#3A3A3C] text-white border border-white/5 font-semibold text-xs px-4 rounded-xl flex items-center gap-1.5 active:scale-95 transition-all whitespace-nowrap"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Generatsiya</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-[#8E8E93] mb-1.5 uppercase tracking-wider">
                <Coins className="w-3.5 h-3.5 text-amber-400" />
                <span>Bonus (Neyronlar)</span>
              </label>
              <input 
                type="number" 
                value={bonus} 
                onChange={e => setBonus(parseInt(e.target.value) || 0)} 
                className="input-field font-mono" 
                min="1" 
                required
              />
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-[#8E8E93] mb-1.5 uppercase tracking-wider">
                <Users className="w-3.5 h-3.5 text-blue-400" />
                <span>Maksimal foydalanishlar soni</span>
              </label>
              <input 
                type="number" 
                value={maxUses} 
                onChange={e => setMaxUses(parseInt(e.target.value) || 0)} 
                className="input-field font-mono" 
                min="1" 
                required
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={!code.trim() || loading} 
            className="btn-primary w-full py-3 text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>{loading ? "Yaratilmoqda..." : "Promokodni faollashtirish"}</span>
          </button>
        </form>
      </div>

      {/* Promos List */}
      <div className="space-y-3">
        {loadError && (
          <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/30 text-xs text-red-300">
            Promokodlar ro'yxatini yuklashda xatolik: {loadError}
          </div>
        )}
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <span>Faol promokodlar</span>
          <span className="bg-[#2C2C2E] text-xs font-semibold px-2.5 py-0.5 rounded-full text-[#8E8E93]">
            {promos.length} ta
          </span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {promos.map((p, idx) => {
            const usagePercent = Math.min(100, Math.round(((p.currentUses || 0) / (p.maxUses || 1)) * 100));
            const isFinished = p.currentUses >= p.maxUses;

            return (
              <div 
                key={idx} 
                className="card p-4 bg-[#1C1C1E] border border-white/5 rounded-2xl hover:border-white/10 transition-all flex flex-col justify-between space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-base font-bold text-[#007AFF] tracking-wider">
                        {p.code}
                      </span>
                      <button 
                        onClick={() => copyToClipboard(p.code)}
                        className="text-[#8E8E93] hover:text-white transition-colors"
                        title="Nusxalash"
                      >
                        {copiedCode === p.code ? (
                          <Check className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>

                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
                        +{p.bonus} Neyron
                      </span>
                      {isFinished && (
                        <span className="text-xs font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full">
                          Tugagan
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-mono text-[#8E8E93]">
                      {p.currentUses} / {p.maxUses}
                    </span>
                    <span className="block text-[10px] text-[#8E8E93]">ishlatildi</span>
                  </div>
                </div>

                {/* Usage progress bar */}
                <div className="w-full bg-[#2C2C2E] h-1.5 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${isFinished ? 'bg-red-400' : 'bg-[#007AFF]'}`}
                    style={{ width: `${usagePercent}%` }}
                  />
                </div>
              </div>
            );
          })}

          {promos.length === 0 && (
            <div className="col-span-full card p-8 text-center text-xs text-[#8E8E93]">
              Hozircha faol promokodlar mavjud emas. Yuqorida yangi promokod yarating.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
