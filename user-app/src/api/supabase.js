import { createClient } from '@supabase/supabase-js';
import { mockSubjects, mockCourses, mockLessons, mockProgress } from '../mock/data';
import { mergeExamPortalData } from './examDefaults';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const supabaseKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

let sessionJwt = null;

export function setSupabaseAuthToken(token) {
  sessionJwt = token || null;
}

export function getSessionToken() {
  return sessionJwt;
}

const authedFetch = (input, init = {}) => {
  const headers = new Headers(init.headers || {});
  if (sessionJwt) {
    headers.set('Authorization', `Bearer ${sessionJwt}`);
  }
  return fetch(input, { ...init, headers });
};

export const supabase =
  supabaseUrl && supabaseKey
    ? createClient(supabaseUrl, supabaseKey, { global: { fetch: authedFetch } })
    : createClient('https://invalid.supabase.local', 'missing-anon-key', {
        global: {
          fetch: async () => {
            throw new Error('VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are not configured');
          },
        },
      });

export async function authenticateTelegram(initData) {
  if (!initData) {
    return { ok: false, error: 'Missing Telegram initData' };
  }
  const apiUrl = import.meta.env.VITE_API_URL?.replace(/\/$/, '');
  const endpoints = apiUrl
    ? [`${apiUrl}/api/auth/telegram`, '/api/auth/telegram']
    : ['/api/auth/telegram'];

  let lastError = 'Authentication failed';
  for (const url of endpoints) {
    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData, app: 'user' }),
      });
      const contentType = resp.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) continue;
      const data = await resp.json();
      if (resp.ok && data?.ok && data?.user) {
        if (data.token) {
          setSupabaseAuthToken(data.token);
        }
        return { ok: true, token: data.token || null, user: data.user };
      }
      lastError = data?.error || data?.detail || lastError;
    } catch (e) {
      lastError = e?.message || lastError;
    }
  }
  return { ok: false, error: lastError };
}

/**
 * Ensures user is registered in Supabase and synchronizes streak / last active date.
 * Guarantees that every user opening user-app is visible in admin-app immediately.
 */
export async function syncUserSession(rawUser) {
  if (!rawUser) return null;

  const telegramId = Number(rawUser.id || rawUser.telegram_id);
  if (!telegramId || isNaN(telegramId)) return null;

  const firstName = rawUser.first_name || rawUser.full_name || 'Student';

  try {
    const { data: rpcData, error: rpcErr } = await supabase.rpc('sync_daily_activity');
    if (!rpcErr && rpcData?.ok && rpcData?.user) {
      return rpcData.user;
    }

    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('telegram_id', telegramId)
      .maybeSingle();

    if (existingUser) {
      return existingUser;
    }
  } catch (err) {
    console.warn('syncUserSession network fallback:', err);
  }
  return {
    telegram_id: telegramId,
    full_name: firstName,
    balance: 0,
    debt: 0,
    streak_days: 1,
    class_group: '11-A',
    language: 'uz',
    role: 'student'
  };
}

export const getUserData = async (telegramId) => {
  const { data, error } = await supabase.from('users').select('*').eq('telegram_id', telegramId).single();
  return { data, error };
};

export async function updateUserProfile(telegramId, data) {
  const { data: user, error } = await supabase
    .from('users')
    .update(data)
    .eq('telegram_id', telegramId)
    .select()
    .single();
  return { data: user, error };
}

export async function applyPromoCode(telegramId, code, lang = 'uz') {
  const isRu = lang === 'ru';
  try {
    if (!code || !code.trim()) {
      return { success: false, message: isRu ? 'Введите промокод' : 'Kodni kiriting' };
    }

    const { data, error } = await supabase.rpc('redeem_promo', { p_code: code.trim() });
    if (error) {
      return { success: false, message: isRu ? `Ошибка БД: ${error.message}` : `DB xatosi: ${error.message}` };
    }

    if (!data?.ok) {
      const msgMap = {
        NOT_FOUND: isRu ? 'Промокод не найден' : 'Promo-kod topilmadi',
        EXPIRED: isRu ? 'Срок действия промокода истёк' : 'Promo-kod muddati tugagan',
        LIMIT_REACHED: isRu ? 'Лимит активаций исчерпан' : 'Foydalanish limiti tugagan',
        ALREADY_USED: isRu ? 'Вы уже использовали этот промокод' : 'Siz bu promo-koddan allaqachon foydalangansiz',
        RATE_LIMIT_EXCEEDED: isRu ? 'Слишком много попыток. Подождите немного.' : 'Juda ko‘p urinish. Biroz kuting.',
      };
      return {
        success: false,
        code: data?.code,
        message: msgMap[data?.code] || data?.message || (isRu ? 'Неверный промокод' : 'Xato promo-kod'),
      };
    }

    return {
      success: true,
      message: isRu
        ? `На ваш счёт начислено ${data.bonus} нейронов!`
        : `${data.bonus} Neyron hisobingizga qo'shildi!`,
      bonus: Number(data.bonus || 0),
      newBalance: Number(data.new_balance || 0),
    };
  } catch (err) {
    return {
      success: false,
      message: (isRu ? 'Ошибка сервера: ' : 'Server xatosi: ') + err.message
    };
  }
}

// Alias for backwards compatibility
export const applyPromo = async (code, userId) => {
  return applyPromoCode(userId, code);
};

async function fetchPublicSubjectsRaw() {
  const { data: rpcRows, error: rpcErr } = await supabase.rpc('get_public_subjects');
  if (!rpcErr && Array.isArray(rpcRows)) {
    return rpcRows;
  }
  return null;
}

export const getStreakFreezeCost = async () => {
  try {
    const { data, error } = await supabase.rpc('get_streak_freeze_cost');
    if (!error && data !== null && data !== undefined) {
      return Number(data);
    }
  } catch {}
  return null;
};

export const getSubjects = async () => {
  try {
    const data = await fetchPublicSubjectsRaw();
    if (data && data.length > 0) {
      const mapped = data.map((d, idx) => {
        const rawName = (d.name || '').trim();
        const norm = rawName.toLowerCase();
        
        let key = 'biologiya';
        let latinName = 'BIOLOGIYA';
        let bgGradient = 'from-[#031B13] via-[#020E0A] to-[#000000]';
        let borderClass = 'border-emerald-500/35';
        let shadowClass = 'shadow-[0_8px_32px_rgba(16,185,129,0.22)]';
        let imageUrl = '/banners/biologiya_banner.jpg';
        let videoUrl = '/banners/biologiya_banner.mp4';
        let icon = '🧬';
        let order = 99;

        if (norm.includes('bio') || norm.includes('био') || d.id === 1) {
          key = 'biologiya';
          latinName = 'BIOLOGIYA';
          bgGradient = 'from-[#031B13] via-[#020E0A] to-[#000000]';
          borderClass = 'border-emerald-500/35';
          shadowClass = 'shadow-[0_8px_32px_rgba(16,185,129,0.22)]';
          imageUrl = '/banners/biologiya_banner.jpg';
          videoUrl = '/banners/biologiya_banner.mp4';
          icon = '🧬';
          order = 1;
        } else if (norm.includes('xim') || norm.includes('kim') || norm.includes('хим') || d.id === 2) {
          key = 'kimyo';
          latinName = 'KIMYO';
          bgGradient = 'from-[#19092B] via-[#0D0417] to-[#000000]';
          borderClass = 'border-purple-500/35';
          shadowClass = 'shadow-[0_8px_32px_rgba(168,85,247,0.22)]';
          imageUrl = '/banners/kimyo_banner.jpg';
          videoUrl = '/banners/kimyo_banner.mp4';
          icon = '🧪';
          order = 2;
        } else if (norm.includes('mat') || norm.includes('мат') || d.id === 3) {
          key = 'matematika';
          latinName = 'MATEMATIKA';
          bgGradient = 'from-[#05142B] via-[#020A17] to-[#000000]';
          borderClass = 'border-blue-500/35';
          shadowClass = 'shadow-[0_8px_32px_rgba(0,122,255,0.22)]';
          imageUrl = 'https://images.unsplash.com/photo-1633424974203-6c91b2a651ee?auto=format&fit=crop&w=1200&q=85';
          videoUrl = null;
          icon = '📐';
          order = 3;
        } else {
          // Dynamic Custom Subject Added in Admin App
          key = norm.replace(/[^a-z0-9]/gi, '_');
          latinName = rawName.toUpperCase();
          bgGradient = 'from-[#1A102F] via-[#0B061A] to-[#000000]';
          borderClass = 'border-cyan-500/35';
          shadowClass = 'shadow-[0_8px_32px_rgba(6,182,212,0.22)]';
          imageUrl = 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=85';
          videoUrl = null;
          icon = d.icon || '📚';
          order = idx + 10;
        }

        let desc = d.description;
        if (desc && typeof desc === 'string' && desc.trim().startsWith('{')) {
          desc = `${latinName} kursi bo'yicha video darslar va testlar`;
        }

        return {
          id: d.id,
          key,
          name: latinName,
          order,
          original_name: d.name,
          description: desc || `${latinName} kursi bo'yicha video darslar va testlar`,
          bg_gradient: bgGradient,
          border_class: borderClass,
          shadow_class: shadowClass,
          image_url: imageUrl,
          video_url: videoUrl,
          icon
        };
      });

      // Always guarantee Biologiya -> Kimyo -> Matematika order
      mapped.sort((a, b) => a.order - b.order);
      return mapped;
    }
  } catch (e) {
    console.warn('Supabase getSubjects fallback to mock:', e);
  }
  return mockSubjects;
};

const readSiteMetadata = async () => {
  try {
    const rows = await fetchPublicSubjectsRaw();
    const primary = rows?.find((r) => Number(r.id) === 1);
    if (primary?.description && typeof primary.description === 'string') {
      const parsed = JSON.parse(primary.description);
      if (parsed && typeof parsed === 'object') {
        return parsed;
      }
    }
  } catch {}
  return {};
};

function buildApiAuthHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  if (sessionJwt) {
    headers.Authorization = `Bearer ${sessionJwt}`;
  }
  const initData = typeof window !== 'undefined' ? window.Telegram?.WebApp?.initData : '';
  if (initData) {
    headers['X-Telegram-Init-Data'] = initData;
  }
  return headers;
}

export const getExamPortalData = async (subjectRows = []) => {
  const apiUrl = import.meta.env.VITE_API_URL?.replace(/\/$/, '');
  const endpoints = apiUrl
    ? [`${apiUrl}/api/exams/questions`, '/api/exams/questions']
    : ['/api/exams/questions'];
  const headers = buildApiAuthHeaders();

  for (const url of endpoints) {
    try {
      const resp = await fetch(url, { method: 'GET', headers });
      const contentType = resp.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) continue;
      const data = await resp.json();
      if (resp.ok && data?.ok && data?.portalData) {
        return data.portalData;
      }
    } catch {}
  }

  // Offline / mock fallback uses stripped defaults (zero answer keys in client bundle)
  return mergeExamPortalData(null, subjectRows);
};

export const submitExamAttempt = async ({ attemptId, subjectKey, mode, testId, answers }) => {
  const apiUrl = import.meta.env.VITE_API_URL?.replace(/\/$/, '');
  const endpoints = apiUrl
    ? [`${apiUrl}/api/exams/submit`, '/api/exams/submit']
    : ['/api/exams/submit'];
  const headers = buildApiAuthHeaders();

  let lastError = 'Exam submit failed';
  for (const url of endpoints) {
    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ attemptId, subjectKey, mode, testId, answers }),
      });
      const contentType = resp.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) continue;
      const data = await resp.json();
      if (resp.ok && data?.ok) {
        return data;
      }
      lastError = data?.error || data?.detail || lastError;
    } catch (e) {
      lastError = e?.message || lastError;
    }
  }
  return { ok: false, error: lastError };
};

export const getCourses = async (subjectId, prefetchedMeta = null) => {
  try {
    let query = supabase.from('courses').select('*').order('order_index');
    if (subjectId) {
      query = query.eq('subject_id', subjectId);
    }
    const [{ data, error }, meta] = await Promise.all([
      query,
      prefetchedMeta ? Promise.resolve(prefetchedMeta) : readSiteMetadata()
    ]);
    const courseImages = meta?.course_images || {};
    if (!error && data && data.length > 0) {
      return data.map(c => ({
        ...c,
        image_url: c.image_url || courseImages[String(c.id)] || null
      }));
    }
  } catch (e) {
    console.warn('Supabase getCourses fallback to mock:', e);
  }
  return mockCourses.filter(c => !subjectId || c.subject_id === Number(subjectId));
};

export const getLessons = async (courseId) => {
  try {
    const [{ data, error }, meta] = await Promise.all([
      supabase.rpc('get_lessons_catalog', {
        p_course_id: courseId ? Number(courseId) : null,
      }),
      readSiteMetadata(),
    ]);
    const lessonMeta = meta?.lesson_meta || {};
    if (!error && Array.isArray(data) && data.length > 0) {
      return data.map(l => {
        const m = lessonMeta[String(l.id)] || {};
        return {
          ...l,
          thumbnail_url: l.thumbnail_url || m.thumbnail_url || null,
          duration: l.duration || m.duration || null,
          terms: Array.isArray(l.terms) ? l.terms : (Array.isArray(m.terms) ? m.terms : [])
        };
      });
    }
  } catch (e) {
    console.warn('Supabase getLessons fallback to mock:', e);
  }
  if (courseId) {
    return mockLessons.filter(l => l.course_id === Number(courseId));
  }
  return mockLessons;
};

/**
 * Single batch request to fetch all courses and all their lessons for a subject.
 * Eliminates serial waterfall loop.
 */
export const getCoursesAndLessons = async (subjectId) => {
  try {
    const meta = await readSiteMetadata();
    const dbCourses = await getCourses(subjectId, meta);
    if (!dbCourses || dbCourses.length === 0) {
      return { courses: [], lessons: [] };
    }

    const courseMap = dbCourses.reduce((acc, c) => {
      acc[c.id] = c;
      return acc;
    }, {});

    const courseIds = dbCourses.map(c => Number(c.id));
    const { data: dbLessons, error } = await supabase.rpc('get_lessons_catalog', {
      p_course_ids: courseIds,
    });

    const lessonMeta = meta?.lesson_meta || {};

    if (!error && Array.isArray(dbLessons) && dbLessons.length > 0) {
      const hydrated = dbLessons.map(l => {
        const m = lessonMeta[String(l.id)] || {};
        const parentCourse = courseMap[l.course_id];
        return {
          ...l,
          thumbnail_url: l.thumbnail_url || m.thumbnail_url || parentCourse?.image_url || null,
          duration: l.duration || m.duration || null,
          category_name: l.category_name || parentCourse?.title || null,
          terms: Array.isArray(l.terms) ? l.terms : (Array.isArray(m.terms) ? m.terms : [])
        };
      });
      return { courses: dbCourses, lessons: hydrated };
    }
    
    // Fallback if dbLessons is empty
    let fallbackLessons = [];
    for (const c of dbCourses) {
      const match = mockLessons.filter(l => l.course_id === c.id);
      fallbackLessons.push(...match);
    }
    return { courses: dbCourses, lessons: fallbackLessons };
  } catch (e) {
    console.warn('Error in getCoursesAndLessons:', e);
    return { 
      courses: mockCourses.filter(c => c.subject_id === Number(subjectId)),
      lessons: mockLessons 
    };
  }
};

export const getProgress = async (userId) => {
  if (!userId) return [];
  const { data } = await supabase.from('progress').select('*').eq('user_id', userId);
  return data || [];
};

export const getWatchProgress = async (userId, lessonId) => {
  const key = `rb_watch_progress_${userId || 'guest'}_${lessonId}`;
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Error reading local watch progress:', e);
  }
  return { maxWatchedSeconds: 0, lastPosition: 0 };
};

export const saveWatchProgress = async (
  userId,
  lessonId,
  currentPosition,
  maxWatchedSeconds,
  durationSeconds = 0,
  completed = undefined
) => {
  const key = `rb_watch_progress_${userId || 'guest'}_${lessonId}`;
  let existing = {};
  try {
    const raw = localStorage.getItem(key);
    if (raw) existing = JSON.parse(raw) || {};
  } catch {}

  const resolvedDuration = Math.floor(durationSeconds || 0) || Math.floor(existing.duration || 0) || 0;
  const maxWatched = Math.floor(maxWatchedSeconds || 0);
  const isCompleted = completed !== undefined
    ? Boolean(completed)
    : Boolean(existing.completed) || (resolvedDuration > 0 && maxWatched >= Math.max(1, resolvedDuration - 2));

  const payload = {
    lessonId,
    lastPosition: Math.floor(currentPosition || 0),
    maxWatchedSeconds: maxWatched,
    duration: resolvedDuration,
    completed: isCompleted,
    updatedAt: new Date().toISOString()
  };
  try {
    localStorage.setItem(key, JSON.stringify(payload));
    if (userId) {
      try {
        await supabase.rpc('record_lesson_watch', { p_lesson_id: Number(lessonId) });
      } catch {}
    }
    return { success: true, localOnly: true };
  } catch (e) {
    console.warn('saveWatchProgress error:', e);
    return { success: false, error: e.message };
  }
};

export const freezeStreak = async (_userId) => {
  try {
    const { data, error } = await supabase.rpc('freeze_streak_rpc');
    if (error || !data?.ok) {
      return {
        success: false,
        code: data?.code || 'FAILED',
        error: data?.error || error?.message || 'Streak freeze failed',
      };
    }
    return {
      success: true,
      cost: Number(data.cost || 10000),
      newBalance: Number(data.new_balance || 0),
      frozenUntil: data.frozen_until,
    };
  } catch {
    return { success: false };
  }
};

export const createStarsInvoiceLink = async (productIdOrStars) => {
  const productId =
    typeof productIdOrStars === 'string' && productIdOrStars.startsWith('stars_')
      ? productIdOrStars
      : `stars_${Number(productIdOrStars)}`;
  const apiUrl = import.meta.env.VITE_API_URL?.replace(/\/$/, '');
  const endpoints = apiUrl
    ? [`${apiUrl}/api/payments/create-stars-invoice`, '/api/create-invoice']
    : ['/api/create-invoice'];

  const headers = { 'Content-Type': 'application/json' };
  if (sessionJwt) {
    headers.Authorization = `Bearer ${sessionJwt}`;
  }
  const initData = typeof window !== 'undefined' ? window.Telegram?.WebApp?.initData : '';
  if (initData) {
    headers['X-Telegram-Init-Data'] = initData;
  }

  let lastError = null;
  let lastCode = null;

  for (const url of endpoints) {
    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ productId })
      });
      const contentType = resp.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        continue;
      }
      const data = await resp.json();
      if (resp.ok && data?.ok && data?.invoiceUrl) {
        return { ok: true, invoiceUrl: data.invoiceUrl, orderId: data.orderId };
      }
      if (data?.code) lastCode = data.code;
      if (data?.error || data?.detail) lastError = data.error || data.detail;
    } catch (e) {
      lastError = e?.message || 'Network error';
    }
  }

  return {
    ok: false,
    code: lastCode || 'INVOICE_UNAVAILABLE',
    error: lastError || 'To‘lov schyotini yaratib bo‘lmadi'
  };
};

/**
 * Sends a lesson video directly to the student via Telegram Bot with protect_content=true
 * (blocks saving to gallery and forwarding) and lesson title as caption.
 */
export const sendLessonVideoToBot = async (lessonIdOrPayload) => {
  const lessonId =
    typeof lessonIdOrPayload === 'object' && lessonIdOrPayload !== null
      ? Number(lessonIdOrPayload.lessonId)
      : Number(lessonIdOrPayload);
  const apiUrl = import.meta.env.VITE_API_URL?.replace(/\/$/, '');
  const endpoints = apiUrl
    ? [`${apiUrl}/api/lessons/send-video`, '/api/send-lesson-video']
    : ['/api/send-lesson-video'];

  const headers = { 'Content-Type': 'application/json' };
  if (sessionJwt) {
    headers.Authorization = `Bearer ${sessionJwt}`;
  }
  const initData = typeof window !== 'undefined' ? window.Telegram?.WebApp?.initData : '';
  if (initData) {
    headers['X-Telegram-Init-Data'] = initData;
  }

  let lastError = null;
  let lastCode = null;

  for (const url of endpoints) {
    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ lessonId })
      });
      const contentType = resp.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        continue;
      }
      const data = await resp.json();
      if (resp.ok && data?.ok) {
        return { ok: true };
      }
      if (data?.code) lastCode = data.code;
      if (data?.error || data?.detail) lastError = data.error || data.detail;
    } catch (e) {
      lastError = e?.message || 'Network error';
    }
  }

  return {
    ok: false,
    code: lastCode || 'ENDPOINT_UNAVAILABLE',
    error: lastError || 'Video yuborish xizmati topilmadi'
  };
};

export const createInvoice = async (userId, amount) => {
  return createStarsInvoiceLink(amount, userId);
};

let videoCheckpointsUnavailable = false;

/**
 * Resilient video checkpoints retrieval:
 * Checks 'video_checkpoints' table first; if schema does not have the table,
 * checks 'questions' table where checkpoints are backed up.
 */
export const getVideoCheckpoints = async (lessonId) => {
  try {
    const { data, error } = await supabase.rpc('get_lesson_checkpoints', { p_lesson_id: Number(lessonId) });
    if (!error && Array.isArray(data) && data.length > 0) {
      return data
        .map((cp) => ({
          id: cp.id,
          lesson_id: cp.lesson_id,
          trigger_time_sec: cp.trigger_time_sec || 0,
          rewind_time_sec: cp.rewind_time_sec ?? cp.rewind_to_sec ?? 0,
          question: cp.question || cp.question_text || '',
          question_text: cp.question || cp.question_text || '',
          options: Array.isArray(cp.options) ? cp.options : [],
        }))
        .sort((a, b) => a.trigger_time_sec - b.trigger_time_sec);
    }
  } catch (e) {
    console.warn('Checkpoints fetch error:', e);
  }

  // Demo stop-test for lesson 11/1 when no DB checkpoints exist
  if (lessonId === 11 || lessonId === 1 || lessonId === '1') {
    return [
      {
        id: 'cp-1',
        lesson_id: lessonId,
        trigger_time_sec: 15,
        rewind_time_sec: 2,
        question: 'Hujayraning irsiy axborot saqlovchi qismi nima?',
        options: ['Yadro', 'Sitoplazma', 'Ribosoma', 'Vakuola'],
        correct_option: 0,
        correct_option_index: 0
      }
    ];
  }

  return [];
};

export const verifyCheckpointAnswer = async (checkpointId, selectedIndex, lessonId = null) => {
  try {
    const { data, error } = await supabase.rpc('check_checkpoint_answer', {
      p_checkpoint_id: Number(checkpointId),
      p_selected_index: Number(selectedIndex),
      p_lesson_id: lessonId ? Number(lessonId) : null,
    });
    if (!error && data) {
      return data;
    }
  } catch {}
  return { ok: false, is_correct: false };
};

/**
 * Retrieves quiz questions (without answer keys) for a lesson via answerless RPC.
 */
export const getQuestions = async (lessonId) => {
  try {
    const { data, error } = await supabase.rpc('get_lesson_questions', { p_lesson_id: Number(lessonId) });
    if (!error && Array.isArray(data)) {
      return data;
    }
  } catch (e) {
    console.warn('Error fetching questions:', e);
  }
  return [];
};

/**
 * Grades a lesson quiz on the server idempotently via submit_lesson_quiz RPC.
 */
export const submitLessonQuiz = async (attemptId, lessonId, answers = {}) => {
  if (!attemptId || !lessonId) return { ok: false };
  try {
    const { data, error } = await supabase.rpc('submit_lesson_quiz', {
      p_attempt_id: String(attemptId),
      p_lesson_id: Number(lessonId),
      p_answers: answers,
    });
    if (!error && data?.ok) {
      return data;
    }
    return { ok: false, error: error?.message || 'Quiz submit failed' };
  } catch (e) {
    console.error('submitLessonQuiz error:', e);
    return { ok: false, error: e.message };
  }
};

/**
 * Saves lesson completion state via server RPC (stars >= 1; no Neyron payout).
 */
export const saveLessonQuizProgress = async (userId, lessonId) => {
  if (!userId || !lessonId) return { success: false };
  try {
    const { data, error } = await supabase.rpc('record_lesson_watch', { p_lesson_id: Number(lessonId) });
    if (!error && data?.ok) {
      return { success: true, rewardNeyrons: 0 };
    }
    return { success: false };
  } catch (e) {
    console.error('saveLessonQuizProgress error:', e);
    return { success: false, error: e.message };
  }
};

/**
 * Exam completion hook (DTM / Milliy sertifikat). Neyrons are never awarded for exams.
 */
export const saveExamProgress = async (userId) => {
  if (!userId) return { success: false };
  return { success: true, rewardNeyrons: 0 };
};

export const getDailyQuests = async (userId, date) => {
  const { data } = await supabase.from('daily_quests').select('*').eq('user_id', userId).eq('quest_date', date);
  return data || [];
};

export const completeQuest = async (userId, questType, xpReward) => {
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase.from('daily_quests')
    .upsert(
      { user_id: userId, quest_type: questType, quest_date: today, is_completed: true, xp_reward: xpReward },
      { onConflict: 'user_id, quest_type, quest_date' }
    )
    .select()
    .single();
  return { data, error };
};

export const incrementViewCount = async (lessonId) => {
  try {
    await supabase.rpc('increment_lesson_view', { lesson_id: lessonId });
  } catch {}
};

export const DEFAULT_SUPPORT_CONTACTS = {
  bio: {
    telegram: '@rashidov_bio_mentor',
    phone: '+998 90 123 45 67',
    label_uz: 'Biologiya savollari',
    label_ru: 'Вопросы по биологии',
    desc_uz: 'Mavzular, darslar va biologiya testlari bo‘yicha',
    desc_ru: 'По темам, урокам и тестам по биологии'
  },
  chem: {
    telegram: '@rashidov_chem_mentor',
    phone: '+998 90 765 43 21',
    label_uz: 'Kimyo savollari',
    label_ru: 'Вопросы по химии',
    desc_uz: 'Kimyo darslari, masalalar va testlar bo‘yicha',
    desc_ru: 'По темам, задачам и тестам по химии'
  },
  tech: {
    telegram: '@rashidov_support',
    phone: '+998 95 889 78 88',
    label_uz: 'Texnik va boshqa masalalar',
    label_ru: 'Технические и другие вопросы',
    desc_uz: 'Ilova ishlashi, to‘lovlar va hisob masalalari',
    desc_ru: 'Работа приложения, оплата и вопросы аккаунта'
  },
  website: 'https://rashidovschool.uz'
};

let cachedSupportContacts = null;

export const getCachedSupportContacts = () => {
  if (cachedSupportContacts) return cachedSupportContacts;
  try {
    const cached = localStorage.getItem('rb_support_contacts');
    if (cached) {
      const parsedCached = JSON.parse(cached);
      const merged = {
        ...DEFAULT_SUPPORT_CONTACTS,
        ...parsedCached,
        website: parsedCached.website || DEFAULT_SUPPORT_CONTACTS.website
      };
      cachedSupportContacts = merged;
      return merged;
    }
  } catch {}
  return null;
};

export const getSupportContacts = async () => {
  try {
    const parsed = await readSiteMetadata();
    if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
      const merged = {
        bio: { ...DEFAULT_SUPPORT_CONTACTS.bio, ...(parsed.bio || {}) },
        chem: { ...DEFAULT_SUPPORT_CONTACTS.chem, ...(parsed.chem || {}) },
        tech: { ...DEFAULT_SUPPORT_CONTACTS.tech, ...(parsed.tech || {}) },
        website: parsed.website || DEFAULT_SUPPORT_CONTACTS.website
      };
      cachedSupportContacts = merged;
      try {
        localStorage.setItem('rb_support_contacts', JSON.stringify(merged));
      } catch {}
      return merged;
    }
  } catch (e) {
    console.warn('getSupportContacts error:', e);
  }

  const cached = getCachedSupportContacts();
  if (cached) return cached;

  return DEFAULT_SUPPORT_CONTACTS;
};
