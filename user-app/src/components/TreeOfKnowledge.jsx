import React from 'react';
import { motion } from 'framer-motion';
import { Play, Sparkles } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function TreeOfKnowledge({ 
  completedCount = 7, 
  totalCount = 24, 
  onContinue 
}) {
  const { t } = useLanguage();
  const percentage = Math.min(100, Math.max(0, Math.round((completedCount / (totalCount || 1)) * 100)));

  // Determine stage based on percentage
  let stageName = t('urug');
  let stageLevel = 1;
  let treeEmoji = '🌱';

  if (percentage >= 80) {
    stageName = t('donishmand_daraxt');
    stageLevel = 5;
    treeEmoji = '🌳';
  } else if (percentage >= 60) {
    stageName = t('gullagan_daraxt');
    stageLevel = 4;
    treeEmoji = '🌸';
  } else if (percentage >= 40) {
    stageName = t('kochat');
    stageLevel = 3;
    treeEmoji = '🌿';
  } else if (percentage >= 20) {
    stageName = t('nihol');
    stageLevel = 2;
    treeEmoji = '🪴';
  }

  // Floating ambient bio-particles
  const particles = [
    { id: 1, x: '15%', y: '25%', size: 6, delay: 0 },
    { id: 2, x: '80%', y: '30%', size: 8, delay: 0.5 },
    { id: 3, x: '25%', y: '75%', size: 5, delay: 1 },
    { id: 4, x: '75%', y: '70%', size: 7, delay: 1.5 },
    { id: 5, x: '50%', y: '20%', size: 4, delay: 0.8 },
  ];

  return (
    <div className="relative w-full rounded-3xl overflow-hidden p-5 mb-5 border border-emerald-500/20 shadow-2xl bg-gradient-to-br from-[#064E3B] via-[#022C22] to-[#000000]">
      {/* Bio-particle effects */}
      {particles.map(p => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-emerald-400/30 blur-[1px] pointer-events-none"
          style={{
            left: p.x,
            top: p.y,
            width: p.size,
            height: p.size,
          }}
          animate={{
            y: [-8, 8, -8],
            opacity: [0.3, 0.8, 0.3],
            scale: [0.9, 1.2, 0.9]
          }}
          transition={{
            duration: 3 + p.delay,
            repeat: Infinity,
            ease: "easeInOut",
            delay: p.delay
          }}
        />
      ))}

      {/* Header Info */}
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-white font-bold text-sm leading-tight">{t('bilim_daraxti')}</h3>
            <span className="text-[11px] text-emerald-300 font-medium">
              {stageLevel}-Bosqich: {stageName}
            </span>
          </div>
        </div>

        <span className="bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 font-bold text-xs px-2.5 py-1 rounded-full">
          {percentage}%
        </span>
      </div>

      {/* Center Interactive Plant Illustration */}
      <div className="flex flex-col items-center justify-center py-4 relative z-10">
        <motion.div
          animate={{ scale: [0.96, 1.04, 0.96] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="relative flex items-center justify-center"
        >
          {/* Ambient Glow */}
          <div className="absolute w-24 h-24 rounded-full bg-emerald-500/20 blur-xl"></div>
          
          <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-emerald-950 to-emerald-800 border-2 border-emerald-400/40 flex items-center justify-center shadow-lg shadow-emerald-950/80">
            <span className="text-4xl select-none">{treeEmoji}</span>
          </div>
        </motion.div>

        <p className="text-emerald-100/80 text-xs mt-3 font-medium text-center">
          {completedCount} / {totalCount} {t('dars_yakunlandi')} • {percentage}%
        </p>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-2.5 bg-black/40 rounded-full overflow-hidden p-[2px] border border-white/5 mb-4 relative z-10">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]"
        />
      </div>

      {/* Continue CTA Button */}
      <button
        onClick={onContinue}
        className="w-full bg-white hover:bg-emerald-50 active:scale-[0.98] transition-all text-black font-bold py-3 px-4 rounded-full flex items-center justify-center gap-2 shadow-lg relative z-10"
      >
        <Play className="w-4 h-4 fill-black text-black" />
        <span className="text-sm font-semibold">{t('davom_ettirish')}</span>
      </button>
    </div>
  );
}
