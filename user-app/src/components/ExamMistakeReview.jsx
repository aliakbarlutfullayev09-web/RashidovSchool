import React, { useState, useId } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, BookOpen, AlertCircle } from 'lucide-react';
import { isUzbekMatch } from '../utils/uzbekFuzzy';

export function buildExamResultKey(subjectKey, mode, testId) {
  return `${subjectKey}__${mode}__${testId}`;
}

export function loadSavedExamResults(userId) {
  if (typeof window === 'undefined') return {};
  try {
    const key = `rb_exam_results_${userId || 'guest'}`;
    const raw = localStorage.getItem(key);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function saveExamResultLocal(userId, subjectKey, mode, testId, resultRecord) {
  if (typeof window === 'undefined') return {};
  const storageKey = `rb_exam_results_${userId || 'guest'}`;
  const current = loadSavedExamResults(userId);
  const entryKey = buildExamResultKey(subjectKey, mode, testId);
  const next = {
    ...current,
    [entryKey]: resultRecord,
  };
  try {
    localStorage.setItem(storageKey, JSON.stringify(next));
  } catch {}
  return next;
}

export function evaluateQuestionAnswer(q, userAns) {
  if (!q) return false;
  if (q.type === 'input') {
    return Boolean(userAns && isUzbekMatch(userAns, q.correctAnswer));
  }
  const expectedIndex = q.correctIndex !== undefined ? q.correctIndex : q.correct_option_index;
  return userAns === expectedIndex;
}

/**
 * Per-question point weight for Milliy Sertifikat (40 questions, total = 75):
 * 1-10 -> 1.3, 11-35 -> 2.0, 36-40 -> 2.4.
 */
export function getSertifikatQuestionWeight(index) {
  if (index < 10) return 1.3;
  if (index < 35) return 2.0;
  return 2.4;
}

/**
 * Milliy Sertifikat grade thresholds by numeric score:
 * < 46 -> null, 46-49.99 -> C, 50-54.99 -> C+, 55-59.99 -> B,
 * 60-64.99 -> B+, 65-69.99 -> A, 70-75 -> A+.
 */
export function getSertifikatGrade(numericScore) {
  const score = Number(numericScore) || 0;
  if (score < 46) return null;
  if (score < 50) return 'C';
  if (score < 55) return 'C+';
  if (score < 60) return 'B';
  if (score < 65) return 'B+';
  if (score < 70) return 'A';
  return 'A+';
}

/**
 * Calculates exam score, accuracy, and Milliy Sertifikat grade from answers.
 */
export function calculateExamMetrics(questions = [], userAnswers = {}, mode = 'sertifikat', maxScore) {
  const isDtm = mode === 'dtm';
  const totalQuestions = questions.length;
  const resolvedMaxScore = maxScore || (isDtm ? 93 : 75);
  let correctCount = 0;
  let rawScore = 0;

  questions.forEach((q, idx) => {
    if (evaluateQuestionAnswer(q, userAnswers[idx])) {
      correctCount++;
      rawScore += isDtm ? 3.1 : getSertifikatQuestionWeight(idx);
    }
  });

  const numericScore = Math.round(rawScore * 100) / 100;
  const score = numericScore.toFixed(1);
  const ratio = correctCount / (totalQuestions || 1);
  const percentage = Math.min(100, Math.round(ratio * 100));
  const certGrade = isDtm ? null : getSertifikatGrade(numericScore);

  return {
    correctCount,
    totalQuestions,
    numericScore,
    score,
    maxScore: resolvedMaxScore,
    percentage,
    ratio,
    certGrade,
  };
}

export function formatOptionText(q, answerValue, lang = 'uz') {
  if (q?.type === 'input') {
    if (answerValue === undefined || answerValue === null || String(answerValue).trim() === '') {
      return lang === 'ru' ? 'Не отвечено' : 'Javob berilmagan';
    }
    return String(answerValue);
  }
  if (answerValue === undefined || answerValue === null) {
    return lang === 'ru' ? 'Не отвечено' : 'Javob berilmagan';
  }
  const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
  const letter = letters[answerValue] || String(Number(answerValue) + 1);
  const optText = q?.options?.[answerValue] ?? '';
  return optText ? `${letter}) ${optText}` : letter;
}

export default function ExamMistakeReview({ questions = [], userAnswers = {}, isLight = false, lang = 'uz' }) {
  const [filterMode, setFilterMode] = useState('mistakes'); // 'mistakes' | 'all'
  const pillLayoutId = useId();

  const evaluated = questions.map((q, idx) => {
    const userAns = userAnswers[idx];
    const isCorrect = evaluateQuestionAnswer(q, userAns);
    const isUnanswered = userAns === undefined || userAns === null || String(userAns).trim() === '';
    return {
      q,
      idx,
      userAns,
      isCorrect,
      isUnanswered,
    };
  });

  const mistakes = evaluated.filter((item) => !item.isCorrect);
  const visibleItems = filterMode === 'mistakes' ? mistakes : evaluated;

  return (
    <div
      data-testid="exam-mistake-review"
      className={`border rounded-3xl p-5 sm:p-6 space-y-4 ${
        isLight ? 'bg-white border-black/[0.06] shadow-md' : 'bg-[#1C1C1E] border-white/[0.08] shadow-lg'
      }`}
    >
      {/* Header & Filter Pills */}
      <div className={`flex flex-wrap items-center justify-between gap-2 pb-3 border-b ${
        isLight ? 'border-black/[0.06]' : 'border-white/[0.06]'
      }`}>
        <div className="flex items-center gap-2">
          <AlertCircle className={`w-4 h-4 ${mistakes.length > 0 ? 'text-red-500' : 'text-emerald-500'}`} />
          <h4 className={`font-bold text-sm sm:text-base ${isLight ? 'text-[#1C1C1E]' : 'text-white'}`}>
            {lang === 'ru' ? 'Разбор ошибок' : 'Xatolar tahlili'}
          </h4>
        </div>

        <div className={`inline-flex p-1 rounded-xl relative ${isLight ? 'bg-[#F2F2F7]' : 'bg-[#2C2C2E]'}`}>
          {[
            {
              id: 'mistakes',
              label: lang === 'ru' ? `Ошибки (${mistakes.length})` : `Xatolar (${mistakes.length})`,
            },
            {
              id: 'all',
              label: lang === 'ru' ? `Все (${evaluated.length})` : `Barchasi (${evaluated.length})`,
            },
          ].map((tab) => {
            const isActive = filterMode === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterMode(tab.id)}
                className={`relative px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  isActive
                    ? 'text-white'
                    : isLight ? 'text-gray-600 hover:text-[#1C1C1E]' : 'text-[#8E8E93] hover:text-white'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId={`mistakeFilterPill_${pillLayoutId}`}
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    className="absolute inset-0 rounded-lg bg-[#007AFF] shadow-sm"
                  />
                )}
                <span className="relative z-10">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Empty State when 0 Mistakes */}
      {filterMode === 'mistakes' && mistakes.length === 0 ? (
        <div
          data-testid="no-mistakes-banner"
          className={`p-5 rounded-2xl border flex items-center gap-3 ${
            isLight
              ? 'bg-emerald-50 border-emerald-500/20 text-emerald-800'
              : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
          }`}
        >
          <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
          <p className="text-xs sm:text-sm font-semibold">
            {lang === 'ru'
              ? 'Вы ответили правильно на все вопросы! Ошибок нет.'
              : "Barcha savollarga to'g'ri javob berdingiz! Xatolar yo'q."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {visibleItems.map(({ q, idx, userAns, isCorrect, isUnanswered }) => {
            const expectedIndex = q.correctIndex !== undefined ? q.correctIndex : q.correct_option_index;
            const correctDisplay =
              q.type === 'input'
                ? String(q.correctAnswer || '')
                : formatOptionText(q, expectedIndex, lang);
            const userDisplay = formatOptionText(q, userAns, lang);

            return (
              <div
                key={q.id ?? idx}
                data-question-review-index={idx}
                data-is-correct={String(isCorrect)}
                className={`p-4 rounded-2xl border space-y-2.5 ${
                  isCorrect
                    ? isLight
                      ? 'bg-[#F8FAF9] border-emerald-500/25'
                      : 'bg-[#242426] border-emerald-500/25'
                    : isLight
                    ? 'bg-[#FFF9F9] border-red-500/25'
                    : 'bg-[#242426] border-red-500/25'
                }`}
              >
                {/* Top Status Row */}
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-xs font-extrabold ${isLight ? 'text-[#1C1C1E]' : 'text-white'}`}>
                    {lang === 'ru' ? `Вопрос ${idx + 1}` : `${idx + 1}-Savol`}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                      isCorrect
                        ? isLight
                          ? 'bg-emerald-500/15 text-emerald-700'
                          : 'bg-emerald-500/20 text-emerald-400'
                        : isLight
                        ? 'bg-red-500/15 text-red-700'
                        : 'bg-red-500/20 text-red-400'
                    }`}
                  >
                    {isCorrect ? (
                      <>
                        <CheckCircle2 className="w-3 h-3" />
                        <span>{lang === 'ru' ? 'Верно' : "To'g'ri"}</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-3 h-3" />
                        <span>
                          {isUnanswered
                            ? (lang === 'ru' ? 'Пропущено' : 'Javob berilmagan')
                            : (lang === 'ru' ? 'Ошибка' : 'Xato')}
                        </span>
                      </>
                    )}
                  </span>
                </div>

                {/* Shared Matching Prompt (if present) */}
                {q.groupPrompt && (
                  <p className={`text-[11px] leading-snug italic ${isLight ? 'text-gray-500' : 'text-[#8E8E93]'}`}>
                    {q.groupPrompt}
                  </p>
                )}

                {/* Question Text */}
                <p className={`text-xs sm:text-sm font-semibold leading-snug ${isLight ? 'text-[#1C1C1E]' : 'text-white/95'}`}>
                  {q.text}
                </p>

                {/* Answers Comparison */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {!isCorrect && (
                    <div
                      className={`p-2.5 rounded-xl border ${
                        isLight
                          ? 'bg-red-50 border-red-500/20 text-red-700'
                          : 'bg-red-500/10 border-red-500/20 text-red-300'
                      }`}
                    >
                      <span className="text-[10px] uppercase tracking-wider opacity-75 block mb-0.5">
                        {lang === 'ru' ? 'Ваш ответ' : 'Sizning javobingiz'}
                      </span>
                      <span className="font-bold">{userDisplay}</span>
                    </div>
                  )}

                  <div
                    className={`p-2.5 rounded-xl border ${isCorrect ? 'sm:col-span-2' : ''} ${
                      isLight
                        ? 'bg-emerald-50 border-emerald-500/20 text-emerald-800'
                        : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                    }`}
                  >
                    <span className="text-[10px] uppercase tracking-wider opacity-75 block mb-0.5">
                      {lang === 'ru' ? 'Правильный ответ' : "To'g'ri javob"}
                    </span>
                    <span className="font-bold">{correctDisplay}</span>
                  </div>
                </div>

                {/* Textbook reference / explanation if present */}
                {(q.textbookRef || q.explanation) && (
                  <div
                    className={`flex items-start gap-1.5 text-[11px] pt-1 ${
                      isLight ? 'text-gray-600' : 'text-[#8E8E93]'
                    }`}
                  >
                    <BookOpen className="w-3.5 h-3.5 text-[#007AFF] shrink-0 mt-0.5" />
                    <span>{q.textbookRef || q.explanation}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
