import { fetch } from 'sdk/fetch';
import { CONFIG } from './config.js';

export const DEFAULT_SUPPORT_CONTACTS = {
  bio: { telegram: '@rashidov_bio_mentor', phone: '+998 90 123 45 67' },
  chem: { telegram: '@rashidov_chem_mentor', phone: '+998 90 765 43 21' },
  tech: { telegram: '@rashidov_support', phone: '+998 95 889 78 88' },
};

const REST_BASE = `${CONFIG.SUPABASE_URL.replace(/\/$/, '')}/rest/v1`;

function headers(extra = {}) {
  return {
    apikey: CONFIG.SUPABASE_KEY,
    Authorization: `Bearer ${CONFIG.SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    ...extra,
  };
}

async function sbRequest(path, options = {}) {
  const res = await fetch(`${REST_BASE}${path}`, {
    ...options,
    headers: headers(options.headers),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Supabase ${res.status}: ${errText}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export async function getUser(telegramId) {
  const rows = await sbRequest(
    `/users?telegram_id=eq.${encodeURIComponent(telegramId)}&select=*&limit=1`
  );
  return rows?.[0] ?? null;
}

export async function createUser({ telegramId, fullName, referredBy = null, language = 'uz' }) {
  const rows = await sbRequest('/users', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      telegram_id: telegramId,
      role: 'student',
      full_name: fullName,
      language,
      balance: 0,
      referred_by: referredBy,
    }),
  });
  return rows[0];
}

export async function updateLanguage(telegramId, language) {
  await sbRequest(`/users?telegram_id=eq.${encodeURIComponent(telegramId)}`, {
    method: 'PATCH',
    body: JSON.stringify({ language }),
  });
}

export async function incrementBalance(telegramId, delta) {
  const newBalance = await sbRequest('/rpc/increment_balance', {
    method: 'POST',
    body: JSON.stringify({ p_user_id: telegramId, p_delta: delta }),
  });
  return Number(newBalance);
}

export async function logTransaction({ userId, amount, type, description }) {
  await sbRequest('/transactions', {
    method: 'POST',
    body: JSON.stringify({
      user_id: userId,
      amount,
      type,
      description,
    }),
  });
}

export async function getLesson(lessonId) {
  const rows = await sbRequest(
    `/lessons?id=eq.${encodeURIComponent(lessonId)}&select=id,title,video_url&limit=1`
  );
  return rows?.[0] ?? null;
}

export async function getSupportContacts() {
  try {
    const rows = await sbRequest('/subjects?id=eq.1&select=id,description&limit=1');
    const raw = rows?.[0]?.description;
    if (typeof raw === 'string' && raw.trim().startsWith('{')) {
      const parsed = JSON.parse(raw);
      return {
        bio: { ...DEFAULT_SUPPORT_CONTACTS.bio, ...(parsed.bio || {}) },
        chem: { ...DEFAULT_SUPPORT_CONTACTS.chem, ...(parsed.chem || {}) },
        tech: { ...DEFAULT_SUPPORT_CONTACTS.tech, ...(parsed.tech || {}) },
      };
    }
  } catch {
    // Fallback to defaults if metadata is unavailable
  }
  return DEFAULT_SUPPORT_CONTACTS;
}
