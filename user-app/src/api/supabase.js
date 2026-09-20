import { createClient } from '@supabase/supabase-js';

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
    if (error) return { success: false, message: `Ошибка БД: ${error.message}` };
    
    const promo = promos?.find(p => p.code.toLowerCase() === code.toLowerCase());
    if (!promo) return { success: false, message: 'Промокод не найден в базе' };
    
    if (promo.current_uses >= promo.max_uses) {
      return { success: false, message: 'Лимит использований исчерпан' };
    }

    const { data: user } = await supabase.from('users').select('balance').eq('telegram_id', telegramId).single();
    if (!user) return { success: false, message: 'Пользователь не найден' };

    await supabase.from('users').update({ balance: user.balance + promo.bonus_amount }).eq('telegram_id', telegramId);
    await supabase.from('promo_codes').update({ current_uses: promo.current_uses + 1 }).eq('id', promo.id);

    return { success: true, message: `Начислено ${promo.bonus_amount} Нейронов!`, bonus: promo.bonus_amount };
  } catch (err) {
    return { success: false, message: 'Ошибка сервера' };
  }
};

export const getSubjects = async () => {
  const { data } = await supabase.from('subjects').select('*').order('id');
  return data || [];
};

export const getCourses = async (subjectId) => {
  let query = supabase.from('courses').select('*').order('order_index');
  if (subjectId) {
    query = query.eq('subject_id', subjectId);
  }
  const { data } = await query;
  return data || [];
};

export const getLessons = async (courseId) => {
  let query = supabase.from('lessons').select('*').order('order_index');
  if (courseId) {
    query = query.eq('course_id', courseId);
  }
  const { data } = await query;
  return data || [];
};

export const getProgress = async (userId) => {
  const { data } = await supabase.from('progress').select('*').eq('user_id', userId);
  return data || [];
};

export const applyPromo = async (code, userId) => {
  try {
    const { data: promos } = await supabase.from('promo_codes').select('*');
    if (!promos) return { success: false, message: 'Промокоды не найдены' };
    
    const promo = promos.find(p => p.code.toLowerCase() === code.toLowerCase());
    if (!promo) return { success: false, message: 'Промокод не найден' };

    if (promo.current_uses >= promo.max_uses) return { success: false, message: 'Лимит использований исчерпан' };

    const { data: uses, error: usesError } = await supabase.from('promo_uses').select('*').eq('promo_id', promo.id).eq('user_id', userId);
    if (!usesError && uses && uses.length > 0) return { success: false, message: 'Вы уже использовали этот промокод' };

    const { data: user } = await supabase.from('users').select('balance').eq('telegram_id', userId).single();
    if (!user) return { success: false, message: 'Ошибка профиля' };
    
    await supabase.from('users').update({ balance: user.balance + promo.bonus_amount }).eq('telegram_id', userId);
    await supabase.from('promo_codes').update({ current_uses: (promo.current_uses || 0) + 1 }).eq('id', promo.id);
    
    await supabase.from('promo_uses').insert([{ promo_id: promo.id, user_id: userId }]).catch(() => {});

    return { success: true, bonus: promo.bonus_amount };
  } catch (err) {
    return { success: false, message: 'Ошибка сервера: ' + err.message };
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
  const { data } = await supabase.from('video_checkpoints').select('*').eq('lesson_id', lessonId).order('trigger_time_sec');
  return data || [];
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
