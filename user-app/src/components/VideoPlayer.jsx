import React, { useState, useRef, useEffect } from 'react';
import { 
  Play, Pause, RotateCcw, Volume2, VolumeX, Maximize, ArrowLeft, 
  Sparkles, BookOpen, ChevronDown, ChevronUp, Download, Star, FileText, CheckCircle2 
} from 'lucide-react';
import CheckpointModal from './CheckpointModal';
import { formatTime } from '../utils/formatters';
import { useHaptic } from '../hooks/useHaptic';

const SAMPLE_GLOSSARY_TERMS = [
  { triggerTime: 4, term: "Ribosoma", definition: "Hujayrada oqsil biosintezini amalga oshiruvchi membranasiz kichik organoid." },
  { triggerTime: 12, term: "Polipeptid zanjiri", definition: "Peptid bog'lari orqali ketma-ket birikkan aminokislotalar polimeri." }
];

export default function VideoPlayer({ 
  videoUrl, 
  lessonId, 
  lessonTitle = "Biologiya darsi", 
  checkpoints = [], 
  onStartQuiz, 
  onBack 
}) {
  const videoRef = useRef(null);
  const { impactLight, impactMedium, notificationSuccess } = useHaptic();

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isAudioOnly, setIsAudioOnly] = useState(false);
  
  // Scrubber lock state
  const [maxWatchedSeconds, setMaxWatchedSeconds] = useState(0);
  const [isFirstWatch, setIsFirstWatch] = useState(true);

  // Checkpoints
  const [answeredCheckpoints, setAnsweredCheckpoints] = useState({});
  const [activeCheckpoint, setActiveCheckpoint] = useState(null);

  // Glossary typewriter state
  const [activeNote, setActiveNote] = useState(null);
  const [typewriterText, setTypewriterText] = useState('');
  const [encounteredGlossary, setEncounteredGlossary] = useState([]);
  const [isGlossaryOpen, setIsGlossaryOpen] = useState(false);

  // End state
  const [isEnded, setIsEnded] = useState(false);
  const [hasPassedQuiz, setHasPassedQuiz] = useState(false);

  // Focus protection: auto-pause on app minimize or blur
  useEffect(() => {
    const handlePause = () => {
      if (videoRef.current && !videoRef.current.paused) {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    };

    const handleVisibility = () => {
      if (document.hidden) handlePause();
    };

    window.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('blur', handlePause);

    return () => {
      window.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('blur', handlePause);
    };
  }, []);

  // Sync playback rate
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  // Typewriter effect for glossary notes
  useEffect(() => {
    if (!activeNote) {
      setTypewriterText('');
      return;
    }

    let i = 0;
    const fullText = `${activeNote.term}: ${activeNote.definition}`;
    setTypewriterText('');

    const interval = setInterval(() => {
      i++;
      setTypewriterText(fullText.slice(0, i));
      if (i >= fullText.length) {
        clearInterval(interval);
      }
    }, 30);

    // Auto fade after 6s
    const timeout = setTimeout(() => {
      setActiveNote(null);
    }, 6000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [activeNote]);

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const time = videoRef.current.currentTime;
    setCurrentTime(time);

    // Update max watched
    if (time > maxWatchedSeconds) {
      setMaxWatchedSeconds(time);
    }

    // Check stop-test checkpoints
    const triggeredCp = checkpoints.find(
      cp => time >= cp.trigger_time_sec && 
            !answeredCheckpoints[cp.id] && 
            !activeCheckpoint
    );
    if (triggeredCp) {
      videoRef.current.pause();
      setIsPlaying(false);
      setActiveCheckpoint(triggeredCp);
      return;
    }

    // Check glossary triggers
    const note = SAMPLE_GLOSSARY_TERMS.find(
      g => Math.abs(time - g.triggerTime) < 0.6 && !encounteredGlossary.some(item => item.term === g.term)
    );
    if (note) {
      setActiveNote(note);
      setEncounteredGlossary(prev => [...prev, note]);
    }
  };

  const handleAnswerCheckpoint = (isCorrect) => {
    if (!activeCheckpoint) return;
    setAnsweredCheckpoints(prev => ({ ...prev, [activeCheckpoint.id]: isCorrect }));

    if (isCorrect) {
      setActiveCheckpoint(null);
      if (videoRef.current) {
        videoRef.current.play();
        setIsPlaying(true);
      }
    } else {
      // Rewind to explanation timestamp
      const rewindTime = activeCheckpoint.rewind_time_sec || Math.max(0, activeCheckpoint.trigger_time_sec - 10);
      if (videoRef.current) {
        videoRef.current.currentTime = rewindTime;
        setMaxWatchedSeconds(rewindTime);
        setActiveCheckpoint(null);
        videoRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const handleSeek = (e) => {
    if (!videoRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const targetTime = percent * duration;

    // First-watch seek lock: prevent skipping forward
    if (isFirstWatch && targetTime > maxWatchedSeconds + 1) {
      videoRef.current.currentTime = maxWatchedSeconds;
      impactLight();
    } else {
      videoRef.current.currentTime = targetTime;
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    impactLight();
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const rewind10 = () => {
    if (!videoRef.current) return;
    impactLight();
    videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10);
  };

  const cyclePlaybackRate = () => {
    impactLight();
    const rates = [1, 1.25, 1.5];
    const nextIdx = (rates.indexOf(playbackRate) + 1) % rates.length;
    setPlaybackRate(rates[nextIdx]);
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setIsEnded(true);
    setIsFirstWatch(false);
  };

  const handleRestartVideo = () => {
    impactMedium();
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play();
      setIsPlaying(true);
      setIsEnded(false);
    }
  };

  const handleDownloadBotVideo = () => {
    impactMedium();
    const url = `https://t.me/RashidovSchool_bot?start=video_${lessonId || 1}`;
    if (window.Telegram?.WebApp?.openTelegramLink) {
      window.Telegram.WebApp.openTelegramLink(url);
    } else {
      window.open(url, '_blank');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#000000] text-white flex flex-col justify-between overflow-y-auto pb-10">
      
      {/* Top Bar with Back Button */}
      <div className="p-4 pt-[calc(env(safe-area-inset-top,16px)+8px)] flex items-center justify-between z-20 bg-gradient-to-b from-black/80 to-transparent">
        <button 
          onClick={onBack}
          className="w-10 h-10 rounded-full bg-[#1C1C1E] border border-white/10 flex items-center justify-center text-white active:scale-95 transition-transform"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <span className="text-xs font-bold text-white/90 truncate max-w-[200px]">
          {lessonTitle}
        </span>

        {/* Audio Mode Toggle Button */}
        <button
          onClick={() => {
            impactLight();
            setIsAudioOnly(prev => !prev);
          }}
          className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors flex items-center gap-1.5 ${
            isAudioOnly 
              ? 'bg-emerald-500 border-emerald-400 text-white' 
              : 'bg-[#1C1C1E] border-white/10 text-[#8E8E93]'
          }`}
        >
          {isAudioOnly ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          <span>Audio</span>
        </button>
      </div>

      {/* Main Video Viewport */}
      <div className="relative w-full aspect-video bg-[#0A0A0C] flex items-center justify-center overflow-hidden my-auto border-y border-white/5">
        
        {/* Audio Only Placeholder */}
        {isAudioOnly ? (
          <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-gradient-to-b from-[#1C1C1E] to-[#0A0A0C]">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-3xl mb-3 animate-pulse">
              🎧
            </div>
            <span className="text-sm font-bold text-white mb-1">Audio rejim yoqilgan</span>
            <span className="text-xs text-[#8E8E93]">Internet trafikni tejash uchun video yashirildi</span>
          </div>
        ) : null}

        <video
          ref={videoRef}
          src={videoUrl || "https://www.w3schools.com/html/mov_bbb.mp4"}
          className={`w-full h-full object-contain ${isAudioOnly ? 'hidden' : 'block'}`}
          controls={false}
          playsInline
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
          onEnded={handleEnded}
          onClick={togglePlay}
        />

        {/* Typewriter Glossary Pop-up Note */}
        {activeNote && (
          <div 
            onClick={() => {
              if (videoRef.current) {
                videoRef.current.pause();
                setIsPlaying(false);
              }
            }}
            className="absolute top-3 right-3 max-w-[240px] bg-[#1C1C1E]/95 border border-purple-500/40 p-3 rounded-2xl shadow-2xl backdrop-blur-md cursor-pointer z-20"
          >
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-purple-400 uppercase tracking-wider mb-1">
              <Sparkles className="w-3 h-3" />
              <span>Termin-eslatma</span>
            </div>
            <p className="text-xs text-white leading-relaxed font-mono">
              {typewriterText}
            </p>
          </div>
        )}

        {/* Stop-Test Checkpoint Modal Overlay */}
        {activeCheckpoint && (
          <CheckpointModal 
            checkpoint={activeCheckpoint} 
            onAnswer={handleAnswerCheckpoint} 
          />
        )}
      </div>

      {/* Custom Controls Bar */}
      <div className="p-4 space-y-4 max-w-lg mx-auto w-full">
        {/* Seekbar */}
        <div 
          onClick={handleSeek}
          className="relative w-full h-3 bg-[#2C2C2E] rounded-full cursor-pointer overflow-visible flex items-center"
        >
          {/* Max Watched Lock indicator */}
          <div 
            className="absolute left-0 top-0 bottom-0 bg-white/20 rounded-full pointer-events-none"
            style={{ width: `${(maxWatchedSeconds / (duration || 1)) * 100}%` }}
          />
          {/* Active progress */}
          <div 
            className="h-full bg-[#007AFF] rounded-full pointer-events-none shadow-[0_0_8px_rgba(0,122,255,0.6)]"
            style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
          />
          {/* Checkpoint marker dots */}
          {checkpoints.map((cp) => {
            const leftPct = (cp.trigger_time_sec / (duration || 1)) * 100;
            const isDone = answeredCheckpoints[cp.id];
            return (
              <div
                key={cp.id}
                className={`absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border-2 border-black pointer-events-none ${
                  isDone ? 'bg-emerald-400' : 'bg-amber-400'
                }`}
                style={{ left: `${leftPct}%`, transform: 'translate(-50%, -50%)' }}
              />
            );
          })}
        </div>

        {/* Bottom Action Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={togglePlay}
              className="w-12 h-12 rounded-full bg-[#007AFF] flex items-center justify-center text-white active:scale-95 transition-transform shadow-lg shadow-blue-500/25"
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white ml-0.5" />}
            </button>

            <button
              onClick={rewind10}
              className="w-10 h-10 rounded-full bg-[#1C1C1E] border border-white/10 flex items-center justify-center text-white/80 active:scale-95 transition-transform"
              title="-10 soniya"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <span className="text-xs font-mono text-[#8E8E93]">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <button
            onClick={cyclePlaybackRate}
            className="px-3 py-1.5 rounded-xl bg-[#1C1C1E] border border-white/10 text-xs font-bold text-white active:scale-95 transition-transform"
          >
            {playbackRate}x
          </button>
        </div>

        {/* End of Video Screen & Rewards */}
        {isEnded && (
          <div className="bg-[#1C1C1E] border border-emerald-500/30 p-5 rounded-3xl space-y-4 animate-in fade-in zoom-in-95 duration-300">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-xl">
                🎉
              </div>
              <div>
                <h4 className="text-white font-bold text-sm">Dars muvaffaqiyatli yakunlandi!</h4>
                <p className="text-xs text-emerald-400 font-medium">Barcha qismlarni ko'rib chiqdingiz</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  impactMedium();
                  if (onStartQuiz) onStartQuiz();
                }}
                className="bg-[#007AFF] hover:bg-blue-600 text-white font-bold py-3.5 px-3 rounded-2xl text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
              >
                <span>📝 Testni boshlash</span>
              </button>

              <button
                onClick={handleRestartVideo}
                className="bg-[#2C2C2E] hover:bg-[#3A3A3C] text-white font-bold py-3.5 px-3 rounded-2xl text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all"
              >
                <span>🔄 Qayta ko'rish</span>
              </button>
            </div>

            {/* Post-Test Rewards (>= 70%) */}
            <div className="pt-2 border-t border-white/5 space-y-2">
              <button
                onClick={handleDownloadBotVideo}
                className="w-full bg-[#1C1C1E] border border-white/10 hover:bg-[#242426] text-white font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <Download className="w-4 h-4 text-blue-400" />
                  <span>Videoni bot orqali olish</span>
                </div>
                <span className="text-[10px] text-[#8E8E93]">Himoyalangan</span>
              </button>

              <button
                onClick={() => alert("Mavzu konspekti yuklanmoqda...")}
                className="w-full bg-[#1C1C1E] border border-white/10 hover:bg-[#242426] text-white font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-amber-400" />
                  <span>Mavzu konspekti (PDF)</span>
                </div>
                <span className="text-[10px] text-amber-400 font-bold">⭐️ Premium</span>
              </button>
            </div>
          </div>
        )}

        {/* Lesson Glossary Accordion ("Dars lug'ati") */}
        {encounteredGlossary.length > 0 && (
          <div className="bg-[#1C1C1E] border border-white/5 rounded-2xl overflow-hidden">
            <button
              onClick={() => setIsGlossaryOpen(prev => !prev)}
              className="w-full p-3.5 flex items-center justify-between text-xs font-bold text-white hover:bg-white/[0.02]"
            >
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-purple-400" />
                <span>Dars lug'ati ({encounteredGlossary.length} ta termin)</span>
              </div>
              {isGlossaryOpen ? <ChevronUp className="w-4 h-4 text-[#8E8E93]" /> : <ChevronDown className="w-4 h-4 text-[#8E8E93]" />}
            </button>

            {isGlossaryOpen && (
              <div className="p-4 pt-1 space-y-2.5 border-t border-white/5">
                {encounteredGlossary.map((item, idx) => (
                  <div key={idx} className="bg-[#242426] p-2.5 rounded-xl text-xs">
                    <span className="font-bold text-purple-300 block mb-0.5">{item.term}</span>
                    <span className="text-[#8E8E93] leading-relaxed">{item.definition}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

    </div>
  );
}
