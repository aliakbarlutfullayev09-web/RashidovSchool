import React, { useState, useEffect } from 'react';
import TreeOfKnowledge from '../components/TreeOfKnowledge';
import BottomSheet from '../components/BottomSheet';
import VideoPlayer from '../components/VideoPlayer';
import { getSubjects, getCourses, getLessons, getProgress, getVideoCheckpoints } from '../api/supabase';
import { mockCourses, mockLessons, mockProgress } from '../mock/data';
import { Play, CheckCircle2, Lock, Trophy, Clock, HelpCircle, Sparkles } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useHaptic } from '../hooks/useHaptic';

const DEFAULT_SUBJECT_CHIPS = [
  { id: 1, name: 'Biologiya', emoji: '🧬' },
  { id: 2, name: 'Kimyo', emoji: '🧪' },
  { id: 3, name: 'Matematika', emoji: '📐' }
];

export default function LessonsPage({ user }) {
  const { t } = useLanguage();
  const { selectionChanged, impactLight } = useHaptic();

  const [subjects, setSubjects] = useState(DEFAULT_SUBJECT_CHIPS);
  const [activeSubjectId, setActiveSubjectId] = useState(1);
  const [courses, setCourses] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [progressMap, setProgressMap] = useState({});
  const [loading, setLoading] = useState(true);

  // Lesson Preview Bottom Sheet state
  const [bottomSheetOpen, setBottomSheetOpen] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState(null);

  // Video playback state
  const [playingLesson, setPlayingLesson] = useState(null);
  const [checkpoints, setCheckpoints] = useState([]);

  useEffect(() => {
    loadSubjects();
  }, []);

  const loadSubjects = async () => {
    try {
      const dbSubjects = await getSubjects();
      if (dbSubjects && dbSubjects.length > 0) {
        setSubjects(dbSubjects);
        setActiveSubjectId(prev => (dbSubjects.some(s => s.id === prev) ? prev : dbSubjects[0].id));
      }
    } catch (e) {
      console.warn("Failed to load dynamic subjects:", e);
    }
  };

  useEffect(() => {
    loadData();
  }, [user, activeSubjectId]);

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Fetch courses for subject
      const dbCourses = await getCourses(activeSubjectId);
      const activeCourses = (dbCourses && dbCourses.length > 0) ? dbCourses : mockCourses;
      setCourses(activeCourses);

      // 2. Fetch lessons
      let allLessons = [];
      for (const course of activeCourses) {
        const cLessons = await getLessons(course.id);
        allLessons = [...allLessons, ...(cLessons || [])];
      }
      if (allLessons.length === 0) {
        allLessons = mockLessons;
      }
      setLessons(allLessons);

      // 3. Fetch user progress
      if (user?.telegram_id || user?.id) {
        const userUid = user.telegram_id || user.id;
        const prog = await getProgress(userUid);
        const pMap = {};
        if (prog && prog.length > 0) {
          prog.forEach(p => { pMap[p.lesson_id] = p; });
        } else {
          mockProgress.forEach(p => { pMap[p.lesson_id] = p; });
        }
        setProgressMap(pMap);
      } else {
        const pMap = {};
        mockProgress.forEach(p => { pMap[p.lesson_id] = p; });
        setProgressMap(pMap);
      }
    } catch (err) {
      console.error("Error loading lessons data:", err);
      setCourses(mockCourses);
      setLessons(mockLessons);
    } finally {
      setLoading(false);
    }
  };

  const handleSubjectChange = (subjectId) => {
    if (activeSubjectId !== subjectId) {
      selectionChanged();
      setActiveSubjectId(subjectId);
    }
  };

  const handleLessonClick = (lesson) => {
    impactLight();
    setSelectedLesson(lesson);
    setBottomSheetOpen(true);
  };

  const handleStartVideo = async (lesson) => {
    setBottomSheetOpen(false);
    try {
      const cps = await getVideoCheckpoints(lesson.id);
      setCheckpoints(cps && cps.length > 0 ? cps : [
        { id: 1, trigger_time_sec: 5, question: "Hujayraning energetik stansiyasi nima?", options: ["Ribosoma", "Mitoxondriya", "Xloroplast", "Golji"], correct_option: "Mitoxondriya", rewind_time_sec: 0 }
      ]);
    } catch {
      setCheckpoints([]);
    }
    setPlayingLesson(lesson);
  };

  // Calculate overall stats for Tree of Knowledge
  const totalLessons = lessons.length || 1;
  const completedLessons = Object.values(progressMap).filter(p => p?.stars > 0).length;

  if (playingLesson) {
    return (
      <VideoPlayer
        videoUrl={playingLesson.video_url}
        lessonId={playingLesson.id}
        lessonTitle={playingLesson.title}
        checkpoints={checkpoints}
        onStartQuiz={() => {
          setPlayingLesson(null);
          alert("Dars testi botda yoki Testlar bo'limida boshlanadi!");
        }}
        onBack={() => setPlayingLesson(null)}
      />
    );
  }

  return (
    <div className="w-full pb-28 pt-2 px-4 max-w-5xl mx-auto">
      
      {/* Hero Banner: Interactive Tree of Knowledge */}
      <TreeOfKnowledge
        completedCount={completedLessons}
        totalCount={totalLessons}
        onContinue={() => {
          const nextLesson = lessons.find(l => !progressMap[l.id]?.stars) || lessons[0];
          if (nextLesson) handleLessonClick(nextLesson);
        }}
      />

      {/* Sticky Subject Chips Row */}
      <div className="sticky top-[72px] z-20 bg-[#000000]/90 backdrop-blur-md py-2.5 -mx-4 px-4 mb-4 border-b border-white/[0.04]">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          {subjects.map((chip) => {
            const isActive = activeSubjectId === chip.id;
            const emoji = chip.emoji || chip.icon || (chip.name?.toLowerCase().includes('kimyo') ? '🧪' : chip.name?.toLowerCase().includes('matem') ? '📐' : '🧬');
            return (
              <button
                key={chip.id}
                onClick={() => handleSubjectChange(chip.id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all select-none whitespace-nowrap active:scale-95 ${
                  isActive
                    ? 'bg-[#007AFF] text-white shadow-lg shadow-blue-500/20'
                    : 'bg-[#1C1C1E] border border-white/5 text-[#8E8E93] hover:text-white'
                }`}
              >
                <span>{emoji}</span>
                <span>{chip.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Modular YouTube-Style Lesson Feed */}
      <div className="space-y-8">
        {courses.map((course, cIdx) => {
          const courseLessons = lessons.filter(l => l.course_id === course.id);
          const courseCompletedCount = courseLessons.filter(l => progressMap[l.id]?.stars > 0).length;
          const courseProgressPct = Math.round((courseCompletedCount / (courseLessons.length || 1)) * 100);

          return (
            <div key={course.id || cIdx} className="space-y-4">
              
              {/* Module Header with Progress */}
              <div className="bg-[#1C1C1E] border border-white/5 p-4 rounded-2xl flex items-center justify-between">
                <div>
                  <h3 className="text-white font-bold text-sm leading-tight">
                    {cIdx + 1}-Modul: {course.title}
                  </h3>
                  <span className="text-[11px] text-[#8E8E93]">
                    {courseCompletedCount}/{courseLessons.length} dars topshirildi
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full">
                    {courseProgressPct}%
                  </span>
                </div>
              </div>

              {/* Lesson Cards in Module */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {courseLessons.map((lesson, lIdx) => {
                  const prog = progressMap[lesson.id];
                  const isLocked = prog?.is_unlocked === false && !lesson.is_free;
                  const isCompleted = prog?.stars > 0;
                  const score = prog?.score || 95;

                  return (
                    <div
                      key={lesson.id || lIdx}
                      onClick={() => handleLessonClick(lesson)}
                      className="bg-[#1C1C1E] border border-white/5 hover:border-white/10 rounded-3xl overflow-hidden p-3 transition-all cursor-pointer active:scale-[0.98] group flex flex-col justify-between"
                    >
                      {/* 16:9 Thumbnail Area */}
                      <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-[#2C2C2E] mb-3">
                        {lesson.thumbnail_url ? (
                          <img 
                            src={lesson.thumbnail_url} 
                            alt={lesson.title} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-tr from-blue-900/40 to-indigo-900/30 flex items-center justify-center">
                            <span className="text-3xl">🧬</span>
                          </div>
                        )}

                        {/* Top-Left: Lesson Number Badge */}
                        <div className="absolute top-2 left-2 bg-black/75 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
                          {lesson.order_index || lIdx + 1}-Dars
                        </div>

                        {/* Bottom-Right: Duration Badge */}
                        <div className="absolute bottom-2 right-2 bg-black/85 backdrop-blur-md text-white text-[10px] font-mono px-1.5 py-0.5 rounded flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5 text-[#8E8E93]" />
                          <span>{lesson.duration || '14:20'}</span>
                        </div>

                        {/* Bottom-Left Status Badges */}
                        <div className="absolute bottom-2 left-2">
                          {isCompleted ? (
                            <span className="bg-emerald-500/90 text-white text-[10px] font-bold px-2 py-0.5 rounded backdrop-blur-md flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> {score}%
                            </span>
                          ) : lesson.is_free ? (
                            <span className="bg-emerald-600/90 text-white text-[10px] font-bold px-2 py-0.5 rounded backdrop-blur-md">
                              Bepul
                            </span>
                          ) : isLocked ? (
                            <span className="bg-black/80 text-white text-[10px] font-bold px-2 py-0.5 rounded backdrop-blur-md flex items-center gap-1">
                              <Lock className="w-2.5 h-2.5" /> A'zolik
                            </span>
                          ) : null}
                        </div>
                      </div>

                      {/* Card Body */}
                      <div className="flex flex-col flex-1 justify-between px-1">
                        <div>
                          <h4 className="text-white font-bold text-sm leading-snug line-clamp-2 mb-1">
                            {lesson.title}
                          </h4>
                          <p className="text-[11px] text-[#8E8E93] mb-3">
                            Rashidov Biologiya • {lesson.test_question_count || 10} ta test savoli
                          </p>
                        </div>

                        {/* Action Pill */}
                        <div className="pt-2 border-t border-white/[0.04] flex items-center justify-between">
                          {isCompleted ? (
                            <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
                              ✓ Topshirildi
                            </span>
                          ) : isLocked ? (
                            <span className="text-[11px] font-semibold text-[#8E8E93] flex items-center gap-1">
                              🔒 Qulflangan
                            </span>
                          ) : (
                            <span className="text-[11px] font-bold text-[#007AFF] flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                              <span>▶️ Boshlash</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Module Boss Card — Module Mock Test */}
              <div className="mt-4 bg-gradient-to-r from-amber-500/10 via-[#1C1C1E] to-emerald-500/10 border border-amber-500/30 rounded-3xl p-4 flex items-center justify-between shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-xl flex-shrink-0">
                    🏆
                  </div>
                  <div>
                    <h4 className="text-white font-bold text-xs leading-tight">
                      {cIdx + 1}-Modul Yakuniy Mock Testi
                    </h4>
                    <span className="text-[11px] text-[#8E8E93]">
                      20 ta savol • 25 daqiqa • Sertifikat
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    impactLight();
                    if (courseCompletedCount < courseLessons.length) {
                      alert("Ushbu mock testni ochish uchun avval barcha modul darslarini topshiring!");
                    } else {
                      alert("Modul Yakuniy Mock Testi boshlanmoqda...");
                    }
                  }}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                    courseCompletedCount >= courseLessons.length
                      ? 'bg-amber-500 hover:bg-amber-400 text-black shadow-lg shadow-amber-500/20'
                      : 'bg-[#2C2C2E] text-[#8E8E93] cursor-not-allowed'
                  }`}
                >
                  {courseCompletedCount >= courseLessons.length ? 'Boshlash' : '🔒 Qulflangan'}
                </button>
              </div>

            </div>
          );
        })}
      </div>

      {/* Lesson Preview Bottom Sheet */}
      <BottomSheet
        isOpen={bottomSheetOpen}
        onClose={() => setBottomSheetOpen(false)}
        lesson={selectedLesson}
        progress={selectedLesson ? progressMap[selectedLesson.id] : null}
        onWatch={handleStartVideo}
        onRewatch={handleStartVideo}
        onRetake={() => {
          setBottomSheetOpen(false);
          alert("Testni qayta topshirish botda boshlanadi!");
        }}
        onAnalysis={() => {
          setBottomSheetOpen(false);
          alert("Ushbu dars bo'yicha xatolar tahlili Profil bo'limida mavjud.");
        }}
      />
    </div>
  );
}
