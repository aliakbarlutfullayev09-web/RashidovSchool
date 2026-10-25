import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, School, Globe, Check } from 'lucide-react';
import { updateUserProfile } from '../api/supabase';
import { useHaptic } from '../hooks/useHaptic';

export default function Profile({ user, isOpen, onClose, onUpdateUser }) {
  const [fullName, setFullName] = useState('');
  const [classGroup, setClassGroup] = useState('');
  const [lang, setLang] = useState('uz');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const { notificationSuccess, notificationError, impactMedium } = useHaptic();

  useEffect(() => {
    if (user) {
      setFullName(user.full_name || '');
      setClassGroup(user.class_group || '');
      setLang(user.language || 'uz');
    }
  }, [user, isOpen]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!fullName.trim()) return;
    setLoading(true);
    impactMedium();

    try {
      const payload = {
        full_name: fullName.trim(),
        class_group: classGroup.trim(),
        language: lang
      };
      const { data, error } = await updateUserProfile(user.telegram_id, payload);
      if (!error && data) {
        notificationSuccess();
        setSaved(true);
        if (onUpdateUser) onUpdateUser({ ...user, ...payload });
        setTimeout(() => {
          setSaved(false);
          onClose();
        }, 800);
      } else {
        notificationError();
        alert('Xatolik yuz berdi: ' + (error?.message || 'Qayta urinib ko‘ring'));
      }
    } catch (e) {
      notificationError();
      alert('Aloqa xatosi: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ scale: 0.95, y: 20, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.95, y: 20, opacity: 0 }}
          className="bg-[#1C1C1E] rounded-[28px] p-6 w-full max-w-sm border border-white/10 shadow-2xl relative"
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/70"
          >
            <X className="w-5 h-5" />
          </button>

          <h2 className="text-xl font-bold text-white mb-6 text-center">Profilni tahrirlash</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#8E8E93] mb-1.5 ml-1 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-blue-400" />
                Ism va Familiya
              </label>
              <input 
                type="text" 
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Aliakbar Lutfullayev"
                className="w-full bg-[#2C2C2E] border border-white/5 rounded-2xl p-3.5 text-white outline-none focus:border-[#007AFF] text-sm"
              />
            </div>
            
            <div>
              <label className="block text-xs font-medium text-[#8E8E93] mb-1.5 ml-1 flex items-center gap-1.5">
                <School className="w-3.5 h-3.5 text-amber-400" />
                Sinf yoki Yo'nalish
              </label>
              <input 
                type="text" 
                value={classGroup}
                onChange={(e) => setClassGroup(e.target.value)}
                placeholder="11-A yoki Abituriyent"
                className="w-full bg-[#2C2C2E] border border-white/5 rounded-2xl p-3.5 text-white outline-none focus:border-[#007AFF] text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#8E8E93] mb-1.5 ml-1 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-emerald-400" />
                Asosiy til
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setLang('uz')}
                  className={`py-3 px-3 rounded-xl border text-xs font-bold transition-all ${
                    lang === 'uz'
                      ? 'bg-[#007AFF] border-[#007AFF] text-white shadow-md'
                      : 'bg-[#2C2C2E] border-white/5 text-[#8E8E93]'
                  }`}
                >
                  🇺🇿 O'zbekcha
                </button>
                <button
                  type="button"
                  onClick={() => setLang('ru')}
                  className={`py-3 px-3 rounded-xl border text-xs font-bold transition-all ${
                    lang === 'ru'
                      ? 'bg-[#007AFF] border-[#007AFF] text-white shadow-md'
                      : 'bg-[#2C2C2E] border-white/5 text-[#8E8E93]'
                  }`}
                >
                  🇷🇺 Русский
                </button>
              </div>
            </div>
          </div>

          <div className="flex gap-2.5 mt-7">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 bg-[#2C2C2E] text-white py-3.5 rounded-2xl font-bold text-sm"
            >
              Bekor qilish
            </button>
            <button 
              type="button"
              onClick={handleSave}
              disabled={loading || !fullName.trim()}
              className="flex-1 bg-[#007AFF] hover:bg-blue-600 disabled:opacity-50 text-white py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-1.5 shadow-lg shadow-blue-500/20"
            >
              {saved ? (
                <>
                  <Check className="w-4 h-4 text-emerald-300" />
                  <span>Saqlandi</span>
                </>
              ) : loading ? (
                'Saqlanmoqda...'
              ) : (
                'Saqlash'
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
