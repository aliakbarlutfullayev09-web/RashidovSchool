import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Profile({ user, isOpen, onClose }) {
  const [name, setName] = useState(user?.name || '');
  const [className, setClassName] = useState(user?.class || '');
  const [lang, setLang] = useState(user?.lang || 'uz');

  if (!isOpen) return null;

  const handleSave = () => {
    // API logic to save profile
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-4 backdrop-blur-md"
      >
        <motion.div
          initial={{ scale: 0.95, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 20 }}
          className="bg-[#1C1C1E] rounded-3xl p-6 w-full max-w-sm border border-white/[0.08] shadow-2xl"
        >
          <h2 className="text-xl font-bold text-white mb-6 text-center">Profilni tahrirlash</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-[#8E8E93] mb-1.5 ml-1">Ism va Familiya</label>
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#2C2C2E] border-none rounded-xl p-3.5 text-white outline-none focus:ring-1 focus:ring-[#007AFF] text-[15px]"
              />
            </div>
            
            <div>
              <label className="block text-sm text-[#8E8E93] mb-1.5 ml-1">Sinf</label>
              <input 
                type="text" 
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                className="w-full bg-[#2C2C2E] border-none rounded-xl p-3.5 text-white outline-none focus:ring-1 focus:ring-[#007AFF] text-[15px]"
              />
            </div>

            <div>
              <label className="block text-sm text-[#8E8E93] mb-1.5 ml-1">Til (Язык)</label>
              <select 
                value={lang}
                onChange={(e) => setLang(e.target.value)}
                className="w-full bg-[#2C2C2E] border-none rounded-xl p-3.5 text-white outline-none focus:ring-1 focus:ring-[#007AFF] appearance-none text-[15px]"
              >
                <option value="uz">O'zbekcha</option>
                <option value="ru">Русский</option>
              </select>
            </div>
          </div>

          <div className="flex gap-3 mt-8">
            <button 
              onClick={onClose}
              className="flex-1 bg-[#2C2C2E] text-white py-3.5 rounded-xl font-medium"
            >
              Bekor qilish
            </button>
            <button 
              onClick={handleSave}
              className="flex-1 bg-[#007AFF] text-white py-3.5 rounded-xl font-medium"
            >
              Saqlash
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
