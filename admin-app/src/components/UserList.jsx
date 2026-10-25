import React, { useState, useEffect } from 'react';
import { api } from '../api/supabase';
import { Search, Gift, Send, Users, ShieldCheck, Flame, X } from 'lucide-react';

export default function UserList() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedUserForGift, setSelectedUserForGift] = useState(null);
  const [giftAmount, setGiftAmount] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    const data = await api.getAllUsers();
    setUsers(data);
  };

  const filteredUsers = users.filter(u => 
    (u.full_name || '').toLowerCase().includes((search || '').toLowerCase()) || 
    (u.telegram_id || '').toString().includes(search || '')
  );

  const handleSendGift = async (e) => {
    e.preventDefault();
    if (!selectedUserForGift || !giftAmount || isNaN(giftAmount)) return;
    setLoading(true);

    const amount = parseInt(giftAmount, 10);
    const newBalance = (selectedUserForGift.balance || 0) + amount;
    await api.updateUserBalance(selectedUserForGift.telegram_id, newBalance);
    
    setUsers(prev => prev.map(u => 
      u.telegram_id === selectedUserForGift.telegram_id ? { ...u, balance: newBalance } : u
    ));

    setLoading(false);
    setSelectedUserForGift(null);
    setGiftAmount('');
    alert(`Muvaffaqiyatli! ${selectedUserForGift.full_name} balansiga ${amount > 0 ? '+' : ''}${amount} Neyron kiritildi.`);
  };

  const handleMessageUser = (telegramId) => {
    const url = `https://t.me/RashidovSchool_bot?start=msg_${telegramId}`;
    if (window.Telegram?.WebApp?.openTelegramLink) {
      window.Telegram.WebApp.openTelegramLink(url);
    } else {
      window.open(url, '_blank');
    }
  };

  return (
    <div className="space-y-6 text-white pb-24">
      {/* Top Search & Filter Bar */}
      <div className="card p-6 bg-[#1C1C1E] border border-white/5 rounded-3xl shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">O'quvchilar ro'yxati</h2>
            <p className="text-xs text-[#8E8E93]">Jami ro'yxatdan o'tgan foydalanuvchilar: {users.length} ta</p>
          </div>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-[#8E8E93] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input 
            type="text" 
            placeholder="Ism yoki Telegram ID..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-field pl-10 py-2.5 text-xs"
          />
        </div>
      </div>

      {/* Users Table Card */}
      <div className="card bg-[#1C1C1E] border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-white/80">
            <thead className="bg-[#161618] text-[#8E8E93] text-[11px] uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Foydalanuvchi</th>
                <th className="px-6 py-4">Sinf</th>
                <th className="px-6 py-4">Balans (🧠)</th>
                <th className="px-6 py-4">Streak (🔥)</th>
                <th className="px-6 py-4">Rol</th>
                <th className="px-6 py-4 text-right">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredUsers.map((u) => (
                <tr key={u.telegram_id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-bold text-white text-sm">{u.full_name || 'Noma‘lum'}</div>
                    <div className="text-[11px] text-[#8E8E93] font-mono">{u.telegram_id}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="bg-[#2C2C2E] border border-white/5 px-2.5 py-1 rounded-full text-[11px]">
                      {u.class_group || 'Abituriyent'}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-mono font-bold text-blue-400">
                    {u.balance?.toLocaleString('ru-RU') || 0}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-amber-400 font-bold flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5" />
                      <span>{u.streak_days || 0} kun</span>
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                      u.role === 'superadmin' || u.role === 'admin' 
                        ? 'bg-purple-500/15 text-purple-300 border border-purple-500/20' 
                        : u.role === 'teacher' 
                        ? 'bg-blue-500/15 text-blue-300 border border-blue-500/20' 
                        : 'bg-white/5 text-[#8E8E93]'
                    }`}>
                      {u.role || 'student'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => setSelectedUserForGift(u)}
                        className="bg-emerald-500/10 hover:bg-emerald-500 hover:text-white border border-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 active:scale-95"
                        title="Neyron qo'shish"
                      >
                        <Gift className="w-3.5 h-3.5" />
                        <span>Neyron</span>
                      </button>

                      <button 
                        onClick={() => handleMessageUser(u.telegram_id)}
                        className="bg-blue-500/10 hover:bg-blue-500 hover:text-white border border-blue-500/20 text-blue-400 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 active:scale-95"
                        title="Bot orqali yozish"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Yozish</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-[#8E8E93] text-xs">
                    Foydalanuvchilar topilmadi.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Gift Modal */}
      {selectedUserForGift && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="card p-6 bg-[#1C1C1E] border border-white/10 rounded-3xl max-w-sm w-full space-y-4 shadow-2xl relative">
            <button
              onClick={() => setSelectedUserForGift(null)}
              className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/70 absolute top-4 right-4"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xl">
                🎁
              </div>
              <div>
                <h3 className="text-white font-bold text-sm">Neyron balansi boshqaruvi</h3>
                <p className="text-xs text-[#8E8E93]">{selectedUserForGift.full_name}</p>
              </div>
            </div>

            <form onSubmit={handleSendGift} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#8E8E93] mb-1.5">
                  Qo'shiladigan miqdor (musbat yoki manfiy)
                </label>
                <input 
                  type="number" 
                  value={giftAmount} 
                  onChange={e => setGiftAmount(e.target.value)} 
                  className="input-field text-center font-mono font-bold text-base" 
                  placeholder="Masalan: 500 yoki -200" 
                  required 
                />
              </div>

              <div className="flex gap-2">
                <button 
                  type="button" 
                  onClick={() => setSelectedUserForGift(null)} 
                  className="btn-secondary flex-1 py-3 text-xs"
                >
                  Bekor qilish
                </button>
                <button 
                  type="submit" 
                  disabled={loading || !giftAmount} 
                  className="btn-primary flex-1 py-3 text-xs"
                >
                  {loading ? "Bajarilmoqda..." : "Tasdiqlash"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
