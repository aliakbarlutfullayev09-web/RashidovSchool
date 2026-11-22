import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, Clock, AlertTriangle, CheckCircle2, XCircle, ArrowLeft, 
  RotateCcw, BookOpen, Search, Sparkles, ChevronRight, Check,
  Award, Zap, UserCheck, FileText, CheckCircle
} from 'lucide-react';
import SubjectBannerEffects from '../components/SubjectBannerEffects';
import { getSubjects, saveExamProgress } from '../api/supabase';
import { isUzbekMatch } from '../utils/uzbekFuzzy';
import { useHaptic } from '../hooks/useHaptic';
import { useLanguage } from '../context/LanguageContext';
import { useTelegram } from '../hooks/useTelegram';

// ──────────────────────────────────────────────────────────────
// TEACHER-CURATED TESTS DATABASE PER SUBJECT & MODE
// Added and verified by "Ustoz Rashidov" for each discipline
// ──────────────────────────────────────────────────────────────
const SUBJECT_TESTS_DATA = {
  biologiya: {
    teacher: {
      name: "Ustoz Rashidov",
      subjectTitle: "Biologiya",
      role: "Biologiya fani bosh o'qituvchisi",
      experience: "8 yillik pedagogik tajriba",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80",
      badge: "DTM & Milliy Sertifikat eksperti",
      note: "Ushbu bo'limdagi barcha variantlar va savollar DTM va Milliy sertifikat dasturi talablari asosida shaxsan tuzilgan va tekshirilgan."
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
        description: "Sitologiya, botanika, fiziologiya va asosiy biologik qonuniyatlar bo'yicha DTM imtihoni savollari.",
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
        questionCount: 45,
        durationMinutes: 90,
        maxScore: 100,
        difficulty: "Yuqori",
        difficultyColor: "text-amber-400 bg-amber-400/10 border-amber-400/20",
        description: "Rasmiy Milliy sertifikat standarti bo'yicha 3 ta qism: Nazariy, Moslashtirish va Masalalar.",
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
        questionCount: 45,
        durationMinutes: 90,
        maxScore: 100,
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
      badge: "Olimpiada va DTM yetakchi murabbiyi",
      note: "Kimyo fanidan barcha DTM va Sertifikat testlari yangilangan milliy ta'lim dasturi asosida reaksiyalar va hisoblash masalalari bilan to'ldirilgan."
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
        questionCount: 45,
        durationMinutes: 90,
        maxScore: 100,
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
      badge: "DTM va Milliy Sertifikat masteri",
      note: "Matematika bo'limida har bir savol DTM va Milliy sertifikat qoliplariga to'liq mos keladi. Nazariya va tezkor hisoblash texnikalari jamlangan."
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
        questionCount: 45,
        durationMinutes: 90,
        maxScore: 100,
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
};

export default function TestlarPage({ user, onRegisterBackAction }) {
  const { t } = useLanguage();
  const { selectionChanged, impactLight, impactMedium, notificationSuccess, notificationError } = useHaptic();
  const { setClosingConfirmation } = useTelegram();

  // Navigation views: 'carousel' (Screen 1) | 'mode_select' (Screen 2) | 'test_list' (Screen 3)
  const [currentView, setCurrentView] = useState('carousel');

  // Subjects & Carousel state
  const [subjects, setSubjects] = useState([]);
  const [activeSubjectIndex, setActiveSubjectIndex] = useState(0);
  const [slideDirection, setSlideDirection] = useState(1);

  // Selected state
  const [selectedSubjectKey, setSelectedSubjectKey] = useState('biologiya');
  const [selectedMode, setSelectedMode] = useState('dtm'); // 'dtm' | 'sertifikat'
  const [selectedTest, setSelectedTest] = useState(null);

  // Exam Runner State (Screen 4)
  const [examActive, setExamActive] = useState(false);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(1800);
  const [cheatWarnings, setCheatWarnings] = useState(0);
  const [showWarningModal, setShowWarningModal] = useState(false);

  // Results & Tahlil State
  const [examFinished, setExamFinished] = useState(false);
  const [showTahlil, setShowTahlil] = useState(false);

  // Touch handling for carousel
  const touchStartXRef = useRef(0);
  const touchStartYRef = useRef(0);

  // Load subjects on mount
  useEffect(() => {
    async function load() {
      try {
        const dbSubjects = await getSubjects();
        if (dbSubjects && dbSubjects.length > 0) {
          setSubjects(dbSubjects);
        }
      } catch (e) {
        console.warn("Error loading subjects in Testlar:", e);
      }
    }
    load();
  }, []);

  const activeSubject = subjects[activeSubjectIndex] || subjects[0] || { 
    id: 1, 
    key: 'biologiya', 
    name: 'Biologiya'
  };

  // Subject Key & Details
  const normKey = (activeSubject?.key || activeSubject?.name || '').toString().toLowerCase();
  const isBio = normKey.includes('bio') || normKey.includes('био') || activeSubject?.id === 1;
  const isKimyo = normKey.includes('kim') || normKey.includes('хим') || activeSubject?.id === 2;
  const isMatem = normKey.includes('mat') || normKey.includes('мат') || activeSubject?.id === 3;

  const currentSubjectKey = isBio ? 'biologiya' : isKimyo ? 'kimyo' : isMatem ? 'matematika' : (activeSubject?.key || 'biologiya');
  const currentSubjectTitle = (activeSubject?.name || (isBio ? 'BIOLOGIYA' : isKimyo ? 'KIMYO' : isMatem ? 'MATEMATIKA' : 'FAN')).toUpperCase();

  // Distinct custom high-res background & video per subject
  let subjectImage = activeSubject?.image_url;
  if (!subjectImage || subjectImage.includes('unsplash.com/photo-1530026405186') || subjectImage.includes('photo-1635070041078')) {
    subjectImage = isBio 
      ? '/banners/biologiya_banner.jpg'
      : isKimyo
      ? '/banners/kimyo_banner.jpg'
      : isMatem
      ? 'https://images.unsplash.com/photo-1633424974203-6c91b2a651ee?auto=format&fit=crop&w=1200&q=85'
      : 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=85';
  }

  const subjectVideo = isBio 
    ? '/banners/biologiya_banner.mp4' 
    : isKimyo 
    ? '/banners/kimyo_banner.mp4' 
    : activeSubject?.video_url || null;

  const buttonGradient = isKimyo 
    ? 'from-[#8B5CF6] via-[#A855F7] to-[#7C3AED] shadow-[0_0_25px_rgba(168,85,247,0.45)]'
    : isMatem
    ? 'from-[#007AFF] via-[#0A84FF] to-[#0056D2] shadow-[0_0_25px_rgba(0,122,255,0.45)]'
    : isBio
    ? 'from-[#007AFF] via-[#0A84FF] to-[#0066FF] shadow-[0_0_25px_rgba(0,122,255,0.45)]'
    : 'from-[#06B6D4] via-[#0EA5E9] to-[#0284C7] shadow-[0_0_25px_rgba(6,182,212,0.45)]';

  const cardBorderClass = activeSubject?.border_class || (
    isKimyo ? 'border-purple-500/35' : isMatem ? 'border-blue-500/35' : 'border-emerald-500/35'
  );

  const cardShadowClass = activeSubject?.shadow_class || (
    isKimyo ? 'shadow-[0_8px_32px_rgba(168,85,247,0.22)]' : isMatem ? 'shadow-[0_8px_32px_rgba(0,122,255,0.22)]' : 'shadow-[0_8px_32px_rgba(16,185,129,0.22)]'
  );

  const cardBgGradient = activeSubject?.bg_gradient || (
    isKimyo ? 'from-[#19092B] via-[#0D0417] to-[#000000]' : isMatem ? 'from-[#05142B] via-[#020A17] to-[#000000]' : 'from-[#031B13] via-[#020E0A] to-[#000000]'
  );

  // Carousel handlers
  const handleNextSubject = () => {
    impactLight();
    setSlideDirection(1);
    setActiveSubjectIndex((prev) => (prev + 1) % (subjects.length || 3));
  };

  const handlePrevSubject = () => {
    impactLight();
    setSlideDirection(-1);
    setActiveSubjectIndex((prev) => (prev - 1 + (subjects.length || 3)) % (subjects.length || 3));
  };

  // Enter Mode Selection (Screen 2)
  const handleSelectSubject = (key) => {
    impactMedium();
    setSelectedSubjectKey(key || currentSubjectKey);
    setCurrentView('mode_select');
  };

  // Enter Tests List (Screen 3)
  const handleSelectMode = (mode) => {
    impactMedium();
    setSelectedMode(mode);
    setCurrentView('test_list');
  };

  // Launch Exam Runner (Screen 4)
  const handleStartExam = (test) => {
    impactMedium();
    setSelectedTest(test);
    setCurrentQIndex(0);
    setUserAnswers({});
    setTimeLeft((test?.durationMinutes || 60) * 60);
    setCheatWarnings(0);
    setShowWarningModal(false);
    setShowTahlil(false);
    setExamActive(true);
    setExamFinished(false);
  };

  // Exit Exam Confirm Handler
  const handleExitExam = () => {
    if (window.confirm("Testni to'xtatmoqchimisiz? Natijalar saqlanmaydi.")) {
      impactLight();
      setExamActive(false);
      setExamFinished(false);
      setShowWarningModal(false);
      setCurrentView('test_list');
    }
  };

  // Finish Exam Handler
  const handleFinishExam = () => {
    impactMedium();
    setExamActive(false);
    setExamFinished(true);
    notificationSuccess();

    const uid = user?.telegram_id || user?.id;
    if (uid) {
      const qWeight = selectedMode === 'dtm' ? 3.1 : (100 / (activeQuestions.length || 1));
      let cCount = 0;
      activeQuestions.forEach((q, idx) => {
        const userAns = userAnswers[idx];
        if (q.type === 'input') {
          if (userAns && isUzbekMatch(userAns, q.correctAnswer)) cCount++;
        } else {
          if (userAns === q.correctIndex) cCount++;
        }
      });
      const score = (cCount * qWeight).toFixed(1);
      const ratio = cCount / (activeQuestions.length || 1);
      const stars = ratio >= 0.8 ? 3 : ratio >= 0.5 ? 2 : 1;

      saveExamProgress(uid, selectedSubjectKey, selectedMode, selectedTest?.id || 'exam-1', score, stars);
    }
  };

  // Back Navigation Registration
  useEffect(() => {
    if (typeof onRegisterBackAction !== 'function') return;

    if (examActive) {
      onRegisterBackAction(() => handleExitExam());
    } else if (examFinished) {
      onRegisterBackAction(() => {
        impactLight();
        setExamFinished(false);
        setCurrentView('test_list');
      });
    } else if (currentView === 'test_list') {
      onRegisterBackAction(() => {
        impactLight();
        setCurrentView('mode_select');
      });
    } else if (currentView === 'mode_select') {
      onRegisterBackAction(() => {
        impactLight();
        setCurrentView('carousel');
      });
    } else {
      onRegisterBackAction(null);
    }
  }, [examActive, examFinished, currentView, onRegisterBackAction]);

  // Anti-cheat detector during active exam
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

  // Active Subject Data Bundle
  const activeSubjectData = SUBJECT_TESTS_DATA[selectedSubjectKey] || SUBJECT_TESTS_DATA.biologiya;
  const activeModeTests = activeSubjectData[selectedMode] || activeSubjectData.dtm;
  const activeQuestions = selectedTest?.questions || activeModeTests[0]?.questions || [];

  // Answering
  const handleSelectAnswer = (qIndex, ans) => {
    impactLight();
    setUserAnswers(prev => ({ ...prev, [qIndex]: ans }));
  };

  // Results Calculation
  let correctCount = 0;
  activeQuestions.forEach((q, idx) => {
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

  const questionWeight = selectedMode === 'dtm' ? 3.1 : (100 / (activeQuestions.length || 1));
  const totalScore = (correctCount * questionWeight).toFixed(1);
  const grantProb = Math.min(100, Math.round((correctCount / (activeQuestions.length || 1)) * 100));

  let certGrade = 'C';
  if (grantProb >= 90) certGrade = 'A+';
  else if (grantProb >= 80) certGrade = 'A';
  else if (grantProb >= 70) certGrade = 'B+';
  else if (grantProb >= 60) certGrade = 'B';

  // ──────────────────────────────────────────────────────────
  // SCREEN 4: EXAM RUNNER
  // ──────────────────────────────────────────────────────────
  if (examActive) {
    const currentQ = activeQuestions[currentQIndex] || activeQuestions[0];
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;

    return (
      <div className="w-full min-h-screen bg-[#000000] text-white p-4 pb-28 max-w-lg mx-auto select-none">
        
        {/* Top Header */}
        <div className="flex items-center justify-between py-2 border-b border-white/5 mb-4">
          <button
            onClick={handleExitExam}
            className="w-9 h-9 rounded-full bg-[#1C1C1E] flex items-center justify-center text-white active:scale-90 transition-transform"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-1.5 bg-[#1C1C1E] border border-amber-500/30 px-3 py-1.5 rounded-full text-xs font-mono font-bold text-amber-300">
            <Clock className="w-3.5 h-3.5" />
            <span>{minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}</span>
          </div>

          <button
            onClick={() => {
              if (window.confirm("Testni yakunlaysizmi?")) {
                handleFinishExam();
              }
            }}
            className="bg-[#007AFF] hover:bg-blue-600 text-white text-xs font-bold px-3 py-1.5 rounded-full active:scale-95 transition-transform"
          >
            Yakunlash
          </button>
        </div>

        {/* Question Grid Navigator */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-2 mb-4">
          {activeQuestions.map((_, idx) => {
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
            <span>Savol {currentQIndex + 1} / {activeQuestions.length}</span>
            <span className="text-blue-400 font-bold">
              +{selectedMode === 'dtm' ? '3.1 ball' : `${(100 / activeQuestions.length).toFixed(1)} ball`}
            </span>
          </div>

          {currentQ?.imageUrl && (
            <div className="w-full aspect-video rounded-2xl overflow-hidden bg-black/40 border border-white/5">
              <img src={currentQ.imageUrl} alt="Savol rasmi" className="w-full h-full object-cover" />
            </div>
          )}

          <h3 className="text-white font-bold text-base leading-snug">
            {currentQ?.text}
          </h3>

          {/* Option UI: Choice vs Input */}
          {currentQ?.type === 'input' ? (
            <div className="pt-2">
              <label className="text-xs text-[#8E8E93] block mb-1">Javobingizni yozing:</label>
              <input
                type="text"
                value={userAnswers[currentQIndex] || ''}
                onChange={(e) => handleSelectAnswer(currentQIndex, e.target.value)}
                placeholder="Javobni kiriting..."
                className="w-full bg-[#2C2C2E] border border-white/10 rounded-2xl p-4 text-white text-base font-bold outline-none focus:border-[#007AFF]"
              />
            </div>
          ) : (
            <div className="space-y-2.5 pt-2">
              {(currentQ?.options || []).map((opt, oIdx) => {
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
            className="flex-1 bg-[#1C1C1E] border border-white/5 disabled:opacity-40 text-white py-3.5 rounded-2xl font-bold text-xs active:scale-95 transition-transform"
          >
            ← Oldingi
          </button>
          <button
            onClick={() => {
              if (currentQIndex < activeQuestions.length - 1) {
                setCurrentQIndex(prev => prev + 1);
              } else {
                handleFinishExam();
              }
            }}
            className="flex-1 bg-[#007AFF] hover:bg-blue-600 text-white py-3.5 rounded-2xl font-bold text-xs active:scale-95 transition-transform"
          >
            {currentQIndex === activeQuestions.length - 1 ? 'Yakunlash ✓' : 'Keyingi →'}
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
                Ilovadan chiqish yoki oynani almashtirish qat'iyan man etiladi! Yana bir marta takrorlansa, test avtomatik yakunlanadi.
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

  // ──────────────────────────────────────────────────────────
  // SCREEN 4: RESULTS & TAHLIL SCREEN
  // ──────────────────────────────────────────────────────────
  if (examFinished) {
    return (
      <div className="w-full min-h-screen bg-[#000000] text-white p-4 pb-28 max-w-lg mx-auto space-y-5 select-none">
        
        {/* Results Card */}
        <div className="bg-[#1C1C1E] border border-white/5 rounded-3xl p-6 text-center space-y-4 shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 text-black flex items-center justify-center text-3xl mx-auto shadow-lg shadow-emerald-500/30">
            🏆
          </div>

          <div>
            <h3 className="text-white font-extrabold text-2xl mb-1">Test yakunlandi!</h3>
            <p className="text-xs text-[#8E8E93]">
              {selectedTest?.title || "Rasmiy sinov testi"}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-2">
            <div className="bg-[#2C2C2E] p-3 rounded-2xl">
              <span className="text-[10px] text-[#8E8E93] block">To'g'ri:</span>
              <span className="text-emerald-400 font-bold text-lg">{correctCount} / {activeQuestions.length}</span>
            </div>
            <div className="bg-[#2C2C2E] p-3 rounded-2xl">
              <span className="text-[10px] text-[#8E8E93] block">To'plangan ball:</span>
              <span className="text-blue-400 font-bold text-lg">{totalScore}</span>
            </div>
            <div className="bg-[#2C2C2E] p-3 rounded-2xl">
              <span className="text-[10px] text-[#8E8E93] block">{selectedMode === 'dtm' ? 'Maksimal:' : 'Sertifikat:'}</span>
              <span className="text-amber-400 font-bold text-lg">{selectedMode === 'dtm' ? '93.0' : certGrade}</span>
            </div>
          </div>

          <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-2xl text-xs text-emerald-300 font-semibold flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4" />
            <span>
              {selectedMode === 'dtm' 
                ? `Davlat granti ehtimoli: ${grantProb}%` 
                : `Sertifikat darajasi: ${certGrade} (${grantProb}%)`}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2">
            <button
              onClick={() => setShowTahlil(prev => !prev)}
              className="bg-[#2C2C2E] hover:bg-[#343438] text-white font-bold py-3.5 px-3 rounded-2xl text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95"
            >
              <Search className="w-4 h-4 text-purple-400" />
              <span>Xatolar tahlili</span>
            </button>
            <button
              onClick={() => handleStartExam(selectedTest)}
              className="bg-[#007AFF] hover:bg-blue-600 text-white font-bold py-3.5 px-3 rounded-2xl text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Qayta topshirish</span>
            </button>
          </div>

          <button
            onClick={() => {
              setExamFinished(false);
              setCurrentView('test_list');
            }}
            className="w-full bg-[#1C1C1E] border border-white/10 hover:bg-[#2C2C2E] text-white/80 font-bold py-3 px-3 rounded-2xl text-xs flex items-center justify-center gap-1.5 transition-all"
          >
            <span>Boshqa variantlarni ko'rish</span>
          </button>
        </div>

        {/* Tahlil Section */}
        {showTahlil && (
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-[#8E8E93] uppercase tracking-wider">
              Xatolar bo'yicha darslik ko'rsatmalari (Tahlil):
            </h4>

            {activeQuestions.map((q, idx) => {
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
                        <CheckCircle2 className="w-3.5 h-3.5" /> To'g'ri
                      </span>
                    ) : (
                      <span className="text-red-400 font-bold flex items-center gap-1">
                        <XCircle className="w-3.5 h-3.5" /> Xato
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-white/90 font-medium">{q.text}</p>

                  <div className="bg-[#242426] p-2.5 rounded-xl text-xs text-amber-300 font-semibold flex items-center gap-2">
                    <BookOpen className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                    <span>{q.textbookRef || "Rashidov School darsligi"}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────
  // SCREEN 1: HERO SUBJECT CAROUSEL BANNER (EXACTLY LIKE DARSLAR)
  // ──────────────────────────────────────────────────────────
  if (currentView === 'carousel') {
    return (
      <div 
        className="w-full text-white select-none flex flex-col h-full flex-1 overflow-hidden"
        style={{
          paddingBottom: 'calc(var(--safe-area-bottom, 0px) + 74px)'
        }}
      >
        <div 
          className="h-full flex-1 flex flex-col justify-between items-center px-4 pt-1 pb-1 w-full max-w-md mx-auto overflow-hidden select-none"
          onTouchStart={(e) => {
            touchStartXRef.current = e.touches[0].clientX;
            touchStartYRef.current = e.touches[0].clientY;
          }}
          onTouchEnd={(e) => {
            const deltaX = touchStartXRef.current - e.changedTouches[0].clientX;
            const deltaY = Math.abs(touchStartYRef.current - e.changedTouches[0].clientY);
            if (Math.abs(deltaX) > 35 && Math.abs(deltaX) > deltaY) {
              if (deltaX > 0) handleNextSubject();
              else handlePrevSubject();
            }
          }}
        >
          {/* Stretched Vertical Card Container: flex-1 min-h-0 fills exact screen height with zero overflow */}
          <div className="relative w-full flex-1 min-h-0 my-1 overflow-hidden">
            <AnimatePresence initial={false} custom={slideDirection}>
              <motion.div 
                key={activeSubjectIndex}
                custom={slideDirection}
                variants={{
                  enter: (dir) => ({
                    x: dir > 0 ? '100%' : '-100%',
                    opacity: 1,
                    scale: 1,
                  }),
                  center: {
                    x: 0,
                    opacity: 1,
                    scale: 1,
                    transition: {
                      x: { type: "spring", stiffness: 320, damping: 32, mass: 0.8 },
                    }
                  },
                  exit: (dir) => ({
                    x: dir > 0 ? '-100%' : '100%',
                    opacity: 0.9,
                    scale: 0.98,
                    transition: {
                      x: { type: "spring", stiffness: 320, damping: 32, mass: 0.8 },
                      opacity: { duration: 0.28 }
                    }
                  })
                }}
                initial="enter"
                animate="center"
                exit="exit"
                onClick={(e) => {
                  e.preventDefault();
                  handleSelectSubject(currentSubjectKey);
                }}
                style={{
                  isolation: 'isolate',
                  WebkitMaskImage: '-webkit-radial-gradient(white, black)'
                }}
                className={`absolute inset-0 w-full h-full rounded-[28px] overflow-hidden border ${cardBorderClass} ${cardShadowClass} bg-gradient-to-b ${cardBgGradient} cursor-pointer group active:scale-[0.99] transition-transform duration-200 flex flex-col justify-between p-5 sm:p-6 select-none`}
              >
                {/* Background Subject Artwork */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                  {subjectVideo ? (
                    <video 
                      key={subjectVideo}
                      src={subjectVideo} 
                      poster={subjectImage}
                      autoPlay 
                      loop 
                      muted 
                      playsInline 
                      preload="auto"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-85" 
                    />
                  ) : (
                    <img 
                      src={subjectImage} 
                      alt={currentSubjectTitle} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-80" 
                    />
                  )}
                  {/* Deep Cinematic Vignette Overlays */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/45 to-transparent" />
                  <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black" />
                </div>

                {/* Subject Animation Effects */}
                <SubjectBannerEffects subjectKey={currentSubjectKey} />

                {/* Spacer */}
                <div className="relative z-10 w-full flex-1 min-h-0" />

                {/* Bottom Card Content: Title & "Boshlash" Button */}
                <div className="relative z-10 w-full flex flex-col items-start pt-3">
                  <h2 className="text-white font-black text-2xl sm:text-3xl tracking-[0.06em] uppercase mb-3 drop-shadow-[0_4px_16px_rgba(0,0,0,0.9)] font-sans">
                    {currentSubjectTitle}
                  </h2>

                  {/* Glowing Action Button: "Boshlash" */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleSelectSubject(currentSubjectKey);
                    }}
                    className={`w-full bg-gradient-to-r ${buttonGradient} hover:brightness-110 text-white font-bold py-3 px-6 rounded-full text-sm sm:text-base active:scale-95 transition-all text-center flex items-center justify-center gap-2 shadow-lg cursor-pointer z-20`}
                  >
                    <span>Boshlash</span>
                  </button>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Carousel Pagination Dots */}
          <div className="flex items-center justify-center gap-2 pt-1 pb-1 flex-shrink-0">
            {(subjects.length > 0 ? subjects : [1, 2, 3]).map((s, idx) => (
              <button
                key={s.id || idx}
                onClick={() => {
                  impactLight();
                  setSlideDirection(idx >= activeSubjectIndex ? 1 : -1);
                  setActiveSubjectIndex(idx);
                }}
                className={`transition-all duration-300 rounded-full ${
                  idx === activeSubjectIndex 
                    ? 'w-7 h-2 bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)]' 
                    : 'w-2 h-2 bg-white/30 hover:bg-white/50'
                }`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────
  // SCREEN 2: 2 BANNERS (DTM MOCK & MILLIY SERTIFIKAT)
  // ──────────────────────────────────────────────────────────
  if (currentView === 'mode_select') {
    const isSubjectKimyo = selectedSubjectKey === 'kimyo';
    const isSubjectMatem = selectedSubjectKey === 'matematika';

    const subjectBadgeTitle = isSubjectKimyo 
      ? '🧪 Kimyo Testlari' 
      : isSubjectMatem 
      ? '📐 Matematika Testlari' 
      : '🧬 Biologiya Testlari';

    return (
      <div 
        className="w-full text-white select-none flex flex-col min-h-full px-4 pt-2 space-y-4 max-w-md mx-auto"
        style={{
          paddingBottom: 'calc(var(--safe-area-bottom, 0px) + 88px)'
        }}
      >
        {/* Subject Header Badge */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2 bg-[#1C1C1E] border border-white/10 px-3.5 py-1.5 rounded-full text-xs font-bold text-white shadow-sm">
            <span>{subjectBadgeTitle}</span>
          </div>
          <span className="text-[11px] text-[#8E8E93]">Yo'nalishni tanlang</span>
        </div>

        <div className="text-left space-y-1">
          <h2 className="text-xl font-black text-white tracking-wide">
            Imtihon Turini Tanlang
          </h2>
          <p className="text-xs text-[#8E8E93]">
            O'zingizga kerakli imtihon formatini tanlang va o'qituvchi tayyorlagan variantlar bilan bilimingizni sinang.
          </p>
        </div>

        {/* ── BANNER 1: 🎯 DTM MOCK TEST ── */}
        <div 
          onClick={() => handleSelectMode('dtm')}
          className="relative bg-gradient-to-br from-[#1C1C1E] via-[#161618] to-[#0A0A0C] border border-blue-500/30 rounded-3xl p-5 shadow-[0_8px_30px_rgba(0,122,255,0.15)] cursor-pointer group active:scale-[0.98] transition-all space-y-4"
        >
          {/* Top Pill & Badge */}
          <div className="flex items-center justify-between">
            <span className="bg-blue-500/15 border border-blue-500/30 text-blue-400 text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full tracking-wider">
              Davlat Test Markazi (DTM)
            </span>
            <span className="text-2xl">🎯</span>
          </div>

          <div>
            <h3 className="text-white font-extrabold text-lg group-hover:text-blue-300 transition-colors">
              DTM Mock Test
            </h3>
            <p className="text-xs text-[#8E8E93] mt-1 leading-relaxed">
              Oliy ta'lim muassasalariga kirish imtihonlari rasmiy standarti bo'yicha diagnostika.
            </p>
          </div>

          {/* Quick Specs Chips */}
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="bg-[#242426] border border-white/5 p-2 rounded-xl">
              <span className="text-[10px] text-[#8E8E93] block">Savollar:</span>
              <span className="text-white font-bold">30 ta</span>
            </div>
            <div className="bg-[#242426] border border-white/5 p-2 rounded-xl">
              <span className="text-[10px] text-[#8E8E93] block">Vaqt:</span>
              <span className="text-amber-400 font-bold">60 daq</span>
            </div>
            <div className="bg-[#242426] border border-white/5 p-2 rounded-xl">
              <span className="text-[10px] text-[#8E8E93] block">Maksimal:</span>
              <span className="text-emerald-400 font-bold">93.0 ball</span>
            </div>
          </div>

          {/* Feature Bullets */}
          <div className="space-y-1.5 text-xs text-white/80 pt-1">
            <div className="flex items-center gap-2 text-[11px]">
              <Sparkles className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
              <span>Har bir to'g'ri javob uchun 3.1 ball & grant ehtimoli</span>
            </div>
            <div className="flex items-center gap-2 text-[11px]">
              <BookOpen className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
              <span>Xatolar bo'yicha darslik manbalari va to'liq tahlil</span>
            </div>
            <div className="flex items-center gap-2 text-[11px]">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
              <span>Anti-cheat nazorati va vaqt taymeri</span>
            </div>
          </div>

          {/* Action Button */}
          <button 
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleSelectMode('dtm');
            }}
            className="w-full bg-gradient-to-r from-[#007AFF] to-[#0A84FF] text-white font-bold py-3 px-4 rounded-2xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 group-hover:brightness-110 transition-all cursor-pointer z-10"
          >
            <span>Variantlarni ko'rish</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* ── BANNER 2: 📜 MILLIY SERTIFIKAT ── */}
        <div 
          onClick={() => handleSelectMode('sertifikat')}
          className="relative bg-gradient-to-br from-[#1C1C1E] via-[#161618] to-[#0A0A0C] border border-amber-500/30 rounded-3xl p-5 shadow-[0_8px_30px_rgba(245,158,11,0.15)] cursor-pointer group active:scale-[0.98] transition-all space-y-4"
        >
          {/* Top Pill & Badge */}
          <div className="flex items-center justify-between">
            <span className="bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full tracking-wider">
              Davlat Ta'lim Standarti
            </span>
            <span className="text-2xl">📜</span>
          </div>

          <div>
            <h3 className="text-white font-extrabold text-lg group-hover:text-amber-300 transition-colors">
              Milliy Sertifikat
            </h3>
            <p className="text-xs text-[#8E8E93] mt-1 leading-relaxed">
              A+, A, B+, B darajalarini taqdim etuvchi ko'p bosqichli chuqurlashtirilgan baholash tizimi.
            </p>
          </div>

          {/* Quick Specs Chips */}
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="bg-[#242426] border border-white/5 p-2 rounded-xl">
              <span className="text-[10px] text-[#8E8E93] block">Savollar:</span>
              <span className="text-white font-bold">45 ta</span>
            </div>
            <div className="bg-[#242426] border border-white/5 p-2 rounded-xl">
              <span className="text-[10px] text-[#8E8E93] block">Vaqt:</span>
              <span className="text-amber-400 font-bold">90 daq</span>
            </div>
            <div className="bg-[#242426] border border-white/5 p-2 rounded-xl">
              <span className="text-[10px] text-[#8E8E93] block">Shkala:</span>
              <span className="text-amber-400 font-bold">100 ball</span>
            </div>
          </div>

          {/* Feature Bullets */}
          <div className="space-y-1.5 text-xs text-white/80 pt-1">
            <div className="flex items-center gap-2 text-[11px]">
              <Award className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
              <span>Nazariy, moslashtirish va masalalar (A, B, C qismlar)</span>
            </div>
            <div className="flex items-center gap-2 text-[11px]">
              <Sparkles className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
              <span>A+ dan C gacha bo'lgan rasmiy darajani aniqlash</span>
            </div>
            <div className="flex items-center gap-2 text-[11px]">
              <BookOpen className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
              <span>Mantiqiy yechimlar va chuqur tahliliy ko'rsatmalar</span>
            </div>
          </div>

          {/* Action Button */}
          <button 
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleSelectMode('sertifikat');
            }}
            className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-bold py-3 px-4 rounded-2xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 active:scale-95 transition-all cursor-pointer z-10"
          >
            <span>Variantlarni ko'rish</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────
  // SCREEN 3: AVAILABLE TESTS ADDED BY TEACHER (USTOZ RASHIDOV)
  // ──────────────────────────────────────────────────────────
  const isSubjectKimyo = selectedSubjectKey === 'kimyo';
  const isSubjectMatem = selectedSubjectKey === 'matematika';

  const teacher = activeSubjectData?.teacher || {
    name: "Ustoz Rashidov",
    subjectTitle: "Biologiya",
    role: "Biologiya fani bosh o'qituvchisi",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80",
    badge: "DTM & Sertifikat eksperti",
    note: "Ushbu bo'limdagi barcha variantlar DTM va Milliy sertifikat dasturi talablari asosida o'qituvchi tomonidan tuzilgan."
  };

  const modeTitle = selectedMode === 'dtm' ? 'DTM Mock Testlar' : 'Milliy Sertifikat Variantlari';

  return (
    <div 
      className="w-full text-white select-none flex flex-col min-h-full px-4 pt-2 space-y-4 max-w-md mx-auto"
      style={{
        paddingBottom: 'calc(var(--safe-area-bottom, 0px) + 88px)'
      }}
    >
      {/* Header Info */}
      <div className="flex items-center justify-between pt-1">
        <button
          onClick={() => {
            impactLight();
            setCurrentView('mode_select');
          }}
          className="flex items-center gap-1.5 text-xs text-[#8E8E93] hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Yo'nalishlarga qaytish</span>
        </button>

        <span className="text-[11px] font-bold text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-full border border-blue-500/20">
          {activeModeTests.length} ta variant mavjud
        </span>
      </div>

      {/* Teacher Profile Card */}
      <div className="bg-[#1C1C1E] border border-white/5 rounded-3xl p-4 space-y-3 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="relative">
            <img 
              src={teacher.avatar} 
              alt={teacher.name} 
              className="w-12 h-12 rounded-2xl object-cover border border-white/10"
            />
            <div className="absolute -bottom-1 -right-1 bg-blue-500 text-white rounded-full p-0.5 border-2 border-black">
              <Check className="w-2.5 h-2.5 stroke-[3]" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-white font-bold text-sm">{teacher.name}</h3>
              <span className="bg-amber-400/15 text-amber-300 text-[9px] font-extrabold px-1.5 py-0.5 rounded-full border border-amber-400/25">
                O'qituvchi
              </span>
            </div>
            <p className="text-xs text-[#8E8E93]">{teacher.role}</p>
          </div>
        </div>

        <div className="bg-[#242426] border border-white/5 p-3 rounded-2xl text-[11px] text-white/80 leading-relaxed flex items-start gap-2">
          <UserCheck className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
          <span>{teacher.note}</span>
        </div>
      </div>

      {/* Section Title */}
      <div className="flex items-center justify-between">
        <h3 className="text-white font-black text-base tracking-wide flex items-center gap-2">
          <span>{selectedMode === 'dtm' ? '🎯' : '📜'}</span>
          <span>{modeTitle}</span>
        </h3>
        <span className="text-[11px] text-[#8E8E93]">
          {teacher.subjectTitle}
        </span>
      </div>

      {/* Available Tests List */}
      <div className="space-y-3">
        {activeModeTests.map((test, index) => {
          return (
            <div 
              key={test.id || index}
              className="bg-[#1C1C1E] border border-white/5 hover:border-white/15 rounded-3xl p-4 space-y-3.5 transition-all shadow-md group"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${test.badgeColor || 'bg-white/10 text-white border-white/10'}`}>
                    {test.badge}
                  </span>
                  <h4 className="text-white font-bold text-sm group-hover:text-blue-300 transition-colors pt-1">
                    {test.title}
                  </h4>
                </div>

                <div className="w-8 h-8 rounded-xl bg-[#242426] flex items-center justify-center text-white/70 flex-shrink-0 text-xs font-mono font-bold">
                  #{index + 1}
                </div>
              </div>

              <p className="text-xs text-[#8E8E93] leading-relaxed">
                {test.description}
              </p>

              {/* Specs Chips */}
              <div className="flex items-center flex-wrap gap-2 text-[11px]">
                <div className="bg-[#242426] px-2.5 py-1 rounded-xl text-white/80 flex items-center gap-1">
                  <FileText className="w-3 h-3 text-blue-400" />
                  <span>{test.questionCount} ta savol</span>
                </div>
                <div className="bg-[#242426] px-2.5 py-1 rounded-xl text-white/80 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-amber-400" />
                  <span>{test.durationMinutes} daqiqa</span>
                </div>
                <div className={`px-2.5 py-1 rounded-xl border ${test.difficultyColor}`}>
                  <span>{test.difficulty}</span>
                </div>
              </div>

              {/* Start Button */}
              <button
                type="button"
                onClick={() => handleStartExam(test)}
                className={`w-full bg-gradient-to-r ${buttonGradient} hover:brightness-110 text-white font-bold py-3 px-4 rounded-2xl text-xs flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all`}
              >
                <span>Testni boshlash</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
