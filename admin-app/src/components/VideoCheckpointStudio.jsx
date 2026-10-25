import React, { useState, useRef, useEffect } from 'react';
import { api } from '../api/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, Pause, Plus, Trash2, Sparkles, Save, Clock, Rewind, FastForward, 
  Maximize, CheckCircle2, ArrowLeft, HelpCircle 
} from 'lucide-react';

export default function VideoCheckpointStudio({ lessonId, videoUrl, onSave, onBack }) {
  const [checkpoints, setCheckpoints] = useState([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const videoRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    loadCheckpoints();
  }, [lessonId]);

  const loadCheckpoints = async () => {
    const data = await api.getVideoCheckpoints(lessonId);
    if (data && data.length > 0) {
      setCheckpoints(data);
    }
  };

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '00:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const parseTime = (str) => {
    if (!str) return 0;
    const parts = str.split(':');
    if (parts.length === 2) {
      return (parseInt(parts[0], 10) || 0) * 60 + (parseInt(parts[1], 10) || 0);
    }
    return parseInt(str, 10) || 0;
  };

  const handleTimelineClick = (e) => {
    if (!duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const time = Math.floor(pos * duration);
    
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
    setCurrentTime(time);
    addCheckpoint(time);
  };

  const addCheckpoint = (time = currentTime) => {
    const newCp = {
      id: Date.now().toString(),
      lesson_id: lessonId,
      trigger_time_sec: Math.floor(time),
      rewind_to_sec: Math.max(0, Math.floor(time) - 10),
      question_text: '',
      options: ['', '', '', ''],
      correct_option_index: 0
    };
    setCheckpoints(prev => [...prev, newCp].sort((a, b) => a.trigger_time_sec - b.trigger_time_sec));
  };

  const updateCheckpoint = (index, field, value) => {
    const newCps = [...checkpoints];
    newCps[index][field] = value;
    setCheckpoints(newCps);
  };

  const updateOption = (cpIndex, optIndex, value) => {
    const newCps = [...checkpoints];
    newCps[cpIndex].options[optIndex] = value;
    setCheckpoints(newCps);
  };

  const removeCheckpoint = (index) => {
    setCheckpoints(checkpoints.filter((_, i) => i !== index));
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const seekRelative = (delta) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + delta));
  };

  const toggleFullscreen = () => {
    const video = videoRef.current;
    const container = containerRef.current;
    if (!video) return;

    // iOS Safari / WebKit enter fullscreen
    if (video.webkitEnterFullscreen) {
      video.webkitEnterFullscreen();
      return;
    }

    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
      if (container?.requestFullscreen) {
        container.requestFullscreen();
      } else if (container?.webkitRequestFullscreen) {
        container.webkitRequestFullscreen();
      } else if (video.requestFullscreen) {
        video.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      }
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSavedSuccess(false);
    const success = await api.saveVideoCheckpoints(lessonId, checkpoints);
    setSaving(false);
    if (success) {
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
      if (onSave) onSave();
    } else {
      alert("Xatolik: Checkpointlarni saqlab bo'lmadi.");
    }
  };

  return (
    <div className="space-y-6 text-white pb-24 max-w-7xl mx-auto">
      
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#1C1C1E] border border-white/5 p-4 rounded-3xl shadow-lg">
        <div className="flex items-center gap-3">
          {onBack && (
            <button 
              onClick={onBack} 
              className="w-10 h-10 rounded-full bg-[#2C2C2E] border border-white/5 hover:bg-[#3A3A3C] flex items-center justify-center text-white active:scale-95 transition-all"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <h2 className="text-lg font-bold text-white leading-tight">Video Checkpoint Studio</h2>
            <p className="text-xs text-[#8E8E93]">Video darsga interaktiv stop-test savollarini joylashtirish</p>
          </div>
        </div>

        <button 
          onClick={handleSave} 
          disabled={saving}
          className="btn-primary py-2.5 px-5 shadow-lg shadow-blue-500/25 active:scale-95 transition-all"
        >
          {savedSuccess ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-300" />
              <span>Saqlandi!</span>
            </>
          ) : saving ? (
            <span>Saqlanmoqda...</span>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Saqlash ({checkpoints.length})</span>
            </>
          )}
        </button>
      </div>

      {/* Main Studio Grid: 2-Column on Desktop, Stacked on Mobile/Tablet */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left / Top: Interactive Player & Timeline (Sticky on Desktop) */}
        <div className="lg:col-span-7 lg:sticky lg:top-4 space-y-4">
          <div 
            ref={containerRef}
            className="card p-4 bg-[#1C1C1E] shadow-2xl relative overflow-hidden"
          >
            {/* 16:9 Video Box (Responsive on PC, Tablet, Mobile & Orientations) */}
            <div className="relative w-full aspect-video max-h-[60vh] bg-black rounded-2xl overflow-hidden border border-white/5 flex items-center justify-center">
              <video 
                ref={videoRef}
                src={videoUrl || "https://www.w3schools.com/html/mov_bbb.mp4"}
                className="w-full h-full object-contain max-h-[60vh] cursor-pointer"
                playsInline
                webkit-playsinline="true"
                x-webkit-airplay="allow"
                onTimeUpdate={(e) => setCurrentTime(e.target.currentTime)}
                onLoadedMetadata={(e) => setDuration(e.target.duration || 0)}
                onClick={togglePlay}
              />
            </div>

            {/* Custom Playback Controls */}
            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center gap-3">
                <button 
                  onClick={togglePlay}
                  className="w-11 h-11 rounded-full bg-[#007AFF] text-white flex items-center justify-center active:scale-95 transition-transform shadow-lg shadow-blue-500/20"
                >
                  {isPlaying ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white ml-0.5" />}
                </button>

                <button 
                  onClick={() => seekRelative(-5)}
                  className="w-9 h-9 rounded-full bg-[#2C2C2E] border border-white/5 hover:bg-[#3A3A3C] flex items-center justify-center text-white/80 active:scale-95 transition-transform"
                  title="-5 soniya"
                >
                  <Rewind className="w-4 h-4" />
                </button>

                <button 
                  onClick={() => seekRelative(5)}
                  className="w-9 h-9 rounded-full bg-[#2C2C2E] border border-white/5 hover:bg-[#3A3A3C] flex items-center justify-center text-white/80 active:scale-95 transition-transform"
                  title="+5 soniya"
                >
                  <FastForward className="w-4 h-4" />
                </button>

                <span className="text-xs font-mono text-[#8E8E93] bg-[#2C2C2E] px-2.5 py-1.5 rounded-lg border border-white/5">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>

              <button 
                onClick={toggleFullscreen}
                className="w-9 h-9 rounded-full bg-[#2C2C2E] border border-white/5 hover:bg-[#3A3A3C] flex items-center justify-center text-white/80 active:scale-95 transition-transform"
                title="To'liq ekran"
              >
                <Maximize className="w-4 h-4" />
              </button>
            </div>

            {/* Interactive Timeline with Touch Scrubbing (Min 44px touch height) */}
            <div className="mt-4">
              <div 
                className="relative h-9 bg-[#2C2C2E] rounded-xl cursor-pointer overflow-hidden border border-white/5 flex items-center select-none"
                onClick={handleTimelineClick}
              >
                {/* Active progress fill */}
                <div 
                  className="absolute top-0 left-0 h-full bg-[#007AFF]/35 pointer-events-none transition-all duration-75"
                  style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
                />

                {/* Checkpoint marker lines */}
                {checkpoints.map((cp, idx) => {
                  const leftPos = duration ? (cp.trigger_time_sec / duration) * 100 : 0;
                  return (
                    <div 
                      key={idx}
                      className="absolute top-0 bottom-0 w-2 bg-amber-400 hover:w-3 hover:bg-yellow-300 transition-all z-10 shadow-[0_0_10px_rgba(251,191,36,0.9)] cursor-pointer"
                      style={{ left: `${leftPos}%` }}
                      title={`Checkpoint #${idx + 1}: ${formatTime(cp.trigger_time_sec)}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (videoRef.current) {
                          videoRef.current.currentTime = cp.trigger_time_sec;
                        }
                      }}
                    />
                  );
                })}
              </div>

              <div className="flex items-center justify-between text-[11px] text-[#8E8E93] mt-2 px-1">
                <span>⏱ Timeline ustiga bosib yangi savol qo'shing</span>
                <span className="text-amber-400 font-bold">{checkpoints.length} ta savol</span>
              </div>
            </div>

          </div>
        </div>

        {/* Right / Bottom: Checkpoints Editor List */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>Savollar ro'yxati</span>
              <span className="bg-[#2C2C2E] text-xs font-semibold px-2 py-0.5 rounded-full text-[#8E8E93]">
                {checkpoints.length}
              </span>
            </h3>

            <button 
              onClick={() => addCheckpoint(currentTime)} 
              className="bg-[#007AFF]/10 border border-[#007AFF]/30 hover:bg-[#007AFF]/20 text-[#007AFF] text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 active:scale-95 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Qo'shish</span>
            </button>
          </div>

          <div className="space-y-4">
            <AnimatePresence>
              {checkpoints.map((cp, idx) => (
                <motion.div 
                  key={cp.id || idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="card p-5 bg-[#1C1C1E] border border-white/5 rounded-3xl shadow-xl space-y-4 relative"
                >
                  {/* Card Header */}
                  <div className="flex items-center justify-between border-b border-white/5 pb-3">
                    <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full">
                      #{idx + 1}-Stop-Test
                    </span>

                    <button 
                      onClick={() => removeCheckpoint(idx)}
                      className="w-8 h-8 rounded-full bg-red-500/10 border border-red-500/20 hover:bg-red-500 hover:text-white text-red-400 flex items-center justify-center transition-colors"
                      title="O'chirish"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Timing Inputs */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="flex items-center gap-1.5 text-[11px] text-[#8E8E93] mb-1 font-semibold uppercase tracking-wider">
                        <Clock className="w-3.5 h-3.5 text-blue-400" />
                        <span>To'xtash vaqti</span>
                      </label>
                      <input 
                        type="text" 
                        value={formatTime(cp.trigger_time_sec)}
                        onChange={(e) => updateCheckpoint(idx, 'trigger_time_sec', parseTime(e.target.value))}
                        className="input-field py-2 text-center font-mono font-bold"
                        placeholder="01:30"
                      />
                    </div>

                    <div>
                      <label className="flex items-center gap-1.5 text-[11px] text-[#8E8E93] mb-1 font-semibold uppercase tracking-wider">
                        <Rewind className="w-3.5 h-3.5 text-amber-400" />
                        <span>Qaytish vaqti</span>
                      </label>
                      <input 
                        type="text" 
                        value={formatTime(cp.rewind_to_sec || cp.rewind_time_sec)}
                        onChange={(e) => {
                          const val = parseTime(e.target.value);
                          updateCheckpoint(idx, 'rewind_to_sec', val);
                          updateCheckpoint(idx, 'rewind_time_sec', val);
                        }}
                        className="input-field py-2 text-center font-mono font-bold"
                        placeholder="01:10"
                      />
                    </div>
                  </div>

                  {/* Question Text */}
                  <div>
                    <label className="block text-[11px] text-[#8E8E93] mb-1 font-semibold uppercase tracking-wider">
                      Savol matni
                    </label>
                    <textarea 
                      value={cp.question_text || cp.question || ''}
                      onChange={(e) => {
                        updateCheckpoint(idx, 'question_text', e.target.value);
                        updateCheckpoint(idx, 'question', e.target.value);
                      }}
                      className="input-field min-h-[70px] resize-y"
                      placeholder="Mavzu bo'yicha savolni yozing..."
                    />
                  </div>

                  {/* 4 Options */}
                  <div className="space-y-2.5">
                    <label className="block text-[11px] text-[#8E8E93] font-semibold uppercase tracking-wider">
                      Variantlar (To'g'ri javobni belgilang)
                    </label>
                    {cp.options.map((opt, optIdx) => (
                      <div key={optIdx} className="flex items-center gap-2">
                        <input 
                          type="radio" 
                          name={`correct-${idx}`} 
                          checked={(cp.correct_option_index ?? cp.correct_option) === optIdx}
                          onChange={() => {
                            updateCheckpoint(idx, 'correct_option_index', optIdx);
                            updateCheckpoint(idx, 'correct_option', optIdx);
                          }}
                          className="w-4 h-4 accent-[#007AFF] cursor-pointer flex-shrink-0"
                        />
                        <input 
                          type="text"
                          value={opt}
                          onChange={(e) => updateOption(idx, optIdx, e.target.value)}
                          className="input-field py-2 text-xs flex-1"
                          placeholder={`${['A', 'B', 'C', 'D'][optIdx]} varianti...`}
                        />
                      </div>
                    ))}
                  </div>

                </motion.div>
              ))}
            </AnimatePresence>

            {checkpoints.length === 0 && (
              <div className="card p-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-blue-500/10 text-[#007AFF] flex items-center justify-center mx-auto text-xl">
                  <HelpCircle className="w-6 h-6" />
                </div>
                <h4 className="text-white font-bold text-sm">Hozircha savollar yo'q</h4>
                <p className="text-xs text-[#8E8E93] max-w-xs mx-auto">
                  Videoni ko'rish davomida timeline ustiga bosing yoki yangi checkpoint qo'shish tugmasini bosing.
                </p>
                <button 
                  onClick={() => addCheckpoint(currentTime)} 
                  className="btn-primary text-xs py-2 px-4"
                >
                  <Plus className="w-4 h-4" />
                  <span>Birinchi savolni qo'shish</span>
                </button>
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
