import React, { useRef, useState, useEffect } from 'react';
import { useTelegram } from '../hooks/useTelegram';

export default function VideoPlayer({ videoUrl, lessonId, onComplete, onBack }) {
  const videoRef = useRef(null);
  const [hasWatchedOnce, setHasWatchedOnce] = useState(false);
  const [lastAllowedTime, setLastAllowedTime] = useState(0);
  const [isEnded, setIsEnded] = useState(false);
  const { sendData, close } = useTelegram();

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      if (!hasWatchedOnce && video.currentTime > lastAllowedTime) {
        setLastAllowedTime(video.currentTime);
      }
    };

    const handleSeeking = () => {
      if (!hasWatchedOnce && video.currentTime > lastAllowedTime + 1) {
        video.currentTime = lastAllowedTime;
      }
    };

    const handleEnded = () => {
      setHasWatchedOnce(true);
      setIsEnded(true);
      onComplete(); // might update backend
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('seeking', handleSeeking);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('seeking', handleSeeking);
      video.removeEventListener('ended', handleEnded);
    };
  }, [hasWatchedOnce, lastAllowedTime, onComplete]);

  const handleReadyToTest = () => {
    sendData(JSON.stringify({ action: 'test_ready', lesson_id: lessonId }));
    close();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center">
      <div className="absolute top-4 left-4 z-10">
        <button onClick={onBack} className="bg-white/20 p-2 rounded-full text-white backdrop-blur-md">
          ✕ Закрыть
        </button>
      </div>

      <video 
        ref={videoRef}
        src={videoUrl}
        controls
        controlsList="nodownload"
        className="w-full max-h-screen"
        playsInline
      />

      {(isEnded || hasWatchedOnce) && (
        <div className="absolute bottom-10 w-full px-6">
          <button 
            onClick={handleReadyToTest}
            className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-4 rounded-2xl shadow-lg transition-transform active:scale-95 text-xl animate-bounce-slow"
          >
            ✅ Готов к тесту
          </button>
        </div>
      )}
    </div>
  );
}
