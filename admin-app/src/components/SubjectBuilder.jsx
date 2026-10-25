import React, { useState, useEffect } from 'react';
import { api } from '../api/supabase';
import { Plus, Trash2, BookOpen, ChevronRight, Layers } from 'lucide-react';

export default function SubjectBuilder({ onSelectSubject }) {
  const [subjects, setSubjects] = useState([]);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSubjects();
  }, []);

  const loadSubjects = async () => {
    const data = await api.getSubjects();
    setSubjects(data);
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);

    const newSubject = await api.createSubject(name.trim());
    setLoading(false);
    if (newSubject) {
      setSubjects(prev => [...prev, newSubject]);
      setName('');
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (window.confirm("Ushbu fanni va unga tegishli barcha kurslar, darslar va testlarni o'chirishni tasdiqlaysizmi?")) {
      const success = await api.deleteSubject(id);
      if (success) {
        setSubjects(prev => prev.filter(s => s.id !== id));
      }
    }
  };

  const getEmoji = (subName = '') => {
    const lower = subName.toLowerCase();
    if (lower.includes('biolog')) return '🧬';
    if (lower.includes('ximi') || lower.includes('kimyo')) return '🧪';
    if (lower.includes('matem')) return '📐';
    if (lower.includes('fizik')) return '⚡';
    return '📚';
  };

  return (
    <div className="space-y-6 text-white pb-24">
      {/* Add Subject Card */}
      <div className="card p-6 bg-[#1C1C1E] border border-white/5 shadow-2xl">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-2xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Yangi fan qo'shish</h2>
            <p className="text-xs text-[#8E8E93]">Platformadagi o'quv yo'nalishlari va fanlar</p>
          </div>
        </div>

        <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-3">
          <input 
            type="text" 
            value={name} 
            onChange={e => setName(e.target.value)} 
            className="input-field flex-1" 
            placeholder="Fan nomi (Masalan: Biologiya, Kimyo...)" 
            required 
          />
          <button 
            type="submit" 
            disabled={loading || !name.trim()} 
            className="btn-primary py-3 px-6 whitespace-nowrap active:scale-95 transition-all text-sm"
          >
            <Plus className="w-4 h-4" />
            <span>{loading ? "Qo'shilmoqda..." : "Fanni qo'shish"}</span>
          </button>
        </form>
      </div>

      {/* Subjects Grid */}
      <div className="space-y-3">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <span>Mavjud fanlar</span>
          <span className="bg-[#2C2C2E] text-xs font-semibold px-2.5 py-0.5 rounded-full text-[#8E8E93]">
            {subjects.length} ta
          </span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {subjects.map(subject => (
            <div 
              key={subject.id} 
              onClick={() => onSelectSubject(subject)}
              className="card p-5 bg-[#1C1C1E] border border-white/5 hover:border-white/10 rounded-3xl transition-all shadow-xl cursor-pointer active:scale-[0.98] group flex flex-col justify-between space-y-4"
            >
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 rounded-2xl bg-[#2C2C2E] border border-white/5 flex items-center justify-center text-2xl shadow">
                  {getEmoji(subject.name)}
                </div>

                <button 
                  onClick={(e) => handleDelete(e, subject.id)} 
                  className="w-8 h-8 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white flex items-center justify-center transition-colors"
                  title="Fanni o'chirish"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div>
                <h4 className="font-bold text-white text-base leading-snug group-hover:text-blue-400 transition-colors">
                  {subject.name}
                </h4>
                <p className="text-xs text-[#8E8E93] mt-1 flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5" />
                  <span>Kurslarni ko'rish uchun bosing</span>
                </p>
              </div>

              <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs font-semibold text-blue-400">
                <span>Kurslarni boshqarish</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          ))}

          {subjects.length === 0 && (
            <div className="col-span-full card p-8 text-center text-[#8E8E93] text-xs">
              Hozircha fanlar mavjud emas. Yuqoridagi forma orqali birinchi fanni qo'shing.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
