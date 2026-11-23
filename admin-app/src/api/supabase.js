import { createClient } from '@supabase/supabase-js';
import { mockStats, mockRedZones, mockCourses, mockLessons, mockTeachers, mockAllUsers } from '../mock/data';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://rcpbepcdgbxjncpxeowx.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjcGJlcGNkZ2J4am5jcHhlb3d4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgwMTQyNTAsImV4cCI6MjEwMzU5MDI1MH0.icLRyq0piPK_aITPZDu42nFOG9_jyfzVc7lwuckubbM';

export const supabase = createClient(supabaseUrl, supabaseKey);

export const api = {
  // Video Checkpoints (with questions table fallback for resilient cloud persistence)
  getVideoCheckpoints: async (lessonId) => {
    try {
      const { data, error } = await supabase
        .from('video_checkpoints')
        .select('*')
        .eq('lesson_id', lessonId)
        .order('trigger_time_sec', { ascending: true });
      
      if (!error && data) {
        return data.map(cp => ({
          ...cp,
          trigger_time_sec: cp.trigger_time_sec || 0,
          rewind_to_sec: cp.rewind_to_sec ?? cp.rewind_time_sec ?? 0,
          rewind_time_sec: cp.rewind_time_sec ?? cp.rewind_to_sec ?? 0,
          question_text: cp.question_text || cp.question || '',
          question: cp.question || cp.question_text || '',
          correct_option_index: cp.correct_option_index ?? cp.correct_option ?? 0,
          correct_option: cp.correct_option ?? cp.correct_option_index ?? 0
        }));
      }

      // Fallback: load from questions table where image_url starts with cp_meta:
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
                rewind_to_sec: meta.rewind_time_sec || 0,
                rewind_time_sec: meta.rewind_time_sec || 0,
                question_text: q.text,
                question: q.text,
                options: Array.isArray(q.options) ? q.options : [],
                correct_option_index: q.correct_option_index,
                correct_option: q.correct_option_index
              });
            } catch {}
          }
        });
        return cps.sort((a, b) => a.trigger_time_sec - b.trigger_time_sec);
      }
    } catch (e) {
      console.warn('Error fetching checkpoints:', e);
    }
    return [];
  },

  saveVideoCheckpoints: async (lessonId, checkpoints) => {
    try {
      // 1. Try video_checkpoints table
      const { error: delError } = await supabase.from('video_checkpoints').delete().eq('lesson_id', lessonId);
      
      if (!delError) {
        if (checkpoints && checkpoints.length > 0) {
          const { error: insError } = await supabase.from('video_checkpoints').insert(
            checkpoints.map(cp => ({
              lesson_id: lessonId,
              trigger_time_sec: cp.trigger_time_sec || 0,
              rewind_time_sec: cp.rewind_time_sec !== undefined ? cp.rewind_time_sec : (cp.rewind_to_sec || 0),
              question: cp.question || cp.question_text || '',
              options: cp.options || [],
              correct_option: cp.correct_option !== undefined ? cp.correct_option : (cp.correct_option_index || 0)
            }))
          );
          if (!insError) return true;
        } else {
          return true;
        }
      }

      // 2. Fallback: Store checkpoints in questions table with cp_meta: image_url
      // Delete existing checkpoint questions for this lesson
      const { data: existingQ } = await supabase.from('questions').select('id, image_url').eq('lesson_id', lessonId);
      if (existingQ && existingQ.length > 0) {
        const cpIdsToDelete = existingQ
          .filter(q => q.image_url && q.image_url.startsWith('cp_meta:'))
          .map(q => q.id);
        if (cpIdsToDelete.length > 0) {
          await supabase.from('questions').delete().in('id', cpIdsToDelete);
        }
      }

      if (checkpoints && checkpoints.length > 0) {
        const rows = checkpoints.map(cp => ({
          lesson_id: lessonId,
          text: cp.question || cp.question_text || '',
          options: cp.options || [],
          correct_option_index: cp.correct_option !== undefined ? cp.correct_option : (cp.correct_option_index || 0),
          time_limit: 30,
          image_url: `cp_meta:${JSON.stringify({
            trigger_time_sec: cp.trigger_time_sec || 0,
            rewind_time_sec: cp.rewind_time_sec !== undefined ? cp.rewind_time_sec : (cp.rewind_to_sec || 0)
          })}`
        }));
        const { error: fallbackInsErr } = await supabase.from('questions').insert(rows);
        if (fallbackInsErr) {
          console.error('Fallback save error:', fallbackInsErr);
          return false;
        }
      }
      return true;
    } catch (e) {
      console.error('Error saving checkpoints:', e);
      return false;
    }
  },

  deleteVideoCheckpoint: async (id) => {
    try {
      await supabase.from('video_checkpoints').delete().eq('id', id);
      await supabase.from('questions').delete().eq('id', id);
      return true;
    } catch (e) {
      console.error('Error deleting checkpoint:', e);
      return false;
    }
  },

  getUser: async (telegramId) => {
    const { data, error } = await supabase.from('users').select('*').eq('telegram_id', telegramId).single();
    if (error) {
      console.error('Error fetching user:', error);
      return null;
    }
    return data;
  },

  getSubjectStats: async (subjectId) => {
    try {
      // 1. Total students
      const { count: studentsCount } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'student');
      
      // 2. Total lessons in this subject
      const { data: coursesData } = await supabase.from('courses').select('id').eq('subject_id', subjectId || 1);
      const courseIds = (coursesData || []).map(c => c.id);
      
      let lessonsCount = 0;
      let testsCount = 0;
      let avg_score = 0;

      if (courseIds.length > 0) {
        const { data: lessonsData } = await supabase.from('lessons').select('id').in('course_id', courseIds);
        lessonsCount = lessonsData ? lessonsData.length : 0;
        const lessonIds = (lessonsData || []).map(l => l.id);

        if (lessonIds.length > 0) {
          const { data: progressData } = await supabase.from('progress').select('stars').in('lesson_id', lessonIds).gt('stars', 0);
          testsCount = progressData ? progressData.length : 0;
          if (testsCount > 0) {
            const sum = progressData.reduce((acc, curr) => acc + curr.stars, 0);
            avg_score = (sum / testsCount).toFixed(1);
          }
        }
      }

      // Active today
      const today = new Date().toISOString().split('T')[0];
      const { count: activeToday } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('last_active_date', today);

      return {
        total_students: studentsCount || 0,
        total_lessons: lessonsCount,
        total_tests_taken: testsCount,
        avg_score: avg_score || 0,
        active_today: activeToday || 0
      };
    } catch (e) {
      console.error(e);
      return mockStats;
    }
  },

  getRedZones: async (subjectId) => {
    try {
      const { data } = await supabase.from('users').select('*').order('streak_days', { ascending: true }).limit(5);
      return (data || []).map(u => ({
        id: u.telegram_id,
        studentName: u.full_name || `ID ${u.telegram_id}`,
        classGroup: u.class_group || '11-A',
        issue: u.streak_days === 0 ? 'Faollik pasaygan' : `${u.streak_days} kunlik streak`,
        lastActive: u.last_active_date || 'Noma‘lum',
        balance: u.balance || 0
      }));
    } catch {
      return mockRedZones;
    }
  },

  getSubjects: async () => {
    const { data } = await supabase.from('subjects').select('*').order('id');
    return data || [];
  },

  createSubject: async (name) => {
    const { data, error } = await supabase.from('subjects').insert([{ name }]).select().single();
    if (error) {
      alert("Fan yaratishda xatolik: " + error.message);
      return null;
    }
    return data;
  },

  deleteSubject: async (subjectId) => {
    const { error } = await supabase.from('subjects').delete().eq('id', subjectId);
    if (error) alert("Fan o'chirishda xatolik: " + error.message);
    return !error;
  },

  createCourse: async (subjectId, title, price) => {
    const { data: c, error } = await supabase.from('courses').insert([{
      subject_id: subjectId, 
      title, 
      price: parseInt(price, 10) || 0
    }]).select().single();
    
    if (error) {
      console.error("Course creation error:", error);
      alert("Kurs yaratishda xatolik: " + error.message);
      return null;
    }
    return c;
  },
  
  createLesson: async (courseId, title, videoUrl, testQuestionCount, thumbnailUrl, duration, isFree) => {
    try {
      // 1. Try with extra columns
      const payload = {
        course_id: courseId,
        title,
        video_url: videoUrl,
        test_question_count: testQuestionCount,
        thumbnail_url: thumbnailUrl || null,
        duration: duration || null,
        is_free: !!isFree
      };
      const { data: l, error } = await supabase.from('lessons').insert([payload]).select().single();
      if (!error && l) return l;

      // 2. Fallback if extra columns don't exist in live table
      const { data: fallbackL, error: fallbackErr } = await supabase.from('lessons').insert([{
        course_id: courseId,
        title,
        video_url: videoUrl,
        test_question_count: testQuestionCount
      }]).select().single();

      if (fallbackErr) {
        console.error("Lesson creation error:", fallbackErr);
        alert("Dars yaratishda xatolik: " + fallbackErr.message);
        return null;
      }
      return fallbackL;
    } catch (e) {
      console.error("Lesson creation error:", e);
      return null;
    }
  },

  deleteCourse: async (courseId) => {
    const { error } = await supabase.from('courses').delete().eq('id', courseId);
    if (error) alert("Kurs o'chirishda xatolik: " + error.message);
    return !error;
  },

  deleteLesson: async (lessonId) => {
    const { error } = await supabase.from('lessons').delete().eq('id', lessonId);
    if (error) alert("Dars o'chirishda xatolik: " + error.message);
    return !error;
  },

  deleteQuestion: async (questionId) => {
    const { error } = await supabase.from('questions').delete().eq('id', questionId);
    if (error) alert("Savol o'chirishda xatolik: " + error.message);
    return !error;
  },

  createQuestion: async (lessonId, text, options, correctIndex, timeLimit = 30, imageUrl = null) => {
    const { data, error } = await supabase.from('questions').insert([{
      lesson_id: lessonId,
      text,
      options,
      correct_option_index: correctIndex,
      time_limit: timeLimit,
      image_url: imageUrl
    }]).select().single();
    
    if (error) {
      console.error("Question creation error:", error);
      alert("Savol saqlashda xatolik: " + error.message);
      return null;
    }
    return data;
  },

  getCourses: async (subjectId) => {
    let query = supabase.from('courses').select('*, lessons(count)').order('order_index');
    if (subjectId) {
      query = query.eq('subject_id', subjectId);
    }
    const { data } = await query;
    return (data || []).map(c => ({ ...c, lessons_count: c.lessons?.[0]?.count || 0 }));
  },

  getLessons: async (courseId) => {
    const { data } = await supabase.from('lessons').select('*, questions(count)').eq('course_id', courseId).order('order_index');
    return (data || []).map(l => ({ ...l, questions_count: l.questions?.[0]?.count || 0 }));
  },

  getQuestions: async (lessonId) => {
    const { data } = await supabase.from('questions').select('*').eq('lesson_id', lessonId);
    // Filter out checkpoint metadata questions
    return (data || []).filter(q => !q.image_url || !q.image_url.startsWith('cp_meta:'));
  },

  generatePromo: async (code, bonus, maxUses, createdBy) => {
    const { data, error } = await supabase.from('promo_codes').insert([{
      code: code.trim().toUpperCase(),
      bonus_amount: parseInt(bonus, 10) || 0,
      max_uses: parseInt(maxUses, 10) || 1,
      created_by: createdBy || null
    }]).select().single();

    if (error) {
      console.error("Promo error:", error);
      alert("Promokod yaratishda xatolik: " + error.message);
      return null;
    }
    return data ? { code: data.code, bonus: data.bonus_amount, maxUses: data.max_uses, currentUses: 0, createdAt: data.created_at } : null;
  },

  addTeacher: async (telegramId, subjectName, permissions) => {
    // 1. Check if user exists in database
    const { data: userExists } = await supabase.from('users').select('telegram_id, full_name').eq('telegram_id', telegramId).single();
    if (!userExists) {
      alert(`Xatolik: ID ${telegramId} raqamli foydalanuvchi bazada topilmadi. Avval o'quvchi ilovani ochishi kerak.`);
      return null;
    }

    // 2. Find subject
    const { data: subjects } = await supabase.from('subjects').select('id, name');
    const matchedSubject = (subjects || []).find(s => 
      s.name.toLowerCase().includes(subjectName.toLowerCase()) || 
      subjectName.toLowerCase().includes(s.name.toLowerCase())
    );
    const assigned_subject_id = matchedSubject ? matchedSubject.id : null;

    // 3. Update user role and permissions
    try {
      await supabase.from('users').update({ 
        role: 'teacher',
        permissions: permissions,
        assigned_subject_id: assigned_subject_id
      }).eq('telegram_id', telegramId);
    } catch {
      await supabase.from('users').update({ role: 'teacher' }).eq('telegram_id', telegramId);
    }

    // 4. Upsert into subject_admins
    if (assigned_subject_id) {
      await supabase.from('subject_admins').upsert({
        user_id: telegramId,
        subject_id: assigned_subject_id,
        permissions: permissions
      }, { onConflict: 'user_id, subject_id' }).catch(() => {});
    }
    
    return { 
      telegram_id: telegramId, 
      full_name: userExists.full_name || `ID ${telegramId}`, 
      permissions, 
      subject: matchedSubject ? matchedSubject.name : subjectName 
    };
  },

  removeTeacher: async (telegramId) => {
    try {
      await supabase.from('users').update({ 
        role: 'student',
        permissions: { can_promo: false, can_gift: false, can_send: false },
        assigned_subject_id: null
      }).eq('telegram_id', telegramId);
    } catch {
      await supabase.from('users').update({ role: 'student' }).eq('telegram_id', telegramId);
    }
    await supabase.from('subject_admins').delete().eq('user_id', telegramId).catch(() => {});
    return true;
  },
  
  getTeachers: async () => {
    try {
      const { data } = await supabase.from('users').select('*').in('role', ['teacher', 'superadmin']);
      const { data: subjects } = await supabase.from('subjects').select('id, name');
      const subMap = (subjects || []).reduce((acc, s) => ({ ...acc, [s.id]: s.name }), {});

      return (data || []).map(u => ({
        telegram_id: u.telegram_id,
        full_name: u.full_name || `ID ${u.telegram_id}`,
        subject: u.role === 'superadmin' ? 'Barcha fanlar' : (subMap[u.assigned_subject_id] || 'O‘qituvchi'),
        permissions: u.role === 'superadmin' ? {
          can_promo: true,
          can_gift: true,
          can_send: true
        } : (u.permissions || { can_promo: false, can_gift: false, can_send: false })
      }));
    } catch (e) {
      console.error(e);
      return [];
    }
  },
  
  getAllUsers: async () => {
    const { data } = await supabase.from('users').select('*').order('created_at', { ascending: false });
    return data || [];
  },
  
  updateUserBalance: async (telegramId, newBalance, giftAmount = null) => {
    const { data } = await supabase.from('users').update({ balance: newBalance }).eq('telegram_id', telegramId).select().single();
    
    if (giftAmount !== null) {
      await supabase.from('transactions').insert([{
        user_id: telegramId,
        amount: giftAmount,
        type: 'gift',
        description: `Ustoz / Admin tomonidan neyronlar kiritildi: ${giftAmount > 0 ? '+' : ''}${giftAmount} 🧠`
      }]).catch(() => {});
    }

    return data;
  },

  getAllStats: async () => {
    try {
      // 1. Total students
      const { count: studentsCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'student');
        
      // 2. Total lessons
      const { count: lessonsCount } = await supabase
        .from('lessons')
        .select('*', { count: 'exact', head: true });

      // 3. Tests taken (progress with stars > 0)
      const { data: progressData } = await supabase
        .from('progress')
        .select('stars')
        .gt('stars', 0);

      const testsCount = progressData ? progressData.length : 0;
      let avg_score = 0;
      if (testsCount > 0) {
        const sum = progressData.reduce((acc, curr) => acc + curr.stars, 0);
        avg_score = (sum / testsCount).toFixed(1);
      }

      // 4. Active today
      const today = new Date().toISOString().split('T')[0];
      const { count: activeToday } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('last_active_date', today);

      return {
        total_students: studentsCount || 0,
        total_lessons: lessonsCount || 0,
        total_tests_taken: testsCount,
        avg_score: avg_score || 0,
        active_today: activeToday || 0
      };
    } catch (e) {
      console.error(e);
      return mockStats;
    }
  },

  // Support Contacts Management (Superadmin)
  getSupportContacts: async () => {
    try {
      const { data, error } = await supabase
        .from('subjects')
        .select('id, description')
        .eq('id', 1)
        .maybeSingle();

      if (!error && data?.description) {
        try {
          const parsed = JSON.parse(data.description);
          if (parsed && typeof parsed === 'object') {
            return parsed;
          }
        } catch {}
      }
    } catch (e) {
      console.warn('Error fetching support contacts:', e);
    }

    try {
      const cached = localStorage.getItem('rb_support_contacts');
      if (cached) return JSON.parse(cached);
    } catch {}

    return {
      bio: { telegram: '@rashidov_bio_mentor', phone: '+998 90 123 45 67' },
      chem: { telegram: '@rashidov_chem_mentor', phone: '+998 90 765 43 21' },
      tech: { telegram: '@rashidov_support', phone: '+998 71 200 00 00' }
    };
  },

  saveSupportContacts: async (contacts) => {
    try {
      const jsonStr = JSON.stringify(contacts);
      const { error } = await supabase
        .from('subjects')
        .update({ description: jsonStr })
        .eq('id', 1);

      if (error) throw error;
      try {
        localStorage.setItem('rb_support_contacts', jsonStr);
      } catch {}
      return { success: true };
    } catch (e) {
      console.error('Error saving support contacts:', e);
      return { success: false, error: e.message };
    }
  }
};
