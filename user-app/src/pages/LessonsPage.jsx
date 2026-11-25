import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import VideoPlayer from '../components/VideoPlayer';
import RashidovLogo from '../components/RashidovLogo';
import SubjectBannerEffects from '../components/SubjectBannerEffects';
import { getSubjects, getCoursesAndLessons, getProgress, getVideoCheckpoints, getQuestions, saveLessonQuizProgress } from '../api/supabase';
import { mockSubjects } from '../mock/data';
import { 
  Play, Search, X, Bookmark, BookmarkCheck, Clock, 
  ChevronRight, MoreHorizontal, ArrowLeft 
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { useHaptic } from '../hooks/useHaptic';
import { useIsDesktop } from '../hooks/useIsDesktop';
import { useVideoDurations } from '../hooks/useVideoDurations';
import DesktopSubjectCarousel from '../components/DesktopSubjectCarousel';

const DEFAULT_COVER_IMAGE = 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?auto=format&fit=crop&w=800&q=80';

export default function LessonsPage({ user, onPlayingChange, onRegisterBackAction }) {
  const { t, lang } = useLanguage();
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === 'light';
  const { selectionChanged, impactLight, impactMedium } = useHaptic();
  const isDesktop = useIsDesktop();

  const LESSON_FILTER_TABS = [
    { id: 'unwatched', label: lang === 'ru' ? 'Непросмотренные' : 'Ko‘rilmagan' },
    { id: 'continue', label: lang === 'ru' ? 'Повторить' : 'Qaytarish' },
    { id: 'saved', label: lang === 'ru' ? 'Сохранённые' : 'Saqlangan' }
  ];

  // Telegram client & BackButton support detection
  const tg = typeof window !== 'undefined' ? window.Telegram?.WebApp : null;
  const isTelegramWithBack = Boolean(
    tg && tg.initData !== undefined && tg.isVersionAtLeast && tg.isVersionAtLeast('6.1')
  );

  // Navigation views: 'carousel' (Screen 1) | 'subject_hub' (Screen 2) | 'lesson_list' (Screen 3)
  const [currentView, setCurrentView] = useState('carousel');

  // Subjects & courses (seed immediately with mockSubjects to prevent blank frame before fetch completes)
  const [subjects, setSubjects] = useState(mockSubjects);
  const [activeSubjectIndex, setActiveSubjectIndex] = useState(0);
  const [slideDirection, setSlideDirection] = useState(1); // 1 = next, -1 = prev (spring jump & slide transition)
  const [selectedCourse, setSelectedCourse] = useState(null); // Category filter (e.g. Botanika)

  const [courses, setCourses] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [progressMap, setProgressMap] = useState({});
  const [loading, setLoading] = useState(true);
  const durationsById = useVideoDurations(lessons);

  const courseById = React.useMemo(() => {
    return courses.reduce((acc, c) => {
      acc[c.id] = c;
      return acc;
    }, {});
  }, [courses]);

  const getLessonCover = (lesson) =>
    lesson?.thumbnail_url || courseById[lesson?.course_id]?.image_url || DEFAULT_COVER_IMAGE;

  const getLessonDuration = (lesson) => durationsById[lesson?.id] || lesson?.duration || null;

  const getLessonCategory = (lesson) =>
    lesson?.category_name || courseById[lesson?.course_id]?.title || activeSubject?.name || 'Biologiya';

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

  // Sync playing state up to App to hide TabBar (and reset on unmount)
  useEffect(() => {
    if (onPlayingChange) {
      onPlayingChange(!!playingLesson);
    }
  }, [playingLesson, onPlayingChange]);

  useEffect(() => {
    return () => {
      onPlayingChange?.(false);
      onRegisterBackAction?.(null);
    };
  }, [onPlayingChange, onRegisterBackAction]);

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

        const finishMsg = lang === 'ru'
          ? `Поздравляем! Тест завершён.\nПравильных ответов: ${correctCount}/${lessonQuiz.questions.length}\nЗвёзды: ${'⭐️'.repeat(stars)}\nНейроны зачислены на ваш счёт!`
          : `Tabriklaymiz! Test yakunlandi.\nTo'g'ri javoblar: ${correctCount}/${lessonQuiz.questions.length}\nYulduzlar: ${'⭐️'.repeat(stars)}\nHisobingizga neyronlar qo'shildi!`;
        alert(finishMsg);
        
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
      <div className={`fixed inset-0 z-50 flex flex-col p-4 max-w-md sm:max-w-2xl desktop:max-w-4xl mx-auto ${
        isLight ? 'bg-[#F2F2F7] text-[#1C1C1E]' : 'bg-black/95 text-white'
      }`}>
        <div className={`flex items-center justify-between py-3 border-b ${
          isLight ? 'border-black/10' : 'border-white/10'
        }`}>
          <button 
            onClick={() => setLessonQuiz(null)}
            className={`w-9 h-9 rounded-full flex items-center justify-center active:scale-95 ${
              isLight ? 'bg-white border border-black/10 text-[#1C1C1E] shadow-sm' : 'bg-[#1C1C1E] text-white'
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-bold text-blue-500">
            {lang === 'ru'
              ? `Вопрос ${lessonQuiz.currentQ + 1} / ${lessonQuiz.questions.length}`
              : `Savol ${lessonQuiz.currentQ + 1} / ${lessonQuiz.questions.length}`}
          </span>
          <div className="w-9" />
        </div>

        <div className="flex-1 flex flex-col justify-center py-6">
          {q.image_url && !q.image_url.startsWith('cp_meta:') && (
            <div className={`relative w-full aspect-video rounded-2xl overflow-hidden mb-4 border bg-black ${
              isLight ? 'border-black/10' : 'border-white/10'
            }`}>
              <img src={q.image_url} alt="" className="w-full h-full object-contain" />
            </div>
          )}

          <h3 className={`text-lg font-bold mb-6 leading-snug ${isLight ? 'text-[#1C1C1E]' : 'text-white'}`}>
            {q.text}
          </h3>

          <div className="space-y-3">
            {(q.options || []).map((opt, optIdx) => (
              <button
                key={optIdx}
                onClick={() => handleAnswerQuiz(optIdx)}
                className={`w-full p-4 rounded-2xl border hover:border-blue-500/50 text-left text-sm font-semibold flex items-center gap-3 active:scale-98 transition-all ${
                  isLight
                    ? 'bg-white border-black/[0.08] text-[#1C1C1E] shadow-sm'
                    : 'bg-[#1C1C1E] border-white/10 text-white'
                }`}
              >
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  isLight ? 'bg-gray-100 text-gray-700' : 'bg-[#2C2C2E] text-white/70'
                }`}>
                  {['A', 'B', 'C', 'D'][optIdx]}
                </span>
                <span className="flex-1">{opt}</span>
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
            alert(
              lang === 'ru'
                ? 'Вопросы к этому уроку ещё готовятся. Вы можете пройти общие тесты в разделе «Тесты».'
                : "Ushbu dars uchun savollar ustoz tomonidan tayyorlanmoqda. Umumiy testlarni Testlar bo'limida yechishingiz mumkin."
            );
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
  const currentSubjectTitle = isBio
    ? (lang === 'ru' ? 'БИОЛОГИЯ' : 'BIOLOGIYA')
    : isKimyo
    ? (lang === 'ru' ? 'ХИМИЯ' : 'KIMYO')
    : isMatem
    ? (lang === 'ru' ? 'МАТЕМАТИКА' : 'MATEMATIKA')
    : (activeSubject?.name || (lang === 'ru' ? 'ПРЕДМЕТ' : 'FAN')).toUpperCase();

  // Distinct custom high-res background & video per subject
  let subjectImage = activeSubject?.image_url;
  if (isBio) {
    subjectImage = '/banners/biologiya_banner.jpg';
  } else if (isKimyo) {
    subjectImage = '/banners/kimyo_banner.jpg';
  } else if (isMatem) {
    subjectImage = 'https://images.unsplash.com/photo-1633424974203-6c91b2a651ee?auto=format&fit=crop&w=1200&q=85';
  } else if (!subjectImage || subjectImage.includes('unsplash.com/photo-1530026405186') || subjectImage.includes('photo-1635070041078') || subjectImage.includes('photo-1451187580459')) {
    subjectImage = '/banners/biologiya_banner.jpg';
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
      className={`w-full select-none flex flex-col ${
        isLight ? 'text-[#1C1C1E]' : 'text-white'
      } ${
        currentView === 'carousel' ? 'h-full flex-1 overflow-hidden' : 'min-h-full'
      }`}
      style={{
        paddingBottom: isDesktop
          ? '0px'
          : (currentView === 'carousel' 
              ? 'calc(var(--safe-area-bottom, 0px) + 74px)' 
              : 'calc(var(--safe-area-bottom, 0px) + 88px)')
      }}
    >
      {/* ──────────────────────────────────────────────────────────
          SCREEN 1: HERO SUBJECT CAROUSEL BANNER (STRETCHED & THEMED)
      ────────────────────────────────────────────────────────── */}
      {currentView === 'carousel' && (
        isDesktop ? (
          <div 
            className="w-full max-w-7xl mx-auto pr-4 py-1 flex flex-col items-center justify-center h-screen overflow-hidden animate-in fade-in duration-300"
            style={{
              paddingLeft: 'calc(var(--safe-area-left, 0px) + 72px)'
            }}
          >
            <DesktopSubjectCarousel
              subjects={subjects}
              activeSubjectIndex={activeSubjectIndex}
              onSubjectChange={(idx) => setActiveSubjectIndex(idx)}
              onStartSubject={(sub) => {
                if (sub) {
                  const idx = subjects.findIndex(s => s.id === sub.id);
                  if (idx !== -1) setActiveSubjectIndex(idx);
                }
                setCurrentView('subject_hub');
              }}
            />
          </div>
        ) : (
        <div 
          className="h-full flex-1 flex flex-col items-center px-4 pt-2 pb-2 w-full max-w-md mx-auto overflow-hidden select-none gap-3"
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
          {/* Card Container — explicit height leaves room for dots below */}
          <div className="relative w-full flex-1 min-h-0 overflow-hidden rounded-[28px]">
            <AnimatePresence initial={false} custom={slideDirection} mode="sync">
              <motion.div 
                key={activeSubjectIndex}
                custom={slideDirection}
                variants={{
                  enter: (dir) => ({
                    x: dir > 0 ? 'calc(100% + 20px)' : 'calc(-100% - 20px)',
                    opacity: 1,
                  }),
                  center: {
                    x: 0,
                    opacity: 1,
                    transition: {
                      x: { type: "tween", ease: [0.32, 0.72, 0, 1], duration: 0.4 },
                      opacity: { duration: 0 },
                    }
                  },
                  exit: (dir) => ({
                    x: dir > 0 ? 'calc(-100% - 20px)' : 'calc(100% + 20px)',
                    opacity: 1,
                    transition: {
                      x: { type: "tween", ease: [0.32, 0.72, 0, 1], duration: 0.4 },
                      opacity: { duration: 0 },
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
                className={`absolute inset-0 w-full h-full rounded-[28px] overflow-hidden border ${cardBorderClass} ${cardShadowClass} bg-gradient-to-b ${cardBgGradient} cursor-pointer group active:scale-[0.99] transition-transform duration-150 flex flex-col justify-between p-5 sm:p-6 select-none`}
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
                    <span>{lang === 'ru' ? 'Начать' : 'Boshlash'}</span>
                  </button>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Carousel Pagination Dots — always below card, never overlapping */}
          <div className="relative z-10 flex items-center justify-center gap-2 py-0.5 flex-shrink-0 w-full">
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
                    ? isLight
                      ? 'w-6 bg-[#007AFF] shadow-[0_0_8px_rgba(0,122,255,0.45)]'
                      : 'w-6 bg-white shadow-[0_0_8px_white]'
                    : isLight
                    ? 'w-1.5 bg-black/20'
                    : 'w-1.5 bg-white/30'
                }`}
                aria-label={lang === 'ru' ? `Предмет ${idx + 1}` : `Fan ${idx + 1}`}
              />
            ))}
          </div>
        </div>
        )
      )}

      {/* ──────────────────────────────────────────────────────────
          SCREEN 2: SUBJECT HUB (RESPONSIVE COURSE GRID & RECENT LESSON)
      ────────────────────────────────────────────────────────── */}
      {currentView === 'subject_hub' && (
        <div className="w-full max-w-md sm:max-w-4xl desktop:max-w-7xl mx-auto px-4 desktop:px-2 pt-3 pb-8 animate-in fade-in duration-300">
          {isDesktop && (
            <div className="mb-3">
              <button
                type="button"
                onClick={() => {
                  impactLight();
                  setCurrentView('carousel');
                }}
                className={`inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium transition-colors cursor-pointer ${
                  isLight ? 'text-gray-600 hover:text-[#1C1C1E]' : 'text-[#8E8E93] hover:text-white'
                }`}
              >
                <ArrowLeft className="w-4 h-4" />
                <span>{lang === 'ru' ? 'К предметам' : 'Fanlarga qaytish'}</span>
              </button>
            </div>
          )}
          {/* Search Input Bar with glass styling & visible Search icon */}
          <div className="relative mb-3">
            <Search className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none z-10 ${
              isLight ? 'text-gray-400' : 'text-white/60'
            }`} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (e.target.value.trim().length > 0) {
                  setCurrentView('lesson_list');
                }
              }}
              placeholder={lang === 'ru' ? 'Тема, термин или параграф' : 'Mavzu, termin yoki paragraf'}
              className={`w-full backdrop-blur-md border focus:border-[#007AFF] rounded-full py-2.5 pl-10 pr-4 text-xs outline-none transition-colors shadow-sm ${
                isLight
                  ? 'bg-white border-black/10 text-[#1C1C1E] placeholder-gray-400'
                  : 'bg-[#1C1C1E]/85 border-white/10 text-white placeholder-[#8E8E93]'
              }`}
            />
          </div>

          {/* Filter Chips (Barchasi removed; active chip toggles off on second tap) */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar mb-5 py-1">
            {LESSON_FILTER_TABS.map((tab) => {
              const isActive = activeFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    impactLight();
                    const next = activeFilter === tab.id ? 'all' : tab.id;
                    setActiveFilter(next);
                    if (next !== 'all') {
                      setCurrentView('lesson_list');
                    }
                  }}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap active:scale-95 ${
                    isActive
                      ? 'bg-[#007AFF] text-white shadow-md shadow-blue-500/20'
                      : isLight
                      ? 'bg-white border border-black/[0.08] text-gray-600 hover:text-[#1C1C1E] shadow-sm'
                      : 'bg-[#1C1C1E] border border-white/5 text-[#8E8E93] hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Responsive Grid of Thematic Courses: 3 cols on wide/PC, 2 on tablet, 1 on phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5 mb-6">
            {courses.length > 0 ? (
              courses.map((course, idx) => (
                <div
                  key={course.id || idx}
                  onClick={() => {
                    impactLight();
                    setSelectedCourse(course);
                    setCurrentView('lesson_list');
                  }}
                  className={`relative aspect-[16/10] rounded-2xl sm:rounded-3xl overflow-hidden border hover:border-emerald-500/45 cursor-pointer active:scale-[0.98] transition-all group ${
                    isLight ? 'border-black/10 shadow-lg bg-white' : 'border-white/10 shadow-xl bg-[#1C1C1E]'
                  }`}
                >
                  <img 
                    src={course.image_url || DEFAULT_COVER_IMAGE} 
                    alt={course.title} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-black/10" />

                  <div className="absolute bottom-4 left-4 right-4">
                    <h4 className="font-display text-white font-extrabold text-xl sm:text-2xl tracking-tight leading-tight first-letter:uppercase drop-shadow-md group-hover:text-emerald-300 transition-colors">
                      {course.title}
                    </h4>
                  </div>
                </div>
              ))
            ) : (
              <div className={`col-span-full p-5 border rounded-2xl text-center text-xs ${
                isLight ? 'bg-white border-black/[0.06] text-gray-500 shadow-sm' : 'bg-[#1C1C1E] border-white/5 text-[#8E8E93]'
              }`}>
                {lang === 'ru' ? 'В этом предмете пока нет курсов' : 'Ushbu fanda kurslar mavjud emas'}
              </div>
            )}
          </div>

          {/* "Ko'rishni davom ettirish" (Continue Watching Section) */}
          {lastWatchedLesson && (
            <div className="mb-4">
              <span className={`text-xs font-bold block mb-2 px-1 ${isLight ? 'text-gray-600' : 'text-[#8E8E93]'}`}>
                {lang === 'ru' ? 'Продолжить просмотр' : 'Ko‘rishni davom ettirish'}
              </span>

              <div
                onClick={() => handleStartLesson(lastWatchedLesson)}
                className={`border rounded-2xl p-3 flex items-center justify-between cursor-pointer active:scale-[0.98] transition-all shadow-md ${
                  isLight
                    ? 'bg-white border-black/[0.08] hover:border-black/15'
                    : 'bg-[#1C1C1E] border-white/5 hover:border-white/10'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`relative w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 ${
                    isLight ? 'bg-gray-200' : 'bg-[#2C2C2E]'
                  }`}>
                    <img 
                      src={getLessonCover(lastWatchedLesson)} 
                      alt="" 
                      className="w-full h-full object-cover" 
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <Play className="w-4 h-4 fill-white text-white ml-0.5" />
                    </div>
                  </div>

                  <div className="min-w-0 flex-1">
                    <h5 className={`font-bold text-xs truncate leading-snug mb-1 ${
                      isLight ? 'text-[#1C1C1E]' : 'text-white'
                    }`}>
                      {lastWatchedLesson.title}
                    </h5>

                    <div className={`w-full h-1 rounded-full overflow-hidden ${isLight ? 'bg-black/10' : 'bg-white/10'}`}>
                      <div 
                        className="h-full bg-emerald-500 rounded-full" 
                        style={{ width: `${lastWatchedPct || 40}%` }} 
                      />
                    </div>
                  </div>
                </div>

                <ChevronRight className="w-4 h-4 text-[#8E8E93] flex-shrink-0 ml-2" />
              </div>
            </div>
          )}

        </div>
      )}

      {/* ──────────────────────────────────────────────────────────
          SCREEN 3: LESSON LIST & SEARCH RESULTS
      ────────────────────────────────────────────────────────── */}
      {currentView === 'lesson_list' && (
        <div className="w-full max-w-md sm:max-w-4xl desktop:max-w-7xl mx-auto px-4 desktop:px-2 pt-3 pb-8 animate-in fade-in duration-300">
          {isDesktop && (
            <div className="mb-3 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  impactLight();
                  setCurrentView('subject_hub');
                  setSelectedCourse(null);
                  setSearchQuery('');
                }}
                className={`inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium transition-colors cursor-pointer ${
                  isLight ? 'text-gray-600 hover:text-[#1C1C1E]' : 'text-[#8E8E93] hover:text-white'
                }`}
              >
                <ArrowLeft className="w-4 h-4" />
                <span>{lang === 'ru' ? 'Назад' : 'Orqaga'}</span>
              </button>
              {selectedCourse?.title && (
                <span className={`text-xs font-bold px-3 py-1 rounded-full border ${
                  isLight ? 'bg-white border-black/[0.08] text-gray-700' : 'bg-[#1C1C1E] border-white/10 text-white/80'
                }`}>
                  {selectedCourse.title}
                </span>
              )}
            </div>
          )}
          {/* Search Input Bar with Clear button, visible Search icon & glass styling */}
          <div className="relative mb-3">
            <Search className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none z-10 ${
              isLight ? 'text-gray-400' : 'text-white/60'
            }`} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={lang === 'ru' ? 'Тема, термин или параграф' : 'Mavzu, termin yoki paragraf'}
              className={`w-full backdrop-blur-md border focus:border-[#007AFF] rounded-full py-2.5 pl-10 pr-9 text-xs outline-none transition-colors shadow-sm ${
                isLight
                  ? 'bg-white border-black/10 text-[#1C1C1E] placeholder-gray-400'
                  : 'bg-[#1C1C1E]/85 border-white/10 text-white placeholder-[#8E8E93]'
              }`}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className={`absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center z-10 ${
                  isLight ? 'bg-gray-200 text-gray-600 hover:text-gray-900' : 'bg-[#2C2C2E] text-[#8E8E93] hover:text-white'
                }`}
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Filter Chips (no Barchasi button; toggleable filters) */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar mb-5 py-1">
            {LESSON_FILTER_TABS.map((tab) => {
              const isActive = activeFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    impactLight();
                    setActiveFilter(prev => prev === tab.id ? 'all' : tab.id);
                  }}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap active:scale-95 ${
                    isActive
                      ? 'bg-[#007AFF] text-white shadow-md shadow-blue-500/20'
                      : isLight
                      ? 'bg-white border border-black/[0.08] text-gray-600 hover:text-[#1C1C1E] shadow-sm'
                      : 'bg-[#1C1C1E] border border-white/5 text-[#8E8E93] hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Lessons: Grid Cards (like Courses) on Tablet/PC, Compact Rows on Phone */}
          {filteredLessons.length > 0 ? (
            <>
              {/* Phone Portrait Compact Row List */}
              <div className="space-y-2.5 sm:hidden mb-6">
                {filteredLessons.map((lesson, idx) => {
                  const isSaved = savedLessonIds.includes(lesson.id);
                  const realDuration = getLessonDuration(lesson);

                  return (
                    <div
                      key={lesson.id || idx}
                      onClick={() => handleStartLesson(lesson)}
                      className={`border rounded-2xl p-2.5 flex items-center gap-3 cursor-pointer active:scale-[0.98] transition-all shadow-md group ${
                        isLight
                          ? 'bg-white border-black/[0.08] hover:border-blue-500/40'
                          : 'bg-[#1C1C1E] border-white/5 hover:border-white/15'
                      }`}
                    >
                      {/* 16:9 Thumbnail Box */}
                      <div className={`relative w-28 aspect-video rounded-xl overflow-hidden flex-shrink-0 ${
                        isLight ? 'bg-gray-200' : 'bg-[#2C2C2E]'
                      }`}>
                        <img 
                          src={getLessonCover(lesson)} 
                          alt={lesson.title} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                        />
                        {realDuration && (
                          <div className="absolute bottom-1 left-1 bg-black/80 backdrop-blur-md px-1.5 py-0.5 rounded text-[9px] font-mono font-bold text-white flex items-center gap-1">
                            <Play className="w-2 h-2 fill-white" />
                            <span>{realDuration}</span>
                          </div>
                        )}
                      </div>

                      {/* Lesson Title & Category */}
                      <div className="flex-1 min-w-0 pr-1">
                        <h4 className={`font-bold text-xs leading-snug line-clamp-2 mb-1 transition-colors ${
                          isLight ? 'text-[#1C1C1E] group-hover:text-blue-600' : 'text-white group-hover:text-blue-400'
                        }`}>
                          {lesson.title}
                        </h4>
                        <span className={`text-[11px] block truncate ${isLight ? 'text-gray-500' : 'text-[#8E8E93]'}`}>
                          {getLessonCategory(lesson)}
                        </span>
                      </div>

                      {/* Bookmark Button */}
                      <button
                        onClick={(e) => toggleBookmark(e, lesson.id)}
                        className={`w-8 h-8 rounded-full flex items-center justify-center active:scale-90 transition-transform flex-shrink-0 ${
                          isLight ? 'bg-gray-100 text-gray-600' : 'bg-[#2C2C2E] text-white/80'
                        }`}
                        title={t('saqlash')}
                      >
                        {isSaved ? (
                          <BookmarkCheck className="w-4 h-4 text-amber-500" />
                        ) : (
                          <Bookmark className="w-4 h-4 text-[#8E8E93]" />
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Tablet & PC Rich Course-Style Visual Card Grid */}
              <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5 mb-6">
                {filteredLessons.map((lesson, idx) => {
                  const isSaved = savedLessonIds.includes(lesson.id);
                  const realDuration = getLessonDuration(lesson);

                  return (
                    <div
                      key={lesson.id || idx}
                      onClick={() => handleStartLesson(lesson)}
                      className={`relative aspect-[16/10] rounded-2xl sm:rounded-3xl overflow-hidden border hover:border-blue-500/45 cursor-pointer active:scale-[0.98] transition-all group ${
                        isLight ? 'border-black/10 shadow-lg bg-white' : 'border-white/10 shadow-xl bg-[#1C1C1E]'
                      }`}
                    >
                      <img 
                        src={getLessonCover(lesson)} 
                        alt={lesson.title} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-black/15" />

                      {/* Top Row: Real Duration Badge + Bookmark Button */}
                      <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                        {realDuration ? (
                          <div className="bg-black/70 backdrop-blur-md border border-white/10 px-2.5 py-1 rounded-full text-[11px] font-mono font-bold text-white flex items-center gap-1.5 shadow">
                            <Play className="w-2.5 h-2.5 fill-white" />
                            <span>{realDuration}</span>
                          </div>
                        ) : (
                          <div />
                        )}

                        <button
                          onClick={(e) => toggleBookmark(e, lesson.id)}
                          className="w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/15 flex items-center justify-center text-white active:scale-90 transition-all"
                          title={t('saqlash')}
                        >
                          {isSaved ? (
                            <BookmarkCheck className="w-4 h-4 text-amber-400" />
                          ) : (
                            <Bookmark className="w-4 h-4 text-white/80" />
                          )}
                        </button>
                      </div>

                      {/* Bottom Lesson Title & Category */}
                      <div className="absolute bottom-4 left-4 right-4">
                        <h4 className="font-display text-white font-extrabold text-lg lg:text-xl tracking-tight leading-snug line-clamp-2 drop-shadow-md group-hover:text-blue-300 transition-colors">
                          {lesson.title}
                        </h4>
                        <span className="text-xs text-white/65 font-medium block truncate mt-0.5">
                          {getLessonCategory(lesson)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            /* Empty State */
            <div className={`border rounded-3xl p-8 text-center my-6 ${
              isLight ? 'bg-white border-black/[0.08] shadow-sm' : 'bg-[#1C1C1E] border-white/5'
            }`}>
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center mx-auto mb-3 text-[#8E8E93] ${
                isLight ? 'bg-gray-100' : 'bg-white/5'
              }`}>
                {!searchQuery.trim() && activeFilter === 'saved'
                  ? <Bookmark className="w-5 h-5" />
                  : <Search className="w-5 h-5" />}
              </div>
              <h4 className={`font-bold text-xs mb-1 ${isLight ? 'text-[#1C1C1E]' : 'text-white'}`}>
                {!searchQuery.trim() && activeFilter === 'saved'
                  ? (lang === 'ru' ? 'Нет сохранённых уроков' : 'Saqlangan darslar yo‘q')
                  : (lang === 'ru' ? 'Уроки не найдены' : 'Dars topilmadi')}
              </h4>
              <p className={`text-[11px] mb-4 ${isLight ? 'text-gray-500' : 'text-[#8E8E93]'}`}>
                {!searchQuery.trim() && activeFilter === 'saved'
                  ? (lang === 'ru' ? 'Нажмите на закладку на карточке урока, чтобы сохранить его' : 'Dars kartochkasidagi saqlash belgisini bosing')
                  : !searchQuery.trim() && activeFilter !== 'all'
                  ? (lang === 'ru' ? 'В этой категории пока нет уроков' : 'Bu bo‘limda hozircha darslar yo‘q')
                  : (lang === 'ru' ? 'Попробуйте поискать по другому запросу' : 'Boshqa kalit so‘z bilan qidirib ko‘ring')}
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCourse(null);
                  setActiveFilter('all');
                }}
                className={`px-4 py-2 text-xs font-bold rounded-xl ${
                  isLight ? 'bg-gray-100 hover:bg-gray-200 text-[#1C1C1E]' : 'bg-[#2C2C2E] text-white'
                }`}
              >
                {!searchQuery.trim() && activeFilter !== 'all'
                  ? (lang === 'ru' ? 'Сбросить фильтр' : 'Filtrni tozalash')
                  : t('qidiruvni_tozalash')}
              </button>
            </div>
          )}

        </div>
      )}

    </div>
  );
}
