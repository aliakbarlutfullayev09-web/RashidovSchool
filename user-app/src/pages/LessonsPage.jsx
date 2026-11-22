import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import VideoPlayer from '../components/VideoPlayer';
import RashidovLogo from '../components/RashidovLogo';
import SubjectBannerEffects from '../components/SubjectBannerEffects';
import { getSubjects, getCoursesAndLessons, getProgress, getVideoCheckpoints, getQuestions, saveLessonQuizProgress } from '../api/supabase';
import { 
  Play, Search, X, Bookmark, BookmarkCheck, Clock, 
  ChevronRight, MoreHorizontal, ArrowLeft 
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useHaptic } from '../hooks/useHaptic';

export default function LessonsPage({ user, onPlayingChange, onRegisterBackAction }) {
  const { t } = useLanguage();
  const { selectionChanged, impactLight, impactMedium } = useHaptic();

  // Telegram client & BackButton support detection
  const tg = typeof window !== 'undefined' ? window.Telegram?.WebApp : null;
  const isTelegramWithBack = Boolean(
    tg && tg.initData !== undefined && tg.isVersionAtLeast && tg.isVersionAtLeast('6.1')
  );

  // Navigation views: 'carousel' (Screen 1) | 'subject_hub' (Screen 2) | 'lesson_list' (Screen 3)
  const [currentView, setCurrentView] = useState('carousel');

  // Subjects & courses
  const [subjects, setSubjects] = useState([]);
  const [activeSubjectIndex, setActiveSubjectIndex] = useState(0);
  const [slideDirection, setSlideDirection] = useState(1); // 1 = next, -1 = prev (spring jump & slide transition)
  const [selectedCourse, setSelectedCourse] = useState(null); // Category filter (e.g. Botanika)

  const [courses, setCourses] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [progressMap, setProgressMap] = useState({});
  const [loading, setLoading] = useState(true);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'unwatched' | 'continue' | 'saved'
  const [savedLessonIds, setSavedLessonIds] = useState(() => {
    try {
      const saved = localStorage.getItem('rb_saved_lessons');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Last watched lesson for "Ko'rishni davom ettirish" card
  const [lastWatchedLesson, setLastWatchedLesson] = useState(null);
  const [lastWatchedPct, setLastWatchedPct] = useState(0);

  // Video playback state
  const [playingLesson, setPlayingLesson] = useState(null);
  const [checkpoints, setCheckpoints] = useState([]);
  const [lessonQuiz, setLessonQuiz] = useState(null);

  // Carousel touch swipe handling
  const touchStartXRef = useRef(0);
  const touchStartYRef = useRef(0);
  const savedScrollPositionRef = useRef(0);

  // Sync playing state up to App to hide TabBar
  useEffect(() => {
    if (onPlayingChange) {
      onPlayingChange(!!playingLesson);
    }
  }, [playingLesson, onPlayingChange]);

  // Load subjects on mount
  useEffect(() => {
    loadSubjects();
  }, []);

  const loadSubjects = async () => {
    try {
      const dbSubjects = await getSubjects();
      if (dbSubjects && dbSubjects.length > 0) {
        setSubjects(dbSubjects);
      }
    } catch (e) {
      console.warn("Error loading subjects:", e);
    }
  };

  const activeSubject = subjects[activeSubjectIndex] || subjects[0] || { 
    id: 1, 
    key: 'biologiya', 
    name: 'Biologiya',
    bg_gradient: 'from-[#031B13] via-[#020E0A] to-[#000000]',
    border_class: 'border-emerald-500/35',
    shadow_class: 'shadow-[0_0_50px_rgba(16,185,129,0.22)]'
  };

  // Load courses & lessons whenever active subject changes
  useEffect(() => {
    loadData();
  }, [activeSubject?.id, user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const { courses: dbCourses, lessons: allLessons } = await getCoursesAndLessons(activeSubject.id);
      setCourses(dbCourses || []);
      setLessons(allLessons || []);

      // User progress
      const userUid = user?.telegram_id || user?.id;
      if (userUid) {
        const prog = await getProgress(userUid);
        const pMap = {};
        if (prog && prog.length > 0) {
          prog.forEach(p => { pMap[p.lesson_id] = p; });
        }
        setProgressMap(pMap);
      }

      // Check last watched lesson in localStorage
      findLastWatchedLesson(allLessons);
    } catch (err) {
      console.error("Error loading subject data:", err);
    } finally {
      setLoading(false);
    }
  };

  const findLastWatchedLesson = (allLessons) => {
    if (!allLessons || allLessons.length === 0) return;
    for (const l of allLessons) {
      const raw = localStorage.getItem(`rb_watch_progress_${user?.telegram_id || 'guest'}_${l.id}`);
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (parsed.maxWatchedSeconds > 0) {
            setLastWatchedLesson(l);
            setLastWatchedPct(Math.min(100, Math.round((parsed.maxWatchedSeconds / 600) * 100)));
            return;
          }
        } catch {}
      }
    }
    if (allLessons.length > 0) {
      setLastWatchedLesson(allLessons[0]);
      setLastWatchedPct(40);
    }
  };

  const handleNextSubject = () => {
    impactLight();
    selectionChanged();
    setSlideDirection(1);
    setActiveSubjectIndex(prev => (prev + 1) % (subjects.length || 1));
  };

  const handlePrevSubject = () => {
    impactLight();
    selectionChanged();
    setSlideDirection(-1);
    setActiveSubjectIndex(prev => (prev - 1 + subjects.length) % (subjects.length || 1));
  };

  const toggleBookmark = (e, lessonId) => {
    e.stopPropagation();
    impactLight();
    setSavedLessonIds(prev => {
      const updated = prev.includes(lessonId) 
        ? prev.filter(id => id !== lessonId)
        : [...prev, lessonId];
      localStorage.setItem('rb_saved_lessons', JSON.stringify(updated));
      return updated;
    });
  };

  const handleStartLesson = async (lesson) => {
    impactLight();
    savedScrollPositionRef.current = window.scrollY;
    try {
      const cps = await getVideoCheckpoints(lesson.id);
      setCheckpoints(cps && cps.length > 0 ? cps : []);
    } catch {
      setCheckpoints([]);
    }
    setPlayingLesson(lesson);
  };

  const handleBackFromPlayer = () => {
    setPlayingLesson(null);
    setTimeout(() => {
      window.scrollTo({ top: savedScrollPositionRef.current, behavior: 'instant' });
    }, 50);
  };

  // Synchronize Back Action with Telegram Native BackButton via App
  useEffect(() => {
    if (typeof onRegisterBackAction !== 'function') return;

    if (playingLesson) {
      window.__rb_exit_video = handleBackFromPlayer;
      onRegisterBackAction(() => handleBackFromPlayer());
    } else {
      window.__rb_exit_video = null;
      if (currentView === 'lesson_list') {
        onRegisterBackAction(() => {
          impactLight();
          setCurrentView('subject_hub');
          setSelectedCourse(null);
          setSearchQuery('');
        });
      } else if (currentView === 'subject_hub') {
        onRegisterBackAction(() => {
          impactLight();
          setCurrentView('carousel');
        });
      } else {
        onRegisterBackAction(null);
      }
    }

    return () => {
      window.__rb_exit_video = null;
    };
  }, [playingLesson, currentView, onRegisterBackAction]);

  // Filter lessons
  const normalizedQuery = searchQuery.trim().toLowerCase().replace(/[`'‘’ʼ]/g, "'");

  const filteredLessons = lessons.filter(lesson => {
    if (selectedCourse && lesson.course_id !== selectedCourse.id) {
      return false;
    }
    if (normalizedQuery) {
      const title = (lesson.title || '').toLowerCase().replace(/[`'‘’ʼ]/g, "'");
      const category = (lesson.category_name || '').toLowerCase().replace(/[`'‘’ʼ]/g, "'");
      if (!title.includes(normalizedQuery) && !category.includes(normalizedQuery)) {
        return false;
      }
    }
    const prog = progressMap[lesson.id];
    const hasWatched = prog && prog.stars > 0;
    const isSaved = savedLessonIds.includes(lesson.id);

    if (activeFilter === 'unwatched') return !hasWatched;
    if (activeFilter === 'continue') {
      const local = localStorage.getItem(`rb_watch_progress_${user?.telegram_id || 'guest'}_${lesson.id}`);
      return !!local && !hasWatched;
    }
    if (activeFilter === 'saved') return isSaved;

    return true;
  });

  // If in quiz mode for lesson
  if (lessonQuiz) {
    const q = lessonQuiz.questions[lessonQuiz.currentQ];
    const isLast = lessonQuiz.currentQ === lessonQuiz.questions.length - 1;

    const handleAnswerQuiz = async (selectedOptionIndex) => {
      impactLight();
      const newAnswers = { ...lessonQuiz.answers, [lessonQuiz.currentQ]: selectedOptionIndex };
      
      if (!isLast) {
        setLessonQuiz({ ...lessonQuiz, currentQ: lessonQuiz.currentQ + 1, answers: newAnswers });
      } else {
        let correctCount = 0;
        lessonQuiz.questions.forEach((question, idx) => {
          if (newAnswers[idx] === question.correct_option_index) {
            correctCount++;
          }
        });
        const ratio = correctCount / lessonQuiz.questions.length;
        const stars = ratio >= 0.8 ? 3 : ratio >= 0.5 ? 2 : 1;
        const uid = user?.telegram_id || user?.id;

        if (uid) {
          await saveLessonQuizProgress(uid, lessonQuiz.lesson.id, stars, Math.round(ratio * 100));
        }

        alert(`Tabriklaymiz! Test yakunlandi.\nTo'g'ri javoblar: ${correctCount}/${lessonQuiz.questions.length}\nYulduzlar: ${'⭐️'.repeat(stars)}\nHisobingizga neyronlar qo'shildi!`);
        
        if (uid) {
          const prog = await getProgress(uid);
          const pMap = {};
          (prog || []).forEach(p => { pMap[p.lesson_id] = p; });
          setProgressMap(pMap);
        }
        setLessonQuiz(null);
        setPlayingLesson(null);
      }
    };

    return (
      <div className="fixed inset-0 z-50 bg-black/95 text-white flex flex-col p-4 max-w-md mx-auto">
        <div className="flex items-center justify-between py-3 border-b border-white/10">
          <button 
            onClick={() => setLessonQuiz(null)}
            className="w-9 h-9 rounded-full bg-[#1C1C1E] flex items-center justify-center text-white active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-bold text-blue-400">
            Savol {lessonQuiz.currentQ + 1} / {lessonQuiz.questions.length}
          </span>
          <div className="w-9" />
        </div>

        <div className="flex-1 flex flex-col justify-center py-6">
          {q.image_url && !q.image_url.startsWith('cp_meta:') && (
            <div className="relative w-full aspect-video rounded-2xl overflow-hidden mb-4 border border-white/10 bg-black">
              <img src={q.image_url} alt="" className="w-full h-full object-contain" />
            </div>
          )}

          <h3 className="text-lg font-bold text-white mb-6 leading-snug">
            {q.text}
          </h3>

          <div className="space-y-3">
            {(q.options || []).map((opt, optIdx) => (
              <button
                key={optIdx}
                onClick={() => handleAnswerQuiz(optIdx)}
                className="w-full p-4 rounded-2xl bg-[#1C1C1E] border border-white/10 hover:border-blue-500/50 text-left text-sm font-semibold flex items-center gap-3 active:scale-98 transition-all"
              >
                <span className="w-6 h-6 rounded-full bg-[#2C2C2E] flex items-center justify-center text-xs font-bold text-white/70">
                  {['A', 'B', 'C', 'D'][optIdx]}
                </span>
                <span className="flex-1 text-white">{opt}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // If in video playback, render VideoPlayer covering screen
  if (playingLesson) {
    return (
      <VideoPlayer
        videoUrl={playingLesson.video_url}
        lessonId={playingLesson.id}
        lessonTitle={playingLesson.title}
        terms={playingLesson.terms || []}
        checkpoints={checkpoints}
        userId={user?.telegram_id || user?.id}
        onStartQuiz={async () => {
          const qs = await getQuestions(playingLesson.id);
          if (qs && qs.length > 0) {
            setLessonQuiz({ lesson: playingLesson, questions: qs, currentQ: 0, answers: {} });
          } else {
            alert("Ushbu dars uchun savollar ustoz tomonidan tayyorlanmoqda. Umumiy testlarni Testlar bo'limida yechishingiz mumkin.");
            setPlayingLesson(null);
          }
        }}
        onBack={handleBackFromPlayer}
      />
    );
  }

  // Bulletproof Subject Detection (supports Uzbek, Russian, IDs, and dynamic custom subjects)
  const normKey = (activeSubject?.key || activeSubject?.name || '').toString().toLowerCase();
  const isBio = normKey.includes('bio') || normKey.includes('био') || activeSubject?.id === 1;
  const isKimyo = normKey.includes('kim') || normKey.includes('хим') || activeSubject?.id === 2;
  const isMatem = normKey.includes('mat') || normKey.includes('мат') || activeSubject?.id === 3;

  const currentSubjectKey = isBio ? 'biologiya' : isKimyo ? 'kimyo' : isMatem ? 'matematika' : (activeSubject?.key || 'subject');
  const currentSubjectTitle = (activeSubject?.name || (isBio ? 'BIOLOGIYA' : isKimyo ? 'KIMYO' : isMatem ? 'MATEMATIKA' : 'FAN')).toUpperCase();

  // Distinct custom high-res background & video per subject
  let subjectImage = activeSubject?.image_url;
  if (!subjectImage || subjectImage.includes('unsplash.com/photo-1530026405186') || subjectImage.includes('photo-1635070041078')) {
    subjectImage = isBio 
      ? '/banners/biologiya_banner.jpg'
      : isKimyo
      ? '/banners/kimyo_banner.jpg'
      : isMatem
      ? 'https://images.unsplash.com/photo-1633424974203-6c91b2a651ee?auto=format&fit=crop&w=1200&q=85'
      : 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=85';
  }

  const subjectVideo = isBio 
    ? '/banners/biologiya_banner.mp4' 
    : isKimyo 
    ? '/banners/kimyo_banner.mp4' 
    : activeSubject?.video_url || null;

  const buttonGradient = isKimyo 
    ? 'from-[#8B5CF6] via-[#A855F7] to-[#7C3AED] shadow-[0_0_25px_rgba(168,85,247,0.45)]'
    : isMatem
    ? 'from-[#007AFF] via-[#0A84FF] to-[#0056D2] shadow-[0_0_25px_rgba(0,122,255,0.45)]'
    : isBio
    ? 'from-[#007AFF] via-[#0A84FF] to-[#0066FF] shadow-[0_0_25px_rgba(0,122,255,0.45)]'
    : 'from-[#06B6D4] via-[#0EA5E9] to-[#0284C7] shadow-[0_0_25px_rgba(6,182,212,0.45)]';

  const cardBorderClass = activeSubject?.border_class || (
    isKimyo ? 'border-purple-500/35' : isMatem ? 'border-blue-500/35' : 'border-emerald-500/35'
  );

  const cardShadowClass = activeSubject?.shadow_class || (
    isKimyo ? 'shadow-[0_8px_32px_rgba(168,85,247,0.22)]' : isMatem ? 'shadow-[0_8px_32px_rgba(0,122,255,0.22)]' : 'shadow-[0_8px_32px_rgba(16,185,129,0.22)]'
  );

  const cardBgGradient = activeSubject?.bg_gradient || (
    isKimyo ? 'from-[#19092B] via-[#0D0417] to-[#000000]' : isMatem ? 'from-[#05142B] via-[#020A17] to-[#000000]' : 'from-[#031B13] via-[#020E0A] to-[#000000]'
  );

  const handleBack = () => {
    impactLight();
    if (currentView === 'lesson_list') {
      setCurrentView('subject_hub');
      setSelectedCourse(null);
      setSearchQuery('');
    } else if (currentView === 'subject_hub') {
      setCurrentView('carousel');
    }
  };

  return (
    <div 
      className={`w-full text-white select-none flex flex-col ${
        currentView === 'carousel' ? 'h-full flex-1 overflow-hidden' : 'min-h-full'
      }`}
      style={{
        paddingBottom: currentView === 'carousel' 
          ? 'calc(var(--safe-area-bottom, 0px) + 74px)' 
          : 'calc(var(--safe-area-bottom, 0px) + 88px)'
      }}
    >
      {/* ──────────────────────────────────────────────────────────
          SCREEN 1: HERO SUBJECT CAROUSEL BANNER (STRETCHED & THEMED)
      ────────────────────────────────────────────────────────── */}
      {currentView === 'carousel' && (
        <div 
          className="h-full flex-1 flex flex-col justify-between items-center px-4 pt-1 pb-1 w-full max-w-md mx-auto overflow-hidden select-none"
          onTouchStart={(e) => {
            touchStartXRef.current = e.touches[0].clientX;
            touchStartYRef.current = e.touches[0].clientY;
          }}
          onTouchEnd={(e) => {
            const deltaX = touchStartXRef.current - e.changedTouches[0].clientX;
            const deltaY = Math.abs(touchStartYRef.current - e.changedTouches[0].clientY);
            if (Math.abs(deltaX) > 35 && Math.abs(deltaX) > deltaY) {
              if (deltaX > 0) handleNextSubject();
              else handlePrevSubject();
            }
          }}
        >
          {/* Stretched Vertical Card Container: flex-1 min-h-0 fills exact screen height with zero overflow */}
          <div className="relative w-full flex-1 min-h-0 my-1 overflow-hidden">
            <AnimatePresence initial={false} custom={slideDirection}>
              <motion.div 
                key={activeSubjectIndex}
                custom={slideDirection}
                variants={{
                  enter: (dir) => ({
                    x: dir > 0 ? '100%' : '-100%',
                    opacity: 1,
                    scale: 1,
                  }),
                  center: {
                    x: 0,
                    opacity: 1,
                    scale: 1,
                    transition: {
                      x: { type: "spring", stiffness: 320, damping: 32, mass: 0.8 },
                    }
                  },
                  exit: (dir) => ({
                    x: dir > 0 ? '-100%' : '100%',
                    opacity: 0.9,
                    scale: 0.98,
                    transition: {
                      x: { type: "spring", stiffness: 320, damping: 32, mass: 0.8 },
                      opacity: { duration: 0.28 }
                    }
                  })
                }}
                initial="enter"
                animate="center"
                exit="exit"
                onClick={(e) => {
                  e.preventDefault();
                  impactLight();
                  setCurrentView('subject_hub');
                }}
                style={{
                  isolation: 'isolate',
                  WebkitMaskImage: '-webkit-radial-gradient(white, black)'
                }}
                className={`absolute inset-0 w-full h-full rounded-[28px] overflow-hidden border ${cardBorderClass} ${cardShadowClass} bg-gradient-to-b ${cardBgGradient} cursor-pointer group active:scale-[0.99] transition-transform duration-200 flex flex-col justify-between p-5 sm:p-6 select-none`}
              >
                {/* Background Subject Artwork */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                  {subjectVideo ? (
                    <video 
                      key={subjectVideo}
                      src={subjectVideo} 
                      poster={subjectImage}
                      autoPlay 
                      loop 
                      muted 
                      playsInline 
                      preload="auto"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-85" 
                    />
                  ) : (
                    <img 
                      src={subjectImage} 
                      alt={currentSubjectTitle} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-80" 
                    />
                  )}
                  {/* Deep Cinematic Vignette Overlays */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/45 to-transparent" />
                  <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black" />
                </div>

                {/* ── DISTINCT SUBJECT ANIMATION EFFECTS (BIOLOGY / CHEMISTRY / MATH) ── */}
                <SubjectBannerEffects subjectKey={currentSubjectKey} />

                {/* Spacer that expands and keeps button and title at bottom */}
                <div className="relative z-10 w-full flex-1 min-h-0" />

                {/* Bottom Card Content: Title & "Boshlash" Button */}
                <div className="relative z-10 w-full flex flex-col items-start pt-3">
                  {/* Bold Uppercase Subject Title with Modern Display Font */}
                  <h2 className="text-white font-black text-2xl sm:text-3xl tracking-[0.06em] uppercase mb-3 drop-shadow-[0_4px_16px_rgba(0,0,0,0.9)] font-sans">
                    {currentSubjectTitle}
                  </h2>

                  {/* Glowing Action Button: "Boshlash" */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      impactMedium();
                      setCurrentView('subject_hub');
                    }}
                    className={`w-full bg-gradient-to-r ${buttonGradient} hover:brightness-110 text-white font-bold py-3 px-6 rounded-full text-sm sm:text-base active:scale-95 transition-all text-center flex items-center justify-center gap-2 shadow-lg cursor-pointer z-20`}
                  >
                    <span>Boshlash</span>
                  </button>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Carousel Pagination Dots */}
          <div className="flex items-center justify-center gap-2 pt-1 pb-1 flex-shrink-0">
            {subjects.map((s, idx) => (
              <button
                key={s.id || idx}
                onClick={() => {
                  impactLight();
                  setSlideDirection(idx >= activeSubjectIndex ? 1 : -1);
                  setActiveSubjectIndex(idx);
                }}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  activeSubjectIndex === idx 
                    ? 'w-6 bg-white shadow-[0_0_8px_white]' 
                    : 'w-1.5 bg-white/30'
                }`}
                aria-label={`Fan ${idx + 1}`}
              />
            ))}
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────
          SCREEN 2: SUBJECT HUB (2x2 CATEGORIES & RECENT LESSON)
      ────────────────────────────────────────────────────────── */}
      {currentView === 'subject_hub' && (
        <div className="w-full max-w-md mx-auto px-4 pt-3 pb-8 animate-in fade-in duration-300">
          {/* Search Input Bar with glass styling */}
          <div className="relative mb-3">
            <Search className="w-4 h-4 text-[#8E8E93] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (e.target.value.trim().length > 0) {
                  setCurrentView('lesson_list');
                }
              }}
              placeholder="Mavzu, termin yoki paragraf"
              className="w-full bg-[#1C1C1E]/85 backdrop-blur-md border border-white/10 focus:border-[#007AFF] rounded-full py-2.5 pl-10 pr-4 text-xs text-white placeholder-[#8E8E93] outline-none transition-colors shadow-sm"
            />
          </div>

          {/* Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar mb-5 py-1">
            {[
              { id: 'all', label: 'Barchasi' },
              { id: 'unwatched', label: 'Ko‘rilmagan' },
              { id: 'continue', label: 'Qaytarish' },
              { id: 'saved', label: 'Saqlangan' }
            ].map((tab) => {
              const isActive = activeFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    impactLight();
                    setActiveFilter(tab.id);
                    if (tab.id !== 'all') {
                      setCurrentView('lesson_list');
                    }
                  }}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap active:scale-95 ${
                    isActive
                      ? 'bg-[#007AFF] text-white shadow-md shadow-blue-500/20'
                      : 'bg-[#1C1C1E] border border-white/5 text-[#8E8E93] hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Grid of Thematic Courses */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {courses.length > 0 ? (
              courses.map((course, idx) => (
                <div
                  key={course.id || idx}
                  onClick={() => {
                    impactLight();
                    setSelectedCourse(course);
                    setCurrentView('lesson_list');
                  }}
                  className="relative aspect-[4/3] rounded-2xl overflow-hidden border border-white/5 hover:border-emerald-500/40 cursor-pointer active:scale-[0.98] transition-all group shadow-lg"
                >
                  <img 
                    src={course.image_url || 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?auto=format&fit=crop&w=600&q=80'} 
                    alt={course.title} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

                  <div className="absolute bottom-3 left-3 right-3">
                    <h4 className="text-white font-bold text-sm tracking-wide leading-tight">
                      {course.title}
                    </h4>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-2 p-5 bg-[#1C1C1E] border border-white/5 rounded-2xl text-center text-xs text-[#8E8E93]">
                Ushbu fanda kurslar mavjud emas
              </div>
            )}
          </div>

          {/* "Ko'rishni davom ettirish" (Continue Watching Section) */}
          {lastWatchedLesson && (
            <div className="mb-4">
              <span className="text-xs font-bold text-[#8E8E93] block mb-2 px-1">
                Ko‘rishni davom ettirish
              </span>

              <div
                onClick={() => handleStartLesson(lastWatchedLesson)}
                className="bg-[#1C1C1E] border border-white/5 hover:border-white/10 rounded-2xl p-3 flex items-center justify-between cursor-pointer active:scale-[0.98] transition-all shadow-md"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-[#2C2C2E] flex-shrink-0">
                    <img 
                      src={lastWatchedLesson.thumbnail_url || 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=400&q=80'} 
                      alt="" 
                      className="w-full h-full object-cover" 
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <Play className="w-4 h-4 fill-white text-white ml-0.5" />
                    </div>
                  </div>

                  <div className="min-w-0 flex-1">
                    <h5 className="text-white font-bold text-xs truncate leading-snug mb-1">
                      {lastWatchedLesson.title}
                    </h5>

                    <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-emerald-400 rounded-full" 
                        style={{ width: `${lastWatchedPct || 40}%` }} 
                      />
                    </div>
                  </div>
                </div>

                <ChevronRight className="w-4 h-4 text-[#8E8E93] flex-shrink-0 ml-2" />
              </div>
            </div>
          )}

          {/* Shortcut: "Biologiyaning barcha mavzulari" */}
          <div
            onClick={() => {
              impactLight();
              setSelectedCourse(null);
              setCurrentView('lesson_list');
            }}
            className="bg-[#1C1C1E] border border-white/5 hover:border-white/10 rounded-2xl p-3 flex items-center justify-between cursor-pointer active:scale-[0.98] transition-all mb-4"
          >
            <div className="flex items-center gap-2.5 text-xs font-semibold text-white/90">
              <Search className="w-4 h-4 text-[#8E8E93]" />
              <span>Biologiyaning barcha mavzulari</span>
            </div>
            <ChevronRight className="w-4 h-4 text-[#8E8E93]" />
          </div>

        </div>
      )}

      {/* ──────────────────────────────────────────────────────────
          SCREEN 3: LESSON LIST & SEARCH RESULTS
      ────────────────────────────────────────────────────────── */}
      {currentView === 'lesson_list' && (
        <div className="w-full max-w-md mx-auto px-4 pt-3 pb-8 animate-in fade-in duration-300">
          {/* Search Input Bar with Clear button and glass styling */}
          <div className="relative mb-3">
            <Search className="w-4 h-4 text-[#8E8E93] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Mavzu, termin yoki paragraf"
              className="w-full bg-[#1C1C1E]/85 backdrop-blur-md border border-white/10 focus:border-[#007AFF] rounded-full py-2.5 pl-10 pr-9 text-xs text-white placeholder-[#8E8E93] outline-none transition-colors shadow-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-[#2C2C2E] flex items-center justify-center text-[#8E8E93] hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Subtitle: "X ta dars topildi" */}
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="text-xs text-[#8E8E93] font-medium">
              {filteredLessons.length} ta dars topildi
            </span>

            {selectedCourse && (
              <button
                onClick={() => setSelectedCourse(null)}
                className="text-[11px] text-[#007AFF] font-bold"
              >
                Barchasi
              </button>
            )}
          </div>

          {/* List of Compact Horizontal Lesson Cards */}
          {filteredLessons.length > 0 ? (
            <div className="space-y-2.5 mb-6">
              {filteredLessons.map((lesson, idx) => {
                const isSaved = savedLessonIds.includes(lesson.id);

                return (
                  <div
                    key={lesson.id || idx}
                    onClick={() => handleStartLesson(lesson)}
                    className="bg-[#1C1C1E] border border-white/5 hover:border-white/15 rounded-2xl p-2.5 flex items-center gap-3 cursor-pointer active:scale-[0.98] transition-all shadow-md group"
                  >
                    {/* 16:9 Thumbnail Box */}
                    <div className="relative w-28 aspect-video rounded-xl overflow-hidden bg-[#2C2C2E] flex-shrink-0">
                      <img 
                        src={lesson.thumbnail_url || 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?auto=format&fit=crop&w=400&q=80'} 
                        alt="" 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                      />
                      {/* Duration Tag */}
                      <div className="absolute bottom-1 left-1 bg-black/80 backdrop-blur-md px-1.5 py-0.5 rounded text-[9px] font-mono font-bold text-white flex items-center gap-1">
                        <Play className="w-2 h-2 fill-white" />
                        <span>{lesson.duration || '14 daq'}</span>
                      </div>
                    </div>

                    {/* Lesson Title & Category */}
                    <div className="flex-1 min-w-0 pr-1">
                      <h4 className="text-white font-bold text-xs leading-snug line-clamp-2 mb-1 group-hover:text-blue-400 transition-colors">
                        {lesson.title}
                      </h4>
                      <span className="text-[11px] text-[#8E8E93] block truncate">
                        {lesson.category_name || 'Biologiya'}
                      </span>
                    </div>

                    {/* Bookmark Button */}
                    <button
                      onClick={(e) => toggleBookmark(e, lesson.id)}
                      className="w-8 h-8 rounded-full bg-[#2C2C2E] flex items-center justify-center text-white/80 active:scale-90 transition-transform flex-shrink-0"
                      title="Saqlash"
                    >
                      {isSaved ? (
                        <BookmarkCheck className="w-4 h-4 text-amber-400" />
                      ) : (
                        <Bookmark className="w-4 h-4 text-[#8E8E93]" />
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Empty State */
            <div className="bg-[#1C1C1E] border border-white/5 rounded-3xl p-8 text-center my-6">
              <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center text-lg mx-auto mb-3 text-[#8E8E93]">
                🔍
              </div>
              <h4 className="text-white font-bold text-xs mb-1">Dars topilmadi</h4>
              <p className="text-[11px] text-[#8E8E93] mb-4">
                Boshqa kalit so‘z bilan qidirib ko‘ring
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCourse(null);
                  setActiveFilter('all');
                }}
                className="px-4 py-2 bg-[#2C2C2E] text-white text-xs font-bold rounded-xl"
              >
                Qidiruvni tozalash
              </button>
            </div>
          )}

          {/* Bottom link: "Biologiyaning barcha mavzulari >" */}
          <div
            onClick={() => {
              impactLight();
              setSelectedCourse(null);
              setSearchQuery('');
              setActiveFilter('all');
            }}
            className="text-center py-2 cursor-pointer active:scale-95 transition-transform"
          >
            <span className="text-xs font-bold text-[#007AFF] hover:underline">
              {activeSubject.name}ning barcha mavzulari &gt;
            </span>
          </div>

        </div>
      )}

    </div>
  );
}
