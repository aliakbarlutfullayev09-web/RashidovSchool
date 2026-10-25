import React from 'react';
import TeacherManager from '../components/TeacherManager';
import { Users } from 'lucide-react';

export default function StaffPage() {
  return (
    <div className="space-y-6 pb-20 text-white">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
          <Users className="w-6 h-6 text-[#007AFF]" />
          <span>Xodimlar va o'qituvchilar</span>
        </h1>
        <p className="text-xs text-[#8E8E93] mt-0.5">O'qituvchilarni tayinlash va huquqlarni boshqarish</p>
      </div>
      <TeacherManager />
    </div>
  );
}

