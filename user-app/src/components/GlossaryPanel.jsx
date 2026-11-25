import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, BookOpen, Clock, Lock, Sparkles } from 'lucide-react';
import { formatTime } from '../utils/formatters';
import { useHaptic } from '../hooks/useHaptic';
import { useLanguage } from '../context/LanguageContext';

export default function GlossaryPanel({
  isOpen,
  onClose,
  terms = [],
  maxWatchedSeconds = 0,
  onSeekToTimestamp,
  onBlockedTimestamp
}) {
  const { impactLight, impactMedium } = useHaptic();
  const { lang } = useLanguage();

  const handleTermClick = (term) => {
    if (term.timestamp === undefined || term.timestamp === null) return;
    impactLight();
    
    if (term.timestamp <= maxWatchedSeconds) {
      if (onSeekToTimestamp) {
        onSeekToTimestamp(term.timestamp);
      }
      onClose();
    } else {
      impactMedium();
      if (onBlockedTimestamp) {
        onBlockedTimestamp(term.timestamp);
      }
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex justify-end select-none">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Side Drawer Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            drag="x"
            dragConstraints={{ left: 0, right: 300 }}
            dragElastic={0.1}
            onDragEnd={(_, info) => {
              if (info.offset.x > 80 || info.velocity.x > 300) {
                onClose();
              }
            }}
            className="relative z-10 w-full max-w-sm h-full bg-[#121214] border-l border-white/[0.08] shadow-2xl flex flex-col justify-between pt-[calc(env(safe-area-inset-top,16px)+12px)] pb-[calc(env(safe-area-inset-bottom,16px)+16px)]"
          >
            {/* Header */}
            <div className="px-5 py-3 border-b border-white/[0.06] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-sm leading-tight">
                    {lang === 'ru' ? 'Термины урока' : 'Dars terminlari'}
                  </h3>
                  <span className="text-[11px] text-[#8E8E93]">
                    {terms.length > 0
                      ? (lang === 'ru' ? `${terms.length} терминов` : `${terms.length} ta termin`)
                      : (lang === 'ru' ? 'Словарь' : "Lug'at")}
                  </span>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-[#1C1C1E] border border-white/10 flex items-center justify-center text-[#8E8E93] hover:text-white active:scale-95 transition-transform"
                title={lang === 'ru' ? 'Закрыть' : 'Yopish'}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Terms List Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
              {terms && terms.length > 0 ? (
                terms.map((item, idx) => {
                  const hasTimestamp = item.timestamp !== undefined && item.timestamp !== null;
                  const isAccessible = hasTimestamp && item.timestamp <= maxWatchedSeconds;

                  return (
                    <div
                      key={item.id || idx}
                      onClick={() => hasTimestamp && handleTermClick(item)}
                      className={`p-3.5 rounded-2xl border transition-all ${
                        hasTimestamp ? 'cursor-pointer active:scale-[0.98]' : ''
                      } ${
                        isAccessible
                          ? 'bg-[#1C1C1E] border-purple-500/30 hover:border-purple-500/60'
                          : hasTimestamp
                          ? 'bg-[#18181A] border-white/5 opacity-80'
                          : 'bg-[#1C1C1E] border-white/5'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="text-white font-bold text-xs tracking-wide">
                          {item.term}
                        </span>

                        {hasTimestamp && (
                          <div
                            className={`flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                              isAccessible
                                ? 'bg-purple-500/20 border-purple-400/40 text-purple-300 font-bold'
                                : 'bg-[#2C2C2E] border-white/5 text-[#8E8E93]'
                            }`}
                          >
                            {isAccessible ? (
                              <Clock className="w-2.5 h-2.5" />
                            ) : (
                              <Lock className="w-2.5 h-2.5 text-amber-400" />
                            )}
                            <span>{formatTime(item.timestamp)}</span>
                          </div>
                        )}
                      </div>

                      <p className="text-[11px] text-[#A1A1A6] leading-relaxed">
                        {item.definition}
                      </p>

                      {hasTimestamp && !isAccessible && (
                        <span className="block mt-2 text-[10px] text-amber-400/80 font-medium">
                          {lang === 'ru'
                            ? 'Посмотрите видео до этого момента, чтобы открыть'
                            : 'Ushbu qismni ko‘rish uchun darsni davom ettiring'}
                        </span>
                      )}
                    </div>
                  );
                })
              ) : (
                /* Honest Empty State */
                <div className="h-full flex flex-col items-center justify-center text-center p-6 my-auto">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-3 text-[#8E8E93]">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <h4 className="text-white font-bold text-xs mb-1">
                    {lang === 'ru' ? 'Словарь пока пуст' : 'Lug‘at hozircha bo‘sh'}
                  </h4>
                  <p className="text-[11px] text-[#8E8E93] max-w-[200px] leading-relaxed">
                    {lang === 'ru'
                      ? 'Словарь терминов для этого урока ещё не добавлен.'
                      : 'Ushbu dars uchun terminlar lug‘ati hali kiritilmagan.'}
                  </p>
                </div>
              )}
            </div>

            {/* Bottom Swipe Hint */}
            <div className="px-5 pt-3 border-t border-white/[0.04] text-center">
              <span className="text-[10px] text-[#636366]">
                {lang === 'ru'
                  ? 'Смахните вправо, чтобы закрыть'
                  : 'Yopish uchun o‘ng tomonga suring (swipe)'}
              </span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
