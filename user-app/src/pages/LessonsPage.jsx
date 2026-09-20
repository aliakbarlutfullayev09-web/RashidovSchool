import React, { useState, useEffect } from 'react';
import BottomSheet from '../components/BottomSheet';
import { getSubjects, getCourses, getLessons, getProgress } from '../api/supabase';

export default function LessonsPage({ user }) {
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [progressMap, setProgressMap] = useState({});
  const [loading, setLoading] = useState(true);

  const [bottomSheetOpen, setBottomSheetOpen] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState(null);

  useEffect(() => {
    loadInitialData();
  }, [user]);

  useEffect(() => {
    if (selectedSubject) {
      loadLessonsForSubject(selectedSubject.id);
    }
  }, [selectedSubject]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const subs = await getSubjects();
      setSubjects(subs || []);
      if (subs && subs.length > 0) {
        setSelectedSubject(subs[0]);
      }
      
      if (user?.id) {
        const prog = await getProgress(user.id);
        const pMap = {};
        if (prog) {
          prog.forEach(p => {
            pMap[p.lesson_id] = p;
          });
        }
        setProgressMap(pMap);
      }
    } catch (err) {
      console.error("Error loading initial data", err);
    }
    setLoading(false);
  };

  const loadLessonsForSubject = async (subjectId) => {
    try {
      const allCourses = await getCourses();
      const subjectCourses = allCourses.filter(c => c.subject_id === subjectId);
      
      let allLessons = [];
      for (const course of subjectCourses) {
        const courseLessons = await getLessons(course.id);
        allLessons = [...allLessons, ...courseLessons];
      }
      
      allLessons.sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
      setLessons(allLessons);
    } catch (err) {
      console.error("Error loading lessons", err);
    }
  };

  const handleCardClick = (lesson) => {
    setSelectedLesson(lesson);
    setBottomSheetOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#000000] text-white pb-20">
      {/* Subject Chips Row */}
      <div className="w-full overflow-x-auto hide-scrollbar px-4 py-3 flex gap-2 border-b border-white/10">
        {subjects.map(subject => {
          const isActive = selectedSubject?.id === subject.id;
          return (
            <button
              key={subject.id}
              onClick={() => setSelectedSubject(subject)}
              className={`whitespace-nowrap px-4 py-2 rounded-full text-[14px] font-medium transition-colors ${
                isActive 
                  ? 'chip-active bg-[#007AFF] text-white' 
                  : 'chip-inactive bg-[#1C1C1E] text-[#8E8E93]'
              }`}
            >
              {subject.emoji} {subject.name}
            </button>
          );
        })}
      </div>

      {/* YouTube-style Lesson Card Feed */}
      <div className="flex flex-col p-4 gap-6">
        {loading ? (
          <div className="text-center text-[#8E8E93] py-10">Yuklanmoqda...</div>
        ) : lessons.length === 0 ? (
          <div className="text-center text-[#8E8E93] py-10">Bu fanda darslar topilmadi.</div>
        ) : (
          lessons.map(lesson => {
            const progress = progressMap[lesson.id];
            // If the user's progress indicates not unlocked, and it isn't explicitly a free lesson, lock it.
            const isLocked = progress?.is_unlocked === false && !lesson.is_free;
            const isCompleted = progress?.stars > 0;
            const percentage = progress?.score || 0;

            return (
              <div 
                key={lesson.id} 
                onClick={() => handleCardClick(lesson)}
                className="lesson-card flex flex-col cursor-pointer"
              >
                {/* Thumbnail Area */}
                <div className="lesson-thumbnail relative w-full aspect-video rounded-2xl overflow-hidden mb-3 bg-[#1C1C1E] border border-white/5">
                  {lesson.thumbnail_url ? (
                    <img src={lesson.thumbnail_url} alt={lesson.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-indigo-900/60 to-purple-900/40 flex items-center justify-center">
                      <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md">
                        <span className="text-white text-xl translate-x-0.5">▶</span>
                      </div>
                    </div>
                  )}
                  
                  {/* Badges Overlay */}
                  <div className="absolute top-2 right-2 flex flex-col gap-2 items-end">
                    {lesson.is_free ? (
                      <span className="badge-free bg-green-500/90 text-white text-[11px] font-bold px-2 py-1 rounded-md backdrop-blur-md">
                        Bepul
                      </span>
                    ) : isLocked ? (
                      <span className="badge-locked bg-black/80 text-white text-[11px] font-medium px-2 py-1 rounded-md flex items-center gap-1 backdrop-blur-md">
                        <span>🔒</span> Kanalga a'zo bo'ling
                      </span>
                    ) : null}
                  </div>
                  
                  <div className="absolute bottom-2 right-2">
                    <span className="badge-duration bg-black/80 text-white text-[11px] font-medium px-1.5 py-0.5 rounded backdrop-blur-md">
                      {lesson.duration || '00:00'}
                    </span>
                  </div>
                </div>

                {/* Card Content */}
                <div className="flex flex-col px-1">
                  <h3 className="font-bold text-white text-[15px] mb-1 line-clamp-2 leading-tight">
                    {lesson.order_index || 1}-Dars. {lesson.title}
                  </h3>
                  <p className="text-[13px] text-[#8E8E93] mb-3">
                    Rashidov Biologiya • {lesson.view_count || 0} ko'rildi • {lesson.question_count || 0} ta test savoli
                  </p>
                  
                  {/* CTA Button */}
                  <div className="flex items-center">
                    {isCompleted ? (
                      <span className="pill pill-green bg-green-500/20 text-green-400 border border-green-500/30 text-[13px] font-medium px-3 py-1.5 rounded-full inline-flex items-center gap-1.5">
                        <span className="text-xs">✓</span> Topshirildi ({percentage}%)
                      </span>
                    ) : isLocked ? (
                      <span className="pill pill-dark bg-[#1C1C1E] text-[#8E8E93] text-[13px] font-medium px-3 py-1.5 rounded-full inline-flex items-center gap-1.5">
                        <span>🔒</span> Qulflangan
                      </span>
                    ) : (
                      <button className="pill pill-blue bg-[#007AFF] text-white text-[13px] font-medium px-3 py-1.5 rounded-full inline-flex items-center gap-1.5">
                        <span>▶️</span> Boshlash
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <BottomSheet 
        isOpen={bottomSheetOpen}
        onClose={() => setBottomSheetOpen(false)}
        lesson={selectedLesson}
        progress={selectedLesson ? progressMap[selectedLesson.id] : null}
        onWatch={(lesson) => {
          console.log("Watch lesson", lesson);
          setBottomSheetOpen(false);
          // Insert navigation or video playing logic here
        }}
        onRewatch={(lesson) => {
          console.log("Rewatch lesson", lesson);
          setBottomSheetOpen(false);
        }}
        onRetake={(lesson) => {
          console.log("Retake tests", lesson);
          setBottomSheetOpen(false);
        }}
        onAnalysis={(lesson) => {
          console.log("Analysis", lesson);
          setBottomSheetOpen(false);
        }}
      />
    </div>
  );
}
