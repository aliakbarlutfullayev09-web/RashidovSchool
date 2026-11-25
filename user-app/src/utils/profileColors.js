// Telegram-inspired profile background color presets & avatar fallback palettes

export const PROFILE_BG_COLORS = [
  {
    id: 'blue',
    hex: '#007AFF',
    accent: '#32D7FF',
    labelUz: "Ko'k",
    labelRu: 'Синий',
  },
  {
    id: 'cyan',
    hex: '#06B6D4',
    accent: '#67E8F9',
    labelUz: 'Moviy',
    labelRu: 'Голубой',
  },
  {
    id: 'emerald',
    hex: '#10B981',
    accent: '#34D399',
    labelUz: 'Yashil',
    labelRu: 'Зелёный',
  },
  {
    id: 'purple',
    hex: '#8B5CF6',
    accent: '#C084FC',
    labelUz: 'Binafsha',
    labelRu: 'Фиолетовый',
  },
  {
    id: 'pink',
    hex: '#EC4899',
    accent: '#F472B6',
    labelUz: 'Pushti',
    labelRu: 'Розовый',
  },
  {
    id: 'orange',
    hex: '#F59E0B',
    accent: '#FBBF24',
    labelUz: 'Olovrang',
    labelRu: 'Оранжевый',
  },
  {
    id: 'red',
    hex: '#EF4444',
    accent: '#F87171',
    labelUz: 'Qizil',
    labelRu: 'Красный',
  },
  {
    id: 'slate',
    hex: '#64748B',
    accent: '#94A3B8',
    labelUz: 'Kulrang',
    labelRu: 'Серый',
  },
];

// Classic Telegram avatar letter gradients (used when Telegram photo_url is unavailable)
export const AVATAR_FALLBACK_GRADIENTS = [
  { from: '#FF516A', to: '#D9344E' }, // Crimson
  { from: '#FFA85C', to: '#E67A19' }, // Orange
  { from: '#66A5FF', to: '#2868E6' }, // Blue
  { from: '#54CB68', to: '#219A5C' }, // Green
  { from: '#42D2FF', to: '#198AD6' }, // Cyan
  { from: '#A47BFF', to: '#6D43E6' }, // Violet
  { from: '#FF5B9E', to: '#D12673' }, // Pink
];

export function getProfileColorPreset(colorId) {
  return PROFILE_BG_COLORS.find((c) => c.id === colorId) || PROFILE_BG_COLORS[0];
}

export function getSavedProfileColor(userId) {
  if (typeof window === 'undefined') return 'blue';
  try {
    const specific = userId ? localStorage.getItem(`rb_profile_color_${userId}`) : null;
    const general = localStorage.getItem('rb_profile_color');
    const chosen = specific || general || 'blue';
    return PROFILE_BG_COLORS.some((c) => c.id === chosen) ? chosen : 'blue';
  } catch {
    return 'blue';
  }
}

export function saveProfileColor(userId, colorId) {
  if (typeof window === 'undefined') return;
  try {
    if (userId) {
      localStorage.setItem(`rb_profile_color_${userId}`, colorId);
    }
    localStorage.setItem('rb_profile_color', colorId);
  } catch {}
}

export function getOrCreateRandomAvatarGradient(userId) {
  const key = `rb_avatar_random_idx_${userId || 'guest'}`;
  if (typeof window === 'undefined') return AVATAR_FALLBACK_GRADIENTS[0];
  try {
    const stored = sessionStorage.getItem(key) ?? localStorage.getItem(key);
    let idx = stored !== null ? parseInt(stored, 10) : NaN;
    if (isNaN(idx) || idx < 0 || idx >= AVATAR_FALLBACK_GRADIENTS.length) {
      idx = Math.floor(Math.random() * AVATAR_FALLBACK_GRADIENTS.length);
      sessionStorage.setItem(key, String(idx));
      localStorage.setItem(key, String(idx));
    }
    return AVATAR_FALLBACK_GRADIENTS[idx];
  } catch {
    return AVATAR_FALLBACK_GRADIENTS[0];
  }
}
