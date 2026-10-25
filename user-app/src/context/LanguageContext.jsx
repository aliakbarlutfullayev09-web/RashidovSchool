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
    streak_tooltip: 'Har kuni dars ko‘ring va test ishlang! Strikingiz qancha ko‘p bo‘lsa, shuncha ko‘p bonus Neyronlar beriladi.',
    
    // Tree of Knowledge
    bilim_daraxti: 'Bilim Daraxti',
    urug: 'Urug‘',
    nihol: 'Nihol',
    kochat: 'Ko‘chat',
    gullagan_daraxt: 'Gullagan daraxt',
    donishmand_daraxt: 'Bilim daraxti',
    dars_yakunlandi: 'dars yakunlandi',
    davom_ettirish: 'Darsni davom ettirish',
    
    // Subjects
    biologiya: 'Biologiya',
    kimyo: 'Kimyo',
    matematika: 'Matematika',
    
    // Lessons & Cards
    dars: 'Dars',
    bepul: 'Bepul',
    topshirildi: 'Topshirildi',
    qulflangan: 'Kanalga a‘zo bo‘lish',
    boshlash: 'Boshlash',
    test_savoli: 'ta test savoli',
    korildi: 'ko‘rildi',
    modul_mock: 'Modul Yakuniy Mock Testi',
    savol: 'savol',
    daqiqa: 'daqiqa',
    
    // Top-Up & Shop
    balansni_toldirish: 'Balansni to‘ldirish',
    promo_faollashtirish: 'Promo-kod faollashtirish',
    mening_xatolarim: 'Mening xatolarim — Tahlil',
    rasmiy_kanal: 'Rashidov Biologiya Rasmiy Kanali',
    
    // Testlar Page
    dtm_mock: 'DTM Mock',
    milliy_sertifikat: 'Milliy Sertifikat',
    mavzuli_trenajyor: 'Mavzuli Trenajyor',
    ball: 'ball',
    yakunlash: 'Testni yakunlash',
    natija: 'Natija',
    xatolar_tahlili: 'Xatolar tahlili',
    
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
    streak_tooltip: 'Занимайтесь каждый день! Чем дольше ударный режим, тем больше бонусных Нейронов.',
    
    // Tree of Knowledge
    bilim_daraxti: 'Древо Знаний',
    urug: 'Семя',
    nihol: 'Росток',
    kochat: 'Саженец',
    gullagan_daraxt: 'Цветущее дерево',
    donishmand_daraxt: 'Древо мудрости',
    dars_yakunlandi: 'уроков пройдено',
    davom_ettirish: 'Продолжить обучение',
    
    // Subjects
    biologiya: 'Биология',
    kimyo: 'Химия',
    matematika: 'Математика',
    
    // Lessons & Cards
    dars: 'Урок',
    bepul: 'Бесплатно',
    topshirildi: 'Пройдено',
    qulflangan: 'Подписка на канал',
    boshlash: 'Начать',
    test_savoli: 'вопросов теста',
    korildi: 'просмотров',
    modul_mock: 'Итоговый Мок-тест Модуля',
    savol: 'вопросов',
    daqiqa: 'минут',
    
    // Top-Up & Shop
    balansni_toldirish: 'Пополнить баланс',
    promo_faollashtirish: 'Активировать промокод',
    mening_xatolarim: 'Мои ошибки — Анализ',
    rasmiy_kanal: 'Официальный канал Rashidov Biologiya',
    
    // Testlar Page
    dtm_mock: 'ДТМ Мок',
    milliy_sertifikat: 'Национальный сертификат',
    mavzuli_trenajyor: 'Тренажер по темам',
    ball: 'баллов',
    yakunlash: 'Завершить тест',
    natija: 'Результат',
    xatolar_tahlili: 'Анализ ошибок',
    
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
