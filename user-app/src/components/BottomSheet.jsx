import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, Clock, HelpCircle, CheckCircle, ExternalLink, ShieldAlert, Sparkles, FileText, RotateCcw } from 'lucide-react';
import { useHaptic } from '../hooks/useHaptic';

export default function BottomSheet({ 
  isOpen, 
  onClose, 
  lesson, 
  progress, 
  onWatch, 
  onRewatch, 
  onRetake, 
  onAnalysis 
}) {
  const { impactMedium, notificationSuccess } = useHaptic();

  if (!lesson) return null;

  const handleOpenChannel = () => {
    impactMedium();
    const url = 'https://t.me/rashidov_biologiya';
    if (window.Telegram?.WebApp?.openTelegramLink) {
      window.Telegram.WebApp.openTelegramLink(url);
    } else {
      window.open(url, '_blank');
    }
  };

  const handleCheckSubscription = () => {
    impactMedium();
    notificationSuccess();
    alert("A'zolik tasdiqlandi! +100 Neyron hisobingizga qo'shildi.");
    if (onWatch) onWatch(lesson);
  };

  const isLocked = progress?.is_unlocked === false && !lesson?.is_free;
  const isCompleted = progress?.stars > 0;
  const isAvailable = !isLocked && !isCompleted;

  // Sample lesson bullets if not provided
  const summaryBullets = lesson.summary_bullets || [
    "Mavzuning eng muhim tayanch tushunchalari va terminlari",
    "DTM va Milliy Sertifikatda ko'p uchraydigan test savollari tahlili",
    "Interaktiv stop-test savollari orqali bilimlarni mustahkamlash"
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
          />
          
          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 300 }}
            className="w-full max-w-lg bg-[#1C1C1E] border-t border-white/10 rounded-t-[32px] z-50 flex flex-col max-h-[88vh] shadow-2xl overflow-hidden relative"
          >
            {/* Drag Handle */}
            <div className="w-full flex justify-center pt-3 pb-2 cursor-pointer" onClick={onClose}>
              <div className="w-10 h-1 bg-white/20 rounded-full" />
            </div>

            <div className="p-6 overflow-y-auto space-y-5 pb-8">
              {/* Thumbnail / Header */}
              <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-[#2C2C2E] border border-white/5 shadow-md">
                {lesson.thumbnail_url ? (
                  <img src={lesson.thumbnail_url} alt={lesson.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-blue-900/40 via-purple-900/30 to-black flex items-center justify-center">
                    <span className="text-4xl">🧬</span>
                  </div>
                )}

                <div className="absolute top-2.5 left-2.5 bg-black/70 backdrop-blur-md text-white text-[11px] font-bold px-2.5 py-1 rounded-full border border-white/10">
                  {lesson.order_index || 1}-Dars
                </div>

                <div className="absolute bottom-2.5 right-2.5 bg-black/80 backdrop-blur-md text-white text-xs font-semibold px-2 py-0.5 rounded-md flex items-center gap-1">
                  <Clock className="w-3 h-3 text-[#8E8E93]" />
                  <span>{lesson.duration || '14:20'}</span>
                </div>
              </div>

              {/* Title & Metadata */}
              <div>
                <h3 className="text-white font-bold text-xl leading-snug mb-1">
                  {lesson.title}
                </h3>
                <div className="flex items-center gap-3 text-xs text-[#8E8E93]">
                  <span>Rashidov Biologiya</span>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-blue-400 font-medium">
                    <HelpCircle className="w-3.5 h-3.5" />
                    {lesson.test_question_count || 10} ta test savoli
                  </span>
                </div>
              </div>

              {/* Lesson Summary Bullets */}
              <div className="bg-[#2C2C2E]/60 border border-white/5 rounded-2xl p-4 space-y-2">
                <span className="text-xs font-bold text-[#8E8E93] uppercase tracking-wider block mb-2">
                  Darsda nimalarni o'rganasiz:
                </span>
                {summaryBullets.map((bullet, i) => (
                  <div key={i} className="flex items-start gap-2.5 text-xs text-white/90 leading-relaxed">
                    <span className="text-emerald-400 font-bold mt-0.5">•</span>
                    <span>{bullet}</span>
                  </div>
                ))}
              </div>

              {/* ACTIONS: Mode 1 - Locked Channel Gate */}
              {isLocked && (
                <div className="bg-gradient-to-br from-amber-500/10 to-red-500/10 border border-amber-500/20 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center gap-2.5 text-amber-300 font-bold text-sm">
                    <ShieldAlert className="w-5 h-5 flex-shrink-0" />
                    <span>Darsni ko'rish uchun kanalga a'zo bo'ling</span>
                  </div>
                  <p className="text-xs text-[#8E8E93] leading-relaxed">
                    Ushbu dars @rashidov_biologiya kanali a'zolari uchun bepul ochiq.
                  </p>

                  <div className="flex flex-col gap-2 pt-1">
                    <button
                      onClick={handleOpenChannel}
                      className="w-full bg-[#007AFF] hover:bg-blue-600 text-white font-bold py-3.5 px-4 rounded-xl text-sm flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-blue-500/20"
                    >
                      <span>📢 @rashidov_biologiya kanaliga a'zo bo'lish</span>
                      <ExternalLink className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleCheckSubscription}
                      className="w-full bg-[#2C2C2E] hover:bg-[#3A3A3C] text-white font-bold py-3.5 px-4 rounded-xl text-sm flex items-center justify-center gap-2 active:scale-95 transition-all"
                    >
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                      <span>A'zolikni tekshirish (+100 Neyron)</span>
                    </button>
                  </div>
                </div>
              )}

              {/* ACTIONS: Mode 2 - Available */}
              {isAvailable && (
                <button
                  onClick={() => onWatch && onWatch(lesson)}
                  className="w-full bg-[#007AFF] hover:bg-blue-600 text-white font-bold py-4 px-6 rounded-2xl text-base flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 active:scale-95 transition-all"
                >
                  <Play className="w-5 h-5 fill-white" />
                  <span>Videoni ko'rish</span>
                </button>
              )}

              {/* ACTIONS: Mode 3 - Completed */}
              {isCompleted && (
                <div className="space-y-3">
                  <div className="bg-[#2C2C2E] border border-white/5 rounded-2xl p-4 flex items-center justify-between">
                    <div>
                      <span className="text-xs text-[#8E8E93] block">Sizning natijangiz:</span>
                      <span className="text-white font-bold text-base">{progress?.score || 95}% ball</span>
                    </div>
                    <div className="flex gap-1 text-2xl">
                      {[1, 2, 3].map(star => (
                        <span key={star} className={star <= (progress?.stars || 3) ? "text-amber-400" : "text-white/20"}>
                          ★
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => onAnalysis && onAnalysis(lesson)}
                      className="bg-[#2C2C2E] hover:bg-[#3A3A3C] text-white font-bold py-3 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                    >
                      <FileText className="w-4 h-4 text-purple-400" />
                      <span>Xatolar tahlili</span>
                    </button>

                    <button
                      onClick={() => onRewatch && onRewatch(lesson)}
                      className="bg-[#007AFF] hover:bg-blue-600 text-white font-bold py-3 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>Qayta ko'rish</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
