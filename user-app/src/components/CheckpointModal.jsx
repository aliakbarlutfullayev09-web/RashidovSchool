import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useHaptic } from '../hooks/useHaptic'; // Ensure this hook exists

export default function CheckpointModal({ checkpoint, onAnswer }) {
  const [selected, setSelected] = useState(null);
  const [status, setStatus] = useState(null); // 'correct' | 'wrong'
  const haptic = useHaptic();

  const handleSelect = (option) => {
    if (selected) return; // Prevent multiple interactions
    setSelected(option);
    
    const isCorrect = option === checkpoint.correct_option;
    setStatus(isCorrect ? 'correct' : 'wrong');
    
    if (isCorrect) {
      if (haptic?.success) haptic.success();
    } else {
      if (haptic?.error) haptic.error();
    }

    // Wait 800ms before callback
    setTimeout(() => {
      onAnswer(isCorrect);
    }, 800);
  };

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 z-[150] bg-black/80 flex flex-col items-center justify-center p-6 checkpoint-overlay backdrop-blur-xl"
      >
        <h2 className="text-xl font-bold text-white text-center mb-8 max-w-md">
          {checkpoint.question}
        </h2>
        
        <div className="w-full max-w-md space-y-3">
          {checkpoint.options.map((option, idx) => {
            const isSelected = selected === option;
            let bgClass = "bg-[#2C2C2E]";
            
            if (isSelected) {
              if (status === 'correct') bgClass = "bg-[#34C759]";
              else if (status === 'wrong') bgClass = "bg-[#FF3B30]";
            }

            return (
              <motion.button
                key={idx}
                whileTap={{ scale: 0.97 }}
                animate={isSelected && status === 'wrong' ? { x: [-10, 10, -10, 10, 0] } : {}}
                transition={{ duration: 0.4 }}
                onClick={() => handleSelect(option)}
                className={`w-full py-4 px-5 rounded-2xl text-left text-white font-medium transition-colors ${bgClass}`}
              >
                {option}
              </motion.button>
            );
          })}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
