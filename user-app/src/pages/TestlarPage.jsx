import React, { useState, useEffect, useRef } from 'react';
import { 
  Trophy, Clock, AlertTriangle, CheckCircle2, XCircle, ArrowLeft, 
  RotateCcw, BookOpen, Search, Sparkles, Filter, ChevronRight, Check
} from 'lucide-react';
import { isUzbekMatch } from '../utils/uzbekFuzzy';
import { useHaptic } from '../hooks/useHaptic';
import { useLanguage } from '../context/LanguageContext';

const DTM_SAMPLE_QUESTIONS = [
  {
    id: 1,
    type: 'choice',
    text: "Qaysi organoid eukariot hujayralarda ATF sintezlovchi asosiy struktura hisoblanadi?",
    options: ["Ribosoma", "Mitoxondriya", "Lizosoma", "Golji majmuasi"],
    correctIndex: 1,
    textbookRef: "9-sinf Biologiya, 2-bob, §9, 36-bet"
  },
  {
    id: 2,
    type: 'image',
    text: "Rasmda tasvirlangan mitoz fazasini aniqlang:",
    imageUrl: "https://images.unsplash.com/photo-1530026405186-ed1f139313f8?auto=format&fit=crop&w=600&q=80",
    options: ["Profaza", "Metafaza", "Anafaza", "Telofaza"],
    correctIndex: 1,
    textbookRef: "10-sinf Biologiya, 3-bob, §11, 48-bet"
  },
  {
    id: 3,
    type: 'input',
    text: "Odam tana hujayrasidagi (somatik) xromosomalar sonini yozing:",
    correctAnswer: "46",
    textbookRef: "9-sinf Biologiya, 4-bob, §15, 62-bet"
  }
];

export default function TestlarPage({ user }) {
  const { t } = useLanguage();
  const { selectionChanged, impactLight, impactMedium, notificationSuccess, notificationError } = useHaptic();

  // Mode: 'dtm' | 'sertifikat' | 'trenajyor'
  const [activeMode, setActiveMode] = useState('dtm');

  // Exam Runner State
  const [examActive, setExamActive] = useState(false);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(1800); // 30 mins
  const [cheatWarnings, setCheatWarnings] = useState(0);
  const [showWarningModal, setShowWarningModal] = useState(false);
  
  // Results & Tahlil State
  const [examFinished, setExamFinished] = useState(false);
  const [showTahlil, setShowTahlil] = useState(false);

  // Focus / Anti-cheat detector
  useEffect(() => {
    if (!examActive || examFinished) return;

    const handleVisibility = () => {
      if (document.hidden) {
        setCheatWarnings(prev => {
          const next = prev + 1;
          if (next >= 2) {
            handleFinishExam();
          } else {
            setShowWarningModal(true);
            notificationError();
          }
          return next;
        });
      }
    };

    window.addEventListener('visibilitychange', handleVisibility);
    return () => window.removeEventListener('visibilitychange', handleVisibility);
  }, [examActive, examFinished]);

  // Countdown Timer
  useEffect(() => {
    if (!examActive || examFinished) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleFinishExam();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [examActive, examFinished]);

  const handleStartExam = () => {
    impactMedium();
    setExamActive(true);
    setExamFinished(false);
    setCurrentQIndex(0);
    setUserAnswers({});
    setTimeLeft(1800);
    setCheatWarnings(0);
    setShowWarningModal(false);
    setShowTahlil(false);
  };

  const handleSelectAnswer = (qIndex, ans) => {
    impactLight();
    setUserAnswers(prev => ({ ...prev, [qIndex]: ans }));
  };

  const handleFinishExam = () => {
    impactMedium();
    setExamActive(false);
    setExamFinished(true);
    notificationSuccess();
  };

  // Evaluation
  const questions = DTM_SAMPLE_QUESTIONS;
  let correctCount = 0;
  questions.forEach((q, idx) => {
    const userAns = userAnswers[idx];
    if (q.type === 'input') {
      if (userAns && isUzbekMatch(userAns, q.correctAnswer)) {
        correctCount++;
      }
    } else {
      if (userAns === q.correctIndex) {
        correctCount++;
      }
    }
  });

  const totalScore = (correctCount * 3.1).toFixed(1);
  const grantProb = Math.min(100, Math.round((correctCount / questions.length) * 100));

  // Certificate Grade mapping
  let certGrade = 'C';
  if (grantProb >= 90) certGrade = 'A+';
  else if (grantProb >= 80) certGrade = 'A';
  else if (grantProb >= 70) certGrade = 'B+';
  else if (grantProb >= 60) certGrade = 'B';

  // ----------------------------------------------------
  // RENDER: EXAM RUNNER
  // ----------------------------------------------------
  if (examActive) {
    const currentQ = questions[currentQIndex];
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;

    return (
      <div className="w-full min-h-screen bg-[#000000] text-white p-4 pb-28 max-w-lg mx-auto select-none">
        
        {/* Top Header */}
        <div className="flex items-center justify-between py-3 border-b border-white/5 mb-4">
          <button
            onClick={() => {
              if (window.confirm("Testni to'xtatmoqchimisiz?")) {
                setExamActive(false);
              }
            }}
            className="w-9 h-9 rounded-full bg-[#1C1C1E] flex items-center justify-center text-white"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-1.5 bg-[#1C1C1E] border border-amber-500/30 px-3 py-1.5 rounded-full text-xs font-mono font-bold text-amber-300">
            <Clock className="w-3.5 h-3.5" />
            <span>{minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}</span>
          </div>

          <button
            onClick={handleFinishExam}
            className="bg-[#007AFF] hover:bg-blue-600 text-white text-xs font-bold px-3 py-1.5 rounded-full"
          >
            Yakunlash
          </button>
        </div>

        {/* Question Grid Navigator */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-2 mb-4">
          {questions.map((_, idx) => {
            const isAnswered = userAnswers[idx] !== undefined;
            const isCurrent = idx === currentQIndex;
            return (
              <button
                key={idx}
                onClick={() => setCurrentQIndex(idx)}
                className={`w-9 h-9 rounded-xl flex-shrink-0 font-bold text-xs transition-all ${
                  isCurrent
                    ? 'bg-[#007AFF] text-white ring-2 ring-blue-400'
                    : isAnswered
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-[#1C1C1E] border border-white/5 text-[#8E8E93]'
                }`}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>

        {/* Current Question Card */}
        <div className="bg-[#1C1C1E] border border-white/5 rounded-3xl p-5 mb-5 space-y-4">
          <div className="flex items-center justify-between text-xs text-[#8E8E93]">
            <span>Savol {currentQIndex + 1} / {questions.length}</span>
            <span className="text-blue-400 font-bold">+3.1 ball</span>
          </div>

          {currentQ.imageUrl && (
            <div className="w-full aspect-video rounded-2xl overflow-hidden bg-black/40 border border-white/5">
              <img src={currentQ.imageUrl} alt="Savol rasmi" className="w-full h-full object-cover" />
            </div>
          )}

          <h3 className="text-white font-bold text-base leading-snug">
            {currentQ.text}
          </h3>

          {/* Option UI: Choice vs Input */}
          {currentQ.type === 'input' ? (
            <div className="pt-2">
              <label className="text-xs text-[#8E8E93] block mb-1">Javobingizni yozing:</label>
              <input
                type="text"
                value={userAnswers[currentQIndex] || ''}
                onChange={(e) => handleSelectAnswer(currentQIndex, e.target.value)}
                placeholder="Masalan: 46"
                className="w-full bg-[#2C2C2E] border border-white/10 rounded-2xl p-4 text-white text-base font-bold outline-none focus:border-[#007AFF]"
              />
            </div>
          ) : (
            <div className="space-y-2.5 pt-2">
              {currentQ.options.map((opt, oIdx) => {
                const isSelected = userAnswers[currentQIndex] === oIdx;
                return (
                  <button
                    key={oIdx}
                    onClick={() => handleSelectAnswer(currentQIndex, oIdx)}
                    className={`w-full p-4 rounded-2xl border text-left text-xs font-semibold flex items-center justify-between transition-all active:scale-[0.99] ${
                      isSelected
                        ? 'bg-[#007AFF] border-blue-400 text-white shadow-lg shadow-blue-500/25'
                        : 'bg-[#2C2C2E] border-white/5 text-white/90 hover:bg-[#343438]'
                    }`}
                  >
                    <span>{opt}</span>
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${isSelected ? 'border-white bg-white text-[#007AFF]' : 'border-white/20'}`}>
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Navigation Arrows */}
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={() => setCurrentQIndex(prev => Math.max(0, prev - 1))}
            disabled={currentQIndex === 0}
            className="flex-1 bg-[#1C1C1E] border border-white/5 disabled:opacity-40 text-white py-3.5 rounded-2xl font-bold text-xs"
          >
            ← Oldingi
          </button>
          <button
            onClick={() => {
              if (currentQIndex < questions.length - 1) {
                setCurrentQIndex(prev => prev + 1);
              } else {
                handleFinishExam();
              }
            }}
            className="flex-1 bg-[#007AFF] hover:bg-blue-600 text-white py-3.5 rounded-2xl font-bold text-xs"
          >
            {currentQIndex === questions.length - 1 ? 'Yakunlash ✓' : 'Keyingi →'}
          </button>
        </div>

        {/* Anti-cheat Warning Modal */}
        {showWarningModal && (
          <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-center justify-center p-6 text-center">
            <div className="bg-[#1C1C1E] border border-red-500/30 p-6 rounded-3xl max-w-xs w-full space-y-3">
              <div className="w-12 h-12 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center mx-auto text-2xl">
                ⚠️
              </div>
              <h4 className="text-white font-bold text-base">Ogohlantirish!</h4>
              <p className="text-xs text-[#8E8E93] leading-relaxed">
                Ilovadan chiqish yoki boshqa oynaga o'tish taqiqlanadi! Yana bir marta takrorlansa, test avtomatik yakunlanadi.
              </p>
              <button
                onClick={() => setShowWarningModal(false)}
                className="w-full bg-[#007AFF] text-white py-3 rounded-xl font-bold text-xs"
              >
                Tushundim, davom etaman
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ----------------------------------------------------
  // RENDER: RESULTS & TAHLIL SCREEN
  // ----------------------------------------------------
  if (examFinished) {
    return (
      <div className="w-full min-h-screen bg-[#000000] text-white p-4 pb-28 max-w-lg mx-auto space-y-5">
        
        {/* Results Card */}
        <div className="bg-[#1C1C1E] border border-white/5 rounded-3xl p-6 text-center space-y-4 shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 text-black flex items-center justify-center text-3xl mx-auto shadow-lg shadow-emerald-500/30">
            🏆
          </div>

          <div>
            <h3 className="text-white font-extrabold text-2xl mb-1">Test yakunlandi!</h3>
            <p className="text-xs text-[#8E8E93]">Rasmiy DTM & Milliy Sertifikat simulyatsiyasi</p>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-2">
            <div className="bg-[#2C2C2E] p-3 rounded-2xl">
              <span className="text-[10px] text-[#8E8E93] block">To'g'ri:</span>
              <span className="text-emerald-400 font-bold text-lg">{correctCount} / {questions.length}</span>
            </div>
            <div className="bg-[#2C2C2E] p-3 rounded-2xl">
              <span className="text-[10px] text-[#8E8E93] block">To'plangan ball:</span>
              <span className="text-blue-400 font-bold text-lg">{totalScore}</span>
            </div>
            <div className="bg-[#2C2C2E] p-3 rounded-2xl">
              <span className="text-[10px] text-[#8E8E93] block">Sertifikat:</span>
              <span className="text-amber-400 font-bold text-lg">{certGrade}</span>
            </div>
          </div>

          <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-2xl text-xs text-emerald-300 font-semibold flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4" />
            <span>Davlat granti ehtimoli: {grantProb}%</span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2">
            <button
              onClick={() => setShowTahlil(prev => !prev)}
              className="bg-[#2C2C2E] hover:bg-[#343438] text-white font-bold py-3.5 px-3 rounded-2xl text-xs flex items-center justify-center gap-1.5 transition-all"
            >
              <Search className="w-4 h-4 text-purple-400" />
              <span>Xatolar tahlili</span>
            </button>
            <button
              onClick={handleStartExam}
              className="bg-[#007AFF] hover:bg-blue-600 text-white font-bold py-3.5 px-3 rounded-2xl text-xs flex items-center justify-center gap-1.5 transition-all"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Qayta topshirish</span>
            </button>
          </div>
        </div>

        {/* Tahlil Section */}
        {showTahlil && (
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-[#8E8E93] uppercase tracking-wider">
              Xatolar bo'yicha darslik ko'rsatmalari (Tahlil):
            </h4>

            {questions.map((q, idx) => {
              const userAns = userAnswers[idx];
              const isCorrect = q.type === 'input' 
                ? (userAns && isUzbekMatch(userAns, q.correctAnswer))
                : (userAns === q.correctIndex);

              return (
                <div
                  key={idx}
                  className={`bg-[#1C1C1E] border rounded-2xl p-4 space-y-2 ${
                    isCorrect ? 'border-emerald-500/20' : 'border-red-500/20'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-white">Savol {idx + 1}</span>
                    {isCorrect ? (
                      <span className="text-emerald-400 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> To'g'ri (+3.1)
                      </span>
                    ) : (
                      <span className="text-red-400 font-bold flex items-center gap-1">
                        <XCircle className="w-3.5 h-3.5" /> Xato (0 ball)
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-white/90 font-medium">{q.text}</p>

                  <div className="bg-[#242426] p-2.5 rounded-xl text-xs text-amber-300 font-semibold flex items-center gap-2">
                    <BookOpen className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                    <span>{q.textbookRef}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ----------------------------------------------------
  // RENDER: MAIN SELECTION MENU (3 MODES)
  // ----------------------------------------------------
  return (
    <div className="w-full pb-28 pt-2 px-4 max-w-5xl mx-auto space-y-5">
      
      {/* Top Segmented Control */}
      <div className="grid grid-cols-3 gap-1 bg-[#1C1C1E] p-1.5 rounded-2xl border border-white/5">
        <button
          onClick={() => {
            selectionChanged();
            setActiveMode('dtm');
          }}
          className={`py-2 text-xs font-bold rounded-xl transition-all ${
            activeMode === 'dtm' ? 'bg-[#007AFF] text-white shadow-md' : 'text-[#8E8E93] hover:text-white'
          }`}
        >
          🎯 DTM Mock
        </button>
        <button
          onClick={() => {
            selectionChanged();
            setActiveMode('sertifikat');
          }}
          className={`py-2 text-xs font-bold rounded-xl transition-all ${
            activeMode === 'sertifikat' ? 'bg-[#007AFF] text-white shadow-md' : 'text-[#8E8E93] hover:text-white'
          }`}
        >
          📜 Milliy Sertifikat
        </button>
        <button
          onClick={() => {
            selectionChanged();
            setActiveMode('trenajyor');
          }}
          className={`py-2 text-xs font-bold rounded-xl transition-all ${
            activeMode === 'trenajyor' ? 'bg-[#007AFF] text-white shadow-md' : 'text-[#8E8E93] hover:text-white'
          }`}
        >
          📑 Trenajyor
        </button>
      </div>

      {/* Mode 1: DTM Mock Test */}
      {activeMode === 'dtm' && (
        <div className="bg-[#1C1C1E] border border-white/5 rounded-3xl p-6 space-y-5 shadow-2xl">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-2xl">
              🎯
            </div>
            <div>
              <h3 className="text-white font-bold text-base">DTM Rasmiy Simulyatsiyasi</h3>
              <p className="text-xs text-[#8E8E93]">Davlat test markazi standarti bo'yicha 30 ta savol</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="bg-[#2C2C2E] p-3 rounded-2xl">
              <span className="text-[10px] text-[#8E8E93] block">Savollar:</span>
              <span className="text-white font-bold">30 ta</span>
            </div>
            <div className="bg-[#2C2C2E] p-3 rounded-2xl">
              <span className="text-[10px] text-[#8E8E93] block">Vaqt:</span>
              <span className="text-amber-400 font-bold">30 daqiqa</span>
            </div>
            <div className="bg-[#2C2C2E] p-3 rounded-2xl">
              <span className="text-[10px] text-[#8E8E93] block">Maksimal:</span>
              <span className="text-emerald-400 font-bold">93.0 ball</span>
            </div>
          </div>

          <div className="bg-[#242426] border border-white/5 p-4 rounded-2xl space-y-2 text-xs text-[#8E8E93]">
            <div className="flex items-center gap-2 text-white font-semibold">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>Imtihon qoidalari:</span>
            </div>
            <p>• Har bir to'g'ri javob uchun 3.1 ball beriladi.</p>
            <p>• Ilovadan chiqish yoki oynani almashtirish qat'iyan man etiladi.</p>
            <p>• Yakunda xatolar bo'yicha darslik manbalari (Tahlil) ko'rsatiladi.</p>
          </div>

          <button
            onClick={handleStartExam}
            className="w-full bg-[#007AFF] hover:bg-blue-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-500/25 active:scale-95 transition-all text-sm"
          >
            Imtihonni boshlash
          </button>
        </div>
      )}

      {/* Mode 2: Milliy Sertifikat Simulation */}
      {activeMode === 'sertifikat' && (
        <div className="bg-[#1C1C1E] border border-white/5 rounded-3xl p-6 space-y-5 shadow-2xl">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-2xl">
              📜
            </div>
            <div>
              <h3 className="text-white font-bold text-base">Milliy Sertifikat Simulyatsiyasi</h3>
              <p className="text-xs text-[#8E8E93]">A+, A, B+, B darajalarini aniqlovchi ko'p bosqichli test</p>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <div className="bg-[#2C2C2E] p-3.5 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-white font-bold block">A-Qism: Nazariy savollar</span>
                <span className="text-[10px] text-[#8E8E93]">Yagona to'g'ri javobli testlar</span>
              </div>
              <span className="text-emerald-400 font-bold">15 ta</span>
            </div>

            <div className="bg-[#2C2C2E] p-3.5 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-white font-bold block">B-Qism: Moslashtirish</span>
                <span className="text-[10px] text-[#8E8E93]">Organoidlar va ularning funksiyalari</span>
              </div>
              <span className="text-emerald-400 font-bold">5 ta</span>
            </div>

            <div className="bg-[#2C2C2E] p-3.5 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-white font-bold block">C-Qism: Masalalar yechimi</span>
                <span className="text-[10px] text-[#8E8E93]">Genetika va molekulyar biologiya hisoblari</span>
              </div>
              <span className="text-emerald-400 font-bold">5 ta</span>
            </div>
          </div>

          <button
            onClick={handleStartExam}
            className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-bold py-4 rounded-2xl shadow-lg shadow-amber-500/20 active:scale-95 transition-all text-sm"
          >
            Sertifikat testini boshlash
          </button>
        </div>
      )}

      {/* Mode 3: Mavzuli Trenajyor (Topic Practice) */}
      {activeMode === 'trenajyor' && (
        <div className="space-y-4">
          <div className="bg-[#1C1C1E] border border-white/5 rounded-3xl p-5 space-y-3">
            <h4 className="text-white font-bold text-sm">Mavzuni tanlang va bilimingizni charxlang:</h4>
            
            <div className="grid grid-cols-1 gap-2.5">
              {[
                { title: "Hujayra biologiyasi (Sitologiya)", count: 24, icon: "🔬" },
                { title: "Klassik va Zamonaviy Genetika", count: 32, icon: "🧬" },
                { title: "Odam anatomiyasi va fiziologiyasi", count: 28, icon: "🫀" },
                { title: "Botanika va Zoologiya asoslari", count: 20, icon: "🌿" }
              ].map((topic, i) => (
                <button
                  key={i}
                  onClick={handleStartExam}
                  className="bg-[#2C2C2E] hover:bg-[#343438] p-4 rounded-2xl flex items-center justify-between text-left transition-all active:scale-[0.99] border border-white/5"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{topic.icon}</span>
                    <div>
                      <div className="text-white text-xs font-bold">{topic.title}</div>
                      <div className="text-[10px] text-[#8E8E93]">{topic.count} ta savol bazada</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#8E8E93]" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
