import React, { useState, useEffect } from 'react';
import { api } from '../api/supabase';

export default function SubjectBuilder({ onSelectSubject }) {
  const [subjects, setSubjects] = useState([]);
  const [name, setName] = useState('');

  useEffect(() => {
    loadSubjects();
  }, []);

  const loadSubjects = async () => {
    const data = await api.getSubjects();
    setSubjects(data);
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!name) return;
    const newSubject = await api.createSubject(name);
    if (newSubject) {
      setSubjects([...subjects, newSubject]);
      setName('');
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (window.confirm('Удалить предмет и ВСЕ его курсы, уроки и тесты?')) {
      const success = await api.deleteSubject(id);
      if (success) setSubjects(subjects.filter(s => s.id !== id));
    }
  };

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <h2 className="text-xl font-bold mb-4">Добавить предмет</h2>
        <form onSubmit={handleAdd} className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm text-slate-400 mb-1">Название предмета</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} className="input-field" placeholder="Например: Физика" />
          </div>
          <button type="submit" disabled={!name} className="btn-primary">Добавить</button>
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {subjects.map(subject => (
          <div key={subject.id} className="card p-5 card-hover cursor-pointer relative" onClick={() => onSelectSubject(subject)}>
            <button 
              onClick={(e) => handleDelete(e, subject.id)} 
              className="absolute top-3 right-3 text-red-500 hover:text-red-400 p-1 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
              title="Удалить предмет"
            >
              🗑️
            </button>
            <div className="text-4xl mb-2">{subject.name.includes('Биолог') ? '🧬' : subject.name.includes('Хими') ? '🧪' : subject.name.includes('Математ') ? '📐' : '📚'}</div>
            <h3 className="font-bold text-lg mb-2 pr-8">{subject.name}</h3>
            <p className="text-sm text-slate-400">Нажмите, чтобы открыть курсы</p>
          </div>
        ))}
      </div>
    </div>
  );
}
