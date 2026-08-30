import React, { useState, useEffect } from 'react';
import { api } from '../api/supabase';

export default function CourseBuilder({ user, subjectId, subjectName, onSelectCourse }) {
  const [courses, setCourses] = useState([]);
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState(0);

  useEffect(() => {
    loadCourses();
  }, [subjectId]);

  const loadCourses = async () => {
    const data = await api.getCourses(subjectId);
    setCourses(data);
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!title) return;
    const newCourse = await api.createCourse(subjectId, title, price);
    if (newCourse) {
      setCourses([...courses, { ...newCourse, lessons_count: 0 }]);
      setTitle('');
      setPrice(0);
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (window.confirm('Удалить курс и все его уроки?')) {
      const success = await api.deleteCourse(id);
      if (success) setCourses(courses.filter(c => c.id !== id));
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-slate-300">Курсы предмета: <span className="text-white">{subjectName}</span></h2>
      <div className="card p-6">
        <h2 className="text-xl font-bold mb-4">Добавить курс</h2>
        <form onSubmit={handleAdd} className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm text-slate-400 mb-1">Название курса</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="input-field" placeholder="Название курса..." />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Цена (Нейроны, 0=бесплатно)</label>
            <input type="number" value={price} onChange={e => setPrice(parseInt(e.target.value))} className="input-field w-40" min="0" />
          </div>
          <button type="submit" disabled={!title} className="btn-primary">Добавить</button>
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {courses.map(course => (
          <div key={course.id} className="card p-5 card-hover cursor-pointer relative" onClick={() => onSelectCourse(course)}>
            <button 
              onClick={(e) => handleDelete(e, course.id)} 
              className="absolute top-3 right-3 text-red-500 hover:text-red-400 p-1 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
              title="Удалить курс"
            >
              🗑️
            </button>
            <h3 className="font-bold text-lg mb-2 pr-8">{course.title}</h3>
            <div className="flex justify-between text-sm text-slate-400">
              <span>{course.lessons_count} уроков</span>
              <span className={course.price > 0 ? "text-yellow-400" : "text-green-400"}>
                {course.price > 0 ? `${course.price} Нейронов` : 'Бесплатно'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
