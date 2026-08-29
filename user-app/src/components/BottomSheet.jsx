import React from 'react';

export default function BottomSheet({ isOpen, onClose, lesson, progress, onWatch, onBuy }) {
  if (!isOpen || !lesson) return null;

  const isCompleted = progress.is_unlocked && progress.stars > 0;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-60 transition-opacity" 
        onClick={onClose}
      />
      
      {/* Sheet Content */}
      <div className="glass-strong w-full rounded-t-3xl p-6 relative slide-up pb-safe shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
        <div className="w-12 h-1.5 bg-gray-400 rounded-full mx-auto mb-6 opacity-50" />
        
        <h2 className="text-2xl font-bold mb-1 text-center">{lesson.title}</h2>
        <p className="text-sm text-gray-300 text-center mb-6">Модуль: {lesson.course_id}</p>
        
        {isCompleted && (
          <div className="flex justify-center space-x-2 text-3xl mb-6">
            {[1, 2, 3].map(star => (
              <span key={star} className={star <= progress.stars ? "star-filled" : "star-empty"}>
                ★
              </span>
            ))}
          </div>
        )}

        {!progress.is_unlocked && (
          <div className="text-center mb-6 text-sm text-red-300 bg-red-900 bg-opacity-30 rounded-lg p-3">
            Урок недоступен. Необходимо купить курс.
          </div>
        )}

        {progress.is_unlocked && !isCompleted && (
          <div className="text-center mb-6 text-sm text-blue-200">
            Ещё не пройден
          </div>
        )}

        <div className="flex flex-col space-y-3">
          {progress.is_unlocked && lesson.video_url && (
            <button 
              onClick={onWatch}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-4 rounded-2xl shadow-lg transition-transform active:scale-95 text-lg"
            >
              ▶️ Смотреть видео
            </button>
          )}

          {!progress.is_unlocked && (
            <button 
              onClick={onBuy}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 rounded-2xl shadow-lg transition-transform active:scale-95 text-lg"
            >
              🔓 Купить курс
            </button>
          )}
          
          <button 
            onClick={onClose}
            className="w-full glass hover:bg-white/10 text-white font-bold py-4 rounded-2xl transition-colors"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}
