export function formatDurationLabel(totalMinutes, lang = 'uz') {
  const mins = Math.max(1, parseInt(totalMinutes, 10) || 100);
  if (lang === 'ru') {
    if (mins <= 60) return `${mins} мин`;
    const hours = Math.floor(mins / 60);
    const remMins = mins % 60;
    return remMins > 0 ? `${hours} ч ${remMins} мин` : `${hours} ч`;
  }
  if (mins <= 60) return `${mins} daq`;
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  return remMins > 0 ? `${hours} soat ${remMins} daq` : `${hours} soat`;
}

export function localizeDifficulty(difficulty, lang = 'uz') {
  if (lang !== 'ru') return difficulty;
  const map = {
    "O'rta": 'Средний',
    Yuqori: 'Высокий',
    Ekspert: 'Эксперт',
    Murakkab: 'Сложный'
  };
  return map[difficulty] || difficulty;
}

const VARIANT_RU_TRANSLATIONS = {
  'bio-dtm-1': {
    badge: 'Начальный',
    title: 'Вариант 1: Официальная диагностика ДТМ (Стандарт 2024)',
    description: 'Вопросы по цитологии, ботанике, физиологии и основным биологическим закономерностям.'
  },
  'bio-dtm-2': {
    badge: 'Уровень гранта',
    title: 'Вариант 2: Отборочный и углублённый ДТМ',
    description: 'Логические вопросы, задачи по генетике и анализ тканей.'
  },
  'bio-dtm-3': {
    badge: 'Эксперт',
    title: 'Вариант 3: Фокус на генетике и молекулярной биологии',
    description: 'Транскрипция, трансляция и генетические расчёты по новому стандарту ДТМ.'
  },
  'bio-cert-1': {
    badge: 'Уровень A+',
    title: 'Национальный сертификат: Диагностика 1-го этапа (A+ / A)',
    description: 'Теоретические вопросы, задания на соответствие и генетические задачи по официальному стандарту.'
  },
  'bio-cert-2': {
    badge: 'Олимпиада / A+',
    title: 'Национальный сертификат: Логический и задачный вариант',
    description: 'Сборник сложных расчётных задач по генетике и цитологии, включая открытые вопросы.'
  },
  'chem-dtm-1': {
    badge: 'Стандарт ДТМ',
    title: 'Вариант 1: Официальный ДТМ по химии (Неорганика и органика)',
    description: 'Периодическая система, химическая связь, окислительно-восстановительные реакции и классы органики.'
  },
  'chem-dtm-2': {
    badge: 'Уровень гранта',
    title: 'Вариант 2: Задачи и реакции ДТМ по химии',
    description: 'Углублённые задачи на концентрацию растворов и органические реакции.'
  },
  'chem-cert-1': {
    badge: 'Уровень A+',
    title: 'Национальный сертификат: Химия — теория и практика',
    description: 'Тесты по химической кинетике, равновесию и сложным расчётным задачам.'
  },
  'math-dtm-1': {
    badge: 'Стандарт ДТМ',
    title: 'Вариант 1: Официальный ДТМ по математике (Алгебра и геометрия)',
    description: 'Функции, квадратные уравнения, тригонометрия и задачи по планиметрии.'
  },
  'math-dtm-2': {
    badge: 'Уровень гранта',
    title: 'Вариант 2: Комбинаторика и параметры в математике',
    description: 'Сложные параметрические уравнения, логарифмы и интегралы.'
  },
  'math-cert-1': {
    badge: 'Уровень A+',
    title: 'Национальный сертификат: Углублённая математика',
    description: 'Теоретические и практические задания повышенной сложности по стандарту сертификата.'
  }
};

const BADGE_RU_MAP = {
  "Boshlang'ich": 'Начальный',
  'Grant darajasi': 'Уровень гранта',
  Ekspert: 'Эксперт',
  'A+ Daraja': 'Уровень A+',
  'Olimpiada / A+': 'Олимпиада / A+',
  'Standart DTM': 'Стандарт ДТМ'
};

export function localizeVariant(variant, lang = 'uz') {
  if (!variant || lang !== 'ru') return variant;
  const preset = VARIANT_RU_TRANSLATIONS[variant.id];
  const explicitEmptyBadge = variant.badge !== undefined && String(variant.badge).trim() === '';
  const mappedBadge = explicitEmptyBadge
    ? ''
    : (BADGE_RU_MAP[variant.badge] || variant.badge || preset?.badge || '');
  let localizedTitle = preset?.title || variant.title;
  if (!preset?.title && typeof variant.title === 'string') {
    localizedTitle = variant.title.replace(/^(\d+)\s*-\s*Variant\b/i, 'Вариант $1');
  }
  return {
    ...variant,
    badge: mappedBadge,
    title: localizedTitle,
    description: preset?.description || variant.description
  };
}

export function localizeModeConfig(modeKey, modeCfg, lang = 'uz') {
  if (!modeCfg || lang !== 'ru') return modeCfg;
  const isCert = modeKey === 'sertifikat';
  const def = DEFAULT_MODE_SETTINGS[modeKey] || {};
  return {
    ...modeCfg,
    badge: modeCfg.badge === def.badge
      ? (isCert ? 'Гос. образовательный стандарт' : 'Государственный центр тестирования (ГЦТ)')
      : modeCfg.badge,
    title: modeCfg.title === def.title
      ? (isCert ? 'Национальный сертификат' : 'ДТМ Мок-тест')
      : modeCfg.title,
    description: modeCfg.description === def.description
      ? (isCert
          ? 'Многоуровневая углублённая система оценки с присвоением уровней A+, A, B+, B.'
          : 'Диагностика по официальному стандарту вступительных экзаменов в вузы.')
      : modeCfg.description,
    features: (modeCfg.features || []).map((feat) => {
      if (feat === "A+ dan C gacha bo'lgan rasmiy darajani aniqlash") {
        return 'Определение официального уровня от A+ до C';
      }
      if (feat === "Mantiqiy yechimlar va chuqur tahliliy ko'rsatmalar") {
        return 'Логические решения и подробные аналитические разборы';
      }
      if (feat === "Har bir to'g'ri javob uchun 3.1 ball") {
        return 'За каждый правильный ответ — 3.1 балла';
      }
      if (feat === 'Anti-cheat nazorati va vaqt taymeri') {
        return 'Контроль анти-чит и таймер экзамена';
      }
      return feat;
    })
  };
}

export function normalizeSubjectKey(subjectOrKey) {
  if (!subjectOrKey) return 'biologiya';
  if (typeof subjectOrKey === 'string') {
    const low = subjectOrKey.toLowerCase();
    if (low.includes('bio') || low.includes('био')) return 'biologiya';
    if (low.includes('kim') || low.includes('хим')) return 'kimyo';
    if (low.includes('mat') || low.includes('мат')) return 'matematika';
    return low.trim() || 'biologiya';
  }
  const norm = (subjectOrKey.key || subjectOrKey.name || '').toString().toLowerCase();
  if (norm.includes('bio') || norm.includes('био') || subjectOrKey.id === 1) return 'biologiya';
  if (norm.includes('kim') || norm.includes('хим') || subjectOrKey.id === 2) return 'kimyo';
  if (norm.includes('mat') || norm.includes('мат') || subjectOrKey.id === 3) return 'matematika';
  return norm.replace(/\s+/g, '-') || `subject-${subjectOrKey.id || 'custom'}`;
}

export const DEFAULT_MODE_SETTINGS = {
  sertifikat: {
    enabled: true,
    badge: "Davlat Ta'lim Standarti",
    title: "Milliy Sertifikat",
    description: "A+, A, B+, B darajalarini taqdim etuvchi ko'p bosqichli chuqurlashtirilgan baholash tizimi.",
    questionCount: 40,
    durationMinutes: 100,
    maxScore: 75,
    features: [
      "A+ dan C gacha bo'lgan rasmiy darajani aniqlash",
      "Mantiqiy yechimlar va chuqur tahliliy ko'rsatmalar"
    ]
  },
  dtm: {
    enabled: true,
    badge: "Davlat Test Markazi (DTM)",
    title: "DTM Mock Test",
    description: "Oliy ta'lim muassasalariga kirish imtihonlari rasmiy standarti bo'yicha diagnostika.",
    questionCount: 30,
    durationMinutes: 60,
    maxScore: 93,
    features: [
      "Har bir to'g'ri javob uchun 3.1 ball",
      "Anti-cheat nazorati va vaqt taymeri"
    ]
  }
};

export function createSubjectSkeleton(subjectKey, subjectTitle = 'Fan') {
  return {
    teacher: {
      name: "Ustoz Rashidov",
      subjectTitle,
      role: `${subjectTitle} fani o'qituvchisi`,
      experience: "8 yillik pedagogik tajriba",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80",
      badge: "Milliy Sertifikat eksperti",
      note: `Ushbu bo'limdagi barcha variantlar va savollar ${subjectTitle} fani bo'yicha Milliy sertifikat dasturi talablari asosida tuzilgan.`
    },
    modes: {
      sertifikat: { ...DEFAULT_MODE_SETTINGS.sertifikat, features: [...DEFAULT_MODE_SETTINGS.sertifikat.features] },
      dtm: { ...DEFAULT_MODE_SETTINGS.dtm, features: [...DEFAULT_MODE_SETTINGS.dtm.features] }
    },
    dtm: [],
    sertifikat: []
  };
}

export const DEFAULT_EXAM_PORTAL_DATA = {
  version: 1,
  subjects: {
    biologiya: {
      teacher: {
        name: "Ustoz Rashidov",
        subjectTitle: "Biologiya",
        role: "Biologiya fani bosh o'qituvchisi",
        experience: "8 yillik pedagogik tajriba",
        avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80",
        badge: "Milliy Sertifikat eksperti",
        note: "Ushbu bo'limdagi barcha variantlar va savollar Milliy sertifikat dasturi talablari asosida shaxsan tuzilgan va tekshirilgan."
      },
      modes: {
        sertifikat: { ...DEFAULT_MODE_SETTINGS.sertifikat, features: [...DEFAULT_MODE_SETTINGS.sertifikat.features] },
        dtm: { ...DEFAULT_MODE_SETTINGS.dtm, features: [...DEFAULT_MODE_SETTINGS.dtm.features] }
      },
      dtm: [
        {
          id: 'bio-dtm-1',
          title: "1-Variant: Rasmiy DTM Diagnostika (Standart 2024)",
          badge: "Boshlang'ich",
          badgeColor: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
          questionCount: 30,
          durationMinutes: 60,
          maxScore: 93.0,
          difficulty: "O'rta",
          difficultyColor: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
          description: "Sitologiya, botanika, fiziologiya va asosiy biologik qonuniyatlar bo'yicha savollar.",
          questions: []
        },
        {
          id: 'bio-dtm-2',
          title: "2-Variant: DTM Saralash & Chuqurlashtirilgan",
          badge: "Grant darajasi",
          badgeColor: "bg-purple-500/15 text-purple-400 border-purple-500/30",
          questionCount: 30,
          durationMinutes: 60,
          maxScore: 93.0,
          difficulty: "Yuqori",
          difficultyColor: "text-purple-400 bg-purple-400/10 border-purple-400/20",
          description: "Mantiqiy savollar, genetik masalalar va to'qimalar tahlili.",
          questions: []
        },
        {
          id: 'bio-dtm-3',
          title: "3-Variant: Genetika va Molekulyar biologiya fokus",
          badge: "Ekspert",
          badgeColor: "bg-blue-500/15 text-blue-400 border-blue-500/30",
          questionCount: 30,
          durationMinutes: 60,
          maxScore: 93.0,
          difficulty: "Murakkab",
          difficultyColor: "text-blue-400 bg-blue-400/10 border-blue-400/20",
          description: "Yangi DTM standarti asosidagi transkripsiya, translatsiya va genetik hisob-kitoblar.",
          questions: []
        }
      ],
      sertifikat: [
        {
          id: 'bio-cert-1',
          title: "Milliy Sertifikat: 1-Bosqich Diagnostika (A+ / A)",
          badge: "A+ Daraja",
          badgeColor: "bg-amber-500/15 text-amber-400 border-amber-500/30",
          questionCount: 40,
          durationMinutes: 100,
          maxScore: 75,
          difficulty: "Yuqori",
          difficultyColor: "text-amber-400 bg-amber-400/10 border-amber-400/20",
          description: "Rasmiy Milliy sertifikat standarti bo'yicha 1-32 test, 33-35 moslashtirish (6 dan 3) va 36-40 yozma masalalar.",
          questions: []
        },
        {
          id: 'bio-cert-2',
          title: "Milliy Sertifikat: Mantiqiy va Masalali Variant",
          badge: "Olimpiada / A+",
          badgeColor: "bg-purple-500/15 text-purple-400 border-purple-500/30",
          questionCount: 40,
          durationMinutes: 100,
          maxScore: 75,
          difficulty: "Ekspert",
          difficultyColor: "text-purple-400 bg-purple-400/10 border-purple-400/20",
          description: "Murakkab genetik va sitologik hisob-kitoblar, ochiq turdagi savollar to'plami.",
          questions: []
        }
      ]
    },
    kimyo: {
      teacher: {
        name: "Ustoz Rashidov",
        subjectTitle: "Kimyo",
        role: "Kimyo fani bosh mutaxassisi",
        experience: "7 yillik amaliy tajriba",
        avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80",
        badge: "Olimpiada va Sertifikat murabbiyi",
        note: "Kimyo fanidan barcha testlar yangilangan milliy ta'lim dasturi asosida reaksiyalar va hisoblash masalalari bilan to'ldirilgan."
      },
      modes: {
        sertifikat: { ...DEFAULT_MODE_SETTINGS.sertifikat, features: [...DEFAULT_MODE_SETTINGS.sertifikat.features] },
        dtm: { ...DEFAULT_MODE_SETTINGS.dtm, features: [...DEFAULT_MODE_SETTINGS.dtm.features] }
      },
      dtm: [
        {
          id: 'chem-dtm-1',
          title: "1-Variant: Rasmiy DTM Kimyo (Anorganik va Organik)",
          badge: "Standart DTM",
          badgeColor: "bg-purple-500/15 text-purple-400 border-purple-500/30",
          questionCount: 30,
          durationMinutes: 60,
          maxScore: 93.0,
          difficulty: "O'rta",
          difficultyColor: "text-purple-400 bg-purple-400/10 border-purple-400/20",
          description: "Davriy sistema, kimyoviy bog'lanish, oksidlanish-qaytarilish va organik sinflar.",
          questions: []
        },
        {
          id: 'chem-dtm-2',
          title: "2-Variant: DTM Kimyo Masalalar & Reaksiyalar",
          badge: "Grant darajasi",
          badgeColor: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
          questionCount: 30,
          durationMinutes: 60,
          maxScore: 93.0,
          difficulty: "Yuqori",
          difficultyColor: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
          description: "Eritmalar konsentratsiyasi va organik reaksiyalarga oid chuqurlashtirilgan masalalar.",
          questions: []
        }
      ],
      sertifikat: [
        {
          id: 'chem-cert-1',
          title: "Milliy Sertifikat: Kimyo Nazariya va Amaliyot",
          badge: "A+ Daraja",
          badgeColor: "bg-amber-500/15 text-amber-400 border-amber-500/30",
          questionCount: 40,
          durationMinutes: 100,
          maxScore: 75,
          difficulty: "Yuqori",
          difficultyColor: "text-amber-400 bg-amber-400/10 border-amber-400/20",
          description: "Kimyoviy kinetika, muvozanat va murakkab hisob-kitoblar testi.",
          questions: []
        }
      ]
    },
    matematika: {
      teacher: {
        name: "Ustoz Rashidov",
        subjectTitle: "Matematika",
        role: "Matematika fani bosh mutaxassisi",
        experience: "9 yillik pedagogik tajriba",
        avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80",
        badge: "Milliy Sertifikat masteri",
        note: "Matematika bo'limida har bir savol Milliy sertifikat qoliplariga to'liq mos keladi. Nazariya va tezkor hisoblash texnikalari jamlangan."
      },
      modes: {
        sertifikat: { ...DEFAULT_MODE_SETTINGS.sertifikat, features: [...DEFAULT_MODE_SETTINGS.sertifikat.features] },
        dtm: { ...DEFAULT_MODE_SETTINGS.dtm, features: [...DEFAULT_MODE_SETTINGS.dtm.features] }
      },
      dtm: [
        {
          id: 'math-dtm-1',
          title: "1-Variant: Rasmiy DTM Matematika (Algebra & Geometriya)",
          badge: "Standart DTM",
          badgeColor: "bg-blue-500/15 text-blue-400 border-blue-500/30",
          questionCount: 30,
          durationMinutes: 60,
          maxScore: 93.0,
          difficulty: "O'rta",
          difficultyColor: "text-blue-400 bg-blue-400/10 border-blue-400/20",
          description: "Funksiyalar, kvadrat tenglamalar, trigonometriya va planimetriya masalalari.",
          questions: []
        },
        {
          id: 'math-dtm-2',
          title: "2-Variant: Matematika Kombinatorika va Parametrlar",
          badge: "Grant darajasi",
          badgeColor: "bg-purple-500/15 text-purple-400 border-purple-500/30",
          questionCount: 30,
          durationMinutes: 60,
          maxScore: 93.0,
          difficulty: "Yuqori",
          difficultyColor: "text-purple-400 bg-purple-400/10 border-purple-400/20",
          description: "Murakkab parametrli tenglamalar, logarifmlar va integrallar.",
          questions: []
        }
      ],
      sertifikat: [
        {
          id: 'math-cert-1',
          title: "Milliy Sertifikat: Matematika Chuqurlashtirilgan",
          badge: "A+ Daraja",
          badgeColor: "bg-amber-500/15 text-amber-400 border-amber-500/30",
          questionCount: 40,
          durationMinutes: 100,
          maxScore: 75,
          difficulty: "Yuqori",
          difficultyColor: "text-amber-400 bg-amber-400/10 border-amber-400/20",
          description: "Milliy sertifikat standarti bo'yicha nazariy va amaliy murakkab masalalar.",
          questions: []
        }
      ]
    }
  }
};

export function mergeExamPortalData(raw, subjectRows = []) {
  const baseSubjects = JSON.parse(JSON.stringify(DEFAULT_EXAM_PORTAL_DATA.subjects));
  const rawSubjects = raw?.subjects || {};
  const mergedSubjects = {};

  // Seed default keys + dynamic subject rows
  const allKeys = new Set(Object.keys(baseSubjects));
  (subjectRows || []).forEach((s) => {
    allKeys.add(normalizeSubjectKey(s));
  });
  Object.keys(rawSubjects).forEach((k) => {
    allKeys.add(k);
  });

  allKeys.forEach((key) => {
    const matchingRow = (subjectRows || []).find((s) => normalizeSubjectKey(s) === key);
    const defaultSub = baseSubjects[key] || createSubjectSkeleton(key, matchingRow?.name || key);
    const savedSub = rawSubjects[key] || {};

    mergedSubjects[key] = {
      teacher: { ...defaultSub.teacher, ...(savedSub.teacher || {}) },
      modes: {
        sertifikat: {
          ...defaultSub.modes.sertifikat,
          ...(savedSub.modes?.sertifikat || {}),
          features: Array.isArray(savedSub.modes?.sertifikat?.features)
            ? savedSub.modes.sertifikat.features
            : defaultSub.modes.sertifikat.features
        },
        dtm: {
          ...defaultSub.modes.dtm,
          ...(savedSub.modes?.dtm || {}),
          features: Array.isArray(savedSub.modes?.dtm?.features)
            ? savedSub.modes.dtm.features
            : defaultSub.modes.dtm.features
        }
      },
      sertifikat: Array.isArray(savedSub.sertifikat) ? savedSub.sertifikat : defaultSub.sertifikat,
      dtm: Array.isArray(savedSub.dtm) ? savedSub.dtm : defaultSub.dtm
    };
  });

  return {
    version: 1,
    subjects: mergedSubjects
  };
}

