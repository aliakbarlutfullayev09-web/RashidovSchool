import React, { useState } from 'react';
import SubjectBuilder from '../components/SubjectBuilder';
import CourseBuilder from '../components/CourseBuilder';
import LessonBuilder from '../components/LessonBuilder';
import QuizBuilder from '../components/QuizBuilder';

export default function ContentPage({ user }) {
  const isSuperAdmin = user.role === 'superadmin';
  const initialView = isSuperAdmin ? 'subjects' : 'courses';
  
  const [view, setView] = useState(initialView); // subjects, courses, lessons, quiz
  const [selectedSubject, setSelectedSubject] = useState(
    isSuperAdmin ? null : { id: user.assigned_subject_id || 1, name: 'Мой предмет' }
  );
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selectedLesson, setSelectedLesson] = useState(null);

  const handleSelectSubject = (subject) => {
    setSelectedSubject(subject);
    setView('courses');
  };

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
    if (view === 'courses' && isSuperAdmin) {
      setView('subjects');
      setSelectedSubject(null);
    }
  };

  return (
    <div>
      <div className="flex items-center space-x-4 mb-6">
        {view !== 'subjects' && (
          <button onClick={handleBack} className="text-slate-400 hover:text-white font-bold p-2 bg-white/5 rounded-lg">
            ← Назад
          </button>
        )}
        <h1 className="text-2xl font-bold text-white">Управление контентом</h1>
      </div>
      
      {view === 'subjects' && <SubjectBuilder onSelectSubject={handleSelectSubject} />}
      {view === 'courses' && <CourseBuilder user={user} subjectId={selectedSubject.id} subjectName={selectedSubject.name} onSelectCourse={handleSelectCourse} />}
      {view === 'lessons' && <LessonBuilder courseId={selectedCourse.id} courseName={selectedCourse.title} onSelectLesson={handleSelectLesson} onBack={handleBack} />}
      {view === 'quiz' && <QuizBuilder lessonId={selectedLesson.id} lessonName={selectedLesson.title} courseName={selectedCourse.title} onBack={handleBack} />}
    </div>
  );
}
