import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import BottomSheet from '../components/BottomSheet';
import VideoPlayer from '../components/VideoPlayer';
import { getCourses, getLessons, getProgress, supabase } from '../api/supabase';
import { useHaptic } from '../hooks/useHaptic';

export default function LessonsPage({ user }) {
  const [courses, setCourses] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [progresses, setProgresses] = useState([]);
  
  const [selectedNode, setSelectedNode] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const { impactLight } = useHaptic();

  useEffect(() => {
    async function loadData() {
      if (!user) return;
      const [cData, lData, pData] = await Promise.all([
        getCourses(1), // Биология
        getLessons(),
        getProgress(user.telegram_id)
      ]);
      setCourses(cData);
      setLessons(lData);
      setProgresses(pData);
    }
    loadData();
  }, [user]);

  const handleCardClick = (lesson) => {
    impactLight();
    const progress = progresses.find(p => p.lesson_id === lesson.id) || { is_unlocked: false, stars: 0 };
    // Если курс бесплатный, все его уроки доступны
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
    
    // Списываем баланс
    const newBalance = user.balance - course.price;
    await supabase.from('users').update({ balance: newBalance }).eq('telegram_id', user.telegram_id);
    
    // Открываем все уроки курса
    const courseLessons = lessons.filter(l => l.course_id === course.id);
    const inserts = courseLessons.map(l => ({
      user_id: user.telegram_id,
      lesson_id: l.id,
      is_unlocked: true,
      stars: 0
    }));
    await supabase.from('progress').upsert(inserts);
    
    alert(`Курс успешно куплен!`);
    window.location.reload(); // Простой способ обновить данные
  };

  const handleVideoComplete = () => {
     console.log('Video completed');
     // Здесь можно добавлять логику прохождения (тесты и т.д.)
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

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#0f0c29]">
      <Header user={user} />
      
      {/* Скроллируемый список как в YouTube */}
      <div className="flex-1 overflow-y-auto no-scrollbar pb-24 px-4 space-y-8">
        
        {courses.length === 0 && (
          <div className="text-center text-slate-400 mt-10">
            Здесь пока нет курсов. Скоро они появятся!
          </div>
        )}

        {/* Группируем уроки по курсам */}
        {courses.map(course => {
          const courseLessons = lessons.filter(l => l.course_id === course.id);
          if (courseLessons.length === 0) return null;

          return (
            <div key={course.id} className="space-y-4">
              <h2 className="text-xl font-bold text-white px-1">{course.title}</h2>
              
              <div className="grid grid-cols-1 gap-5">
                {courseLessons.map(lesson => {
                  let progress = progresses.find(p => p.lesson_id === lesson.id) || { is_unlocked: false, stars: 0 };
                  if (course.price === 0) progress.is_unlocked = true;
                  
                  const isLocked = !progress.is_unlocked;
                  const isCompleted = progress.is_unlocked && progress.stars > 0;

                  return (
                    <div 
                      key={lesson.id} 
                      onClick={() => handleCardClick(lesson)}
                      className="group cursor-pointer flex flex-col transition-transform active:scale-95"
                    >
                      {/* Thumbnail (16:9) */}
                      <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-slate-800 shadow-lg border border-white/5 flex items-center justify-center">
                        {lesson.video_url ? (
                           <div className="absolute inset-0 bg-gradient-to-tr from-indigo-900 to-purple-900 opacity-50"></div>
                        ) : (
                           <div className="absolute inset-0 bg-slate-800"></div>
                        )}
                        <span className="relative z-10 text-4xl opacity-30">🧬</span>
                        
                        {/* Lock Overlay */}
                        {isLocked && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-20">
                            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-2xl shadow-xl">
                              🔒
                            </div>
                          </div>
                        )}

                        {/* Play Icon (if unlocked) */}
                        {!isLocked && (
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 z-20">
                            <div className="w-14 h-14 bg-blue-500/90 rounded-full flex items-center justify-center text-white text-2xl shadow-lg pl-1">
                              ▶
                            </div>
                          </div>
                        )}

                        {/* Progress Bar (if watched) */}
                        {isCompleted && (
                          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-700 z-30">
                            <div className="h-full bg-blue-500 w-full"></div>
                          </div>
                        )}
                      </div>

                      {/* Info Area */}
                      <div className="mt-3 flex justify-between items-start px-1">
                        <div>
                          <h3 className="text-base font-bold text-slate-100 leading-tight line-clamp-2">
                            {lesson.title}
                          </h3>
                          <p className="text-sm text-slate-400 mt-1">
                            {isLocked ? `Требуется покупка: ${course.price} Н` : (isCompleted ? 'Просмотрено' : 'Готово к просмотру')}
                          </p>
                        </div>
                        
                        {/* Stars */}
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
          );
        })}

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
