import React, { useState, useEffect } from 'react';
import { api } from '../api/supabase';
import { Plus, Trash2, FolderGit2, ChevronRight, ArrowLeft, Image as ImageIcon, X } from 'lucide-react';

export default function CourseBuilder({ user, subjectId, subjectName, onSelectCourse, onBack }) {
  const [courses, setCourses] = useState([]);
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState(0);
  const [imageUrl, setImageUrl] = useState('');
  const [loading, setLoading] = useState(false);

  // Modal state to upload/change cover photo on existing course
  const [editingCoursePhoto, setEditingCoursePhoto] = useState(null);
  const [editPhotoValue, setEditPhotoValue] = useState('');
  const [savingPhoto, setSavingPhoto] = useState(false);

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

    const newCourse = await api.createCourse(subjectId, title.trim(), price, imageUrl.trim() || null);
    setLoading(false);
    if (newCourse) {
      setCourses(prev => [...prev, { ...newCourse, lessons_count: 0 }]);
      setTitle('');
      setPrice(0);
      setImageUrl('');
    }
  };

  const handleSaveCoursePhoto = async () => {
    if (!editingCoursePhoto) return;
    setSavingPhoto(true);
    const res = await api.updateCourseMedia(editingCoursePhoto.id, editPhotoValue.trim() || null);
    setSavingPhoto(false);
    if (res?.success) {
      setCourses(prev =>
        prev.map(c => (c.id === editingCoursePhoto.id ? { ...c, image_url: res.image_url } : c))
      );
      setEditingCoursePhoto(null);
      setEditPhotoValue('');
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

        <form onSubmit={handleAdd} className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <input 
              type="text" 
              value={title} 
              onChange={e => setTitle(e.target.value)} 
              className="input-field flex-1" 
              placeholder="Kurs nomi (Masalan: Sitologiya yoki Genetika...)" 
              required 
            />
            <div className="w-full sm:w-44">
              <input 
                type="number" 
                value={price} 
                onChange={e => setPrice(parseInt(e.target.value, 10) || 0)} 
                className="input-field font-mono" 
                placeholder="Narxi (Neyron)" 
                min="0" 
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <input
              type="text"
              value={imageUrl}
              onChange={e => setImageUrl(e.target.value)}
              className="input-field flex-1 text-xs"
              placeholder="Kurs muqova rasmi URL (ixtiyoriy)"
            />
            <button 
              type="submit" 
              disabled={loading || !title.trim()} 
              className="btn-primary py-3 px-6 whitespace-nowrap active:scale-95 transition-all text-sm"
            >
              <Plus className="w-4 h-4" />
              <span>{loading ? "Qo'shilmoqda..." : "Kursni qo'shish"}</span>
            </button>
          </div>

          {imageUrl && (
            <div className="flex items-center gap-3 pt-1">
              <img src={imageUrl} alt="Preview" className="w-20 h-14 rounded-xl object-cover border border-white/10" />
              <button
                type="button"
                onClick={() => setImageUrl('')}
                className="text-xs text-red-400 hover:underline font-semibold"
              >
                Rasmni olib tashlash
              </button>
            </div>
          )}
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
              className="card overflow-hidden bg-[#1C1C1E] border border-white/5 hover:border-white/10 rounded-3xl transition-all shadow-xl cursor-pointer active:scale-[0.98] group flex flex-col justify-between"
            >
              {/* Course Cover Preview */}
              <div className="relative w-full aspect-[16/9] bg-[#2C2C2E] overflow-hidden">
                <img
                  src={course.image_url || 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?auto=format&fit=crop&w=600&q=80'}
                  alt={course.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                <div className="absolute top-3 left-3">
                  <span className="text-xs font-bold text-blue-300 bg-black/65 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10">
                    {course.lessons_count || 0} ta dars
                  </span>
                </div>

                <div className="absolute top-3 right-3 flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingCoursePhoto(course);
                      setEditPhotoValue(course.image_url || '');
                    }}
                    className="h-8 px-2.5 rounded-full bg-black/65 hover:bg-blue-600 backdrop-blur-md border border-white/15 text-white text-[11px] font-bold flex items-center gap-1 transition-colors"
                    title="Kurs rasmini yuklash"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>Rasm</span>
                  </button>
                  <button 
                    onClick={(e) => handleDelete(e, course.id)} 
                    className="w-8 h-8 rounded-full bg-black/65 hover:bg-red-500 backdrop-blur-md border border-red-500/30 text-red-400 hover:text-white flex items-center justify-center transition-colors"
                    title="Kursni o'chirish"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="p-4 flex flex-col justify-between flex-1 space-y-3">
                <div>
                  <h4 className="font-bold text-white text-base leading-snug group-hover:text-blue-400 transition-colors">
                    {course.title}
                  </h4>
                  <div className="flex items-center gap-2 mt-1.5 text-xs">
                    <span className={course.price > 0 ? "text-amber-400 font-bold" : "text-emerald-400 font-bold"}>
                      {course.price > 0 ? `${course.price.toLocaleString('ru-RU')} Neyron` : 'Bepul kurs'}
                    </span>
                  </div>
                </div>

                <div className="pt-2.5 border-t border-white/5 flex items-center justify-between text-xs font-semibold text-blue-400">
                  <span>Darslarni ko'rish</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
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

      {/* Edit Course Cover Photo Modal */}
      {editingCoursePhoto && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1C1C1E] border border-white/10 rounded-3xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">
                «{editingCoursePhoto.title}» muqova rasmi
              </h3>
              <button
                type="button"
                onClick={() => setEditingCoursePhoto(null)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/70"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="relative w-full aspect-[16/10] rounded-2xl overflow-hidden bg-[#2C2C2E] border border-white/10">
              <img
                src={editPhotoValue || 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?auto=format&fit=crop&w=600&q=80'}
                alt="Preview"
                className="w-full h-full object-cover"
              />
            </div>

            <div className="space-y-3">
              <input
                type="url"
                value={editPhotoValue.startsWith('data:') ? '' : editPhotoValue}
                onChange={e => setEditPhotoValue(e.target.value)}
                placeholder="Rasm havolasini kiriting (https://...)"
                className="input-field text-xs"
              />
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setEditingCoursePhoto(null)}
                className="flex-1 bg-[#2C2C2E] text-white py-3 rounded-2xl font-bold text-xs"
              >
                Bekor qilish
              </button>
              <button
                type="button"
                disabled={savingPhoto}
                onClick={handleSaveCoursePhoto}
                className="flex-1 bg-[#007AFF] hover:bg-blue-600 disabled:opacity-50 text-white py-3 rounded-2xl font-bold text-xs"
              >
                {savingPhoto ? 'Saqlanmoqda...' : 'Saqlash'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
