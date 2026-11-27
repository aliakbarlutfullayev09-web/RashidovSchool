import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, Clock, AlertTriangle, CheckCircle2, XCircle, ArrowLeft, ArrowRight,
  RotateCcw, BookOpen, Search, ChevronRight, Check,
  Award, Zap, UserCheck, FileText, CheckCircle,
  Dna, FlaskConical, Calculator
} from 'lucide-react';
import SubjectBannerEffects from '../components/SubjectBannerEffects';
import ConfettiBurst from '../components/ConfettiBurst';
import ExamMistakeReview, {
  buildExamResultKey,
  evaluateQuestionAnswer,
  loadSavedExamResults,
  saveExamResultLocal
} from '../components/ExamMistakeReview';
import { getSubjects, getExamPortalData, saveExamProgress } from '../api/supabase';
import { mockSubjects } from '../mock/data';
import {
  DEFAULT_EXAM_PORTAL_DATA,
  createSubjectSkeleton,
  formatDurationLabel,
  localizeDifficulty,
  localizeModeConfig,
  localizeVariant,
  normalizeSubjectKey
} from '../api/examDefaults';
import { isUzbekMatch } from '../utils/uzbekFuzzy';
import { useHaptic } from '../hooks/useHaptic';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { useTelegram } from '../hooks/useTelegram';
import { useIsDesktop } from '../hooks/useIsDesktop';
import DesktopSubjectCarousel from '../components/DesktopSubjectCarousel';

const adaptChipClass = (cls, isLight) => {
  if (!isLight || !cls) return cls;
  return cls
    .replace('text-emerald-400', 'text-emerald-700')
    .replace('text-amber-400', 'text-amber-700')
    .replace('text-purple-400', 'text-purple-700')
    .replace('text-blue-400', 'text-blue-700')
    .replace('text-amber-300', 'text-amber-700');
};

export default function TestlarPage({ user, onRegisterBackAction, onExamActiveChange }) {
  const { t, lang } = useLanguage();
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === 'light';
  const { selectionChanged, impactLight, impactMedium, notificationSuccess, notificationError } = useHaptic();
  const { setClosingConfirmation } = useTelegram();

  // Navigation views: 'carousel' (Screen 1) | 'mode_select' (Screen 2) | 'test_list' (Screen 3)
  const [currentView, setCurrentView] = useState('carousel');

  // Subjects & Carousel state (seed with mockSubjects to prevent blank frame before fetch completes)
  const [subjects, setSubjects] = useState(mockSubjects);
  const [examPortalData, setExamPortalData] = useState(DEFAULT_EXAM_PORTAL_DATA);
  const [activeSubjectIndex, setActiveSubjectIndex] = useState(0);
  const [slideDirection, setSlideDirection] = useState(1);

  // Selected state
  const [selectedSubjectKey, setSelectedSubjectKey] = useState('biologiya');
  const [selectedMode, setSelectedMode] = useState('sertifikat'); // 'sertifikat' | 'dtm'
  const [selectedTest, setSelectedTest] = useState(null);

  // Exam Runner State (Screen 4)
  const isDesktop = useIsDesktop();
  const [examActive, setExamActive] = useState(false);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(6000);
  const [cheatWarnings, setCheatWarnings] = useState(0);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [visitedQuestions, setVisitedQuestions] = useState(new Set([0]));

  // Results & Mistake Review State
  const [examFinished, setExamFinished] = useState(false);
  const [confettiKey, setConfettiKey] = useState(0);
  const [savedResultsMap, setSavedResultsMap] = useState(() =>
    loadSavedExamResults(user?.telegram_id || user?.id)
  );
  const [reviewEntry, setReviewEntry] = useState(null);
  const userAnswersRef = useRef({});
  const finishedOnceRef = useRef(false);

  useEffect(() => {
    setSavedResultsMap(loadSavedExamResults(user?.telegram_id || user?.id));
  }, [user?.telegram_id, user?.id]);

  // Touch handling for carousel
  const touchStartXRef = useRef(0);
  const touchStartYRef = useRef(0);

  // Load subjects and admin-configured exam portal data on mount
  useEffect(() => {
    async function load() {
      try {
        const dbSubjects = await getSubjects();
        const rows = dbSubjects && dbSubjects.length > 0 ? dbSubjects : [];
        if (rows.length > 0) {
          setSubjects(rows);
        }
        const portal = await getExamPortalData(rows);
        if (portal) {
          setExamPortalData(portal);
        }
      } catch (e) {
        console.warn("Error loading subjects/tests in Testlar:", e);
      }
    }
    load();
  }, []);

  const activeSubject = subjects[activeSubjectIndex] || subjects[0] || { 
    id: 1, 
    key: 'biologiya', 
    name: 'Biologiya'
  };

  // Subject Key & Details
  const normKey = (activeSubject?.key || activeSubject?.name || '').toString().toLowerCase();
  const isBio = normKey.includes('bio') || normKey.includes('био') || activeSubject?.id === 1;
  const isKimyo = normKey.includes('kim') || normKey.includes('хим') || activeSubject?.id === 2;
  const isMatem = normKey.includes('mat') || normKey.includes('мат') || activeSubject?.id === 3;

  const currentSubjectKey = isBio ? 'biologiya' : isKimyo ? 'kimyo' : isMatem ? 'matematika' : (activeSubject?.key || 'biologiya');
  const currentSubjectTitle = isBio
    ? (lang === 'ru' ? 'БИОЛОГИЯ' : 'BIOLOGIYA')
    : isKimyo
    ? (lang === 'ru' ? 'ХИМИЯ' : 'KIMYO')
    : isMatem
    ? (lang === 'ru' ? 'МАТЕМАТИКА' : 'MATEMATIKA')
    : (activeSubject?.name || (lang === 'ru' ? 'ПРЕДМЕТ' : 'FAN')).toUpperCase();

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

  // Carousel handlers
  const handleNextSubject = () => {
    impactLight();
    setSlideDirection(1);
    setActiveSubjectIndex((prev) => (prev + 1) % (subjects.length || 3));
  };

  const handlePrevSubject = () => {
    impactLight();
    setSlideDirection(-1);
    setActiveSubjectIndex((prev) => (prev - 1 + (subjects.length || 3)) % (subjects.length || 3));
  };

  // Enter Mode Selection (Screen 2)
  const handleSelectSubject = (key) => {
    impactMedium();
    const resolvedKey = normalizeSubjectKey(key || currentSubjectKey);
    setSelectedSubjectKey(resolvedKey);
    const subBundle = examPortalData?.subjects?.[resolvedKey] || DEFAULT_EXAM_PORTAL_DATA.subjects[resolvedKey];
    const sertEnabled = subBundle?.modes?.sertifikat?.enabled ?? true;
    const dtmEnabled = subBundle?.modes?.dtm?.enabled ?? true;
    setSelectedMode(dtmEnabled ? 'dtm' : sertEnabled ? 'sertifikat' : 'dtm');
    setCurrentView('mode_select');
  };

  // Enter Tests List (Screen 3)
  const handleSelectMode = (mode) => {
    impactMedium();
    setSelectedMode(mode);
    setCurrentView('test_list');
  };

  // Launch Exam Runner (Screen 4)
  const handleStartExam = (test) => {
    if (!test?.questions || test.questions.length === 0) {
      alert(
        lang === 'ru'
          ? 'В этом варианте пока нет добавленных вопросов.'
          : 'Ushbu variantda hozircha savollar kiritilmagan.'
      );
      return;
    }
    impactMedium();
    userAnswersRef.current = {};
    finishedOnceRef.current = false;
    setReviewEntry(null);
    setSelectedTest(test);
    setCurrentQIndex(0);
    setUserAnswers({});
    setTimeLeft((test?.durationMinutes || activeModeConfig?.durationMinutes || 100) * 60);
    setCheatWarnings(0);
    setShowWarningModal(false);
    setVisitedQuestions(new Set([0]));
    setExamActive(true);
    setExamFinished(false);
  };

  // Exit Exam Confirm Handler
  const handleExitExam = () => {
    const msg = lang === 'ru'
      ? 'Вы хотите остановить тест? Результаты не сохранятся.'
      : "Testni to'xtatmoqchimisiz? Natijalar saqlanmaydi.";
    if (window.confirm(msg)) {
      impactLight();
      setExamActive(false);
      setExamFinished(false);
      setShowWarningModal(false);
      setCurrentView('test_list');
    }
  };

  // Finish Exam Handler
  const handleFinishExam = () => {
    if (finishedOnceRef.current) return;
    finishedOnceRef.current = true;

    const latestAnswers = userAnswersRef.current || userAnswers;
    impactMedium();
    setExamActive(false);
    setExamFinished(true);
    setConfettiKey(prev => prev + 1);
    notificationSuccess();

    const uid = user?.telegram_id || user?.id;
    const targetMaxScore = selectedTest?.maxScore || activeModeConfig?.maxScore || (selectedMode === 'dtm' ? 93 : 75);
    const qWeight = selectedMode === 'dtm' ? 3.1 : (targetMaxScore / (activeQuestions.length || 1));
    let cCount = 0;
    activeQuestions.forEach((q, idx) => {
      if (evaluateQuestionAnswer(q, latestAnswers[idx])) cCount++;
    });
    const score = (cCount * qWeight).toFixed(1);
    const ratio = cCount / (activeQuestions.length || 1);
    const percentage = Math.min(100, Math.round(ratio * 100));
    const stars = ratio >= 0.8 ? 3 : ratio >= 0.5 ? 2 : 1;
    let grade = 'C';
    if (percentage >= 90) grade = 'A+';
    else if (percentage >= 80) grade = 'A';
    else if (percentage >= 70) grade = 'B+';
    else if (percentage >= 60) grade = 'B';

    const testId = selectedTest?.id || 'exam-1';
    const nextMap = saveExamResultLocal(uid, selectedSubjectKey, selectedMode, testId, {
      testId,
      subjectKey: selectedSubjectKey,
      mode: selectedMode,
      score,
      maxScore: targetMaxScore,
      correctCount: cCount,
      totalQuestions: activeQuestions.length,
      percentage,
      certGrade: grade,
      userAnswers: { ...latestAnswers },
      completedAt: new Date().toISOString(),
    });
    setSavedResultsMap(nextMap);

    if (uid) {
      saveExamProgress(uid, selectedSubjectKey, selectedMode, testId, score, stars);
    }
  };

  // Back Navigation Registration
  useEffect(() => {
    if (typeof onRegisterBackAction !== 'function') return;

    if (examActive) {
      onRegisterBackAction(() => handleExitExam());
    } else if (examFinished) {
      onRegisterBackAction(() => {
        impactLight();
        setExamFinished(false);
        setCurrentView('test_list');
      });
    } else if (reviewEntry) {
      onRegisterBackAction(() => {
        impactLight();
        setReviewEntry(null);
      });
    } else if (currentView === 'test_list') {
      onRegisterBackAction(() => {
        impactLight();
        setCurrentView('mode_select');
      });
    } else if (currentView === 'mode_select') {
      onRegisterBackAction(() => {
        impactLight();
        setCurrentView('carousel');
      });
    } else {
      onRegisterBackAction(null);
    }
    return () => {
      onRegisterBackAction?.(null);
    };
  }, [examActive, examFinished, reviewEntry, currentView, onRegisterBackAction]);

  // Notify App whether an actual exam session is actively running
  useEffect(() => {
    onExamActiveChange?.(examActive);
    return () => {
      onExamActiveChange?.(false);
    };
  }, [examActive, onExamActiveChange]);

  // Track visited questions for CAT navigation grid
  useEffect(() => {
    if (examActive) {
      setVisitedQuestions(prev => {
        const next = new Set(prev);
        next.add(currentQIndex);
        return next;
      });
    }
  }, [examActive, currentQIndex]);

  // Anti-cheat detector during active exam
  useEffect(() => {
    if (!examActive || examFinished) return;

    const handleVisibility = () => {
      if (document.hidden) {
        setCheatWarnings(prev => {
          const next = prev + 1;
          if (next >= 2) {
            handleFinishExam();
          } else {
            setShowWarningModal(true);
            notificationError();
          }
          return next;
        });
      }
    };

    window.addEventListener('visibilitychange', handleVisibility);
    return () => window.removeEventListener('visibilitychange', handleVisibility);
  }, [examActive, examFinished]);

  // Countdown Timer
  useEffect(() => {
    if (!examActive || examFinished) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleFinishExam();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [examActive, examFinished]);

  // Active Subject Data Bundle (Synced with admin-app)
  const activeSubjectData = examPortalData?.subjects?.[selectedSubjectKey]
    || examPortalData?.subjects?.biologiya
    || createSubjectSkeleton(selectedSubjectKey);
  const activeModeConfigRaw = activeSubjectData?.modes?.[selectedMode]
    || createSubjectSkeleton(selectedSubjectKey).modes[selectedMode];
  const activeModeConfig = localizeModeConfig(selectedMode, activeModeConfigRaw, lang);
  const activeModeTests = activeSubjectData?.[selectedMode] || [];
  const activeQuestions = selectedTest?.questions || activeModeTests[0]?.questions || [];
  const examMaxScore = selectedTest?.maxScore || activeModeConfig?.maxScore || (selectedMode === 'dtm' ? 93 : 75);

  // Answering
  const handleSelectAnswer = (qIndex, ans) => {
    impactLight();
    setUserAnswers(prev => {
      const next = { ...prev, [qIndex]: ans };
      userAnswersRef.current = next;
      return next;
    });
    setVisitedQuestions(prev => {
      if (prev.has(qIndex)) return prev;
      const next = new Set(prev);
      next.add(qIndex);
      return next;
    });
  };

  const renderExamQuestionBody = (q, qIndex, compact = false) => {
    if (!q) return null;

    if (q.type === 'matching') {
      const groupItems = q.groupId
        ? activeQuestions
            .map((item, idx) => ({ q: item, idx }))
            .filter(({ q: item }) => item?.type === 'matching' && item?.groupId === q.groupId)
        : [{ q, idx: qIndex }];

      const sharedPrompt = q.groupPrompt || groupItems[0]?.q?.groupPrompt || '';
      const sharedImage = q.groupImageUrl || q.imageUrl;
      const sharedOptions = Array.isArray(q.options) && q.options.length > 0
        ? q.options
        : (groupItems[0]?.q?.options || []);
      const letters = ['A', 'B', 'C', 'D', 'E', 'F'];

      return (
        <div className="space-y-4">
          {sharedImage && (
            <div className={`w-full max-h-60 rounded-2xl overflow-hidden border flex items-center justify-center p-2 ${
              isLight ? 'bg-gray-100 border-black/10' : 'bg-[#2C2C2E] border-white/10'
            }`}>
              <img
                src={sharedImage}
                alt={lang === 'ru' ? 'Иллюстрация' : 'Savol rasmi'}
                className="max-h-56 max-w-full object-contain rounded-xl"
              />
            </div>
          )}

          {sharedPrompt && (
            <h3 className={`font-bold leading-relaxed ${compact ? 'text-sm sm:text-base' : 'text-base sm:text-lg'} ${
              isLight ? 'text-[#1C1C1E]' : 'text-white'
            }`}>
              {sharedPrompt}
            </h3>
          )}

          {/* 6 Shared Available Variants (A..F) */}
          <div className={`rounded-2xl border p-3.5 space-y-2 ${
            isLight ? 'bg-[#F2F2F7] border-black/[0.08]' : 'bg-[#242426] border-white/[0.08]'
          }`}>
            <span className={`text-[10px] font-bold uppercase tracking-wider block ${
              isLight ? 'text-gray-500' : 'text-[#8E8E93]'
            }`}>
              {lang === 'ru' ? 'Доступные варианты (A–F):' : 'Mavjud variantlar (A–F):'}
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {sharedOptions.map((opt, oIdx) => (
                <div
                  key={oIdx}
                  className={`flex items-start gap-2.5 p-2 rounded-xl border text-xs ${
                    isLight
                      ? 'bg-white border-black/[0.06] text-[#1C1C1E]'
                      : 'bg-[#1C1C1E] border-white/[0.06] text-white/90'
                  }`}
                >
                  <span className="w-6 h-6 rounded-lg bg-[#007AFF]/15 text-[#007AFF] font-extrabold text-[11px] flex items-center justify-center shrink-0">
                    {letters[oIdx] || oIdx + 1}
                  </span>
                  <span className="leading-snug pt-0.5">{opt}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 3 Items Requested From the 6 Variants */}
          <div className="space-y-3" data-testid="matching-group-items">
            {groupItems.map((item) => {
              const isFocused = item.idx === qIndex;
              const selectedVal = userAnswers[item.idx];

              return (
                <div
                  key={item.idx}
                  data-testid={`matching-item-${item.idx + 1}`}
                  onClick={() => setCurrentQIndex(item.idx)}
                  className={`p-3.5 rounded-2xl border transition-all space-y-2.5 ${
                    isFocused
                      ? isLight
                        ? 'bg-blue-50/70 border-[#007AFF]/60'
                        : 'bg-[#007AFF]/10 border-[#007AFF]/50'
                      : isLight
                      ? 'bg-[#F8F8FA] border-black/[0.08]'
                      : 'bg-[#2C2C2E]/70 border-white/[0.08]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className={`text-xs sm:text-sm font-bold leading-snug ${
                      isLight ? 'text-[#1C1C1E]' : 'text-white'
                    }`}>
                      {item.idx + 1}. {item.q.text}
                    </span>
                    {selectedVal !== undefined && selectedVal !== null && (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-500 text-[11px] font-extrabold shrink-0">
                        {letters[selectedVal] || selectedVal + 1}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-6 gap-1.5">
                    {sharedOptions.map((_, oIdx) => {
                      const active = selectedVal === oIdx;
                      return (
                        <button
                          key={oIdx}
                          type="button"
                          data-testid={`matching-choice-${item.idx + 1}-${letters[oIdx]}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setCurrentQIndex(item.idx);
                            handleSelectAnswer(item.idx, oIdx);
                          }}
                          className={`py-2 rounded-xl font-extrabold text-xs transition-all active:scale-95 border cursor-pointer ${
                            active
                              ? 'bg-[#007AFF] border-[#007AFF] text-white shadow-sm'
                              : isLight
                              ? 'bg-white border-black/10 text-[#1C1C1E] hover:border-[#007AFF]/50'
                              : 'bg-[#1C1C1E] border-white/10 text-white/80 hover:border-white/30'
                          }`}
                        >
                          {letters[oIdx] || oIdx + 1}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    return (
      <>
        {q.imageUrl && (
          <div className={`w-full max-h-60 rounded-2xl overflow-hidden border mb-4 flex items-center justify-center p-2 ${
            isLight ? 'bg-gray-100 border-black/10' : 'bg-[#2C2C2E] border-white/10'
          }`}>
            <img
              src={q.imageUrl}
              alt={lang === 'ru' ? 'Иллюстрация к вопросу' : 'Savol rasmi'}
              className="max-h-56 max-w-full object-contain rounded-xl"
            />
          </div>
        )}

        <h3 className={`font-bold ${compact ? 'text-base' : 'text-lg'} leading-relaxed mb-4 ${
          isLight ? 'text-[#1C1C1E]' : 'text-white'
        }`}>
          {q.text}
        </h3>

        {q.type === 'input' ? (
          <div className="pt-2">
            <label className={`text-xs font-medium block mb-2 ${isLight ? 'text-gray-600' : 'text-[#8E8E93]'}`}>
              {lang === 'ru' ? 'Введите точный ответ:' : 'Aniq javobni kiriting:'}
            </label>
            <input
              type="text"
              data-testid="exam-input-answer"
              value={userAnswers[qIndex] || ''}
              onChange={(e) => handleSelectAnswer(qIndex, e.target.value)}
              placeholder={lang === 'ru' ? 'Введите ответ...' : 'Javobni kiriting...'}
              className={`w-full border rounded-2xl p-4 text-base font-bold outline-none transition-colors ${
                isLight
                  ? 'bg-[#F2F2F7] border-black/10 text-[#1C1C1E] focus:border-[#007AFF]'
                  : 'bg-[#2C2C2E] border-white/10 text-white focus:border-[#007AFF]'
              }`}
            />
          </div>
        ) : (
          <div className="space-y-2.5 pt-1">
            {(q.options || []).map((opt, oIdx) => {
              const isSelected = userAnswers[qIndex] === oIdx;
              const letter = ['A', 'B', 'C', 'D'][oIdx] || String(oIdx + 1);

              return (
                <button
                  key={oIdx}
                  type="button"
                  onClick={() => handleSelectAnswer(qIndex, oIdx)}
                  className={`w-full p-3.5 rounded-2xl border text-left text-sm font-semibold flex items-center justify-between transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#007AFF] ${
                    isSelected
                      ? isLight
                        ? 'bg-blue-50 border-[#007AFF] text-blue-950 shadow-sm'
                        : 'bg-[#007AFF]/15 border-[#007AFF] text-white'
                      : isLight
                      ? 'bg-[#F2F2F7] hover:bg-gray-200/80 border-black/[0.06] text-[#1C1C1E]'
                      : 'bg-[#2C2C2E] hover:bg-[#3A3A3C] border-white/[0.06] text-white/90'
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0 pr-3">
                    <span className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${
                      isSelected
                        ? 'bg-[#007AFF] text-white font-black'
                        : isLight
                        ? 'bg-white text-gray-700 border border-black/10'
                        : 'bg-[#1C1C1E] text-white/80 border border-white/10'
                    }`}>
                      {letter}
                    </span>
                    <span className="leading-snug">{opt}</span>
                  </div>

                  <div className={`w-6 h-6 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                    isSelected
                      ? 'border-[#007AFF] bg-[#007AFF] text-white'
                      : isLight ? 'border-black/20' : 'border-white/20'
                  }`}>
                    {isSelected && <Check className="w-4 h-4 stroke-[3]" />}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </>
    );
  };

  // Results Calculation
  let correctCount = 0;
  activeQuestions.forEach((q, idx) => {
    const userAns = userAnswers[idx];
    if (q.type === 'input') {
      if (userAns && isUzbekMatch(userAns, q.correctAnswer)) {
        correctCount++;
      }
    } else {
      if (userAns === q.correctIndex) {
        correctCount++;
      }
    }
  });

  const questionWeight = selectedMode === 'dtm' ? 3.1 : (examMaxScore / (activeQuestions.length || 1));
  const totalScore = (correctCount * questionWeight).toFixed(1);
  const grantProb = Math.min(100, Math.round((correctCount / (activeQuestions.length || 1)) * 100));

  let certGrade = 'C';
  if (grantProb >= 90) certGrade = 'A+';
  else if (grantProb >= 80) certGrade = 'A';
  else if (grantProb >= 70) certGrade = 'B+';
  else if (grantProb >= 60) certGrade = 'B';

  // ──────────────────────────────────────────────────────────
  // SCREEN 4: EXAM RUNNER
  // ──────────────────────────────────────────────────────────
  if (examActive) {
    const currentQ = activeQuestions[currentQIndex] || activeQuestions[0];
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    const localizedActiveTest = localizeVariant(selectedTest, lang);
    const subjectUpperBadge = isBio
      ? (lang === 'ru' ? 'БИОЛОГИЯ' : 'BIOLOGIYA')
      : isKimyo
      ? (lang === 'ru' ? 'ХИМИЯ' : 'KIMYO')
      : isMatem
      ? (lang === 'ru' ? 'МАТЕМАТИКА' : 'MATEMATIKA')
      : (activeSubject.name || (lang === 'ru' ? 'БИОЛОГИЯ' : 'Biologiya')).toUpperCase();

    // Desktop CAT exam layout (>= 1024px with hover/fine pointer)
    if (isDesktop) {
      return (
        <div className={`w-full min-h-screen p-4 xl:p-5 pb-8 select-none animate-in fade-in duration-300 ${
          isLight ? 'bg-[#F2F2F7] text-[#1C1C1E]' : 'bg-[#000000] text-white'
        }`}>
          {/* Top CAT Header Bar */}
          <div className={`max-w-7xl mx-auto flex items-center justify-between py-2.5 px-5 mb-4 rounded-2xl border shadow-sm ${
            isLight ? 'bg-white border-black/[0.08]' : 'bg-[#1C1C1E] border-white/[0.08]'
          }`}>
            <div className="flex items-center gap-4">
              <button
                onClick={handleExitExam}
                className={`w-9 h-9 rounded-xl border flex items-center justify-center active:scale-95 transition-all cursor-pointer ${
                  isLight
                    ? 'bg-[#F2F2F7] hover:bg-gray-200 border-black/10 text-[#1C1C1E]'
                    : 'bg-[#2C2C2E] hover:bg-[#3A3A3C] border-white/10 text-white/90'
                }`}
                title={lang === 'ru' ? 'Выйти' : 'Chiqish'}
                aria-label={lang === 'ru' ? 'Выйти из теста' : 'Testdan chiqish'}
              >
                <ArrowLeft className="w-4 h-4" />
              </button>

              <div>
                <div className="flex items-center gap-2">
                  <span className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                    isLight
                      ? 'bg-blue-500/10 text-blue-700 border-blue-500/25'
                      : 'bg-blue-500/15 text-blue-400 border-blue-500/25'
                  }`}>
                    {selectedMode === 'dtm'
                      ? (lang === 'ru' ? 'ДТМ Мок-тест' : 'DTM mock test')
                      : (lang === 'ru' ? 'Национальный сертификат' : 'Milliy Sertifikat')}
                  </span>
                  <span className={`text-xs ${isLight ? 'text-gray-500' : 'text-[#8E8E93]'}`}>
                    {subjectUpperBadge}
                  </span>
                </div>
                <h2 className={`font-bold text-sm sm:text-base mt-0.5 ${isLight ? 'text-[#1C1C1E]' : 'text-white'}`}>
                  {localizedActiveTest?.title || (lang === 'ru' ? 'Диагностический тест' : 'Diagnostik Test')}
                </h2>
              </div>
            </div>

            {/* Timer Capsule & Finish Button */}
            <div className="flex items-center gap-4">
              <div className={`flex items-center gap-2 border px-4 py-2 rounded-2xl text-sm font-mono font-bold shadow-sm ${
                isLight
                  ? 'bg-amber-50 border-amber-500/35 text-amber-700'
                  : 'bg-[#2C2C2E] border-white/10 text-amber-400'
              }`}>
                <Clock className={`w-4 h-4 ${isLight ? 'text-amber-600' : 'text-amber-400'}`} />
                <span>{minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}</span>
              </div>

              <button
                onClick={() => {
                  const confirmFinish = lang === 'ru' ? 'Завершить тест?' : 'Testni yakunlaysizmi?';
                  if (window.confirm(confirmFinish)) {
                    handleFinishExam();
                  }
                }}
                className={`border px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer ${
                  isLight
                    ? 'bg-red-50 hover:bg-red-100 border-red-500/30 text-red-600'
                    : 'bg-red-500/15 hover:bg-red-500/25 border-red-500/25 text-red-400 hover:text-red-300'
                }`}
              >
                {lang === 'ru' ? 'Завершить тест' : 'Testni yakunlash'}
              </button>
            </div>
          </div>

          {/* Main 2-Column CAT Container */}
          <div className="max-w-7xl mx-auto flex flex-row gap-6 items-start">
            
            {/* Left Column: Question area and Options */}
            <div className={`flex-1 min-w-0 flex flex-col justify-between border rounded-3xl p-6 shadow-lg relative min-h-[450px] ${
              isLight ? 'bg-white border-black/[0.08]' : 'bg-[#1C1C1E] border-white/[0.08]'
            }`}>
              
              <div>
                {/* Question Info Bar */}
                <div className={`flex items-center justify-between text-xs pb-3 mb-3 border-b ${
                  isLight ? 'text-gray-500 border-black/10' : 'text-[#8E8E93] border-white/[0.06]'
                }`}>
                  <span className={`font-extrabold text-base ${isLight ? 'text-[#1C1C1E]' : 'text-white'}`}>
                    {lang === 'ru' ? `Вопрос ${currentQIndex + 1}` : `${currentQIndex + 1}-Savol`}
                  </span>
                  {selectedMode === 'sertifikat' && (
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                      currentQ?.type === 'matching'
                        ? 'bg-amber-500/15 text-amber-500'
                        : currentQ?.type === 'input'
                        ? 'bg-purple-500/15 text-purple-400'
                        : 'bg-blue-500/15 text-blue-500'
                    }`}>
                      {currentQ?.type === 'matching'
                        ? (lang === 'ru' ? 'Соответствие (3 из 6)' : 'Moslashtirish (6 dan 3)')
                        : currentQ?.type === 'input'
                        ? (lang === 'ru' ? 'Письменный ответ' : 'Yozma javob')
                        : (lang === 'ru' ? 'Тест (A–D)' : 'Test (A–D)')}
                    </span>
                  )}
                </div>

                {renderExamQuestionBody(currentQ, currentQIndex, false)}
              </div>

              {/* Pinned Bottom Actions Bar */}
              <div className={`flex items-center justify-between gap-4 pt-5 mt-5 border-t ${
                isLight ? 'border-black/10' : 'border-white/[0.06]'
              }`}>
                <button
                  type="button"
                  onClick={() => setCurrentQIndex(prev => Math.max(0, prev - 1))}
                  disabled={currentQIndex === 0}
                  className={`px-6 py-3 rounded-2xl disabled:opacity-30 border font-bold text-xs inline-flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer disabled:cursor-not-allowed ${
                    isLight
                      ? 'bg-[#F2F2F7] hover:bg-gray-200 border-black/10 text-[#1C1C1E]'
                      : 'bg-[#2C2C2E] hover:bg-[#3A3A3C] border-white/[0.08] text-white'
                  }`}
                >
                  <ArrowLeft className="w-4 h-4 shrink-0" />
                  <span>{lang === 'ru' ? 'Предыдущий' : 'Oldingi'}</span>
                </button>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      if (currentQIndex < activeQuestions.length - 1) {
                        setCurrentQIndex(prev => prev + 1);
                      } else {
                        const msg = lang === 'ru'
                          ? 'Все вопросы просмотрены. Завершить тест?'
                          : "Barcha savollar ko'rib chiqildi. Testni yakunlaysizmi?";
                        if (window.confirm(msg)) {
                          handleFinishExam();
                        }
                      }
                    }}
                    className="px-8 py-3 rounded-2xl font-extrabold text-xs inline-flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-sm cursor-pointer bg-[#007AFF] hover:bg-[#0066D6] text-white"
                  >
                    {currentQIndex === activeQuestions.length - 1 ? (
                      <>
                        <span>{lang === 'ru' ? 'Завершить тест' : 'Testni yakunlash'}</span>
                        <Check className="w-4 h-4 shrink-0" />
                      </>
                    ) : (
                      <>
                        <span>{lang === 'ru' ? 'Следующий' : 'Keyingi'}</span>
                        <ArrowRight className="w-4 h-4 shrink-0" />
                      </>
                    )}
                  </button>
                </div>
              </div>

            </div>

            {/* Right Sticky Sidebar: Grid & Legend */}
            <div className="w-80 shrink-0 sticky top-4 flex flex-col gap-4">
              
              {/* Question Map Card */}
              <div className={`border rounded-3xl p-5 shadow-lg flex flex-col ${
                isLight ? 'bg-white border-black/[0.08]' : 'bg-[#1C1C1E] border-white/[0.08]'
              }`}>
                <div className={`flex items-center justify-end mb-3 pb-2 border-b ${
                  isLight ? 'border-black/10' : 'border-white/[0.06]'
                }`}>
                  <span className={`text-[11px] font-mono ${isLight ? 'text-gray-500' : 'text-[#8E8E93]'}`}>
                    {Object.values(userAnswers).filter(v => v !== undefined && v !== null && v !== '').length} / {activeQuestions.length}
                  </span>
                </div>

                {/* 5-Column Question Grid (padded inner box prevents corner highlight clipping) */}
                <div className="grid grid-cols-5 gap-2 max-h-[360px] overflow-y-auto no-scrollbar p-1">
                  {activeQuestions.map((_, idx) => {
                    const ansVal = userAnswers[idx];
                    const isAnswered = ansVal !== undefined && ansVal !== null && ansVal !== '';
                    const isCurrent = idx === currentQIndex;
                    const isVisited = visitedQuestions.has(idx);
                    const isSkipped = isVisited && !isAnswered && !isCurrent;

                    let statusClass = isLight
                      ? 'bg-[#F2F2F7] border border-black/10 text-gray-600 hover:border-black/25'
                      : 'bg-[#2C2C2E] border border-white/[0.06] text-[#8E8E93] hover:border-white/20';
                    let icon = null;

                    if (isCurrent) {
                      statusClass = 'bg-[#007AFF] text-white border border-[#007AFF] font-black shadow-sm';
                    } else if (isAnswered) {
                      statusClass = isLight
                        ? 'bg-emerald-500/15 text-emerald-700 border border-emerald-500/35 font-bold'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/35 font-bold';
                      icon = <Check className="w-2.5 h-2.5 stroke-[3] inline ml-0.5" />;
                    } else if (isSkipped) {
                      statusClass = isLight
                        ? 'bg-amber-500/10 text-amber-700 border border-amber-500/40 border-dashed font-bold'
                        : 'bg-amber-500/15 text-amber-300 border border-amber-500/40 border-dashed font-bold';
                    }

                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setCurrentQIndex(idx)}
                        title={lang === 'ru' ? `Вопрос ${idx + 1}` : `Savol ${idx + 1}`}
                        aria-label={lang === 'ru' ? `Вопрос ${idx + 1}` : `Savol ${idx + 1}`}
                        className={`h-10 rounded-xl flex items-center justify-center font-mono text-xs transition-colors cursor-pointer ${statusClass}`}
                      >
                        <span>{idx + 1}</span>
                        {icon}
                      </button>
                    );
                  })}
                </div>

                {/* Status Legend */}
                <div className={`mt-4 pt-4 border-t grid grid-cols-2 gap-2 text-[11px] ${
                  isLight ? 'border-black/10 text-gray-600' : 'border-white/[0.06] text-[#8E8E93]'
                }`}>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-md bg-[#007AFF] shrink-0" />
                    <span>{lang === 'ru' ? 'Текущий' : 'Hozirgi'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-md bg-emerald-500/25 border border-emerald-500/45 flex items-center justify-center text-emerald-500 shrink-0">
                      <Check className="w-2 h-2 stroke-[3]" />
                    </span>
                    <span>{lang === 'ru' ? 'Отвечен' : 'Javob berilgan'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-md bg-amber-500/15 border border-amber-500/45 border-dashed shrink-0" />
                    <span>{lang === 'ru' ? 'Пропущен' : "O'tkazilgan"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-md border shrink-0 ${
                      isLight ? 'bg-[#F2F2F7] border-black/15' : 'bg-[#2C2C2E] border-white/10'
                    }`} />
                    <span>{lang === 'ru' ? 'Не открыт' : 'Ochilmagan'}</span>
                  </div>
                </div>

              </div>

            </div>

          </div>

          {/* Anti-cheat Warning Modal */}
          {showWarningModal && (
            <div className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-md flex items-center justify-center p-6 text-center">
              <div className={`border border-red-500/30 p-6 rounded-3xl max-w-xs w-full space-y-3 shadow-2xl ${
                isLight ? 'bg-white text-[#1C1C1E]' : 'bg-[#1C1C1E] text-white'
              }`}>
                <div className="w-12 h-12 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center mx-auto">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-base">
                  {lang === 'ru' ? 'Предупреждение!' : 'Ogohlantirish!'}
                </h4>
                <p className={`text-xs leading-relaxed ${isLight ? 'text-gray-600' : 'text-[#8E8E93]'}`}>
                  {lang === 'ru'
                    ? 'Сворачивать приложение или переключать вкладки строго запрещено! При повторении тест завершится автоматически.'
                    : "Ilovadan chiqish yoki oynani almashtirish qat'iyan man etiladi! Yana bir marta takrorlansa, test avtomatik yakunlanadi."}
                </p>
                <button
                  onClick={() => setShowWarningModal(false)}
                  className="w-full bg-[#007AFF] text-white py-3 rounded-xl font-bold text-xs cursor-pointer hover:bg-blue-600"
                >
                  {lang === 'ru' ? 'Понятно, продолжить' : 'Tushundim, davom etaman'}
                </button>
              </div>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className={`w-full min-h-full p-4 sm:px-6 pb-8 max-w-lg sm:max-w-3xl mx-auto select-none ${
        isLight ? 'bg-[#F2F2F7] text-[#1C1C1E]' : 'bg-[#000000] text-white'
      }`}>
        
        {/* Top Sticky Timer & Finish Bar (Single Back control already sits in top Header) */}
        <div className={`sticky top-0 z-20 -mx-4 px-4 py-2.5 border-b mb-4 backdrop-blur-md flex items-center justify-between ${
          isLight ? 'bg-[#F2F2F7]/95 border-black/10' : 'bg-[#000000]/95 border-white/10'
        }`}>
          <div className={`flex items-center gap-1.5 border px-3 py-1.5 rounded-full text-xs font-mono font-bold ${
            isLight
              ? 'bg-white border-amber-500/35 text-amber-700 shadow-sm'
              : 'bg-[#1C1C1E] border-amber-500/30 text-amber-300'
          }`}>
            <Clock className="w-3.5 h-3.5" />
            <span>{minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}</span>
          </div>

          <button
            onClick={() => {
              const confirmFinish = lang === 'ru' ? 'Завершить тест?' : 'Testni yakunlaysizmi?';
              if (window.confirm(confirmFinish)) {
                handleFinishExam();
              }
            }}
            className="bg-[#007AFF] hover:bg-blue-600 text-white text-xs font-bold px-3.5 py-1.5 rounded-full active:scale-95 transition-transform"
          >
            {lang === 'ru' ? 'Завершить' : 'Yakunlash'}
          </button>
        </div>

        {/* Question Grid Navigator */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-2 px-1 mb-4">
          {activeQuestions.map((_, idx) => {
            const ansVal = userAnswers[idx];
            const isAnswered = ansVal !== undefined && ansVal !== null && ansVal !== '';
            const isCurrent = idx === currentQIndex;
            return (
              <button
                key={idx}
                onClick={() => setCurrentQIndex(idx)}
                className={`w-9 h-9 rounded-xl flex-shrink-0 font-bold text-xs transition-all ${
                  isCurrent
                    ? 'bg-[#007AFF] text-white border border-[#007AFF] shadow-sm'
                    : isAnswered
                    ? isLight
                      ? 'bg-emerald-500/15 text-emerald-700 border border-emerald-500/35'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : isLight
                    ? 'bg-white border border-black/[0.08] text-gray-600 shadow-sm'
                    : 'bg-[#1C1C1E] border border-white/5 text-[#8E8E93]'
                }`}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>

        {/* Current Question Card */}
        <div className={`border rounded-3xl p-5 mb-5 space-y-4 ${
          isLight ? 'bg-white border-black/[0.08] shadow-md' : 'bg-[#1C1C1E] border-white/5'
        }`}>
          <div className={`flex items-center justify-between text-xs ${isLight ? 'text-gray-500' : 'text-[#8E8E93]'}`}>
            <span className={`font-bold ${isLight ? 'text-[#1C1C1E]' : 'text-white'}`}>
              {lang === 'ru'
                ? `Вопрос ${currentQIndex + 1}`
                : `${currentQIndex + 1}-Savol`}
            </span>
            {selectedMode === 'sertifikat' && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                currentQ?.type === 'matching'
                  ? 'bg-amber-500/15 text-amber-500'
                  : currentQ?.type === 'input'
                  ? 'bg-purple-500/15 text-purple-400'
                  : 'bg-blue-500/15 text-blue-500'
              }`}>
                {currentQ?.type === 'matching'
                  ? (lang === 'ru' ? '3 из 6' : '6 dan 3')
                  : currentQ?.type === 'input'
                  ? (lang === 'ru' ? 'Ответ' : 'Yozma')
                  : 'A–D'}
              </span>
            )}
          </div>

          {renderExamQuestionBody(currentQ, currentQIndex, true)}
        </div>

        {/* Navigation Arrows */}
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={() => setCurrentQIndex(prev => Math.max(0, prev - 1))}
            disabled={currentQIndex === 0}
            className={`flex-1 border disabled:opacity-40 py-3.5 rounded-2xl font-bold text-xs inline-flex items-center justify-center gap-1.5 active:scale-95 transition-transform ${
              isLight ? 'bg-white border-black/[0.08] text-[#1C1C1E] shadow-sm' : 'bg-[#1C1C1E] border-white/5 text-white'
            }`}
          >
            <ArrowLeft className="w-4 h-4 shrink-0" />
            <span>{lang === 'ru' ? 'Предыдущий' : 'Oldingi'}</span>
          </button>
          <button
            onClick={() => {
              if (currentQIndex < activeQuestions.length - 1) {
                setCurrentQIndex(prev => prev + 1);
              } else {
                handleFinishExam();
              }
            }}
            className="flex-1 bg-[#007AFF] hover:bg-[#0066D6] text-white py-3.5 rounded-2xl font-bold text-xs inline-flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
          >
            {currentQIndex === activeQuestions.length - 1 ? (
              <>
                <span>{lang === 'ru' ? 'Завершить' : 'Yakunlash'}</span>
                <Check className="w-4 h-4 shrink-0" />
              </>
            ) : (
              <>
                <span>{lang === 'ru' ? 'Следующий' : 'Keyingi'}</span>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </>
            )}
          </button>
        </div>

        {/* Anti-cheat Warning Modal */}
        {showWarningModal && (
          <div className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-md flex items-center justify-center p-6 text-center">
            <div className={`border border-red-500/30 p-6 rounded-3xl max-w-xs w-full space-y-3 ${
              isLight ? 'bg-white text-[#1C1C1E]' : 'bg-[#1C1C1E] text-white'
            }`}>
              <div className="w-12 h-12 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-base">
                {lang === 'ru' ? 'Предупреждение!' : 'Ogohlantirish!'}
              </h4>
              <p className={`text-xs leading-relaxed ${isLight ? 'text-gray-600' : 'text-[#8E8E93]'}`}>
                {lang === 'ru'
                  ? 'Сворачивать приложение или переключать вкладки строго запрещено! При повторении тест завершится автоматически.'
                  : "Ilovadan chiqish yoki oynani almashtirish qat'iyan man etiladi! Yana bir marta takrorlansa, test avtomatik yakunlanadi."}
              </p>
              <button
                onClick={() => setShowWarningModal(false)}
                className="w-full bg-[#007AFF] text-white py-3 rounded-xl font-bold text-xs"
              >
                {lang === 'ru' ? 'Понятно, продолжить' : 'Tushundim, davom etaman'}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────
  // SCREEN 4: RESULTS SCREEN (WITH CONFETTI & MISTAKE REVIEW)
  // ──────────────────────────────────────────────────────────
  if (examFinished) {
    return (
      <div className={`w-full min-h-screen p-4 sm:px-6 pb-28 max-w-lg sm:max-w-3xl desktop:max-w-5xl mx-auto space-y-5 select-none ${
        isLight ? 'bg-[#F2F2F7] text-[#1C1C1E]' : 'bg-[#000000] text-white'
      }`}>
        <ConfettiBurst key={confettiKey} active={examFinished} />

        {/* Results Card */}
        <div className={`border rounded-3xl p-6 sm:p-8 text-center space-y-5 shadow-lg ${
          isLight ? 'bg-white border-black/[0.06]' : 'bg-[#1C1C1E] border-white/[0.08]'
        }`}>
          <div
            data-testid="results-trophy-badge"
            className="w-16 h-16 rounded-full bg-yellow-400 text-yellow-950 flex items-center justify-center mx-auto shadow-md shadow-yellow-500/20"
          >
            <Trophy className="w-8 h-8" />
          </div>

          <div>
            <h3 className={`font-extrabold text-2xl mb-1 ${isLight ? 'text-[#1C1C1E]' : 'text-white'}`}>
              {lang === 'ru' ? 'Тест завершён!' : 'Test yakunlandi!'}
            </h3>
            <p className={`text-xs ${isLight ? 'text-gray-500' : 'text-[#8E8E93]'}`}>
              {localizeVariant(selectedTest, lang)?.title || (lang === 'ru' ? 'Официальный пробный тест' : 'Rasmiy sinov testi')}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-4 pt-2 max-w-2xl mx-auto">
            <div className={`p-3 sm:p-4 rounded-2xl ${isLight ? 'bg-[#F2F2F7]' : 'bg-[#2C2C2E]'}`}>
              <span className={`text-[10px] block ${isLight ? 'text-gray-500' : 'text-[#8E8E93]'}`}>
                {lang === 'ru' ? 'Верно:' : "To'g'ri:"}
              </span>
              <span className={`font-bold text-lg ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`}>
                {correctCount} / {activeQuestions.length}
              </span>
            </div>
            <div className={`p-3 sm:p-4 rounded-2xl ${isLight ? 'bg-[#F2F2F7]' : 'bg-[#2C2C2E]'}`}>
              <span className={`text-[10px] block ${isLight ? 'text-gray-500' : 'text-[#8E8E93]'}`}>
                {lang === 'ru' ? 'Набрано баллов:' : "To'plangan ball:"}
              </span>
              <span className={`font-bold text-lg ${isLight ? 'text-blue-600' : 'text-blue-400'}`}>
                {totalScore} / {examMaxScore}
              </span>
            </div>
            <div className={`p-3 sm:p-4 rounded-2xl ${isLight ? 'bg-[#F2F2F7]' : 'bg-[#2C2C2E]'}`}>
              <span className={`text-[10px] block ${isLight ? 'text-gray-500' : 'text-[#8E8E93]'}`}>
                {selectedMode === 'dtm'
                  ? (lang === 'ru' ? 'Максимум:' : 'Maksimal:')
                  : (lang === 'ru' ? 'Сертификат:' : 'Sertifikat:')}
              </span>
              <span className={`font-bold text-lg ${isLight ? 'text-amber-600' : 'text-amber-400'}`}>
                {selectedMode === 'dtm' ? examMaxScore : certGrade}
              </span>
            </div>
          </div>

          {selectedMode !== 'dtm' && (
            <div className={`bg-blue-500/10 border border-blue-500/20 p-3 rounded-2xl text-xs font-semibold flex items-center justify-center gap-2 max-w-xl mx-auto ${
              isLight ? 'text-blue-700' : 'text-blue-400'
            }`}>
              <Award className="w-4 h-4" />
              <span>
                {lang === 'ru'
                  ? `Уровень сертификата: ${certGrade} (${grantProb}%)`
                  : `Sertifikat darajasi: ${certGrade} (${grantProb}%)`}
              </span>
            </div>
          )}

          <div className="pt-2 max-w-xl mx-auto">
            <button
              onClick={() => handleStartExam(selectedTest)}
              className="w-full bg-[#007AFF] hover:bg-[#0066D6] text-white font-bold py-3.5 px-3 rounded-2xl text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>{lang === 'ru' ? 'Пройти заново' : 'Qayta topshirish'}</span>
            </button>
          </div>

          <button
            onClick={() => {
              setExamFinished(false);
              setCurrentView('test_list');
            }}
            className={`w-full max-w-xl mx-auto border font-bold py-3 px-3 rounded-2xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              isLight
                ? 'bg-[#F2F2F7] hover:bg-gray-200 border-black/10 text-[#1C1C1E]'
                : 'bg-[#2C2C2E] border-white/10 hover:bg-[#3A3A3C] text-white/90'
            }`}
          >
            <span>{lang === 'ru' ? 'Смотреть другие варианты' : "Boshqa variantlarni ko'rish"}</span>
          </button>
        </div>

        {/* Full Mistake Breakdown right after completing test */}
        <ExamMistakeReview
          questions={activeQuestions}
          userAnswers={userAnswers}
          isLight={isLight}
          lang={lang}
        />
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────
  // COMPLETED TEST MISTAKE REVIEW & RETAKE VIEW (FROM VARIANT LIST)
  // ──────────────────────────────────────────────────────────
  if (reviewEntry) {
    const { test: revTest, result: revRes } = reviewEntry;
    const revQuestions = revTest?.questions || [];
    const revMax = revRes?.maxScore || revTest?.maxScore || (selectedMode === 'dtm' ? 93 : 75);

    return (
      <div
        className={`w-full select-none flex flex-col min-h-full px-4 sm:px-6 pt-2 space-y-4 sm:space-y-5 max-w-lg sm:max-w-3xl desktop:max-w-5xl mx-auto ${
          isLight ? 'text-[#1C1C1E]' : 'text-white'
        }`}
        style={{
          paddingBottom: 'calc(var(--safe-area-bottom, 0px) + 88px)'
        }}
      >
        <div className="flex items-center justify-between pt-1">
          <button
            type="button"
            onClick={() => {
              impactLight();
              setReviewEntry(null);
            }}
            className={`flex items-center gap-1.5 text-xs sm:text-sm transition-colors cursor-pointer ${
              isLight ? 'text-gray-600 hover:text-[#1C1C1E]' : 'text-[#8E8E93] hover:text-white'
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{lang === 'ru' ? 'К вариантам' : 'Variantlarga qaytish'}</span>
          </button>
        </div>

        {/* Saved Result Summary Card */}
        <div
          className={`border rounded-3xl p-6 text-center space-y-4 shadow-lg ${
            isLight ? 'bg-white border-black/[0.06]' : 'bg-[#1C1C1E] border-white/[0.08]'
          }`}
        >
          <div className="w-14 h-14 rounded-full bg-yellow-400 text-yellow-950 flex items-center justify-center mx-auto shadow-md shadow-yellow-500/20">
            <Trophy className="w-7 h-7" />
          </div>

          <div>
            <h3 className={`font-extrabold text-lg sm:text-xl mb-1 ${isLight ? 'text-[#1C1C1E]' : 'text-white'}`}>
              {revTest?.title}
            </h3>
            <p className={`text-xs ${isLight ? 'text-gray-500' : 'text-[#8E8E93]'}`}>
              {lang === 'ru' ? 'Сохранённый результат' : 'Saqlangan natija'}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-4 max-w-2xl mx-auto">
            <div className={`p-3 rounded-2xl ${isLight ? 'bg-[#F2F2F7]' : 'bg-[#2C2C2E]'}`}>
              <span className={`text-[10px] block ${isLight ? 'text-gray-500' : 'text-[#8E8E93]'}`}>
                {lang === 'ru' ? 'Верно:' : "To'g'ri:"}
              </span>
              <span className={`font-bold text-base sm:text-lg ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`}>
                {revRes?.correctCount ?? 0} / {revRes?.totalQuestions ?? revQuestions.length}
              </span>
            </div>
            <div className={`p-3 rounded-2xl ${isLight ? 'bg-[#F2F2F7]' : 'bg-[#2C2C2E]'}`}>
              <span className={`text-[10px] block ${isLight ? 'text-gray-500' : 'text-[#8E8E93]'}`}>
                {lang === 'ru' ? 'Баллы:' : 'Ball:'}
              </span>
              <span className={`font-bold text-base sm:text-lg ${isLight ? 'text-blue-600' : 'text-blue-400'}`}>
                {revRes?.score ?? 0} / {revMax}
              </span>
            </div>
            <div className={`p-3 rounded-2xl ${isLight ? 'bg-[#F2F2F7]' : 'bg-[#2C2C2E]'}`}>
              <span className={`text-[10px] block ${isLight ? 'text-gray-500' : 'text-[#8E8E93]'}`}>
                {selectedMode === 'dtm'
                  ? (lang === 'ru' ? 'Точность:' : 'Foiz:')
                  : (lang === 'ru' ? 'Сертификат:' : 'Sertifikat:')}
              </span>
              <span className={`font-bold text-base sm:text-lg ${isLight ? 'text-amber-600' : 'text-amber-400'}`}>
                {selectedMode === 'dtm' ? `${revRes?.percentage ?? 0}%` : (revRes?.certGrade || 'C')}
              </span>
            </div>
          </div>

          <div className="pt-1 max-w-xl mx-auto">
            <button
              type="button"
              onClick={() => handleStartExam(revTest)}
              className="w-full bg-[#007AFF] hover:bg-[#0066D6] text-white font-bold py-3.5 px-4 rounded-2xl text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>{lang === 'ru' ? 'Пересдать' : 'Qayta topshirish'}</span>
            </button>
          </div>
        </div>

        {/* Mistake Breakdown */}
        <ExamMistakeReview
          questions={revQuestions}
          userAnswers={revRes?.userAnswers || {}}
          isLight={isLight}
          lang={lang}
        />
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────
  // SCREEN 1: HERO SUBJECT CAROUSEL BANNER (EXACTLY LIKE DARSLAR)
  // ──────────────────────────────────────────────────────────
  if (currentView === 'carousel') {
    if (isDesktop) {
      return (
        <div 
          className="w-full max-w-7xl mx-auto pr-4 py-1 flex flex-col items-center justify-center h-screen overflow-hidden animate-in fade-in duration-300"
          style={{
            paddingLeft: 'calc(var(--safe-area-left, 0px) + 72px)'
          }}
        >
          <DesktopSubjectCarousel
            subjects={subjects}
            activeSubjectIndex={activeSubjectIndex}
            onSubjectChange={(idx) => {
              setActiveSubjectIndex(idx);
              const sub = subjects[idx];
              if (sub) {
                const norm = (sub.key || sub.name || '').toLowerCase();
                const key = norm.includes('kim') ? 'kimyo' : norm.includes('mat') ? 'matematika' : 'biologiya';
                setSelectedSubjectKey(key);
              }
            }}
            onStartSubject={(sub) => {
              const norm = (sub?.key || sub?.name || '').toLowerCase();
              const key = norm.includes('kim') ? 'kimyo' : norm.includes('mat') ? 'matematika' : 'biologiya';
              handleSelectSubject(key);
            }}
          />
        </div>
      );
    }

    return (
      <div 
        className={`w-full select-none flex flex-col h-full flex-1 overflow-hidden ${
          isLight ? 'text-[#1C1C1E]' : 'text-white'
        }`}
        style={{
          paddingBottom: 'calc(var(--safe-area-bottom, 0px) + 74px)'
        }}
      >
        <div 
          className="h-full flex-1 flex flex-col justify-between items-center px-4 pt-1 pb-1 w-full max-w-md sm:max-w-xl mx-auto overflow-hidden select-none"
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
                  handleSelectSubject(currentSubjectKey);
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

                {/* Subject Animation Effects */}
                <SubjectBannerEffects subjectKey={currentSubjectKey} />

                {/* Spacer */}
                <div className="relative z-10 w-full flex-1 min-h-0" />

                {/* Bottom Card Content: Title & "Boshlash" Button */}
                <div className="relative z-10 w-full flex flex-col items-start pt-3">
                  <h2 className="text-white font-black text-2xl sm:text-3xl tracking-[0.06em] uppercase mb-3 drop-shadow-[0_4px_16px_rgba(0,0,0,0.9)] font-sans">
                    {currentSubjectTitle}
                  </h2>

                  {/* Glowing Action Button: "Boshlash" */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleSelectSubject(currentSubjectKey);
                    }}
                    className={`w-full bg-gradient-to-r ${buttonGradient} hover:brightness-110 text-white font-bold py-3 px-6 rounded-full text-sm sm:text-base active:scale-95 transition-all text-center flex items-center justify-center gap-2 shadow-lg cursor-pointer z-20`}
                  >
                    <span>{lang === 'ru' ? 'Начать' : 'Boshlash'}</span>
                  </button>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Carousel Pagination Dots */}
          <div className="flex items-center justify-center gap-2 pt-1 pb-1 flex-shrink-0">
            {(subjects.length > 0 ? subjects : [1, 2, 3]).map((s, idx) => (
              <button
                key={s.id || idx}
                onClick={() => {
                  impactLight();
                  setSlideDirection(idx >= activeSubjectIndex ? 1 : -1);
                  setActiveSubjectIndex(idx);
                }}
                className={`transition-all duration-300 rounded-full ${
                  idx === activeSubjectIndex 
                    ? isLight
                      ? 'w-7 h-2 bg-[#007AFF] shadow-[0_0_8px_rgba(0,122,255,0.45)]'
                      : 'w-7 h-2 bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)]'
                    : isLight
                    ? 'w-2 h-2 bg-black/20 hover:bg-black/35'
                    : 'w-2 h-2 bg-white/30 hover:bg-white/50'
                }`}
                aria-label={lang === 'ru' ? `Перейти к слайду ${idx + 1}` : `Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────
  // SCREEN 2: EXAM MODE SELECTOR (MILLIY SERTIFIKAT & ADMIN-ENABLED MODES)
  // ──────────────────────────────────────────────────────────
  if (currentView === 'mode_select') {
    const isSubjectKimyo = selectedSubjectKey === 'kimyo';
    const isSubjectMatem = selectedSubjectKey === 'matematika';
    const isSubjectBio = selectedSubjectKey === 'biologiya';

    const subjectRow = subjects.find(s => normalizeSubjectKey(s) === selectedSubjectKey);
    const subjectLabel = isSubjectKimyo
      ? (lang === 'ru' ? 'Тесты по химии' : 'Kimyo Testlari')
      : isSubjectMatem
      ? (lang === 'ru' ? 'Тесты по математике' : 'Matematika Testlari')
      : isSubjectBio
      ? (lang === 'ru' ? 'Тесты по биологии' : 'Biologiya Testlari')
      : lang === 'ru'
      ? `Тесты: ${subjectRow?.name || activeSubjectData?.teacher?.subjectTitle || 'Предмет'}`
      : `${subjectRow?.name || activeSubjectData?.teacher?.subjectTitle || 'Fan'} Testlari`;

    const SubjectIcon = isSubjectKimyo
      ? FlaskConical
      : isSubjectMatem
      ? Calculator
      : isSubjectBio
      ? Dna
      : BookOpen;

    const subjectIconColor = isSubjectKimyo
      ? 'text-purple-500'
      : isSubjectMatem
      ? 'text-blue-500'
      : isSubjectBio
      ? 'text-emerald-500'
      : 'text-amber-500';

    const enabledModes = ['dtm', 'sertifikat'].filter(
      (modeKey) => activeSubjectData?.modes?.[modeKey]?.enabled ?? true
    );

    return (
      <div 
        className={`w-full select-none flex flex-col min-h-full px-4 sm:px-6 pt-2 space-y-5 max-w-md sm:max-w-4xl desktop:max-w-6xl mx-auto ${
          isLight ? 'text-[#1C1C1E]' : 'text-white'
        }`}
        style={{
          paddingBottom: 'calc(var(--safe-area-bottom, 0px) + 88px)'
        }}
      >
        {/* Subject Header Badge */}
        <div className="flex items-center justify-end pt-1">
          <div className={`inline-flex items-center gap-2 border px-4 py-2 rounded-full text-xs sm:text-sm font-bold shadow-sm ${
            isLight
              ? 'bg-white border-black/[0.08] text-[#1C1C1E]'
              : 'bg-[#1C1C1E] border-white/10 text-white'
          }`}>
            <SubjectIcon className={`w-4 h-4 ${subjectIconColor}`} />
            <span>{subjectLabel}</span>
          </div>
        </div>

        <div className="text-left space-y-1.5">
          <h2 className={`text-xl sm:text-2xl lg:text-3xl font-black tracking-tight ${
            isLight ? 'text-[#1C1C1E]' : 'text-white'
          }`}>
            {lang === 'ru' ? 'Выберите формат экзамена' : 'Imtihon Turini Tanlang'}
          </h2>
          <p className={`text-xs sm:text-sm max-w-2xl ${isLight ? 'text-gray-600' : 'text-[#8E8E93]'}`}>
            {lang === 'ru'
              ? 'Выберите нужный формат экзамена и проверьте свои знания.'
              : "O'zingizga kerakli imtihon formatini tanlang va bilimingizni sinang."}
          </p>
        </div>

        {enabledModes.length === 0 ? (
          <div className={`border rounded-3xl p-8 text-center text-xs ${
            isLight ? 'bg-white border-black/[0.08] text-gray-500' : 'bg-[#1C1C1E] border-white/10 text-[#8E8E93]'
          }`}>
            {lang === 'ru'
              ? 'По этому предмету пока нет активных направлений экзамена.'
              : "Hozircha bu fan uchun faol imtihon yo'nalishlari mavjud emas."}
          </div>
        ) : (
          <div className={`grid gap-5 ${enabledModes.length > 1 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
            {enabledModes.map((modeKey) => {
              const modeCfg = localizeModeConfig(modeKey, activeSubjectData?.modes?.[modeKey] || {}, lang);
              const isSertifikat = modeKey === 'sertifikat';
              const isWideSingle = enabledModes.length === 1;

              return (
                <div
                  key={modeKey}
                  onClick={() => handleSelectMode(modeKey)}
                  className={`relative border rounded-3xl p-5 sm:p-7 cursor-pointer group active:scale-[0.99] transition-all ${
                    isLight
                      ? 'bg-white border-blue-500/30 shadow-[0_8px_28px_rgba(0,122,255,0.10)] hover:border-blue-500/55'
                      : 'bg-[#1C1C1E] border-blue-500/25 shadow-lg hover:border-blue-500/45'
                  } ${
                    isWideSingle
                      ? 'flex flex-col md:grid md:grid-cols-12 md:items-center md:gap-8 space-y-4 md:space-y-0'
                      : 'flex flex-col justify-between space-y-4'
                  }`}
                >
                  {/* Left / Primary Details */}
                  <div className={isWideSingle ? 'md:col-span-7 space-y-3.5' : 'space-y-3.5'}>
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`text-[10px] sm:text-[11px] font-extrabold uppercase px-3 py-1 rounded-full tracking-wider border ${
                          isLight
                            ? 'bg-blue-500/12 border-blue-500/30 text-blue-700'
                            : 'bg-blue-500/15 border-blue-500/30 text-blue-400'
                        }`}
                      >
                        {modeCfg.badge || (isSertifikat
                          ? (lang === 'ru' ? 'Гос. образовательный стандарт' : "Davlat Ta'lim Standarti")
                          : (lang === 'ru' ? 'ГЦТ (ДТМ)' : 'Davlat Test Markazi (DTM)'))}
                      </span>
                    </div>

                    <div>
                      <h3
                        className={`font-extrabold text-lg sm:text-2xl transition-colors ${
                          isLight
                            ? 'text-[#1C1C1E] group-hover:text-blue-600'
                            : 'text-white group-hover:text-blue-400'
                        }`}
                      >
                        {modeCfg.title}
                      </h3>
                      <p className={`text-xs sm:text-sm mt-1.5 leading-relaxed ${isLight ? 'text-gray-600' : 'text-[#8E8E93]'}`}>
                        {modeCfg.description}
                      </p>
                    </div>

                    {Array.isArray(modeCfg.features) && modeCfg.features.length > 0 && (
                      <div className={`space-y-2 text-xs pt-1 ${isLight ? 'text-gray-700' : 'text-white/85'}`}>
                        {modeCfg.features.map((feat, fIdx) => (
                          <div key={fIdx} className="flex items-center gap-2 text-[11px] sm:text-xs">
                            <CheckCircle2
                              className={`w-3.5 h-3.5 flex-shrink-0 ${
                                fIdx % 2 === 0 ? 'text-blue-500' : 'text-emerald-500'
                              }`}
                            />
                            <span>{feat}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Right / Specs + CTA */}
                  <div className={isWideSingle ? 'md:col-span-5 flex flex-col justify-center gap-4' : 'space-y-4'}>
                    <div className="grid grid-cols-3 gap-2 sm:gap-2.5 text-center text-xs">
                      <div className={`border p-2.5 sm:p-3 rounded-2xl min-h-[62px] sm:min-h-[68px] flex flex-col items-center justify-center ${
                        isLight ? 'bg-[#F2F2F7] border-black/5' : 'bg-[#242426] border-white/5'
                      }`}>
                        <span className={`text-[10px] block mb-0.5 ${isLight ? 'text-gray-500' : 'text-[#8E8E93]'}`}>
                          {lang === 'ru' ? 'Вопросов:' : 'Savollar:'}
                        </span>
                        <span className={`font-bold text-xs sm:text-sm whitespace-nowrap ${isLight ? 'text-[#1C1C1E]' : 'text-white'}`}>
                          {modeCfg.questionCount || (isSertifikat ? 40 : 30)} {lang === 'ru' ? 'шт.' : 'ta'}
                        </span>
                      </div>
                      <div className={`border p-2.5 sm:p-3 rounded-2xl min-h-[62px] sm:min-h-[68px] flex flex-col items-center justify-center ${
                        isLight ? 'bg-[#F2F2F7] border-black/5' : 'bg-[#242426] border-white/5'
                      }`}>
                        <span className={`text-[10px] block mb-0.5 ${isLight ? 'text-gray-500' : 'text-[#8E8E93]'}`}>
                          {lang === 'ru' ? 'Время:' : 'Vaqt:'}
                        </span>
                        <span className={`font-bold text-[11px] sm:text-sm tracking-tight whitespace-nowrap ${isLight ? 'text-amber-600' : 'text-amber-400'}`}>
                          {formatDurationLabel(modeCfg.durationMinutes || (isSertifikat ? 100 : 60), lang)}
                        </span>
                      </div>
                      <div className={`border p-2.5 sm:p-3 rounded-2xl min-h-[62px] sm:min-h-[68px] flex flex-col items-center justify-center ${
                        isLight ? 'bg-[#F2F2F7] border-black/5' : 'bg-[#242426] border-white/5'
                      }`}>
                        <span className={`text-[10px] block mb-0.5 ${isLight ? 'text-gray-500' : 'text-[#8E8E93]'}`}>
                          {lang === 'ru' ? 'Максимум:' : 'Maksimal:'}
                        </span>
                        <span className={`font-bold text-xs sm:text-sm whitespace-nowrap ${
                          isLight ? 'text-emerald-600' : 'text-emerald-400'
                        }`}>
                          {modeCfg.maxScore || (isSertifikat ? 75 : 93)} {lang === 'ru' ? 'б.' : 'ball'}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleSelectMode(modeKey);
                      }}
                      className="w-full font-bold py-3.5 px-5 rounded-2xl text-xs sm:text-sm flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer z-10 bg-[#007AFF] hover:bg-[#0066D6] text-white shadow-sm"
                    >
                      <span>{lang === 'ru' ? 'Смотреть варианты' : "Variantlarni ko'rish"}</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────
  // SCREEN 3: AVAILABLE TESTS
  // ──────────────────────────────────────────────────────────
  const teacher = activeSubjectData?.teacher || {
    subjectTitle: lang === 'ru' ? 'Биология' : 'Biologiya'
  };

  const subjectDisplayTitle = selectedSubjectKey === 'biologiya'
    ? (lang === 'ru' ? 'Биология' : 'Biologiya')
    : selectedSubjectKey === 'kimyo'
    ? (lang === 'ru' ? 'Химия' : 'Kimyo')
    : selectedSubjectKey === 'matematika'
    ? (lang === 'ru' ? 'Математика' : 'Matematika')
    : teacher.subjectTitle;

  const modeTitle = lang === 'ru'
    ? (selectedMode === 'dtm' ? 'Варианты ДТМ Мок-тест' : 'Варианты Национального сертификата')
    : (activeModeConfig?.title || (selectedMode === 'dtm' ? 'DTM Mock Testlar' : 'Milliy Sertifikat Variantlari'));

  return (
    <div 
      className={`w-full select-none flex flex-col min-h-full px-4 sm:px-6 pt-2 space-y-4 sm:space-y-5 max-w-md sm:max-w-4xl desktop:max-w-6xl mx-auto ${
        isLight ? 'text-[#1C1C1E]' : 'text-white'
      }`}
      style={{
        paddingBottom: 'calc(var(--safe-area-bottom, 0px) + 88px)'
      }}
    >
      {/* Header Info */}
      <div className="flex items-center justify-end pt-1">
        <span className={`text-[11px] font-bold px-3 py-1 rounded-full border ${
          isLight
            ? 'text-blue-700 bg-blue-500/10 border-blue-500/25'
            : 'text-blue-400 bg-blue-500/10 border-blue-500/20'
        }`}>
          {lang === 'ru'
            ? `Вариантов: ${activeModeTests.length}`
            : `${activeModeTests.length} ta variant mavjud`}
        </span>
      </div>

      {/* Section Title */}
      <div className="flex items-center justify-between pt-1">
        <h3 className={`font-black text-base sm:text-lg tracking-wide flex items-center gap-2 ${
          isLight ? 'text-[#1C1C1E]' : 'text-white'
        }`}>
          {selectedMode === 'dtm' ? (
            <Zap className="w-5 h-5 text-blue-500" />
          ) : (
            <Award className="w-5 h-5 text-blue-500" />
          )}
          <span>{modeTitle}</span>
        </h3>
        <span className={`text-xs ${isLight ? 'text-gray-500' : 'text-[#8E8E93]'}`}>
          {subjectDisplayTitle}
        </span>
      </div>

      {/* Available Tests Grid (1-col Phone, 2-col Tablet, 3-col PC) */}
      {activeModeTests.length === 0 ? (
        <div className={`border rounded-3xl p-8 text-center text-xs sm:text-sm ${
          isLight ? 'bg-white border-black/[0.08] text-gray-500' : 'bg-[#1C1C1E] border-white/10 text-[#8E8E93]'
        }`}>
          {lang === 'ru'
            ? 'В этом разделе пока нет добавленных вариантов теста.'
            : "Hozircha bu bo'limda test variantlari qo'shilmagan."}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeModeTests.map((rawTest, index) => {
            const test = localizeVariant(rawTest, lang);
            const resultKey = buildExamResultKey(selectedSubjectKey, selectedMode, rawTest.id || index);
            const savedResult = savedResultsMap[resultKey];

            return (
              <div 
                key={test.id || index}
                className={`border rounded-3xl p-4 sm:p-5 flex flex-col justify-between gap-4 transition-all group ${
                  isLight
                    ? 'bg-white border-black/[0.08] hover:border-blue-500/40 shadow-md'
                    : 'bg-[#1C1C1E] border-white/[0.08] hover:border-white/20 shadow-md'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        adaptChipClass(test.badgeColor || 'bg-white/10 text-white border-white/10', isLight)
                      }`}>
                        {test.badge}
                      </span>
                      <h4 className={`font-bold text-sm sm:text-base transition-colors pt-1 ${
                        isLight
                          ? 'text-[#1C1C1E] group-hover:text-blue-600'
                          : 'text-white group-hover:text-blue-300'
                      }`}>
                        {test.title}
                      </h4>
                    </div>

                    <div className={`min-w-9 h-8 px-2 rounded-xl flex items-center justify-center flex-shrink-0 text-xs font-mono font-bold whitespace-nowrap ${
                      isLight ? 'bg-[#F2F2F7] text-gray-600' : 'bg-[#2C2C2E] text-white/70'
                    }`}>
                      {lang === 'ru' ? `${index + 1}-В` : `${index + 1}-V`}
                    </div>
                  </div>

                  <p className={`text-xs leading-relaxed ${isLight ? 'text-gray-600' : 'text-[#8E8E93]'}`}>
                    {test.description}
                  </p>

                  {/* Specs Chips */}
                  <div className="flex items-center flex-wrap gap-1.5 text-[11px]">
                    <div className={`px-2 py-1 rounded-xl flex items-center gap-1 whitespace-nowrap ${
                      isLight ? 'bg-[#F2F2F7] text-gray-700' : 'bg-[#2C2C2E] text-white/80'
                    }`}>
                      <FileText className="w-3 h-3 text-blue-500 shrink-0" />
                      <span>{test.questionCount} {lang === 'ru' ? 'вопр.' : 'ta savol'}</span>
                    </div>
                    <div className={`px-2 py-1 rounded-xl flex items-center gap-1 whitespace-nowrap ${
                      isLight ? 'bg-[#F2F2F7] text-gray-700' : 'bg-[#2C2C2E] text-white/80'
                    }`}>
                      <Clock className="w-3 h-3 text-amber-500 shrink-0" />
                      <span>{formatDurationLabel(test.durationMinutes, lang)}</span>
                    </div>
                    <div className={`px-2 py-1 rounded-xl border whitespace-nowrap ${
                      adaptChipClass(test.difficultyColor || 'text-amber-400 bg-amber-400/10 border-amber-400/20', isLight)
                    }`}>
                      <span>{localizeDifficulty(test.difficulty, lang)}</span>
                    </div>
                  </div>
                </div>

                {/* Result Button (if already completed) OR Start Button */}
                {savedResult ? (
                  <button
                    type="button"
                    data-testid={`variant-result-${test.id || index}`}
                    onClick={() => {
                      impactLight();
                      setReviewEntry({ test, result: savedResult });
                    }}
                    className={`w-full border font-bold py-2.5 px-3.5 rounded-2xl text-xs flex items-center justify-between gap-2 active:scale-95 transition-all cursor-pointer ${
                      isLight
                        ? 'bg-emerald-50 hover:bg-emerald-100/80 border-emerald-500/30 text-emerald-800'
                        : 'bg-[#2C2C2E] hover:bg-[#3A3A3C] border-emerald-500/35 text-emerald-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 text-left">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      <div className="min-w-0">
                        <div className="font-extrabold truncate">
                          {lang === 'ru'
                            ? `Результат: ${savedResult.correctCount}/${savedResult.totalQuestions} · ${savedResult.score} б.`
                            : `Natija: ${savedResult.correctCount}/${savedResult.totalQuestions} · ${savedResult.score} ball`}
                        </div>
                        <div className={`text-[10px] font-medium truncate ${
                          isLight ? 'text-emerald-700/80' : 'text-white/60'
                        }`}>
                          {lang === 'ru' ? 'Ошибки и пересдача' : 'Xatolar va qayta topshirish'}
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 shrink-0" />
                  </button>
                ) : (
                  <button
                    type="button"
                    data-testid={`variant-start-${test.id || index}`}
                    onClick={() => handleStartExam(test)}
                    className="w-full bg-[#007AFF] hover:bg-[#0066D6] text-white font-bold py-3 px-4 rounded-2xl text-xs flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-all cursor-pointer"
                  >
                    <span>{lang === 'ru' ? 'Начать тест' : 'Testni boshlash'}</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
