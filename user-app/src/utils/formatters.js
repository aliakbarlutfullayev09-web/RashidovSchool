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
