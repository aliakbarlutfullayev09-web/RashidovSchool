import React from 'react';

export default function RedZones({ questions }) {
  return (
    <div className="card mt-6">
      <div className="p-6 border-b border-slate-700">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">🚨 Красные зоны</h2>
        <p className="text-sm text-slate-400 mt-1">Вопросы с процентом правильных ответов менее 30%</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-slate-800 text-xs uppercase">
            <tr>
              <th className="px-6 py-3">Вопрос</th>
              <th className="px-6 py-3">Урок</th>
              <th className="px-6 py-3">% Правильных</th>
              <th className="px-6 py-3">Попытки</th>
            </tr>
          </thead>
          <tbody>
            {questions.sort((a, b) => a.correct_rate - b.correct_rate).map(q => (
              <tr key={q.id} className="border-b border-slate-700 bg-red-900/10 hover:bg-red-900/20 transition-colors">
                <td className="px-6 py-4 font-medium max-w-xs truncate">{q.question_text}</td>
                <td className="px-6 py-4">{q.lesson_title}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <span className="text-red-400 font-bold">{q.correct_rate}%</span>
                    <div className="w-16 h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full bg-red-500" style={{ width: `${q.correct_rate}%` }}></div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">{q.total_attempts}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
