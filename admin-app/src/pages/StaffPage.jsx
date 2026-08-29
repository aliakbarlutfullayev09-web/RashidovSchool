import React from 'react';
import TeacherManager from '../components/TeacherManager';

export default function StaffPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Управление персоналом</h1>
      <TeacherManager />
    </div>
  );
}
