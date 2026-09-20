import React, { useState, useRef, useEffect } from 'react';
import { api } from '../api/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Plus, Trash, Sparkles, Save, Clock, Rewind } from 'lucide-react';

export default function VideoCheckpointStudio({ lessonId, videoUrl, onSave, onBack }) {
  const [checkpoints, setCheckpoints] = useState([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef(null);

  useEffect(() => {
    loadCheckpoints();
  }, [lessonId]);

  const loadCheckpoints = async () => {
    const data = await api.getVideoCheckpoints(lessonId);
    if (data) setCheckpoints(data);
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
      return parseInt(parts[0]) * 60 + parseInt(parts[1]);
    }
    return 0;
  };

  const handleTimelineClick = (e) => {
    if (!duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
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
    setCheckpoints([...checkpoints, newCp].sort((a, b) => a.trigger_time_sec - b.trigger_time_sec));
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

  const handleSave = async () => {
    const success = await api.saveVideoCheckpoints(lessonId, checkpoints);
    if (success) {
      alert("Muvaffaqiyatli saqlandi!");
      if (onSave) onSave();
    } else {
      alert("Xatolik yuz berdi");
    }
  };

  const handleAIAssist = () => {
    alert("AI tahlil yaratilmoqda...");
  };

  return (
    <div className="space-y-6 text-white" style={{ background: '#000000', minHeight: '100vh', padding: '24px' }}>
      <div className="flex justify-between items-center">
         <div className="flex gap-4 items-center">
            {onBack && <button onClick={onBack} className="text-[#8E8E93] hover:text-white transition-colors">← Orqaga</button>}
            <h2 className="text-xl font-bold">Video Checkpoint Studio</h2>
         </div>
         <button onClick={handleSave} className="flex items-center gap-2 bg-[#007AFF] hover:bg-blue-600 px-4 py-2 rounded-[20px] transition-colors font-medium">
            <Save size={18} /> Saqlash
         </button>
      </div>

      <div className="bg-[#1C1C1E] p-4 rounded-[20px] border border-white/10 shadow-lg">
         <video 
           ref={videoRef}
           src={videoUrl}
           className="w-full aspect-video bg-black rounded-lg mb-4 object-contain cursor-pointer"
           onTimeUpdate={(e) => setCurrentTime(e.target.currentTime)}
           onLoadedMetadata={(e) => setDuration(e.target.duration)}
           onClick={() => {
             if (isPlaying) videoRef.current.pause();
             else videoRef.current.play();
             setIsPlaying(!isPlaying);
           }}
         />
         
         <div className="flex items-center gap-4 mb-2">
            <button onClick={() => {
              if (isPlaying) videoRef.current.pause();
              else videoRef.current.play();
              setIsPlaying(!isPlaying);
            }} className="p-2 rounded-full bg-[#2C2C2E] hover:bg-[#3C3C3E] transition-colors">
              {isPlaying ? <Pause size={20} /> : <Play size={20} />}
            </button>
            <div className="text-sm font-mono text-[#8E8E93]">
               {formatTime(currentTime)} / {formatTime(duration)}
            </div>
         </div>

         <div 
           className="relative h-8 bg-[#2C2C2E] rounded-md cursor-pointer overflow-hidden"
           onClick={handleTimelineClick}
         >
           <div 
             className="absolute top-0 left-0 h-full bg-[#007AFF]/30 pointer-events-none transition-all duration-75"
             style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
           />
           
           {checkpoints.map((cp, idx) => {
             const leftPos = duration ? (cp.trigger_time_sec / duration) * 100 : 0;
             return (
               <div 
                 key={idx}
                 className="absolute top-0 bottom-0 w-1 bg-yellow-500 hover:w-2 hover:bg-yellow-400 transition-all z-10 shadow-[0_0_8px_rgba(234,179,8,0.8)] cursor-pointer"
                 style={{ left: `${leftPos}%` }}
                 title="Checkpoint"
                 onClick={(e) => {
                   e.stopPropagation();
                   if (videoRef.current) {
                     videoRef.current.currentTime = cp.trigger_time_sec;
                   }
                 }}
               />
             )
           })}
         </div>
         <p className="text-xs text-[#8E8E93] mt-2">Yangi checkpoint qo'shish uchun timeline'ga bosing.</p>
      </div>

      <div className="flex justify-end">
        <button onClick={handleAIAssist} className="flex items-center gap-2 bg-[#1C1C1E] border border-purple-500/30 hover:border-purple-500 hover:bg-purple-500/20 text-purple-400 px-4 py-2 rounded-[20px] transition-all shadow-[0_0_15px_rgba(147,51,234,0.1)]">
          <Sparkles size={18} /> ✨ AI Yordamida Tahlil Yaratish
        </button>
      </div>

      <div className="space-y-4">
         <h3 className="text-lg font-semibold border-b border-white/10 pb-2 text-white">Checkpoints ({checkpoints.length})</h3>
         
         <AnimatePresence>
         {checkpoints.map((cp, idx) => (
           <motion.div 
             key={cp.id || idx}
             initial={{ opacity: 0, y: 10 }}
             animate={{ opacity: 1, y: 0 }}
             exit={{ opacity: 0, x: -20 }}
             className="bg-[#1C1C1E] p-5 rounded-[20px] border border-white/10"
           >
             <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-1 space-y-5">
                   <div className="flex gap-4">
                      <div className="flex-1">
                        <label className="flex items-center gap-2 text-xs text-[#8E8E93] mb-1.5 uppercase font-medium tracking-wider">
                          <Clock size={14} /> Trigger Time
                        </label>
                        <input 
                          type="text" 
                          value={formatTime(cp.trigger_time_sec)}
                          onChange={(e) => updateCheckpoint(idx, 'trigger_time_sec', parseTime(e.target.value))}
                          className="w-full bg-[#2C2C2E] border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[#007AFF] font-mono transition-colors"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="flex items-center gap-2 text-xs text-[#8E8E93] mb-1.5 uppercase font-medium tracking-wider">
                          <Rewind size={14} /> Rewind To
                        </label>
                        <input 
                          type="text" 
                          value={formatTime(cp.rewind_to_sec)}
                          onChange={(e) => updateCheckpoint(idx, 'rewind_to_sec', parseTime(e.target.value))}
                          className="w-full bg-[#2C2C2E] border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-[#007AFF] font-mono transition-colors"
                        />
                      </div>
                   </div>

                   <div>
                      <label className="block text-xs text-[#8E8E93] mb-1.5 uppercase font-medium tracking-wider">Savol matni</label>
                      <textarea 
                        value={cp.question_text}
                        onChange={(e) => updateCheckpoint(idx, 'question_text', e.target.value)}
                        className="w-full bg-[#2C2C2E] border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-[#007AFF] min-h-[90px] transition-colors resize-y"
                        placeholder="Ushbu qismda nima deyilgan edi?"
                      />
                   </div>

                   <div className="space-y-3">
                      <label className="block text-xs text-[#8E8E93] uppercase font-medium tracking-wider">Variantlar (To'g'ri javobni belgilang)</label>
                      {cp.options.map((opt, optIdx) => (
                        <div key={optIdx} className="flex items-center gap-3">
                           <input 
                             type="radio" 
                             name={`correct-${idx}`} 
                             checked={cp.correct_option_index === optIdx}
                             onChange={() => updateCheckpoint(idx, 'correct_option_index', optIdx)}
                             className="w-5 h-5 accent-[#007AFF] cursor-pointer"
                           />
                           <input 
                             type="text"
                             value={opt}
                             onChange={(e) => updateOption(idx, optIdx, e.target.value)}
                             className="flex-1 bg-[#2C2C2E] border border-white/10 rounded-xl px-4 py-2 text-white outline-none focus:border-[#007AFF] transition-colors"
                             placeholder={`${['A', 'B', 'C', 'D'][optIdx]} varianti...`}
                           />
                        </div>
                      ))}
                   </div>
                </div>
                
                <div className="flex items-start">
                   <button 
                     onClick={() => removeCheckpoint(idx)}
                     className="p-3 text-red-400 hover:text-white hover:bg-red-500 rounded-xl transition-all"
                     title="O'chirish"
                   >
                     <Trash size={20} />
                   </button>
                </div>
             </div>
           </motion.div>
         ))}
         </AnimatePresence>
         
         <button 
           onClick={() => addCheckpoint(currentTime)} 
           className="w-full py-4 border-2 border-dashed border-[#2C2C2E] hover:border-[#007AFF]/50 text-[#8E8E93] hover:text-[#007AFF] rounded-[20px] transition-all flex justify-center items-center gap-2 font-medium bg-[#1C1C1E]/50 hover:bg-[#1C1C1E]"
         >
           <Plus size={20} /> Yangi checkpoint qo'shish
         </button>
      </div>
    </div>
  );
}
