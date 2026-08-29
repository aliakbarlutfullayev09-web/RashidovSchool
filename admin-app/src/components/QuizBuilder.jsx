import React, { useState } from 'react';
import { api } from '../api/supabase';

export default function QuizBuilder({ lessonId, lessonName, courseName, onBack }) {
  const [questions, setQuestions] = useState([]);
  const [text, setText] = useState('');
  const [timeLimit, setTimeLimit] = useState(30);
  const [options, setOptions] = useState(['', '', '', '']);
  const [correctIndex, setCorrectIndex] = useState(0);

  React.useEffect(() => {
    async function loadQ() {
      const qs = await api.getQuestions(lessonId);
      setQuestions(qs);
    }
    loadQ();
  }, [lessonId]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!text || options.some(o => !o)) return;
    const newQ = await api.createQuestion(lessonId, text, options, correctIndex, timeLimit);
    if (newQ) {
      setQuestions([...questions, newQ]);
      setText('');
      setOptions(['', '', '', '']);
      setCorrectIndex(0);
      setTimeLimit(30);
    }
  };

  const updateOption = (index, value) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (window.confirm('Удалить этот вопрос?')) {
      const success = await api.deleteQuestion(id);
      if (success) setQuestions(questions.filter(q => q.id !== id));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-slate-400 text-sm">
        <span className="text-slate-500">{courseName}</span>
        <span>&gt;</span>
        <button onClick={onBack} className="hover:text-blue-400 transition-colors">{lessonName}</button>
        <span>&gt;</span>
        <span className="text-white">Тест</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h2 className="text-xl font-bold mb-4">Добавить вопрос</h2>
          <form onSubmit={handleAdd} className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Текст вопроса</label>
              <textarea value={text} onChange={e => setText(e.target.value)} className="input-field h-24 resize-none" placeholder="Введите вопрос..."></textarea>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Таймер (секунды)</label>
              <input type="number" value={timeLimit} onChange={e => setTimeLimit(parseInt(e.target.value))} className="input-field w-32" min="5" />
            </div>
            
            <div className="space-y-2 mt-4">
              <label className="block text-sm text-slate-400 mb-1">Варианты ответов</label>
              {['A', 'B', 'C', 'D'].map((lbl, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <input type="radio" name="correct" checked={correctIndex === idx} onChange={() => setCorrectIndex(idx)} className="w-4 h-4 text-blue-600 bg-slate-700 border-slate-600 focus:ring-blue-500" />
                  <span className="font-bold text-slate-400 w-4">{lbl}</span>
                  <input type="text" value={options[idx]} onChange={e => updateOption(idx, e.target.value)} className={`input-field flex-1 ${correctIndex === idx ? 'border-green-500' : ''}`} placeholder={`Вариант ${lbl}`} required />
                </div>
              ))}
            </div>

            <button type="submit" className="btn-primary w-full mt-4">Добавить вопрос</button>
          </form>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-bold">Существующие вопросы ({questions.length})</h2>
          {questions.map((q, i) => (
            <div key={q.id} className="card p-4 relative group">
              <div className="absolute top-4 right-4 flex items-center space-x-3">
                <span className="text-xs text-slate-400">⏱ {q.timeLimit}с</span>
                <button 
                  onClick={(e) => handleDelete(e, q.id)} 
                  className="text-red-500 hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/5 rounded"
                  title="Удалить вопрос"
                >
                  🗑️
                </button>
              </div>
              <div className="font-bold mb-2 pr-16">{i + 1}. {q.text}</div>
              <div className="space-y-1">
                {q.options.map((opt, idx) => (
                  <div key={idx} className={`text-sm p-2 rounded ${idx === q.correct_option_index ? 'bg-green-900/30 text-green-400 border border-green-800' : 'bg-slate-800 text-slate-300'}`}>
                    {['A', 'B', 'C', 'D'][idx]}. {opt}
                  </div>
                ))}
              </div>
            </div>
          ))}
          {questions.length === 0 && <div className="text-slate-500 italic">Пока нет вопросов в этом тесте.</div>}
        </div>
      </div>
    </div>
  );
}
