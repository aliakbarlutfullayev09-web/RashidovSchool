import { createClient } from '@supabase/supabase-js';
import { mockStats, mockRedZones, mockCourses, mockLessons, mockTeachers, mockAllUsers } from '../mock/data';

const supabaseUrl = 'https://rcpbepcdgbxjncpxeowx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjcGJlcGNkZ2J4am5jcHhlb3d4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgwMTQyNTAsImV4cCI6MjEwMzU5MDI1MH0.icLRyq0piPK_aITPZDu42nFOG9_jyfzVc7lwuckubbM';

export const supabase = createClient(supabaseUrl, supabaseKey);

const isMock = false;

export const api = {
  // Реальный запрос пользователя
  getUser: async (telegramId) => {
    const { data, error } = await supabase.from('users').select('*').eq('telegram_id', telegramId).single();
    if (error) {
      console.error('Error fetching user:', error);
      return null;
    }
    return data;
  },

  getSubjectStats: async (subjectId) => isMock ? mockStats : mockStats, // Using mock for now
  getRedZones: async (subjectId) => isMock ? mockRedZones : mockRedZones,
  createCourse: async (subjectId, title, price) => {
    let safeSubjectId = subjectId || 1;
    
    // Проверяем, есть ли предмет с таким ID
    const { data: subj } = await supabase.from('subjects').select('id').eq('id', safeSubjectId).single();
    if (!subj) {
      // Если предмета нет, создаем его базовым
      await supabase.from('subjects').insert([{ id: safeSubjectId, name: 'Биология' }]);
    }

    const { data: c, error } = await supabase.from('courses').insert([{
      subject_id: safeSubjectId, 
      title, 
      price: parseInt(price) || 0
    }]).select().single();
    
    if (error) {
      console.error("Course creation error:", error);
      alert("Ошибка при сохранении: " + error.message);
      return null;
    }
    
    return c;
  },
  
  createLesson: async (courseId, title, videoUrl, testQuestionCount) => {
    const { data: l, error } = await supabase.from('lessons').insert([{
      course_id: courseId,
      title,
      video_url: videoUrl,
      test_question_count: testQuestionCount
    }]).select().single();
    
    if (error) {
      console.error("Lesson creation error:", error);
      alert("Ошибка при сохранении урока: " + error.message);
      return null;
    }
    return l;
  },

  deleteCourse: async (courseId) => {
    const { error } = await supabase.from('courses').delete().eq('id', courseId);
    if (error) alert("Ошибка удаления курса: " + error.message);
    return !error;
  },

  deleteLesson: async (lessonId) => {
    const { error } = await supabase.from('lessons').delete().eq('id', lessonId);
    if (error) alert("Ошибка удаления урока: " + error.message);
    return !error;
  },

  deleteQuestion: async (questionId) => {
    const { error } = await supabase.from('questions').delete().eq('id', questionId);
    if (error) alert("Ошибка удаления вопроса: " + error.message);
    return !error;
  },

  createQuestion: async (lessonId, text, options, correctIndex, timeLimit) => {
    const { data: q, error } = await supabase.from('questions').insert([{
      lesson_id: lessonId,
      text,
      options,
      correct_option_index: correctIndex,
      time_limit: timeLimit || 30
    }]).select().single();
    
    if (error) {
      console.error("Question creation error:", error);
      alert("Ошибка при сохранении вопроса: " + error.message);
      return null;
    }
    return q;
  },

  getCourses: async (subjectId) => {
    const { data } = await supabase.from('courses').select('*, lessons(count)').order('order_index');
    return (data || []).map(c => ({ ...c, lessons_count: c.lessons?.[0]?.count || 0 }));
  },

  getLessons: async (courseId) => {
    const { data } = await supabase.from('lessons').select('*, questions(count)').eq('course_id', courseId).order('order_index');
    return (data || []).map(l => ({ ...l, questions_count: l.questions?.[0]?.count || 0 }));
  },

  getQuestions: async (lessonId) => {
    const { data } = await supabase.from('questions').select('*').eq('lesson_id', lessonId);
    return data || [];
  },
  generatePromo: async (code, bonus, maxUses, createdBy) => {
    const { data } = await supabase.from('promo_codes').insert([{
      code,
      bonus_amount: parseInt(bonus) || 0,
      max_uses: parseInt(maxUses) || 1,
      created_by: createdBy
    }]).select().single();
    return data ? { code: data.code, bonus: data.bonus_amount, maxUses: data.max_uses } : null;
  },
  addTeacher: async (telegramId, subjectId, permissions) => ({ telegram_id: telegramId, permissions }),
  getTeachers: async (subjectId) => isMock ? mockTeachers : mockTeachers,
  getAllUsers: async () => {
    const { data } = await supabase.from('users').select('*').order('created_at', { ascending: false });
    return data || [];
  },
  
  updateUserBalance: async (telegramId, newBalance) => {
    const { data } = await supabase.from('users').update({ balance: newBalance }).eq('telegram_id', telegramId).select().single();
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
        avg_score: avg_score,
        active_today: activeToday || 0
      };
    } catch (e) {
      console.error(e);
      return mockStats;
    }
  },
};
