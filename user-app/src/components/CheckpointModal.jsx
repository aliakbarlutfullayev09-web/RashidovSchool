import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, Sparkles } from 'lucide-react';
import { useHaptic } from '../hooks/useHaptic';
import { useLanguage } from '../context/LanguageContext';

export default function CheckpointModal({ checkpoint, onAnswer }) {
  const { lang } = useLanguage();
  const [selected, setSelected] = useState(null);
  const [status, setStatus] = useState(null); // 'correct' | 'wrong'
  const { notificationSuccess, notificationError, impactMedium } = useHaptic();

  if (!checkpoint) return null;

  const handleSelect = (option) => {
    if (selected) return;
    setSelected(option);
    impactMedium();

    const isCorrect = 
      option === checkpoint.correct_option ||
      (checkpoint.correct_option !== undefined && checkpoint.options?.[checkpoint.correct_option] === option) ||
      (checkpoint.correct_option_index !== undefined && checkpoint.options?.[checkpoint.correct_option_index] === option);
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
        className="absolute inset-0 z-[120] bg-black/85 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center select-none"
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          className="w-full max-w-md bg-[#1C1C1E] border border-white/10 rounded-[28px] p-6 shadow-2xl relative"
        >
          {/* Badge */}
          <div className="inline-flex items-center gap-1.5 bg-amber-500/20 border border-amber-500/30 text-amber-300 px-3 py-1 rounded-full text-xs font-bold mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{lang === 'ru' ? 'Вопрос по видео' : 'Stop-Test Savoli'}</span>
          </div>

          <h3 className="text-white font-bold text-lg leading-snug mb-6">
            {checkpoint.question || checkpoint.question_text}
          </h3>

          {/* Option Pills */}
          <div className="space-y-3 w-full">
            {checkpoint.options.map((option, idx) => {
              const isSelected = selected === option;
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
                  whileTap={{ scale: 0.98 }}
                  animate={isSelected && status === 'wrong' ? { x: [-8, 8, -6, 6, 0] } : {}}
                  transition={{ duration: 0.3 }}
                  onClick={() => handleSelect(option)}
                  disabled={!!selected}
                  className={`w-full p-4 rounded-2xl border text-left text-sm font-semibold flex items-center justify-between transition-colors ${bg}`}
                >
                  <span>{option}</span>
                  {isSelected && status === 'correct' && (
                    <div className="flex items-center gap-1 text-xs font-bold text-emerald-200">
                      <span>+50 🧠</span>
                      <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                    </div>
                  )}
                  {isSelected && status === 'wrong' && (
                    <XCircle className="w-4 h-4 text-white" />
                  )}
                </motion.button>
              );
            })}
          </div>

          {status === 'wrong' && (
            <p className="text-xs text-red-300 mt-4 font-medium animate-pulse">
              {lang === 'ru'
                ? 'Неверно! Возвращаемся к фрагменту объяснения...'
                : "❌ Noto'g'ri! Tushuntirish qismiga qaytarilmoqda..."}
            </p>
          )}
          {status === 'correct' && (
            <p className="text-xs text-emerald-300 mt-4 font-medium">
              {lang === 'ru'
                ? 'Отлично! Продолжаем просмотр видео...'
                : '✅ Ajoyib! Video davom etmoqda...'}
            </p>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
