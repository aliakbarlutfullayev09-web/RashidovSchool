import React, { useState, useEffect } from 'react';
import { api } from '../api/supabase';
import { Plus, Trash2, HelpCircle, Check, ArrowLeft, Clock, Image as ImageIcon } from 'lucide-react';

export default function QuizBuilder({ lessonId, lessonName, courseName, onBack }) {
  const [questions, setQuestions] = useState([]);
  const [text, setText] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [timeLimit, setTimeLimit] = useState(30);
  const [options, setOptions] = useState(['', '', '', '']);
  const [correctIndex, setCorrectIndex] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadQ() {
      const qs = await api.getQuestions(lessonId);
      setQuestions(qs);
    }
    loadQ();
  }, [lessonId]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!text.trim() || options.some(o => !o.trim())) return;
    setLoading(true);

    const newQ = await api.createQuestion(lessonId, text.trim(), options, correctIndex, timeLimit, imageUrl.trim() || null);
    setLoading(false);
    if (newQ) {
      setQuestions(prev => [...prev, newQ]);
      setText('');
      setImageUrl('');
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
    if (window.confirm("Ushbu test savolini o'chirishni xohlaysizmi?")) {
      const success = await api.deleteQuestion(id);
      if (success) {
        setQuestions(prev => prev.filter(q => q.id !== id));
      }
    }
  };

  return (
    <div className="space-y-6 text-white pb-24">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs font-semibold text-[#8E8E93] bg-[#1C1C1E] p-3 px-4 rounded-2xl border border-white/5 w-fit">
        <span className="text-[#8E8E93]">{courseName}</span>
        <span>/</span>
        <button onClick={onBack} className="hover:text-white transition-colors flex items-center gap-1 font-bold text-white">
          <ArrowLeft className="w-3.5 h-3.5" /> {lessonName}
        </button>
        <span>/</span>
        <span className="text-blue-400 font-bold">Test savollari</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Form: Add Question */}
        <div className="lg:col-span-7 card p-6 bg-[#1C1C1E] border border-white/5 shadow-2xl space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Yangi test savoli</h2>
              <p className="text-xs text-[#8E8E93]">Dars yakunidagi test uchun savol qo'shish</p>
            </div>
          </div>

          <form onSubmit={handleAdd} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#8E8E93] mb-1.5 uppercase tracking-wider">
                Savol matni *
              </label>
              <textarea 
                value={text} 
                onChange={e => setText(e.target.value)} 
                className="input-field min-h-[90px] resize-y" 
                placeholder="Savolni kiriting..." 
                required 
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#8E8E93] mb-1.5 uppercase tracking-wider">
                  Rasm havolasi (Ixtiyoriy)
                </label>
                <input 
                  type="url" 
                  value={imageUrl} 
                  onChange={e => setImageUrl(e.target.value)} 
                  className="input-field" 
                  placeholder="https://..." 
                />
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-[#8E8E93] mb-1.5 uppercase tracking-wider">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Vaqt chegarasi (sekund)</span>
                </label>
                <input 
                  type="number" 
                  value={timeLimit} 
                  onChange={e => setTimeLimit(parseInt(e.target.value, 10) || 30)} 
                  className="input-field font-mono" 
                  min="5" 
                />
              </div>
            </div>

            {/* Optional Image Preview */}
            {imageUrl && (
              <div className="relative w-full aspect-video max-h-48 rounded-2xl overflow-hidden bg-black border border-white/10">
                <img src={imageUrl} alt="Savol rasmi" className="w-full h-full object-contain" />
              </div>
            )}

            {/* 4 Options */}
            <div className="space-y-3 pt-2">
              <label className="block text-xs font-semibold text-[#8E8E93] uppercase tracking-wider">
                Variantlar (To'g'ri javobni tanlang)
              </label>
              {['A', 'B', 'C', 'D'].map((lbl, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <input 
                    type="radio" 
                    name="correct" 
                    checked={correctIndex === idx} 
                    onChange={() => setCorrectIndex(idx)} 
                    className="w-5 h-5 accent-[#007AFF] cursor-pointer flex-shrink-0" 
                  />
                  <span className="font-bold text-xs text-white/70 w-5">{lbl}</span>
                  <input 
                    type="text" 
                    value={options[idx]} 
                    onChange={e => updateOption(idx, e.target.value)} 
                    className="input-field py-2.5 text-xs flex-1" 
                    placeholder={`${lbl} varianti javobi...`} 
                    required 
                  />
                </div>
              ))}
            </div>

            <button 
              type="submit" 
              disabled={loading || !text.trim() || options.some(o => !o.trim())} 
              className="btn-primary py-3 px-6 text-sm w-full sm:w-auto"
            >
              <Plus className="w-4 h-4" />
              <span>{loading ? "Qo'shilmoqda..." : "Savolni qo'shish"}</span>
            </button>
          </form>
        </div>

        {/* List of Existing Questions */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>Mavjud savollar</span>
              <span className="bg-[#2C2C2E] text-xs font-semibold px-2.5 py-0.5 rounded-full text-[#8E8E93]">
                {questions.length} ta
              </span>
            </h3>
          </div>

          <div className="space-y-3">
            {questions.map((q, idx) => (
              <div 
                key={q.id || idx} 
                className="card p-4 bg-[#1C1C1E] border border-white/5 rounded-3xl shadow-xl space-y-3 relative"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-blue-400 bg-blue-500/10 px-2.5 py-0.5 rounded-full">
                      #{idx + 1}
                    </span>
                    <span className="text-[10px] text-[#8E8E93] font-mono">
                      ⏱ {q.time_limit || 30}s
                    </span>
                  </div>

                  <button 
                    onClick={(e) => handleDelete(e, q.id)} 
                    className="w-7 h-7 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white flex items-center justify-center transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <p className="text-xs font-bold text-white leading-snug">{q.text}</p>

                {q.image_url && (
                  <div className="w-full aspect-video max-h-32 rounded-xl overflow-hidden bg-black border border-white/5">
                    <img src={q.image_url} alt="Question" className="w-full h-full object-contain" />
                  </div>
                )}

                <div className="space-y-1.5 pt-1">
                  {(Array.isArray(q.options) ? q.options : []).map((opt, oIdx) => (
                    <div 
                      key={oIdx} 
                      className={`text-[11px] p-2 rounded-xl border flex items-center justify-between ${
                        q.correct_option_index === oIdx 
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 font-bold' 
                          : 'bg-[#2C2C2E] border-white/5 text-[#8E8E93]'
                      }`}
                    >
                      <span>{['A', 'B', 'C', 'D'][oIdx]}: {opt}</span>
                      {q.correct_option_index === oIdx && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {questions.length === 0 && (
              <div className="card p-8 text-center text-[#8E8E93] text-xs">
                Ushbu darsda hali savollar yo'q. Chap tomondagi forma orqali test savollarini qo'shing.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
