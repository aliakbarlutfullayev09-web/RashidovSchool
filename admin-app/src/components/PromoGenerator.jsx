import React, { useState } from 'react';
import { api, supabase } from '../api/supabase';

export default function PromoGenerator({ user }) {
  const [code, setCode] = useState('');
  const [bonus, setBonus] = useState(100);
  const [maxUses, setMaxUses] = useState(10);
  const [promos, setPromos] = useState([]);
  
  React.useEffect(() => {
    async function load() {
      const { data } = await supabase.from('promo_codes').select('*').order('created_at', { ascending: false });
      if (data) {
        setPromos(data.map(p => ({ code: p.code, bonus: p.bonus_amount, maxUses: p.max_uses, currentUses: p.current_uses || 0 })));
      }
    }
    load();
  }, []);

  const generateRandomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCode(result);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!code) return;
    const newPromo = await api.generatePromo(code, bonus, maxUses, user.telegram_id);
    if (newPromo) {
      setPromos([newPromo, ...promos]);
      setCode('');
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="card p-6">
        <h2 className="text-xl font-bold mb-4">🎟 Создать промокод</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Код промокода</label>
            <div className="flex gap-2">
              <input type="text" value={code} onChange={e => setCode(e.target.value)} className="input-field uppercase" placeholder="Введите код..." />
              <button type="button" onClick={generateRandomCode} className="btn-primary whitespace-nowrap">Сгенерировать</button>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm text-slate-400 mb-1">Бонус (Нейроны)</label>
              <input type="number" value={bonus} onChange={e => setBonus(parseInt(e.target.value))} className="input-field" min="1" />
            </div>
            <div className="flex-1">
              <label className="block text-sm text-slate-400 mb-1">Макс. использований</label>
              <input type="number" value={maxUses} onChange={e => setMaxUses(parseInt(e.target.value))} className="input-field" min="1" />
            </div>
          </div>
          <button type="submit" disabled={!code} className="btn-primary w-full mt-4">Создать промокод</button>
        </form>
      </div>

      {promos.length > 0 && (
        <div className="card p-6">
          <h3 className="font-bold mb-4">Активные промокоды</h3>
          <div className="space-y-2">
            {promos.map((p, idx) => (
              <div key={idx} className="bg-slate-800 p-4 rounded-lg flex justify-between items-center">
                <div>
                  <div className="font-mono text-lg font-bold text-blue-400">{p.code}</div>
                  <div className="text-sm text-slate-400">+{p.bonus} Нейронов • Макс: {p.maxUses}</div>
                </div>
                <div className="text-sm text-slate-500">{p.currentUses}/{p.maxUses} использовано</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
