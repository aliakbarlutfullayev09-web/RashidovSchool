import React, { useState } from 'react';
import Header from '../components/Header';
import BottomSheet from '../components/BottomSheet';
import VideoPlayer from '../components/VideoPlayer';
import { mockCourses, mockLessons, mockProgress } from '../mock/data';
import { useHaptic } from '../hooks/useHaptic';

export default function LessonsPage({ user }) {
  const [selectedNode, setSelectedNode] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const { impactLight } = useHaptic();

  const handleCardClick = (lesson) => {
    impactLight();
    const progress = mockProgress.find(p => p.lesson_id === lesson.id) || { is_unlocked: false, stars: 0 };
    setSelectedNode({ lesson, progress });
  };

  const handleCloseSheet = () => setSelectedNode(null);
  const handleWatch = () => setIsPlaying(true);
  
  const handleBuy = () => {
    alert(`buying course`);
    setSelectedNode(null);
  };

  const handleVideoComplete = () => console.log('Video completed');
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
        
        {/* Группируем уроки по курсам */}
        {mockCourses.map(course => {
          const courseLessons = mockLessons.filter(l => l.course_id === course.id);
          if (courseLessons.length === 0) return null;

          return (
            <div key={course.id} className="space-y-4">
              <h2 className="text-xl font-bold text-white px-1">{course.title}</h2>
              
              <div className="grid grid-cols-1 gap-5">
                {courseLessons.map(lesson => {
                  const progress = mockProgress.find(p => p.lesson_id === lesson.id) || { is_unlocked: false, stars: 0 };
                  const isLocked = !progress.is_unlocked;
                  const isCompleted = progress.is_unlocked && progress.stars > 0;

                  return (
                    <div 
                      key={lesson.id} 
                      onClick={() => handleCardClick(lesson)}
                      className="group cursor-pointer flex flex-col transition-transform active:scale-95"
                    >
                      {/* Thumbnail (16:9) */}
                      <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-slate-800 shadow-lg border border-white/5">
                        <img 
                          src={lesson.thumbnail_url || 'https://via.placeholder.com/800x450/1e293b/ffffff?text=Lesson'} 
                          alt={lesson.title} 
                          className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 ${isLocked ? 'opacity-40 grayscale' : ''}`}
                        />
                        
                        {/* Lock Overlay */}
                        {isLocked && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-2xl shadow-xl">
                              🔒
                            </div>
                          </div>
                        )}

                        {/* Play Icon (if unlocked) */}
                        {!isLocked && (
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
                            <div className="w-14 h-14 bg-blue-500/90 rounded-full flex items-center justify-center text-white text-2xl shadow-lg pl-1">
                              ▶
                            </div>
                          </div>
                        )}

                        {/* Progress Bar (if watched) */}
                        {isCompleted && (
                          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-700">
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
                            {isLocked ? 'Требуется покупка курса' : (isCompleted ? 'Просмотрено' : 'Готово к просмотру')}
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
        onWatch={handleWatch}
        onBuy={handleBuy}
      />
    </div>
  );
}
