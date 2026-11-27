import React, { useState, useEffect } from 'react';
import { api } from '../api/supabase';
import { BookOpen, ChevronRight, Layers, Dna, FlaskConical, Calculator, Atom } from 'lucide-react';

export default function SubjectBuilder({ onSelectSubject }) {
  const [subjects, setSubjects] = useState([]);

  useEffect(() => {
    loadSubjects();
  }, []);

  const loadSubjects = async () => {
    const data = await api.getSubjects();
    setSubjects(data);
  };

  const getSubjectIcon = (subName = '') => {
    const lower = subName.toLowerCase();
    if (lower.includes('biolog') || lower.includes('био')) {
      return { Icon: Dna, colorClass: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/25' };
    }
    if (lower.includes('ximi') || lower.includes('kimyo') || lower.includes('хим')) {
      return { Icon: FlaskConical, colorClass: 'text-purple-400 bg-purple-500/15 border-purple-500/25' };
    }
    if (lower.includes('matem') || lower.includes('мат')) {
      return { Icon: Calculator, colorClass: 'text-amber-400 bg-amber-500/15 border-amber-500/25' };
    }
    if (lower.includes('fizik') || lower.includes('физ')) {
      return { Icon: Atom, colorClass: 'text-cyan-400 bg-cyan-500/15 border-cyan-500/25' };
    }
    return { Icon: BookOpen, colorClass: 'text-blue-400 bg-blue-500/15 border-blue-500/25' };
  };

  return (
    <div className="space-y-6 text-white pb-24">
      {/* Subjects Grid */}
      <div className="space-y-3">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <span>Mavjud fanlar</span>
          <span className="bg-[#2C2C2E] text-xs font-semibold px-2.5 py-0.5 rounded-full text-[#8E8E93]">
            {subjects.length} ta
          </span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {subjects.map(subject => {
            const { Icon, colorClass } = getSubjectIcon(subject.name);
            return (
              <div 
                key={subject.id} 
                onClick={() => onSelectSubject(subject)}
                className="card p-5 bg-[#1C1C1E] border border-white/5 hover:border-white/10 rounded-3xl transition-all shadow-xl cursor-pointer active:scale-[0.98] group flex flex-col justify-between space-y-4"
              >
                <div className="flex items-start justify-between">
                  <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center shadow ${colorClass}`}>
                    <Icon className="w-6 h-6" strokeWidth={2} />
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-white text-base leading-snug group-hover:text-blue-400 transition-colors">
                    {subject.name}
                  </h4>
                  <p className="text-xs text-[#8E8E93] mt-1 flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5" />
                    <span>Kurslarni ko'rish uchun bosing</span>
                  </p>
                </div>

                <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs font-semibold text-blue-400">
                  <span>Kurslarni boshqarish</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            );
          })}

          {subjects.length === 0 && (
            <div className="col-span-full card p-8 text-center text-[#8E8E93] text-xs">
              Hozircha fanlar mavjud emas.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
