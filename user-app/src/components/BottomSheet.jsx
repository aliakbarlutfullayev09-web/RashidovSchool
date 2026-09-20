import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function BottomSheet({ 
  isOpen, 
  onClose, 
  lesson, 
  progress, 
  course, 
  onWatch, 
  onBuy, 
  onRewatch, 
  onRetake, 
  onAnalysis 
}) {
  const handleOpenChannel = () => {
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.openTelegramLink('https://t.me/rashidov_biologiya');
    } else {
      window.open('https://t.me/rashidov_biologiya', '_blank');
    }
  };

  const isLocked = progress?.is_unlocked === false && !lesson?.is_free;
  const isCompleted = progress?.stars > 0;
  const isAvailable = !isLocked && !isCompleted;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
          />
          
          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 bg-[#1C1C1E] rounded-t-[28px] z-50 flex flex-col max-h-[90vh]"
          >
            {/* Drag Handle */}
            <div className="w-full flex justify-center pt-3 pb-2 cursor-pointer" onClick={onClose}>
              <div className="w-10 h-1 bg-white/20 rounded-full" />
            </div>

            <div className="p-6 overflow-y-auto">
              {lesson && (
                <h3 className="text-white font-bold text-xl mb-4 leading-tight">{lesson.title}</h3>
              )}

              {/* Mode 1: Locked Lesson */}
              {isLocked && (
                <div className="flex flex-col gap-4">
                  <div className="bg-[#2C2C2E] rounded-2xl p-4 text-center">
                    <span className="text-4xl mb-2 block">🔒</span>
                    <p className="text-white text-[15px]">
                      Bu darsni ko'rish uchun ustozning rasmiy kanaliga a'zo bo'ling
                    </p>
                  </div>
                  <button 
                    onClick={handleOpenChannel}
                    className="w-full bg-[#007AFF] text-white font-semibold py-3.5 rounded-xl text-[16px]"
                  >
                    Kanalga a'zo bo'lish
                  </button>
                  <button 
                    onClick={() => {
                      // Check implementation
                      if (onBuy) onBuy(lesson);
                    }}
                    className="w-full bg-[#2C2C2E] text-white font-semibold py-3.5 rounded-xl text-[16px]"
                  >
                    Tekshirish (+100 XP)
                  </button>
                </div>
              )}

              {/* Mode 2: Available (unlocked, not completed) */}
              {isAvailable && (
                <div className="flex flex-col gap-4">
                  <p className="text-[#8E8E93] text-[14px]">
                    Ushbu darsni ko'rish va testlarni ishlash uchun tayyormisiz?
                  </p>
                  <button 
                    onClick={() => onWatch && onWatch(lesson)}
                    className="w-full bg-[#007AFF] text-white font-semibold py-3.5 rounded-xl text-[16px] flex items-center justify-center gap-2"
                  >
                    <span>▶️</span> Boshlash
                  </button>
                </div>
              )}

              {/* Mode 3: Completed */}
              {isCompleted && (
                <div className="flex flex-col gap-4">
                  <div className="bg-[#2C2C2E] rounded-2xl p-4 flex flex-col items-center">
                    <div className="text-4xl mb-2 flex gap-1">
                      {[1, 2, 3].map(star => (
                        <span key={star} className={star <= progress.stars ? "text-yellow-400" : "text-white/20"}>
                          ★
                        </span>
                      ))}
                    </div>
                    <p className="text-white font-semibold">
                      Sizning natijangiz: {progress.score || 0}%
                    </p>
                  </div>
                  
                  <div className="flex flex-col gap-3 mt-2">
                    <button 
                      onClick={() => onAnalysis && onAnalysis(lesson)}
                      className="w-full bg-[#007AFF] text-white font-semibold py-3.5 rounded-xl text-[16px] flex items-center justify-center gap-2"
                    >
                      <span>🔍</span> Tahlil
                    </button>
                    <button 
                      onClick={() => onRetake && onRetake(lesson)}
                      className="w-full bg-[#2C2C2E] text-white font-semibold py-3.5 rounded-xl text-[16px] flex items-center justify-center gap-2"
                    >
                      <span>📝</span> Testni qayta topshirish
                    </button>
                    <button 
                      onClick={() => onRewatch && onRewatch(lesson)}
                      className="w-full bg-[#2C2C2E] text-white font-semibold py-3.5 rounded-xl text-[16px] flex items-center justify-center gap-2"
                    >
                      <span>📹</span> Qayta ko'rish
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
