import { createClient } from '@supabase/supabase-js';
import { mockStats, mockRedZones, mockCourses, mockLessons, mockTeachers, mockAllUsers } from '../mock/data';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://mock.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'mock-key';

export const supabase = createClient(supabaseUrl, supabaseKey);

const isMock = supabaseUrl.includes('mock');

export const api = {
  getSubjectStats: async (subjectId) => isMock ? mockStats : mockStats, // Using mock for now
  getRedZones: async (subjectId) => isMock ? mockRedZones : mockRedZones,
  createCourse: async (subjectId, title, price) => ({ id: Math.random(), title, price, lessons_count: 0 }),
  createLesson: async (courseId, title, videoUrl) => ({ id: Math.random(), title, course_id: courseId, questions_count: 0 }),
  createQuestion: async (lessonId, text, options, correctIndex, timeLimit) => ({ id: Math.random() }),
  getCourses: async (subjectId) => isMock ? mockCourses : mockCourses,
  getLessons: async (courseId) => isMock ? mockLessons.filter(l => l.course_id === courseId) : mockLessons,
  getQuestions: async (lessonId) => [],
  generatePromo: async (code, bonus, maxUses, createdBy) => ({ code, bonus, maxUses }),
  addTeacher: async (telegramId, subjectId, permissions) => ({ telegram_id: telegramId, permissions }),
  getTeachers: async (subjectId) => isMock ? mockTeachers : mockTeachers,
  getAllUsers: async () => isMock ? mockAllUsers : mockAllUsers,
  getAllStats: async () => isMock ? mockStats : mockStats,
};
