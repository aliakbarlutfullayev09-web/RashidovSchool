import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Maximize, ArrowLeft, Search } from 'lucide-react';
import CheckpointModal from './CheckpointModal';

export default function VideoPlayer({ videoUrl, lessonId, checkpoints = [], onComplete, onBack }) {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [maxWatchedTime, setMaxWatchedTime] = useState(0);
  const [answeredCheckpoints, setAnsweredCheckpoints] = useState({});
  const [activeCheckpoint, setActiveCheckpoint] = useState(null);
  const [isCompleted, setIsCompleted] = useState(false);
  
  const isFirstPlaythrough = true; // In a real app, track if user has already completed this lesson

  // Auto-pause when user switches apps or blurs
  useEffect(() => {
    const handlePause = () => {
      if (videoRef.current && !videoRef.current.paused) {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    };
    
    window.addEventListener('visibilitychange', () => {
      if (document.hidden) handlePause();
    });
    window.addEventListener('blur', handlePause);
    
    return () => {
      window.removeEventListener('visibilitychange', handlePause);
      window.removeEventListener('blur', handlePause);
    };
  }, []);

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const time = videoRef.current.currentTime;
    setCurrentTime(time);
    
    if (time > maxWatchedTime) {
      setMaxWatchedTime(time);
    }

    // Interactive Checkpoints logic
    const triggered = checkpoints.find(
      cp => time >= cp.trigger_time_sec && !answeredCheckpoints[cp.id] && !activeCheckpoint
    );
    
    if (triggered) {
      videoRef.current.pause();
      setIsPlaying(false);
      setActiveCheckpoint(triggered);
    }
  };

  const handleAnswer = (isCorrect) => {
    setAnsweredCheckpoints(prev => ({ ...prev, [activeCheckpoint.id]: isCorrect }));
    
    if (isCorrect) {
      setActiveCheckpoint(null);
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      // Rewind if wrong
      videoRef.current.currentTime = activeCheckpoint.rewind_time_sec;
      setActiveCheckpoint(null);
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleSeek = (e) => {
    if (!videoRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const targetTime = percent * duration;
    
    // Scrubber lock logic
    if (isFirstPlaythrough && targetTime > maxWatchedTime) {
      videoRef.current.currentTime = maxWatchedTime;
    } else {
      videoRef.current.currentTime = targetTime;
    }
  };

  const handleEnded = () => {
    setIsCompleted(true);
    if (onComplete) onComplete();
  };

  const formatTime = (sec) => {
    if (isNaN(sec)) return "00:00";
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = Math.floor(sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const score = Object.values(answeredCheckpoints).filter(Boolean).length / Math.max(checkpoints.length, 1);
  const needsTahlil = checkpoints.length > 0 && score < 0.85;

  return (
    <div className="fixed inset-0 z-[100] bg-[#000000] text-white flex flex-col justify-center">
      <button onClick={onBack} className="absolute top-4 left-4 z-50 bg-white/20 rounded-full p-2 backdrop-blur-md">
        <ArrowLeft className="w-6 h-6 text-white" />
      </button>
      
      <div className="relative w-full">
        <video
          ref={videoRef}
          src={videoUrl}
          className="w-full max-h-screen bg-black"
          controls={false}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
          onEnded={handleEnded}
          onClick={togglePlay}
          playsInline
        />
        
        {!activeCheckpoint && !isCompleted && (
          <div className="absolute bottom-0 left-0 right-0 p-4 pt-12 bg-gradient-to-t from-black/80 to-transparent">
            {/* Custom Progress Bar */}
            <div 
              className="h-2 w-full bg-white/30 rounded-full mb-4 cursor-pointer relative progress-bar"
              onClick={handleSeek}
            >
              <div 
                className="h-full bg-[#007AFF] rounded-full progress-fill pointer-events-none" 
                style={{ width: `${(currentTime / duration) * 100}%` }}
              />
              {/* Checkpoint Markers */}
              {checkpoints.map(cp => (
                <div 
                  key={cp.id} 
                  className={`absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-black pointer-events-none
                    ${answeredCheckpoints[cp.id] ? 'bg-[#34C759]' : 'bg-[#FFCC00]'}`}
                  style={{ left: `${(cp.trigger_time_sec / duration) * 100}%`, transform: 'translate(-50%, -50%)' }}
                />
              ))}
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button onClick={togglePlay} className="p-1">
                  {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                </button>
                <span className="text-sm font-mono opacity-90">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>
              <button onClick={() => videoRef.current?.requestFullscreen()} className="p-1">
                <Maximize className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {activeCheckpoint && (
        <CheckpointModal checkpoint={activeCheckpoint} onAnswer={handleAnswer} />
      )}

      {isCompleted && needsTahlil && (
        <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center p-6 backdrop-blur-md">
          <div className="bg-[#1C1C1E] p-6 rounded-[20px] text-center max-w-sm w-full border border-white/10">
            <h3 className="text-xl font-bold mb-2">Sizda xatolar bor!</h3>
            <p className="text-[#8E8E93] mb-6">Mavzuni to'liq o'zlashtirmadingiz. AI Tahlil orqali xatolaringizni ko'rib chiqing.</p>
            <button className="w-full bg-[#007AFF] text-white py-3.5 rounded-xl font-bold flex justify-center items-center gap-2">
              <Search className="w-5 h-5" />
              🔍 Таҳлил
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
