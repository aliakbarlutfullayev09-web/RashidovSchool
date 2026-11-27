import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, Pause, RotateCcw, Maximize, 
  BookOpen, Clock, Lock, AlertCircle, RefreshCw, FileCheck2, CheckCircle2, 
  X, ZoomIn, ZoomOut, ChevronDown 
} from 'lucide-react';
import CheckpointModal from './CheckpointModal';
import GlossaryPanel from './GlossaryPanel';
import { formatTime } from '../utils/formatters';
import { useHaptic } from '../hooks/useHaptic';
import { useIsDesktop } from '../hooks/useIsDesktop';
import { useLanguage } from '../context/LanguageContext';
import { getWatchProgress, saveWatchProgress, incrementViewCount, saveLessonQuizProgress } from '../api/supabase';

function parseTermTimestamp(term) {
  const raw = term?.timestamp ?? term?.time_sec ?? term?.seconds;
  if (raw === undefined || raw === null || raw === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

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
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [rewindPulseKey, setRewindPulseKey] = useState(0);

  // Watch Frontier state
  const [maxWatchedSeconds, setMaxWatchedSeconds] = useState(0);
  const [toastMessage, setToastMessage] = useState(null);

  // Live top-right typewriter Termin popup state
  const [activeTermPopup, setActiveTermPopup] = useState(null);
  const [typedTermTitle, setTypedTermTitle] = useState('');
  const [typedTermDef, setTypedTermDef] = useState('');
  const [isTypingTerm, setIsTypingTerm] = useState(false);

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

  // Normalized & sorted terms list
  const normalizedTerms = useMemo(() => {
    return (Array.isArray(terms) ? terms : [])
      .map((t, idx) => ({
        ...t,
        _key: t?.id ?? `term-${idx}`,
        _title: String(t?.term || t?.title || '').trim(),
        _def: String(t?.definition || t?.description || '').trim(),
        _ts: parseTermTimestamp(t),
      }))
      .sort((a, b) => {
        if (a._ts === null && b._ts === null) return 0;
        if (a._ts === null) return 1;
        if (b._ts === null) return -1;
        return a._ts - b._ts;
      });
  }, [terms]);

  const unlockedTermsCount = useMemo(() => {
    return normalizedTerms.filter((t) => isEnded || t._ts === null || t._ts <= maxWatchedSeconds).length;
  }, [normalizedTerms, isEnded, maxWatchedSeconds]);

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
  const isScrubbingRef = useRef(false);
  const scrubBlockedNotifiedRef = useRef(false);
  const triggeredTermsRef = useRef(new Set());
  const maxWatchedRef = useRef(0);
  const isEndedRef = useRef(false);
  const pendingResumePosRef = useRef(0);
  const controlsTimeoutRef = useRef(null);
  const singleTapTimerRef = useRef(null);
  const ignoreNextClickUntilRef = useRef(0);
  const doubleTappedRef = useRef(false);

  // Expose onBack to window for Telegram native BackButton
  useEffect(() => {
    window.__rb_exit_video = onBack;
    return () => { window.__rb_exit_video = null; };
  }, [onBack]);

  // Keep maxWatchedRef & isEndedRef in sync
  useEffect(() => {
    maxWatchedRef.current = maxWatchedSeconds;
  }, [maxWatchedSeconds]);

  useEffect(() => {
    isEndedRef.current = isEnded;
  }, [isEnded]);

  // Load saved watch frontier on mount & persist lastPosition on unmount
  useEffect(() => {
    let mounted = true;
    async function loadProgress() {
      try {
        const saved = await getWatchProgress(userId, lessonId);
        if (mounted && saved?.maxWatchedSeconds) {
          const initSec = Number(saved.maxWatchedSeconds) || 0;
          setMaxWatchedSeconds(initSec);
          maxWatchedRef.current = initSec;

          const resumePos = Number(saved.lastPosition) || 0;
          const savedDur = Number(saved.duration) || 0;
          const alreadyCompleted = Boolean(saved.completed) || (savedDur > 0 && initSec >= savedDur - 2);
          if (!alreadyCompleted && resumePos > 0 && resumePos <= initSec) {
            pendingResumePosRef.current = resumePos;
            if (videoRef.current && videoRef.current.readyState >= 1) {
              videoRef.current.currentTime = resumePos;
              setCurrentTime(resumePos);
              lastPlaybackTimeRef.current = resumePos;
              pendingResumePosRef.current = 0;
            }
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
    return () => {
      mounted = false;
      if (!isEndedRef.current && maxWatchedRef.current > 0 && videoRef.current) {
        saveWatchProgress(
          userId,
          lessonId,
          videoRef.current.currentTime || 0,
          maxWatchedRef.current,
          videoRef.current.duration || 0
        );
      }
    };
  }, [userId, lessonId]);

  // Typewriter effect for live top-right Termin popup
  useEffect(() => {
    if (!activeTermPopup) {
      setTypedTermTitle('');
      setTypedTermDef('');
      setIsTypingTerm(false);
      return;
    }

    const fullTitle = activeTermPopup._title || '';
    const fullDef = activeTermPopup._def || '';
    setTypedTermTitle('');
    setTypedTermDef('');
    setIsTypingTerm(true);

    let titleIdx = 0;
    let defIdx = 0;
    let hideTimer = null;

    const timer = setInterval(() => {
      if (titleIdx < fullTitle.length) {
        titleIdx += 1;
        setTypedTermTitle(fullTitle.slice(0, titleIdx));
      } else if (defIdx < fullDef.length) {
        defIdx += 1;
        setTypedTermDef(fullDef.slice(0, defIdx));
      } else {
        clearInterval(timer);
        setIsTypingTerm(false);
        hideTimer = setTimeout(() => {
          setActiveTermPopup((curr) => (curr?._key === activeTermPopup._key ? null : curr));
        }, 6500);
      }
    }, 28);

    return () => {
      clearInterval(timer);
      if (hideTimer) clearTimeout(hideTimer);
    };
  }, [activeTermPopup]);

  // Auto-hide controls timer
  const resetControlsTimeout = useCallback(() => {
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    if (showControls && isPlaying && !isGlossaryOpen && !isEnded && !activeCheckpoint && !isScrubbing) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 4000);
    }
  }, [showControls, isPlaying, isGlossaryOpen, isEnded, activeCheckpoint, isScrubbing]);

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
    if (!videoRef.current || isScrubbingRef.current) return;
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
          saveWatchProgress(userId, lessonId, time, newFrontier, videoRef.current.duration || duration || 0);
        }
      }
    }

    // Trigger top-right typewriter Termin popup when playback reaches a term's second
    if (normalizedTerms.length > 0 && !activeCheckpoint) {
      for (const term of normalizedTerms) {
        if (term._ts === null) continue;
        if (time < term._ts - 1) {
          triggeredTermsRef.current.delete(term._key);
        } else if (
          time >= term._ts &&
          time <= term._ts + 5 &&
          !triggeredTermsRef.current.has(term._key)
        ) {
          triggeredTermsRef.current.add(term._key);
          setActiveTermPopup(term);
          break;
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
    if (deltaSec < 0) {
      setRewindPulseKey((k) => k + 1);
    }
    clampAndSeek(videoRef.current.currentTime + deltaSec);
    resetControlsTimeout();
  };

  // Synchronous drag/hold scrubbing along the seekbar
  const scrubToClientX = useCallback((clientX) => {
    if (!videoRef.current || !duration || !seekbarRef.current) return;
    const rect = seekbarRef.current.getBoundingClientRect();
    if (!rect.width) return;
    const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const targetTime = percent * duration;
    const frontier = maxWatchedRef.current;

    let clampedTime = Math.max(0, targetTime);
    if (targetTime > frontier + 0.5) {
      clampedTime = frontier;
      if (!scrubBlockedNotifiedRef.current) {
        scrubBlockedNotifiedRef.current = true;
        showSeekToast(
          lang === 'ru'
            ? 'Перемотка вперёд доступна только до просмотренной минуты'
            : 'Oldinga faqat ko‘rilgan daqiqagacha o‘tkazish mumkin'
        );
      }
    }

    videoRef.current.currentTime = clampedTime;
    setCurrentTime(clampedTime);
    lastPlaybackTimeRef.current = clampedTime;
    lastPlaybackWallClockRef.current = Date.now();
  }, [duration, lang, showSeekToast]);

  const handleSeekbarPointerDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!videoRef.current || !duration || !seekbarRef.current) return;

    isScrubbingRef.current = true;
    isSeekingRef.current = true;
    scrubBlockedNotifiedRef.current = false;
    setIsScrubbing(true);
    setShowControls(true);
    scrubToClientX(e.clientX);

    const onPointerMove = (moveEvt) => {
      moveEvt.preventDefault();
      scrubToClientX(moveEvt.clientX);
    };

    const onPointerUp = (upEvt) => {
      if (upEvt && typeof upEvt.clientX === 'number') {
        scrubToClientX(upEvt.clientX);
      }
      isScrubbingRef.current = false;
      isSeekingRef.current = false;
      setIsScrubbing(false);
      resetControlsTimeout();
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove, { passive: false });
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
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
      saveWatchProgress(userId, lessonId, full, full, full, true);
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
      saveWatchProgress(userId, lessonId, rewindTime, rewindTime, videoRef.current?.duration || duration || 0, false);

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

      {/* ── TOP TELEGRAM-STYLE "TERMINLAR" BUTTON (Fades in/out with player controls) ── */}
      <div 
        onTouchStart={(e) => e.stopPropagation()}
        onTouchEnd={(e) => e.stopPropagation()}
        className={`absolute z-40 pointer-events-auto transition-all duration-300 ${
          isOverlayLayout ? 'right-4' : 'right-3'
        } ${
          ((!showControls && !isGlossaryOpen) || Boolean(activeCheckpoint))
            ? 'opacity-0 pointer-events-none scale-95'
            : 'opacity-100 scale-100'
        }`}
        style={{
          top: isOverlayLayout
            ? (isDesktop
                ? 'max(calc(var(--safe-area-top, 0px) + 20px), 24px)'
                : 'max(calc(var(--safe-area-top, 0px) + 24px), 84px)')
            : 'max(calc(var(--safe-area-top, 0px) + 58px), 86px)'
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
          className={`w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-xl border-[1.5px] shadow-xl transition-all active:scale-95 cursor-pointer ${
            isGlossaryOpen
              ? 'bg-[#0F1E40]/85 border-[#1D4ED8] text-blue-200 shadow-blue-900/40'
              : 'bg-black/65 hover:bg-black/85 border-[#1E3A8A] text-blue-300'
          }`}
          title={lang === 'ru' ? 'Термины урока' : 'Dars terminlari'}
        >
          <BookOpen className="w-4 h-4 shrink-0" />
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
          className={`w-full h-full transition-transform duration-75 select-none pointer-events-auto ${
            isOverlayLayout || isTablet ? 'object-cover' : 'object-contain'
          }`}
          style={{
            transform: `translate3d(${panOffset.x}px, ${panOffset.y}px, 0) scale(${zoomScale})`,
            transformOrigin: 'center center',
            maxHeight: '100%'
          }}
          playsInline
          webkit-playsinline="true"
          x-webkit-airplay="allow"
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={(e) => {
            const metaDur = e.currentTarget.duration || 0;
            setDuration(metaDur);
            if (pendingResumePosRef.current > 0 && metaDur > 0 && pendingResumePosRef.current < metaDur - 2) {
              const pos = pendingResumePosRef.current;
              pendingResumePosRef.current = 0;
              e.currentTarget.currentTime = pos;
              setCurrentTime(pos);
              lastPlaybackTimeRef.current = pos;
            }
          }}
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

        {/* Top-Right Typewriter Termin Popup (appears when video reaches a term's second) */}
        <AnimatePresence>
          {activeTermPopup && !activeCheckpoint && !isEnded && (
            <motion.div
              key={activeTermPopup._key}
              data-testid="video-term-popup"
              initial={{ opacity: 0, x: 18, scale: 0.96 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 14, scale: 0.96 }}
              transition={{ type: 'spring', damping: 24, stiffness: 320 }}
              onClick={(e) => {
                e.stopPropagation();
                impactLight();
                setIsGlossaryOpen(true);
                setActiveTermPopup(null);
              }}
              onTouchStart={(e) => e.stopPropagation()}
              onTouchEnd={(e) => e.stopPropagation()}
              className={`absolute z-30 right-3 sm:right-4 ${
                isOverlayLayout
                  ? (isDesktop ? 'top-16 sm:top-[68px]' : 'top-[130px] sm:top-[134px]')
                  : 'top-3'
              } w-[min(310px,calc(100%-24px))] bg-[#121216]/88 backdrop-blur-xl border-[1.5px] border-[#1E3A8A] rounded-2xl p-3 sm:p-3.5 shadow-[0_12px_36px_rgba(0,0,0,0.6)] cursor-pointer select-none`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="font-bold text-xs sm:text-sm text-white leading-snug tracking-wide min-w-0 flex-1">
                  <span>{typedTermTitle}</span>
                  {isTypingTerm && typedTermTitle.length < activeTermPopup._title.length && (
                    <span className="inline-block w-[2px] h-[1em] align-middle ml-0.5 bg-blue-400 animate-pulse" />
                  )}
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveTermPopup(null);
                  }}
                  className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/75 hover:text-white transition-colors shrink-0"
                  aria-label="Close term"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {(typedTermDef || (isTypingTerm && typedTermTitle.length >= activeTermPopup._title.length && activeTermPopup._def)) && (
                <p className="mt-1.5 text-[11px] sm:text-xs text-white/80 leading-relaxed">
                  <span>{typedTermDef}</span>
                  {isTypingTerm && typedTermTitle.length >= activeTermPopup._title.length && (
                    <span className="inline-block w-[2px] h-[1em] align-middle ml-0.5 bg-blue-400 animate-pulse" />
                  )}
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Seek Lock Toast Notice */}
        {toastMessage && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-[#1C1C1E]/95 border border-amber-500/40 text-amber-300 px-4 py-2.5 rounded-2xl text-xs font-bold shadow-2xl flex items-center gap-2 pointer-events-none z-30 animate-in fade-in zoom-in-95 duration-200">
            <span>🔒</span>
            <span>{toastMessage}</span>
          </div>
        )}
      </div>

      {/* Stop-Test Checkpoint Overlay (outside video-wrapper stacking context so player controls never sit above it) */}
      {activeCheckpoint && (
        <div
          onClick={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onTouchEnd={(e) => e.stopPropagation()}
          className="relative z-[150]"
        >
          <CheckpointModal 
            key={`${activeCheckpoint.id}_${activeCheckpoint.trigger_time_sec}`}
            checkpoint={activeCheckpoint} 
            onAnswer={handleAnswerCheckpoint} 
          />
        </div>
      )}

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
          showControls && !activeCheckpoint ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
        }`}
        style={{
          paddingBottom: isOverlayLayout ? 'max(calc(var(--safe-area-bottom, 0px) + 12px), 16px)' : '10px',
          paddingLeft: isOverlayLayout ? 'max(calc(var(--safe-area-left, 0px) + 20px), 24px)' : undefined,
          paddingRight: isOverlayLayout ? 'max(calc(var(--safe-area-right, 0px) + 20px), 24px)' : undefined
        }}
      >
        {/* Seekbar Container with comfortable 32px touch/mouse scrub target */}
        <div 
          ref={seekbarRef}
          data-testid="video-seekbar"
          onPointerDown={handleSeekbarPointerDown}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full h-8 flex items-center cursor-pointer group touch-none select-none py-2"
        >
          {/* Base Track */}
          <div className={`w-full rounded-full relative overflow-hidden bg-[#2C2C2E] ${
            isScrubbing ? 'h-2.5' : 'h-1.5 group-hover:h-2 transition-all'
          }`}>
            {/* Confirmed watch frontier indicator (Allowed Range) */}
            <div 
              className="absolute left-0 top-0 bottom-0 bg-white/25 rounded-full pointer-events-none"
              style={{ width: `${maxWatchedPercent}%` }}
            />
            {/* Current playback progress (Neon Gradient) */}
            <div 
              className={`absolute left-0 top-0 bottom-0 bg-gradient-to-r from-[#00C6FF] to-[#0072FF] rounded-full pointer-events-none shadow-[0_0_8px_rgba(0,198,255,0.7)] ${
                isScrubbing ? 'transition-none' : ''
              }`}
              style={{ width: `${currentPercent}%` }}
            />
          </div>

          {/* Comfortable Scrubber Thumb */}
          <div 
            className={`absolute w-4 h-4 bg-white rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.6)] border border-white/60 pointer-events-none -translate-x-1/2 ${
              isScrubbing ? 'scale-125 ring-4 ring-[#00C6FF]/35 transition-none' : 'group-hover:scale-125 transition-transform'
            }`}
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

            {/* Rewind -10s with animated counter-clockwise spin & floating pulse */}
            <motion.button
              type="button"
              data-testid="video-rewind-10"
              onClick={() => seekDelta(-10)}
              whileTap={{ scale: 0.88 }}
              className="relative w-9 h-9 rounded-full bg-[#1C1C1E] hover:bg-[#2C2C2E] border border-white/10 flex items-center justify-center text-white/90 transition-colors cursor-pointer"
              title={lang === 'ru' ? '-10 секунд' : '-10 soniya'}
            >
              <motion.div
                key={rewindPulseKey}
                initial={rewindPulseKey > 0 ? { rotate: 0, scale: 1 } : false}
                animate={rewindPulseKey > 0 ? { rotate: -360, scale: [1, 0.82, 1.12, 1] } : {}}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                className="flex items-center justify-center"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </motion.div>

              <AnimatePresence>
                {rewindPulseKey > 0 && (
                  <motion.span
                    key={`badge-${rewindPulseKey}`}
                    initial={{ opacity: 0, y: 0, scale: 0.7 }}
                    animate={{ opacity: [0, 1, 0], y: -22, scale: [0.85, 1.05, 0.95] }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.65, ease: 'easeOut' }}
                    className="pointer-events-none absolute -top-2 left-1/2 -translate-x-1/2 text-[10px] font-extrabold text-[#00C6FF] whitespace-nowrap drop-shadow"
                  >
                    -10s
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>

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

      {/* ── PORTRAIT MODE: TERMS BELOW VIDEO (shown when opened via top-right Terminlar icon) ── */}
      {!isOverlayLayout && isGlossaryOpen && (
        <div className="flex-1 overflow-y-auto bg-[#000000] flex flex-col no-scrollbar">
          {/* Dedicated Terms List Section displayed below video */}
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
                      {lang === 'ru'
                        ? `Открыто: ${unlockedTermsCount} из ${normalizedTerms.length}`
                        : `Ochilgan: ${unlockedTermsCount} / ${normalizedTerms.length}`}
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

              {normalizedTerms.length > 0 ? (
                <div className="space-y-2.5 flex-1 overflow-y-auto pt-1">
                  {normalizedTerms.map((term, idx) => {
                    const hasTimestamp = term._ts !== null;
                    const isUnlocked = isEnded || !hasTimestamp || term._ts <= maxWatchedSeconds;

                    return (
                      <div
                        key={term._key || idx}
                        onClick={() => {
                          if (hasTimestamp) {
                            if (isUnlocked) {
                              clampAndSeek(term._ts);
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
                            ? 'bg-[#1C1C1E] border-purple-500/30 hover:border-purple-500/50'
                            : 'bg-[#161618] border-white/5 opacity-75'
                        }`}
                      >
                        {isUnlocked ? (
                          <>
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <span className="font-bold text-xs text-white leading-tight">
                                {term._title}
                              </span>
                              {hasTimestamp && (
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md font-bold flex items-center gap-1 bg-purple-500/20 text-purple-300 border border-purple-500/30 shrink-0">
                                  <Clock className="w-2.5 h-2.5" />
                                  <span>{formatTime(term._ts)}</span>
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-[#8E8E93] leading-relaxed">
                              {term._def || (
                                lang === 'ru'
                                  ? 'Подробное объяснение термина дано в видеоуроке.'
                                  : 'Ushbu termin bo‘yicha qo‘shimcha izoh video darsda berilgan.'
                              )}
                            </p>
                          </>
                        ) : (
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-6 h-6 rounded-lg bg-amber-500/15 border border-amber-500/25 flex items-center justify-center shrink-0">
                                <Lock className="w-3 h-3 text-amber-400" />
                              </div>
                              <span className="text-[11px] font-medium text-[#8E8E93] truncate">
                                {lang === 'ru'
                                  ? `Термин откроется на ${formatTime(term._ts)}`
                                  : `Termin ${formatTime(term._ts)} da ochiladi`}
                              </span>
                            </div>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/5 text-[#8E8E93] shrink-0">
                              {formatTime(term._ts)}
                            </span>
                          </div>
                        )}
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
        </div>
      )}

      {/* ── LANDSCAPE / PC MODE: GLOSSARY RIGHT SIDEBAR DRAWER ── */}
      {isOverlayLayout && (
        <GlossaryPanel
          isOpen={isGlossaryOpen}
          onClose={() => setIsGlossaryOpen(false)}
          terms={terms}
          maxWatchedSeconds={maxWatchedSeconds}
          isEnded={isEnded}
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
