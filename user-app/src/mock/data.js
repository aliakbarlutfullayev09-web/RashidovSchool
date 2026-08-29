export const mockUser = {
  telegram_id: 123456789,
  full_name: 'Алишер Рашидов',
  class_group: '9-А',
  balance: 1250,
  streak_days: 7,
  language: 'ru',
  role: 'student'
};

export const mockCourses = [
  { id: 1, title: 'Клетка и её строение', price: 0, order_index: 1 },
  { id: 2, title: 'Генетика', price: 500, order_index: 2 },
  { id: 3, title: 'Эволюция', price: 800, order_index: 3 }
];

// Добавили тестовые thumbnail_url для ютуб-дизайна
export const mockLessons = [
  { id: 1, course_id: 1, title: 'Введение в клетку', video_url: 'https://www.w3schools.com/html/mov_bbb.mp4', thumbnail_url: 'https://images.unsplash.com/photo-1530026405186-ed1f139313f8?auto=format&fit=crop&w=800&q=80', order_index: 1 },
  { id: 2, course_id: 1, title: 'Органоиды', video_url: 'https://www.w3schools.com/html/mov_bbb.mp4', thumbnail_url: 'https://images.unsplash.com/photo-1576086213369-97a306d36557?auto=format&fit=crop&w=800&q=80', order_index: 2 },
  { id: 3, course_id: 1, title: 'Деление клетки (Митоз)', video_url: 'https://www.w3schools.com/html/mov_bbb.mp4', thumbnail_url: 'https://images.unsplash.com/photo-1582719478250-c8940cebf8e5?auto=format&fit=crop&w=800&q=80', order_index: 3 },
  { id: 4, course_id: 2, title: 'Законы Менделя', video_url: 'https://www.w3schools.com/html/mov_bbb.mp4', thumbnail_url: 'https://images.unsplash.com/photo-1628595351029-c2bf17511435?auto=format&fit=crop&w=800&q=80', order_index: 1 },
  { id: 5, course_id: 2, title: 'ДНК и РНК', video_url: null, thumbnail_url: 'https://images.unsplash.com/photo-1530026405186-ed1f139313f8?auto=format&fit=crop&w=800&q=80', order_index: 2 },
  { id: 6, course_id: 3, title: 'Теория Дарвина', video_url: null, thumbnail_url: 'https://images.unsplash.com/photo-1576086213369-97a306d36557?auto=format&fit=crop&w=800&q=80', order_index: 1 }
];

export const mockProgress = [
  { lesson_id: 1, stars: 3, is_unlocked: true },
  { lesson_id: 2, stars: 2, is_unlocked: true },
  { lesson_id: 3, stars: 0, is_unlocked: true },  // current
  { lesson_id: 4, stars: 0, is_unlocked: false }, // locked
  { lesson_id: 5, stars: 0, is_unlocked: false },
  { lesson_id: 6, stars: 0, is_unlocked: false }
];
