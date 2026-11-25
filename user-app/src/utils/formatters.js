/**
 * Formats large Neyron balances compactly (1.8K, 25K, 1.2M or space-separated 1 850)
 */
export function formatCompactNeyron(value) {
  const num = Number(value) || 0;
  if (num >= 1_000_000) {
    const formatted = (num / 1_000_000).toFixed(1).replace(/\.0$/, '');
    return `${formatted}M`;
  }
  if (num >= 10_000) {
    const formatted = (num / 1_000).toFixed(1).replace(/\.0$/, '');
    return `${formatted}K`;
  }
  return num.toLocaleString('ru-RU').replace(/,/g, ' ');
}

export function formatTime(seconds) {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

/**
 * Formats video duration cleanly (e.g. "2:05", "14:20", "1:02:15").
 * Returns null if duration is missing/invalid.
 */
export function formatVideoDuration(seconds) {
  const sec = Math.round(Number(seconds));
  if (!Number.isFinite(sec) || sec <= 0) return null;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}
