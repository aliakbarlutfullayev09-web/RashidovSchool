import React from 'react';
import { AlertTriangle, Clock, HelpCircle, ChevronRight } from 'lucide-react';

export default function RedZones({ questions = [] }) {
  const list = questions || [];

  return (
    <div className="card mt-6 bg-[#1C1C1E] border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
      <div className="p-6 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              Xavfli zonalar (Qizil hududlar)
            </h2>
            <p className="text-xs text-[#8E8E93]">O'quvchilar eng ko'p xato qilgan yoki faolligi past bo'lgan holatlar</p>
          </div>
        </div>

        <span className="text-xs font-bold text-red-400 bg-red-500/10 px-3 py-1 rounded-full border border-red-500/20">
          {list.length} ta holat
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-white/80">
          <thead className="bg-[#161618] text-[#8E8E93] text-[11px] uppercase tracking-wider">
            <tr>
              <th className="px-6 py-3.5">O'quvchi / Savol</th>
              <th className="px-6 py-3.5">Sinf / Mavzu</th>
              <th className="px-6 py-3.5">Muammo</th>
              <th className="px-6 py-3.5">Oxirgi faollik</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {list.map((item, idx) => (
              <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                <td className="px-6 py-4 font-semibold text-white">
                  {item.studentName || item.question_text || `ID ${item.id}`}
                </td>
                <td className="px-6 py-4 text-[#8E8E93]">
                  {item.classGroup || item.lesson_title || '9-A'}
                </td>
                <td className="px-6 py-4">
                  <span className="bg-red-500/15 text-red-300 font-bold px-2.5 py-1 rounded-md text-[11px] border border-red-500/20">
                    {item.issue || `${item.correct_rate || 20}% to'g'ri`}
                  </span>
                </td>
                <td className="px-6 py-4 text-[#8E8E93] font-mono">
                  {item.lastActive || `${item.total_attempts || 0} urinish`}
                </td>
              </tr>
            ))}

            {list.length === 0 && (
              <tr>
                <td colSpan="4" className="px-6 py-8 text-center text-[#8E8E93] text-xs">
                  Hozircha xavfli zonalar aniqlanmadi — o'quvchilar ko'rsatkichi a'lo darajada!
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
