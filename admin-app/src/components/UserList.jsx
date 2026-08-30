import React, { useState, useEffect } from 'react';
import { api } from '../api/supabase';

export default function UserList() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    const data = await api.getAllUsers();
    setUsers(data);
  };

  const filteredUsers = users.filter(u => 
    u.full_name.toLowerCase().includes(search.toLowerCase()) || 
    u.telegram_id.toString().includes(search)
  );

  return (
    <div className="card space-y-4">
      <div className="p-4 border-b border-slate-700 flex justify-between items-center">
        <h2 className="text-xl font-bold">Пользователи</h2>
        <input 
          type="text" 
          placeholder="Поиск по имени или ID..." 
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input-field w-64"
        />
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-slate-800 text-xs uppercase">
            <tr>
              <th className="px-6 py-3">Пользователь</th>
              <th className="px-6 py-3">Класс</th>
              <th className="px-6 py-3">Баланс (Н)</th>
              <th className="px-6 py-3">Стрик</th>
              <th className="px-6 py-3">Роль</th>
              <th className="px-6 py-3">Действия</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((u, idx) => (
              <tr key={idx} className="border-b border-slate-700 hover:bg-slate-800/50">
                <td className="px-6 py-4">
                  <div className="font-bold text-white">{u.full_name}</div>
                  <div className="text-xs text-slate-500">{u.telegram_id}</div>
                </td>
                <td className="px-6 py-4">{u.class_group || '-'}</td>
                <td className="px-6 py-4 font-mono text-yellow-400">{u.balance}</td>
                <td className="px-6 py-4">{u.streak_days} 🔥</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded text-xs ${
                    u.role === 'student' ? 'bg-slate-700 text-slate-300' : 
                    u.role === 'teacher' ? 'bg-blue-900/30 text-blue-400' : 'bg-purple-900/30 text-purple-400'
                  }`}>
                    {u.role}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <button 
                    onClick={async () => {
                      const amount = prompt(`Сколько Нейронов начислить пользователю ${u.full_name}? (можно с минусом)`);
                      if (amount && !isNaN(amount)) {
                        const newBalance = u.balance + parseInt(amount);
                        await api.updateUserBalance(u.telegram_id, newBalance);
                        setUsers(users.map(user => user.telegram_id === u.telegram_id ? { ...user, balance: newBalance } : user));
                        alert('Успешно начислено!');
                      }
                    }}
                    className="bg-green-600/30 text-green-400 hover:bg-green-600/50 px-3 py-1 rounded text-sm transition-colors"
                  >
                    🎁 Начислить
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
