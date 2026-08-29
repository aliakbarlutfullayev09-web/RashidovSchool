import React from 'react';
import { useHaptic } from '../hooks/useHaptic';

export default function TopUp({ user }) {
  const { impactHeavy, notificationSuccess, notificationError } = useHaptic();

  const handleStarsPay = () => {
    impactHeavy();
    // In a real app, call backend to create invoice and then open it
    const tg = window.Telegram?.WebApp;
    if (tg?.openInvoice) {
      // tg.openInvoice(invoiceUrl);
      notificationSuccess();
    }
  };

  const handleFiatPay = () => {
    impactHeavy();
    const tg = window.Telegram?.WebApp;
    if (tg?.openTelegramLink) {
      tg.openTelegramLink('https://t.me/mynus_lab');
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
    <div className="px-4 flex flex-col space-y-3 mb-8">
      <button 
        onClick={handleStarsPay}
        className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white font-bold py-3 px-4 rounded-2xl shadow-lg transition-transform active:scale-95 flex items-center justify-center space-x-2"
      >
        <span>⭐️</span>
        <span>Оплатить Telegram Stars</span>
      </button>

      <button 
        onClick={handleFiatPay}
        className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-3 px-4 rounded-2xl shadow-lg transition-transform active:scale-95 flex items-center justify-center space-x-2"
      >
        <span>💳</span>
        <span>Оплатить Сумами</span>
      </button>

      <button 
        onClick={handleFreeze}
        className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-bold py-3 px-4 rounded-2xl shadow-lg transition-transform active:scale-95 flex items-center justify-center space-x-2"
      >
        <span>❄️</span>
        <span>Заморозка стрика (50 🧠)</span>
      </button>
    </div>
  );
}
