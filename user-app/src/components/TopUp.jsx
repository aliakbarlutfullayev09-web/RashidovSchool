import React, { useState } from 'react';
import { X, Star, Ticket, Target, CheckCircle2 } from 'lucide-react';

const PACKAGES = [
  { crystals: 25000, priceUzs: 25000, stars: 100 },
  { crystals: 100000, priceUzs: 100000, stars: 400 },
  { crystals: 250000, priceUzs: 250000, stars: 1000 },
  { crystals: 500000, priceUzs: 500000, stars: 2000 },
  { crystals: 1000000, priceUzs: 1000000, stars: 4000 },
];

const VAZIFALAR = [
  { id: 1, title: "Telegram kanalga a'zo bo'lish", reward: 500, icon: "📢", completed: false },
  { id: 2, title: "1 ta darsni oxirigacha ko'rish", reward: 150, icon: "📹", completed: true },
  { id: 3, title: "Do'stingizni taklif qilish", reward: 1000, icon: "👥", completed: false },
  { id: 4, title: "Shaxsiy profilni to'ldirish", reward: 200, icon: "👤", completed: false },
];

export default function TopUp({ user, onBack }) {
  const [gateway, setGateway] = useState('click'); // 'click' | 'stars' | 'promokod' | 'vazifalar'
  const [promoCode, setPromoCode] = useState('');
  const [promoStatus, setPromoStatus] = useState('idle');

  const handlePurchase = (pkg) => {
    if (gateway === 'click') {
      const url = `https://my.click.uz/services/pay?service_id=YOUR_SERVICE_ID&merchant_id=YOUR_MERCHANT_ID&amount=${pkg.priceUzs}&transaction_param=${user?.id || 'uzb'}`;
      if (window.Telegram?.WebApp?.openLink) {
        window.Telegram.WebApp.openLink(url);
      } else {
        window.open(url, '_blank');
      }
    } else if (gateway === 'stars') {
      console.log('Purchase with Stars:', pkg.stars);
    }
  };

  const handlePromo = () => {
    if (!promoCode.trim()) return;
    setPromoStatus('loading');
    setTimeout(() => {
      setPromoStatus('success');
      setTimeout(() => {
        setPromoStatus('idle');
        setPromoCode('');
      }, 2000);
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex flex-col items-center justify-end md:justify-center">
      
      {/* Modal Container */}
      <div className="bg-[#151515] w-full max-w-md md:rounded-[32px] rounded-t-[32px] p-5 pt-8 relative flex flex-col max-h-[90vh] shadow-2xl border border-white/5">
        
        {/* Close Button */}
        <button 
          onClick={onBack} 
          className="absolute top-4 right-4 w-8 h-8 bg-white/5 hover:bg-white/10 rounded-full flex items-center justify-center text-white/70 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Brain Header */}
        <div className="flex justify-center mb-4">
          <div className="text-[100px] leading-none select-none drop-shadow-[0_0_40px_rgba(255,50,150,0.4)] hover:scale-105 transition-transform cursor-default">
            🧠
          </div>
        </div>
        
        <h2 className="text-white text-[22px] font-extrabold text-center mb-6">
          Neyronlarni hoziroq xarid qiling
        </h2>

        {/* Gateways Selector */}
        <div className="flex gap-2.5 overflow-x-auto no-scrollbar mb-6 pb-2 px-1">
          
          {/* 1. Click */}
          <button 
            onClick={() => setGateway('click')}
            className={`flex flex-col items-start p-3 min-w-[90px] rounded-[18px] border transition-all ${
              gateway === 'click' ? 'border-[#3B82F6] bg-[#1C1C1E]' : 'border-white/[0.06] bg-transparent hover:bg-white/5'
            }`}
          >
            <div className="mb-2">
              <div className="w-[18px] h-[18px] rounded-full border-[4px] border-[#007AFF]"></div>
            </div>
            <div className="text-white font-bold text-[13px] leading-tight">Click</div>
            <div className="text-[#8E8E93] font-medium text-[10px] leading-tight mt-0.5">UZS 🇺🇿</div>
          </button>

          {/* 2. Stars */}
          <button 
            onClick={() => setGateway('stars')}
            className={`flex flex-col items-start p-3 min-w-[90px] rounded-[18px] border transition-all ${
              gateway === 'stars' ? 'border-[#3B82F6] bg-[#1C1C1E]' : 'border-white/[0.06] bg-transparent hover:bg-white/5'
            }`}
          >
            <div className="mb-2">
              <Star className="w-5 h-5 text-[#FFD60A] fill-[#FFD60A]" />
            </div>
            <div className="text-white font-bold text-[13px] leading-tight">Stars</div>
            <div className="text-[#8E8E93] font-medium text-[10px] leading-tight mt-0.5">TG stars</div>
          </button>

          {/* 3. Promokod */}
          <button 
            onClick={() => setGateway('promokod')}
            className={`flex flex-col items-start p-3 min-w-[90px] rounded-[18px] border transition-all ${
              gateway === 'promokod' ? 'border-[#3B82F6] bg-[#1C1C1E]' : 'border-white/[0.06] bg-transparent hover:bg-white/5'
            }`}
          >
            <div className="mb-2">
              <Ticket className="w-5 h-5 text-[#A855F7]" />
            </div>
            <div className="text-white font-bold text-[13px] leading-tight">Promokod</div>
            <div className="text-[#8E8E93] font-medium text-[10px] leading-tight mt-0.5">Kupon</div>
          </button>

          {/* 4. Vazifalar */}
          <button 
            onClick={() => setGateway('vazifalar')}
            className={`flex flex-col items-start p-3 min-w-[90px] rounded-[18px] border transition-all ${
              gateway === 'vazifalar' ? 'border-[#3B82F6] bg-[#1C1C1E]' : 'border-white/[0.06] bg-transparent hover:bg-white/5'
            }`}
          >
            <div className="mb-2">
              <Target className="w-5 h-5 text-[#10B981]" />
            </div>
            <div className="text-white font-bold text-[13px] leading-tight">Vazifalar</div>
            <div className="text-[#8E8E93] font-medium text-[10px] leading-tight mt-0.5">Bepul</div>
          </button>

        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto no-scrollbar min-h-[300px]">
          
          {(gateway === 'click' || gateway === 'stars') && (
            <div className="flex flex-col gap-2">
              {PACKAGES.map((pkg, idx) => (
                <div 
                  key={idx}
                  onClick={() => handlePurchase(pkg)}
                  className="flex items-center justify-between p-4 bg-[#1C1C1E] rounded-[16px] cursor-pointer border border-transparent hover:border-white/10 active:scale-[0.98] transition-all"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-[22px] drop-shadow-md">🧠</span>
                    <span className="text-white font-bold text-[15px]">{pkg.crystals.toLocaleString('ru-RU')}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-white/90 font-semibold text-[14px]">
                    {gateway === 'click' ? (
                      <span>{pkg.priceUzs.toLocaleString('ru-RU')} UZS</span>
                    ) : (
                      <>
                        <span>{pkg.stars}</span>
                        <Star className="w-4 h-4 text-[#FFD60A] fill-[#FFD60A]" />
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {gateway === 'promokod' && (
            <div className="flex flex-col items-center justify-center h-full pt-4 px-2">
              <p className="text-[#8E8E93] text-sm text-center mb-6">Maxsus promokodni kiriting va bepul neyronlarga ega bo'ling.</p>
              
              <div className="w-full relative">
                <input 
                  type="text" 
                  placeholder="BIO2026-UZB" 
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                  disabled={promoStatus !== 'idle'}
                  className="w-full bg-[#1C1C1E] border border-white/5 rounded-2xl p-4 text-center text-white font-mono uppercase text-lg tracking-widest outline-none focus:border-[#3B82F6] transition-colors mb-4 placeholder:text-white/20" 
                />
              </div>

              <button 
                onClick={handlePromo}
                disabled={promoStatus !== 'idle' || !promoCode}
                className="w-full bg-[#007AFF] text-white py-4 rounded-2xl font-bold text-[16px] disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {promoStatus === 'loading' ? (
                  'Kuting...'
                ) : promoStatus === 'success' ? (
                  <><CheckCircle2 className="w-5 h-5" /> Faollashtirildi!</>
                ) : (
                  'Faollashtirish'
                )}
              </button>
            </div>
          )}

          {gateway === 'vazifalar' && (
            <div className="flex flex-col gap-2">
              <div className="bg-[#10B981]/10 border border-[#10B981]/20 rounded-2xl p-4 mb-2 flex items-start gap-3">
                <Target className="w-6 h-6 text-[#10B981] flex-shrink-0 mt-0.5" />
                <p className="text-[#8E8E93] text-xs leading-snug">
                  Kanalga a'zo bo'lish yoki do'stlarni taklif qilish orqali <span className="text-white font-semibold">bepul neyronlarni</span> qo'lga kiriting.
                </p>
              </div>
              {VAZIFALAR.map((task) => (
                <div 
                  key={task.id}
                  className={`flex items-center justify-between p-4 rounded-[16px] border transition-all ${
                    task.completed 
                      ? 'bg-[#1C1C1E]/50 border-white/5 opacity-70' 
                      : 'bg-[#1C1C1E] border-transparent hover:border-white/10 cursor-pointer'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`text-xl p-2 rounded-[12px] ${task.completed ? 'bg-white/5' : 'bg-[#2C2C2E]'}`}>
                      {task.icon}
                    </div>
                    <div className="flex flex-col">
                      <span className={`font-medium text-[14px] leading-tight ${task.completed ? 'text-white/70 line-through' : 'text-white'}`}>
                        {task.title}
                      </span>
                      <div className="flex items-center gap-1 mt-1">
                        <span className="text-[12px] text-[#34C759] font-bold">+{task.reward}</span>
                        <span className="text-[10px]">🧠</span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    {task.completed ? (
                      <div className="w-6 h-6 rounded-full bg-[#34C759] flex items-center justify-center">
                        <CheckCircle2 className="w-4 h-4 text-white" />
                      </div>
                    ) : (
                      <button className="bg-[#007AFF] hover:bg-blue-600 text-white text-[12px] font-bold py-1.5 px-3 rounded-full transition-colors">
                        Bajarish
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
