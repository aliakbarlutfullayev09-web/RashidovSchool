import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Play, Pause, RotateCcw, Maximize, 
  BookOpen, Clock, AlertCircle, RefreshCw, FileCheck2, CheckCircle2, 
  X, ZoomIn, ZoomOut, ChevronDown 
} from 'lucide-react';
import CheckpointModal from './CheckpointModal';
import GlossaryPanel from './GlossaryPanel';
import { formatTime } from '../utils/formatters';
import { useHaptic } from '../hooks/useHaptic';
import { useIsDesktop } from '../hooks/useIsDesktop';
import { useLanguage } from '../context/LanguageContext';
import { getWatchProgress, saveWatchProgress, incrementViewCount, saveLessonQuizProgress } from '../api/supabase';

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
  const seekbarRef = useRef(null);
  const { impactLight, impactMedium, notificationSuccess } = useHaptic();
  const isDesktop = useIsDesktop();
  const { lang } = useLanguage();

  // Orientation & viewport state
  const [viewportInfo, setViewportInfo] = useState(() => {
    if (typeof window === 'undefined') return { isLandscape: false, isTablet: false };
    return {
      isLandscape: window.innerWidth > window.innerHeight,
      isTablet: window.innerWidth >= 640
    };
  });
  const isLandscape = viewportInfo.isLandscape;
  const isTablet = viewportInfo.isTablet;
  const isOverlayLayout = isLandscape || isDesktop;

  useEffect(() => {
    const handleOrientation = () => {
      setViewportInfo({
        isLandscape: window.innerWidth > window.innerHeight,
        isTablet: window.innerWidth >= 640
      });
    };
    window.addEventListener('resize', handleOrientation);
    window.addEventListener('orientationchange', handleOrientation);
    return () => {
      window.removeEventListener('resize', handleOrientation);
      window.removeEventListener('orientationchange', handleOrientation);
    };
  }, []);

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

  // ── PINCH-TO-ZOOM & PAN STATE ──
  const [zoomScale, setZoomScale] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const touchStateRef = useRef({
    initialDist: 0,
    initialScale: 1,
    isPinching: false,
    lastTapTime: 0,
    panStart: { x: 0, y: 0 },
    initialPan: { x: 0, y: 0 },
    tapStart: { x: 0, y: 0 },
    hasMoved: false
  });

  // Tracking refs for verified continuous playback
  const lastPlaybackTimeRef = useRef(0);
  const lastPlaybackWallClockRef = useRef(Date.now());
  const isSeekingRef = useRef(false);
  const maxWatchedRef = useRef(0);
  const controlsTimeoutRef = useRef(null);
  const singleTapTimerRef = useRef(null);
  const ignoreNextClickUntilRef = useRef(0);
  const doubleTappedRef = useRef(false);

  // Expose onBack to window for Telegram native BackButton
  useEffect(() => {
    window.__rb_exit_video = onBack;
    return () => { window.__rb_exit_video = null; };
  }, [onBack]);

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

  // Auto-hide controls timer
  const resetControlsTimeout = useCallback(() => {
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    if (showControls && isPlaying && !isGlossaryOpen && !isEnded && !activeCheckpoint) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 4000);
    }
  }, [showControls, isPlaying, isGlossaryOpen, isEnded, activeCheckpoint]);

  useEffect(() => {
    resetControlsTimeout();
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [resetControlsTimeout]);

  useEffect(() => {
    return () => {
      if (singleTapTimerRef.current) clearTimeout(singleTapTimerRef.current);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, []);

  // Single tap toggles controls visibility cleanly without immediate flicker
  const handleToggleControls = useCallback(() => {
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    setShowControls(prev => !prev);
  }, []);

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

  // Keyboard controls
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

  // ── PINCH-TO-ZOOM TOUCH LISTENERS ──
  const handleTouchStart = (e) => {
    const now = Date.now();
    ignoreNextClickUntilRef.current = now + 800;
    touchStateRef.current.hasMoved = false;

    if (e.touches.length === 2) {
      if (singleTapTimerRef.current) {
        clearTimeout(singleTapTimerRef.current);
        singleTapTimerRef.current = null;
      }
      // 2 Fingers: Start Pinch-to-zoom
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      touchStateRef.current.initialDist = dist;
      touchStateRef.current.initialScale = zoomScale;
      touchStateRef.current.isPinching = true;
    } else if (e.touches.length === 1) {
      // 1 Finger: Record position for double-tap or panning
      const t = e.touches[0];
      touchStateRef.current.tapStart = { x: t.clientX, y: t.clientY };
      touchStateRef.current.panStart = { x: t.clientX, y: t.clientY };
      touchStateRef.current.initialPan = { ...panOffset };

      // Double-tap detection (within 300ms)
      if (now - touchStateRef.current.lastTapTime < 300) {
        if (singleTapTimerRef.current) {
          clearTimeout(singleTapTimerRef.current);
          singleTapTimerRef.current = null;
        }
        doubleTappedRef.current = true;
        impactLight();
        if (zoomScale > 1.1) {
          setZoomScale(1);
          setPanOffset({ x: 0, y: 0 });
        } else {
          setZoomScale(2.0);
        }
        touchStateRef.current.lastTapTime = 0;
        return;
      }
      doubleTappedRef.current = false;
      touchStateRef.current.lastTapTime = now;
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 2 && touchStateRef.current.isPinching) {
      e.preventDefault();
      touchStateRef.current.hasMoved = true;
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      if (touchStateRef.current.initialDist > 0) {
        const factor = dist / touchStateRef.current.initialDist;
        const newScale = Math.min(3.5, Math.max(1, touchStateRef.current.initialScale * factor));
        setZoomScale(newScale);
        if (newScale <= 1.02) {
          setPanOffset({ x: 0, y: 0 });
        }
      }
    } else if (e.touches.length === 1) {
      const t = e.touches[0];
      const moveX = Math.abs(t.clientX - touchStateRef.current.tapStart.x);
      const moveY = Math.abs(t.clientY - touchStateRef.current.tapStart.y);
      if (moveX > 8 || moveY > 8) {
        touchStateRef.current.hasMoved = true;
        if (singleTapTimerRef.current) {
          clearTimeout(singleTapTimerRef.current);
          singleTapTimerRef.current = null;
        }
      }

      if (zoomScale > 1.05) {
        // 1 finger panning when zoomed in
        const deltaX = t.clientX - touchStateRef.current.panStart.x;
        const deltaY = t.clientY - touchStateRef.current.panStart.y;
        const maxPanX = (zoomScale - 1) * 160;
        const maxPanY = (zoomScale - 1) * 110;

        setPanOffset({
          x: Math.max(-maxPanX, Math.min(maxPanX, touchStateRef.current.initialPan.x + deltaX)),
          y: Math.max(-maxPanY, Math.min(maxPanY, touchStateRef.current.initialPan.y + deltaY))
        });
      }
    }
  };

  const handleTouchEnd = (e) => {
    ignoreNextClickUntilRef.current = Date.now() + 800;
    if (e.touches.length < 2) {
      touchStateRef.current.isPinching = false;
    }
    if (doubleTappedRef.current) {
      doubleTappedRef.current = false;
      return;
    }
    // Schedule single-tap controls toggle only once (synthetic click is suppressed via ignoreNextClickUntilRef)
    if (!touchStateRef.current.hasMoved && e.changedTouches.length === 1 && !touchStateRef.current.isPinching) {
      if (singleTapTimerRef.current) clearTimeout(singleTapTimerRef.current);
      singleTapTimerRef.current = setTimeout(() => {
        singleTapTimerRef.current = null;
        handleToggleControls();
      }, 260);
    }
  };

  const resetZoom = () => {
    impactLight();
    setZoomScale(1);
    setPanOffset({ x: 0, y: 0 });
  };

  /**
   * VERIFIED CONTINUOUS PLAYBACK ADVANCEMENT
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

    if (!isSeekingRef.current && isPlaying) {
      const rate = videoRef.current.playbackRate || 1;
      const maxAllowedDelta = Math.max(0.6, wallElapsed * rate * 1.6 + 0.6);

      if (timeDelta > 0 && timeDelta <= maxAllowedDelta) {
        if (time > maxWatchedRef.current) {
          const newFrontier = time;
          setMaxWatchedSeconds(newFrontier);
          maxWatchedRef.current = newFrontier;
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
   * SEEK ENFORCEMENT
   */
  const clampAndSeek = (targetTime) => {
    if (!videoRef.current) return;
    const frontier = maxWatchedRef.current;

    if (targetTime > frontier + 0.5) {
      videoRef.current.currentTime = frontier;
      setCurrentTime(frontier);
      lastPlaybackTimeRef.current = frontier;
      lastPlaybackWallClockRef.current = Date.now();
      showSeekToast(
        lang === 'ru'
          ? 'Перемотка вперёд доступна только до просмотренной минуты'
          : 'Oldinga faqat ko‘rilgan daqiqagacha o‘tkazish mumkin'
      );
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

  // Seekbar interactive scrub handling
  const handleSeekbarInteraction = (clientX) => {
    if (!videoRef.current || !duration || !seekbarRef.current) return;
    const rect = seekbarRef.current.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
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
    if (userId && lessonId) {
      saveLessonQuizProgress(userId, lessonId, 3, 100);
    }
  };

  const handleAnswerCheckpoint = (isCorrect) => {
    if (!activeCheckpoint) return;

    if (isCorrect) {
      setAnsweredCheckpoints(prev => ({ ...prev, [activeCheckpoint.id]: true }));
      setActiveCheckpoint(null);
      if (videoRef.current) {
        videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
      }
    } else {
      const rawRewind = activeCheckpoint.rewind_time_sec ?? activeCheckpoint.rewind_to_sec;
      const rewindTime = rawRewind !== undefined && rawRewind !== null && !Number.isNaN(Number(rawRewind))
        ? Math.max(0, Number(rawRewind))
        : Math.max(0, (activeCheckpoint.trigger_time_sec || 0) - 10);

      // Reset watched frontier back to rewindTime BEFORE seeking so user cannot skip right back to the checkpoint
      maxWatchedRef.current = rewindTime;
      setMaxWatchedSeconds(rewindTime);
      setCurrentTime(rewindTime);
      lastPlaybackTimeRef.current = rewindTime;
      lastPlaybackWallClockRef.current = Date.now();
      saveWatchProgress(userId, lessonId, rewindTime, rewindTime);

      // Mark this checkpoint (and any checkpoints after rewindTime) unanswered so they must pass again
      setAnsweredCheckpoints(prev => {
        const next = { ...prev };
        delete next[activeCheckpoint.id];
        checkpoints.forEach(cp => {
          if (cp.trigger_time_sec >= rewindTime) {
            delete next[cp.id];
          }
        });
        return next;
      });

      if (videoRef.current) {
        videoRef.current.currentTime = rewindTime;
        setActiveCheckpoint(null);
        videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
      } else {
        setActiveCheckpoint(null);
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

  // Speed cycle: strictly max 1.3x [1x, 1.1x, 1.2x, 1.3x]
  const handleCycleSpeed = () => {
    impactLight();
    const rates = [1, 1.1, 1.2, 1.3];
    const currentIndex = rates.findIndex(r => Math.abs(r - playbackRate) < 0.04);
    const nextIndex = (currentIndex + 1) % rates.length;
    setPlaybackRate(rates[nextIndex]);
  };

  // Seekbar progress percentage
  const currentPercent = Math.min(100, Math.max(0, (currentTime / (duration || 1)) * 100));
  const maxWatchedPercent = Math.min(100, Math.max(0, (maxWatchedSeconds / (duration || 1)) * 100));

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 z-50 bg-[#000000] text-white flex flex-col justify-between overflow-hidden select-none video-player-container"
    >

      {/* ── TOP TELEGRAM-STYLE "TERMINLAR" BUTTON (Always visible on desktop & portrait) ── */}
      <div 
        onTouchStart={(e) => e.stopPropagation()}
        onTouchEnd={(e) => e.stopPropagation()}
        className={`absolute z-40 pointer-events-auto transition-all duration-300 ${
          isOverlayLayout ? 'right-4' : 'right-3'
        } ${
          isOverlayLayout && !isDesktop && !showControls && !isGlossaryOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
        style={{
          top: isOverlayLayout 
            ? 'max(calc(var(--safe-area-top, 0px) + 20px), 24px)' 
            : 'max(calc(var(--safe-area-top, 0px) + 54px), 80px)'
        }}
      >
        <button
          type="button"
          data-testid="video-terms-btn"
          onClick={(e) => {
            e.stopPropagation();
            impactLight();
            setIsGlossaryOpen(prev => !prev);
          }}
          className={`flex items-center backdrop-blur-xl border shadow-xl transition-all active:scale-95 h-9 px-3.5 rounded-full gap-1.5 text-xs font-semibold cursor-pointer ${
            isGlossaryOpen
              ? 'bg-purple-600/40 border-purple-400/60 text-white shadow-purple-500/25'
              : 'bg-black/65 hover:bg-black/85 border-white/20 text-white/95'
          }`}
          title={lang === 'ru' ? 'Термины урока' : 'Dars terminlari'}
        >
          <BookOpen className="w-4 h-4 text-purple-300 shrink-0" />
          <span>{lang === 'ru' ? 'Термины' : 'Terminlar'}</span>
          {terms.length > 0 && (
            <span className="bg-purple-500/40 text-purple-200 text-[10px] px-1.5 py-0.2 rounded-full font-bold ml-0.5">
              {terms.length}
            </span>
          )}
        </button>
      </div>

      {/* Floating Zoom Indicator & Reset Button */}
      {zoomScale > 1.05 && (
        <div
          onTouchStart={(e) => e.stopPropagation()}
          onTouchEnd={(e) => e.stopPropagation()}
          className={`absolute z-40 pointer-events-auto transition-all animate-in fade-in ${
            isOverlayLayout ? 'left-4' : 'left-3'
          } ${
            isOverlayLayout && !showControls ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
          style={{
            top: isOverlayLayout
              ? 'max(calc(var(--safe-area-top, 0px) + 36px), 56px)'
              : 'max(calc(var(--safe-area-top, 0px) + 54px), 80px)'
          }}
        >
          <button
            onClick={resetZoom}
            className="h-8 px-3 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-xl border border-white/20 text-xs font-bold text-cyan-300 flex items-center gap-1.5 active:scale-95 shadow-xl"
          >
            <ZoomOut className="w-3.5 h-3.5 text-cyan-400" />
            <span>{zoomScale.toFixed(1)}x • {lang === 'ru' ? 'Сбросить' : 'Qaytarish'}</span>
          </button>
        </div>
      )}

      {/* ── VIDEO CONTAINER (POSITIONED BELOW BUTTONS IN PORTRAIT & FULLSCREEN IN LANDSCAPE) ── */}
      <div 
        className={`relative w-full overflow-hidden bg-[#0A0A0C] touch-none video-wrapper ${
          isOverlayLayout
            ? 'h-full flex-1 flex items-center justify-center'
            : 'aspect-video flex items-center justify-center shrink-0 shadow-2xl'
        }`}
        style={{
          marginTop: isOverlayLayout
            ? '0px'
            : isTablet
              ? 'max(calc(var(--safe-area-top, 0px) + 56px), 76px)'
              : 'max(calc(var(--safe-area-top, 0px) + 90px), 118px)'
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={() => {
          if (Date.now() < ignoreNextClickUntilRef.current) return;
          handleToggleControls();
        }}
      >
        <video
          ref={videoRef}
          src={videoUrl || "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"}
          className="w-full h-full object-contain transition-transform duration-75 select-none pointer-events-auto"
          style={{
            transform: `translate3d(${panOffset.x}px, ${panOffset.y}px, 0) scale(${zoomScale})`,
            transformOrigin: 'center center',
            maxHeight: '100%'
          }}
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
              showSeekToast(
        lang === 'ru'
          ? 'Перемотка вперёд доступна только до просмотренной минуты'
          : 'Oldinga faqat ko‘rilgan daqiqagacha o‘tkazish mumkin'
      );
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
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none z-10">
            <div className="w-10 h-10 border-3 border-white/20 border-t-[#007AFF] rounded-full animate-spin" />
          </div>
        )}

        {/* Video Error Message */}
        {hasError && (
          <div
            onClick={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
            className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center p-6 text-center z-20"
          >
            <AlertCircle className="w-12 h-12 text-red-500 mb-3" />
            <h4 className="text-white font-bold text-sm mb-1">
              {lang === 'ru' ? 'Не удалось загрузить видео' : 'Videoni yuklab bo‘lmadi'}
            </h4>
            <p className="text-xs text-[#8E8E93] max-w-[240px] mb-4">
              {lang === 'ru'
                ? 'Проверьте подключение к интернету или попробуйте позже.'
                : 'Internet aloqasini tekshiring yoki keyinroq qayta urinib ko‘ring.'}
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
              <span>{lang === 'ru' ? 'Повторить' : 'Qayta urinish'}</span>
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
          <div
            onClick={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
            className="z-30"
          >
            <CheckpointModal 
              checkpoint={activeCheckpoint} 
              onAnswer={handleAnswerCheckpoint} 
            />
          </div>
        )}
      </div>

      {/* ── CONTROLS & ENHANCED SEEKBAR (Full width horizontally across tablet & PC) ── */}
      <div 
        onClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onTouchEnd={(e) => e.stopPropagation()}
        className={`w-full max-w-none px-4 sm:px-8 py-3 z-30 transition-all duration-300 ${
          isOverlayLayout 
            ? 'absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/80 to-transparent' 
            : 'bg-[#121214] border-b border-white/[0.06]'
        } ${
          showControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
        }`}
        style={{
          paddingBottom: isOverlayLayout ? 'max(calc(var(--safe-area-bottom, 0px) + 12px), 16px)' : '10px',
          paddingLeft: isOverlayLayout ? 'max(calc(var(--safe-area-left, 0px) + 20px), 24px)' : undefined,
          paddingRight: isOverlayLayout ? 'max(calc(var(--safe-area-right, 0px) + 20px), 24px)' : undefined
        }}
      >
        {/* Seekbar Container with comfortable 32px touch target */}
        <div 
          ref={seekbarRef}
          onClick={(e) => handleSeekbarInteraction(e.clientX)}
          onTouchStart={(e) => handleSeekbarInteraction(e.touches[0].clientX)}
          onTouchMove={(e) => handleSeekbarInteraction(e.touches[0].clientX)}
          className="relative w-full h-8 flex items-center cursor-pointer group touch-none select-none py-2"
        >
          {/* Base Track */}
          <div className="w-full h-1.5 bg-[#2C2C2E] group-hover:h-2 transition-all rounded-full relative overflow-hidden">
            {/* Confirmed watch frontier indicator (Allowed Range) */}
            <div 
              className="absolute left-0 top-0 bottom-0 bg-white/25 rounded-full pointer-events-none"
              style={{ width: `${maxWatchedPercent}%` }}
            />
            {/* Current playback progress (Neon Gradient) */}
            <div 
              className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-[#00C6FF] to-[#0072FF] rounded-full pointer-events-none shadow-[0_0_8px_rgba(0,198,255,0.7)]"
              style={{ width: `${currentPercent}%` }}
            />
          </div>

          {/* Comfortable Scrubber Thumb */}
          <div 
            className="absolute w-4 h-4 bg-white rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.6)] border border-white/60 pointer-events-none -translate-x-1/2 group-hover:scale-125 transition-transform"
            style={{ left: `${currentPercent}%` }}
          />

          {/* Checkpoint marker dots */}
          {checkpoints.map((cp) => {
            const leftPct = (cp.trigger_time_sec / (duration || 1)) * 100;
            const isDone = answeredCheckpoints[cp.id];
            return (
              <div
                key={cp.id}
                className={`absolute w-2.5 h-2.5 rounded-full border border-black pointer-events-none -translate-x-1/2 ${
                  isDone ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,199,89,0.8)]' : 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.8)]'
                }`}
                style={{ left: `${leftPct}%` }}
                title={`${lang === 'ru' ? 'Стоп-тест' : 'Stop-test'}: ${formatTime(cp.trigger_time_sec)}`}
              />
            );
          })}
        </div>

        {/* Action Controls Row */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-3">
            {/* Play / Pause */}
            <button
              onClick={togglePlay}
              className="w-10 h-10 rounded-full bg-[#007AFF] hover:bg-blue-600 flex items-center justify-center text-white active:scale-95 transition-transform shadow-lg shadow-blue-500/25"
              title={isPlaying ? (lang === 'ru' ? 'Пауза' : "To'xtatish") : (lang === 'ru' ? 'Воспроизвести' : "O'ynatish")}
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white ml-0.5" />}
            </button>

            {/* Rewind -10s */}
            <button
              onClick={() => seekDelta(-10)}
              className="w-9 h-9 rounded-full bg-[#1C1C1E] border border-white/10 flex items-center justify-center text-white/90 active:scale-95 transition-transform"
              title={lang === 'ru' ? '-10 секунд' : '-10 soniya'}
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            {/* Time labels */}
            <div className="text-xs font-mono text-[#8E8E93] flex items-center gap-1 ml-1">
              <span className="text-white font-semibold">{formatTime(currentTime)}</span>
              <span>/</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Playback rate speed (strictly max 1.3x) */}
            <button
              onClick={handleCycleSpeed}
              className="px-2.5 py-1.5 rounded-xl bg-[#1C1C1E] border border-white/10 text-xs font-bold text-white hover:text-cyan-300 active:scale-95 transition-all"
              title={lang === 'ru' ? 'Скорость (макс. 1.3x)' : 'Tezlik (Maksimal 1.3x)'}
            >
              {playbackRate}x
            </button>

            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              className="w-9 h-9 rounded-xl bg-[#1C1C1E] border border-white/10 flex items-center justify-center text-white/80 hover:text-white active:scale-95 transition-transform"
              title={lang === 'ru' ? 'Полный экран' : "To'liq ekran"}
            >
              <Maximize className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ── LARGE CENTERED LESSON COMPLETION BANNER ── */}
      {isEnded && !activeCheckpoint && (
        <div
          onClick={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onTouchEnd={(e) => e.stopPropagation()}
          data-testid="video-end-banner"
          className="fixed inset-0 z-[55] bg-black/80 backdrop-blur-md flex items-center justify-center p-5 animate-in fade-in duration-200"
        >
          <div className="w-full max-w-md bg-[#1C1C1E] border border-white/10 rounded-[32px] p-6 sm:p-8 text-center space-y-5 shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-white font-extrabold text-xl sm:text-2xl leading-tight">
                {lang === 'ru' ? 'Урок успешно просмотрен!' : 'Dars muvaffaqiyatli ko‘rildi!'}
              </h3>
              <p className="text-xs sm:text-sm text-emerald-400 font-medium">
                {lang === 'ru' ? 'Все фрагменты подтверждены' : 'Barcha qismlar tasdiqlandi'}
              </p>
            </div>

            <div className="space-y-2.5 pt-1">
              <button
                type="button"
                onClick={() => {
                  impactMedium();
                  if (onStartQuiz) onStartQuiz();
                }}
                className="w-full bg-[#007AFF] hover:bg-[#0066D6] text-white font-bold py-3.5 px-5 rounded-2xl text-sm flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-all cursor-pointer"
              >
                <FileCheck2 className="w-4 h-4 shrink-0" />
                <span>{lang === 'ru' ? 'Начать тест' : 'Testni boshlash'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (videoRef.current) {
                    videoRef.current.currentTime = 0;
                    videoRef.current.play().then(() => {
                      setIsPlaying(true);
                      setIsEnded(false);
                    }).catch(() => setIsEnded(false));
                  }
                }}
                className="w-full bg-[#2C2C2E] hover:bg-[#3A3A3C] text-white font-bold py-3 px-5 rounded-2xl text-xs sm:text-sm flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
              >
                <RotateCcw className="w-4 h-4 shrink-0" />
                <span>{lang === 'ru' ? 'Смотреть снова' : 'Qayta ko‘rish'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── PORTRAIT MODE: TERMS BELOW VIDEO ── */}
      {!isOverlayLayout && (
        <div className="flex-1 overflow-y-auto bg-[#000000] flex flex-col no-scrollbar">
          {isGlossaryOpen ? (
            /* Dedicated Terms List Section displayed below video */
            <div className="p-4 sm:px-8 space-y-3 flex-1 flex flex-col">
              <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300">
                    <BookOpen className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-xs">
                      {lang === 'ru' ? 'Термины урока' : 'Dars terminlari'}
                    </h3>
                    <span className="text-[10px] text-[#8E8E93]">
                      {lang === 'ru' ? `Добавлено терминов: ${terms.length}` : `${terms.length} ta termin kiritilgan`}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setIsGlossaryOpen(false)}
                  className="px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/15 text-[11px] font-bold text-white/80 flex items-center gap-1 active:scale-95"
                >
                  <span>{lang === 'ru' ? 'Закрыть' : 'Yopish'}</span>
                  <X className="w-3 h-3" />
                </button>
              </div>

              {terms.length > 0 ? (
                <div className="space-y-2.5 flex-1 overflow-y-auto pt-1">
                  {terms.map((term, idx) => {
                    const hasTimestamp = term.timestamp !== undefined && term.timestamp !== null;
                    const isUnlocked = hasTimestamp && term.timestamp <= maxWatchedSeconds;

                    return (
                      <div
                        key={idx}
                        onClick={() => {
                          if (hasTimestamp) {
                            if (isUnlocked) {
                              clampAndSeek(term.timestamp);
                            } else {
                              showSeekToast(
                                lang === 'ru'
                                  ? 'Этот термин объясняется далее в видеоуроке'
                                  : 'Ushbu termin video davomida tushuntiriladi'
                              );
                            }
                          }
                        }}
                        className={`p-3 rounded-2xl border transition-all ${
                          hasTimestamp ? 'cursor-pointer active:scale-[0.98]' : ''
                        } ${
                          isUnlocked
                            ? 'bg-[#1C1C1E] border-white/10 hover:border-purple-500/40'
                            : 'bg-[#161618] border-white/5 opacity-80'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <span className="font-bold text-xs text-white leading-tight">
                            {term.term || term.title}
                          </span>
                          {hasTimestamp && (
                            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md font-bold flex items-center gap-1 ${
                              isUnlocked 
                                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' 
                                : 'bg-white/5 text-[#8E8E93]'
                            }`}>
                              <Clock className="w-2.5 h-2.5" />
                              <span>{formatTime(term.timestamp)}</span>
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[#8E8E93] leading-relaxed">
                          {term.definition || term.description || (
                            lang === 'ru'
                              ? 'Подробное объяснение термина дано в видеоуроке.'
                              : 'Ushbu termin bo‘yicha qo‘shimcha izoh video darsda berilgan.'
                          )}
                        </p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-8 text-center text-[#8E8E93] text-xs">
                  {lang === 'ru'
                    ? 'Словарь терминов для этого урока не добавлен.'
                    : 'Ushbu dars uchun terminlar lug‘ati kiritilmagan.'}
                </div>
              )}
            </div>
          ) : (
            /* Tap to open terms button (always accessible below video in portrait mode) */
            <div className="p-4 sm:px-8">
              <button
                type="button"
                onClick={() => setIsGlossaryOpen(true)}
                className="w-full py-3 px-4 rounded-2xl bg-[#1C1C1E] hover:bg-[#242426] border border-purple-500/25 flex items-center justify-between text-xs font-bold text-purple-300 active:scale-[0.98] transition-all cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <BookOpen className="w-4 h-4 text-purple-400" />
                  <span>{lang === 'ru' ? 'Список терминов урока' : 'Dars terminlari ro‘yxati'}</span>
                </div>
                <span className="bg-purple-500/20 text-purple-200 text-[10px] px-2 py-0.5 rounded-full">
                  {lang === 'ru' ? `${terms.length} терм.` : `${terms.length} ta termin`}
                </span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── LANDSCAPE / PC MODE: GLOSSARY RIGHT SIDEBAR DRAWER ── */}
      {isOverlayLayout && (
        <GlossaryPanel
          isOpen={isGlossaryOpen}
          onClose={() => setIsGlossaryOpen(false)}
          terms={terms}
          maxWatchedSeconds={maxWatchedSeconds}
          onSeekToTimestamp={(time) => {
            clampAndSeek(time);
          }}
          onBlockedTimestamp={() => {
            showSeekToast(
              lang === 'ru'
                ? 'Этот термин объясняется далее. Посмотрите видео, чтобы перейти к нему.'
                : 'Ushbu termin video davomida tushuntiriladi. Unga o‘tish uchun darsni ko‘ring.'
            );
          }}
        />
      )}
    </div>
  );
}
