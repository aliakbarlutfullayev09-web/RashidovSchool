import React, { useState, useEffect } from 'react';
import { api } from '../api/supabase';
import VideoCheckpointStudio from './VideoCheckpointStudio';

export default function LessonBuilder({ courseId, courseName, onSelectLesson, onBack }) {
  const [lessons, setLessons] = useState([]);
  const [title, setTitle] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [testQuestionCount, setTestQuestionCount] = useState('');
  
  // New fields
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [duration, setDuration] = useState('');
  const [isFree, setIsFree] = useState(false);

  // Checkpoint Studio state
  const [editingCheckpointLesson, setEditingCheckpointLesson] = useState(null);

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
    
    // We would need to update the API createLesson to accept the new fields if backend supports it.
    // For now we pass them in if createLesson accepts it, or just use existing ones.
    const newLesson = await api.createLesson(courseId, title, videoUrl, qCount, thumbnailUrl, duration, isFree);
    if (newLesson) {
      setLessons([...lessons, newLesson]);
      setTitle('');
      setVideoUrl('');
      setTestQuestionCount('');
      setThumbnailUrl('');
      setDuration('');
      setIsFree(false);
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (window.confirm('Удалить этот урок?')) {
      const success = await api.deleteLesson(id);
      if (success) setLessons(lessons.filter(l => l.id !== id));
    }
  };

  if (editingCheckpointLesson) {
    return (
      <VideoCheckpointStudio 
        lessonId={editingCheckpointLesson.id}
        videoUrl={editingCheckpointLesson.video_url}
        onBack={() => setEditingCheckpointLesson(null)}
        onSave={() => {
           setEditingCheckpointLesson(null);
           loadLessons();
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-slate-400 text-sm">
        <button onClick={onBack} className="hover:text-blue-400 transition-colors">Курсы</button>
        <span>&gt;</span>
        <span className="text-white">{courseName}</span>
      </div>

      <div className="card p-6 bg-slate-800 rounded-2xl border border-white/5 shadow-lg">
        <h2 className="text-xl font-bold mb-4 text-white">Добавить урок</h2>
        <form onSubmit={handleAdd} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Название урока</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white outline-none focus:border-blue-500" placeholder="Название урока..." />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Прямая ссылка на видео (Cloudflare R2)</label>
            <input type="url" value={videoUrl} onChange={e => setVideoUrl(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white outline-none focus:border-blue-500" placeholder="https://..." />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Обложка (URL)</label>
            <input type="url" value={thumbnailUrl} onChange={e => setThumbnailUrl(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white outline-none focus:border-blue-500" placeholder="https://..." />
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm text-slate-400 mb-1">Кол-во вопросов в тесте</label>
              <input 
                type="number" 
                value={testQuestionCount} 
                onChange={e => setTestQuestionCount(e.target.value)} 
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white outline-none focus:border-blue-500" 
                placeholder="Все вопросы" 
                min="1"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm text-slate-400 mb-1">Длительность</label>
              <input 
                type="text" 
                value={duration} 
                onChange={e => setDuration(e.target.value)} 
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white outline-none focus:border-blue-500" 
                placeholder="14:20" 
              />
            </div>
          </div>
          <div className="flex items-center gap-2 py-2">
            <input 
               type="checkbox" 
               checked={isFree} 
               onChange={e => setIsFree(e.target.checked)} 
               className="w-4 h-4 accent-blue-500"
               id="is_free_check"
            />
            <label htmlFor="is_free_check" className="text-sm text-slate-300">Бесплатный урок</label>
          </div>
          <button type="submit" disabled={!title} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-xl font-medium transition-colors disabled:opacity-50">Добавить урок</button>
        </form>
      </div>

      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-slate-300">Уроки ({lessons.length})</h3>
        {lessons.map(lesson => (
          <div key={lesson.id} className="bg-slate-800 p-4 rounded-xl border border-white/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-blue-500/50 transition-colors">
            <div className="flex-1 cursor-pointer" onClick={() => onSelectLesson(lesson)}>
              <div className="font-medium text-white">{lesson.title}</div>
              {lesson.test_question_count && (
                <div className="text-xs text-blue-400 mt-1">📝 Тест: {lesson.test_question_count} вопросов</div>
              )}
            </div>
            <div className="flex items-center space-x-3 w-full md:w-auto">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingCheckpointLesson(lesson);
                }} 
                className="text-xs bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
              >
                🎬 Настроить контрольные точки
              </button>
              <div className="text-sm text-slate-400 cursor-pointer" onClick={() => onSelectLesson(lesson)}>{lesson.questions_count || 0} вопросов →</div>
              <button 
                onClick={(e) => handleDelete(e, lesson.id)} 
                className="text-red-400 hover:text-white hover:bg-red-500 p-2 rounded-lg transition-colors"
                title="Удалить урок"
              >
                🗑️
              </button>
            </div>
          </div>
        ))}
        {lessons.length === 0 && <div className="text-slate-500 italic">Пока нет уроков в этом курсе.</div>}
      </div>
    </div>
  );
}
