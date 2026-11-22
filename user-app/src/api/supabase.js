import { createClient } from '@supabase/supabase-js';
import { mockSubjects, mockCourses, mockLessons, mockProgress } from '../mock/data';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://rcpbepcdgbxjncpxeowx.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjcGJlcGNkZ2J4am5jcHhlb3d4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgwMTQyNTAsImV4cCI6MjEwMzU5MDI1MH0.icLRyq0piPK_aITPZDu42nFOG9_jyfzVc7lwuckubbM';

export const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Ensures user is registered in Supabase and synchronizes streak / last active date.
 * Guarantees that every user opening user-app is visible in admin-app immediately.
 */
export async function syncUserSession(rawUser) {
  if (!rawUser) return null;

  const telegramId = Number(rawUser.id || rawUser.telegram_id);
  if (!telegramId || isNaN(telegramId)) return null;

  const todayStr = new Date().toISOString().split('T')[0];
  const firstName = rawUser.first_name || rawUser.full_name || 'Aliakbar Lutfullayev';

  try {
    // 1. Fetch user from Supabase
    const { data: existingUser, error } = await supabase
      .from('users')
      .select('*')
      .eq('telegram_id', telegramId)
      .maybeSingle();

    if (existingUser) {
      // Calculate streak
      let newStreak = existingUser.streak_days || 0;
      const lastActive = existingUser.last_active_date;

      if (!lastActive) {
        newStreak = 1;
      } else if (lastActive !== todayStr) {
        const lastDate = new Date(lastActive);
        const todayDate = new Date(todayStr);
        const diffDays = Math.round((todayDate - lastDate) / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
          newStreak += 1;
        } else if (diffDays > 1) {
          const isFrozen = existingUser.frozen_until && new Date(existingUser.frozen_until) >= todayDate;
          if (!isFrozen) {
            newStreak = 1;
          }
        }
      }

      // Update last_active_date and streak in Supabase
      const { data: updatedUser } = await supabase
        .from('users')
        .update({
          last_active_date: todayStr,
          streak_days: newStreak
        })
        .eq('telegram_id', telegramId)
        .select()
        .single();

      return updatedUser || { ...existingUser, last_active_date: todayStr, streak_days: newStreak };
    }

    // 2. User does not exist in DB yet: insert new record
    const newUser = {
      telegram_id: telegramId,
      role: 'student',
      full_name: firstName,
      class_group: '11-A',
      balance: 1000, // Welcome bonus
      streak_days: 1,
      last_active_date: todayStr,
      language: 'uz'
    };

    const { data: createdUser, error: insertErr } = await supabase
      .from('users')
      .insert([newUser])
      .select()
      .single();

    if (!insertErr && createdUser) {
      return createdUser;
    }
    return newUser;
  } catch (err) {
    console.warn('syncUserSession network fallback:', err);
    return {
      telegram_id: telegramId,
      full_name: firstName,
      balance: 1000,
      streak_days: 1,
      class_group: '11-A',
      language: 'uz',
      role: 'student'
    };
  }
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

export async function applyPromoCode(telegramId, code) {
  try {
    if (!code || !telegramId) return { success: false, message: 'Kodni kiriting' };

    const { data: promos, error } = await supabase.from('promo_codes').select('*');
    if (error) return { success: false, message: `DB xatosi: ${error.message}` };

    const promo = promos?.find(p => p.code.trim().toLowerCase() === code.trim().toLowerCase());
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

    const newBalance = (user.balance || 0) + (promo.bonus_amount || 0);

    // Update user balance
    await supabase.from('users').update({ balance: newBalance }).eq('telegram_id', telegramId);
    // Increment promo uses
    await supabase.from('promo_codes').update({ current_uses: (promo.current_uses || 0) + 1 }).eq('id', promo.id);
    // Record usage
    await supabase.from('promo_uses').insert([{ promo_id: promo.id, user_id: telegramId }]).catch(() => {});
    // Audit in transactions
    await supabase.from('transactions').insert([{
      user_id: telegramId,
      amount: promo.bonus_amount,
      type: 'promo',
      description: `Promo-kod faollashtirildi: ${promo.code}`
    }]).catch(() => {});

    return { 
      success: true, 
      message: `${promo.bonus_amount} Neyron hisobingizga qo'shildi!`, 
      bonus: promo.bonus_amount,
      newBalance 
    };
  } catch (err) {
    return { success: false, message: 'Server xatosi: ' + err.message };
  }
}

// Alias for backwards compatibility
export const applyPromo = async (code, userId) => {
  return applyPromoCode(userId, code);
};

export const getSubjects = async () => {
  try {
    const { data, error } = await supabase.from('subjects').select('*').order('id');
    if (!error && data && data.length > 0) {
      return data.map((d, idx) => {
        const rawName = (d.name || '').trim();
        const norm = rawName.toLowerCase();
        
        let key = 'biologiya';
        let latinName = rawName;
        let bgGradient = 'from-[#031B13] via-[#020E0A] to-[#000000]';
        let borderClass = 'border-emerald-500/35';
        let shadowClass = 'shadow-[0_8px_32px_rgba(16,185,129,0.22)]';
        let imageUrl = '/banners/biologiya_banner.jpg';
        let videoUrl = '/banners/biologiya_banner.mp4';
        let icon = '🧬';

        if (norm.includes('xim') || norm.includes('kim')) {
          key = 'kimyo';
          latinName = 'Kimyo';
          bgGradient = 'from-[#19092B] via-[#0D0417] to-[#000000]';
          borderClass = 'border-purple-500/35';
          shadowClass = 'shadow-[0_8px_32px_rgba(168,85,247,0.22)]';
          imageUrl = '/banners/kimyo_banner.jpg';
          videoUrl = '/banners/kimyo_banner.mp4';
          icon = '🧪';
        } else if (norm.includes('mat')) {
          key = 'matematika';
          latinName = 'Matematika';
          bgGradient = 'from-[#05142B] via-[#020A17] to-[#000000]';
          borderClass = 'border-blue-500/35';
          shadowClass = 'shadow-[0_8px_32px_rgba(0,122,255,0.22)]';
          imageUrl = 'https://images.unsplash.com/photo-1633424974203-6c91b2a651ee?auto=format&fit=crop&w=1200&q=85';
          videoUrl = null;
          icon = '📐';
        } else if (norm.includes('bio')) {
          key = 'biologiya';
          latinName = 'Biologiya';
        } else {
          // Dynamic Custom Subject Added in Admin App
          key = norm.replace(/[^a-z0-9]/gi, '_');
          latinName = rawName;
          bgGradient = 'from-[#1A102F] via-[#0B061A] to-[#000000]';
          borderClass = 'border-cyan-500/35';
          shadowClass = 'shadow-[0_8px_32px_rgba(6,182,212,0.22)]';
          imageUrl = 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=85';
          videoUrl = null;
          icon = d.icon || '📚';
        }

        return {
          id: d.id,
          key,
          name: latinName,
          original_name: d.name,
          description: d.description || `${latinName} kursi bo'yicha video darslar va testlar`,
          bg_gradient: bgGradient,
          border_class: borderClass,
          shadow_class: shadowClass,
          image_url: imageUrl,
          video_url: videoUrl,
          icon
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

/**
 * Single batch request to fetch all courses and all their lessons for a subject.
 * Eliminates serial waterfall loop.
 */
export const getCoursesAndLessons = async (subjectId) => {
  try {
    const dbCourses = await getCourses(subjectId);
    if (!dbCourses || dbCourses.length === 0) {
      return { courses: [], lessons: [] };
    }

    const courseIds = dbCourses.map(c => c.id);
    const { data: dbLessons, error } = await supabase
      .from('lessons')
      .select('*')
      .in('course_id', courseIds)
      .order('order_index');

    if (!error && dbLessons && dbLessons.length > 0) {
      return { courses: dbCourses, lessons: dbLessons };
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
    
    await supabase.from('transactions').insert([{
      user_id: userId,
      amount: -10000,
      type: 'spend',
      description: 'Muzlatish (Streak Freeze) xaridi'
    }]).catch(() => {});

    return { success: true, newBalance: user.balance - 10000 };
  } catch {
    return { success: false };
  }
};

export const createInvoice = async (userId, amount) => {
  return { success: true };
};

/**
 * Resilient video checkpoints retrieval:
 * Checks 'video_checkpoints' table first; if schema does not have the table,
 * checks 'questions' table where checkpoints are backed up.
 */
export const getVideoCheckpoints = async (lessonId) => {
  try {
    const { data, error } = await supabase
      .from('video_checkpoints')
      .select('*')
      .eq('lesson_id', lessonId)
      .order('trigger_time_sec');

    if (!error && data) {
      return data.map(cp => ({
        id: cp.id,
        lesson_id: cp.lesson_id,
        trigger_time_sec: cp.trigger_time_sec || 0,
        rewind_time_sec: cp.rewind_time_sec ?? cp.rewind_to_sec ?? 0,
        question: cp.question || cp.question_text || '',
        question_text: cp.question || cp.question_text || '',
        options: Array.isArray(cp.options) ? cp.options : [],
        correct_option: cp.correct_option ?? cp.correct_option_index ?? 0,
        correct_option_index: cp.correct_option ?? cp.correct_option_index ?? 0
      }));
    }

    // Fallback: Check if checkpoints are stored in 'questions' table
    const { data: qData } = await supabase
      .from('questions')
      .select('*')
      .eq('lesson_id', lessonId);

    if (qData && qData.length > 0) {
      const cps = [];
      qData.forEach(q => {
        if (q.image_url && q.image_url.startsWith('cp_meta:')) {
          try {
            const meta = JSON.parse(q.image_url.replace('cp_meta:', ''));
            cps.push({
              id: q.id,
              lesson_id: q.lesson_id,
              trigger_time_sec: meta.trigger_time_sec || 0,
              rewind_time_sec: meta.rewind_time_sec || 0,
              question: q.text,
              question_text: q.text,
              options: Array.isArray(q.options) ? q.options : [],
              correct_option: q.correct_option_index,
              correct_option_index: q.correct_option_index
            });
          } catch {}
        }
      });
      if (cps.length > 0) return cps.sort((a, b) => a.trigger_time_sec - b.trigger_time_sec);
    }
  } catch (e) {
    console.warn('Checkpoints fetch error:', e);
  }

  // Only return default stop-test for lesson 11/1 or demo lesson
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

/**
 * Retrieves quiz questions created by teachers for a lesson.
 */
export const getQuestions = async (lessonId) => {
  try {
    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .eq('lesson_id', lessonId);
    
    if (!error && data) {
      // Filter out checkpoint metadata entries if any
      return data.filter(q => !q.image_url || !q.image_url.startsWith('cp_meta:'));
    }
  } catch (e) {
    console.warn('Error fetching questions:', e);
  }
  return [];
};

/**
 * Saves lesson quiz completion, awards stars and Neyrons (+XP), and updates progress.
 */
export const saveLessonQuizProgress = async (userId, lessonId, stars = 3, score = 100) => {
  if (!userId || !lessonId) return { success: false };

  try {
    // 1. Update progress
    await supabase.from('progress').upsert({
      user_id: userId,
      lesson_id: lessonId,
      stars: Math.max(1, Math.min(3, stars)),
      is_unlocked: true
    }, { onConflict: 'user_id,lesson_id' });

    // 2. Award Neyrons & XP
    const rewardNeyrons = stars === 3 ? 100 : stars === 2 ? 60 : 30;
    const rewardXp = stars === 3 ? 50 : 25;

    const { data: user } = await supabase.from('users').select('balance, xp').eq('telegram_id', userId).single();
    if (user) {
      await supabase.from('users').update({
        balance: (user.balance || 0) + rewardNeyrons,
        xp: (user.xp || 0) + rewardXp
      }).eq('telegram_id', userId);

      await supabase.from('transactions').insert([{
        user_id: userId,
        amount: rewardNeyrons,
        type: 'gift',
        description: `Dars testi yakunlandi (#${lessonId}): +${rewardNeyrons} 🧠`
      }]).catch(() => {});
    }

    return { success: true, rewardNeyrons, rewardXp };
  } catch (e) {
    console.error('saveLessonQuizProgress error:', e);
    return { success: false, error: e.message };
  }
};

/**
 * Saves exam test completion (DTM / Milliy sertifikat) to update stats and award student.
 */
export const saveExamProgress = async (userId, subjectKey, mode, testId, score, stars = 3) => {
  if (!userId) return { success: false };

  try {
    const rewardNeyrons = mode === 'dtm' ? 120 : 150;
    const rewardXp = mode === 'dtm' ? 60 : 80;

    const { data: user } = await supabase.from('users').select('balance, xp').eq('telegram_id', userId).single();
    if (user) {
      await supabase.from('users').update({
        balance: (user.balance || 0) + rewardNeyrons,
        xp: (user.xp || 0) + rewardXp
      }).eq('telegram_id', userId);

      await supabase.from('transactions').insert([{
        user_id: userId,
        amount: rewardNeyrons,
        type: 'gift',
        description: `${mode.toUpperCase()} Imtihon yakunlandi (${testId}): +${rewardNeyrons} 🧠`
      }]).catch(() => {});
    }

    return { success: true, rewardNeyrons, rewardXp };
  } catch (e) {
    console.error('saveExamProgress error:', e);
    return { success: false };
  }
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
    const { data: lesson } = await supabase.from('lessons').select('id').eq('id', lessonId).single();
    if (lesson) {
      // Safe check if view_count column exists
      await supabase.rpc('increment_lesson_view', { lesson_id: lessonId }).catch(() => {});
    }
  } catch {}
};
