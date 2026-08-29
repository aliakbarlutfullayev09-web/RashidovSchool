import React from 'react';
import { useHaptic } from '../hooks/useHaptic';

export default function TopUp({ user }) {
  const { impactMedium, notificationSuccess, notificationError } = useHaptic();

  const packages = [
    { stars: 5, neurons: 1250 },
    { stars: 100, neurons: 25000 },
    { stars: 400, neurons: 100000 },
    { stars: 600, neurons: 150000 },
    { stars: 1000, neurons: 250000 }
  ];

  const handleBuy = (stars) => {
    impactMedium();
    const tg = window.Telegram?.WebApp;
    if (tg?.openTelegramLink) {
      // Это закроет приложение и отправит боту команду /start buy_100
      tg.openTelegramLink(`https://t.me/RashidovSchool_bot?start=buy_${stars}`);
    } else {
      alert(`В Telegram откроется счет на ${stars} ⭐️`);
    }
  };

  const handleFreeze = () => {
    if (user.balance >= 50) {
      if (window.confirm('Потратить 50 🧠 на заморозку стрика?')) {
        notificationSuccess();
        alert('Стрик заморожен!');
      }
    } else {
      notificationError();
      alert('Недостаточно нейронов!');
    }
  };

  return (
    <div className="px-4 mb-8">
      <h3 className="font-bold mb-4 opacity-80 text-lg">Пополнить баланс</h3>
      
      <div className="grid grid-cols-2 gap-3 mb-6">
        {packages.map((pkg, idx) => (
          <button 
            key={idx}
            onClick={() => handleBuy(pkg.stars)}
            className="glass p-4 rounded-3xl flex flex-col items-center justify-center space-y-2 hover:bg-white/10 transition-colors active:scale-95"
          >
            <div className="text-2xl">🧠</div>
            <div className="font-bold text-lg text-white">+{pkg.neurons.toLocaleString()}</div>
            <div className="text-sm font-medium bg-blue-500/20 text-blue-300 px-3 py-1 rounded-full flex items-center space-x-1">
              <span>{pkg.stars}</span>
              <span className="text-yellow-400">⭐️</span>
            </div>
          </button>
        ))}
      </div>
      
      <button 
        onClick={handleFreeze}
        className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-bold py-3 px-4 rounded-2xl shadow-lg transition-transform active:scale-95 flex items-center justify-center space-x-2"
      >
        <span>❄️</span>
        <span>Заморозка стрика (50 🧠)</span>
      </button>

      <p className="text-xs text-slate-400 text-center mt-6">
        Оплата происходит через официальную систему Telegram Stars. Нейроны начисляются моментально.
      </p>
    </div>
  );
}
