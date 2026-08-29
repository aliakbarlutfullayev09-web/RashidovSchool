import React, { useState, useEffect } from 'react';
import { api } from '../api/supabase';

export default function TeacherManager() {
  const [teachers, setTeachers] = useState([]);
  const [tgId, setTgId] = useState('');
  const [subject, setSubject] = useState('Биология');
  const [permissions, setPermissions] = useState({ can_promo: false, can_gift: false, can_send: false });

  useEffect(() => {
    loadTeachers();
  }, []);

  const loadTeachers = async () => {
    const data = await api.getTeachers();
    setTeachers(data);
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!tgId) return;
    const newT = await api.addTeacher(parseInt(tgId), subject, permissions);
    setTeachers([...teachers, { ...newT, full_name: 'Новый учитель', subject }]);
    setTgId('');
  };

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <h2 className="text-xl font-bold mb-4">Добавить учителя</h2>
        <form onSubmit={handleAdd} className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm text-slate-400 mb-1">Telegram ID</label>
              <input type="number" value={tgId} onChange={e => setTgId(e.target.value)} className="input-field" placeholder="12345678" />
            </div>
            <div className="flex-1">
              <label className="block text-sm text-slate-400 mb-1">Предмет</label>
              <select value={subject} onChange={e => setSubject(e.target.value)} className="input-field">
                <option value="Биология">Биология</option>
                <option value="Химия">Химия</option>
                <option value="Математика">Математика</option>
              </select>
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="block text-sm text-slate-400 mb-1">Права доступа</label>
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input type="checkbox" checked={permissions.can_promo} onChange={e => setPermissions({...permissions, can_promo: e.target.checked})} className="rounded bg-slate-700 border-slate-600" />
              can_promo — Может генерировать промокоды
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input type="checkbox" checked={permissions.can_gift} onChange={e => setPermissions({...permissions, can_gift: e.target.checked})} className="rounded bg-slate-700 border-slate-600" />
              can_gift — Может начислять Нейроны
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input type="checkbox" checked={permissions.can_send} onChange={e => setPermissions({...permissions, can_send: e.target.checked})} className="rounded bg-slate-700 border-slate-600" />
              can_send — Может делать рассылки
            </label>
          </div>
          <button type="submit" disabled={!tgId} className="btn-primary w-full md:w-auto">Добавить</button>
        </form>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-slate-800 text-xs uppercase">
            <tr>
              <th className="px-6 py-3">Имя / ID</th>
              <th className="px-6 py-3">Предмет</th>
              <th className="px-6 py-3">Права</th>
              <th className="px-6 py-3">Действия</th>
            </tr>
          </thead>
          <tbody>
            {teachers.map((t, idx) => (
              <tr key={idx} className="border-b border-slate-700 hover:bg-slate-800/50">
                <td className="px-6 py-4">
                  <div className="font-bold text-white">{t.full_name}</div>
                  <div className="text-xs text-slate-500">{t.telegram_id}</div>
                </td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 rounded bg-blue-900/30 text-blue-400">{t.subject}</span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-1 flex-wrap">
                    {t.permissions.can_promo && <span className="px-2 py-1 rounded bg-slate-700 text-xs">promo</span>}
                    {t.permissions.can_gift && <span className="px-2 py-1 rounded bg-slate-700 text-xs">gift</span>}
                    {t.permissions.can_send && <span className="px-2 py-1 rounded bg-slate-700 text-xs">send</span>}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <button className="text-red-400 hover:text-red-300">Удалить</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
