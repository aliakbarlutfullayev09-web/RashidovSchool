import React, { useState } from 'react';
import { motion } from 'framer-motion';
// import { applyPromo } from '../api/supabase';

export default function PromoCode({ user }) {
  const [code, setCode] = useState('');
  const [status, setStatus] = useState('idle'); // idle, loading, success, error
  const [bonus, setBonus] = useState(null);

  const handleApply = async () => {
    if (!code.trim()) return;
    setStatus('loading');
    
    try {
      // Mock integration for applyPromo
      // const res = await applyPromo(user?.id, code);
      setTimeout(() => {
        if (code.length >= 5) {
          setStatus('success');
          setBonus(150); // MOCK amount
        } else {
          setStatus('error');
          setTimeout(() => setStatus('idle'), 1000);
        }
      }, 800);
    } catch (err) {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 1000);
    }
  };

  return (
    <div className="card bg-[#1C1C1E] rounded-[20px] p-5 border border-white/[0.08] relative overflow-hidden">
      <h3 className="text-[17px] font-bold text-white mb-4 flex items-center gap-2">
        🎁 Promo-kod
      </h3>
      
      <div className="flex flex-col gap-3">
        <motion.input
          animate={status === 'error' ? { x: [-10, 10, -10, 10, 0] } : {}}
          transition={{ duration: 0.4 }}
          type="text"
          placeholder="BIO2026-UZB"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          className="bg-[#2C2C2E] border-none rounded-xl p-4 text-white font-mono uppercase outline-none focus:ring-1 focus:ring-[#007AFF] w-full text-center tracking-widest placeholder:text-[#8E8E93]"
        />
        
        <button
          onClick={handleApply}
          disabled={status === 'loading'}
          className="btn-primary w-full bg-[#007AFF] text-white py-3.5 rounded-xl font-bold disabled:opacity-50 transition-opacity"
        >
          {status === 'loading' ? 'Kuting...' : 'Faollashtirish'}
        </button>
      </div>

      {status === 'success' && (
        <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center z-10 backdrop-blur-md">
          <motion.h4 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-2xl font-bold text-[#34C759] mb-2"
          >
            Tabriklaymiz!
          </motion.h4>
          <motion.p 
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-white text-lg font-medium"
          >
            + {bonus} 💎 taqdim etildi
          </motion.p>
          <button onClick={() => setStatus('idle')} className="mt-6 text-sm text-[#007AFF] font-medium p-2">
            Yopish
          </button>
          
          {/* Confetti Particles */}
          {Array.from({ length: 30 }).map((_, i) => (
            <motion.div
              key={i}
              initial={{ 
                opacity: 1, 
                y: 0, 
                x: 0,
                backgroundColor: ['#FF3B30', '#34C759', '#007AFF', '#FFD60A', '#BF5AF2'][i % 5]
              }}
              animate={{ 
                opacity: 0, 
                y: -150 - Math.random() * 150,
                x: (Math.random() - 0.5) * 200,
                rotate: Math.random() * 360
              }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              className="absolute w-2 h-2 rounded-sm confetti-particle pointer-events-none"
              style={{ top: '50%', left: '50%' }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
