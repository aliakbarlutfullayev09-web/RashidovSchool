import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, BookOpen, AlertCircle, CheckCircle } from 'lucide-react';

const SAMPLE_MISTAKES = [
  {
    id: 1,
    topic: "Sitologiya: Ribosomalar biosintezi",
    question: "Oqsil biosintezida qaysi organoid birlamchi polipeptid zanjirini hosil qiladi?",
    userAnswer: "Golji majmuasi",
    correctAnswer: "Ribosoma",
    textbookRef: "9-sinf Biologiya darsligi, 2-bob, §8, 34-bet",
    hint: "Polipeptid zanjirlari ribosomaning katta va kichik subbirliklari birlashganda translatsiya jarayonida sintezlanadi."
  },
  {
    id: 2,
    topic: "Genetika: Monoduragay chatishtirish",
    question: "Aa x Aa genotipli organizmlar chatishtirilganda fenotip bo'yicha ajralish nisbati qanday?",
    userAnswer: "1 : 2 : 1",
    correctAnswer: "3 : 1",
    textbookRef: "10-sinf Biologiya darsligi, 4-bob, §17, 78-bet",
    hint: "Fenotip bo'yicha 3:1 (dominant va retsessiv belgilar), genotip bo'yicha esa 1:2:1 nisbatda bo'ladi."
  }
];

export default function MistakesModal({ isOpen, onClose, mistakes = SAMPLE_MISTAKES }) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, y: '100%' }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: '100%' }}
          transition={{ type: "spring", damping: 26, stiffness: 320 }}
          className="w-full max-w-lg bg-[#161618] border border-white/10 rounded-t-[32px] sm:rounded-[32px] overflow-hidden flex flex-col max-h-[90vh] shadow-2xl relative"
        >
          {/* Header */}
          <div className="pt-6 pb-4 px-6 flex items-center justify-between border-b border-white/5 bg-[#1C1C1E]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-lg">
                🔬
              </div>
              <div>
                <h3 className="text-white font-bold text-base leading-tight">Mening xatolarim — Tahlil</h3>
                <span className="text-[11px] text-[#8E8E93]">Darslik bo'yicha ko'rsatmalar</span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/70"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-5 overflow-y-auto space-y-4 pb-8">
            {mistakes && mistakes.length > 0 ? (
              mistakes.map((item) => (
                <div
                  key={item.id}
                  className="bg-[#1C1C1E] border border-white/5 rounded-2xl p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-purple-400 bg-purple-500/10 px-2.5 py-0.5 rounded-full">
                      {item.topic}
                    </span>
                    <span className="text-[11px] text-[#8E8E93] flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 text-red-400" /> Xato
                    </span>
                  </div>

                  <p className="text-sm text-white font-medium leading-snug">
                    {item.question}
                  </p>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-red-500/10 border border-red-500/20 p-2.5 rounded-xl">
                      <span className="text-[#8E8E93] block text-[10px] mb-0.5">Sizning javobingiz:</span>
                      <span className="text-red-400 font-semibold">{item.userAnswer}</span>
                    </div>
                    <div className="bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-xl">
                      <span className="text-[#8E8E93] block text-[10px] mb-0.5">To'g'ri javob:</span>
                      <span className="text-emerald-400 font-semibold">{item.correctAnswer}</span>
                    </div>
                  </div>

                  {/* Textbook Ref & Hint */}
                  <div className="bg-[#242426] border border-white/5 rounded-xl p-3 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs text-amber-300 font-semibold">
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>{item.textbookRef}</span>
                    </div>
                    <p className="text-[11px] text-[#8E8E93] leading-relaxed">
                      💡 {item.hint}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-12 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-2xl mb-3">
                  🎉
                </div>
                <h4 className="text-white font-bold text-base mb-1">Hozircha xatoliklar yo'q</h4>
                <p className="text-xs text-[#8E8E93] max-w-[220px]">
                  Ajoyib natija! Testlarni ishlashda davom eting va bilimingizni mustahkamlang.
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
