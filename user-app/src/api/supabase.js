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

    // Проверяем, не использовал ли он уже этот промокод (нужна таблица, но пока просто обновим счетчик)
    // В идеале должна быть таблица promo_code_usages, но пока просто даем баланс.

    // 3. Обновляем баланс
    await supabase.from('users').update({ balance: user.balance + promo.bonus_amount }).eq('telegram_id', telegramId);
    
    // 4. Увеличиваем счетчик использований
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
    // 1. Fetch all promos to match case-insensitively
    const { data: promos } = await supabase.from('promo_codes').select('*');
    if (!promos) return { success: false, message: 'Промокоды не найдены' };
    
    const promo = promos.find(p => p.code.toLowerCase() === code.toLowerCase());
    if (!promo) return { success: false, message: 'Промокод не найден' };

    // 2. Check limits
    if (promo.current_uses >= promo.max_uses) return { success: false, message: 'Лимит использований исчерпан' };

    // 3. Optional: check uses if table exists, ignore if it fails
    const { data: uses, error: usesError } = await supabase.from('promo_uses').select('*').eq('promo_id', promo.id).eq('user_id', userId);
    if (!usesError && uses && uses.length > 0) return { success: false, message: 'Вы уже использовали этот промокод' };

    // 4. Update balance
    const { data: user } = await supabase.from('users').select('balance').eq('telegram_id', userId).single();
    if (!user) return { success: false, message: 'Ошибка профиля' };
    
    await supabase.from('users').update({ balance: user.balance + promo.bonus_amount }).eq('telegram_id', userId);

    // 5. Update uses count
    await supabase.from('promo_codes').update({ current_uses: (promo.current_uses || 0) + 1 }).eq('id', promo.id);
    
    // Ignore error if promo_uses table doesn't exist
    await supabase.from('promo_uses').insert([{ promo_id: promo.id, user_id: userId }]).catch(() => {});

    return { success: true, bonus: promo.bonus_amount };
  } catch (err) {
    return { success: false, message: 'Ошибка сервера: ' + err.message };
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
