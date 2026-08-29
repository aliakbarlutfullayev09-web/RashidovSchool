import React, { useState } from 'react';
import CourseBuilder from '../components/CourseBuilder';
import LessonBuilder from '../components/LessonBuilder';
import QuizBuilder from '../components/QuizBuilder';

export default function ContentPage({ user }) {
  const [view, setView] = useState('courses'); // courses, lessons, quiz
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selectedLesson, setSelectedLesson] = useState(null);

  const handleSelectCourse = (course) => {
    setSelectedCourse(course);
    setView('lessons');
  };

  const handleSelectLesson = (lesson) => {
    setSelectedLesson(lesson);
    setView('quiz');
  };

  const handleBack = () => {
    if (view === 'quiz') setView('lessons');
    if (view === 'lessons') {
      setView('courses');
      setSelectedCourse(null);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Управление контентом</h1>
      {view === 'courses' && <CourseBuilder user={user} onSelectCourse={handleSelectCourse} />}
      {view === 'lessons' && <LessonBuilder courseId={selectedCourse.id} courseName={selectedCourse.title} onSelectLesson={handleSelectLesson} onBack={handleBack} />}
      {view === 'quiz' && <QuizBuilder lessonId={selectedLesson.id} lessonName={selectedLesson.title} courseName={selectedCourse.title} onBack={handleBack} />}
    </div>
  );
}
