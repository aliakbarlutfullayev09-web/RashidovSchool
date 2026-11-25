import React, { useState, useEffect } from 'react';
import { api } from '../api/supabase';
import { compressImageFileToDataUrl, formatDurationFromSeconds } from '../utils/mediaUtils';
import VideoCheckpointStudio from './VideoCheckpointStudio';
import { 
  Plus, Trash2, Video, Check, Upload,
  Image as ImageIcon, ArrowLeft, X 
} from 'lucide-react';

export default function LessonBuilder({ courseId, courseName, onSelectLesson, onBack }) {
  const [lessons, setLessons] = useState([]);
  const [title, setTitle] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [testQuestionCount, setTestQuestionCount] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [duration, setDuration] = useState('');
  const [isFree, setIsFree] = useState(false);
  const [loading, setLoading] = useState(false);

  // Checkpoint Studio state
  const [editingCheckpointLesson, setEditingCheckpointLesson] = useState(null);

  // Edit media/duration modal state for existing lessons
  const [editingMediaLesson, setEditingMediaLesson] = useState(null);
  const [editThumb, setEditThumb] = useState('');
  const [editDuration, setEditDuration] = useState('');
  const [savingMedia, setSavingMedia] = useState(false);

  useEffect(() => {
    loadLessons();
  }, [courseId]);

  const loadLessons = async () => {
    const data = await api.getLessons(courseId);
    setLessons(data);
  };

  const handleFilePick = async (file, setter) => {
    if (!file) return;
    try {
      const dataUrl = await compressImageFileToDataUrl(file, 720, 0.8);
      setter(dataUrl);
    } catch (err) {
      alert(err.message || "Rasmni yuklashda xatolik");
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);

    const qCount = testQuestionCount ? parseInt(testQuestionCount, 10) : null;
    const newLesson = await api.createLesson(
      courseId, 
      title.trim(), 
      videoUrl.trim() || null, 
      qCount, 
      thumbnailUrl.trim() || null, 
      duration.trim() || null, 
      isFree
    );
    
    setLoading(false);
    if (newLesson) {
      setLessons(prev => [...prev, newLesson]);
      setTitle('');
      setVideoUrl('');
      setTestQuestionCount('');
      setThumbnailUrl('');
      setDuration('');
      setIsFree(false);
    }
  };

  const handleSaveLessonMedia = async () => {
    if (!editingMediaLesson) return;
    setSavingMedia(true);
    const res = await api.updateLessonMedia(editingMediaLesson.id, {
      thumbnail_url: editThumb.trim() || null,
      duration: editDuration.trim() || null
    });
    setSavingMedia(false);
    if (res?.success) {
      setLessons(prev =>
        prev.map(l =>
          l.id === editingMediaLesson.id
            ? { ...l, thumbnail_url: res.thumbnail_url, duration: res.duration }
            : l
        )
      );
      setEditingMediaLesson(null);
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (window.confirm("Ushbu darsni o'chirishni xohlaysizmi?")) {
      const success = await api.deleteLesson(id);
      if (success) {
        setLessons(prev => prev.filter(l => l.id !== id));
      }
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
    <div className="space-y-6 text-white pb-24">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs font-semibold text-[#8E8E93] bg-[#1C1C1E] p-3 px-4 rounded-2xl border border-white/5 w-fit">
        <button onClick={onBack} className="hover:text-white transition-colors flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" /> Kurslar
        </button>
        <span>/</span>
        <span className="text-white font-bold">{courseName}</span>
      </div>

      {/* Add New Lesson Card with Live Video & Thumbnail Preview */}
      <div className="card p-6 bg-[#1C1C1E] border border-white/5 shadow-2xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <Video className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Yangi dars qo'shish</h2>
            <p className="text-xs text-[#8E8E93]">Video havola, muqova va dars sozlamalari</p>
          </div>
        </div>

        <form onSubmit={handleAdd} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Left Inputs */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#8E8E93] mb-1.5 uppercase tracking-wider">
                  Dars nomi *
                </label>
                <input 
                  type="text" 
                  value={title} 
                  onChange={e => setTitle(e.target.value)} 
                  className="input-field" 
                  placeholder="Masalan: 1-Dars: Sitologiya asoslari" 
                  required 
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#8E8E93] mb-1.5 uppercase tracking-wider">
                  Video havola (MP4 yoki Cloudflare R2 / Supabase)
                </label>
                <input 
                  type="url" 
                  value={videoUrl} 
                  onChange={e => setVideoUrl(e.target.value)} 
                  className="input-field" 
                  placeholder="https://.../video.mp4" 
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#8E8E93] mb-1.5 uppercase tracking-wider">
                  Muqova rasmi (URL yoki fayl yuklash)
                </label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={thumbnailUrl.startsWith('data:') ? '' : thumbnailUrl} 
                    onChange={e => setThumbnailUrl(e.target.value)} 
                    className="input-field flex-1" 
                    placeholder={thumbnailUrl.startsWith('data:') ? 'Rasm fayldan yuklandi' : 'https://images.unsplash.com/...'} 
                  />
                  <label className="cursor-pointer bg-[#2C2C2E] hover:bg-[#3A3A3C] border border-white/10 rounded-2xl px-3.5 text-xs font-bold text-white flex items-center justify-center gap-1.5 shrink-0 transition-colors">
                    <Upload className="w-4 h-4 text-blue-400" />
                    <span>Yuklash</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => handleFilePick(e.target.files?.[0], setThumbnailUrl)}
                    />
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#8E8E93] mb-1.5 uppercase tracking-wider">
                    Davomiyligi (avto)
                  </label>
                  <input 
                    type="text" 
                    value={duration} 
                    onChange={e => setDuration(e.target.value)} 
                    className="input-field font-mono" 
                    placeholder="Masalan: 12:35" 
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#8E8E93] mb-1.5 uppercase tracking-wider">
                    Test savollari soni
                  </label>
                  <input 
                    type="number" 
                    value={testQuestionCount} 
                    onChange={e => setTestQuestionCount(e.target.value)} 
                    className="input-field" 
                    placeholder="10" 
                  />
                </div>
              </div>

              {/* Free Lesson Checkbox */}
              <label className="flex items-center gap-3 p-3 rounded-2xl bg-[#2C2C2E] border border-white/5 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={isFree} 
                  onChange={e => setIsFree(e.target.checked)} 
                  className="w-4 h-4 accent-[#007AFF] rounded" 
                />
                <span className="text-xs font-bold text-white">
                  Bepul dars (Kanalga a'zo bo'lmasdan ochiq)
                </span>
              </label>
            </div>

            {/* Right: Live 16:9 Video & Thumbnail Preview */}
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-[#8E8E93] uppercase tracking-wider">
                Jonli ko'rinish (Live 16:9 Preview)
              </label>

              <div className="relative w-full aspect-video max-h-[50vh] rounded-3xl overflow-hidden bg-black border border-white/10 flex items-center justify-center shadow-xl">
                {videoUrl ? (
                  <video 
                    src={videoUrl} 
                    controls 
                    preload="metadata"
                    onLoadedMetadata={(e) => {
                      const detected = formatDurationFromSeconds(e.currentTarget.duration);
                      if (detected && !duration) {
                        setDuration(detected);
                      }
                    }}
                    className="w-full h-full object-contain max-h-[50vh]" 
                    playsInline
                    webkit-playsinline="true"
                    x-webkit-airplay="allow"
                    poster={thumbnailUrl || undefined}
                  />
                ) : thumbnailUrl ? (
                  <img 
                    src={thumbnailUrl} 
                    alt="Preview" 
                    className="w-full h-full object-cover" 
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-center p-4">
                    <Video className="w-10 h-10 text-white/20 mb-2" />
                    <span className="text-xs font-bold text-[#8E8E93]">Video havola kiritilmagan</span>
                    <span className="text-[10px] text-[#8E8E93]/60">16:9 formatda avtomatik moslashadi</span>
                  </div>
                )}
              </div>

              {videoUrl && (
                <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 font-semibold flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Video yuklandi {duration ? `(${duration})` : ''} va ijroga tayyor</span>
                </div>
              )}
            </div>
          </div>

          <div className="pt-2">
            <button 
              type="submit" 
              disabled={loading || !title.trim()} 
              className="btn-primary py-3 px-6 text-sm"
            >
              <Plus className="w-4 h-4" />
              <span>{loading ? "Saqlanmoqda..." : "Darsni saqlash"}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Existing Lessons List */}
      <div className="space-y-3">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <span>Kurs darslari</span>
          <span className="bg-[#2C2C2E] text-xs font-semibold px-2.5 py-0.5 rounded-full text-[#8E8E93]">
            {lessons.length} ta
          </span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {lessons.map((lesson, idx) => (
            <div 
              key={lesson.id || idx}
              className="card p-4 bg-[#1C1C1E] border border-white/5 hover:border-white/10 rounded-3xl transition-all shadow-xl flex flex-col justify-between space-y-4"
            >
              <div className="flex gap-4">
                {/* Thumbnail */}
                <div className="relative w-28 aspect-video rounded-xl overflow-hidden bg-[#2C2C2E] border border-white/5 flex-shrink-0">
                  {lesson.thumbnail_url ? (
                    <img src={lesson.thumbnail_url} alt={lesson.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-lg">🧬</div>
                  )}
                  {lesson.duration && (
                    <div className="absolute bottom-1 right-1 bg-black/80 text-white text-[9px] px-1 rounded font-mono">
                      {lesson.duration}
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md">
                      #{idx + 1}
                    </span>
                    {lesson.is_free && (
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                        Bepul
                      </span>
                    )}
                  </div>
                  <h4 className="font-bold text-white text-sm truncate leading-snug">
                    {lesson.title}
                  </h4>
                  <p className="text-[11px] text-[#8E8E93] mt-1">
                    {lesson.questions_count || lesson.test_question_count || 0} ta savol
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-white/5 gap-2 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingMediaLesson(lesson);
                      setEditThumb(lesson.thumbnail_url || '');
                      setEditDuration(lesson.duration || '');
                    }}
                    className="bg-[#2C2C2E] hover:bg-white/10 border border-white/5 text-xs font-semibold py-1.5 px-3 rounded-xl transition-all flex items-center gap-1.5"
                  >
                    <ImageIcon className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Rasm</span>
                  </button>

                  <button 
                    onClick={() => setEditingCheckpointLesson(lesson)}
                    className="bg-[#2C2C2E] hover:bg-amber-500/20 hover:text-amber-300 border border-white/5 text-xs font-semibold py-1.5 px-3 rounded-xl transition-all flex items-center gap-1.5"
                  >
                    <span>⏱ Stop-Testlar</span>
                  </button>

                  <button 
                    onClick={() => onSelectLesson(lesson)}
                    className="bg-[#007AFF]/10 hover:bg-[#007AFF]/20 text-[#007AFF] border border-[#007AFF]/30 text-xs font-semibold py-1.5 px-3 rounded-xl transition-all flex items-center gap-1.5"
                  >
                    <span>📝 Test savollari</span>
                  </button>
                </div>

                <button 
                  onClick={(e) => handleDelete(e, lesson.id)}
                  className="w-8 h-8 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white flex items-center justify-center transition-colors"
                  title="O'chirish"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}

          {lessons.length === 0 && (
            <div className="col-span-full card p-8 text-center text-[#8E8E93] text-xs">
              Ushbu kursda hozircha darslar mavjud emas. Yuqoridagi forma orqali yangi dars qo'shing.
            </div>
          )}
        </div>
      </div>

      {/* Edit Lesson Photo / Duration Modal */}
      {editingMediaLesson && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1C1C1E] border border-white/10 rounded-3xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white truncate pr-2">
                {editingMediaLesson.title}
              </h3>
              <button
                type="button"
                onClick={() => setEditingMediaLesson(null)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/70 shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-[#2C2C2E] border border-white/10">
              {editThumb ? (
                <img src={editThumb} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl">🧬</div>
              )}
              {editingMediaLesson.video_url && !editDuration && (
                <video
                  src={editingMediaLesson.video_url}
                  preload="metadata"
                  className="hidden"
                  onLoadedMetadata={(e) => {
                    const detected = formatDurationFromSeconds(e.currentTarget.duration);
                    if (detected) setEditDuration(detected);
                  }}
                />
              )}
            </div>

            <div className="space-y-3">
              <label className="w-full cursor-pointer bg-[#2C2C2E] hover:bg-[#3A3A3C] border border-white/10 rounded-2xl py-3 px-4 text-xs font-bold text-white flex items-center justify-center gap-2 transition-colors">
                <Upload className="w-4 h-4 text-blue-400" />
                <span>Qurilmadan muqova tanlash</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => handleFilePick(e.target.files?.[0], setEditThumb)}
                />
              </label>

              <input
                type="url"
                value={editThumb.startsWith('data:') ? '' : editThumb}
                onChange={e => setEditThumb(e.target.value)}
                placeholder="Yoki rasm havolasi (https://...)"
                className="input-field text-xs"
              />

              <div>
                <label className="block text-[11px] font-semibold text-[#8E8E93] mb-1">
                  Video davomiyligi (masalan: 12:35)
                </label>
                <input
                  type="text"
                  value={editDuration}
                  onChange={e => setEditDuration(e.target.value)}
                  placeholder="Masalan: 12:35"
                  className="input-field text-xs font-mono"
                />
              </div>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setEditingMediaLesson(null)}
                className="flex-1 bg-[#2C2C2E] text-white py-3 rounded-2xl font-bold text-xs"
              >
                Bekor qilish
              </button>
              <button
                type="button"
                disabled={savingMedia}
                onClick={handleSaveLessonMedia}
                className="flex-1 bg-[#007AFF] hover:bg-blue-600 disabled:opacity-50 text-white py-3 rounded-2xl font-bold text-xs"
              >
                {savingMedia ? 'Saqlanmoqda...' : 'Saqlash'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
