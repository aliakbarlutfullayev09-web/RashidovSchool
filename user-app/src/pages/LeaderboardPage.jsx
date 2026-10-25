import React, { useState } from 'react';
import { Trophy, Medal, Crown, Sparkles, Flame, User } from 'lucide-react';
import { formatCompactNeyron } from '../utils/formatters';
import { useHaptic } from '../hooks/useHaptic';

import { supabase } from '../api/supabase';

const SAMPLE_LEADERBOARD = [
  { id: 1, rank: 1, name: "Madina Karimova", school: "Prezident Maktabi", class: "11-A", neyrons: 14200, treeStage: "🌳 Bilim daraxti", prize: "🎁 Telegram Sovg'a" },
  { id: 2, rank: 2, name: "Jasur Rahimov", school: "1-IDUM", class: "10-B", neyrons: 11850, treeStage: "🌸 Gullagan" },
  { id: 3, rank: 3, name: "Zuhra Alimova", school: "Al-Xorazmiy", class: "11-V", neyrons: 9400, treeStage: "🌿 Ko'chat" },
  { id: 4, rank: 4, name: "Sardorbek Boboyev", school: "45-maktab", class: "9-A", neyrons: 7850, treeStage: "🌿 Ko'chat" },
  { id: 5, rank: 5, name: "Nargiza Rustamova", school: "12-maktab", class: "10-A", neyrons: 6920, treeStage: "🪴 Nihol" },
  { id: 6, rank: 6, name: "Diyorbek Yoqubov", school: "Litsey", class: "Abituriyent", neyrons: 5800, treeStage: "🪴 Nihol" },
  { id: 7, rank: 7, name: "Malika Shodiyeva", school: "22-maktab", class: "11-B", neyrons: 4950, treeStage: "🪴 Nihol" },
  { id: 8, rank: 8, name: "Otabek Qodirov", school: "Prezident Maktabi", class: "9-B", neyrons: 3820, treeStage: "🌱 Urug'" }
];

export default function LeaderboardPage({ user }) {
  const { selectionChanged, impactLight } = useHaptic();
  
  // Toggles
  const [timeframe, setTimeframe] = useState('monthly'); // 'monthly' | 'all'
  const [scope, setScope] = useState('republic'); // 'republic' | 'class'
  const [leaderboard, setLeaderboard] = useState(SAMPLE_LEADERBOARD);

  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        let query = supabase
          .from('users')
          .select('telegram_id, full_name, class_group, balance, streak_days')
          .order('balance', { ascending: false })
          .limit(30);

        if (scope === 'class' && user?.class_group) {
          query = query.eq('class_group', user.class_group);
        }

        const { data, error } = await query;
        if (!error && data && data.length >= 3) {
          const mapped = data.map((u, i) => ({
            id: u.telegram_id,
            rank: i + 1,
            name: u.full_name || `Foydalanuvchi #${i + 1}`,
            school: "Rashidov School",
            class: u.class_group || 'Abituriyent',
            neyrons: u.balance || 0,
            treeStage: (u.balance > 10000 ? "🌳 Bilim daraxti" : u.balance > 5000 ? "🌸 Gullagan" : u.balance > 2000 ? "🌿 Ko'chat" : "🪴 Nihol"),
            prize: i === 0 ? "🎁 Telegram Sovg'a" : undefined
          }));
          setLeaderboard(mapped);
        }
      } catch (e) {
        console.warn("Failed to load real leaderboard:", e);
      }
    }
    fetchLeaderboard();
  }, [timeframe, scope, user]);

  const handleTimeframeChange = (val) => {
    if (timeframe !== val) {
      selectionChanged();
      setTimeframe(val);
    }
  };

  const handleScopeChange = (val) => {
    if (scope !== val) {
      selectionChanged();
      setScope(val);
    }
  };

  const top1 = leaderboard[0] || SAMPLE_LEADERBOARD[0];
  const top2 = leaderboard[1] || SAMPLE_LEADERBOARD[1];
  const top3 = leaderboard[2] || SAMPLE_LEADERBOARD[2];
  const otherRanks = leaderboard.slice(3);

  const myIndex = leaderboard.findIndex(item => item.id === user?.telegram_id);
  const userRank = myIndex !== -1 ? myIndex + 1 : 42;
  const userNeyron = user?.balance || 1850;
  const userName = user?.full_name || 'Siz (Aliakbar L.)';

  return (
    <div className="w-full pb-36 pt-2 px-4 max-w-5xl mx-auto space-y-5">
      
      {/* Top Filter Toggles */}
      <div className="flex flex-col sm:flex-row gap-2">
        {/* Timeframe Toggle */}
        <div className="flex-1 grid grid-cols-2 gap-1 bg-[#1C1C1E] p-1 rounded-2xl border border-white/5">
          <button
            onClick={() => handleTimeframeChange('monthly')}
            className={`py-2 text-xs font-bold rounded-xl transition-all ${
              timeframe === 'monthly' ? 'bg-[#007AFF] text-white shadow-md' : 'text-[#8E8E93] hover:text-white'
            }`}
          >
            Bu oy (Sovg'ali) 🎁
          </button>
          <button
            onClick={() => handleTimeframeChange('all')}
            className={`py-2 text-xs font-bold rounded-xl transition-all ${
              timeframe === 'all' ? 'bg-[#007AFF] text-white shadow-md' : 'text-[#8E8E93] hover:text-white'
            }`}
          >
            Barcha vaqt
          </button>
        </div>

        {/* Scope Toggle */}
        <div className="flex-1 grid grid-cols-2 gap-1 bg-[#1C1C1E] p-1 rounded-2xl border border-white/5">
          <button
            onClick={() => handleScopeChange('republic')}
            className={`py-2 text-xs font-bold rounded-xl transition-all ${
              scope === 'republic' ? 'bg-[#007AFF] text-white shadow-md' : 'text-[#8E8E93] hover:text-white'
            }`}
          >
            Respublika
          </button>
          <button
            onClick={() => handleScopeChange('class')}
            className={`py-2 text-xs font-bold rounded-xl transition-all ${
              scope === 'class' ? 'bg-[#007AFF] text-white shadow-md' : 'text-[#8E8E93] hover:text-white'
            }`}
          >
            Mening sinfim
          </button>
        </div>
      </div>

      {/* Top-3 Podium */}
      <div className="bg-[#1C1C1E] border border-white/5 rounded-3xl p-5 pt-8 shadow-2xl relative overflow-hidden">
        {/* Ambient Gold Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-32 bg-amber-500/10 blur-3xl pointer-events-none" />

        <div className="grid grid-cols-3 gap-2 items-end">
          
          {/* #2 Silver */}
          <div className="flex flex-col items-center text-center">
            <div className="relative mb-2">
              <div className="w-14 h-14 rounded-full bg-slate-400/20 border-2 border-slate-300 flex items-center justify-center font-bold text-white text-base shadow-lg">
                {top2.name.substring(0, 2).toUpperCase()}
              </div>
              <div className="absolute -bottom-2 -right-1 bg-slate-300 text-black text-[10px] font-extrabold w-5 h-5 rounded-full flex items-center justify-center shadow">
                2
              </div>
            </div>
            <span className="text-white font-bold text-xs truncate max-w-[90px]">{top2.name}</span>
            <span className="text-[10px] text-blue-400 font-bold">{formatCompactNeyron(top2.neyrons)} 🧠</span>
            <div className="w-full h-16 bg-gradient-to-t from-slate-700/40 to-slate-500/20 rounded-t-2xl mt-3 flex items-center justify-center text-xs font-bold text-slate-300">
              🥈 2-o'rin
            </div>
          </div>

          {/* #1 Gold Champion Pedestal */}
          <div className="flex flex-col items-center text-center relative z-10">
            <div className="relative mb-2">
              <Crown className="w-6 h-6 text-amber-400 fill-amber-400 absolute -top-5 left-1/2 -translate-x-1/2 animate-bounce" />
              <div className="w-18 h-18 w-[72px] h-[72px] rounded-full bg-gradient-to-tr from-amber-600 via-yellow-400 to-amber-200 p-[3px] shadow-[0_0_20px_rgba(245,158,11,0.4)]">
                <div className="w-full h-full rounded-full bg-[#1C1C1E] flex items-center justify-center font-extrabold text-amber-300 text-lg">
                  {top1.name.substring(0, 2).toUpperCase()}
                </div>
              </div>
              <div className="absolute -bottom-2 -right-1 bg-amber-400 text-black text-xs font-extrabold w-6 h-6 rounded-full flex items-center justify-center shadow-lg">
                1
              </div>
            </div>
            <span className="text-white font-extrabold text-xs truncate max-w-[100px]">{top1.name}</span>
            <span className="text-[11px] text-amber-400 font-extrabold">{formatCompactNeyron(top1.neyrons)} 🧠</span>
            
            {/* Prize Tag */}
            <span className="bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[9px] font-extrabold px-2 py-0.5 rounded-full mt-1">
              {top1.prize}
            </span>

            <div className="w-full h-24 bg-gradient-to-t from-amber-600/40 to-yellow-500/30 rounded-t-2xl mt-3 flex items-center justify-center text-xs font-extrabold text-amber-300 border-t-2 border-amber-400/50">
              🥇 1-o'rin
            </div>
          </div>

          {/* #3 Bronze */}
          <div className="flex flex-col items-center text-center">
            <div className="relative mb-2">
              <div className="w-14 h-14 rounded-full bg-amber-800/20 border-2 border-amber-600 flex items-center justify-center font-bold text-white text-base shadow-lg">
                {top3.name.substring(0, 2).toUpperCase()}
              </div>
              <div className="absolute -bottom-2 -right-1 bg-amber-600 text-white text-[10px] font-extrabold w-5 h-5 rounded-full flex items-center justify-center shadow">
                3
              </div>
            </div>
            <span className="text-white font-bold text-xs truncate max-w-[90px]">{top3.name}</span>
            <span className="text-[10px] text-blue-400 font-bold">{formatCompactNeyron(top3.neyrons)} 🧠</span>
            <div className="w-full h-12 bg-gradient-to-t from-amber-900/40 to-amber-700/20 rounded-t-2xl mt-3 flex items-center justify-center text-xs font-bold text-amber-500">
              🥉 3-o'rin
            </div>
          </div>

        </div>
      </div>

      {/* Ranked List 4..100 */}
      <div className="bg-[#1C1C1E] border border-white/5 rounded-3xl p-3 space-y-1">
        {otherRanks.map((student) => (
          <div
            key={student.id}
            className="flex items-center justify-between p-3 rounded-2xl hover:bg-white/[0.03] transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="w-6 text-center text-xs font-bold text-[#8E8E93]">
                #{student.rank}
              </span>

              <div className="w-9 h-9 rounded-full bg-[#2C2C2E] border border-white/5 flex items-center justify-center text-xs font-bold text-white">
                {student.name.substring(0, 2).toUpperCase()}
              </div>

              <div>
                <h4 className="text-white font-bold text-xs leading-tight">{student.name}</h4>
                <div className="flex items-center gap-2 text-[10px] text-[#8E8E93]">
                  <span>{student.class}</span>
                  <span>•</span>
                  <span className="text-emerald-400">{student.treeStage}</span>
                </div>
              </div>
            </div>

            <span className="text-blue-400 font-bold text-xs bg-blue-500/10 px-2.5 py-1 rounded-full border border-blue-500/20">
              {formatCompactNeyron(student.neyrons)} 🧠
            </span>
          </div>
        ))}
      </div>

      {/* Sticky Bottom User Rank Bar (fixed above bottom dock) */}
      <div className="fixed bottom-20 left-1/2 -translate-x-1/2 w-[92%] max-w-[420px] z-30">
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white rounded-2xl p-3 px-4 shadow-2xl flex items-center justify-between border border-blue-400/30">
          <div className="flex items-center gap-2.5">
            <span className="bg-white/20 text-white text-xs font-extrabold px-2 py-0.5 rounded-lg">
              #{userRank}
            </span>
            <div className="text-left">
              <span className="text-xs font-bold block">{userName}</span>
              <span className="text-[10px] text-white/80">Sizning o'rningiz</span>
            </div>
          </div>

          <div className="text-right">
            <span className="text-xs font-extrabold">{formatCompactNeyron(userNeyron)} Neyron</span>
          </div>
        </div>
      </div>

    </div>
  );
}
