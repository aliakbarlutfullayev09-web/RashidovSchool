import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { updateUserProfile } from '../api/supabase';

const translations = {
  uz: {
    // Navigation
    darslar: 'Darslar',
    testlar: 'Testlar',
    reyting: 'Reyting',
    profil: 'Profil',
    tahlil: 'Tahlil',
    sozlamalar: 'Sozlamalar',
    
    // Header & Stats
    kun: 'kun',
    neyron: 'Neyron',
    rashidov_school: 'Rashidov School',
    darslar_kutubxonasi: 'Video darslar kutubxonasi',
    streak_tooltip: 'Har kuni dars ko‘ring va test ishlang! Strikingizni saqlab qolish uchun muntazam shug‘ullaning.',
    
    // Subjects
    biologiya: 'Biologiya',
    kimyo: 'Kimyo',
    matematika: 'Matematika',
    
    // Filters & Search
    barcha_mavzular: 'Barchasi',
    korilmagan: 'Ko‘rilmagan',
    davom_ettirish: 'Davom etish',
    saqlangan: 'Saqlangan',
    qidiruv_placeholder: 'Mavzu yoki dars nomini qidiring...',
    qidiruv_topilmadi: 'Ushbu so‘rov bo‘yicha hech qanday dars topilmadi',
    qidiruv_topilmadi_desc: 'Boshqa so‘z bilan qidirib ko‘ring yoki barcha mavzularni ko‘ring',
    qidiruvni_tozalash: 'Qidiruvni tozalash',
    bosh_darslar: 'Ushbu fanda hozircha darslar mavjud emas',
    
    // Lessons & Cards
    dars: 'Dars',
    bepul: 'Bepul',
    topshirildi: 'Topshirildi',
    korildi: 'ko‘rildi',
    savol: 'savol',
    daqiqa: 'daqiqa',
    videoni_korish: 'Videoni ko‘rish',
    
    // Player & Glossary
    dars_terminlari: 'Dars terminlari',
    terminlar_bosh: 'Ushbu dars uchun terminlar lug‘ati hali kiritilmagan.',
    seek_blocked_notice: 'Oldinga faqat ko‘rilgan daqiqagacha o‘tkazish mumkin',
    term_seek_blocked: 'Ushbu termin video davomida tushuntiriladi. Unga o‘tish uchun darsni ko‘ring.',
    orqaga_qaytish: 'Orqaga',
    qayta_korish: 'Qayta ko‘rish',
    
    // Settings translations
    mavzu_sarlavha: 'Ko‘rinish mavzusi',
    mavzu_qorongu: 'Qorong‘i',
    mavzu_yorug: 'Yorug‘',
    mavzu_tizim: 'Tizim',
    til_sarlavha: 'Ilova tili',
    ovoz_sarlavha: 'Ovoz effektlari',
    ovoz_izoh: 'Tugmalar, test va g‘alaba tovushlari',
    vibratsiya_sarlavha: 'Vibratsiya',
    vibratsiya_izoh: 'Bosish paytidagi taktil tebranish',
    push_sarlavha: 'Push-bildirishnomalar',
    push_izoh: 'Dars eslatmalari va yangi testlar',
    sinab_korish: 'Ovoz va vibratsiyani tekshirish',
    sinov_matni: 'Tugmani bosing va tekshiring',

    // Common
    orqaga: 'Orqaga',
    yopish: 'Yopish',
    saqlash: 'Saqlash',
    amalga_oshirildi: 'Muvaffaqiyatli!'
  },
  ru: {
    // Navigation
    darslar: 'Уроки',
    testlar: 'Тесты',
    reyting: 'Рейтинг',
    profil: 'Профиль',
    tahlil: 'Анализ',
    sozlamalar: 'Настройки',
    
    // Header & Stats
    kun: 'дней',
    neyron: 'Нейронов',
    rashidov_school: 'Rashidov School',
    darslar_kutubxonasi: 'Библиотека видеоуроков',
    streak_tooltip: 'Занимайтесь каждый день! Проходите уроки и тесты, чтобы поддерживать серию.',
    
    // Subjects
    biologiya: 'Биология',
    kimyo: 'Химия',
    matematika: 'Математика',
    
    // Filters & Search
    barcha_mavzular: 'Все темы',
    korilmagan: 'Не смотрел',
    davom_ettirish: 'Продолжить',
    saqlangan: 'Сохранённые',
    qidiruv_placeholder: 'Поиск темы или урока...',
    qidiruv_topilmadi: 'По вашему запросу ничего не найдено',
    qidiruv_topilmadi_desc: 'Попробуйте изменить формулировку или сбросьте фильтр',
    qidiruvni_tozalash: 'Сбросить поиск',
    bosh_darslar: 'В этом предмете пока нет уроков',
    
    // Lessons & Cards
    dars: 'Урок',
    bepul: 'Бесплатно',
    topshirildi: 'Пройдено',
    korildi: 'просмотров',
    savol: 'вопросов',
    daqiqa: 'минут',
    videoni_korish: 'Смотреть видео',
    
    // Player & Glossary
    dars_terminlari: 'Термины урока',
    terminlar_bosh: 'Словарь терминов для этого урока пока не заполнен.',
    seek_blocked_notice: 'Перемотка вперед доступна только до подтвержденной точки просмотра',
    term_seek_blocked: 'Этот термин объясняется далее. Посмотрите видео, чтобы перейти к нему.',
    orqaga_qaytish: 'Назад',
    qayta_korish: 'Смотреть снова',
    
    // Settings translations
    mavzu_sarlavha: 'Тема оформления',
    mavzu_qorongu: 'Тёмная',
    mavzu_yorug: 'Светлая',
    mavzu_tizim: 'Системная',
    til_sarlavha: 'Язык приложения',
    ovoz_sarlavha: 'Звуковые эффекты',
    ovoz_izoh: 'Звуки кнопок, тестов и наград',
    vibratsiya_sarlavha: 'Вибрация',
    vibratsiya_izoh: 'Тактильный отклик при нажатиях',
    push_sarlavha: 'Push-уведомления',
    push_izoh: 'Напоминания об уроках и новые тесты',
    sinab_korish: 'Проверить звук и вибрацию',
    sinov_matni: 'Нажмите для проверки',

    // Common
    orqaga: 'Назад',
    yopish: 'Закрыть',
    saqlash: 'Сохранить',
    amalga_oshirildi: 'Успешно!'
  }
};

const LanguageContext = createContext();

export function LanguageProvider({ children, initialLang = 'uz' }) {
  const [lang, setLangState] = useState(() => {
    const saved = localStorage.getItem('rb_lang');
    return saved === 'ru' || saved === 'uz' ? saved : (initialLang === 'ru' ? 'ru' : 'uz');
  });
  const [syncUserId, setSyncUserId] = useState(null);

  useEffect(() => {
    localStorage.setItem('rb_lang', lang);
  }, [lang]);

  const syncLanguageFromDb = useCallback((dbLang) => {
    if (dbLang !== 'ru' && dbLang !== 'uz') return;
    setLangState(prev => (prev === dbLang ? prev : dbLang));
    try {
      localStorage.setItem('rb_lang', dbLang);
    } catch {}
  }, []);

  const setLang = useCallback((nextLang) => {
    const normalized = nextLang === 'ru' ? 'ru' : 'uz';
    setLangState(normalized);
    try {
      localStorage.setItem('rb_lang', normalized);
    } catch {}
    if (syncUserId) {
      updateUserProfile(syncUserId, { language: normalized }).catch(() => {});
    }
  }, [syncUserId]);

  const t = (key) => {
    return translations[lang]?.[key] || translations.uz?.[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, setSyncUserId, syncLanguageFromDb, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
