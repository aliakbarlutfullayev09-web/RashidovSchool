import React from 'react';
import LevelNode from './LevelNode';

export default function LevelPath({ lessons, progress, onNodeClick }) {
  // Find current lesson
  const currentLessonIndex = progress.findIndex(p => p.is_unlocked && p.stars === 0);
  const currentId = currentLessonIndex !== -1 ? progress[currentLessonIndex].lesson_id : -1;

  return (
    <div className="relative flex flex-col items-center py-10 w-full overflow-y-auto no-scrollbar" style={{ paddingBottom: '120px' }}>
      {lessons.map((lesson, index) => {
        const prog = progress.find(p => p.lesson_id === lesson.id) || { stars: 0, is_unlocked: false };
        const isCurrent = lesson.id === currentId;
        
        // Alternate position: 0=center, 1=right, 2=center, 3=left
        const pos = index % 4;
        let xOffset = 0;
        if (pos === 1) xOffset = 60;
        else if (pos === 3) xOffset = -60;

        return (
          <div key={lesson.id} className="relative w-full flex justify-center mb-16">
            <div style={{ transform: `translateX(${xOffset}px)` }}>
              <LevelNode 
                lesson={lesson} 
                progress={prog} 
                isCurrent={isCurrent} 
                onClick={() => onNodeClick(lesson, prog)} 
              />
            </div>
            {/* Draw connecting line to next node if not the last one */}
            {index < lessons.length - 1 && (
              <svg className="absolute w-full h-24 top-16 pointer-events-none" style={{ left: 0, zIndex: -1 }}>
                <path
                  d={getCurvedPath(xOffset, getNextXOffset((index + 1) % 4))}
                  stroke="rgba(255, 255, 255, 0.2)"
                  strokeWidth="8"
                  fill="none"
                  strokeLinecap="round"
                />
              </svg>
            )}
          </div>
        );
      })}
    </div>
  );
}

function getNextXOffset(pos) {
  if (pos === 1) return 60;
  if (pos === 3) return -60;
  return 0;
}

function getCurvedPath(startX, endX) {
  // We draw a curve from startX to endX, assuming svg width is screen width
  // Center is roughly 50% (we use relative coordinates here based on viewport or fixed box)
  // Let's make a simplified relative curve
  const cx = 150; // assuming half of 300px width
  const sX = cx + startX;
  const eX = cx + endX;
  const sY = 0;
  const eY = 80;
  // cubic bezier
  return `M ${sX} ${sY} C ${sX} ${sY + 40}, ${eX} ${eY - 40}, ${eX} ${eY}`;
}
