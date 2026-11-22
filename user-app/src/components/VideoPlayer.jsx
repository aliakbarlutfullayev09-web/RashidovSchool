import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Play, Pause, RotateCcw, Maximize, ArrowLeft, 
  BookOpen, Clock, AlertCircle, RefreshCw, Sparkles, CheckCircle2 
} from 'lucide-react';
import CheckpointModal from './CheckpointModal';
import GlossaryPanel from './GlossaryPanel';
import { formatTime } from '../utils/formatters';
import { useHaptic } from '../hooks/useHaptic';
import { getWatchProgress, saveWatchProgress, incrementViewCount } from '../api/supabase';

export default function VideoPlayer({ 
  videoUrl, 
  lessonId, 
  lessonTitle = "Biologiya darsi", 
  terms = [], 
  checkpoints = [], 
  userId = null,
  onStartQuiz, 
  onBack 
}) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const { impactLight, impactMedium, notificationSuccess } = useHaptic();

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showControls, setShowControls] = useState(true);

  // Watch Frontier state
  const [maxWatchedSeconds, setMaxWatchedSeconds] = useState(0);
  const [toastMessage, setToastMessage] = useState(null);

  // Error / Loading state
  const [hasError, setHasError] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);

  // Checkpoints
  const [answeredCheckpoints, setAnsweredCheckpoints] = useState({});
  const [activeCheckpoint, setActiveCheckpoint] = useState(null);

  // Glossary drawer state
  const [isGlossaryOpen, setIsGlossaryOpen] = useState(false);

  // End state
  const [isEnded, setIsEnded] = useState(false);

  // Tracking refs for verified continuous playback
  const lastPlaybackTimeRef = useRef(0);
  const lastPlaybackWallClockRef = useRef(Date.now());
  const isSeekingRef = useRef(false);
  const maxWatchedRef = useRef(0);
  const controlsTimeoutRef = useRef(null);

  // Keep maxWatchedRef in sync
  useEffect(() => {
    maxWatchedRef.current = maxWatchedSeconds;
  }, [maxWatchedSeconds]);

  // Load saved watch frontier on mount
  useEffect(() => {
    let mounted = true;
    async function loadProgress() {
      try {
        const saved = await getWatchProgress(userId, lessonId);
        if (mounted && saved?.maxWatchedSeconds) {
          const initSec = Number(saved.maxWatchedSeconds) || 0;
          setMaxWatchedSeconds(initSec);
          maxWatchedRef.current = initSec;

          // If student had progress, optionally restore position safely within frontier
          if (saved.lastPosition && saved.lastPosition <= initSec && videoRef.current) {
            videoRef.current.currentTime = saved.lastPosition;
            setCurrentTime(saved.lastPosition);
            lastPlaybackTimeRef.current = saved.lastPosition;
          }
        }
      } catch (e) {
        console.warn("Failed to load watch progress:", e);
      }
    }
    loadProgress();
    if (lessonId) {
      incrementViewCount(lessonId).catch(() => {});
    }
    return () => { mounted = false; };
  }, [userId, lessonId]);

  // Auto-hide controls after inactivity
  const resetControlsTimeout = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    if (isPlaying && !isGlossaryOpen) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 4000);
    }
  }, [isPlaying, isGlossaryOpen]);

  // Show friendly seek toast
  const showSeekToast = useCallback((msg) => {
    setToastMessage(msg);
    impactMedium();
    setTimeout(() => {
      setToastMessage(prev => (prev === msg ? null : prev));
    }, 2800);
  }, [impactMedium]);

  // Sync playback rate to video element
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  // Auto-pause when app is minimized or loses focus
  useEffect(() => {
    const handlePause = () => {
      if (videoRef.current && !videoRef.current.paused) {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    };
    const handleVisibility = () => {
      if (document.hidden) handlePause();
    };

    window.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('blur', handlePause);
    return () => {
      window.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('blur', handlePause);
    };
  }, []);

  // Keyboard controls (Space to toggle play, ArrowLeft/Right to seek)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        seekDelta(-10);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        seekDelta(10);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, maxWatchedSeconds, duration]);

  // Handle right-edge swipe gesture to open glossary
  useEffect(() => {
    let startX = 0;
    let startY = 0;

    const handleTouchStart = (e) => {
      if (e.touches.length === 1) {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
      }
    };

    const handleTouchEnd = (e) => {
      if (e.changedTouches.length === 1) {
        const endX = e.changedTouches[0].clientX;
        const endY = e.changedTouches[0].clientY;
        const deltaX = startX - endX;
        const deltaY = Math.abs(startY - endY);

        // Right edge swipe left: started within 50px of right screen edge, moved left > 40px
        const screenW = window.innerWidth;
        if (startX >= screenW - 55 && deltaX > 45 && deltaY < 80) {
          impactLight();
          setIsGlossaryOpen(true);
        }
      }
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [impactLight]);

  /**
   * VERIFIED CONTINUOUS PLAYBACK ADVANCEMENT:
   * Frontier advances ONLY when actual real-time video playback progresses.
   */
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const time = videoRef.current.currentTime;
    setCurrentTime(time);

    const now = Date.now();
    const wallElapsed = (now - lastPlaybackWallClockRef.current) / 1000;
    const timeDelta = time - lastPlaybackTimeRef.current;

    lastPlaybackWallClockRef.current = now;
    lastPlaybackTimeRef.current = time;

    // Do NOT advance if seeking, paused, or unnatural time leap occurred
    if (!isSeekingRef.current && isPlaying) {
      const rate = videoRef.current.playbackRate || 1;
      const maxAllowedDelta = Math.max(0.6, wallElapsed * rate * 1.6 + 0.6);

      if (timeDelta > 0 && timeDelta <= maxAllowedDelta) {
        if (time > maxWatchedRef.current) {
          const newFrontier = time;
          setMaxWatchedSeconds(newFrontier);
          maxWatchedRef.current = newFrontier;
          // Non-blocking local persistence
          saveWatchProgress(userId, lessonId, time, newFrontier);
        }
      }
    }

    // Check stop-test checkpoints
    const triggeredCp = checkpoints.find(
      cp => time >= cp.trigger_time_sec && 
            !answeredCheckpoints[cp.id] && 
            !activeCheckpoint
    );
    if (triggeredCp) {
      videoRef.current.pause();
      setIsPlaying(false);
      setActiveCheckpoint(triggeredCp);
      setShowControls(true);
    }
  };

  /**
   * SEEK ENFORCEMENT:
   * Clamps targetTime to maxWatchedSeconds.
   */
  const clampAndSeek = (targetTime) => {
    if (!videoRef.current) return;
    const frontier = maxWatchedRef.current;

    if (targetTime > frontier + 0.5) {
      // Clamped
      videoRef.current.currentTime = frontier;
      setCurrentTime(frontier);
      lastPlaybackTimeRef.current = frontier;
      lastPlaybackWallClockRef.current = Date.now();
      showSeekToast("Oldinga faqat ko‘rilgan daqiqagacha o‘tkazish mumkin");
    } else {
      const safeTime = Math.max(0, targetTime);
      videoRef.current.currentTime = safeTime;
      setCurrentTime(safeTime);
      lastPlaybackTimeRef.current = safeTime;
      lastPlaybackWallClockRef.current = Date.now();
    }
  };

  const seekDelta = (deltaSec) => {
    if (!videoRef.current) return;
    impactLight();
    clampAndSeek(videoRef.current.currentTime + deltaSec);
    resetControlsTimeout();
  };

  const handleSeekbarClick = (e) => {
    if (!videoRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const targetTime = percent * duration;
    clampAndSeek(targetTime);
    resetControlsTimeout();
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    impactLight();
    resetControlsTimeout();
    if (videoRef.current.paused) {
      videoRef.current.play().then(() => {
        setIsPlaying(true);
        lastPlaybackTimeRef.current = videoRef.current.currentTime;
        lastPlaybackWallClockRef.current = Date.now();
      }).catch(err => {
        console.warn("Play error:", err);
      });
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setIsEnded(true);
    setShowControls(true);
    notificationSuccess();
    if (videoRef.current) {
      const full = videoRef.current.duration || maxWatchedRef.current;
      setMaxWatchedSeconds(full);
      maxWatchedRef.current = full;
      saveWatchProgress(userId, lessonId, full, full);
    }
  };

  const handleAnswerCheckpoint = (isCorrect) => {
    if (!activeCheckpoint) return;
    setAnsweredCheckpoints(prev => ({ ...prev, [activeCheckpoint.id]: isCorrect }));

    if (isCorrect) {
      setActiveCheckpoint(null);
      if (videoRef.current) {
        videoRef.current.play();
        setIsPlaying(true);
      }
    } else {
      // Rewind to explanation point WITHOUT decreasing maxWatchedSeconds!
      const rewindTime = activeCheckpoint.rewind_time_sec !== undefined 
        ? activeCheckpoint.rewind_time_sec 
        : Math.max(0, activeCheckpoint.trigger_time_sec - 10);

      if (videoRef.current) {
        videoRef.current.currentTime = rewindTime;
        lastPlaybackTimeRef.current = rewindTime;
        lastPlaybackWallClockRef.current = Date.now();
        setActiveCheckpoint(null);
        videoRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const toggleFullscreen = () => {
    impactLight();
    const video = videoRef.current;
    const container = containerRef.current;
    if (!video) return;

    if (video.webkitEnterFullscreen) {
      video.webkitEnterFullscreen();
      return;
    }

    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
      if (container?.requestFullscreen) container.requestFullscreen();
      else if (container?.webkitRequestFullscreen) container.webkitRequestFullscreen();
      else if (video.requestFullscreen) video.requestFullscreen();
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    }
  };

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 z-50 bg-[#000000] text-white flex flex-col justify-between overflow-hidden select-none"
      onClick={resetControlsTimeout}
    >
      {/* ── TOP BAR (SAFE FROM TELEGRAM CLOSE & STATUS BAR) ── */}
      <div className={`p-4 pt-[calc(env(safe-area-inset-top,16px)+10px)] flex items-center justify-between z-20 bg-gradient-to-b from-black/90 via-black/50 to-transparent transition-opacity duration-300 ${
        showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}>
        {/* Back Button (Safe margin from Telegram controls) */}
        <button 
          onClick={onBack}
          className="w-10 h-10 rounded-full bg-[#1C1C1E]/90 border border-white/10 flex items-center justify-center text-white active:scale-95 transition-transform shadow-lg"
          title="Orqaga"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        {/* Title */}
        <span className="text-xs font-bold text-white/95 truncate max-w-[210px] px-2 text-center">
          {lessonTitle}
        </span>

        {/* Glossary Quick Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            impactLight();
            setIsGlossaryOpen(true);
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#1C1C1E]/90 border border-white/10 text-xs font-bold text-purple-300 hover:text-white active:scale-95 transition-all shadow-lg"
          title="Dars terminlari"
        >
          <BookOpen className="w-3.5 h-3.5 text-purple-400" />
          <span className="hidden sm:inline">Terminlar</span>
          {terms.length > 0 && (
            <span className="bg-purple-500/30 text-purple-200 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
              {terms.length}
            </span>
          )}
        </button>
      </div>

      {/* ── VIDEO VIEWPORT AREA ── */}
      <div 
        className="relative w-full flex-1 flex items-center justify-center overflow-hidden cursor-pointer bg-[#0A0A0C]"
        onClick={togglePlay}
      >
        <video
          ref={videoRef}
          src={videoUrl || "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"}
          className="w-full h-full object-contain max-h-[85vh]"
          playsInline
          webkit-playsinline="true"
          x-webkit-airplay="allow"
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
          onEnded={handleEnded}
          onWaiting={() => setIsBuffering(true)}
          onPlaying={() => setIsBuffering(false)}
          onError={() => setHasError(true)}
          onSeeking={() => {
            isSeekingRef.current = true;
            const time = videoRef.current?.currentTime || 0;
            if (time > maxWatchedRef.current + 0.8) {
              if (videoRef.current) {
                videoRef.current.currentTime = maxWatchedRef.current;
              }
              showSeekToast("Oldinga faqat ko‘rilgan daqiqagacha o‘tkazish mumkin");
            }
          }}
          onSeeked={() => {
            isSeekingRef.current = false;
            lastPlaybackTimeRef.current = videoRef.current?.currentTime || 0;
            lastPlaybackWallClockRef.current = Date.now();
          }}
        />

        {/* Buffering Indicator */}
        {isBuffering && !hasError && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none">
            <div className="w-10 h-10 border-3 border-white/20 border-t-[#007AFF] rounded-full animate-spin" />
          </div>
        )}

        {/* Video Error Message */}
        {hasError && (
          <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center p-6 text-center z-20">
            <AlertCircle className="w-12 h-12 text-red-500 mb-3" />
            <h4 className="text-white font-bold text-sm mb-1">Videoni yuklab bo‘lmadi</h4>
            <p className="text-xs text-[#8E8E93] max-w-[240px] mb-4">
              Internet aloqasini tekshiring yoki keyinroq qayta urinib ko‘ring.
            </p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setHasError(false);
                if (videoRef.current) videoRef.current.load();
              }}
              className="px-4 py-2 bg-[#007AFF] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 active:scale-95 transition-transform"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Qayta urinish</span>
            </button>
          </div>
        )}

        {/* Seek Lock Toast Notice */}
        {toastMessage && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-[#1C1C1E]/95 border border-amber-500/40 text-amber-300 px-4 py-2.5 rounded-2xl text-xs font-bold shadow-2xl flex items-center gap-2 pointer-events-none z-30 animate-in fade-in zoom-in-95 duration-200">
            <span>🔒</span>
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Stop-Test Checkpoint Overlay */}
        {activeCheckpoint && (
          <div onClick={(e) => e.stopPropagation()}>
            <CheckpointModal 
              checkpoint={activeCheckpoint} 
              onAnswer={handleAnswerCheckpoint} 
            />
          </div>
        )}
      </div>

      {/* ── CONTROLS & SEEKBAR ── */}
      <div 
        onClick={(e) => e.stopPropagation()}
        className={`p-4 pb-[calc(env(safe-area-inset-bottom,16px)+12px)] max-w-xl mx-auto w-full space-y-3 z-20 bg-gradient-to-t from-black via-black/70 to-transparent transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Seekbar Container */}
        <div 
          onClick={handleSeekbarClick}
          className="relative w-full h-4 py-1.5 cursor-pointer flex items-center group"
        >
          {/* Track background */}
          <div className="w-full h-1.5 bg-[#2C2C2E] rounded-full relative overflow-hidden">
            {/* Confirmed watch frontier indicator (Allowed Range) */}
            <div 
              className="absolute left-0 top-0 bottom-0 bg-white/25 rounded-full pointer-events-none"
              style={{ width: `${(maxWatchedSeconds / (duration || 1)) * 100}%` }}
            />
            {/* Current playback progress */}
            <div 
              className="absolute left-0 top-0 bottom-0 bg-[#007AFF] rounded-full pointer-events-none shadow-[0_0_8px_rgba(0,122,255,0.7)]"
              style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
            />
          </div>

          {/* Scrubber thumb */}
          <div 
            className="absolute w-3.5 h-3.5 bg-white rounded-full shadow-md pointer-events-none -translate-x-1/2 transition-transform group-hover:scale-125"
            style={{ left: `${(currentTime / (duration || 1)) * 100}%` }}
          />

          {/* Checkpoint marker dots */}
          {checkpoints.map((cp) => {
            const leftPct = (cp.trigger_time_sec / (duration || 1)) * 100;
            const isDone = answeredCheckpoints[cp.id];
            return (
              <div
                key={cp.id}
                className={`absolute w-2.5 h-2.5 rounded-full border-2 border-black pointer-events-none -translate-x-1/2 ${
                  isDone ? 'bg-emerald-400' : 'bg-amber-400'
                }`}
                style={{ left: `${leftPct}%` }}
                title={`Stop-test: ${formatTime(cp.trigger_time_sec)}`}
              />
            );
          })}
        </div>

        {/* Action Controls Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Play / Pause */}
            <button
              onClick={togglePlay}
              className="w-12 h-12 rounded-full bg-[#007AFF] flex items-center justify-center text-white active:scale-95 transition-transform shadow-lg shadow-blue-500/25"
              title={isPlaying ? "To'xtatish" : "O'ynatish"}
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white ml-0.5" />}
            </button>

            {/* Rewind -10s */}
            <button
              onClick={() => seekDelta(-10)}
              className="w-10 h-10 rounded-full bg-[#1C1C1E] border border-white/10 flex items-center justify-center text-white/90 active:scale-95 transition-transform"
              title="-10 soniya"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* Time labels */}
            <div className="text-xs font-mono text-[#8E8E93] flex items-center gap-1">
              <span className="text-white font-medium">{formatTime(currentTime)}</span>
              <span>/</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Playback rate speed */}
            <button
              onClick={() => {
                impactLight();
                const rates = [1, 1.25, 1.5];
                const nextIdx = (rates.indexOf(playbackRate) + 1) % rates.length;
                setPlaybackRate(rates[nextIdx]);
              }}
              className="px-2.5 py-1.5 rounded-xl bg-[#1C1C1E] border border-white/10 text-xs font-bold text-white active:scale-95 transition-transform"
              title="Tezlik"
            >
              {playbackRate}x
            </button>

            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              className="w-9 h-9 rounded-xl bg-[#1C1C1E] border border-white/10 flex items-center justify-center text-white/80 hover:text-white active:scale-95 transition-transform"
              title="To'liq ekran"
            >
              <Maximize className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Completion Card at End of Video */}
        {isEnded && (
          <div className="bg-[#1C1C1E] border border-emerald-500/30 p-4 rounded-3xl space-y-3 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-lg">
                🎉
              </div>
              <div>
                <h4 className="text-white font-bold text-xs">Dars muvaffaqiyatli ko‘rildi!</h4>
                <p className="text-[11px] text-emerald-400 font-medium">Barcha qismlar tasdiqlandi</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => {
                  impactMedium();
                  if (onStartQuiz) onStartQuiz();
                }}
                className="bg-[#007AFF] hover:bg-blue-600 text-white font-bold py-3 px-3 rounded-2xl text-xs flex items-center justify-center gap-1.5 shadow-lg active:scale-95 transition-all"
              >
                <span>📝 Testni boshlash</span>
              </button>

              <button
                onClick={() => {
                  if (videoRef.current) {
                    videoRef.current.currentTime = 0;
                    videoRef.current.play();
                    setIsPlaying(true);
                    setIsEnded(false);
                  }
                }}
                className="bg-[#2C2C2E] hover:bg-[#3A3A3C] text-white font-bold py-3 px-3 rounded-2xl text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all"
              >
                <span>🔄 Qayta ko‘rish</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── GLOSSARY SLIDE DRAWER PANEL ── */}
      <GlossaryPanel
        isOpen={isGlossaryOpen}
        onClose={() => setIsGlossaryOpen(false)}
        terms={terms}
        maxWatchedSeconds={maxWatchedSeconds}
        onSeekToTimestamp={(time) => {
          clampAndSeek(time);
        }}
        onBlockedTimestamp={() => {
          showSeekToast("Ushbu termin video davomida tushuntiriladi. Unga o‘tish uchun darsni ko‘ring.");
        }}
      />
    </div>
  );
}
