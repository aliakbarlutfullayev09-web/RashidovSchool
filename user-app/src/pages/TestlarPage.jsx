import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, Clock, AlertTriangle, CheckCircle2, XCircle, ArrowLeft, 
  RotateCcw, BookOpen, Search, Sparkles, ChevronRight, Check,
  Award, Zap, UserCheck, FileText, CheckCircle,
  Dna, FlaskConical, Calculator
} from 'lucide-react';
import SubjectBannerEffects from '../components/SubjectBannerEffects';
import { getSubjects, getExamPortalData, saveExamProgress } from '../api/supabase';
import {
  DEFAULT_EXAM_PORTAL_DATA,
  createSubjectSkeleton,
  formatDurationLabel,
  normalizeSubjectKey
} from '../api/examDefaults';
import { isUzbekMatch } from '../utils/uzbekFuzzy';
import { useHaptic } from '../hooks/useHaptic';
import { useLanguage } from '../context/LanguageContext';
import { useTelegram } from '../hooks/useTelegram';
import { useIsDesktop } from '../hooks/useIsDesktop';
import DesktopSubjectCarousel from '../components/DesktopSubjectCarousel';

export default function TestlarPage({ user, onRegisterBackAction }) {
  const { t } = useLanguage();
  const { selectionChanged, impactLight, impactMedium, notificationSuccess, notificationError } = useHaptic();
  const { setClosingConfirmation } = useTelegram();

  // Navigation views: 'carousel' (Screen 1) | 'mode_select' (Screen 2) | 'test_list' (Screen 3)
  const [currentView, setCurrentView] = useState('carousel');

  // Subjects & Carousel state
  const [subjects, setSubjects] = useState([]);
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
  const [timeLeft, setTimeLeft] = useState(3840);
  const [cheatWarnings, setCheatWarnings] = useState(0);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [visitedQuestions, setVisitedQuestions] = useState(new Set([0]));

  // Results & Tahlil State
  const [examFinished, setExamFinished] = useState(false);
  const [showTahlil, setShowTahlil] = useState(false);

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
  const currentSubjectTitle = isBio ? 'BIOLOGIYA' : isKimyo ? 'KIMYO' : isMatem ? 'MATEMATIKA' : (activeSubject?.name || 'FAN').toUpperCase();

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
      alert("Ushbu variantda hozircha savollar kiritilmagan.");
      return;
    }
    impactMedium();
    setSelectedTest(test);
    setCurrentQIndex(0);
    setUserAnswers({});
    setTimeLeft((test?.durationMinutes || activeModeConfig?.durationMinutes || 64) * 60);
    setCheatWarnings(0);
    setShowWarningModal(false);
    setShowTahlil(false);
    setVisitedQuestions(new Set([0]));
    setExamActive(true);
    setExamFinished(false);
  };

  // Exit Exam Confirm Handler
  const handleExitExam = () => {
    if (window.confirm("Testni to'xtatmoqchimisiz? Natijalar saqlanmaydi.")) {
      impactLight();
      setExamActive(false);
      setExamFinished(false);
      setShowWarningModal(false);
      setCurrentView('test_list');
    }
  };

  // Finish Exam Handler
  const handleFinishExam = () => {
    impactMedium();
    setExamActive(false);
    setExamFinished(true);
    notificationSuccess();

    const uid = user?.telegram_id || user?.id;
    if (uid) {
      const targetMaxScore = selectedTest?.maxScore || activeModeConfig?.maxScore || (selectedMode === 'dtm' ? 93 : 75);
      const qWeight = selectedMode === 'dtm' ? 3.1 : (targetMaxScore / (activeQuestions.length || 1));
      let cCount = 0;
      activeQuestions.forEach((q, idx) => {
        const userAns = userAnswers[idx];
        if (q.type === 'input') {
          if (userAns && isUzbekMatch(userAns, q.correctAnswer)) cCount++;
        } else {
          if (userAns === q.correctIndex) cCount++;
        }
      });
      const score = (cCount * qWeight).toFixed(1);
      const ratio = cCount / (activeQuestions.length || 1);
      const stars = ratio >= 0.8 ? 3 : ratio >= 0.5 ? 2 : 1;

      saveExamProgress(uid, selectedSubjectKey, selectedMode, selectedTest?.id || 'exam-1', score, stars);
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
  }, [examActive, examFinished, currentView, onRegisterBackAction]);

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
  const activeModeConfig = activeSubjectData?.modes?.[selectedMode]
    || createSubjectSkeleton(selectedSubjectKey).modes[selectedMode];
  const activeModeTests = activeSubjectData?.[selectedMode] || [];
  const activeQuestions = selectedTest?.questions || activeModeTests[0]?.questions || [];
  const examMaxScore = selectedTest?.maxScore || activeModeConfig?.maxScore || (selectedMode === 'dtm' ? 93 : 75);

  // Answering
  const handleSelectAnswer = (qIndex, ans) => {
    impactLight();
    setUserAnswers(prev => ({ ...prev, [qIndex]: ans }));
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

    // Desktop CAT exam layout (>= 1024px with hover/fine pointer)
    if (isDesktop) {
      return (
        <div className="w-full min-h-screen bg-[#000000] text-white p-6 pb-20 select-none animate-in fade-in duration-300">
          {/* Top CAT Header Bar */}
          <div className="max-w-7xl mx-auto flex items-center justify-between py-3 px-6 mb-6 rounded-2xl bg-[#091012] border border-teal-500/20 shadow-lg">
            <div className="flex items-center gap-4">
              <button
                onClick={handleExitExam}
                className="w-10 h-10 rounded-xl bg-[#152327] hover:bg-[#1d3137] border border-teal-500/20 flex items-center justify-center text-teal-300 active:scale-95 transition-all cursor-pointer"
                title="Chiqish"
                aria-label="Testdan chiqish"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-teal-500/20 text-teal-300 border border-teal-500/30">
                    {selectedMode === 'dtm' ? 'DTM Mock Exam' : 'Milliy Sertifikat'}
                  </span>
                  <span className="text-xs text-[#8E8E93]">
                    {activeSubject.name || 'Biologiya'}
                  </span>
                </div>
                <h2 className="text-white font-bold text-sm sm:text-base mt-0.5">
                  {selectedTest?.title || 'Diagnostik Test'}
                </h2>
              </div>
            </div>

            {/* Timer Capsule & Finish Button */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-[#152327] border border-amber-500/40 px-4 py-2 rounded-2xl text-sm font-mono font-bold text-amber-300 shadow-md">
                <Clock className="w-4 h-4 text-amber-400 animate-pulse" />
                <span>{minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}</span>
              </div>

              <button
                onClick={() => {
                  if (window.confirm("Testni yakunlaysizmi?")) {
                    handleFinishExam();
                  }
                }}
                className="bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-300 hover:text-white px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer"
              >
                Testni yakunlash
              </button>
            </div>
          </div>

          {/* Main 2-Column CAT Container */}
          <div className="max-w-7xl mx-auto flex flex-row gap-6 items-start">
            
            {/* Left Column: Question area and Options */}
            <div className="flex-1 min-w-0 flex flex-col justify-between bg-[#091012] border border-teal-500/20 rounded-3xl p-8 shadow-2xl relative min-h-[580px]">
              
              <div>
                {/* Question Info Bar */}
                <div className="flex items-center justify-between text-xs text-[#8E8E93] pb-4 mb-4 border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-white text-base">
                      {currentQIndex + 1}-Savol
                    </span>
                    <span className="text-xs text-[#8E8E93]">
                      / {activeQuestions.length}
                    </span>
                  </div>
                  <span className="text-teal-400 font-bold text-xs px-2.5 py-1 rounded-lg bg-teal-500/10 border border-teal-500/20">
                    +{questionWeight.toFixed(1)} ball
                  </span>
                </div>

                {/* Optional Illustration centered */}
                {currentQ?.imageUrl && (
                  <div className="w-full max-h-72 rounded-2xl overflow-hidden bg-black/50 border border-teal-500/20 mb-6 flex items-center justify-center p-2">
                    <img 
                      src={currentQ.imageUrl} 
                      alt="Savol rasmi" 
                      className="max-h-68 max-w-full object-contain rounded-xl" 
                    />
                  </div>
                )}

                {/* Question Text */}
                <h3 className="text-white font-bold text-lg sm:text-xl leading-relaxed mb-6">
                  {currentQ?.text}
                </h3>

                {/* Options List in Single Column */}
                {currentQ?.type === 'input' ? (
                  <div className="pt-2">
                    <label className="text-xs text-teal-300 font-medium block mb-2">
                      Javobingizni yozing:
                    </label>
                    <input
                      type="text"
                      value={userAnswers[currentQIndex] || ''}
                      onChange={(e) => handleSelectAnswer(currentQIndex, e.target.value)}
                      placeholder="Javobni kiriting..."
                      className="w-full bg-[#152327] border border-teal-500/30 rounded-2xl p-4 text-white text-base font-bold outline-none focus:border-teal-400 transition-colors"
                    />
                  </div>
                ) : (
                  <div className="space-y-3 pt-2">
                    {(currentQ?.options || []).map((opt, oIdx) => {
                      const isSelected = userAnswers[currentQIndex] === oIdx;
                      const letter = ['A', 'B', 'C', 'D'][oIdx] || String(oIdx + 1);

                      return (
                        <button
                          key={oIdx}
                          type="button"
                          onClick={() => handleSelectAnswer(currentQIndex, oIdx)}
                          className={`w-full p-4 rounded-2xl border text-left text-sm font-semibold flex items-center justify-between transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 ${
                            isSelected
                              ? 'bg-teal-500/20 border-teal-400 text-white shadow-lg shadow-teal-500/20'
                              : 'bg-[#152327]/80 hover:bg-[#1c3035] border-white/5 text-white/90 hover:border-teal-500/30'
                          }`}
                        >
                          <div className="flex items-center gap-3.5 min-w-0 pr-3">
                            <span className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${
                              isSelected
                                ? 'bg-teal-400 text-black font-black'
                                : 'bg-black/40 text-teal-300/80 border border-white/10'
                            }`}>
                              {letter}
                            </span>
                            <span className="leading-snug">{opt}</span>
                          </div>

                          <div className={`w-6 h-6 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                            isSelected
                              ? 'border-teal-400 bg-teal-400 text-black'
                              : 'border-white/20'
                          }`}>
                            {isSelected && <Check className="w-4 h-4 stroke-[3]" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Pinned Bottom Actions Bar */}
              <div className="flex items-center justify-between gap-4 pt-8 mt-8 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setCurrentQIndex(prev => Math.max(0, prev - 1))}
                  disabled={currentQIndex === 0}
                  className="px-6 py-3.5 rounded-2xl bg-[#152327] hover:bg-[#1c3035] disabled:opacity-30 border border-white/5 text-white font-bold text-xs transition-all active:scale-95 cursor-pointer disabled:cursor-not-allowed"
                >
                  ← Oldingi
                </button>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      if (currentQIndex < activeQuestions.length - 1) {
                        setCurrentQIndex(prev => prev + 1);
                      } else {
                        if (window.confirm("Barcha savollar ko'rib chiqildi. Testni yakunlaysizmi?")) {
                          handleFinishExam();
                        }
                      }
                    }}
                    className="px-8 py-3.5 rounded-2xl bg-teal-500 hover:bg-teal-400 text-black font-extrabold text-xs transition-all active:scale-95 shadow-lg shadow-teal-500/25 cursor-pointer"
                  >
                    {currentQIndex === activeQuestions.length - 1 ? 'Testni yakunlash ✓' : 'Keyingi →'}
                  </button>
                </div>
              </div>

            </div>

            {/* Right Sticky Sidebar: Timer, Grid, Legend */}
            <div className="w-80 shrink-0 sticky top-4 flex flex-col gap-4">
              
              {/* Question Map Card */}
              <div className="bg-[#091012] border border-teal-500/20 rounded-3xl p-5 shadow-2xl flex flex-col">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/5">
                  <span className="text-xs font-bold uppercase tracking-wider text-teal-300">
                    Savollar xaritasi
                  </span>
                  <span className="text-[11px] font-mono text-[#8E8E93]">
                    {Object.keys(userAnswers).length} / {activeQuestions.length}
                  </span>
                </div>

                {/* 5-Column Question Grid */}
                <div className="grid grid-cols-5 gap-2 max-h-[360px] overflow-y-auto no-scrollbar py-1">
                  {activeQuestions.map((_, idx) => {
                    const isAnswered = userAnswers[idx] !== undefined;
                    const isCurrent = idx === currentQIndex;
                    const isVisited = visitedQuestions.has(idx);
                    const isSkipped = isVisited && !isAnswered && !isCurrent;

                    let statusClass = 'bg-[#152327]/60 border border-white/5 text-[#8E8E93] hover:border-white/20'; // unvisited
                    let icon = null;

                    if (isCurrent) {
                      statusClass = 'bg-teal-500/25 text-white ring-2 ring-teal-400 border-teal-400 font-black shadow-[0_0_12px_rgba(45,212,191,0.4)] scale-105 z-10';
                    } else if (isAnswered) {
                      statusClass = 'bg-emerald-500/25 text-emerald-300 border border-emerald-400/40 font-bold';
                      icon = <Check className="w-2.5 h-2.5 stroke-[3] inline ml-0.5" />;
                    } else if (isSkipped) {
                      statusClass = 'bg-amber-500/15 text-amber-300 border border-amber-400/50 border-dashed font-bold';
                    }

                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setCurrentQIndex(idx)}
                        title={`Savol ${idx + 1}`}
                        aria-label={`Savol ${idx + 1}`}
                        className={`h-10 rounded-xl flex items-center justify-center font-mono text-xs transition-all cursor-pointer ${statusClass}`}
                      >
                        <span>{idx + 1}</span>
                        {icon}
                      </button>
                    );
                  })}
                </div>

                {/* Status Legend */}
                <div className="mt-4 pt-4 border-t border-white/5 grid grid-cols-2 gap-2 text-[11px] text-[#8E8E93]">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-md ring-2 ring-teal-400 bg-teal-500/30 shrink-0" />
                    <span>Hozirgi</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-md bg-emerald-500/30 border border-emerald-400/50 flex items-center justify-center text-emerald-300 shrink-0">
                      <Check className="w-2 h-2 stroke-[3]" />
                    </span>
                    <span>Javob berilgan</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-md bg-amber-500/15 border border-amber-400/50 border-dashed shrink-0" />
                    <span>O'tkazilgan</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-md bg-[#152327] border border-white/10 shrink-0" />
                    <span>Ochilmagan</span>
                  </div>
                </div>

              </div>

            </div>

          </div>

          {/* Anti-cheat Warning Modal */}
          {showWarningModal && (
            <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-center justify-center p-6 text-center">
              <div className="bg-[#1C1C1E] border border-red-500/30 p-6 rounded-3xl max-w-xs w-full space-y-3 shadow-2xl">
                <div className="w-12 h-12 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center mx-auto text-2xl">
                  ⚠️
                </div>
                <h4 className="text-white font-bold text-base">Ogohlantirish!</h4>
                <p className="text-xs text-[#8E8E93] leading-relaxed">
                  Ilovadan chiqish yoki oynani almashtirish qat'iyan man etiladi! Yana bir marta takrorlansa, test avtomatik yakunlanadi.
                </p>
                <button
                  onClick={() => setShowWarningModal(false)}
                  className="w-full bg-[#007AFF] text-white py-3 rounded-xl font-bold text-xs cursor-pointer hover:bg-blue-600"
                >
                  Tushundim, davom etaman
                </button>
              </div>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="w-full min-h-screen bg-[#000000] text-white p-4 sm:px-6 pb-28 max-w-lg sm:max-w-3xl mx-auto select-none">
        
        {/* Top Header */}
        <div className="flex items-center justify-between py-2 border-b border-white/5 mb-4">
          <button
            onClick={handleExitExam}
            className="w-9 h-9 rounded-full bg-[#1C1C1E] flex items-center justify-center text-white active:scale-90 transition-transform"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-1.5 bg-[#1C1C1E] border border-amber-500/30 px-3 py-1.5 rounded-full text-xs font-mono font-bold text-amber-300">
            <Clock className="w-3.5 h-3.5" />
            <span>{minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}</span>
          </div>

          <button
            onClick={() => {
              if (window.confirm("Testni yakunlaysizmi?")) {
                handleFinishExam();
              }
            }}
            className="bg-[#007AFF] hover:bg-blue-600 text-white text-xs font-bold px-3 py-1.5 rounded-full active:scale-95 transition-transform"
          >
            Yakunlash
          </button>
        </div>

        {/* Question Grid Navigator */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-2 mb-4">
          {activeQuestions.map((_, idx) => {
            const isAnswered = userAnswers[idx] !== undefined;
            const isCurrent = idx === currentQIndex;
            return (
              <button
                key={idx}
                onClick={() => setCurrentQIndex(idx)}
                className={`w-9 h-9 rounded-xl flex-shrink-0 font-bold text-xs transition-all ${
                  isCurrent
                    ? 'bg-[#007AFF] text-white ring-2 ring-blue-400'
                    : isAnswered
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-[#1C1C1E] border border-white/5 text-[#8E8E93]'
                }`}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>

        {/* Current Question Card */}
        <div className="bg-[#1C1C1E] border border-white/5 rounded-3xl p-5 mb-5 space-y-4">
          <div className="flex items-center justify-between text-xs text-[#8E8E93]">
            <span>Savol {currentQIndex + 1} / {activeQuestions.length}</span>
            <span className="text-blue-400 font-bold">
              +{questionWeight.toFixed(1)} ball
            </span>
          </div>

          {currentQ?.imageUrl && (
            <div className="w-full aspect-video rounded-2xl overflow-hidden bg-black/40 border border-white/5">
              <img src={currentQ.imageUrl} alt="Savol rasmi" className="w-full h-full object-cover" />
            </div>
          )}

          <h3 className="text-white font-bold text-base leading-snug">
            {currentQ?.text}
          </h3>

          {/* Option UI: Choice vs Input */}
          {currentQ?.type === 'input' ? (
            <div className="pt-2">
              <label className="text-xs text-[#8E8E93] block mb-1">Javobingizni yozing:</label>
              <input
                type="text"
                value={userAnswers[currentQIndex] || ''}
                onChange={(e) => handleSelectAnswer(currentQIndex, e.target.value)}
                placeholder="Javobni kiriting..."
                className="w-full bg-[#2C2C2E] border border-white/10 rounded-2xl p-4 text-white text-base font-bold outline-none focus:border-[#007AFF]"
              />
            </div>
          ) : (
            <div className="space-y-2.5 pt-2">
              {(currentQ?.options || []).map((opt, oIdx) => {
                const isSelected = userAnswers[currentQIndex] === oIdx;
                return (
                  <button
                    key={oIdx}
                    onClick={() => handleSelectAnswer(currentQIndex, oIdx)}
                    className={`w-full p-4 rounded-2xl border text-left text-xs font-semibold flex items-center justify-between transition-all active:scale-[0.99] ${
                      isSelected
                        ? 'bg-[#007AFF] border-blue-400 text-white shadow-lg shadow-blue-500/25'
                        : 'bg-[#2C2C2E] border-white/5 text-white/90 hover:bg-[#343438]'
                    }`}
                  >
                    <span>{opt}</span>
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${isSelected ? 'border-white bg-white text-[#007AFF]' : 'border-white/20'}`}>
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Navigation Arrows */}
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={() => setCurrentQIndex(prev => Math.max(0, prev - 1))}
            disabled={currentQIndex === 0}
            className="flex-1 bg-[#1C1C1E] border border-white/5 disabled:opacity-40 text-white py-3.5 rounded-2xl font-bold text-xs active:scale-95 transition-transform"
          >
            ← Oldingi
          </button>
          <button
            onClick={() => {
              if (currentQIndex < activeQuestions.length - 1) {
                setCurrentQIndex(prev => prev + 1);
              } else {
                handleFinishExam();
              }
            }}
            className="flex-1 bg-[#007AFF] hover:bg-blue-600 text-white py-3.5 rounded-2xl font-bold text-xs active:scale-95 transition-transform"
          >
            {currentQIndex === activeQuestions.length - 1 ? 'Yakunlash ✓' : 'Keyingi →'}
          </button>
        </div>

        {/* Anti-cheat Warning Modal */}
        {showWarningModal && (
          <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-center justify-center p-6 text-center">
            <div className="bg-[#1C1C1E] border border-red-500/30 p-6 rounded-3xl max-w-xs w-full space-y-3">
              <div className="w-12 h-12 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center mx-auto text-2xl">
                ⚠️
              </div>
              <h4 className="text-white font-bold text-base">Ogohlantirish!</h4>
              <p className="text-xs text-[#8E8E93] leading-relaxed">
                Ilovadan chiqish yoki oynani almashtirish qat'iyan man etiladi! Yana bir marta takrorlansa, test avtomatik yakunlanadi.
              </p>
              <button
                onClick={() => setShowWarningModal(false)}
                className="w-full bg-[#007AFF] text-white py-3 rounded-xl font-bold text-xs"
              >
                Tushundim, davom etaman
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────
  // SCREEN 4: RESULTS & TAHLIL SCREEN
  // ──────────────────────────────────────────────────────────
  if (examFinished) {
    return (
      <div className="w-full min-h-screen bg-[#000000] text-white p-4 sm:px-6 pb-28 max-w-lg sm:max-w-3xl desktop:max-w-5xl mx-auto space-y-5 select-none">
        
        {/* Results Card */}
        <div className="bg-[#1C1C1E] border border-white/5 rounded-3xl p-6 sm:p-8 text-center space-y-5 shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 text-black flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/30">
            <Trophy className="w-8 h-8" />
          </div>

          <div>
            <h3 className="text-white font-extrabold text-2xl mb-1">Test yakunlandi!</h3>
            <p className="text-xs text-[#8E8E93]">
              {selectedTest?.title || "Rasmiy sinov testi"}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-4 pt-2 max-w-2xl mx-auto">
            <div className="bg-[#2C2C2E] p-3 sm:p-4 rounded-2xl">
              <span className="text-[10px] text-[#8E8E93] block">To'g'ri:</span>
              <span className="text-emerald-400 font-bold text-lg">{correctCount} / {activeQuestions.length}</span>
            </div>
            <div className="bg-[#2C2C2E] p-3 sm:p-4 rounded-2xl">
              <span className="text-[10px] text-[#8E8E93] block">To'plangan ball:</span>
              <span className="text-blue-400 font-bold text-lg">{totalScore} / {examMaxScore}</span>
            </div>
            <div className="bg-[#2C2C2E] p-3 sm:p-4 rounded-2xl">
              <span className="text-[10px] text-[#8E8E93] block">{selectedMode === 'dtm' ? 'Maksimal:' : 'Sertifikat:'}</span>
              <span className="text-amber-400 font-bold text-lg">{selectedMode === 'dtm' ? examMaxScore : certGrade}</span>
            </div>
          </div>

          {selectedMode !== 'dtm' && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-2xl text-xs text-emerald-300 font-semibold flex items-center justify-center gap-2 max-w-xl mx-auto">
              <Sparkles className="w-4 h-4" />
              <span>
                {`Sertifikat darajasi: ${certGrade} (${grantProb}%)`}
              </span>
            </div>
          )}

          <div className="pt-2 max-w-xl mx-auto">
            <button
              onClick={() => handleStartExam(selectedTest)}
              className="w-full bg-[#007AFF] hover:bg-blue-600 text-white font-bold py-3.5 px-3 rounded-2xl text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Qayta topshirish</span>
            </button>
          </div>

          <button
            onClick={() => {
              setExamFinished(false);
              setCurrentView('test_list');
            }}
            className="w-full max-w-xl mx-auto bg-[#1C1C1E] border border-white/10 hover:bg-[#2C2C2E] text-white/80 font-bold py-3 px-3 rounded-2xl text-xs flex items-center justify-center gap-1.5 transition-all"
          >
            <span>Boshqa variantlarni ko'rish</span>
          </button>
        </div>
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
        className="w-full text-white select-none flex flex-col h-full flex-1 overflow-hidden"
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
                    <span>Boshlash</span>
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
                    ? 'w-7 h-2 bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)]' 
                    : 'w-2 h-2 bg-white/30 hover:bg-white/50'
                }`}
                aria-label={`Go to slide ${idx + 1}`}
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
      ? 'Kimyo Testlari'
      : isSubjectMatem
      ? 'Matematika Testlari'
      : isSubjectBio
      ? 'Biologiya Testlari'
      : `${subjectRow?.name || activeSubjectData?.teacher?.subjectTitle || 'Fan'} Testlari`;

    const SubjectIcon = isSubjectKimyo
      ? FlaskConical
      : isSubjectMatem
      ? Calculator
      : isSubjectBio
      ? Dna
      : Sparkles;

    const subjectIconColor = isSubjectKimyo
      ? 'text-purple-400'
      : isSubjectMatem
      ? 'text-blue-400'
      : isSubjectBio
      ? 'text-emerald-400'
      : 'text-amber-400';

    const enabledModes = ['dtm', 'sertifikat'].filter(
      (modeKey) => activeSubjectData?.modes?.[modeKey]?.enabled ?? true
    );

    return (
      <div 
        className="w-full text-white select-none flex flex-col min-h-full px-4 sm:px-6 pt-2 space-y-5 max-w-md sm:max-w-4xl desktop:max-w-6xl mx-auto"
        style={{
          paddingBottom: 'calc(var(--safe-area-bottom, 0px) + 88px)'
        }}
      >
        {/* Subject Header Badge (SVG icon, no "Yo'nalishni tanlang") */}
        <div className="flex items-center justify-between pt-1">
          <div className="inline-flex items-center gap-2 bg-[#1C1C1E] border border-white/10 px-4 py-2 rounded-full text-xs sm:text-sm font-bold text-white shadow-sm">
            <SubjectIcon className={`w-4 h-4 ${subjectIconColor}`} />
            <span>{subjectLabel}</span>
          </div>
        </div>

        <div className="text-left space-y-1.5">
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight">
            Imtihon Turini Tanlang
          </h2>
          <p className="text-xs sm:text-sm text-[#8E8E93] max-w-2xl">
            O'zingizga kerakli imtihon formatini tanlang va bilimingizni sinang.
          </p>
        </div>

        {enabledModes.length === 0 ? (
          <div className="bg-[#1C1C1E] border border-white/10 rounded-3xl p-8 text-center text-xs text-[#8E8E93]">
            Hozircha bu fan uchun faol imtihon yo'nalishlari mavjud emas.
          </div>
        ) : (
          <div className={`grid gap-5 ${enabledModes.length > 1 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
            {enabledModes.map((modeKey) => {
              const modeCfg = activeSubjectData?.modes?.[modeKey] || {};
              const isSertifikat = modeKey === 'sertifikat';
              const variantCount = (activeSubjectData?.[modeKey] || []).length;
              const isWideSingle = enabledModes.length === 1;

              return (
                <div
                  key={modeKey}
                  onClick={() => handleSelectMode(modeKey)}
                  className={`relative bg-gradient-to-br from-[#1C1C1E] via-[#161618] to-[#0A0A0C] border rounded-3xl p-5 sm:p-7 cursor-pointer group active:scale-[0.99] transition-all ${
                    isSertifikat
                      ? 'border-amber-500/30 shadow-[0_8px_30px_rgba(245,158,11,0.14)] hover:border-amber-400/50'
                      : 'border-blue-500/30 shadow-[0_8px_30px_rgba(0,122,255,0.14)] hover:border-blue-400/50'
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
                          isSertifikat
                            ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                            : 'bg-blue-500/15 border-blue-500/30 text-blue-400'
                        }`}
                      >
                        {modeCfg.badge || (isSertifikat ? "Davlat Ta'lim Standarti" : 'Davlat Test Markazi (DTM)')}
                      </span>
                    </div>

                    <div>
                      <h3
                        className={`text-white font-extrabold text-lg sm:text-2xl transition-colors ${
                          isSertifikat ? 'group-hover:text-amber-300' : 'group-hover:text-blue-300'
                        }`}
                      >
                        {modeCfg.title || (isSertifikat ? 'Milliy Sertifikat' : 'DTM Mock Test')}
                      </h3>
                      <p className="text-xs sm:text-sm text-[#8E8E93] mt-1.5 leading-relaxed">
                        {modeCfg.description}
                      </p>
                    </div>

                    {Array.isArray(modeCfg.features) && modeCfg.features.length > 0 && (
                      <div className="space-y-2 text-xs text-white/85 pt-1">
                        {modeCfg.features.map((feat, fIdx) => (
                          <div key={fIdx} className="flex items-center gap-2 text-[11px] sm:text-xs">
                            <Sparkles
                              className={`w-3.5 h-3.5 flex-shrink-0 ${
                                fIdx % 2 === 0 ? 'text-purple-400' : 'text-emerald-400'
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
                      <div className="bg-[#242426] border border-white/5 p-2.5 sm:p-3 rounded-2xl">
                        <span className="text-[10px] text-[#8E8E93] block mb-0.5">Savollar:</span>
                        <span className="text-white font-bold sm:text-sm">
                          {modeCfg.questionCount || (isSertifikat ? 40 : 30)} ta
                        </span>
                      </div>
                      <div className="bg-[#242426] border border-white/5 p-2.5 sm:p-3 rounded-2xl">
                        <span className="text-[10px] text-[#8E8E93] block mb-0.5">Vaqt:</span>
                        <span className="text-amber-400 font-bold sm:text-sm">
                          {formatDurationLabel(modeCfg.durationMinutes || (isSertifikat ? 64 : 60))}
                        </span>
                      </div>
                      <div className="bg-[#242426] border border-white/5 p-2.5 sm:p-3 rounded-2xl">
                        <span className="text-[10px] text-[#8E8E93] block mb-0.5">Maksimal:</span>
                        <span className={`font-bold sm:text-sm ${isSertifikat ? 'text-amber-400' : 'text-emerald-400'}`}>
                          {modeCfg.maxScore || (isSertifikat ? 75 : 93)} ball
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
                      className={`w-full font-bold py-3.5 px-5 rounded-2xl text-xs sm:text-sm flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer z-10 ${
                        isSertifikat
                          ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black shadow-lg shadow-amber-500/25'
                          : 'bg-gradient-to-r from-[#007AFF] to-[#0A84FF] hover:brightness-110 text-white shadow-lg shadow-blue-500/25'
                      }`}
                    >
                      <span>Variantlarni ko'rish</span>
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
  // SCREEN 3: AVAILABLE TESTS ADDED BY TEACHER / ADMIN
  // ──────────────────────────────────────────────────────────
  const teacher = activeSubjectData?.teacher || {
    name: "Ustoz Rashidov",
    subjectTitle: "Biologiya",
    role: "Biologiya fani bosh o'qituvchisi",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80",
    badge: "Milliy Sertifikat eksperti",
    note: "Ushbu bo'limdagi barcha variantlar Milliy sertifikat dasturi talablari asosida o'qituvchi tomonidan tuzilgan."
  };

  const modeTitle = activeModeConfig?.title || (selectedMode === 'dtm' ? 'DTM Mock Testlar' : 'Milliy Sertifikat Variantlari');

  return (
    <div 
      className="w-full text-white select-none flex flex-col min-h-full px-4 sm:px-6 pt-2 space-y-4 sm:space-y-5 max-w-md sm:max-w-4xl desktop:max-w-6xl mx-auto"
      style={{
        paddingBottom: 'calc(var(--safe-area-bottom, 0px) + 88px)'
      }}
    >
      {/* Header Info */}
      <div className="flex items-center justify-between pt-1">
        <button
          onClick={() => {
            impactLight();
            setCurrentView('mode_select');
          }}
          className="flex items-center gap-1.5 text-xs sm:text-sm text-[#8E8E93] hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Yo'nalishlarga qaytish</span>
        </button>

        <span className="text-[11px] font-bold text-blue-400 bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20">
          {activeModeTests.length} ta variant mavjud
        </span>
      </div>

      {/* Section Title */}
      <div className="flex items-center justify-between pt-1">
        <h3 className="text-white font-black text-base sm:text-lg tracking-wide flex items-center gap-2">
          {selectedMode === 'dtm' ? (
            <Zap className="w-5 h-5 text-blue-400" />
          ) : (
            <Award className="w-5 h-5 text-amber-400" />
          )}
          <span>{modeTitle}</span>
        </h3>
        <span className="text-xs text-[#8E8E93]">
          {teacher.subjectTitle}
        </span>
      </div>

      {/* Available Tests Grid (1-col Phone, 2-col Tablet, 3-col PC) */}
      {activeModeTests.length === 0 ? (
        <div className="bg-[#1C1C1E] border border-white/10 rounded-3xl p-8 text-center text-xs sm:text-sm text-[#8E8E93]">
          Hozircha bu bo'limda test variantlari qo'shilmagan.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeModeTests.map((test, index) => {
            return (
              <div 
                key={test.id || index}
                className="bg-[#1C1C1E] border border-white/5 hover:border-white/15 rounded-3xl p-4 sm:p-5 flex flex-col justify-between gap-4 transition-all shadow-md group"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${test.badgeColor || 'bg-white/10 text-white border-white/10'}`}>
                        {test.badge}
                      </span>
                      <h4 className="text-white font-bold text-sm sm:text-base group-hover:text-blue-300 transition-colors pt-1">
                        {test.title}
                      </h4>
                    </div>

                    <div className="w-8 h-8 rounded-xl bg-[#242426] flex items-center justify-center text-white/70 flex-shrink-0 text-xs font-mono font-bold">
                      #{index + 1}
                    </div>
                  </div>

                  <p className="text-xs text-[#8E8E93] leading-relaxed">
                    {test.description}
                  </p>

                  {/* Specs Chips */}
                  <div className="flex items-center flex-wrap gap-2 text-[11px]">
                    <div className="bg-[#242426] px-2.5 py-1 rounded-xl text-white/80 flex items-center gap-1">
                      <FileText className="w-3 h-3 text-blue-400" />
                      <span>{test.questionCount} ta savol</span>
                    </div>
                    <div className="bg-[#242426] px-2.5 py-1 rounded-xl text-white/80 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-amber-400" />
                      <span>{formatDurationLabel(test.durationMinutes)}</span>
                    </div>
                    <div className={`px-2.5 py-1 rounded-xl border ${test.difficultyColor || 'text-amber-400 bg-amber-400/10 border-amber-400/20'}`}>
                      <span>{test.difficulty}</span>
                    </div>
                  </div>
                </div>

                {/* Start Button */}
                <button
                  type="button"
                  onClick={() => handleStartExam(test)}
                  className={`w-full bg-gradient-to-r ${buttonGradient} hover:brightness-110 text-white font-bold py-3 px-4 rounded-2xl text-xs flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all cursor-pointer`}
                >
                  <span>Testni boshlash</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
