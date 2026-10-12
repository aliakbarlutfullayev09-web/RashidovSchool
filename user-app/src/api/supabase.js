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
  try {
    const { data, error } = await supabase.from('subjects').select('*').order('id');
    if (!error && data && data.length > 0) return data;
  } catch (e) {
    console.warn('Supabase getSubjects fallback to mock:', e);
  }
  return [
    { id: 1, name: 'Biologiya 9-sinf', icon: '🧬', emoji: '🧬' },
    { id: 2, name: 'Biologiya 10-sinf', icon: '🌿', emoji: '🌿' },
    { id: 3, name: 'Biologiya 11-sinf', icon: '🔬', emoji: '🔬' }
  ];
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
  return [
    { id: 1, subject_id: subjectId || 1, title: 'Клетка и её строение', price: 0, order_index: 1 },
    { id: 2, subject_id: subjectId || 1, title: 'Генетика', price: 500, order_index: 2 },
    { id: 3, subject_id: subjectId || 1, title: 'Эволюция', price: 800, order_index: 3 }
  ];
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
  return [
    { id: 1, course_id: courseId || 1, title: 'Введение в клетку', video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', thumbnail_url: 'https://images.unsplash.com/photo-1530026405186-ed1f139313f8?auto=format&fit=crop&w=800&q=80', order_index: 1, duration: '12:45', is_free: true, view_count: 142, test_question_count: 5 },
    { id: 2, course_id: courseId || 1, title: 'Органоиды', video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4', thumbnail_url: 'https://images.unsplash.com/photo-1576086213369-97a306d36557?auto=format&fit=crop&w=800&q=80', order_index: 2, duration: '15:20', is_free: false, view_count: 98, test_question_count: 5 },
    { id: 3, course_id: courseId || 1, title: 'Деление клетки (Митоз)', video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4', thumbnail_url: 'https://images.unsplash.com/photo-1582719478250-c8940cebf8e5?auto=format&fit=crop&w=800&q=80', order_index: 3, duration: '09:10', is_free: false, view_count: 67, test_question_count: 4 }
  ];
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
      trigger_time_sec: 10,
      rewind_time_sec: 2,
      question: 'Kletkaning irsiy axborot saqlovchi qismi nima?',
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
