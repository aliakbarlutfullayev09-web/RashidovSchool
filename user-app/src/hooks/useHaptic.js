import { useCallback } from 'react';

export function useHaptic() {
  const tg = window.Telegram?.WebApp;

  const impactLight = useCallback(() => {
    if (tg?.HapticFeedback) {
      tg.HapticFeedback.impactOccurred('light');
    }
  }, [tg]);

  const impactMedium = useCallback(() => {
    if (tg?.HapticFeedback) {
      tg.HapticFeedback.impactOccurred('medium');
    }
  }, [tg]);

  const impactHeavy = useCallback(() => {
    if (tg?.HapticFeedback) {
      tg.HapticFeedback.impactOccurred('heavy');
    }
  }, [tg]);

  const notificationSuccess = useCallback(() => {
    if (tg?.HapticFeedback) {
      tg.HapticFeedback.notificationOccurred('success');
    }
  }, [tg]);

  const notificationError = useCallback(() => {
    if (tg?.HapticFeedback) {
      tg.HapticFeedback.notificationOccurred('error');
    }
  }, [tg]);

  const selectionChanged = useCallback(() => {
    if (tg?.HapticFeedback) {
      tg.HapticFeedback.selectionChanged();
    }
  }, [tg]);

  return {
    impactLight,
    impactMedium,
    impactHeavy,
    notificationSuccess,
    notificationError,
    selectionChanged,
  };
}
