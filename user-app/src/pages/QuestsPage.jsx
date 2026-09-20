import React from 'react';
import { Trophy } from 'lucide-react';

export default function QuestsPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[70vh] p-6 text-center">
      <div className="w-24 h-24 bg-[#FFD60A]/10 rounded-[32px] flex items-center justify-center mb-6 relative border border-[#FFD60A]/30">
        <div className="absolute inset-0 bg-[#FFD60A] blur-xl opacity-20 rounded-[32px] animate-pulse"></div>
        <Trophy className="w-12 h-12 text-[#FFD60A]" strokeWidth={2} />
      </div>
      
      <h2 className="text-3xl font-extrabold text-white mb-3 tracking-tight">Reyting</h2>
      
      <div className="bg-[#1C1C1E] border border-white/5 px-4 py-2 rounded-full mb-6">
        <span className="text-[#FFD60A] font-bold text-sm tracking-widest uppercase">Tez kunlarda</span>
      </div>
      
      <p className="text-[#8E8E93] text-[15px] max-w-[280px] leading-relaxed">
        Eng kuchli o'quvchilar reytingi va yutuqlar jadvali tez orada ishga tushadi!
      </p>
    </div>
  );
}
