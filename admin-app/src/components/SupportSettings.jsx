import React, { useState, useEffect } from 'react';
import { 
  Headphones, Send, Phone, Save, CheckCircle2, 
  Sparkles, RefreshCw, AlertCircle, ShieldAlert, Globe, ExternalLink 
} from 'lucide-react';
import { api } from '../api/supabase';

export default function SupportSettings({ user }) {
  const isSuperAdmin = user?.role === 'superadmin' || user?.role === 'admin';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const [contacts, setContacts] = useState({
    bio: {
      telegram: '@rashidov_bio_mentor',
      phone: '+998 90 123 45 67'
    },
    chem: {
      telegram: '@rashidov_chem_mentor',
      phone: '+998 90 765 43 21'
    },
    tech: {
      telegram: '@rashidov_support',
      phone: '+998 71 200 00 00'
    },
    website: 'https://rashidovschool.uz'
  });

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const data = await api.getSupportContacts();
        if (data) {
          setContacts({
            bio: {
              telegram: data.bio?.telegram || '@rashidov_bio_mentor',
              phone: data.bio?.phone || '+998 90 123 45 67'
            },
            chem: {
              telegram: data.chem?.telegram || '@rashidov_chem_mentor',
              phone: data.chem?.phone || '+998 90 765 43 21'
            },
            tech: {
              telegram: data.tech?.telegram || '@rashidov_support',
              phone: data.tech?.phone || '+998 71 200 00 00'
            },
            website: data.website || 'https://rashidovschool.uz'
          });
        }
      } catch (e) {
        console.error('Error loading contacts:', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleChange = (category, field, value) => {
    setContacts(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [field]: value
      }
    }));
    setSuccessMsg(null);
    setErrorMsg(null);
  };

  const handleSave = async (e) => {
    e?.preventDefault();
    if (!isSuperAdmin) {
      setErrorMsg('Faqat Superadmin kontaktlarni o‘zgartirishi mumkin.');
      return;
    }

    setSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const res = await api.saveSupportContacts(contacts);
      if (res.success) {
        setSuccessMsg('Kontaktlar muvaffaqiyatli saqlandi! Barcha o‘quvchilarda darhol yangilanadi.');
        setTimeout(() => setSuccessMsg(null), 4000);
      } else {
        setErrorMsg('Saqlashda xatolik yuz berdi: ' + (res.error || 'Noma‘lum xato'));
      }
    } catch (e) {
      setErrorMsg('Server bilan aloqada xatolik: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      
      {/* Header Banner */}
      <div className="bg-[#121214] border border-white/[0.08] p-6 rounded-3xl relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-40 bg-teal-500/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-400 text-2xl shadow-lg">
              <Headphones className="w-7 h-7 text-teal-400" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-white">Aloqa va yordam sozlamalari</h2>
              <p className="text-xs text-[#8E8E93] mt-0.5">
                O‘quvchilar Profilidagi «Aloqa va yordam» oynasi kontaktlarini tahrirlash
              </p>
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving || loading || !isSuperAdmin}
            className="flex items-center justify-center gap-2 bg-[#007AFF] hover:bg-blue-600 disabled:opacity-50 text-white font-bold text-xs px-5 py-3 rounded-2xl shadow-lg shadow-blue-500/25 active:scale-95 transition-all cursor-pointer"
          >
            {saving ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>{saving ? 'Saqlanmoqda...' : 'O‘zgarishlarni saqlash'}</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-3 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-semibold flex items-center gap-3 animate-in fade-in">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main 3 Sections Form */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* 1. Biologiya */}
        <div className="bg-[#161618] border border-white/[0.06] rounded-3xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl p-2.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center">
                🧬
              </span>
              <div>
                <h3 className="text-white font-bold text-sm">Biologiya mentori</h3>
                <span className="text-[11px] text-[#8E8E93]">Darslar va biologiya testlari</span>
              </div>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="text-[11px] font-bold text-[#8E8E93] mb-1.5 flex items-center gap-1.5">
                  <Send className="w-3.5 h-3.5 text-sky-400" />
                  <span>Telegram manzil yoki link:</span>
                </label>
                <input
                  type="text"
                  value={contacts.bio.telegram}
                  onChange={(e) => handleChange('bio', 'telegram', e.target.value)}
                  placeholder="@rashidov_bio_mentor"
                  className="w-full bg-[#202023] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-[#636366] focus:border-[#007AFF] outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#8E8E93] mb-1.5 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Telefon raqam:</span>
                </label>
                <input
                  type="text"
                  value={contacts.bio.phone}
                  onChange={(e) => handleChange('bio', 'phone', e.target.value)}
                  placeholder="+998 90 123 45 67"
                  className="w-full bg-[#202023] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-[#636366] focus:border-[#007AFF] outline-none"
                />
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/5 text-[10px] text-emerald-400/80 font-medium">
            ✓ Biologiya savollari uchun ajratilgan
          </div>
        </div>

        {/* 2. Kimyo */}
        <div className="bg-[#161618] border border-white/[0.06] rounded-3xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl p-2.5 rounded-2xl bg-purple-500/15 border border-purple-500/25 flex items-center justify-center">
                🧪
              </span>
              <div>
                <h3 className="text-white font-bold text-sm">Kimyo mentori</h3>
                <span className="text-[11px] text-[#8E8E93]">Masalalar va kimyo testlari</span>
              </div>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="text-[11px] font-bold text-[#8E8E93] mb-1.5 flex items-center gap-1.5">
                  <Send className="w-3.5 h-3.5 text-sky-400" />
                  <span>Telegram manzil yoki link:</span>
                </label>
                <input
                  type="text"
                  value={contacts.chem.telegram}
                  onChange={(e) => handleChange('chem', 'telegram', e.target.value)}
                  placeholder="@rashidov_chem_mentor"
                  className="w-full bg-[#202023] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-[#636366] focus:border-[#007AFF] outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#8E8E93] mb-1.5 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Telefon raqam:</span>
                </label>
                <input
                  type="text"
                  value={contacts.chem.phone}
                  onChange={(e) => handleChange('chem', 'phone', e.target.value)}
                  placeholder="+998 90 765 43 21"
                  className="w-full bg-[#202023] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-[#636366] focus:border-[#007AFF] outline-none"
                />
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/5 text-[10px] text-purple-400/80 font-medium">
            ✓ Kimyo savollari uchun ajratilgan
          </div>
        </div>

        {/* 3. Texnik yordam */}
        <div className="bg-[#161618] border border-white/[0.06] rounded-3xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl p-2.5 rounded-2xl bg-blue-500/15 border border-blue-500/25 flex items-center justify-center">
                ⚙️
              </span>
              <div>
                <h3 className="text-white font-bold text-sm">Texnik yordam</h3>
                <span className="text-[11px] text-[#8E8E93]">To‘lovlar, hisob va ilova xatoliklari</span>
              </div>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="text-[11px] font-bold text-[#8E8E93] mb-1.5 flex items-center gap-1.5">
                  <Send className="w-3.5 h-3.5 text-sky-400" />
                  <span>Telegram manzil yoki link:</span>
                </label>
                <input
                  type="text"
                  value={contacts.tech.telegram}
                  onChange={(e) => handleChange('tech', 'telegram', e.target.value)}
                  placeholder="@rashidov_support"
                  className="w-full bg-[#202023] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-[#636366] focus:border-[#007AFF] outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#8E8E93] mb-1.5 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Telefon raqam:</span>
                </label>
                <input
                  type="text"
                  value={contacts.tech.phone}
                  onChange={(e) => handleChange('tech', 'phone', e.target.value)}
                  placeholder="+998 71 200 00 00"
                  className="w-full bg-[#202023] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-[#636366] focus:border-[#007AFF] outline-none"
                />
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/5 text-[10px] text-blue-400/80 font-medium">
            ✓ Texnik qo‘llab-quvvatlash uchun ajratilgan
          </div>
        </div>

        {/* Card 4: Rasmiy veb-sayt (Official Website) */}
        <div className="bg-[#1C1C1E] border border-white/5 rounded-3xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 font-bold">
                  <Globe className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white">Rasmiy veb-sayt</h4>
                  <span className="text-[11px] text-[#8E8E93]">Profil bo‘limidagi «Rasmiy sayt» havolasi</span>
                </div>
              </div>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-400 border border-purple-500/20">
                Web
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-[#8E8E93] mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-purple-400" />
                    <span>Sayt manzili (URL):</span>
                  </span>
                  {contacts.website && (
                    <a
                      href={contacts.website.startsWith('http') ? contacts.website : `https://${contacts.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-purple-400 hover:text-purple-300 flex items-center gap-1"
                    >
                      <span>Saytni ochish</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </label>
                <input
                  type="url"
                  value={contacts.website || ''}
                  onChange={(e) => setContacts(prev => ({ ...prev, website: e.target.value }))}
                  placeholder="https://rashidovschool.uz"
                  className="w-full bg-[#202023] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-[#636366] focus:border-[#007AFF] outline-none"
                />
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/5 text-[10px] text-purple-400/80 font-medium">
            ✓ O‘quvchilar profilida «Rasmiy sayt» tugmasi bosilganda ushbu manzil ochiladi
          </div>
        </div>

      </div>

      {/* Save Button Bottom Bar */}
      <div className="flex justify-end pt-2">
        <button
          onClick={handleSave}
          disabled={saving || loading || !isSuperAdmin}
          className="w-full md:w-auto flex items-center justify-center gap-2 bg-[#007AFF] hover:bg-blue-600 disabled:opacity-50 text-white font-bold text-sm px-8 py-3.5 rounded-2xl shadow-lg shadow-blue-500/25 active:scale-95 transition-all cursor-pointer"
        >
          {saving ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          <span>{saving ? 'Saqlanmoqda...' : 'Barcha o‘zgarishlarni saqlash'}</span>
        </button>
      </div>

    </div>
  );
}
