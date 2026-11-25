import React, { useState, useEffect } from 'react';
import {
  ClipboardList,
  Plus,
  Trash2,
  Edit3,
  CheckCircle2,
  Clock,
  Award,
  ArrowLeft,
  Save,
  Eye,
  EyeOff,
  Sliders,
  Upload,
  FileText,
  X,
  Check,
  Loader2,
  HelpCircle
} from 'lucide-react';
import { api } from '../api/supabase';
import {
  createSubjectSkeleton,
  formatDurationLabel,
  normalizeSubjectKey
} from '../api/examDefaults';
import { compressImageFileToDataUrl } from '../utils/mediaUtils';

const BADGE_PRESETS = [
  { label: 'Oltin (A+ Daraja)', value: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  { label: 'Binafsha (Olimpiada)', value: 'bg-purple-500/15 text-purple-400 border-purple-500/30' },
  { label: 'Yashil (Boshlang‘ich)', value: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  { label: 'Ko‘k (Standart)', value: 'bg-blue-500/15 text-blue-400 border-blue-500/30' }
];

const DIFFICULTY_STYLES = {
  "O'rta": 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  Yuqori: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  Ekspert: 'text-purple-400 bg-purple-400/10 border-purple-400/20'
};

export default function TestsPage({ user }) {
  const isSuperAdmin = user?.role === 'superadmin' || user?.role === 'admin';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveNotice, setSaveNotice] = useState(null);

  const [subjectRows, setSubjectRows] = useState([]);
  const [portalData, setPortalData] = useState(null);
  const [selectedSubjectKey, setSelectedSubjectKey] = useState('biologiya');
  const [selectedMode, setSelectedMode] = useState('sertifikat'); // 'sertifikat' | 'dtm'

  // Collapsible mode config editor
  const [showModeSettings, setShowModeSettings] = useState(false);

  // Add / Edit Variant Modal or Drawer
  const [editingVariant, setEditingVariant] = useState(null); // null or variant object / { __isNew: true }

  // Question Builder inside a Variant
  const [activeVariantId, setActiveVariantId] = useState(null);
  const [editingQuestionIdx, setEditingQuestionIdx] = useState(null);

  // New / Editing Question form state
  const [qType, setQType] = useState('choice');
  const [qText, setQText] = useState('');
  const [qImageUrl, setQImageUrl] = useState('');
  const [qOptions, setQOptions] = useState(['', '', '', '']);
  const [qCorrectIndex, setQCorrectIndex] = useState(0);
  const [qCorrectAnswer, setQCorrectAnswer] = useState('');
  const [qTextbookRef, setQTextbookRef] = useState('');

  useEffect(() => {
    loadAll();
  }, [user?.assigned_subject_id, isSuperAdmin]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const dbSubjects = await api.getSubjects();
      const rows = dbSubjects && dbSubjects.length > 0
        ? dbSubjects
        : [
            { id: 1, name: 'Biologiya' },
            { id: 2, name: 'Kimyo' },
            { id: 3, name: 'Matematika' }
          ];
      setSubjectRows(rows);

      const data = await api.getExamPortalData(rows);
      setPortalData(data);

      if (!isSuperAdmin && user?.assigned_subject_id) {
        const assignedRow = rows.find(r => r.id === user.assigned_subject_id);
        setSelectedSubjectKey(normalizeSubjectKey(assignedRow || { id: user.assigned_subject_id }));
      } else if (rows.length > 0) {
        setSelectedSubjectKey(prev => prev || normalizeSubjectKey(rows[0]));
      }
    } catch (e) {
      console.error('Error loading tests manager:', e);
    } finally {
      setLoading(false);
    }
  };

  const persistPortalData = async (nextData, noticeText = 'O‘zgarishlar saqlandi') => {
    setSaving(true);
    setPortalData(nextData);
    const res = await api.saveExamPortalData(nextData);
    setSaving(false);
    if (res?.success) {
      setSaveNotice({ ok: true, text: noticeText });
    } else {
      setSaveNotice({ ok: false, text: res?.error || 'Saqlashda xatolik yuz berdi' });
    }
    setTimeout(() => {
      setSaveNotice(null);
    }, 3000);
  };

  if (loading || !portalData) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-white/70">
        <Loader2 className="w-8 h-8 text-[#007AFF] animate-spin mb-3" />
        <p className="text-xs font-medium">Testlar boshqaruvi yuklanmoqda...</p>
      </div>
    );
  }

  const currentRow = subjectRows.find(r => normalizeSubjectKey(r) === selectedSubjectKey);
  const subjectData = portalData.subjects[selectedSubjectKey] || createSubjectSkeleton(selectedSubjectKey, currentRow?.name || 'Fan');
  const modeConfig = subjectData.modes?.[selectedMode] || createSubjectSkeleton(selectedSubjectKey).modes[selectedMode];
  const variants = Array.isArray(subjectData[selectedMode]) ? subjectData[selectedMode] : [];

  const updateSubjectBundle = (updater, noticeText) => {
    const nextSubject = updater(subjectData);
    const nextPortal = {
      ...portalData,
      subjects: {
        ...portalData.subjects,
        [selectedSubjectKey]: nextSubject
      }
    };
    persistPortalData(nextPortal, noticeText);
  };

  const handleToggleModeEnabled = (modeKey) => {
    const targetMode = subjectData.modes?.[modeKey] || {};
    const nextEnabled = !(targetMode.enabled ?? true);
    updateSubjectBundle(
      (sub) => ({
        ...sub,
        modes: {
          ...sub.modes,
          [modeKey]: {
            ...targetMode,
            enabled: nextEnabled
          }
        }
      }),
      nextEnabled ? 'Yo‘nalish yoqildi' : 'Yo‘nalish yashirildi'
    );
  };

  const handleSaveVariant = (formValues) => {
    const cleanTitle = formValues.title?.trim();
    if (!cleanTitle) return;

    const variantPayload = {
      id: formValues.id || `${selectedSubjectKey}-${selectedMode}-${Date.now()}`,
      title: cleanTitle,
      badge: formValues.badge?.trim() || 'Milliy Sertifikat',
      badgeColor: formValues.badgeColor || BADGE_PRESETS[0].value,
      questionCount: Math.max(1, parseInt(formValues.questionCount, 10) || 40),
      durationMinutes: Math.max(1, parseInt(formValues.durationMinutes, 10) || 64),
      maxScore: Math.max(1, parseFloat(formValues.maxScore) || 75),
      difficulty: formValues.difficulty || 'Yuqori',
      difficultyColor: DIFFICULTY_STYLES[formValues.difficulty] || DIFFICULTY_STYLES.Yuqori,
      description: formValues.description?.trim() || 'Tasdiqlangan sinov varianti.',
      questions: Array.isArray(formValues.questions) ? formValues.questions : []
    };

    updateSubjectBundle((sub) => {
      const list = Array.isArray(sub[selectedMode]) ? [...sub[selectedMode]] : [];
      const existingIdx = list.findIndex(v => v.id === variantPayload.id);
      if (existingIdx >= 0) {
        list[existingIdx] = { ...list[existingIdx], ...variantPayload };
      } else {
        list.push(variantPayload);
      }
      return {
        ...sub,
        [selectedMode]: list
      };
    }, formValues.__isNew ? 'Yangi variant qo‘shildi' : 'Variant yangilandi');

    setEditingVariant(null);
  };

  const handleDeleteVariant = (variantId) => {
    if (!window.confirm("Ushbu test variantini va uning barcha savollarini o‘chirishni xohlaysizmi?")) return;
    updateSubjectBundle((sub) => ({
      ...sub,
      [selectedMode]: (sub[selectedMode] || []).filter(v => v.id !== variantId)
    }), 'Variant o‘chirildi');
    if (activeVariantId === variantId) {
      setActiveVariantId(null);
    }
  };

  // Question builder screen inside a variant
  const activeVariant = activeVariantId ? variants.find(v => v.id === activeVariantId) : null;

  const resetQuestionForm = () => {
    setEditingQuestionIdx(null);
    setQType('choice');
    setQText('');
    setQImageUrl('');
    setQOptions(['', '', '', '']);
    setQCorrectIndex(0);
    setQCorrectAnswer('');
    setQTextbookRef('');
  };

  const startEditQuestion = (q, idx) => {
    setEditingQuestionIdx(idx);
    setQType(q.type === 'input' ? 'input' : q.imageUrl ? 'image' : 'choice');
    setQText(q.text || '');
    setQImageUrl(q.imageUrl || '');
    setQOptions(
      Array.isArray(q.options) && q.options.length > 0
        ? [q.options[0] || '', q.options[1] || '', q.options[2] || '', q.options[3] || '']
        : ['', '', '', '']
    );
    setQCorrectIndex(q.correctIndex ?? 0);
    setQCorrectAnswer(q.correctAnswer || '');
    setQTextbookRef(q.textbookRef || '');
  };

  const handlePickQuestionImage = async (file) => {
    if (!file) return;
    try {
      const dataUrl = await compressImageFileToDataUrl(file, 720, 0.78);
      setQImageUrl(dataUrl);
    } catch (err) {
      alert(err.message || 'Rasmni yuklashda xatolik');
    }
  };

  const handleSaveQuestion = (e) => {
    e.preventDefault();
    if (!activeVariant || !qText.trim()) return;

    const cleanImg = qImageUrl.trim() || undefined;
    const newQuestion = qType === 'input'
      ? {
          id: editingQuestionIdx !== null ? activeVariant.questions[editingQuestionIdx]?.id || Date.now() : Date.now(),
          type: 'input',
          text: qText.trim(),
          ...(cleanImg ? { imageUrl: cleanImg } : {}),
          correctAnswer: qCorrectAnswer.trim(),
          textbookRef: qTextbookRef.trim() || 'Rashidov School darsligi'
        }
      : {
          id: editingQuestionIdx !== null ? activeVariant.questions[editingQuestionIdx]?.id || Date.now() : Date.now(),
          type: cleanImg ? 'image' : 'choice',
          text: qText.trim(),
          ...(cleanImg ? { imageUrl: cleanImg } : {}),
          options: qOptions.map(o => o.trim()).filter(Boolean),
          correctIndex: Math.min(qCorrectIndex, Math.max(0, qOptions.map(o => o.trim()).filter(Boolean).length - 1)),
          textbookRef: qTextbookRef.trim() || 'Rashidov School darsligi'
        };

    if (newQuestion.type !== 'input' && newQuestion.options.length < 2) {
      alert('Kamida 2 ta javob variantini kiriting.');
      return;
    }
    if (newQuestion.type === 'input' && !newQuestion.correctAnswer) {
      alert('To‘g‘ri javob matnini kiriting.');
      return;
    }

    updateSubjectBundle((sub) => {
      const list = [...(sub[selectedMode] || [])];
      const idx = list.findIndex(v => v.id === activeVariant.id);
      if (idx >= 0) {
        const nextQs = [...(list[idx].questions || [])];
        if (editingQuestionIdx !== null) {
          nextQs[editingQuestionIdx] = newQuestion;
        } else {
          nextQs.push(newQuestion);
        }
        list[idx] = { ...list[idx], questions: nextQs };
      }
      return { ...sub, [selectedMode]: list };
    }, editingQuestionIdx !== null ? 'Savol yangilandi' : 'Yangi savol qo‘shildi');

    resetQuestionForm();
  };

  const handleDeleteQuestion = (qIdx) => {
    if (!activeVariant || !window.confirm("Ushbu savolni o‘chirishni xohlaysizmi?")) return;
    updateSubjectBundle((sub) => {
      const list = [...(sub[selectedMode] || [])];
      const idx = list.findIndex(v => v.id === activeVariant.id);
      if (idx >= 0) {
        const nextQs = (list[idx].questions || []).filter((_, i) => i !== qIdx);
        list[idx] = { ...list[idx], questions: nextQs };
      }
      return { ...sub, [selectedMode]: list };
    }, 'Savol o‘chirildi');
    if (editingQuestionIdx === qIdx) resetQuestionForm();
  };

  // ── VIEW B: QUESTIONS EDITOR FOR A VARIANT ──
  if (activeVariant) {
    const questions = activeVariant.questions || [];
    return (
      <div className="space-y-6 pb-24 text-white">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={() => {
              setActiveVariantId(null);
              resetQuestionForm();
            }}
            className="flex items-center gap-2 text-xs font-bold text-[#8E8E93] hover:text-white bg-[#1C1C1E] border border-white/10 px-4 py-2.5 rounded-2xl transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Variantlarga qaytish</span>
          </button>

          {saveNotice && (
            <div className={`px-3.5 py-2 rounded-full text-xs font-bold border ${saveNotice.ok ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' : 'bg-red-500/15 text-red-300 border-red-500/30'}`}>
              {saveNotice.text}
            </div>
          )}
        </div>

        <div className="bg-[#1C1C1E] border border-white/10 rounded-3xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-400 bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 rounded-full">
              {modeConfig.title} • {currentRow?.name || selectedSubjectKey}
            </span>
            <h2 className="text-lg font-extrabold text-white mt-2">{activeVariant.title}</h2>
            <p className="text-xs text-[#8E8E93] mt-0.5">
              Jami kiritilgan savollar: <strong className="text-white">{questions.length} ta</strong> • Vaqt: {formatDurationLabel(activeVariant.durationMinutes)} • Maksimal: {activeVariant.maxScore} ball
            </p>
          </div>
        </div>

        {/* Add / Edit Question Form */}
        <form onSubmit={handleSaveQuestion} className="bg-[#1C1C1E] border border-white/10 rounded-3xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Plus className="w-4 h-4 text-[#007AFF]" />
              <span>{editingQuestionIdx !== null ? `${editingQuestionIdx + 1}-savolni tahrirlash` : 'Yangi savol qo‘shish'}</span>
            </h3>
            {editingQuestionIdx !== null && (
              <button
                type="button"
                onClick={resetQuestionForm}
                className="text-xs font-semibold text-[#8E8E93] hover:text-white"
              >
                Bekor qilish
              </button>
            )}
          </div>

          {/* Question Type Toggle */}
          <div className="flex gap-2">
            {[
              { id: 'choice', label: 'Test variantlari (A/B/C/D)' },
              { id: 'input', label: 'Yozma / Sonli javob' }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setQType(tab.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                  (tab.id === 'input' ? qType === 'input' : qType !== 'input')
                    ? 'bg-[#007AFF] text-white'
                    : 'bg-[#2C2C2E] text-[#8E8E93] hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#8E8E93] uppercase mb-1.5">Savol matni *</label>
            <textarea
              rows={2}
              value={qText}
              onChange={(e) => setQText(e.target.value)}
              placeholder="Savol matnini kiriting..."
              className="input-field resize-none"
              required
            />
          </div>

          {/* Image Upload or URL */}
          <div>
            <label className="block text-[11px] font-bold text-[#8E8E93] uppercase mb-1.5">Rasm (ixtiyoriy — URL yoki yuklash)</label>
            <div className="flex flex-wrap gap-2">
              <input
                type="text"
                value={qImageUrl}
                onChange={(e) => setQImageUrl(e.target.value)}
                placeholder="https://... yoki fayldan tanlang"
                className="input-field flex-1 min-w-[200px]"
              />
              <label className="px-4 py-2.5 rounded-2xl bg-[#2C2C2E] hover:bg-[#3A3A3C] border border-white/10 text-xs font-bold text-white cursor-pointer flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5 text-blue-400" />
                <span>Rasm yuklash</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handlePickQuestionImage(e.target.files?.[0])}
                />
              </label>
              {qImageUrl && (
                <button
                  type="button"
                  onClick={() => setQImageUrl('')}
                  className="px-3 py-2 rounded-2xl bg-red-500/15 text-red-400 text-xs font-bold"
                >
                  Olib tashlash
                </button>
              )}
            </div>
            {qImageUrl && (
              <img src={qImageUrl} alt="Savol rasmi" className="mt-2 h-24 rounded-xl object-contain border border-white/10 bg-black" />
            )}
          </div>

          {qType === 'input' ? (
            <div>
              <label className="block text-[11px] font-bold text-[#8E8E93] uppercase mb-1.5">To‘g‘ri javob *</label>
              <input
                type="text"
                value={qCorrectAnswer}
                onChange={(e) => setQCorrectAnswer(e.target.value)}
                placeholder="Masalan: 46 yoki Krossingover"
                className="input-field"
                required
              />
            </div>
          ) : (
            <div className="space-y-2.5">
              <label className="block text-[11px] font-bold text-[#8E8E93] uppercase">Variantlar va to‘g‘ri javobni belgilash</label>
              {['A', 'B', 'C', 'D'].map((letter, idx) => (
                <div key={letter} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setQCorrectIndex(idx)}
                    className={`w-9 h-9 rounded-xl font-bold text-xs flex items-center justify-center shrink-0 transition-all border ${
                      qCorrectIndex === idx
                        ? 'bg-emerald-500 border-emerald-400 text-black font-black shadow-lg shadow-emerald-500/20'
                        : 'bg-[#2C2C2E] border-white/10 text-[#8E8E93]'
                    }`}
                    title="To'g'ri javob sifatida belgilash"
                  >
                    {qCorrectIndex === idx ? <Check className="w-4 h-4 stroke-[3]" /> : letter}
                  </button>
                  <input
                    type="text"
                    value={qOptions[idx] || ''}
                    onChange={(e) => {
                      const next = [...qOptions];
                      next[idx] = e.target.value;
                      setQOptions(next);
                    }}
                    placeholder={`${letter} varianti...`}
                    className="input-field flex-1"
                  />
                </div>
              ))}
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold text-[#8E8E93] uppercase mb-1.5">Darslik manbasi (Tahlil uchun)</label>
            <input
              type="text"
              value={qTextbookRef}
              onChange={(e) => setQTextbookRef(e.target.value)}
              placeholder="Masalan: 10-sinf Biologiya, §18, 76-bet"
              className="input-field"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-[#007AFF] hover:bg-blue-600 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 active:scale-95 transition-all"
          >
            <Save className="w-4 h-4" />
            <span>{editingQuestionIdx !== null ? 'Savolni yangilash' : 'Savolni saqlash'}</span>
          </button>
        </form>

        {/* Questions List */}
        <div className="space-y-3">
          {questions.length === 0 ? (
            <div className="bg-[#1C1C1E] border border-white/5 rounded-3xl p-8 text-center text-xs text-[#8E8E93]">
              Hozircha bu variantga savollar qo‘shilmagan. Yuqoridagi forma orqali birinchi savolni qo‘shing.
            </div>
          ) : (
            questions.map((q, idx) => (
              <div key={q.id || idx} className="bg-[#1C1C1E] border border-white/10 rounded-3xl p-4 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-extrabold bg-blue-500/15 text-blue-400 px-2 py-0.5 rounded-lg">
                      {idx + 1}-Savol
                    </span>
                    <span className="text-[10px] text-[#8E8E93] uppercase font-bold">
                      {q.type === 'input' ? 'Yozma' : 'Test A/B/C/D'}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-white leading-snug">{q.text}</p>
                  {q.type === 'input' ? (
                    <div className="text-xs text-emerald-400 font-semibold">
                      To‘g‘ri javob: <span className="bg-emerald-500/15 px-2 py-0.5 rounded-md">{q.correctAnswer}</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                      {(q.options || []).map((opt, oIdx) => (
                        <div
                          key={oIdx}
                          className={`text-xs px-3 py-1.5 rounded-xl border ${
                            oIdx === q.correctIndex
                              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300 font-bold'
                              : 'bg-[#242426] border-white/5 text-[#8E8E93]'
                          }`}
                        >
                          {['A', 'B', 'C', 'D'][oIdx]}. {opt}
                        </div>
                      ))}
                    </div>
                  )}
                  {q.textbookRef && (
                    <div className="text-[11px] text-amber-300/90">Manba: {q.textbookRef}</div>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => startEditQuestion(q, idx)}
                    className="p-2.5 rounded-xl bg-[#2C2C2E] hover:bg-blue-500/20 text-white/80 hover:text-blue-300 transition-colors"
                    title="Tahrirlash"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteQuestion(idx)}
                    className="p-2.5 rounded-xl bg-[#2C2C2E] hover:bg-red-500/20 text-white/80 hover:text-red-400 transition-colors"
                    title="O'chirish"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  // ── VIEW A: SUBJECT TESTLAR DASHBOARD ──
  return (
    <div className="space-y-6 pb-24 text-white">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <ClipboardList className="w-6 h-6 text-[#007AFF]" />
            <span>Testlar boshqaruvi</span>
          </h1>
          <p className="text-xs text-[#8E8E93] mt-0.5">
            Milliy Sertifikat va imtihon variantlarini qo‘shish, tahrirlash yoki olib tashlash
          </p>
        </div>

        <div className="flex items-center gap-2">
          {saveNotice && (
            <div className={`px-3.5 py-2 rounded-full text-xs font-bold border ${saveNotice.ok ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' : 'bg-red-500/15 text-red-300 border-red-500/30'}`}>
              {saveNotice.text}
            </div>
          )}
          <button
            type="button"
            onClick={() =>
              setEditingVariant({
                __isNew: true,
                title: `${variants.length + 1}-Variant: ${currentRow?.name || 'Biologiya'} ${modeConfig.title}`,
                badge: selectedMode === 'sertifikat' ? 'A+ Daraja' : 'Standart DTM',
                badgeColor: BADGE_PRESETS[0].value,
                questionCount: modeConfig.questionCount || 40,
                durationMinutes: modeConfig.durationMinutes || 64,
                maxScore: modeConfig.maxScore || 75,
                difficulty: 'Yuqori',
                description: '',
                questions: []
              })
            }
            className="px-4 py-2.5 rounded-2xl bg-[#007AFF] hover:bg-blue-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-blue-500/25 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Yangi test qo‘shish</span>
          </button>
        </div>
      </div>

      {/* Subject Switcher */}
      {isSuperAdmin && (
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          {subjectRows.map((row) => {
            const key = normalizeSubjectKey(row);
            const active = key === selectedSubjectKey;
            return (
              <button
                key={row.id || key}
                onClick={() => {
                  setSelectedSubjectKey(key);
                  setShowModeSettings(false);
                }}
                className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all whitespace-nowrap border ${
                  active
                    ? 'bg-[#007AFF] border-blue-400 text-white shadow-lg shadow-blue-500/25'
                    : 'bg-[#1C1C1E] border-white/10 text-[#8E8E93] hover:text-white'
                }`}
              >
                {row.name}
              </button>
            );
          })}
        </div>
      )}

      {/* Mode Cards Row (DTM Mock Test & Milliy Sertifikat) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {['dtm', 'sertifikat'].map((modeKey) => {
          const cfg = subjectData.modes?.[modeKey] || {};
          const count = (subjectData[modeKey] || []).length;
          const isSelected = selectedMode === modeKey;
          const isEnabled = cfg.enabled ?? true;

          return (
            <div
              key={modeKey}
              onClick={() => setSelectedMode(modeKey)}
              className={`rounded-3xl p-5 border cursor-pointer transition-all ${
                isSelected
                  ? 'bg-[#1C1C1E] border-[#007AFF] shadow-lg shadow-blue-500/10'
                  : 'bg-[#161618] border-white/5 hover:border-white/15 opacity-80'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full border ${
                  modeKey === 'sertifikat'
                    ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                    : 'bg-blue-500/15 border-blue-500/30 text-blue-400'
                }`}>
                  {cfg.badge || (modeKey === 'sertifikat' ? "Davlat Ta'lim Standarti" : 'DTM')}
                </span>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleModeEnabled(modeKey);
                  }}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 border transition-colors ${
                    isEnabled
                      ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                      : 'bg-white/5 border-white/10 text-[#8E8E93]'
                  }`}
                  title={isEnabled ? "Foydalanuvchiga ko'rinmoqda (yashirish)" : "Yashirilgan (ko'rsatish)"}
                >
                  {isEnabled ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                  <span>{isEnabled ? 'Faol' : 'Yashirin'}</span>
                </button>
              </div>

              <h3 className="text-base font-extrabold text-white">{cfg.title || modeKey}</h3>
              <p className="text-xs text-[#8E8E93] mt-1">
                {cfg.questionCount} ta savol • {formatDurationLabel(cfg.durationMinutes)} • Maksimal: {cfg.maxScore} ball • <strong className="text-white">{count} ta variant</strong>
              </p>
            </div>
          );
        })}
      </div>

      {/* Mode Settings Drawer Toggle */}
      <div className="bg-[#1C1C1E] border border-white/10 rounded-3xl overflow-hidden">
        <button
          type="button"
          onClick={() => setShowModeSettings(prev => !prev)}
          className="w-full px-5 py-4 flex items-center justify-between text-xs font-bold text-white hover:bg-white/[0.02] transition-colors"
        >
          <span className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-amber-400" />
            <span>{modeConfig.title} — Karta va vaqt sozlamalari ({modeConfig.questionCount} ta, {formatDurationLabel(modeConfig.durationMinutes)}, {modeConfig.maxScore} ball)</span>
          </span>
          <span className="text-[#8E8E93]">{showModeSettings ? 'Yopish' : 'Sozlash'}</span>
        </button>

        {showModeSettings && (
          <ModeSettingsEditor
            modeConfig={modeConfig}
            saving={saving}
            onSave={(updatedMode) => {
              updateSubjectBundle((sub) => ({
                ...sub,
                modes: {
                  ...sub.modes,
                  [selectedMode]: updatedMode
                }
              }), 'Yo‘nalish parametrlari saqlandi');
            }}
          />
        )}
      </div>

      {/* Variants List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-extrabold text-white flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-400" />
            <span>{modeConfig.title} Variantlari ({variants.length} ta)</span>
          </h2>
        </div>

        {variants.length === 0 ? (
          <div className="bg-[#1C1C1E] border border-dashed border-white/10 rounded-3xl p-10 text-center space-y-3">
            <HelpCircle className="w-8 h-8 text-[#8E8E93] mx-auto" />
            <div className="text-sm font-bold text-white">Variantlar mavjud emas</div>
            <p className="text-xs text-[#8E8E93] max-w-md mx-auto">
              Ushbu fan uchun test variantini qo‘shish uchun "Yangi test qo‘shish" tugmasini bosing.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {variants.map((variant, idx) => (
              <div
                key={variant.id || idx}
                className="bg-[#1C1C1E] border border-white/10 hover:border-white/20 rounded-3xl p-5 flex flex-col justify-between gap-4 transition-all"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${variant.badgeColor || BADGE_PRESETS[0].value}`}>
                      {variant.badge}
                    </span>
                    <span className="text-xs font-mono text-[#8E8E93]">#{idx + 1}</span>
                  </div>

                  <h3 className="text-base font-extrabold text-white leading-snug">{variant.title}</h3>
                  {variant.description && (
                    <p className="text-xs text-[#8E8E93] leading-relaxed">{variant.description}</p>
                  )}

                  <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
                    <span className="bg-[#242426] px-2.5 py-1 rounded-xl text-white/90 flex items-center gap-1">
                      <FileText className="w-3 h-3 text-blue-400" />
                      {variant.questionCount} ta (tuzilgan: {(variant.questions || []).length} ta)
                    </span>
                    <span className="bg-[#242426] px-2.5 py-1 rounded-xl text-amber-300 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-amber-400" />
                      {formatDurationLabel(variant.durationMinutes)}
                    </span>
                    <span className="bg-[#242426] px-2.5 py-1 rounded-xl text-emerald-300 font-semibold">
                      Max: {variant.maxScore} ball
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveVariantId(variant.id);
                      resetQuestionForm();
                    }}
                    className="flex-1 py-2.5 px-3 rounded-2xl bg-[#007AFF] hover:bg-blue-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Savollar ({(variant.questions || []).length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditingVariant({ ...variant, __isNew: false })}
                    className="p-2.5 rounded-2xl bg-[#2C2C2E] hover:bg-[#3A3A3C] text-white/90 transition-colors"
                    title="Tahrirlash"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteVariant(variant.id)}
                    className="p-2.5 rounded-2xl bg-[#2C2C2E] hover:bg-red-500/20 text-white/80 hover:text-red-400 transition-colors"
                    title="O'chirish"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Variant Modal */}
      {editingVariant && (
        <VariantFormModal
          initial={editingVariant}
          saving={saving}
          onClose={() => setEditingVariant(null)}
          onSubmit={handleSaveVariant}
        />
      )}
    </div>
  );
}

function ModeSettingsEditor({ modeConfig, saving, onSave }) {
  const [title, setTitle] = useState(modeConfig.title || '');
  const [badge, setBadge] = useState(modeConfig.badge || '');
  const [description, setDescription] = useState(modeConfig.description || '');
  const [questionCount, setQuestionCount] = useState(modeConfig.questionCount || 40);
  const [durationMinutes, setDurationMinutes] = useState(modeConfig.durationMinutes || 64);
  const [maxScore, setMaxScore] = useState(modeConfig.maxScore || 75);
  const [featuresText, setFeaturesText] = useState((modeConfig.features || []).join('\n'));

  useEffect(() => {
    setTitle(modeConfig.title || '');
    setBadge(modeConfig.badge || '');
    setDescription(modeConfig.description || '');
    setQuestionCount(modeConfig.questionCount || 40);
    setDurationMinutes(modeConfig.durationMinutes || 64);
    setMaxScore(modeConfig.maxScore || 75);
    setFeaturesText((modeConfig.features || []).join('\n'));
  }, [modeConfig]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...modeConfig,
      title: title.trim() || 'Milliy Sertifikat',
      badge: badge.trim() || "Davlat Ta'lim Standarti",
      description: description.trim(),
      questionCount: Math.max(1, parseInt(questionCount, 10) || 40),
      durationMinutes: Math.max(1, parseInt(durationMinutes, 10) || 64),
      maxScore: Math.max(1, parseFloat(maxScore) || 75),
      features: featuresText
        .split('\n')
        .map(s => s.trim())
        .filter(Boolean)
    });
  };

  return (
    <form onSubmit={handleSubmit} className="p-5 pt-2 border-t border-white/5 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-[11px] font-bold text-[#8E8E93] uppercase mb-1">Yo‘nalish nomi</label>
          <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="input-field" required />
        </div>
        <div>
          <label className="block text-[11px] font-bold text-[#8E8E93] uppercase mb-1">Yuqori teg</label>
          <input type="text" value={badge} onChange={e => setBadge(e.target.value)} className="input-field" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-[11px] font-bold text-[#8E8E93] uppercase mb-1">Savollar soni</label>
          <input type="number" min={1} value={questionCount} onChange={e => setQuestionCount(e.target.value)} className="input-field" required />
        </div>
        <div>
          <label className="block text-[11px] font-bold text-[#8E8E93] uppercase mb-1">
            Vaqt (daq) → {formatDurationLabel(durationMinutes)}
          </label>
          <input type="number" min={1} value={durationMinutes} onChange={e => setDurationMinutes(e.target.value)} className="input-field" required />
        </div>
        <div>
          <label className="block text-[11px] font-bold text-[#8E8E93] uppercase mb-1">Maksimal ball</label>
          <input type="number" min={1} step="0.5" value={maxScore} onChange={e => setMaxScore(e.target.value)} className="input-field" required />
        </div>
      </div>

      <div>
        <label className="block text-[11px] font-bold text-[#8E8E93] uppercase mb-1">Qisqa tavsif</label>
        <input type="text" value={description} onChange={e => setDescription(e.target.value)} className="input-field" />
      </div>

      <div>
        <label className="block text-[11px] font-bold text-[#8E8E93] uppercase mb-1">Afzallik punktlari (har qatorda bitta)</label>
        <textarea rows={2} value={featuresText} onChange={e => setFeaturesText(e.target.value)} className="input-field resize-none" />
      </div>

      <button
        type="submit"
        disabled={saving}
        className="px-5 py-2.5 rounded-2xl bg-[#007AFF] hover:bg-blue-600 text-white text-xs font-bold flex items-center gap-2"
      >
        <Save className="w-3.5 h-3.5" />
        <span>Sozlamalarni saqlash</span>
      </button>
    </form>
  );
}

function VariantFormModal({ initial, saving, onClose, onSubmit }) {
  const [form, setForm] = useState(initial);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#1C1C1E] border border-white/15 rounded-3xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto space-y-4 shadow-2xl">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-extrabold text-white">
            {form.__isNew ? 'Yangi test varianti qo‘shish' : 'Variantni tahrirlash'}
          </h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/70 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-[#8E8E93] uppercase mb-1">Variant nomi *</label>
            <input
              type="text"
              value={form.title || ''}
              onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
              className="input-field"
              placeholder="Masalan: Milliy Sertifikat: 3-Variant"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-[#8E8E93] uppercase mb-1">Badge matni</label>
              <input
                type="text"
                value={form.badge || ''}
                onChange={e => setForm(prev => ({ ...prev, badge: e.target.value }))}
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#8E8E93] uppercase mb-1">Qiyinlik darajasi</label>
              <select
                value={form.difficulty || 'Yuqori'}
                onChange={e => setForm(prev => ({ ...prev, difficulty: e.target.value }))}
                className="input-field"
              >
                <option value="O'rta">O'rta</option>
                <option value="Yuqori">Yuqori</option>
                <option value="Ekspert">Ekspert</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-[#8E8E93] uppercase mb-1">Savollar</label>
              <input
                type="number"
                min={1}
                value={form.questionCount || 40}
                onChange={e => setForm(prev => ({ ...prev, questionCount: e.target.value }))}
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#8E8E93] uppercase mb-1">Vaqt (daq)</label>
              <input
                type="number"
                min={1}
                value={form.durationMinutes || 64}
                onChange={e => setForm(prev => ({ ...prev, durationMinutes: e.target.value }))}
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#8E8E93] uppercase mb-1">Max ball</label>
              <input
                type="number"
                min={1}
                step="0.5"
                value={form.maxScore || 75}
                onChange={e => setForm(prev => ({ ...prev, maxScore: e.target.value }))}
                className="input-field"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#8E8E93] uppercase mb-1">Tavsif</label>
            <textarea
              rows={2}
              value={form.description || ''}
              onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
              className="input-field resize-none"
              placeholder="Qaysi mavzular qamrab olinganligi..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-2xl bg-[#2C2C2E] text-xs font-bold text-white/80">
              Bekor qilish
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-2xl bg-[#007AFF] hover:bg-blue-600 text-xs font-bold text-white flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Saqlash</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
