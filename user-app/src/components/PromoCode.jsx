import React, { useState } from 'react';
import { useHaptic } from '../hooks/useHaptic';

export default function PromoCode({ user }) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const { impactLight, notificationSuccess, notificationError } = useHaptic();

  const handleApply = async () => {
    if (!code || !user) return;
    impactLight();
    setLoading(true);
    
    import('../api/supabase').then(async ({ applyPromo }) => {
      const res = await applyPromo(code, user.telegram_id);
      setLoading(false);
      
      if (res.success) {
        notificationSuccess();
        alert(`Промокод применен! Вы получили +${res.bonus} Нейронов!`);
        setCode('');
        window.location.reload(); // Простой способ обновить баланс на экране
      } else {
        notificationError();
        alert(res.message || 'Ошибка применения промокода');
      }
    });
  };

  const handleCopyLink = () => {
    impactLight();
    const link = `t.me/RashidovSchool_bot?start=ref_${user.telegram_id}`;
    navigator.clipboard.writeText(link).then(() => {
      notificationSuccess();
      alert('Ссылка скопирована!');
    });
  };

  return (
    <div className="px-4 mb-10 flex flex-col space-y-6">
      {/* Promo Code Input */}
      <div className="glass rounded-3xl p-5">
        <h3 className="font-bold mb-3 text-sm opacity-80">Активировать промокод</h3>
        <div className="flex space-x-2">
          <input 
            type="text" 
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Введите код" 
            className="flex-1 bg-white/10 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500 placeholder-white/30 text-white"
          />
          <button 
            onClick={handleApply}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-semibold transition-transform active:scale-95 disabled:opacity-50"
          >
            {loading ? '...' : 'Применить'}
          </button>
        </div>
      </div>

      {/* Referral Link */}
      <div className="glass-strong rounded-3xl p-5 border border-blue-400/30">
        <h3 className="font-bold mb-2 flex items-center space-x-2">
          <span>🎁</span>
          <span>Пригласи друга — получи 500 🧠</span>
        </h3>
        <p className="text-xs text-gray-300 mb-4">
          Поделись ссылкой и получи бонус, когда друг зарегистрируется в боте.
        </p>
        <button 
          onClick={handleCopyLink}
          className="w-full glass bg-white/5 hover:bg-white/10 text-white py-3 rounded-xl font-bold flex items-center justify-center space-x-2"
        >
          <span>📋</span>
          <span>Скопировать ссылку</span>
        </button>
      </div>
    </div>
  );
}
