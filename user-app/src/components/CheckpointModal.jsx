import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, HelpCircle } from 'lucide-react';
import { useHaptic } from '../hooks/useHaptic';
import { useLanguage } from '../context/LanguageContext';

export default function CheckpointModal({ checkpoint, onAnswer }) {
  const { lang } = useLanguage();
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [status, setStatus] = useState(null); // 'correct' | 'wrong'
  const { notificationSuccess, notificationError, impactMedium } = useHaptic();

  // Reset selection whenever a new/re-triggered checkpoint opens
  useEffect(() => {
    setSelectedIdx(null);
    setStatus(null);
  }, [checkpoint?.id, checkpoint?.trigger_time_sec]);

  if (!checkpoint) return null;

  const options = Array.isArray(checkpoint.options) ? checkpoint.options : [];
  const rawCorrect = checkpoint.correct_option_index ?? checkpoint.correct_option;

  const isOptionCorrect = (option, idx) => {
    if (typeof rawCorrect === 'number') return idx === rawCorrect;
    if (rawCorrect !== undefined && rawCorrect !== null && rawCorrect !== '' && !Number.isNaN(Number(rawCorrect))) {
      return idx === Number(rawCorrect);
    }
    return option === rawCorrect;
  };

  const handleSelect = (option, idx) => {
    if (selectedIdx !== null) return;
    setSelectedIdx(idx);
    impactMedium();

    const isCorrect = isOptionCorrect(option, idx);
    setStatus(isCorrect ? 'correct' : 'wrong');

    if (isCorrect) {
      notificationSuccess();
    } else {
      notificationError();
    }

    setTimeout(() => {
      onAnswer(isCorrect);
    }, 1200);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[150] bg-black/85 backdrop-blur-xl overflow-y-auto select-none"
      >
        <div className="min-h-full w-full flex items-center justify-center p-3 sm:p-6">
          <motion.div
            data-testid="checkpoint-modal-card"
            initial={{ scale: 0.92, y: 16 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.92, y: 16 }}
            className="w-full max-w-md [@media(max-height:520px)]:max-w-xl bg-[#1C1C1E] border border-white/10 rounded-[24px] sm:rounded-[28px] p-4 sm:p-6 shadow-2xl relative text-center my-auto"
          >
            {/* Badge */}
            <div className="inline-flex items-center gap-1.5 bg-amber-500/20 border border-amber-500/30 text-amber-300 px-3 py-1 rounded-full text-xs font-bold mb-2.5 sm:mb-4">
              <HelpCircle className="w-3.5 h-3.5" />
              <span>{lang === 'ru' ? 'Решите вопрос' : 'Savolni yeching'}</span>
            </div>

            <h3 className="text-white font-bold text-base sm:text-lg leading-snug mb-3.5 sm:mb-6">
              {checkpoint.question || checkpoint.question_text}
            </h3>

            {/* Option Pills (2-col on short landscape screens so option D is never clipped off-screen) */}
            <div className="grid grid-cols-1 [@media(max-height:520px)]:grid-cols-2 gap-2.5 sm:gap-3 w-full">
              {options.map((option, idx) => {
                const isSelected = selectedIdx === idx;
                let bg = "bg-[#2C2C2E] border-white/5 text-white";

                if (isSelected) {
                  if (status === 'correct') {
                    bg = "bg-emerald-600 border-emerald-400 text-white shadow-lg shadow-emerald-500/30";
                  } else if (status === 'wrong') {
                    bg = "bg-red-600 border-red-400 text-white shadow-lg shadow-red-500/30";
                  }
                }

                return (
                  <motion.button
                    key={idx}
                    type="button"
                    data-testid={`checkpoint-option-${idx}`}
                    whileTap={{ scale: 0.98 }}
                    animate={isSelected && status === 'wrong' ? { x: [-8, 8, -6, 6, 0] } : {}}
                    transition={{ duration: 0.3 }}
                    onClick={() => handleSelect(option, idx)}
                    disabled={selectedIdx !== null}
                    className={`w-full p-3.5 sm:p-4 [@media(max-height:520px)]:py-2.5 [@media(max-height:520px)]:px-3.5 rounded-2xl border text-left text-xs sm:text-sm font-semibold flex items-center justify-between gap-2 transition-colors cursor-pointer ${bg}`}
                  >
                    <span className="break-words">{option}</span>
                    {isSelected && status === 'correct' && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-200 shrink-0" />
                    )}
                    {isSelected && status === 'wrong' && (
                      <XCircle className="w-4 h-4 text-white shrink-0" />
                    )}
                  </motion.button>
                );
              })}
            </div>

            {status === 'wrong' && (
              <p className="text-xs text-red-300 mt-3 sm:mt-4 font-medium animate-pulse">
                {lang === 'ru'
                  ? 'Неверно! Возвращаемся к фрагменту объяснения...'
                  : "❌ Noto'g'ri! Tushuntirish qismiga qaytarilmoqda..."}
              </p>
            )}
            {status === 'correct' && (
              <p className="text-xs text-emerald-300 mt-3 sm:mt-4 font-medium">
                {lang === 'ru'
                  ? 'Отлично! Продолжаем просмотр видео...'
                  : '✅ Ajoyib! Video davom etmoqda...'}
              </p>
            )}
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
