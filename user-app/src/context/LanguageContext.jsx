import React, { createContext, useContext, useState, useEffect } from 'react';

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
    streak_tooltip: 'Har kuni dars ko‘ring va test ishlang! Strikingiz qancha ko‘p bo‘lsa, shuncha ko‘p bonus Neyronlar beriladi.',
    
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
    streak_tooltip: 'Занимайтесь каждый день! Чем дольше ударный режим, тем больше бонусных Нейронов.',
    
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
    
    // Common
    orqaga: 'Назад',
    yopish: 'Закрыть',
    saqlash: 'Сохранить',
    amalga_oshirildi: 'Успешно!'
  }
};

const LanguageContext = createContext();

export function LanguageProvider({ children, initialLang = 'uz' }) {
  const [lang, setLang] = useState(() => {
    return localStorage.getItem('rb_lang') || initialLang || 'uz';
  });

  useEffect(() => {
    localStorage.setItem('rb_lang', lang);
  }, [lang]);

  const t = (key) => {
    return translations[lang]?.[key] || translations.uz?.[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
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
