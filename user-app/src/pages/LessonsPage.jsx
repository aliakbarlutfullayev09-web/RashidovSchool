import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import BottomSheet from '../components/BottomSheet';
import VideoPlayer from '../components/VideoPlayer';
import { getSubjects, getCourses, getLessons, getProgress, supabase } from '../api/supabase';
import { useHaptic } from '../hooks/useHaptic';

export default function LessonsPage({ user }) {
  const [subjects, setSubjects] = useState([]);
  const [courses, setCourses] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [progresses, setProgresses] = useState([]);
  
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [selectedCourseFolder, setSelectedCourseFolder] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const { impactLight } = useHaptic();

  useEffect(() => {
    async function loadData() {
      if (!user) return;
      const [sData, cData, lData, pData] = await Promise.all([
        getSubjects(),
        getCourses(),
        getLessons(),
        getProgress(user.telegram_id)
      ]);
      setSubjects(sData);
      setCourses(cData);
      setLessons(lData);
      setProgresses(pData);
    }
    loadData();
  }, [user]);

  const handleSubjectClick = (subject) => {
    impactLight();
    setSelectedSubject(subject);
    setSelectedCourseFolder(null);
  };

  const handleCourseFolderClick = (course) => {
    impactLight();
    setSelectedCourseFolder(course);
  };

  const handleCardClick = (lesson) => {
    impactLight();
    const progress = progresses.find(p => p.lesson_id === lesson.id) || { is_unlocked: false, stars: 0 };
    const course = courses.find(c => c.id === lesson.course_id);
    if (course && course.price === 0) {
      progress.is_unlocked = true;
    }
    setSelectedNode({ lesson, progress, course });
  };

  const handleCloseSheet = () => setSelectedNode(null);
  const handleWatch = () => setIsPlaying(true);
  
  const handleBuy = async () => {
    if (!selectedNode || !user) return;
    const { course } = selectedNode;
    
    if (user.balance < course.price) {
      alert('Недостаточно нейронов!');
      return;
    }
    
    const newBalance = user.balance - course.price;
    await supabase.from('users').update({ balance: newBalance }).eq('telegram_id', user.telegram_id);
    
    const courseLessons = lessons.filter(l => l.course_id === course.id);
    const inserts = courseLessons.map(l => ({
      user_id: user.telegram_id,
      lesson_id: l.id,
      is_unlocked: true,
      stars: 0
    }));
    await supabase.from('progress').upsert(inserts);
    
    alert(`Курс успешно куплен!`);
    window.location.reload(); 
  };

  const handleVideoComplete = () => {
     console.log('Video completed');
  };
  
  const handleVideoBack = () => setIsPlaying(false);

  if (isPlaying && selectedNode?.lesson) {
    return (
      <VideoPlayer 
        videoUrl={selectedNode.lesson.video_url} 
        lessonId={selectedNode.lesson.id}
        onComplete={handleVideoComplete}
        onBack={handleVideoBack}
      />
    );
  }

  const subjectCourses = selectedSubject ? courses.filter(c => c.subject_id === selectedSubject.id) : [];
  const courseLessons = selectedCourseFolder ? lessons.filter(l => l.course_id === selectedCourseFolder.id) : [];

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#0f0c29]">
      <Header user={user} />
      
      <div className="flex-1 overflow-y-auto no-scrollbar pb-24 px-4 space-y-6 mt-4">
        
        {!selectedSubject ? (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white px-1">Предметы</h2>
            {subjects.length === 0 && <div className="text-center text-slate-400 mt-10">Загрузка предметов...</div>}
            
            <div className="grid grid-cols-1 gap-4">
              {subjects.map(subj => (
                <div 
                  key={subj.id}
                  onClick={() => handleSubjectClick(subj)}
                  className="bg-white/10 border border-white/20 p-6 rounded-2xl flex items-center space-x-4 cursor-pointer hover:bg-white/15 active:scale-95 transition-transform"
                >
                  <div className="text-4xl">{subj.name.includes('Биолог') ? '🧬' : subj.name.includes('Хими') ? '🧪' : '📐'}</div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-white">{subj.name}</h3>
                    <p className="text-sm text-slate-400">Перейти к курсам</p>
                  </div>
                  <div className="text-slate-400">➔</div>
                </div>
              ))}
            </div>
          </div>
        ) : !selectedCourseFolder ? (
          <div className="space-y-6">
            <button 
              onClick={() => setSelectedSubject(null)}
              className="flex items-center space-x-2 text-blue-400 font-bold active:opacity-50"
            >
              <span>←</span> <span>Назад к предметам</span>
            </button>
            
            <h2 className="text-2xl font-bold text-white px-1">Курсы: {selectedSubject.name}</h2>

            {subjectCourses.length === 0 && (
              <div className="text-center text-slate-400 mt-10">
                В этом предмете пока нет курсов.
              </div>
            )}

            <div className="grid grid-cols-1 gap-4">
              {subjectCourses.map(course => {
                const cLessons = lessons.filter(l => l.course_id === course.id);
                return (
                  <div 
                    key={course.id}
                    onClick={() => handleCourseFolderClick(course)}
                    className="bg-slate-800/80 border border-white/10 p-5 rounded-2xl flex items-center space-x-4 cursor-pointer hover:bg-slate-700/80 active:scale-95 transition-transform"
                  >
                    <div className="w-12 h-12 bg-blue-900/50 rounded-xl flex items-center justify-center text-2xl">
                      📁
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-white leading-tight">{course.title}</h3>
                      <p className="text-sm text-slate-400 mt-1">
                        Уроков: {cLessons.length} • {course.price === 0 ? 'Бесплатно' : `${course.price} Н`}
                      </p>
                    </div>
                    <div className="text-slate-400">➔</div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <button 
              onClick={() => setSelectedCourseFolder(null)}
              className="flex items-center space-x-2 text-blue-400 font-bold active:opacity-50"
            >
              <span>←</span> <span>Назад к курсам</span>
            </button>
            
            <h2 className="text-xl font-bold text-white px-1">{selectedCourseFolder.title}</h2>

            {courseLessons.length === 0 && (
              <div className="text-center text-slate-400 mt-10">
                В этом курсе пока нет уроков.
              </div>
            )}

            <div className="grid grid-cols-1 gap-5">
              {courseLessons.map(lesson => {
                let progress = progresses.find(p => p.lesson_id === lesson.id) || { is_unlocked: false, stars: 0 };
                if (selectedCourseFolder.price === 0) progress.is_unlocked = true;
                
                const isLocked = !progress.is_unlocked;
                const isCompleted = progress.is_unlocked && progress.stars > 0;

                return (
                  <div 
                    key={lesson.id} 
                    onClick={() => handleCardClick(lesson)}
                    className="group cursor-pointer flex flex-col transition-transform active:scale-95"
                  >
                    <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-slate-800 shadow-lg border border-white/5 flex items-center justify-center">
                      {lesson.video_url ? (
                         <div className="absolute inset-0 bg-gradient-to-tr from-indigo-900 to-purple-900 opacity-50"></div>
                      ) : (
                         <div className="absolute inset-0 bg-slate-800"></div>
                      )}
                      <span className="relative z-10 text-4xl opacity-30">▶️</span>
                      
                      {isLocked && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-20">
                          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-2xl shadow-xl">
                            🔒
                          </div>
                        </div>
                      )}

                      {!isLocked && (
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 z-20">
                          <div className="w-14 h-14 bg-blue-500/90 rounded-full flex items-center justify-center text-white text-2xl shadow-lg pl-1">
                            ▶
                          </div>
                        </div>
                      )}

                      {isCompleted && (
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-700 z-30">
                          <div className="h-full bg-blue-500 w-full"></div>
                        </div>
                      )}
                    </div>

                    <div className="mt-3 flex justify-between items-start px-1">
                      <div>
                        <h3 className="text-base font-bold text-slate-100 leading-tight line-clamp-2">
                          {lesson.title}
                        </h3>
                        <p className="text-sm text-slate-400 mt-1">
                          {isLocked ? `Требуется покупка: ${selectedCourseFolder.price} Н` : (isCompleted ? 'Просмотрено' : 'Готово к просмотру')}
                        </p>
                      </div>
                      
                      {isCompleted && (
                        <div className="flex space-x-0.5 mt-1 bg-black/30 px-2 py-1 rounded-full">
                          {[1, 2, 3].map(star => (
                            <span key={star} className={`text-xs ${star <= progress.stars ? "text-yellow-400" : "text-gray-600"}`}>
                              ★
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>

      <BottomSheet 
        isOpen={!!selectedNode} 
        onClose={handleCloseSheet}
        lesson={selectedNode?.lesson}
        progress={selectedNode?.progress}
        course={selectedNode?.course}
        onWatch={handleWatch}
        onBuy={handleBuy}
      />
    </div>
  );
}
