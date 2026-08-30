import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rcpbepcdgbxjncpxeowx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjcGJlcGNkZ2J4am5jcHhlb3d4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgwMTQyNTAsImV4cCI6MjEwMzU5MDI1MH0.icLRyq0piPK_aITPZDu42nFOG9_jyfzVc7lwuckubbM';

export const supabase = createClient(supabaseUrl, supabaseKey);

// Fallbacks are not strictly implemented here because we use mock data in components,
// but these would be the real API calls.
export const getUserData = async (telegramId) => {
  const { data, error } = await supabase.from('users').select('*').eq('telegram_id', telegramId).single();
  return { data, error };
};

export const updateUserProfile = async (telegramId, updates) => {
  const { data, error } = await supabase.from('users').update(updates).eq('telegram_id', telegramId).select().single();
  return { data, error };
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

export const getLessons = async () => {
  const { data } = await supabase.from('lessons').select('*').order('order_index');
  return data || [];
};

export const getProgress = async (userId) => {
  const { data } = await supabase.from('progress').select('*').eq('user_id', userId);
  return data || [];
};

export const applyPromo = async (code, userId) => {
  try {
    // 1. Ищем промокод
    const { data: promo } = await supabase.from('promo_codes').select('*').eq('code', code.toUpperCase()).single();
    if (!promo) return { success: false, message: 'Промокод не найден' };

    // 2. Проверяем лимиты
    if (promo.current_uses >= promo.max_uses) return { success: false, message: 'Лимит использований исчерпан' };

    // 3. Проверяем, не использовал ли этот юзер его уже
    const { data: uses } = await supabase.from('promo_uses').select('*').eq('promo_id', promo.id).eq('user_id', userId);
    if (uses && uses.length > 0) return { success: false, message: 'Вы уже использовали этот промокод' };

    // 4. Начисляем бонус юзеру
    const { data: user } = await supabase.from('users').select('balance').eq('telegram_id', userId).single();
    if (!user) return { success: false, message: 'Ошибка профиля' };
    
    await supabase.from('users').update({ balance: user.balance + promo.bonus_amount }).eq('telegram_id', userId);

    // 5. Обновляем статистику промокода
    await supabase.from('promo_codes').update({ current_uses: promo.current_uses + 1 }).eq('id', promo.id);
    await supabase.from('promo_uses').insert([{ promo_id: promo.id, user_id: userId }]);

    return { success: true, bonus: promo.bonus_amount };
  } catch (err) {
    return { success: false, message: 'Ошибка сервера' };
  }
};

export const freezeStreak = async (userId) => {
  // Logic to freeze streak
  return { success: true };
};

export const createInvoice = async (userId, amount) => {
  // Logic to create invoice
  return { success: true };
};
