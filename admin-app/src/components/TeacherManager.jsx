import React, { useState, useEffect } from 'react';
import { api } from '../api/supabase';
import { UserPlus, GraduationCap, Shield, Trash2, Key, Check, BookOpen } from 'lucide-react';

export default function TeacherManager() {
  const [teachers, setTeachers] = useState([]);
  const [subjectsList, setSubjectsList] = useState([]);
  const [tgId, setTgId] = useState('');
  const [subject, setSubject] = useState('Biologiya');
  const [permissions, setPermissions] = useState({ can_promo: false, can_gift: false, can_send: false });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadTeachers();
  }, []);

  const loadTeachers = async () => {
    const data = await api.getTeachers();
    setTeachers(data || []);
    const subs = await api.getSubjects();
    if (subs && subs.length > 0) {
      setSubjectsList(subs);
      setSubject(subs[0].name);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!tgId) return;
    setLoading(true);
    const newT = await api.addTeacher(parseInt(tgId, 10), subject, permissions);
    setLoading(false);
    if (newT) {
      setTeachers([...teachers, { ...newT }]);
      setTgId('');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Haqiqatan ham ushbu foydalanuvchining o'qituvchilik huquqini bekor qilmoqchimisiz?")) {
      const success = await api.removeTeacher(id);
      if (success) {
        setTeachers(teachers.filter(t => t.telegram_id !== id));
      }
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-20 text-white">
      {/* Add Teacher Card */}
      <div className="card p-6 bg-[#1C1C1E] border border-white/5 rounded-3xl shadow-2xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <UserPlus className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Yangi o'qituvchi tayinlash</h2>
            <p className="text-xs text-[#8E8E93]">Foydalanuvchiga muayyan fan va maxsus ruxsatlarni biriktirish</p>
          </div>
        </div>

        <form onSubmit={handleAdd} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#8E8E93] mb-1.5 uppercase tracking-wider">
                Telegram ID *
              </label>
              <input 
                type="number" 
                value={tgId} 
                onChange={e => setTgId(e.target.value)} 
                className="input-field font-mono" 
                placeholder="123456789" 
                required 
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#8E8E93] mb-1.5 uppercase tracking-wider">
                Biriktiriladigan fan
              </label>
              <select 
                value={subject} 
                onChange={e => setSubject(e.target.value)} 
                className="input-field"
              >
                {subjectsList.length > 0 ? (
                  subjectsList.map(s => <option key={s.id} value={s.name}>{s.name}</option>)
                ) : (
                  <>
                    <option value="Biologiya">Biologiya</option>
                    <option value="Kimyo">Kimyo</option>
                    <option value="Matematika">Matematika</option>
                  </>
                )}
              </select>
            </div>
          </div>
          
          {/* Permissions switches */}
          <div className="space-y-2.5 pt-2">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-[#8E8E93] uppercase tracking-wider">
              <Shield className="w-3.5 h-3.5 text-purple-400" />
              <span>Ruxsatlar va vakolatlar</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label className={`p-3.5 rounded-2xl border cursor-pointer flex items-center gap-3 transition-all ${
                permissions.can_promo ? 'bg-[#007AFF]/15 border-[#007AFF]/40' : 'bg-[#2C2C2E] border-white/5'
              }`}>
                <input 
                  type="checkbox" 
                  checked={permissions.can_promo} 
                  onChange={e => setPermissions({...permissions, can_promo: e.target.checked})} 
                  className="w-4 h-4 accent-[#007AFF] rounded" 
                />
                <div>
                  <span className="block text-xs font-bold text-white">🎟 Promokod</span>
                  <span className="text-[10px] text-[#8E8E93]">Promokod yaratish</span>
                </div>
              </label>

              <label className={`p-3.5 rounded-2xl border cursor-pointer flex items-center gap-3 transition-all ${
                permissions.can_gift ? 'bg-amber-500/15 border-amber-500/40' : 'bg-[#2C2C2E] border-white/5'
              }`}>
                <input 
                  type="checkbox" 
                  checked={permissions.can_gift} 
                  onChange={e => setPermissions({...permissions, can_gift: e.target.checked})} 
                  className="w-4 h-4 accent-amber-400 rounded" 
                />
                <div>
                  <span className="block text-xs font-bold text-white">🎁 Neyron sovg'a</span>
                  <span className="text-[10px] text-[#8E8E93]">Balans to'ldirish</span>
                </div>
              </label>

              <label className={`p-3.5 rounded-2xl border cursor-pointer flex items-center gap-3 transition-all ${
                permissions.can_send ? 'bg-emerald-500/15 border-emerald-500/40' : 'bg-[#2C2C2E] border-white/5'
              }`}>
                <input 
                  type="checkbox" 
                  checked={permissions.can_send} 
                  onChange={e => setPermissions({...permissions, can_send: e.target.checked})} 
                  className="w-4 h-4 accent-emerald-400 rounded" 
                />
                <div>
                  <span className="block text-xs font-bold text-white">📢 Xabar yuborish</span>
                  <span className="text-[10px] text-[#8E8E93]">Rassilka qilish</span>
                </div>
              </label>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={!tgId || loading} 
            className="btn-primary py-3 px-6 text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 active:scale-95 transition-all"
          >
            <UserPlus className="w-4 h-4" />
            <span>{loading ? "Qo'shilmoqda..." : "O'qituvchini qo'shish"}</span>
          </button>
        </form>
      </div>

      {/* Teachers List */}
      <div className="space-y-3">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <span>O'qituvchilar tarkibi</span>
          <span className="bg-[#2C2C2E] text-xs font-semibold px-2.5 py-0.5 rounded-full text-[#8E8E93]">
            {teachers.length} nafar
          </span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {teachers.map((t, idx) => (
            <div 
              key={idx} 
              className="card p-5 bg-[#1C1C1E] border border-white/5 rounded-3xl shadow-xl flex flex-col justify-between space-y-4 hover:border-white/10 transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-blue-600 flex items-center justify-center text-white font-bold text-base shadow-lg">
                    {t.full_name ? t.full_name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm">
                      {t.full_name || "Noma'lum o'qituvchi"}
                    </h4>
                    <span className="font-mono text-xs text-[#8E8E93]">ID: {t.telegram_id}</span>
                  </div>
                </div>

                <button 
                  onClick={() => handleDelete(t.telegram_id)}
                  className="w-8 h-8 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white flex items-center justify-center transition-colors"
                  title="Huquqni o'chirish"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-white/5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#007AFF] bg-[#007AFF]/10 border border-[#007AFF]/20 px-3 py-1 rounded-full">
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>{t.subject || "Biologiya"}</span>
                </div>

                <div className="flex gap-1.5 flex-wrap">
                  {t.permissions?.can_promo && (
                    <span className="text-[10px] font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-md">
                      Promo
                    </span>
                  )}
                  {t.permissions?.can_gift && (
                    <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md">
                      Sovg'a
                    </span>
                  )}
                  {t.permissions?.can_send && (
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                      Rassilka
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}

          {teachers.length === 0 && (
            <div className="col-span-full card p-8 text-center text-xs text-[#8E8E93]">
              Hozircha qo'shimcha o'qituvchilar tayinlanmagan.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
