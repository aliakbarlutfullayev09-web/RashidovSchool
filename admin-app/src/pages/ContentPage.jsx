import React, { useState } from 'react';
import SubjectBuilder from '../components/SubjectBuilder';
import CourseBuilder from '../components/CourseBuilder';
import LessonBuilder from '../components/LessonBuilder';
import QuizBuilder from '../components/QuizBuilder';
import { Layers, ArrowLeft } from 'lucide-react';

export default function ContentPage({ user }) {
  const isSuperAdmin = user?.role === 'superadmin';
  const initialView = isSuperAdmin ? 'subjects' : 'courses';
  
  const [view, setView] = useState(initialView); // subjects, courses, lessons, quiz
  const [selectedSubject, setSelectedSubject] = useState(
    isSuperAdmin ? null : { id: user?.assigned_subject_id || 1, name: 'Biologiya' }
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
    <div className="space-y-6 pb-20 text-white">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {view !== 'subjects' && isSuperAdmin && (
            <button 
              onClick={handleBack} 
              className="w-10 h-10 rounded-full bg-[#1C1C1E] border border-white/5 hover:bg-[#2C2C2E] flex items-center justify-center text-white active:scale-95 transition-all"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
              <Layers className="w-6 h-6 text-[#007AFF]" />
              <span>Kontent boshqaruvi</span>
            </h1>
            <p className="text-xs text-[#8E8E93] mt-0.5">Fanlar, kurslar, video darslar va test savollari</p>
          </div>
        </div>
      </div>
      
      {view === 'subjects' && <SubjectBuilder onSelectSubject={handleSelectSubject} />}
      {view === 'courses' && <CourseBuilder user={user} subjectId={selectedSubject?.id || 1} subjectName={selectedSubject?.name || 'Biologiya'} onSelectCourse={handleSelectCourse} />}
      {view === 'lessons' && <LessonBuilder courseId={selectedCourse?.id} courseName={selectedCourse?.title} onSelectLesson={handleSelectLesson} onBack={handleBack} />}
      {view === 'quiz' && <QuizBuilder lessonId={selectedLesson?.id} lessonName={selectedLesson?.title} courseName={selectedCourse?.title} onBack={handleBack} />}
    </div>
  );
}

