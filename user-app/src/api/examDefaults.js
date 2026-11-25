export function formatDurationLabel(totalMinutes) {
  const mins = Math.max(1, parseInt(totalMinutes, 10) || 64);
  if (mins <= 60) return `${mins} daq`;
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  return remMins > 0 ? `${hours} soat ${remMins} daq` : `${hours} soat`;
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
    durationMinutes: 64,
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
          questions: [
            {
              id: 1,
              type: 'choice',
              text: "Qaysi organoid eukariot hujayralarda ATF sintezlovchi asosiy energiya stansiyasi hisoblanadi?",
              options: ["Ribosoma", "Mitoxondriya", "Lizosoma", "Golji majmuasi"],
              correctIndex: 1,
              textbookRef: "9-sinf Biologiya, 2-bob, §9, 36-bet"
            },
            {
              id: 2,
              type: 'image',
              text: "Rasmda tasvirlangan mitoz fazasini aniqlang (xromosomalar ekvator tekisligida joylashgan):",
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
            },
            {
              id: 4,
              type: 'choice',
              text: "Fotosintez jarayonining yorug'lik fazasida suvning fotolizidan qanday gaz ajralib chiqadi?",
              options: ["Kislorod (O2)", "Karbonat angidrid (CO2)", "Vodorod (H2)", "Azot (N2)"],
              correctIndex: 0,
              textbookRef: "10-sinf Biologiya, 2-bob, §7, 29-bet"
            },
            {
              id: 5,
              type: 'choice',
              text: "Odamda katta qon aylanish doirasi yurakning qaysi kamerasidan boshlanadi?",
              options: ["O'ng bo'lmacha", "O'ng qorincha", "Chap bo'lmacha", "Chap qorincha"],
              correctIndex: 3,
              textbookRef: "8-sinf Odam va uning salomatligi, §22, 85-bet"
            }
          ]
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
          questions: [
            {
              id: 1,
              type: 'choice',
              text: "Diduragay chatishtirishda F2 avlodda fenotip bo'yicha ajralish nisbati qanday bo'ladi?",
              options: ["3:1", "9:3:3:1", "1:2:1", "1:1:1:1"],
              correctIndex: 1,
              textbookRef: "10-sinf Biologiya, Genetika asoslari, §12, 54-bet"
            },
            {
              id: 2,
              type: 'input',
              text: "DNK fragmentidagi adenin (A) soni 300 ta bo'lsa, timin (T) soni nechta bo'ladi?",
              correctAnswer: "300",
              textbookRef: "9-sinf Biologiya, Nuklein kislotalar, §10, 42-bet"
            },
            {
              id: 3,
              type: 'choice',
              text: "O'simliklarda suv va mineral moddalarni ildizdan barglarga o'tkazuvchi to'qima qaysi?",
              options: ["Floema (elaksimon naylar)", "Ksilema (naylar)", "Kambiy", "Periderma"],
              correctIndex: 1,
              textbookRef: "6-sinf Botanika, O'tkazuvchi to'qimalar, §8, 31-bet"
            }
          ]
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
          questions: [
            {
              id: 1,
              type: 'choice',
              text: "Translatsiya jarayoni hujayraning qaysi qismida amalga oshadi?",
              options: ["Lizosomada", "Ribosomada", "Vakuolada", "Sentrosomada"],
              correctIndex: 1,
              textbookRef: "10-sinf Biologiya, Oqsil biosintezi, §14, 58-bet"
            },
            {
              id: 2,
              type: 'input',
              text: "Gomologik xromosomalarning o'zaro qismlari bilan almashinish jarayoni nima deb ataladi?",
              correctAnswer: "Krossingover",
              textbookRef: "10-sinf Biologiya, Meyoz va irsiyat, §16, 68-bet"
            }
          ]
        }
      ],
      sertifikat: [
        {
          id: 'bio-cert-1',
          title: "Milliy Sertifikat: 1-Bosqich Diagnostika (A+ / A)",
          badge: "A+ Daraja",
          badgeColor: "bg-amber-500/15 text-amber-400 border-amber-500/30",
          questionCount: 40,
          durationMinutes: 64,
          maxScore: 75,
          difficulty: "Yuqori",
          difficultyColor: "text-amber-400 bg-amber-400/10 border-amber-400/20",
          description: "Rasmiy Milliy sertifikat standarti bo'yicha nazariy savollar, moslashtirish va genetik masalalar.",
          questions: [
            {
              id: 1,
              type: 'choice',
              text: "Odamning qon guruhlari qaysi genetik hodisaga misol bo'ladi?",
              options: ["Noto'liq dominantlik", "Kodominantlik", "Polimeriya", "Komplementarlik"],
              correctIndex: 1,
              textbookRef: "10-sinf Biologiya, Genlarning o'zaro ta'siri, §18, 76-bet"
            },
            {
              id: 2,
              type: 'input',
              text: "Tinch holatda odamda 1 minutda yurak o'rtacha necha marta uradi (puls normasi)?",
              correctAnswer: "70",
              textbookRef: "8-sinf Fiziologiya, Qon aylanish, §23, 90-bet"
            },
            {
              id: 3,
              type: 'choice',
              text: "Fotosintezning qorong'ulik bosqichida qaysi biokimyoviy sikl amalga oshadi?",
              options: ["Krebs sikli", "Kalvin sikli", "Glikoliz", "Kori sikli"],
              correctIndex: 1,
              textbookRef: "10-sinf Biologiya, Plastik almashinuv, §8, 33-bet"
            }
          ]
        },
        {
          id: 'bio-cert-2',
          title: "Milliy Sertifikat: Mantiqiy va Masalali Variant",
          badge: "Olimpiada / A+",
          badgeColor: "bg-purple-500/15 text-purple-400 border-purple-500/30",
          questionCount: 40,
          durationMinutes: 64,
          maxScore: 75,
          difficulty: "Ekspert",
          difficultyColor: "text-purple-400 bg-purple-400/10 border-purple-400/20",
          description: "Murakkab genetik va sitologik hisob-kitoblar, ochiq turdagi savollar to'plami.",
          questions: [
            {
              id: 1,
              type: 'choice',
              text: "Mitoxondriya kristalarida qaysi jarayon kechadi?",
              options: ["Oksidlanishli fosforillanish", "Glikoliz", "Transkripsiya", "Replikatsiya"],
              correctIndex: 0,
              textbookRef: "9-sinf Biologiya, Hujayraning energetik almashinuvi, §10, 39-bet"
            }
          ]
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
          questions: [
            {
              id: 1,
              type: 'choice',
              text: "Davriy sistemada atom radiusi bir davr bo'yicha chapdan o'ngga qanday o'zgaradi?",
              options: ["Kattalashadi", "Kichiklashadi", "O'zgarmaydi", "Avval ortadi, so'ng kamayadi"],
              correctIndex: 1,
              textbookRef: "8-sinf Kimyo, Davriy qonun va sistema, §7, 28-bet"
            },
            {
              id: 2,
              type: 'input',
              text: "Suv (H2O) molekulasining nisbiy molekulyar massasini (Mr) toping:",
              correctAnswer: "18",
              textbookRef: "7-sinf Kimyo, Molekulyar massa hisoblash, §12, 45-bet"
            },
            {
              id: 3,
              type: 'choice',
              text: "Normal sharoitda 1 mol har qanday gaz qanday hajmni egallaydi?",
              options: ["11.2 l", "22.4 l", "44.8 l", "2.24 l"],
              correctIndex: 1,
              textbookRef: "8-sinf Kimyo, Avogadro qonuni va gazlar molar hajmi, §15, 60-bet"
            },
            {
              id: 4,
              type: 'choice',
              text: "KMnO4 birikmasida marganes (Mn) ning oksidlanish darajasini aniqlang:",
              options: ["+2", "+4", "+6", "+7"],
              correctIndex: 3,
              textbookRef: "8-sinf Kimyo, Oksidlanish darajalari, §25, 96-bet"
            }
          ]
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
          questions: [
            {
              id: 1,
              type: 'choice',
              text: "Qaysi modda kuchli elektrolit hisoblanadi?",
              options: ["H2SO4", "H2CO3", "H2S", "CH3COOH"],
              correctIndex: 0,
              textbookRef: "9-sinf Kimyo, Elektrolitik dissotsiatsiya, §11, 44-bet"
            },
            {
              id: 2,
              type: 'input',
              text: "Osh tuzi (NaCl) ning nisbiy molekulyar massasini butun son sifatida yozing (Na=23, Cl=35.5):",
              correctAnswer: "58.5",
              textbookRef: "7-sinf Kimyo, Kimyoviy formulalar, §14, 52-bet"
            }
          ]
        }
      ],
      sertifikat: [
        {
          id: 'chem-cert-1',
          title: "Milliy Sertifikat: Kimyo Nazariya va Amaliyot",
          badge: "A+ Daraja",
          badgeColor: "bg-amber-500/15 text-amber-400 border-amber-500/30",
          questionCount: 40,
          durationMinutes: 64,
          maxScore: 75,
          difficulty: "Yuqori",
          difficultyColor: "text-amber-400 bg-amber-400/10 border-amber-400/20",
          description: "Kimyoviy kinetika, muvozanat va murakkab hisob-kitoblar testi.",
          questions: [
            {
              id: 1,
              type: 'choice',
              text: "Ekzotermik reaksiyalarda harorat oshirilganda kimyoviy muvozanat qaysi tomonga siljiydi?",
              options: ["O'ng tomonga", "Chap tomonga", "Siljimaydi", "Tezlik pasayadi"],
              correctIndex: 1,
              textbookRef: "9-sinf Kimyo, Kimyoviy muvozanat va Le Shatelye prinsipi, §19, 74-bet"
            }
          ]
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
          questions: [
            {
              id: 1,
              type: 'choice',
              text: "Agar kvadrat tenglamada diskriminant D > 0 bo'lsa, tenglama nechta haqiqiy ildizga ega?",
              options: ["Ildizi yo'q", "1 ta ildiz", "2 ta turli ildiz", "Cheksiz ko'p"],
              correctIndex: 2,
              textbookRef: "8-sinf Algebra, Kvadrat tenglamalar va diskriminant, §14, 56-bet"
            },
            {
              id: 2,
              type: 'input',
              text: "To'g'ri burchakli uchburchakning katetlari 3 va 4 bo'lsa, gipotenuzasini toping:",
              correctAnswer: "5",
              textbookRef: "8-sinf Geometriya, Pifagor teoremasi, §18, 72-bet"
            },
            {
              id: 3,
              type: 'choice',
              text: "y = x^3 funksiyaning hosilasi y' nimaga teng?",
              options: ["3x", "3x^2", "x^2", "3x^3"],
              correctIndex: 1,
              textbookRef: "11-sinf Algebra, Hosila va uning tatbiqlari, §5, 24-bet"
            },
            {
              id: 4,
              type: 'choice',
              text: "sin^2(a) + cos^2(a) ifodaning qiymati nimaga teng?",
              options: ["0", "1", "2", "tg(a)"],
              correctIndex: 1,
              textbookRef: "9-sinf Geometriya / 10-sinf Algebra, Asosiy trigonometrik ayniyat, §9, 38-bet"
            }
          ]
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
          questions: [
            {
              id: 1,
              type: 'input',
              text: "log2(16) ifodaning qiymatini toping:",
              correctAnswer: "4",
              textbookRef: "10-sinf Algebra, Logarifm tushunchasi va xossalari, §22, 92-bet"
            }
          ]
        }
      ],
      sertifikat: [
        {
          id: 'math-cert-1',
          title: "Milliy Sertifikat: Matematika Chuqurlashtirilgan",
          badge: "A+ Daraja",
          badgeColor: "bg-amber-500/15 text-amber-400 border-amber-500/30",
          questionCount: 40,
          durationMinutes: 64,
          maxScore: 75,
          difficulty: "Yuqori",
          difficultyColor: "text-amber-400 bg-amber-400/10 border-amber-400/20",
          description: "Milliy sertifikat standarti bo'yicha nazariy va amaliy murakkab masalalar.",
          questions: [
            {
              id: 1,
              type: 'choice',
              text: "Arifmetik progressiyada a1 = 2 va ayirmasi d = 3 bo'lsa, a5 ning qiymati qancha bo'ladi?",
              options: ["11", "14", "17", "20"],
              correctIndex: 1,
              textbookRef: "9-sinf Algebra, Arifmetik progressiya n-hadi formulasi, §16, 64-bet"
            }
          ]
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
