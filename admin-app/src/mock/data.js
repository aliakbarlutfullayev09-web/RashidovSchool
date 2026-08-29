export const mockTeacherUser = {
  telegram_id: 111111,
  full_name: 'Камола Рашидова',
  role: 'teacher',
  subject: { id: 1, name: 'Биология' },
  permissions: { can_promo: true, can_gift: true, can_send: true }
};

export const mockSuperadminUser = {
  telegram_id: 999999,
  full_name: 'Администратор',
  role: 'superadmin'
};

export const mockStats = {
  total_students: 247,
  total_lessons: 18,
  total_tests_taken: 1893,
  avg_score: 72.4,
  active_today: 34
};

export const mockRedZones = [
  { id: 1, question_text: 'Какой органоид отвечает за синтез белка?', lesson_title: 'Органоиды', correct_rate: 18, total_attempts: 156 },
  { id: 2, question_text: 'Фаза митоза, в которой хромосомы выстраиваются по экватору?', lesson_title: 'Деление клетки', correct_rate: 23, total_attempts: 89 },
  { id: 3, question_text: 'Функция лизосом в клетке?', lesson_title: 'Органоиды', correct_rate: 27, total_attempts: 201 }
];

export const mockCourses = [
  { id: 1, title: 'Клетка и её строение', price: 0, lessons_count: 3 },
  { id: 2, title: 'Генетика', price: 500, lessons_count: 2 },
  { id: 3, title: 'Эволюция', price: 800, lessons_count: 1 }
];

export const mockLessons = [
  { id: 1, title: 'Введение в клетку', course_id: 1, questions_count: 5 },
  { id: 2, title: 'Органоиды', course_id: 1, questions_count: 8 },
  { id: 3, title: 'Деление клетки', course_id: 1, questions_count: 6 },
  { id: 4, title: 'Законы Менделя', course_id: 2, questions_count: 10 }
];

export const mockTeachers = [
  { telegram_id: 111111, full_name: 'Камола Рашидова', subject: 'Биология', permissions: { can_promo: true, can_gift: true, can_send: true } },
  { telegram_id: 222222, full_name: 'Бахтиёр Каримов', subject: 'Химия', permissions: { can_promo: true, can_gift: false, can_send: false } }
];

export const mockAllUsers = [
  { telegram_id: 123456, full_name: 'Алишер Рашидов', class_group: '9-А', balance: 1250, streak_days: 7, role: 'student' },
  { telegram_id: 234567, full_name: 'Дилноза Юсупова', class_group: '9-Б', balance: 800, streak_days: 3, role: 'student' },
  { telegram_id: 345678, full_name: 'Жасур Абдуллаев', class_group: '10-А', balance: 2100, streak_days: 14, role: 'student' }
];
