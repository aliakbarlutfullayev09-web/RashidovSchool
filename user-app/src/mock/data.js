export const mockUser = {
  telegram_id: 123456789,
  full_name: 'Alisher Rashidov',
  class_group: '9-A',
  balance: 1850,
  streak_days: 7,
  language: 'uz',
  role: 'student'
};

export const mockSubjects = [
  { 
    id: 1, 
    key: 'biologiya',
    name: 'Biologiya', 
    emoji: '🧬', 
    image_url: '/banners/biologiya_banner.jpg',
    video_url: '/banners/biologiya_banner.mp4',
    accent_color: '#10B981',
    border_class: 'border-emerald-500/35',
    shadow_class: 'shadow-[0_8px_32px_rgba(16,185,129,0.22)]',
    bg_gradient: 'from-[#031B13] via-[#020E0A] to-[#000000]',
    description: 'DNK, hujayra, tirik organizmlar va tabiat qonuniyatlari'
  },
  { 
    id: 2, 
    key: 'kimyo',
    name: 'Kimyo', 
    emoji: '🧪', 
    image_url: '/banners/kimyo_banner.jpg',
    video_url: '/banners/kimyo_banner.mp4',
    accent_color: '#A855F7',
    border_class: 'border-purple-500/35',
    shadow_class: 'shadow-[0_0_50px_rgba(168,85,247,0.22)]',
    bg_gradient: 'from-[#19092B] via-[#0D0417] to-[#000000]',
    description: 'Anorganik va organik kimyo, reaksiyalar va formulalar'
  },
  { 
    id: 3, 
    key: 'matematika',
    name: 'Matematika', 
    emoji: '📐', 
    image_url: 'https://images.unsplash.com/photo-1633424974203-6c91b2a651ee?auto=format&fit=crop&w=1200&q=85',
    accent_color: '#007AFF',
    border_class: 'border-blue-500/35',
    shadow_class: 'shadow-[0_8px_32px_rgba(0,122,255,0.22)]',
    bg_gradient: 'from-[#05142B] via-[#020A17] to-[#000000]',
    description: 'Algebra, geometriya va murakkab test masalalari'
  }
];

export const mockCourses = [
  { 
    id: 1, 
    subject_id: 1, 
    title: 'Botanika', 
    image_url: 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?auto=format&fit=crop&w=600&q=80',
    description: "O'simliklar anatomiyasi va fiziologiyasi",
    order_index: 1 
  },
  { 
    id: 2, 
    subject_id: 1, 
    title: 'Zoologiya', 
    image_url: 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?auto=format&fit=crop&w=600&q=80',
    description: "Hayvonlar olami va ularning tuzilishi",
    order_index: 2 
  },
  { 
    id: 3, 
    subject_id: 1, 
    title: 'Anatomiya', 
    image_url: 'https://images.unsplash.com/photo-1576086213369-97a306d36557?auto=format&fit=crop&w=600&q=80',
    description: "Odam anatomiyasi va fiziologiyasi",
    order_index: 3 
  },
  { 
    id: 4, 
    subject_id: 1, 
    title: 'Genetika', 
    image_url: 'https://images.unsplash.com/photo-1530026405186-ed1f139313f8?auto=format&fit=crop&w=600&q=80',
    description: "Irsiyat va o'zgaruvchanlik qonunlari",
    order_index: 4 
  }
];

export const mockLessons = [
  // ── BOTANIKA ──
  { 
    id: 1, 
    course_id: 1, 
    category_name: 'Botanika',
    title: 'Fotosintez jarayoni va uning bosqichlari', 
    video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', 
    thumbnail_url: 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?auto=format&fit=crop&w=800&q=80', 
    order_index: 1,
    duration: '18:00',
    is_free: true,
    view_count: 240,
    test_question_count: 5,
    summary_bullets: [
      "Fotosintezning yorug'lik va qorong'ulik fazalari",
      "Xloroplastlarning tuzilishi va xlorofill pigmenti",
      "ATF sintezi va glyukozaning hosil bo'lishi"
    ],
    terms: [
      { id: 1, term: "Fotosintez", definition: "Yashil o'simliklar tomonidan quyosh nuri energiyasi yordamida noorganik moddalardan organik moddalar sintezlanishi.", timestamp: 15 },
      { id: 2, term: "Xloroplast", definition: "O'simlik hujayralaridagi fotosintez jarayoni kechadigan ikki membranali organoid.", timestamp: 45 },
      { id: 3, term: "Fotoliz", definition: "Yorug'lik nuri ta'sirida suv molekulasining vodorod va kislorodga parchalanishi.", timestamp: 85 }
    ]
  },
  { 
    id: 2, 
    course_id: 1, 
    category_name: 'Botanika',
    title: 'Yorug‘lik va qorong‘ulik fazalari tahlili', 
    video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4', 
    thumbnail_url: 'https://images.unsplash.com/photo-1530026405186-ed1f139313f8?auto=format&fit=crop&w=800&q=80', 
    order_index: 2,
    duration: '14:20',
    is_free: true,
    view_count: 185,
    test_question_count: 5,
    summary_bullets: [
      "Kelvin sikli va uning ahamiyati",
      "CO2 ning fiksatsiyalanish mexanizmi",
      "O'simliklarda suv bug'lanishi (transpiratsiya)"
    ],
    terms: [
      { id: 4, term: "Kelvin sikli", definition: "Fotosintezning qorong'ulik fazasida glyukoza sintezlanuvchi biokimyoviy reaksiyalar ketma-ketligi.", timestamp: 30 },
      { id: 5, term: "Transpiratsiya", definition: "O'simlik barglari orqali suvning bug'lanish fiziologik jarayoni.", timestamp: 60 }
    ]
  },
  { 
    id: 3, 
    course_id: 1, 
    category_name: 'Botanika',
    title: 'Gulning tuzilishi va changlanish turlari', 
    video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4', 
    thumbnail_url: 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=800&q=80', 
    order_index: 3,
    duration: '12:45',
    is_free: false,
    view_count: 120,
    test_question_count: 4,
    summary_bullets: [
      "Gulkosa, tojibarg, changchi va urug'chi",
      "Chetga changlanish va o'z-o'zidan changlanish",
      "Ikkilamchi urug'lanish hodisasi (Navashin)"
    ],
    terms: [
      { id: 6, term: "Ikkilamchi urug'lanish", definition: "Gul changi naychasidagi 2 ta spermiydan biri tuxum hujayrani, ikkinchisi markaziy hujayrani urug'lantirishi.", timestamp: 25 }
    ]
  },

  // ── ZOOLOGIYA ──
  { 
    id: 4, 
    course_id: 2, 
    category_name: 'Zoologiya',
    title: 'Sodda hayvonlar va bir hujayralilar olami', 
    video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', 
    thumbnail_url: 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?auto=format&fit=crop&w=800&q=80', 
    order_index: 1,
    duration: '15:10',
    is_free: false,
    view_count: 95,
    test_question_count: 5,
    summary_bullets: [
      "Amyoba, evglena va tufelkaning harakatlanishi",
      "Qisqaruvchi vakuolalarning osmoregulyatsiyadagi vazifasi",
      "Parazit sodda hayvonlar (bezgak plazmodiysi)"
    ],
    terms: [
      { id: 7, term: "Soxta oyoqlar", definition: "Amyoba sitoplazmasining oqib chiqishi natijasida hosil bo'ladigan vaqtincha harakat organoidlari.", timestamp: 20 },
      { id: 8, term: "Sista", definition: "Noqulay sharoitda sodda hayvonlarning qalin po'st bilan o'ralishi.", timestamp: 50 }
    ]
  },

  // ── ANATOMIYA ──
  { 
    id: 5, 
    course_id: 3, 
    category_name: 'Anatomiya',
    title: 'Yurak va qon aylanish tizimi', 
    video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4', 
    thumbnail_url: 'https://images.unsplash.com/photo-1576086213369-97a306d36557?auto=format&fit=crop&w=800&q=80', 
    order_index: 1,
    duration: '16:30',
    is_free: false,
    view_count: 140,
    test_question_count: 5,
    summary_bullets: [
      "Yurak devorining qatlamlari: epikard, miokard, endokard",
      "Katta va kichik qon aylanish doirasi",
      "Qon bosimi va puls o'lchash mexanizmi"
    ],
    terms: [
      { id: 9, term: "Miokard", definition: "Yurakning qisqarishini ta'minlovchi qalin ko'ndalang-targ'il muskul qatlami.", timestamp: 25 },
      { id: 10, term: "Sistola", definition: "Yurak bo'lmachalari yoki qorinchalarining qisqarish fazasi.", timestamp: 65 }
    ]
  },

  // ── GENETIKA ──
  { 
    id: 6, 
    course_id: 4, 
    category_name: 'Genetika',
    title: 'Mendel qonunlari va belgilarning irsiylanishi', 
    video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4', 
    thumbnail_url: 'https://images.unsplash.com/photo-1530026405186-ed1f139313f8?auto=format&fit=crop&w=800&q=80', 
    order_index: 1,
    duration: '14:15',
    is_free: false,
    view_count: 190,
    test_question_count: 5,
    summary_bullets: [
      "Mendelning bir xillik va ajralish qonunlari",
      "Dominant va retsessiv genlar munosabati",
      "Monoduragay va diduragay chatishtirish"
    ],
    terms: [
      { id: 11, term: "Allel genlar", definition: "Gomologik xromosomalarning bir xil lokuslarida joylashgan va bir belgi rivojlanishini ta'minlovchi genlar.", timestamp: 25 },
      { id: 12, term: "Genotip", definition: "Organizmning barcha genlari yig'indisi.", timestamp: 70 }
    ]
  }
];

export const mockProgress = [
  { lesson_id: 1, stars: 3, is_unlocked: true, score: 95 },
  { lesson_id: 2, stars: 2, is_unlocked: true, score: 80 },
  { lesson_id: 3, stars: 0, is_unlocked: true },
  { lesson_id: 4, stars: 0, is_unlocked: true },
  { lesson_id: 5, stars: 0, is_unlocked: true },
  { lesson_id: 6, stars: 0, is_unlocked: true }
];
