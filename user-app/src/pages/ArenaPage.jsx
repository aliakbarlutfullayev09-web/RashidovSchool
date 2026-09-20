import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import { motion, AnimatePresence } from 'framer-motion';

const BIOLOGY_TERMS = [
  { id: 1, term: "Mitoxondriya", definition: "Energiya ishlab chiqarish" },
  { id: 2, term: "Ribosoma", definition: "Oqsil sintezi" },
  { id: 3, term: "Xloroplast", definition: "Fotosintez" },
  { id: 4, term: "Lizosoma", definition: "Hujayra hazm qilish" },
  { id: 5, term: "Yadro", definition: "DNK saqlash" },
  { id: 6, term: "Sitoplazma", definition: "Hujayra ichki muhiti" },
  { id: 7, term: "Vakuola", definition: "Suv va moddalar saqlash" },
  { id: 8, term: "Golji apparati", definition: "Moddalarni saralash" },
];

export default function ArenaPage({ user }) {
  const [gameState, setGameState] = useState('idle'); // idle, playing, finished
  const [cards, setCards] = useState([]);
  const [selectedCards, setSelectedCards] = useState([]);
  const [matchedPairs, setMatchedPairs] = useState([]);
  const [timeLeft, setTimeLeft] = useState(60);
  const [score, setScore] = useState(0);
  const [wrongPair, setWrongPair] = useState([]);

  // Match Game Logic
  const startGame = () => {
    // Generate deck
    const deck = [];
    BIOLOGY_TERMS.forEach(item => {
      deck.push({ type: 'term', text: item.term, matchId: item.id, uniqueId: `term-${item.id}` });
      deck.push({ type: 'definition', text: item.definition, matchId: item.id, uniqueId: `def-${item.id}` });
    });
    
    // Shuffle deck
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    setCards(deck);
    setSelectedCards([]);
    setMatchedPairs([]);
    setTimeLeft(60);
    setScore(0);
    setGameState('playing');
    setWrongPair([]);
  };

  useEffect(() => {
    let timer;
    if (gameState === 'playing' && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && gameState === 'playing') {
      setGameState('finished');
    }
    return () => clearInterval(timer);
  }, [gameState, timeLeft]);

  useEffect(() => {
    if (matchedPairs.length === BIOLOGY_TERMS.length && gameState === 'playing') {
      setGameState('finished');
    }
  }, [matchedPairs, gameState]);

  const handleCardClick = (card) => {
    if (gameState !== 'playing') return;
    if (selectedCards.length >= 2) return;
    if (selectedCards.find(c => c.uniqueId === card.uniqueId)) return; // Already selected
    if (matchedPairs.includes(card.matchId)) return; // Already matched
    
    // Haptic feedback for tap
    if (window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
    }

    const newSelected = [...selectedCards, card];
    setSelectedCards(newSelected);

    if (newSelected.length === 2) {
      if (newSelected[0].matchId === newSelected[1].matchId && newSelected[0].type !== newSelected[1].type) {
        // Match!
        setTimeout(() => {
          setMatchedPairs(prev => [...prev, newSelected[0].matchId]);
          setSelectedCards([]);
          setScore(prev => prev + 1);
          if (window.Telegram?.WebApp?.HapticFeedback) {
            window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
          }
        }, 400);
      } else {
        // Wrong
        setWrongPair([newSelected[0].uniqueId, newSelected[1].uniqueId]);
        if (window.Telegram?.WebApp?.HapticFeedback) {
          window.Telegram.WebApp.HapticFeedback.notificationOccurred('error');
        }
        setTimeout(() => {
          setSelectedCards([]);
          setWrongPair([]);
        }, 800);
      }
    }
  };

  const handleInvite = () => {
    const inviteLink = `t.me/bot?start=duel_${Math.random().toString(36).substr(2, 9)}`;
    navigator.clipboard.writeText(inviteLink);
    if (window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
    }
    if (window.Telegram?.WebApp?.showAlert) {
      window.Telegram.WebApp.showAlert("Taklif havolasi nusxalandi!\n" + inviteLink);
    } else {
      alert("Taklif havolasi nusxalandi!\n" + inviteLink);
    }
  };

  return (
    <div className="min-h-screen bg-[#000000] pb-32">
      <Header user={user} />
      
      <main className="px-4 mt-6 space-y-6">
        {/* Solo Match Madness */}
        <section className="card bg-[#1C1C1E] rounded-[20px] border border-white/5 p-5">
          <div className="flex flex-col mb-4">
            <h2 className="text-xl font-bold text-white mb-1">⚡ Blits-juftliklar</h2>
            <p className="text-sm text-[#8E8E93]">60 soniyada atama va ta'riflarni juftlang!</p>
          </div>
          
          <div className="grid grid-cols-2 gap-2 my-5">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="bg-[#2C2C2E] h-10 rounded-xl border border-white/5 flex items-center justify-center">
                <div className="w-3/4 h-2 bg-white/10 rounded-full"></div>
              </div>
            ))}
          </div>
          
          <button 
            onClick={startGame}
            className="btn-primary w-full bg-[#007AFF] text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
          >
            <span className="text-xl">🎮</span> Boshlash (+50 XP)
          </button>
        </section>

        {/* PvP Arena */}
        <section className="card bg-[#1C1C1E] rounded-[20px] border border-white/5 p-5">
          <div className="flex flex-col mb-4">
            <h2 className="text-xl font-bold text-white mb-1">🏆 Bio-Duel 1v1</h2>
            <p className="text-sm text-[#8E8E93]">Do'stingiz bilan real-vaqtda bellashing!</p>
          </div>
          
          <div className="bg-[#2C2C2E] rounded-xl p-3 mb-5 flex justify-center gap-8 text-sm text-[#8E8E93]">
            <span className="font-medium">0 g'alaba</span>
            <span className="text-white/20">•</span>
            <span className="font-medium">0 yutqazish</span>
          </div>

          <div className="space-y-3">
            <button 
              onClick={handleInvite}
              className="w-full bg-[#007AFF] text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
            >
              📨 Raqibni taklif qilish
            </button>
            <button className="w-full bg-[#2C2C2E] text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 active:scale-[0.98] transition-transform border border-white/5">
              🔍 Raqib qidirish
            </button>
          </div>
          
          <div className="mt-6">
            <h3 className="text-sm font-bold text-white/70 mb-3 uppercase tracking-wider">So'nggi duellar</h3>
            <div className="text-center py-6 bg-[#2C2C2E] rounded-xl border border-white/5">
              <span className="text-2xl opacity-50 mb-2 block">⚔️</span>
              <p className="text-sm text-[#8E8E93]">Hali duellar yo'q</p>
            </div>
          </div>
        </section>
      </main>

      {/* Match Game Overlay */}
      <AnimatePresence>
        {gameState !== 'idle' && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            className="fixed inset-0 bg-[#000000] z-50 flex flex-col"
          >
            <div className="flex-1 p-4 flex flex-col max-w-lg mx-auto w-full">
              {/* Top Bar */}
              <div className="flex justify-between items-center mb-6 mt-4">
                <button 
                  onClick={() => setGameState('idle')}
                  className="w-10 h-10 bg-[#1C1C1E] rounded-full flex items-center justify-center border border-white/10 text-white"
                >
                  ✕
                </button>
                <div className="text-center">
                  <div className={`text-2xl font-black tabular-nums transition-colors ${timeLeft <= 10 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                    00:{timeLeft.toString().padStart(2, '0')}
                  </div>
                  <div className="text-sm text-[#8E8E93] font-medium">Juftliklar: {matchedPairs.length}/8</div>
                </div>
                <div className="w-10 h-10"></div>
              </div>
              
              {/* Progress/Timer Bar */}
              <div className="w-full h-2 bg-[#1C1C1E] rounded-full overflow-hidden mb-6">
                <motion.div 
                  className={`h-full ${timeLeft <= 10 ? 'bg-red-500' : 'bg-blue-500'}`}
                  initial={{ width: '100%' }}
                  animate={{ width: `${(timeLeft / 60) * 100}%` }}
                  transition={{ duration: 1, ease: "linear" }}
                />
              </div>

              {/* Game Grid */}
              <div className="flex-1 flex items-center justify-center">
                <div className="grid grid-cols-4 gap-2 w-full">
                  {cards.map(card => {
                    const isSelected = selectedCards.some(c => c.uniqueId === card.uniqueId);
                    const isMatched = matchedPairs.includes(card.matchId);
                    const isWrong = wrongPair.includes(card.uniqueId);
                    
                    return (
                      <motion.button
                        key={card.uniqueId}
                        whileTap={{ scale: isMatched ? 1 : 0.95 }}
                        onClick={() => handleCardClick(card)}
                        disabled={isMatched}
                        className={`
                          aspect-[3/4] rounded-xl p-1 flex flex-col items-center justify-center text-center
                          transition-transform duration-300
                          ${isMatched ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100'}
                          ${isSelected ? 'bg-blue-500 border-2 border-blue-400 text-white shadow-[0_0_15px_rgba(0,122,255,0.5)]' : 'bg-[#1C1C1E] border border-white/10 text-white/90'}
                          ${isWrong ? 'bg-red-500/20 border-red-500 text-red-500' : ''}
                        `}
                        animate={isWrong ? { x: [-5, 5, -5, 5, 0] } : {}}
                        transition={{ duration: 0.4 }}
                      >
                        <span className={`text-[9px] leading-tight select-none ${card.type === 'term' ? 'font-bold text-[11px]' : ''}`}>
                          {card.text}
                        </span>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Game Over Modal overlay */}
            <AnimatePresence>
              {gameState === 'finished' && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-6 z-50"
                >
                  <motion.div 
                    initial={{ scale: 0.9, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    className="bg-[#1C1C1E] w-full max-w-sm rounded-[24px] p-6 border border-white/10 text-center"
                  >
                    <div className="text-6xl mb-4">
                      {matchedPairs.length === 8 ? '🏆' : '⏰'}
                    </div>
                    
                    <h2 className="text-2xl font-bold text-white mb-2">
                      {matchedPairs.length === 8 ? 'Ajoyib Natija!' : 'Vaqt Tugadi!'}
                    </h2>
                    <p className="text-[#8E8E93] mb-6">
                      Siz 8 ta juftlikdan {matchedPairs.length} tasini topdingiz.
                    </p>
                    
                    <div className="bg-[#2C2C2E] rounded-xl py-3 px-4 mb-6 inline-flex items-center gap-2">
                      <span className="text-yellow-400 font-bold text-xl">+{matchedPairs.length * 10}</span>
                      <span className="text-white font-medium">XP yig'ildi</span>
                    </div>

                    <div className="space-y-3">
                      <button 
                        onClick={startGame}
                        className="w-full bg-[#007AFF] text-white font-bold py-3.5 rounded-xl active:scale-[0.98] transition-transform"
                      >
                        Qayta o'ynash
                      </button>
                      <button 
                        onClick={() => setGameState('idle')}
                        className="w-full bg-transparent text-white/70 font-bold py-3.5 rounded-xl active:scale-[0.98] transition-transform"
                      >
                        Chiqish
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
