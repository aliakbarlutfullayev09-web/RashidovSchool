import React from 'react';
import { useHaptic } from '../hooks/useHaptic';

export default function LevelNode({ lesson, progress, isCurrent, onClick }) {
  const { impactMedium } = useHaptic();

  const handleClick = () => {
    if (progress.is_unlocked) {
      impactMedium();
      onClick();
    } else {
      // Locked node click
      impactMedium();
      onClick();
    }
  };

  const isCompleted = progress.is_unlocked && progress.stars > 0;
  const isLocked = !progress.is_unlocked;

  let circleStyles = "w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold shadow-lg transition-transform active:scale-95 z-10 cursor-pointer border-4 ";
  
  if (isLocked) {
    circleStyles += "bg-gray-600 border-gray-500 opacity-50";
  } else if (isCurrent) {
    circleStyles += "bg-blue-500 border-blue-300 pulse-glow text-white";
  } else if (isCompleted) {
    circleStyles += "bg-green-500 border-green-300 text-white";
  }

  return (
    <div className="flex flex-col items-center relative" onClick={handleClick}>
      <div className={circleStyles}>
        {isLocked && <span>🔒</span>}
        {isCurrent && <span>★</span>}
        {isCompleted && <span>✓</span>}
      </div>
      
      {/* Stars display below if completed */}
      {isCompleted && (
        <div className="absolute -bottom-5 flex space-x-1 text-sm bg-black bg-opacity-40 rounded-full px-2 py-0.5">
          {[1, 2, 3].map(star => (
            <span key={star} className={star <= progress.stars ? "star-filled" : "star-empty"}>
              ★
            </span>
          ))}
        </div>
      )}

      {/* Lesson Title */}
      <span className="mt-6 text-xs font-semibold text-center w-24 leading-tight opacity-90 drop-shadow-md">
        {lesson.title}
      </span>
    </div>
  );
}
