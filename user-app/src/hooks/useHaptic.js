import { useCallback } from 'react';

// Shared Web Audio API context for zero-latency synthesized sound effects
let audioCtx = null;

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;

  if (!audioCtx) {
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/**
 * High-precision synthesized sound effects
 */
function playTone(freq, type = 'sine', durationSec = 0.08, startGain = 0.18, targetFreq = null) {
  try {
    const isSoundOn = localStorage.getItem('rb_sound') !== 'false';
    if (!isSoundOn) return;

    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    const now = ctx.currentTime;

    osc.frequency.setValueAtTime(freq, now);
    if (targetFreq) {
      osc.frequency.exponentialRampToValueAtTime(targetFreq, now + durationSec);
    }

    gain.gain.setValueAtTime(startGain, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + durationSec);
  } catch (e) {
    console.warn('Audio tone error:', e);
  }
}

function playChord(frequencies, type = 'sine', durationSec = 0.22, gain = 0.12) {
  try {
    const isSoundOn = localStorage.getItem('rb_sound') !== 'false';
    if (!isSoundOn) return;

    frequencies.forEach((f, i) => {
      setTimeout(() => {
        playTone(f, type, durationSec, gain);
      }, i * 65);
    });
  } catch {}
}

export function useHaptic() {
  const isHapticOn = () => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem('rb_haptic') !== 'false';
  };

  const isSoundOn = () => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem('rb_sound') !== 'false';
  };

  const triggerVibrate = (pattern) => {
    if (!isHapticOn()) return;
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        navigator.vibrate(pattern);
      }
    } catch {}
  };

  const impactLight = useCallback(() => {
    const tg = window.Telegram?.WebApp;
    if (isHapticOn()) {
      if (tg?.HapticFeedback) {
        tg.HapticFeedback.impactOccurred('light');
      } else {
        triggerVibrate(10);
      }
    }
    if (isSoundOn()) {
      playTone(700, 'sine', 0.04, 0.08);
    }
  }, []);

  const impactMedium = useCallback(() => {
    const tg = window.Telegram?.WebApp;
    if (isHapticOn()) {
      if (tg?.HapticFeedback) {
        tg.HapticFeedback.impactOccurred('medium');
      } else {
        triggerVibrate(22);
      }
    }
    if (isSoundOn()) {
      playTone(550, 'triangle', 0.06, 0.12, 420);
    }
  }, []);

  const impactHeavy = useCallback(() => {
    const tg = window.Telegram?.WebApp;
    if (isHapticOn()) {
      if (tg?.HapticFeedback) {
        tg.HapticFeedback.impactOccurred('heavy');
      } else {
        triggerVibrate(40);
      }
    }
    if (isSoundOn()) {
      playTone(380, 'sine', 0.08, 0.16, 260);
    }
  }, []);

  const notificationSuccess = useCallback(() => {
    const tg = window.Telegram?.WebApp;
    if (isHapticOn()) {
      if (tg?.HapticFeedback) {
        tg.HapticFeedback.notificationOccurred('success');
      } else {
        triggerVibrate([20, 40, 30]);
      }
    }
    if (isSoundOn()) {
      // Triad ascending chime: C5 (523Hz) -> E5 (659Hz) -> G5 (784Hz)
      playChord([523.25, 659.25, 783.99], 'sine', 0.25, 0.14);
    }
  }, []);

  const notificationError = useCallback(() => {
    const tg = window.Telegram?.WebApp;
    if (isHapticOn()) {
      if (tg?.HapticFeedback) {
        tg.HapticFeedback.notificationOccurred('error');
      } else {
        triggerVibrate([50, 60, 50]);
      }
    }
    if (isSoundOn()) {
      // Dual lower thuds
      playChord([220, 160], 'triangle', 0.18, 0.15);
    }
  }, []);

  const selectionChanged = useCallback(() => {
    const tg = window.Telegram?.WebApp;
    if (isHapticOn()) {
      if (tg?.HapticFeedback) {
        tg.HapticFeedback.selectionChanged();
      } else {
        triggerVibrate(8);
      }
    }
    if (isSoundOn()) {
      playTone(1100, 'sine', 0.025, 0.06);
    }
  }, []);

  // Demo test method for Settings screen
  const testFeedback = useCallback(() => {
    const tg = window.Telegram?.WebApp;
    if (isHapticOn()) {
      if (tg?.HapticFeedback) {
        tg.HapticFeedback.notificationOccurred('success');
      } else {
        triggerVibrate([30, 50, 40]);
      }
    }
    if (isSoundOn()) {
      playChord([587.33, 739.99, 880], 'sine', 0.28, 0.18);
    }
  }, []);

  return {
    impactLight,
    impactMedium,
    impactHeavy,
    notificationSuccess,
    notificationError,
    selectionChanged,
    testFeedback,
    isHapticOn,
    isSoundOn,
    success: notificationSuccess,
    error: notificationError,
  };
}
