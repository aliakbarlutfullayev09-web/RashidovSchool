import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';

export const supabase = createClient(supabaseUrl, supabaseKey);

// Fallbacks are not strictly implemented here because we use mock data in components,
// but these would be the real API calls.
export const getUserData = async (telegramId) => {
  const { data, error } = await supabase.from('users').select('*').eq('telegram_id', telegramId).single();
  return { data, error };
};

export const getCourses = async (subjectId) => {
  return await supabase.from('courses').select('*').eq('subject_id', subjectId).order('order_index');
};

export const getLessons = async (courseId) => {
  return await supabase.from('lessons').select('*').eq('course_id', courseId).order('order_index');
};

export const getProgress = async (userId) => {
  return await supabase.from('progress').select('*').eq('user_id', userId);
};

export const applyPromo = async (code, userId) => {
  // Logic to apply promo code
  return { success: true };
};

export const freezeStreak = async (userId) => {
  // Logic to freeze streak
  return { success: true };
};

export const createInvoice = async (userId, amount) => {
  // Logic to create invoice
  return { success: true };
};
