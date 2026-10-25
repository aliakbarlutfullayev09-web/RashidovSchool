import React, { useState, useEffect } from 'react';
import { api } from '../api/supabase';
import { Plus, Trash2, FolderGit2, BookOpen, ChevronRight, ArrowLeft } from 'lucide-react';

export default function CourseBuilder({ user, subjectId, subjectName, onSelectCourse, onBack }) {
  const [courses, setCourses] = useState([]);
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCourses();
  }, [subjectId]);

  const loadCourses = async () => {
    const data = await api.getCourses(subjectId);
    setCourses(data);
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);

    const newCourse = await api.createCourse(subjectId, title.trim(), price);
    setLoading(false);
    if (newCourse) {
      setCourses(prev => [...prev, { ...newCourse, lessons_count: 0 }]);
      setTitle('');
      setPrice(0);
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (window.confirm("Ushbu kursni va unga tegishli barcha darslarni o'chirishni xohlaysizmi?")) {
      const success = await api.deleteCourse(id);
      if (success) {
        setCourses(prev => prev.filter(c => c.id !== id));
      }
    }
  };

  return (
    <div className="space-y-6 text-white pb-24">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs font-semibold text-[#8E8E93] bg-[#1C1C1E] p-3 px-4 rounded-2xl border border-white/5 w-fit">
        {onBack && (
          <button onClick={onBack} className="hover:text-white transition-colors flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Fanlar
          </button>
        )}
        <span>/</span>
        <span className="text-white font-bold">{subjectName}</span>
      </div>

      {/* Add Course Card */}
      <div className="card p-6 bg-[#1C1C1E] border border-white/5 shadow-2xl">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-2xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <FolderGit2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Yangi kurs qo'shish</h2>
            <p className="text-xs text-[#8E8E93]">{subjectName} fani bo'yicha o'quv moduli</p>
          </div>
        </div>

        <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-3">
          <input 
            type="text" 
            value={title} 
            onChange={e => setTitle(e.target.value)} 
            className="input-field flex-1" 
            placeholder="Kurs nomi (Masalan: Sitologiya yoki Genetika...)" 
            required 
          />
          <div className="w-full sm:w-48">
            <input 
              type="number" 
              value={price} 
              onChange={e => setPrice(parseInt(e.target.value, 10) || 0)} 
              className="input-field font-mono" 
              placeholder="Narxi (Neyron)" 
              min="0" 
            />
          </div>
          <button 
            type="submit" 
            disabled={loading || !title.trim()} 
            className="btn-primary py-3 px-6 whitespace-nowrap active:scale-95 transition-all text-sm"
          >
            <Plus className="w-4 h-4" />
            <span>{loading ? "Qo'shilmoqda..." : "Kursni qo'shish"}</span>
          </button>
        </form>
      </div>

      {/* Courses Grid */}
      <div className="space-y-3">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <span>Mavjud kurslar</span>
          <span className="bg-[#2C2C2E] text-xs font-semibold px-2.5 py-0.5 rounded-full text-[#8E8E93]">
            {courses.length} ta
          </span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.map(course => (
            <div 
              key={course.id} 
              onClick={() => onSelectCourse(course)}
              className="card p-5 bg-[#1C1C1E] border border-white/5 hover:border-white/10 rounded-3xl transition-all shadow-xl cursor-pointer active:scale-[0.98] group flex flex-col justify-between space-y-4"
            >
              <div className="flex items-start justify-between">
                <span className="text-xs font-bold text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-full border border-blue-500/20">
                  {course.lessons_count || 0} ta dars
                </span>

                <button 
                  onClick={(e) => handleDelete(e, course.id)} 
                  className="w-8 h-8 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white flex items-center justify-center transition-colors"
                  title="Kursni o'chirish"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div>
                <h4 className="font-bold text-white text-base leading-snug group-hover:text-blue-400 transition-colors">
                  {course.title}
                </h4>
                <div className="flex items-center gap-2 mt-2 text-xs">
                  <span className={course.price > 0 ? "text-amber-400 font-bold" : "text-emerald-400 font-bold"}>
                    {course.price > 0 ? `${course.price.toLocaleString('ru-RU')} Neyron` : 'Bepul kurs'}
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs font-semibold text-blue-400">
                <span>Darslarni ko'rish</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          ))}

          {courses.length === 0 && (
            <div className="col-span-full card p-8 text-center text-[#8E8E93] text-xs">
              Ushbu fanda hozircha kurslar mavjud emas. Yuqoridagi forma orqali birinchi kursni yarating.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
