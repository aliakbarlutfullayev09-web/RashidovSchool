import React, { useState } from 'react';
import { updateUserProfile } from '../api/supabase';

export default function Profile({ user }) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    full_name: user.full_name || '',
    class_group: user.class_group || '',
    language: user.language || 'ru',
  });
  const [loading, setLoading] = useState(false);

  const initials = (user.full_name || 'Г')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  const handleSave = async () => {
    setLoading(true);
    const { data, error } = await updateUserProfile(user.telegram_id, formData);
    setLoading(false);
    if (!error) {
      window.location.reload(); // Перезагружаем приложение для обновления глобального состояния
    } else {
      alert('Ошибка при сохранении: ' + error.message);
    }
  };

  if (isEditing) {
    return (
      <div className="flex flex-col items-center pt-8 pb-6 px-4">
        <h2 className="text-xl font-bold mb-4">Редактирование профиля</h2>
        <div className="w-full space-y-4">
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Имя и фамилия</label>
            <input 
              type="text" 
              className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white"
              value={formData.full_name}
              onChange={e => setFormData({...formData, full_name: e.target.value})}
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Класс (например, 11-А)</label>
            <input 
              type="text" 
              className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white"
              value={formData.class_group}
              onChange={e => setFormData({...formData, class_group: e.target.value})}
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Язык</label>
            <select 
              className="w-full bg-gray-800 border border-white/10 rounded-xl p-3 text-white"
              value={formData.language}
              onChange={e => setFormData({...formData, language: e.target.value})}
            >
              <option value="ru">Русский</option>
              <option value="uz">O'zbekcha</option>
            </select>
          </div>
          
          <div className="flex space-x-2 pt-4">
            <button 
              onClick={() => setIsEditing(false)}
              className="flex-1 p-3 rounded-xl bg-white/10 text-white font-medium"
            >
              Отмена
            </button>
            <button 
              onClick={handleSave}
              disabled={loading}
              className="flex-1 p-3 rounded-xl bg-blue-600 text-white font-bold disabled:opacity-50"
            >
              {loading ? '...' : 'Сохранить'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center pt-8 pb-6 px-4">
      {/* Avatar */}
      <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-3xl font-bold shadow-xl border-4 border-white/10 mb-4">
        {initials}
      </div>

      {/* Name & Class */}
      <div className="flex items-center space-x-2 mb-1">
        <h1 className="text-2xl font-bold">{user.full_name}</h1>
        <button onClick={() => setIsEditing(true)} className="text-gray-400 hover:text-white p-1">
          ✏️
        </button>
      </div>
      <span className="px-3 py-1 bg-white/10 rounded-full text-xs font-semibold mb-6">
        Класс: {user.class_group}
      </span>

      {/* Balance Card */}
      <div className="w-full glass-strong rounded-3xl p-6 mb-4 flex flex-col items-center">
        <span className="text-gray-300 text-sm mb-2">Ваш баланс</span>
        <div className="flex items-center space-x-2 text-4xl font-bold text-blue-400">
          <span>🧠</span>
          <span>{user.balance}</span>
        </div>
        <span className="text-xs text-blue-200/50 mt-1">Нейронов</span>
      </div>

      {/* Streak */}
      <div className="w-full glass rounded-2xl p-4 flex items-center justify-between mb-4">
        <span className="font-semibold">Ударный режим:</span>
        <div className="flex items-center space-x-1 text-orange-400 font-bold text-lg">
          <span>🔥</span>
          <span>{user.streak_days} дней подряд</span>
        </div>
      </div>

      {/* Promo Code */}
      <div className="w-full glass rounded-2xl p-4">
        <span className="font-semibold block mb-2 text-sm text-gray-300">Ввести промокод</span>
        <div className="flex space-x-2">
          <input 
            type="text" 
            id="promoInput"
            className="flex-1 bg-white/5 border border-white/10 rounded-xl p-3 text-white uppercase"
            placeholder="PROMO123"
          />
          <button 
            onClick={async () => {
              const input = document.getElementById('promoInput');
              const code = input.value.trim();
              if (!code) return;
              
              const btn = document.getElementById('promoBtn');
              btn.disabled = true;
              btn.innerText = '...';
              
              const { applyPromoCode } = await import('../api/supabase');
              const res = await applyPromoCode(user.telegram_id, code);
              
              if (res.success) {
                alert(res.message);
                window.location.reload();
              } else {
                alert(res.message);
                btn.disabled = false;
                btn.innerText = 'OK';
              }
            }}
            id="promoBtn"
            className="bg-blue-600 hover:bg-blue-700 font-bold py-2 px-4 rounded-xl transition-colors"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
