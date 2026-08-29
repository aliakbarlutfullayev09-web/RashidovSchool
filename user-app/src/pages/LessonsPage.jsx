import React, { useState } from 'react';
import Header from '../components/Header';
import LevelPath from '../components/LevelPath';
import BottomSheet from '../components/BottomSheet';
import VideoPlayer from '../components/VideoPlayer';
import { mockLessons, mockProgress } from '../mock/data';

export default function LessonsPage() {
  const [selectedNode, setSelectedNode] = useState(null); // { lesson, progress }
  const [isPlaying, setIsPlaying] = useState(false);

  const handleNodeClick = (lesson, progress) => {
    setSelectedNode({ lesson, progress });
  };

  const handleCloseSheet = () => {
    setSelectedNode(null);
  };

  const handleWatch = () => {
    setIsPlaying(true);
  };

  const handleBuy = () => {
    alert(`Buying course for ${selectedNode.lesson.course_id}`);
    setSelectedNode(null);
  };

  const handleVideoComplete = () => {
    console.log('Video completed');
  };

  const handleVideoBack = () => {
    setIsPlaying(false);
  };

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
    <div className="h-full flex flex-col overflow-hidden">
      <Header />
      
      <div className="flex-1 overflow-y-auto no-scrollbar relative">
        <LevelPath 
          lessons={mockLessons} 
          progress={mockProgress} 
          onNodeClick={handleNodeClick} 
        />
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
