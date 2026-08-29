import React, { useState, useEffect } from 'react';
import { api } from '../api/supabase';

export default function LessonBuilder({ courseId, courseName, onSelectLesson, onBack }) {
  const [lessons, setLessons] = useState([]);
  const [title, setTitle] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [testQuestionCount, setTestQuestionCount] = useState('');

  useEffect(() => {
    loadLessons();
  }, [courseId]);

  const loadLessons = async () => {
    const data = await api.getLessons(courseId);
    setLessons(data);
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!title) return;
    const qCount = testQuestionCount ? parseInt(testQuestionCount) : null;
    const newLesson = await api.createLesson(courseId, title, videoUrl, qCount);
    if (newLesson) {
      setLessons([...lessons, newLesson]);
      setTitle('');
      setVideoUrl('');
      setTestQuestionCount('');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-slate-400 text-sm">
        <button onClick={onBack} className="hover:text-blue-400 transition-colors">Курсы</button>
        <span>&gt;</span>
        <span className="text-white">{courseName}</span>
      </div>

      <div className="card p-6">
        <h2 className="text-xl font-bold mb-4">Добавить урок</h2>
        <form onSubmit={handleAdd} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Название урока</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="input-field" placeholder="Название урока..." />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Прямая ссылка на видео (Cloudflare R2)</label>
            <input type="url" value={videoUrl} onChange={e => setVideoUrl(e.target.value)} className="input-field" placeholder="https://..." />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Кол-во вопросов в тесте</label>
            <input 
              type="number" 
              value={testQuestionCount} 
              onChange={e => setTestQuestionCount(e.target.value)} 
              className="input-field w-48" 
              placeholder="Все вопросы" 
              min="1"
            />
            <p className="text-xs text-slate-500 mt-1">
              Сколько случайных вопросов показать ученику из банка. Оставьте пустым — покажутся все.
            </p>
          </div>
          <button type="submit" disabled={!title} className="btn-primary">Добавить урок</button>
        </form>
      </div>

      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-slate-300">Уроки ({lessons.length})</h3>
        {lessons.map(lesson => (
          <div key={lesson.id} className="card p-4 flex justify-between items-center card-hover cursor-pointer" onClick={() => onSelectLesson(lesson)}>
            <div>
              <div className="font-medium">{lesson.title}</div>
              {lesson.test_question_count && (
                <div className="text-xs text-blue-400 mt-1">📝 Тест: {lesson.test_question_count} вопросов</div>
              )}
            </div>
            <div className="text-sm text-slate-400">{lesson.questions_count || 0} вопросов в банке →</div>
          </div>
        ))}
        {lessons.length === 0 && <div className="text-slate-500 italic">Пока нет уроков в этом курсе.</div>}
      </div>
    </div>
  );
}
