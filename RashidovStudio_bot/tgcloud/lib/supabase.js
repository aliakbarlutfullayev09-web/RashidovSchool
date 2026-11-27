import { fetch } from 'sdk';
import { CONFIG } from './config.js';

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

export async function findUsersByQuery(queryText) {
  const q = String(queryText || '').trim();
  if (!q) return [];
  if (/^\d+$/.test(q)) {
    const exact = await getUser(Number(q));
    return exact ? [exact] : [];
  }
  const clean = q.replace(/[*(),]/g, '');
  const rows = await sbRequest(
    `/users?full_name=ilike.*${encodeURIComponent(clean)}*&select=*&order=created_at.desc&limit=10`
  );
  return rows || [];
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

export async function getAdminContext(telegramId) {
  const user = await getUser(telegramId);
  if (!user) return null;

  const role = user.role;
  if (role === 'superadmin' || role === 'admin') {
    return {
      user,
      role,
      isSuperadmin: true,
      canSend: true,
      canGift: true,
      subjectIds: null,
      subjectNames: ['Все предметы'],
    };
  }
  if (role !== 'teacher') return null;

  const assignments = await sbRequest(
    `/subject_admins?user_id=eq.${encodeURIComponent(telegramId)}&select=*`
  );
  const userPerms = user.permissions || {};

  let canSend = Boolean(userPerms.can_send);
  let canGift = Boolean(userPerms.can_gift);
  let subjectIds = [];

  if (assignments && assignments.length > 0) {
    canSend = canSend || assignments.some((r) => Boolean(r.permissions?.can_send));
    canGift = canGift || assignments.some((r) => Boolean(r.permissions?.can_gift));
    subjectIds = [...new Set(assignments.map((r) => Number(r.subject_id)))];
  } else if (user.assigned_subject_id) {
    subjectIds = [Number(user.assigned_subject_id)];
  }

  let subjectNames = [];
  if (subjectIds.length > 0) {
    const subjects = await sbRequest(
      `/subjects?id=in.(${subjectIds.join(',')})&select=*`
    );
    subjectNames = (subjects || []).map(
      (s) => String(s.name || s.title || `#${s.id}`)
    );
  }

  return {
    user,
    role,
    isSuperadmin: false,
    canSend,
    canGift,
    subjectIds,
    subjectNames,
  };
}

export async function getStudentIdsForBroadcast(subjectIds) {
  if (subjectIds === null) {
    const rows = await sbRequest('/users?role=eq.student&select=telegram_id');
    return (rows || []).map((r) => Number(r.telegram_id));
  }
  if (!subjectIds || subjectIds.length === 0) return [];

  const courses = await sbRequest(
    `/courses?subject_id=in.(${subjectIds.join(',')})&select=id`
  );
  const courseIds = (courses || []).map((c) => c.id);
  if (courseIds.length === 0) return [];

  const lessons = await sbRequest(
    `/lessons?course_id=in.(${courseIds.join(',')})&select=id`
  );
  const lessonIds = (lessons || []).map((l) => l.id);
  if (lessonIds.length === 0) return [];

  const progress = await sbRequest(
    `/progress?lesson_id=in.(${lessonIds.join(',')})&select=user_id`
  );
  const uniqueIds = [...new Set((progress || []).map((p) => Number(p.user_id)))];
  if (uniqueIds.length === 0) return [];

  const users = await sbRequest(
    `/users?telegram_id=in.(${uniqueIds.join(',')})&role=eq.student&select=telegram_id`
  );
  return (users || []).map((u) => Number(u.telegram_id));
}

export async function getBotState(userId) {
  const rows = await sbRequest(
    `/bot_states?user_id=eq.${encodeURIComponent(userId)}&select=*&limit=1`
  );
  return rows?.[0] ?? null;
}

export async function setBotState(userId, state, data) {
  await sbRequest('/bot_states', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify({
      user_id: userId,
      state,
      data,
      updated_at: new Date().toISOString(),
    }),
  });
}

export async function clearBotState(userId) {
  await sbRequest(`/bot_states?user_id=eq.${encodeURIComponent(userId)}`, {
    method: 'DELETE',
  });
}
