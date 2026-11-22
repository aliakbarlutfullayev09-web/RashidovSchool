import { createClient } from '@supabase/supabase-js';
import { mockSubjects, mockCourses, mockLessons, mockProgress } from '../mock/data';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://rcpbepcdgbxjncpxeowx.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjcGJlcGNkZ2J4am5jcHhlb3d4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgwMTQyNTAsImV4cCI6MjEwMzU5MDI1MH0.icLRyq0piPK_aITPZDu42nFOG9_jyfzVc7lwuckubbM';

export const supabase = createClient(supabaseUrl, supabaseKey);

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

export async function applyPromoCode(telegramId, code) {
  try {
    const { data: promos, error } = await supabase.from('promo_codes').select('*');
    if (error) return { success: false, message: `DB xatosi: ${error.message}` };
    
    const promo = promos?.find(p => p.code.toLowerCase() === code.toLowerCase());
    if (!promo) return { success: false, message: 'Promo-kod topilmadi' };
    
    if (promo.current_uses >= promo.max_uses) {
      return { success: false, message: 'Foydalanish limiti tugagan' };
    }

    const { data: uses, error: usesError } = await supabase
      .from('promo_uses')
      .select('*')
      .eq('promo_id', promo.id)
      .eq('user_id', telegramId);
    if (!usesError && uses && uses.length > 0) {
      return { success: false, message: 'Siz bu promo-koddan allaqachon foydalangansiz' };
    }

    const { data: user } = await supabase.from('users').select('balance').eq('telegram_id', telegramId).single();
    if (!user) return { success: false, message: 'Foydalanuvchi topilmadi' };

    await supabase.from('users').update({ balance: user.balance + promo.bonus_amount }).eq('telegram_id', telegramId);
    await supabase.from('promo_codes').update({ current_uses: (promo.current_uses || 0) + 1 }).eq('id', promo.id);
    await supabase.from('promo_uses').insert([{ promo_id: promo.id, user_id: telegramId }]).catch(() => {});

    return { success: true, message: `${promo.bonus_amount} Neyron hisobingizga qo'shildi!`, bonus: promo.bonus_amount };
  } catch (err) {
    return { success: false, message: 'Server xatosi' };
  }
};

export const getSubjects = async () => {
  try {
    const { data, error } = await supabase.from('subjects').select('*').order('id');
    if (!error && data && data.length > 0) {
      return data.map((d, idx) => {
        const norm = (d.name || '').toLowerCase();
        let key = 'biologiya';
        let latinName = 'Biologiya';
        if (norm.includes('хим') || norm.includes('kim')) {
          key = 'kimyo';
          latinName = 'Kimyo';
        } else if (norm.includes('мат') || norm.includes('mat')) {
          key = 'matematika';
          latinName = 'Matematika';
        }

        const template = mockSubjects.find(s => s.key === key) || mockSubjects[idx] || mockSubjects[0];

        return {
          ...template,
          id: d.id,
          key,
          name: latinName,
          original_name: d.name,
          description: d.description || template.description
        };
      });
    }
  } catch (e) {
    console.warn('Supabase getSubjects fallback to mock:', e);
  }
  return mockSubjects;
};

export const getCourses = async (subjectId) => {
  try {
    let query = supabase.from('courses').select('*').order('order_index');
    if (subjectId) {
      query = query.eq('subject_id', subjectId);
    }
    const { data, error } = await query;
    if (!error && data && data.length > 0) return data;
  } catch (e) {
    console.warn('Supabase getCourses fallback to mock:', e);
  }
  return mockCourses.filter(c => !subjectId || c.subject_id === Number(subjectId));
};

export const getLessons = async (courseId) => {
  try {
    let query = supabase.from('lessons').select('*').order('order_index');
    if (courseId) {
      query = query.eq('course_id', courseId);
    }
    const { data, error } = await query;
    if (!error && data && data.length > 0) return data;
  } catch (e) {
    console.warn('Supabase getLessons fallback to mock:', e);
  }
  if (courseId) {
    return mockLessons.filter(l => l.course_id === Number(courseId));
  }
  return mockLessons;
};

export const getProgress = async (userId) => {
  const { data } = await supabase.from('progress').select('*').eq('user_id', userId);
  return data || [];
};

/**
 * Watch frontier progress persistence:
 * Stores max confirmed frontier and last playback position locally and syncs safely.
 */
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

export const saveWatchProgress = async (userId, lessonId, currentPosition, maxWatchedSeconds) => {
  const key = `rb_watch_progress_${userId || 'guest'}_${lessonId}`;
  const payload = {
    lessonId,
    lastPosition: Math.floor(currentPosition || 0),
    maxWatchedSeconds: Math.floor(maxWatchedSeconds || 0),
    updatedAt: new Date().toISOString()
  };
  try {
    localStorage.setItem(key, JSON.stringify(payload));
    if (userId) {
      supabase.from('progress').upsert({
        user_id: userId,
        lesson_id: lessonId,
        is_unlocked: true
      }, { onConflict: 'user_id,lesson_id' }).catch(() => {});
    }
    return { success: true, localOnly: true };
  } catch (e) {
    console.warn('saveWatchProgress error:', e);
    return { success: false, error: e.message };
  }
};

export const applyPromo = async (code, userId) => {
  try {
    const { data: promos } = await supabase.from('promo_codes').select('*');
    if (!promos) return { success: false, message: 'Promo-kodlar topilmadi' };
    
    const promo = promos.find(p => p.code.toLowerCase() === code.toLowerCase());
    if (!promo) return { success: false, message: 'Promo-kod topilmadi' };

    if (promo.current_uses >= promo.max_uses) return { success: false, message: 'Foydalanish limiti tugagan' };

    const { data: uses, error: usesError } = await supabase.from('promo_uses').select('*').eq('promo_id', promo.id).eq('user_id', userId);
    if (!usesError && uses && uses.length > 0) return { success: false, message: 'Siz bu promo-koddan allaqachon foydalangansiz' };

    const { data: user } = await supabase.from('users').select('balance').eq('telegram_id', userId).single();
    if (!user) return { success: false, message: 'Profil topilmadi' };
    
    await supabase.from('users').update({ balance: user.balance + promo.bonus_amount }).eq('telegram_id', userId);
    await supabase.from('promo_codes').update({ current_uses: (promo.current_uses || 0) + 1 }).eq('id', promo.id);
    
    await supabase.from('promo_uses').insert([{ promo_id: promo.id, user_id: userId }]).catch(() => {});

    return { success: true, bonus: promo.bonus_amount };
  } catch (err) {
    return { success: false, message: 'Server xatosi: ' + err.message };
  }
};

export const freezeStreak = async (userId) => {
  try {
    const { data: user } = await supabase.from('users').select('balance, frozen_until').eq('telegram_id', userId).single();
    if (!user || user.balance < 10000) return { success: false };
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    await supabase.from('users').update({ 
      balance: user.balance - 10000,
      frozen_until: tomorrow.toISOString().split('T')[0]
    }).eq('telegram_id', userId);
    
    return { success: true, newBalance: user.balance - 10000 };
  } catch {
    return { success: false };
  }
};

export const createInvoice = async (userId, amount) => {
  return { success: true };
};

export const getVideoCheckpoints = async (lessonId) => {
  try {
    const { data, error } = await supabase.from('video_checkpoints').select('*').eq('lesson_id', lessonId).order('trigger_time_sec');
    if (!error && data && data.length > 0) return data;
  } catch (e) {
    console.warn('Checkpoints fetch error:', e);
  }
  return [
    {
      id: 'cp-1',
      lesson_id: lessonId,
      trigger_time_sec: 15,
      rewind_time_sec: 2,
      question: 'Hujayraning irsiy axborot saqlovchi qismi nima?',
      options: ['Yadro', 'Sitoplazma', 'Ribosoma', 'Vakuola'],
      correct_option: 0
    }
  ];
};

export const getQuestions = async (lessonId) => {
  const { data } = await supabase.from('questions').select('*').eq('lesson_id', lessonId);
  return data || [];
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
  const { data: lesson } = await supabase.from('lessons').select('view_count').eq('id', lessonId).single();
  if (lesson) {
    const { data, error } = await supabase.from('lessons').update({ view_count: (lesson.view_count || 0) + 1 }).eq('id', lessonId);
    return { data, error };
  }
  return { error: 'Lesson not found' };
};
