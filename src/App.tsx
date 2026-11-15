import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Award,
  BookOpen,
  Camera,
  CheckCircle2,
  Code2,
  Cpu,
  Database,
  Download,
  Flame,
  Gauge,
  Globe,
  HelpCircle,
  Info,
  Languages,
  Leaf,
  Microscope,
  Music,
  Pause,
  Play,
  Printer,
  Radio,
  Rocket,
  RotateCcw,
  Settings,
  Shield,
  Sparkles,
  Square,
  Thermometer,
  UserCheck,
  Users,
  Volume2,
  VolumeX,
  Wind,
  X,
  Zap,
} from 'lucide-react';

// ============================================================================
// TYPES & CONSTANTS
// ============================================================================

type Lang = 'en' | 'ar';
type PlanetId = 'moon' | 'mars';
type RoomId = 'shield' | 'greenhouse' | 'science';
type GamePhase =
  | 'TITLE_MENU'
  | 'PLAYING'
  | 'SOL_CARD_UNLOCK'
  | 'EMERGENCY_POD'
  | 'MISSION_DEBRIEF';

interface FlareRecord {
  id: string;
  classType: string;
  beginTime: string;
  sourceLocation: string;
  severity: 'Moderate' | 'Strong' | 'Extreme';
}

interface CmeRecord {
  id: string;
  startTime: string;
  speed: number;
  halfAngle: number;
  note: string;
  severity: 'Moderate' | 'Fast' | 'Extreme';
}

interface RoverPhoto {
  id: string;
  imgSrc: string;
  earthDate: string;
  sol: number;
  camera: string;
  rover: string;
}

interface NeoRecord {
  id: string;
  name: string;
  speedKmH: number;
  missKm: number;
  hazardous: boolean;
}

interface ApodData {
  title: string;
  url: string;
  explanation: string;
  date: string;
  copyright?: string;
}

interface SolBrief {
  sol: number;
  sourceBadge: string;
  datasetTag: string;
  question: string;
  hint: string;
  physicsNote: string;
  goalLabel: string;
  goalType: 'block_flare' | 'upload_rover' | 'charge_o2' | 'upload_neo';
  photoUrl: string;
  photoCaption: string;
  photoCredit: string;
  isLiveTag: boolean;
}

interface BilingualText {
  en: string;
  ar: string;
}

interface ScienceCard {
  sol: number;
  title: BilingualText;
  agency: BilingualText;
  category: BilingualText;
  fact: BilingualText;
  protocolNote: BilingualText;
}

interface GlossaryTerm {
  id: string;
  term: BilingualText;
  shortDesc: BilingualText;
  detail: BilingualText;
  source: BilingualText;
}

interface Resources {
  oxygen: number;
  radiation: number;
  science: number;
}

interface PlayerTelemetry {
  flaresBlocked: number;
  flaresTotal: number;
  signalsSent: number;
  signalsCancelled: number;
  podSavesUsed: number;
  switchToggles: number;
}

interface SavedMissionRecord {
  planet: PlanetId;
  commanderName: string;
  science: number;
  oxygen: number;
  radiation: number;
  rankTitle: BilingualText;
  flaresBlocked: number;
  flaresTotal: number;
  signalsSent: number;
  podSavesUsed: number;
  switchToggles: number;
  completedAt: string;
}

type MissionLogMap = {
  moon?: SavedMissionRecord;
  mars?: SavedMissionRecord;
};

const MISSION_LOG_STORAGE_KEY = 'astrokids_mission_log_v1';

function isValidSavedRecord(rec: unknown): rec is SavedMissionRecord {
  if (!rec || typeof rec !== 'object') return false;
  const r = rec as Partial<SavedMissionRecord>;
  return (
    (r.planet === 'moon' || r.planet === 'mars') &&
    typeof r.commanderName === 'string' &&
    typeof r.science === 'number' &&
    typeof r.oxygen === 'number' &&
    typeof r.radiation === 'number' &&
    Boolean(r.rankTitle && typeof r.rankTitle.en === 'string' && typeof r.rankTitle.ar === 'string')
  );
}

function readMissionLog(): MissionLogMap {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return {};
    const raw = window.localStorage.getItem(MISSION_LOG_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== 'object') return {};
    const clean: MissionLogMap = {};
    if (isValidSavedRecord(parsed.moon)) clean.moon = parsed.moon;
    if (isValidSavedRecord(parsed.mars)) clean.mars = parsed.mars;
    return clean;
  } catch {
    return {};
  }
}

function writeMissionLog(log: MissionLogMap): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(MISSION_LOG_STORAGE_KEY, JSON.stringify(log));
  } catch {
    // Ignore storage quota or sandbox restrictions gracefully
  }
}

const NASA_API_KEY = '9GQDwPLLqJhfDnpgLrRbDmp9FLKzTHt9kgzJdRN7';
const SOL_DURATION_SEC = 16;
const MOON_SIGNAL_SEC = 1.3;
const MARS_SIGNAL_SEC = 5.0;

interface AtmosphericStats {
  tempC: number;
  pressureVal: number;
  dustPct: number;
}

const TREK_SOL_VARIATIONS: Record<PlanetId, AtmosphericStats[]> = {
  mars: [
    { tempC: -63.4, pressureVal: 718, dustPct: 27 },
    { tempC: -61.8, pressureVal: 724, dustPct: 30 },
    { tempC: -58.9, pressureVal: 731, dustPct: 41 },
    { tempC: -64.2, pressureVal: 712, dustPct: 33 },
    { tempC: -62.1, pressureVal: 721, dustPct: 28 },
    { tempC: -56.7, pressureVal: 739, dustPct: 46 },
    { tempC: -65.5, pressureVal: 706, dustPct: 31 },
    { tempC: -60.4, pressureVal: 728, dustPct: 26 },
    { tempC: -57.2, pressureVal: 742, dustPct: 49 },
    { tempC: -61.0, pressureVal: 725, dustPct: 29 },
  ],
  moon: [
    { tempC: -118.4, pressureVal: 0.31, dustPct: 14 },
    { tempC: -115.2, pressureVal: 0.34, dustPct: 16 },
    { tempC: -108.6, pressureVal: 0.41, dustPct: 23 },
    { tempC: -122.1, pressureVal: 0.29, dustPct: 15 },
    { tempC: -119.5, pressureVal: 0.32, dustPct: 13 },
    { tempC: -106.4, pressureVal: 0.43, dustPct: 25 },
    { tempC: -124.8, pressureVal: 0.28, dustPct: 14 },
    { tempC: -116.9, pressureVal: 0.35, dustPct: 12 },
    { tempC: -104.7, pressureVal: 0.45, dustPct: 24 },
    { tempC: -114.0, pressureVal: 0.33, dustPct: 15 },
  ],
};

const CURATED_DONKI_FLARES: FlareRecord[] = [
  {
    id: '2024-05-14T16:46:00-FLR-001',
    classType: 'X8.7',
    beginTime: '2024-05-14 16:46 UTC',
    sourceLocation: 'AR3664 (S18W89)',
    severity: 'Extreme',
  },
  {
    id: '2024-10-03T12:08:00-FLR-001',
    classType: 'X9.0',
    beginTime: '2024-10-03 12:08 UTC',
    sourceLocation: 'AR3842 (S17W09)',
    severity: 'Extreme',
  },
  {
    id: '2025-02-23T19:15:00-FLR-001',
    classType: 'M4.9',
    beginTime: '2025-02-23 19:15 UTC',
    sourceLocation: 'AR4001 (N12W45)',
    severity: 'Strong',
  },
  {
    id: '2025-03-28T15:10:00-FLR-001',
    classType: 'M7.2',
    beginTime: '2025-03-28 15:10 UTC',
    sourceLocation: 'AR4046 (N08E22)',
    severity: 'Strong',
  },
  {
    id: '2024-08-14T06:24:00-FLR-001',
    classType: 'M6.3',
    beginTime: '2024-08-14 06:24 UTC',
    sourceLocation: 'AR3784 (N14E30)',
    severity: 'Strong',
  },
  {
    id: '2024-07-29T02:15:00-FLR-001',
    classType: 'C9.4',
    beginTime: '2024-07-29 02:15 UTC',
    sourceLocation: 'AR3766 (S11W15)',
    severity: 'Moderate',
  },
];

const CURATED_APOD: ApodData = {
  title: 'Jezero Crater Delta & Ancient Martian Shoreline',
  url: '',
  explanation:
    'NASA orbiters and the Perseverance rover study ancient river deltas inside Mars Jezero Crater—searching for signs of past water while measuring surface radiation for future human explorers.',
  date: 'Verified NASA Archive',
  copyright: 'NASA / JPL-Caltech / Mars Trek',
};

const CURATED_DONKI_CMES: CmeRecord[] = [
  {
    id: '2024-05-14T17:12:00-CME-001',
    startTime: '2024-05-14 17:12 UTC',
    speed: 1420,
    halfAngle: 48,
    note: 'Fast halo Coronal Mass Ejection linked with Region AR3664.',
    severity: 'Extreme',
  },
  {
    id: '2024-10-03T12:36:00-CME-001',
    startTime: '2024-10-03 12:36 UTC',
    speed: 1180,
    halfAngle: 42,
    note: 'Bright coronal wave recorded by SOHO/LASCO coronagraphs.',
    severity: 'Fast',
  },
  {
    id: '2025-02-24T04:18:00-CME-001',
    startTime: '2025-02-24 04:18 UTC',
    speed: 890,
    halfAngle: 34,
    note: 'Charged solar plasma stream crossing inner planet orbits.',
    severity: 'Fast',
  },
];

const CURATED_ROVER_PHOTOS: RoverPhoto[] = [
  {
    id: 'perseverance-jezero-delta',
    imgSrc: '',
    earthDate: '2025-02-18',
    sol: 1420,
    camera: 'Mastcam-Z Left (ZCAM)',
    rover: 'Perseverance',
  },
  {
    id: 'perseverance-neretva-rim',
    imgSrc: '',
    earthDate: '2025-03-02',
    sol: 1432,
    camera: 'Navigation Camera (NAVCAM)',
    rover: 'Perseverance',
  },
  {
    id: 'perseverance-sample-core',
    imgSrc: '',
    earthDate: '2025-03-14',
    sol: 1444,
    camera: 'WATSON / SHERLOC',
    rover: 'Perseverance',
  },
];

const CURATED_NEOS: NeoRecord[] = [
  {
    id: 'neo-2026-va',
    name: '(2026 VA)',
    speedKmH: 48200,
    missKm: 1840000,
    hazardous: false,
  },
  {
    id: 'neo-99942-apophis',
    name: '99942 Apophis',
    speedKmH: 30700,
    missKm: 3160000,
    hazardous: true,
  },
];

const SCIENCE_CARDS: ScienceCard[] = [
  {
    sol: 1,
    title: { en: 'Hydroponic Space Lettuce', ar: 'خس الفضاء بالزراعة المائية' },
    agency: { en: 'CSA & NASA Veggie', ar: 'وكالة الفضاء الكندية وناسا' },
    category: { en: 'Space Farming · CSA', ar: 'زراعة الفضاء · CSA' },
    fact: {
      en: 'Astronauts already grow red romaine lettuce and dwarf tomatoes without soil! Roots sip nutrient water while LED lights act like artificial sunlight.',
      ar: 'يزرع رواد الفضاء الخس والطماطم القزمية بدون تربة! تمتص الجذور ماءً غنياً بالمعادن بينما تعمل مصابيح LED كضوء شمس صناعي.',
    },
    protocolNote: {
      en: 'Greenhouse modules scrub carbon dioxide and release fresh oxygen for the crew.',
      ar: 'تمتص البيوت المحمية ثاني أكسيد الكربون وتطلق أكسجيناً نقياً للطاقم.',
    },
  },
  {
    sol: 2,
    title: { en: 'Solar Storm Forecasting', ar: 'التنبؤ بالعواصف الشمسية' },
    agency: { en: 'NASA DONKI', ar: 'نظام ناسا DONKI' },
    category: { en: 'Space Weather · DONKI', ar: 'طقس الفضاء · DONKI' },
    fact: {
      en: 'NASA DONKI watches the Sun 24/7 for solar flares—giant bursts of energy that race across space and require astronauts to shelter behind thick shields.',
      ar: 'يراقب نظام DONKI من ناسا الشمس طوال اليوم لرصد التوهجات الشمسية—انفجارات طاقة هائلة تتطلب من الرواد الاحتماء خلف دروع قوية.',
    },
    protocolNote: {
      en: 'Real crews get early space-weather alerts minutes to hours before radiation peaks.',
      ar: 'تتلقى الطواقم الحقيقية تنبيهات مبكرة قبل وصول ذروة الإشعاع.',
    },
  },
  {
    sol: 3,
    title: { en: 'Counting Space Radiation', ar: 'قياس الإشعاع الفضائي' },
    agency: { en: 'NASA RadLab', ar: 'مختبر الإشعاع RadLab' },
    category: { en: 'Radiation · RadLab', ar: 'الإشعاع · RadLab' },
    fact: {
      en: 'On Mars, Curiosity’s RAD detector measured about 0.67 mSv of radiation per day—over 100 times higher than a normal day on Earth!',
      ar: 'على المريخ، قاس جهاز RAD التابع لمركبة كيوريوسيتي حوالي 0.67 مللي سيفرت يومياً—أعلى بأكثر من 100 مرة من يوم عادي على الأرض!',
    },
    protocolNote: {
      en: 'Shield generators and regolith walls keep absorbed dose safely below NASA limits.',
      ar: 'تُبقي الدروع الواقية الجرعة الممتصة ضمن الحدود الآمنة لوكالة ناسا.',
    },
  },
  {
    sol: 4,
    title: { en: 'Speed-of-Light Comms', ar: 'اتصالات بسرعة الضوء' },
    agency: { en: 'NASA Deep Space Network', ar: 'شبكة الفضاء العميق' },
    category: { en: 'Geology · Mars Trek', ar: 'المريخ · Mars Trek' },
    fact: {
      en: 'Radio waves travel at the speed of light! A message to the Moon takes just 1.3 seconds, while a message to Mars can take 4 to 22 minutes one way.',
      ar: 'تنتقل موجات الراديو بسرعة الضوء! تستغرق الرسالة من القمر 1.3 ثانية فقط، بينما تستغرق من المريخ 4 إلى 22 دقيقة في اتجاه واحد.',
    },
    protocolNote: {
      en: 'Mission planners schedule continuous antenna passes so uploads never cut off mid-stream.',
      ar: 'يجدول مهندسو ناسا فترات اتصال متواصلة حتى لا ينقطع الإرسال في منتصف الطريق.',
    },
  },
  {
    sol: 5,
    title: { en: 'Plant Roots in Low Gravity', ar: 'نمو الجذور في الجاذبية الضعيفة' },
    agency: { en: 'NASA OSDR', ar: 'مستودع بيانات ناسا OSDR' },
    category: { en: 'Biology · OSDR', ar: 'أحياء الفضاء · OSDR' },
    fact: {
      en: 'OSDR experiments show that without strong Earth gravity, plant roots use blue and red light cues—not weight—to figure out which way is down!',
      ar: 'أظهرت تجارب OSDR أنه في غياب جاذبية الأرض القوية، تستخدم جذور النباتات ألوان الضوء الأزرق والأحمر لتعرف اتجاه النمو!',
    },
    protocolNote: {
      en: 'Automated LED spectra keep hydroponic crops thriving on the Moon and Mars.',
      ar: 'تحافظ أطياف LED الذكية على نمو المحاصيل المائية في القمر والمريخ.',
    },
  },
  {
    sol: 6,
    title: { en: 'Water Ice at Lunar Poles', ar: 'الجليد المائي في أقطاب القمر' },
    agency: { en: 'NASA Artemis', ar: 'برنامج أرتميس · ناسا' },
    category: { en: 'Space Weather · DONKI', ar: 'أرتميس · القمر' },
    fact: {
      en: 'Inside permanently shadowed craters near the Moon’s South Pole, frozen water ice can be melted for drinking, oxygen, and even rocket fuel!',
      ar: 'داخل الفوهات المظلمة دائماً عند القطب الجنوبي للقمر، يوجد جليد ماء يمكن إذابته للشرب وصناعة الأكسجين ووقود الصواريخ!',
    },
    protocolNote: {
      en: 'Splitting H2O gives astronauts both breathable O2 and hydrogen propellant.',
      ar: 'تفكيك جزيء الماء يمنح الرواد أكسجيناً للتنفس وهيدروجيناً للوقود.',
    },
  },
  {
    sol: 7,
    title: { en: 'Microbes Help Space Crops', ar: 'ميكروبات تساعد نباتات الفضاء' },
    agency: { en: 'NASA OSDR & CSA', ar: 'ناسا OSDR ووكالة كندا' },
    category: { en: 'Biology · OSDR', ar: 'أحياء الفضاء · OSDR' },
    fact: {
      en: 'Helpful bacteria studied in NASA OSDR datasets team up with plant roots to unlock minerals, helping space veggies grow faster using less fertilizer.',
      ar: 'تتعاون البكتيريا النافعة في أبحاث OSDR مع جذور النباتات لامتصاص المعادن، مما يسرّع نمو الخضروات الفضائية بسماد أقل.',
    },
    protocolNote: {
      en: 'Healthy microbiomes make closed-loop greenhouses far more resilient.',
      ar: 'الميكروبيوم الصحي يجعل البيوت المحمية المغلقة أكثر استدامة.',
    },
  },
  {
    sol: 8,
    title: { en: 'Mars Dust & Solar Power', ar: 'غبار المريخ والطاقة الشمسية' },
    agency: { en: 'NASA Mars Trek', ar: 'خرائط Mars Trek' },
    category: { en: 'Geology · Mars Trek', ar: 'المريخ · Mars Trek' },
    fact: {
      en: 'Global dust storms on Mars can dim sunlight for weeks! That is why Martian bases carefully ration battery power between life support and science.',
      ar: 'يمكن للعواصف الترابية على المريخ أن تحجب ضوء الشمس لأسابيع! لذلك ترشّد القواعد المريخية طاقة البطاريات بدقة بين دعم الحياة والعلوم.',
    },
    protocolNote: {
      en: 'Strict power-shedding rules protect crew oxygen before optional experiments.',
      ar: 'قواعد توزيع الطاقة تحمي أكسجين الطاقم أولاً قبل التجارب الإضافية.',
    },
  },
  {
    sol: 9,
    title: { en: 'DNA Repair in Orbit', ar: 'إصلاح الحمض النووي في الفضاء' },
    agency: { en: 'NASA OSDR & RadLab', ar: 'ناسا OSDR وRadLab' },
    category: { en: 'Radiation · RadLab', ar: 'الإشعاع · RadLab' },
    fact: {
      en: 'NASA Twin Study and OSDR cell biology research discovered how astronaut cells activate special repair genes when exposed to space radiation.',
      ar: 'كشفت دراسة التوأم وبيانات OSDR كيف تنشّط خلايا رواد الفضاء جينات إصلاح خاصة عند التعرض لإشعاع الفضاء.',
    },
    protocolNote: {
      en: 'Keeping Radiation Safety high protects both astronaut health and lab samples.',
      ar: 'الحفاظ على أمان الإشعاع يحمي صحة الرواد وعينات المختبر معاً.',
    },
  },
  {
    sol: 10,
    title: { en: 'Nectar & Bioregenerative Life', ar: 'مشروع نكتار والزراعة المغلقة' },
    agency: { en: 'CSA Space Agriculture', ar: 'الزراعة الفضائية الكندية' },
    category: { en: 'Space Farming · CSA', ar: 'زراعة الفضاء · CSA' },
    fact: {
      en: 'Canadian Space Agency engineers test automated greenhouses for Arctic and space habitats—producing fresh greens even when no supply rocket can visit for months!',
      ar: 'يختبر مهندسو وكالة الفضاء الكندية بيوتاً زراعية ذكية تعمل ذاتياً في القطب الشمالي والفضاء—لإنتاج خضروات طازجة لأشهر دون صواريخ إمداد!',
    },
    protocolNote: {
      en: 'Combining Shielding, Hydroponics, and Comms makes deep-space outposts sustainable.',
      ar: 'الجمع بين الدرع والزراعة المائية والاتصالات يصنع قواعد فضائية مستدامة.',
    },
  },
];

const GLOSSARY_TERMS: GlossaryTerm[] = [
  {
    id: 'sol',
    term: { en: 'Sol', ar: 'صول (Sol)' },
    shortDesc: {
      en: 'One full day on Mars (or a mission day cycle).',
      ar: 'يوم كامل على كوكب المريخ (أو دورة يوم مهمّة فضائية).',
    },
    detail: {
      en: 'A Martian Sol lasts 24 hours and 39 minutes—almost the same length as an Earth day! A Lunar day lasts 29.5 Earth days, so Artemis crews use 24-hour mission Sols to stay on schedule.',
      ar: 'يدوم اليوم المريخي (Sol) 24 ساعة و39 دقيقة—قريب جداً من يوم الأرض! بينما يدوم يوم القمر 29.5 يوماً أرضياً، لذا يستخدم رواد أرتميس دورة 24 ساعة للتنظيم.',
    },
    source: { en: 'NASA Mars Exploration Program', ar: 'برنامج استكشاف المريخ · ناسا' },
  },
  {
    id: 'flare',
    term: { en: 'Solar Flare', ar: 'التوهج الشمسي' },
    shortDesc: {
      en: 'A sudden giant flash of energy & particles from the Sun.',
      ar: 'انفجار مفاجئ وهائل للطاقة والجسيمات من الشمس.',
    },
    detail: {
      en: 'NASA’s DONKI system tracks C, M, and X-class solar flares. X-class flares are the strongest! Without a Radiation Shield, fast solar particles can raise radiation inside a base.',
      ar: 'يتتبع نظام DONKI من ناسا التوهجات الشمسية من الفئات C وM وX، والفئة X هي الأقوى! بدون الدرع الواقي، ترفع الجسيمات الشمسية الإشعاع داخل القاعدة.',
    },
    source: { en: 'NASA DONKI Space Weather', ar: 'طقس الفضاء DONKI · ناسا' },
  },
  {
    id: 'dose',
    term: { en: 'Absorbed Dose', ar: 'الجرعة الممتصة' },
    shortDesc: {
      en: 'How much space radiation reaches astronauts, measured in mSv.',
      ar: 'كمية الإشعاع الفضائي التي تصل للرواد وتُقاس بالمللي سيفرت (mSv).',
    },
    detail: {
      en: 'Scientists at NASA RadLab measure radiation in milliSieverts (mSv). On Earth, our atmosphere protects us (~0.008 mSv/day). In deep space, shields lower the dose to keep crews safe.',
      ar: 'يقيس علماء RadLab الإشعاع بوحدة mSv. على الأرض يحمينا الغلاف الجوي (~0.008 يومياً)، وفي الفضاء تقلل الدروع هذه الجرعة لحماية الرواد.',
    },
    source: { en: 'NASA RadLab & MSL-RAD', ar: 'مختبر RadLab · ناسا' },
  },
  {
    id: 'delay',
    term: { en: 'Signal Delay', ar: 'تأخر الإشارة' },
    shortDesc: {
      en: 'How long radio waves take to travel through space to Earth.',
      ar: 'الوقت الذي تستغرقه موجات الراديو للوصول إلى الأرض عبر الفضاء.',
    },
    detail: {
      en: 'Even at the speed of light (300,000 km/s), Mars is so far away that signals take minutes to arrive! Turning your dish off early cancels the wave before Earth receives it.',
      ar: 'حتى بسرعة الضوء (300,000 كم/ثانية)، المريخ بعيد جداً فتستغرق الإشارة دقائق للوصول! إغلاق الطبق مبكراً يلغي الموجة قبل وصولها للأرض.',
    },
    source: { en: 'NASA Deep Space Network', ar: 'شبكة الفضاء العميق · ناسا' },
  },
  {
    id: 'hydroponics',
    term: { en: 'Hydroponics', ar: 'الزراعة المائية' },
    shortDesc: {
      en: 'Growing plants in mineral-rich water without soil.',
      ar: 'زراعة النباتات في ماء غني بالمعادن دون الحاجة إلى تربة.',
    },
    detail: {
      en: 'Moon and Mars dirt lacks nutrients needed for Earth plants. CSA space-farming greenhouses mist plant roots with water and nutrients while capturing O2 for astronauts to breathe!',
      ar: 'تربة القمر والمريخ تفتقر لعناصر الزراعة، لذا ترش البيوت المحمية الكندية جذور النباتات بالماء والمغذيات وتنتج الأكسجين للرواد!',
    },
    source: { en: 'Canadian Space Agency (CSA)', ar: 'وكالة الفضاء الكندية (CSA)' },
  },
];

const FLARE_SOLS = new Set([2, 4, 5, 7, 8, 9, 10]);

// ============================================================================
// PROCEDURAL WEB AUDIO ENGINE (AMBIENT SPACE OUTPOST LOOP + SFX)
// ============================================================================

class SpaceAudio {
  private ctx: AudioContext | null = null;
  public muted = false;
  public ambientEnabled = true;
  public spaceWindEnabled = true;
  public sfxEnabled = true;

  // Ambient space outpost synthesizer nodes
  private ambientRunning = false;
  private ambientMasterGain: GainNode | null = null;
  private ambientFilter: BiquadFilterNode | null = null;
  private oscLow: OscillatorNode | null = null;
  private oscFifth: OscillatorNode | null = null;
  private oscPad: OscillatorNode | null = null;
  private oscPulse: OscillatorNode | null = null;
  private lfoOsc: OscillatorNode | null = null;
  private pulseLfoOsc: OscillatorNode | null = null;

  // Procedural space wind synthesizer nodes (modulated by planetary dust %)
  private windRunning = false;
  private windMasterGain: GainNode | null = null;
  private windFilter: BiquadFilterNode | null = null;
  private windSource: AudioBufferSourceNode | null = null;
  private windLfoOsc: OscillatorNode | null = null;
  private currentDustPct = 27;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    try {
      if (!this.ctx) {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!AudioCtx) return null;
        this.ctx = new AudioCtx();
      }
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return this.ctx;
    } catch {
      return null;
    }
  }

  public unlock() {
    const ctx = this.getContext();
    if (!ctx || this.muted) return;
    if (this.ambientEnabled && !this.ambientRunning) {
      this.startAmbient();
    }
    if (this.spaceWindEnabled && !this.windRunning) {
      this.startSpaceWind();
    }
  }

  public startAmbient() {
    if (this.muted || !this.ambientEnabled) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      if (this.ambientRunning && this.ambientMasterGain) {
        this.ambientMasterGain.gain.setTargetAtTime(0.048, ctx.currentTime, 0.35);
        return;
      }

      const now = ctx.currentTime;
      const master = ctx.createGain();
      master.gain.setValueAtTime(0.0001, now);
      master.gain.setTargetAtTime(0.048, now, 0.5);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(250, now);
      filter.Q.setValueAtTime(1.5, now);

      // Layer 1: Warm deep outpost hull drone (A1 + E2 fifth)
      const oscLow = ctx.createOscillator();
      oscLow.type = 'sine';
      oscLow.frequency.setValueAtTime(55, now);

      const oscFifth = ctx.createOscillator();
      oscFifth.type = 'sine';
      oscFifth.frequency.setValueAtTime(82.41, now);
      const fifthGain = ctx.createGain();
      fifthGain.gain.setValueAtTime(0.55, now);

      // Layer 2: Soft life-support harmonic shimmer (A2 triangle)
      const oscPad = ctx.createOscillator();
      oscPad.type = 'triangle';
      oscPad.frequency.setValueAtTime(110, now);
      const padGain = ctx.createGain();
      padGain.gain.setValueAtTime(0.28, now);

      // Layer 3: Soft space synth pulse (A3 sine modulated gently at 0.4 Hz)
      const oscPulse = ctx.createOscillator();
      oscPulse.type = 'sine';
      oscPulse.frequency.setValueAtTime(220, now);
      const pulseGain = ctx.createGain();
      pulseGain.gain.setValueAtTime(0.08, now);

      const pulseLfo = ctx.createOscillator();
      pulseLfo.type = 'sine';
      pulseLfo.frequency.setValueAtTime(0.42, now);
      const pulseLfoGain = ctx.createGain();
      pulseLfoGain.gain.setValueAtTime(0.06, now);
      pulseLfo.connect(pulseLfoGain);
      pulseLfoGain.connect(pulseGain.gain);

      // Gentle LFO breathing on the filter cutoff
      const lfo = ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(0.16, now);
      const lfoGain = ctx.createGain();
      lfoGain.gain.setValueAtTime(80, now);
      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);

      oscLow.connect(filter);
      oscFifth.connect(fifthGain);
      fifthGain.connect(filter);
      oscPad.connect(padGain);
      padGain.connect(filter);
      oscPulse.connect(pulseGain);
      pulseGain.connect(filter);

      filter.connect(master);
      master.connect(ctx.destination);

      oscLow.start(now);
      oscFifth.start(now);
      oscPad.start(now);
      oscPulse.start(now);
      lfo.start(now);
      pulseLfo.start(now);

      this.ambientMasterGain = master;
      this.ambientFilter = filter;
      this.oscLow = oscLow;
      this.oscFifth = oscFifth;
      this.oscPad = oscPad;
      this.oscPulse = oscPulse;
      this.lfoOsc = lfo;
      this.pulseLfoOsc = pulseLfo;
      this.ambientRunning = true;
    } catch {
      // Ignore Web Audio restriction errors gracefully
    }
  }

  public updateAmbientGain() {
    try {
      if (!this.ctx || !this.ambientMasterGain) {
        if (!this.muted && this.ambientEnabled) {
          this.startAmbient();
        }
        return;
      }
      const shouldPlay = !this.muted && this.ambientEnabled;
      const target = shouldPlay ? 0.048 : 0.0001;
      this.ambientMasterGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.25);
      if (shouldPlay && !this.ambientRunning) {
        this.startAmbient();
      }
    } catch {
      // Ignore Web Audio errors gracefully
    }
  }

  public setSolarFlarePitchShift(stage: 'none' | 'warning' | 'active') {
    if (!this.ctx || !this.ambientRunning || !this.oscLow || !this.oscFifth || !this.oscPad || !this.ambientFilter) {
      return;
    }
    try {
      const now = this.ctx.currentTime;
      const mult = stage === 'active' ? 1.122 : stage === 'warning' ? 1.059 : 1.0;
      const filterFreq = stage === 'active' ? 430 : stage === 'warning' ? 330 : 250;

      this.oscLow.frequency.setTargetAtTime(55 * mult, now, 0.45);
      this.oscFifth.frequency.setTargetAtTime(82.41 * mult, now, 0.45);
      this.oscPad.frequency.setTargetAtTime(110 * mult, now, 0.45);
      if (this.oscPulse) {
        this.oscPulse.frequency.setTargetAtTime(220 * mult, now, 0.45);
      }
      this.ambientFilter.frequency.setTargetAtTime(filterFreq, now, 0.45);
    } catch {
      // Ignore Web Audio errors gracefully
    }
  }

  private computeWindGain(dustPct: number): number {
    const norm = Math.max(0, Math.min(1, dustPct / 100));
    return 0.008 + Math.pow(norm, 1.35) * 0.085;
  }

  public startSpaceWind() {
    if (this.muted || !this.spaceWindEnabled) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      if (this.windRunning && this.windMasterGain) {
        this.updateSpaceWindGain();
        return;
      }

      const now = ctx.currentTime;
      const sampleRate = ctx.sampleRate || 44100;
      const durationSec = 3;
      const bufferSize = Math.max(1, Math.floor(sampleRate * durationSec));
      const buffer = ctx.createBuffer(1, bufferSize, sampleRate);
      const data = buffer.getChannelData(0);

      // Smooth leaky-integrated pink/brown noise for warm, realistic planetary wind
      let last = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        last = (last + 0.045 * white) / 1.045;
        data[i] = last * 3.2;
      }
      // Crossfade loop ends so the 3-second wind buffer loops seamlessly without clicks
      const fadeLen = Math.min(2048, Math.floor(bufferSize / 8));
      for (let i = 0; i < fadeLen; i++) {
        const alpha = i / fadeLen;
        const tailIdx = bufferSize - fadeLen + i;
        const blended = data[tailIdx] * (1 - alpha) + data[i] * alpha;
        data[i] = blended;
        data[tailIdx] = blended;
      }

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;

      const norm = Math.max(0, Math.min(1, this.currentDustPct / 100));
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(220 + norm * 520, now);
      filter.Q.setValueAtTime(1.4 + norm * 1.4, now);

      // Slow atmospheric gust LFO sweeping the bandpass center frequency
      const gustLfo = ctx.createOscillator();
      gustLfo.type = 'sine';
      gustLfo.frequency.setValueAtTime(0.14, now);
      const gustLfoGain = ctx.createGain();
      gustLfoGain.gain.setValueAtTime(110, now);
      gustLfo.connect(gustLfoGain);
      gustLfoGain.connect(filter.frequency);

      const master = ctx.createGain();
      master.gain.setValueAtTime(0.0001, now);
      master.gain.setTargetAtTime(this.computeWindGain(this.currentDustPct), now, 0.45);

      source.connect(filter);
      filter.connect(master);
      master.connect(ctx.destination);

      source.start(now);
      gustLfo.start(now);

      this.windSource = source;
      this.windFilter = filter;
      this.windLfoOsc = gustLfo;
      this.windMasterGain = master;
      this.windRunning = true;
    } catch {
      // Ignore Web Audio restriction errors gracefully
    }
  }

  public updateSpaceWindGain() {
    try {
      if (!this.ctx || !this.windMasterGain) {
        if (!this.muted && this.spaceWindEnabled) {
          this.startSpaceWind();
        }
        return;
      }
      const shouldPlay = !this.muted && this.spaceWindEnabled;
      const target = shouldPlay ? this.computeWindGain(this.currentDustPct) : 0.0001;
      this.windMasterGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.25);
      if (shouldPlay && !this.windRunning) {
        this.startSpaceWind();
      }
    } catch {
      // Ignore Web Audio errors gracefully
    }
  }

  public setDustLevel(dustPct: number) {
    this.currentDustPct = Math.max(0, Math.min(100, Number.isFinite(dustPct) ? dustPct : 20));
    if (!this.ctx || !this.windRunning || !this.windMasterGain || !this.windFilter) {
      return;
    }
    try {
      const now = this.ctx.currentTime;
      const norm = this.currentDustPct / 100;
      const targetGain = !this.muted && this.spaceWindEnabled ? this.computeWindGain(this.currentDustPct) : 0.0001;
      this.windMasterGain.gain.setTargetAtTime(targetGain, now, 0.35);
      this.windFilter.frequency.setTargetAtTime(220 + norm * 520, now, 0.35);
      this.windFilter.Q.setTargetAtTime(1.4 + norm * 1.4, now, 0.35);
    } catch {
      // Ignore Web Audio errors gracefully
    }
  }

  private getSfxContext(): AudioContext | null {
    if (this.muted || !this.sfxEnabled) return null;
    return this.getContext();
  }

  public playSwitch(isOn: boolean) {
    const ctx = this.getSfxContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Stage 1: Crisp mechanical snap impulse
    const snap = ctx.createOscillator();
    const snapGain = ctx.createGain();
    snap.type = 'square';
    snap.frequency.setValueAtTime(isOn ? 1450 : 980, now);
    snap.frequency.exponentialRampToValueAtTime(isOn ? 620 : 320, now + 0.024);
    snapGain.gain.setValueAtTime(0.06, now);
    snapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.028);
    snap.connect(snapGain);
    snapGain.connect(ctx.destination);
    snap.start(now);
    snap.stop(now + 0.032);

    // Stage 2: Sci-fi synth power confirmation blip
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(isOn ? 380 : 310, now + 0.015);
    osc.frequency.exponentialRampToValueAtTime(isOn ? 760 : 165, now + 0.095);
    gain.gain.setValueAtTime(0.13, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now + 0.015);
    osc.stop(now + 0.12);
  }

  public playCycleOff() {
    const ctx = this.getSfxContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(460, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.12);
    gain.gain.setValueAtTime(0.09, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.14);
  }

  public playRadioBeep() {
    const ctx = this.getSfxContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    // Cosmic 3-note telemetry chirp
    [1046.5, 1318.5, 1567.98].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.055);
      gain.gain.setValueAtTime(0.065, now + idx * 0.055);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.055 + 0.09);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.055);
      osc.stop(now + idx * 0.055 + 0.1);
    });
  }

  public playSignalSuccess() {
    const ctx = this.getSfxContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [784, 987.77, 1318.5].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.07);
      gain.gain.setValueAtTime(0.09, now + idx * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.07);
      osc.stop(now + idx * 0.07 + 0.2);
    });
  }

  public playSignalCancel() {
    const ctx = this.getSfxContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(340, now);
    osc.frequency.exponentialRampToValueAtTime(125, now + 0.19);
    gain.gain.setValueAtTime(0.07, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.21);
  }

  public playFlareAlarm() {
    const ctx = this.getSfxContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    // Dramatic sci-fi solar storm alert siren (3 sweeps)
    [0, 0.19, 0.38].forEach((offset) => {
      const osc = ctx.createOscillator();
      const sub = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      sub.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now + offset);
      osc.frequency.linearRampToValueAtTime(987.77, now + offset + 0.14);
      sub.frequency.setValueAtTime(293.66, now + offset);
      sub.frequency.linearRampToValueAtTime(493.88, now + offset + 0.14);
      gain.gain.setValueAtTime(0.11, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.17);
      osc.connect(gain);
      sub.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + offset);
      sub.start(now + offset);
      osc.stop(now + offset + 0.18);
      sub.stop(now + offset + 0.18);
    });
  }

  public playCardUnlock() {
    const ctx = this.getSfxContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.068);
      gain.gain.setValueAtTime(0.095, now + i * 0.068);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.068 + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.068);
      osc.stop(now + i * 0.068 + 0.32);
    });
  }

  public playPodSave() {
    const ctx = this.getSfxContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [392, 493.88, 587.33].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.1);
      gain.gain.setValueAtTime(0.1, now + i * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.1);
      osc.stop(now + i * 0.1 + 0.27);
    });
  }

  public playVictoryFanfare() {
    const ctx = this.getSfxContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = [
      { freq: 523.25, t: 0, dur: 0.14 },
      { freq: 659.25, t: 0.12, dur: 0.14 },
      { freq: 783.99, t: 0.24, dur: 0.14 },
      { freq: 1046.5, t: 0.38, dur: 0.45 },
      { freq: 783.99, t: 0.38, dur: 0.45 },
    ];
    notes.forEach(({ freq, t, dur }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + t);
      gain.gain.setValueAtTime(0.11, now + t);
      gain.gain.exponentialRampToValueAtTime(0.001, now + t + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + t);
      osc.stop(now + t + dur + 0.02);
    });
  }

  public playLaunchRocket() {
    const ctx = this.getSfxContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Rising playful rocket thrust sweep
    const thrust = ctx.createOscillator();
    const thrustGain = ctx.createGain();
    thrust.type = 'triangle';
    thrust.frequency.setValueAtTime(140, now);
    thrust.frequency.exponentialRampToValueAtTime(620, now + 0.55);
    thrustGain.gain.setValueAtTime(0.02, now);
    thrustGain.gain.linearRampToValueAtTime(0.14, now + 0.14);
    thrustGain.gain.exponentialRampToValueAtTime(0.001, now + 0.62);
    thrust.connect(thrustGain);
    thrustGain.connect(ctx.destination);
    thrust.start(now);
    thrust.stop(now + 0.64);

    // Filtered rocket rumble burst
    const bufferSize = Math.floor(ctx.sampleRate * 0.45);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(260, now);
    filter.frequency.exponentialRampToValueAtTime(900, now + 0.42);
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.12, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noise.start(now);

    // Cheerful liftoff sparkle chime
    [523.25, 783.99, 1046.5].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + 0.18 + idx * 0.08);
      gain.gain.setValueAtTime(0.08, now + 0.18 + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18 + idx * 0.08 + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + 0.18 + idx * 0.08);
      osc.stop(now + 0.18 + idx * 0.08 + 0.24);
    });
  }
}

const soundFX = new SpaceAudio();

// ============================================================================
// MAIN SINGLE-FILE APPLICATION
// ============================================================================

export default function App() {
  // Language & UI direction
  const [lang, setLang] = useState<Lang>('en');
  const t = useCallback((en: string, ar: string) => (lang === 'ar' ? ar : en), [lang]);

  // Game progression & world state
  const [phase, setPhase] = useState<GamePhase>('TITLE_MENU');
  const [commanderInput, setCommanderInput] = useState<string>('');
  const [planet, setPlanet] = useState<PlanetId>('mars');
  const [sol, setSol] = useState<number>(1);
  const [solElapsed, setSolElapsed] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [sfxOn, setSfxOn] = useState<boolean>(true);
  const [ambientOn, setAmbientOn] = useState<boolean>(true);
  const [spaceWindOn, setSpaceWindOn] = useState<boolean>(true);
  const [autoReadAloud, setAutoReadAloud] = useState<boolean>(false);

  // Player enters their own name freely; fallback only if empty
  const commanderName = useMemo(() => {
    const trimmed = commanderInput.trim();
    if (!trimmed) {
      return lang === 'ar' ? 'القائد الصغير' : 'Junior Commander';
    }
    return trimmed;
  }, [commanderInput, lang]);

  // Power queue (2 out of 3 rule: max 2 rooms active simultaneously)
  const [activeRooms, setActiveRooms] = useState<RoomId[]>(['shield', 'greenhouse']);
  const [cycledNotice, setCycledNotice] = useState<string | null>(null);

  // Resources (0-100)
  const [resources, setResources] = useState<Resources>({
    oxygen: 82,
    radiation: 86,
    science: 58,
  });

  // Signal delay wave (0 to 1 progress from roof dish to mini Earth)
  const [signalInFlight, setSignalInFlight] = useState<boolean>(false);
  const [signalProgress, setSignalProgress] = useState<number>(0);
  const [signalFeedback, setSignalFeedback] = useState<{
    text: string;
    tone: 'success' | 'warn';
  } | null>(null);

  // Solar flare event state inside current Sol
  const [flareStage, setFlareStage] = useState<'none' | 'warning' | 'active'>('none');
  const [currentFlare, setCurrentFlare] = useState<FlareRecord>(CURATED_DONKI_FLARES[0]);

  // Mascot target & emotion + Onboard Computer Cause & Effect feedback
  const [mascotRoom, setMascotRoom] = useState<RoomId>('greenhouse');
  const [mascotNote, setMascotNote] = useState<string>('');
  const [causeEffectNote, setCauseEffectNote] = useState<{
    sentence: string;
    tone: 'sky' | 'emerald' | 'amber';
  } | null>(null);

  // Collected Science Cards, Emergency Pod Save, Mini-Actions & Local Mission Log
  const [unlockedSols, setUnlockedSols] = useState<number[]>([]);
  const [emergencyReason, setEmergencyReason] = useState<'oxygen' | 'radiation' | 'science'>('oxygen');
  const [telemetry, setTelemetry] = useState<PlayerTelemetry>({
    flaresBlocked: 0,
    flaresTotal: 0,
    signalsSent: 0,
    signalsCancelled: 0,
    podSavesUsed: 0,
    switchToggles: 0,
  });
  const [harvestUsedThisSol, setHarvestUsedThisSol] = useState<boolean>(false);
  const [dustCleanedThisSol, setDustCleanedThisSol] = useState<boolean>(false);
  const [missionLog, setMissionLog] = useState<MissionLogMap>(() => readMissionLog());
  const recordedDebriefRef = useRef<boolean>(false);

  // Live NASA API data (DONKI CME/FLR + Perseverance Raw Images + APOD + NEO + InSight/Trek)
  const [dataMode, setDataMode] = useState<'loading' | 'live' | 'verified'>('loading');
  const [trekMode, setTrekMode] = useState<'live' | 'verified'>('verified');
  const [trekOffset, setTrekOffset] = useState<{ temp: number; pressure: number; windMs: number }>({
    temp: 0,
    pressure: 0,
    windMs: 7.2,
  });
  const [donkiFlares, setDonkiFlares] = useState<FlareRecord[]>(CURATED_DONKI_FLARES);
  const [cmeEvents, setCmeEvents] = useState<CmeRecord[]>(CURATED_DONKI_CMES);
  const [roverPhotos, setRoverPhotos] = useState<RoverPhoto[]>(CURATED_ROVER_PHOTOS);
  const [neoObjects, setNeoObjects] = useState<NeoRecord[]>(CURATED_NEOS);
  const [apod, setApod] = useState<ApodData>(CURATED_APOD);
  const [apodImgFailed, setApodImgFailed] = useState<boolean>(false);
  const [failedPhotoUrls, setFailedPhotoUrls] = useState<Record<string, boolean>>({});
  const markPhotoFailed = useCallback((url: string) => {
    if (!url) return;
    setFailedPhotoUrls((prev) => (prev[url] ? prev : { ...prev, [url]: true }));
  }, []);
  const [solGoalCompleted, setSolGoalCompleted] = useState<boolean>(false);

  // Educational Modals & Settings/Credits Modal
  const [showSourcesModal, setShowSourcesModal] = useState<boolean>(false);
  const [showAlbumModal, setShowAlbumModal] = useState<boolean>(false);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [showSolPhotoModal, setShowSolPhotoModal] = useState<boolean>(false);
  const [activeTerm, setActiveTerm] = useState<GlossaryTerm | null>(null);

  // Kid-Friendly Read-Aloud (Web Speech API) with Smart Friendly Voice Selection
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const loadVoices = () => {
      try {
        const v = window.speechSynthesis.getVoices();
        if (v && v.length > 0) {
          setAvailableVoices(v);
        }
      } catch {
        // Ignore speech synthesis voice errors
      }
    };
    loadVoices();
    window.speechSynthesis.addEventListener?.('voiceschanged', loadVoices);
    return () => {
      window.speechSynthesis.removeEventListener?.('voiceschanged', loadVoices);
    };
  }, []);

  const pickFriendlyVoice = useCallback(
    (targetLang: Lang): SpeechSynthesisVoice | null => {
      if (availableVoices.length === 0) return null;
      const prefix = targetLang === 'ar' ? 'ar' : 'en';
      const candidates = availableVoices.filter((v) => v.lang.toLowerCase().startsWith(prefix));
      if (candidates.length === 0) return null;

      const scoreVoice = (v: SpeechSynthesisVoice) => {
        const name = v.name.toLowerCase();
        let score = 0;
        if (name.includes('natural')) score += 40;
        if (name.includes('google')) score += 32;
        if (
          name.includes('samantha') ||
          name.includes('ava') ||
          name.includes('jenny') ||
          name.includes('aria') ||
          name.includes('daniel') ||
          name.includes('karen') ||
          name.includes('salma') ||
          name.includes('laila') ||
          name.includes('maged') ||
          name.includes('hoda')
        ) {
          score += 28;
        }
        if (v.localService) score += 10;
        if (v.lang.toLowerCase() === 'en-us' || v.lang.toLowerCase() === 'ar-sa') score += 8;
        return score;
      };

      return [...candidates].sort((a, b) => scoreVoice(b) - scoreVoice(a))[0] || candidates[0];
    },
    [availableVoices]
  );

  const stopSpeaking = useCallback(() => {
    try {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    } catch {
      // Ignore speech synthesis cancel errors
    }
    setSpeakingId(null);
  }, []);

  const speakNow = useCallback(
    (id: string, text: string) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        const bestVoice = pickFriendlyVoice(lang);
        if (bestVoice) {
          utterance.voice = bestVoice;
          utterance.lang = bestVoice.lang;
        } else {
          utterance.lang = lang === 'ar' ? 'ar-SA' : 'en-US';
        }
        utterance.rate = 0.95;
        utterance.pitch = 1.07;
        utterance.onend = () => setSpeakingId((cur) => (cur === id ? null : cur));
        utterance.onerror = () => setSpeakingId((cur) => (cur === id ? null : cur));
        setSpeakingId(id);
        window.speechSynthesis.speak(utterance);
      } catch {
        setSpeakingId(null);
      }
    },
    [lang, pickFriendlyVoice]
  );

  const toggleSpeak = useCallback(
    (id: string, text: string) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
      if (speakingId === id) {
        stopSpeaking();
        return;
      }
      speakNow(id, text);
    },
    [speakingId, speakNow, stopSpeaking]
  );

  useEffect(() => {
    stopSpeaking();
  }, [phase, lang, stopSpeaking]);

  useEffect(() => {
    if (!activeTerm && !showAlbumModal) {
      stopSpeaking();
    }
  }, [activeTerm, showAlbumModal, stopSpeaking]);

  useEffect(() => {
    if (!autoReadAloud) {
      stopSpeaking();
    }
  }, [autoReadAloud, stopSpeaking]);

  useEffect(() => {
    return () => {
      try {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
          window.speechSynthesis.cancel();
        }
      } catch {
        // Ignore cleanup errors
      }
    };
  }, []);

  // Instant Next Sol readiness & lightweight mascot celebration state
  const [hasActedThisSol, setHasActedThisSol] = useState<boolean>(false);
  const [celebrating, setCelebrating] = useState<boolean>(false);
  const celebrationTimerRef = useRef<number | null>(null);

  const triggerCelebration = useCallback(() => {
    setCelebrating(true);
    if (celebrationTimerRef.current !== null) {
      window.clearTimeout(celebrationTimerRef.current);
    }
    celebrationTimerRef.current = window.setTimeout(() => {
      setCelebrating(false);
      celebrationTimerRef.current = null;
    }, 1350);
  }, []);

  useEffect(() => {
    return () => {
      if (celebrationTimerRef.current !== null) {
        window.clearTimeout(celebrationTimerRef.current);
      }
    };
  }, []);

  // Live NASA API telemetry mapped directly to gameplay physics per Sol
  const livePhysics = useMemo(() => {
    const activeSolFlare = donkiFlares[(sol - 1) % donkiFlares.length] || CURATED_DONKI_FLARES[0];
    const activeSolCme = cmeEvents[(sol - 1) % cmeEvents.length] || CURATED_DONKI_CMES[0];
    const activeSolNeo = neoObjects[(sol - 1) % neoObjects.length] || CURATED_NEOS[0];
    const activeSolRover = roverPhotos[(sol - 1) % roverPhotos.length] || CURATED_ROVER_PHOTOS[0];

    const cls = activeSolFlare.classType.toUpperCase();
    const isX = cls.startsWith('X');
    const isM = cls.startsWith('M');

    const unshieldedFlareRadRate = isX ? -13.5 : isM ? -10.2 : -7.2;
    const baseFlareMsv = isX ? 2.85 : isM ? 1.95 : 1.25;
    const cmeSpeedBoostMsv = Math.min(0.65, Math.max(0, (activeSolCme.speed - 700) / 1400));
    const activeFlareMsv = Number((baseFlareMsv + cmeSpeedBoostMsv).toFixed(2));

    const fastCme = activeSolCme.speed >= 1000;
    const warningDuration = fastCme ? 2.4 : 3.2;
    const cmeDustBoost =
      (activeSolCme.speed >= 1100 ? 6 : activeSolCme.speed >= 800 ? 3 : 1) +
      Math.round(Math.max(0, trekOffset.windMs - 6) * 0.8);

    const series = TREK_SOL_VARIATIONS[planet];
    const baseIdx = Math.max(0, Math.min(series.length - 1, sol - 1));
    const baseTemp =
      series[baseIdx].tempC + (planet === 'mars' ? trekOffset.temp * 0.45 : 0);
    const isColdSol = baseTemp < (planet === 'mars' ? -62 : -118);
    const o2DrainRate = isColdSol ? -3.1 : -2.4;
    const o2ChargeRate = isColdSol ? 5.2 : 6.2;

    const goalType: SolBrief['goalType'] =
      sol === 1
        ? 'charge_o2'
        : sol === 3 || sol === 8
          ? 'upload_rover'
          : sol === 6
            ? 'upload_neo'
            : 'block_flare';

    return {
      activeSolFlare,
      activeSolCme,
      activeSolNeo,
      activeSolRover,
      unshieldedFlareRadRate,
      activeFlareMsv,
      fastCme,
      warningDuration,
      cmeDustBoost,
      baseTemp: Number(baseTemp.toFixed(1)),
      isColdSol,
      o2DrainRate,
      o2ChargeRate,
      goalType,
    };
  }, [sol, planet, donkiFlares, cmeEvents, neoObjects, roverPhotos, trekOffset]);

  // Simulation refs for 60fps requestAnimationFrame accuracy
  const stateRef = useRef({
    phase,
    planet,
    sol,
    solElapsed,
    isPaused,
    activeRooms,
    resources,
    signalInFlight,
    signalProgress,
    flareStage,
    lang,
    commanderName,
    solGoalCompleted,
    livePhysics,
    apodDate: apod.date,
    hasTriggeredFlareThisSol: false,
    flareBlockedTicked: false,
    modalOpen: false,
  });

  stateRef.current = {
    phase,
    planet,
    sol,
    solElapsed,
    isPaused,
    activeRooms,
    resources,
    signalInFlight,
    signalProgress,
    flareStage,
    lang,
    commanderName,
    solGoalCompleted,
    livePhysics,
    apodDate: apod.date,
    hasTriggeredFlareThisSol: stateRef.current.hasTriggeredFlareThisSol,
    flareBlockedTicked: stateRef.current.flareBlockedTicked,
    modalOpen: showSourcesModal || showAlbumModal || showSettingsModal || showSolPhotoModal || activeTerm !== null,
  };

  // Sync ambient pitch shift with Solar Flare stage
  useEffect(() => {
    soundFX.setSolarFlarePitchShift(phase === 'PLAYING' ? flareStage : 'none');
  }, [flareStage, phase]);

  // Keep active Sol flare synced with live DONKI feed
  useEffect(() => {
    const picked = donkiFlares[(sol - 1) % donkiFlares.length] || CURATED_DONKI_FLARES[0];
    setCurrentFlare(picked);
  }, [sol, donkiFlares]);

  // --------------------------------------------------------------------------
  // FETCH LIVE NASA DONKI (CME + FLR/NOTIF), PERSEVERANCE RAW, APOD, NEO & INSIGHT
  // --------------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;

    const fetchNasaData = async () => {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 7500);

      try {
        const end = new Date();
        const yesterday = new Date(end.getTime() - 24 * 60 * 60 * 1000);
        const start30 = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
        const fmt = (d: Date) => d.toISOString().split('T')[0];

        const [
          cmeRes,
          notifRes,
          roverRes,
          apodCountRes,
          neoRes,
          marsTrekRes,
          moonTrekRes,
          insightRes,
        ] = await Promise.allSettled([
          fetch(
            `https://api.nasa.gov/DONKI/CME?startDate=${fmt(start30)}&endDate=${fmt(end)}&api_key=${NASA_API_KEY}`,
            { signal: controller.signal }
          ),
          fetch(
            `https://api.nasa.gov/DONKI/notifications?startDate=${fmt(start30)}&endDate=${fmt(end)}&type=FLR&api_key=${NASA_API_KEY}`,
            { signal: controller.signal }
          ),
          fetch(
            'https://mars.nasa.gov/rss/api/?feed=raw_images&category=mars2020&feedtype=json&ver=1.2&num=8&page=0',
            { signal: controller.signal }
          ),
          fetch(`https://api.nasa.gov/planetary/apod?count=3&api_key=${NASA_API_KEY}`, {
            signal: controller.signal,
          }),
          fetch(
            `https://api.nasa.gov/neo/rest/v1/feed?start_date=${fmt(yesterday)}&end_date=${fmt(end)}&api_key=${NASA_API_KEY}`,
            { signal: controller.signal }
          ),
          fetch(
            'https://trek.nasa.gov/tiles/Mars/EQ/Mars_Viking_MDIM21_ClrMosaic_global_232m/1.0.0/WMTSCapabilities.xml',
            { signal: controller.signal }
          ),
          fetch(
            'https://trek.nasa.gov/tiles/Moon/EQ/LRO_WAC_Mosaic_Global_303ppd_v02/1.0.0/WMTSCapabilities.xml',
            { signal: controller.signal }
          ),
          fetch(
            `https://api.nasa.gov/insight_weather/?api_key=${NASA_API_KEY}&feedtype=json&ver=1.0`,
            { signal: controller.signal }
          ),
        ]);

        if (cancelled) return;
        let gotLive = false;
        let gotTrekLive = false;
        const collectedFlares: FlareRecord[] = [];

        if (notifRes.status === 'fulfilled' && notifRes.value.ok) {
          const notifJson = await notifRes.value.json();
          if (Array.isArray(notifJson) && notifJson.length > 0) {
            notifJson
              .slice(-6)
              .reverse()
              .forEach(
                (
                  item: { messageID?: string; messageIssueTime?: string; messageBody?: string },
                  idx: number
                ) => {
                  const body = item.messageBody || '';
                  const clsMatch = body.match(/\b([CMX]\d+(?:\.\d+)?)\b/);
                  const locMatch = body.match(/\b([NS]\d{1,2}[EW]\d{1,2})\b/);
                  const cls = clsMatch ? clsMatch[1] : 'M3.2';
                  const severity: FlareRecord['severity'] = cls.startsWith('X')
                    ? 'Extreme'
                    : cls.startsWith('M')
                      ? 'Strong'
                      : 'Moderate';
                  collectedFlares.push({
                    id: item.messageID || `notif-flr-${idx}`,
                    classType: cls,
                    beginTime: item.messageIssueTime
                      ? item.messageIssueTime.replace('T', ' ').replace('Z', ' UTC')
                      : 'Recent DONKI Alert',
                    sourceLocation: locMatch ? locMatch[1] : 'Solar Active Region',
                    severity,
                  });
                }
              );
          }
        }

        if (cmeRes.status === 'fulfilled' && cmeRes.value.ok) {
          const cmeJson = await cmeRes.value.json();
          if (Array.isArray(cmeJson) && cmeJson.length > 0) {
            const parsedCmes: CmeRecord[] = cmeJson
              .slice(-8)
              .reverse()
              .map(
                (
                  item: {
                    activityID?: string;
                    startTime?: string;
                    sourceLocation?: string;
                    note?: string;
                    cmeAnalyses?: Array<{ speed?: number; halfAngle?: number }>;
                    linkedEvents?: Array<{ activityID?: string }>;
                  },
                  idx: number
                ) => {
                  const analysis = Array.isArray(item.cmeAnalyses) && item.cmeAnalyses[0] ? item.cmeAnalyses[0] : {};
                  const speed = typeof analysis.speed === 'number' && analysis.speed > 0 ? Math.round(analysis.speed) : 780;
                  const halfAngle = typeof analysis.halfAngle === 'number' ? Math.round(analysis.halfAngle) : 34;
                  const severity: CmeRecord['severity'] =
                    speed >= 1200 ? 'Extreme' : speed >= 750 ? 'Fast' : 'Moderate';

                  if (Array.isArray(item.linkedEvents)) {
                    item.linkedEvents.forEach((ev, evIdx) => {
                      if (ev.activityID && ev.activityID.includes('FLR')) {
                        const cls = speed >= 1200 ? 'X2.4' : speed >= 800 ? 'M5.6' : 'C8.4';
                        collectedFlares.push({
                          id: ev.activityID || `cme-flr-${idx}-${evIdx}`,
                          classType: cls,
                          beginTime: item.startTime
                            ? item.startTime.replace('T', ' ').replace('Z', ' UTC')
                            : 'DONKI Linked Event',
                          sourceLocation: item.sourceLocation || 'Solar Active Region',
                          severity: cls.startsWith('X') ? 'Extreme' : cls.startsWith('M') ? 'Strong' : 'Moderate',
                        });
                      }
                    });
                  }

                  return {
                    id: item.activityID || `live-cme-${idx}`,
                    startTime: item.startTime
                      ? item.startTime.replace('T', ' ').replace('Z', ' UTC')
                      : 'Recent DONKI CME',
                    speed,
                    halfAngle,
                    note: item.note ? item.note.slice(0, 140) : 'Coronal Mass Ejection observed by NASA DONKI.',
                    severity,
                  };
                }
              );
            if (parsedCmes.length > 0) {
              setCmeEvents(parsedCmes);
              gotLive = true;
            }
          }
        }

        if (collectedFlares.length > 0) {
          setDonkiFlares(collectedFlares);
          setCurrentFlare(collectedFlares[0]);
          gotLive = true;
        }

        if (roverRes.status === 'fulfilled' && roverRes.value.ok) {
          const roverJson = await roverRes.value.json();
          const list = Array.isArray(roverJson?.images) ? roverJson.images : [];
          if (list.length > 0) {
            const parsedPhotos: RoverPhoto[] = list
              .slice(0, 6)
              .map(
                (
                  p: {
                    imageid?: string;
                    image_files?: { medium?: string; small?: string; full_res?: string };
                    date_taken_utc?: string;
                    sol?: number;
                    camera?: { instrument?: string };
                  },
                  idx: number
                ) => {
                  const rawUrl = p.image_files?.medium || p.image_files?.small || p.image_files?.full_res || '';
                  return {
                    id: p.imageid || `mars2020-${idx}`,
                    imgSrc: rawUrl.replace(/^http:\/\//i, 'https://'),
                    earthDate: p.date_taken_utc ? p.date_taken_utc.split('T')[0] : 'Latest Sol',
                    sol: typeof p.sol === 'number' ? p.sol : 2031,
                    camera: p.camera?.instrument || 'Mastcam-Z',
                    rover: 'Perseverance',
                  };
                }
              )
              .filter((p: RoverPhoto) => Boolean(p.imgSrc));
            if (parsedPhotos.length > 0) {
              setRoverPhotos(parsedPhotos);
              gotLive = true;
            }
          }
        }

        const extractApod = async (res: PromiseSettledResult<Response>) => {
          if (res.status !== 'fulfilled' || !res.value.ok) return null;
          const raw = await res.value.json();
          const list = Array.isArray(raw) ? raw : [raw];
          const j = list.find(
            (item: { title?: string; media_type?: string; url?: string }) =>
              item && item.title && item.media_type === 'image' && item.url
          );
          if (j) {
            return {
              title: j.title as string,
              url: String(j.url).replace(/^http:\/\//i, 'https://'),
              explanation: (j.explanation as string) || CURATED_APOD.explanation,
              date: (j.date as string) || 'Recent',
              copyright: j.copyright as string | undefined,
            };
          }
          return null;
        };

        const pickedApod = await extractApod(apodCountRes);
        if (pickedApod) {
          setApod(pickedApod);
          gotLive = true;
        }

        if (neoRes.status === 'fulfilled' && neoRes.value.ok) {
          const neoJson = await neoRes.value.json();
          const nearObj = neoJson?.near_earth_objects;
          if (nearObj && typeof nearObj === 'object') {
            const allNeos: NeoRecord[] = [];
            Object.values(nearObj).forEach((arr) => {
              if (Array.isArray(arr)) {
                arr.forEach(
                  (n: {
                    id?: string;
                    name?: string;
                    is_potentially_hazardous_asteroid?: boolean;
                    close_approach_data?: Array<{
                      relative_velocity?: { kilometers_per_hour?: string };
                      miss_distance?: { kilometers?: string };
                    }>;
                  }) => {
                    const ca = Array.isArray(n.close_approach_data) ? n.close_approach_data[0] : undefined;
                    const speed = Math.round(Number(ca?.relative_velocity?.kilometers_per_hour || 42000));
                    const miss = Math.round(Number(ca?.miss_distance?.kilometers || 1500000));
                    if (n.name) {
                      allNeos.push({
                        id: n.id || n.name,
                        name: n.name,
                        speedKmH: Number.isFinite(speed) ? speed : 42000,
                        missKm: Number.isFinite(miss) ? miss : 1500000,
                        hazardous: Boolean(n.is_potentially_hazardous_asteroid),
                      });
                    }
                  }
                );
              }
            });
            if (allNeos.length > 0) {
              setNeoObjects(allNeos.slice(0, 8));
              gotLive = true;
            }
          }
        }

        if (
          (marsTrekRes.status === 'fulfilled' && marsTrekRes.value.ok) ||
          (moonTrekRes.status === 'fulfilled' && moonTrekRes.value.ok)
        ) {
          gotTrekLive = true;
          gotLive = true;
        }

        if (insightRes.status === 'fulfilled' && insightRes.value.ok) {
          const insightJson = await insightRes.value.json();
          const solKeys: string[] = Array.isArray(insightJson?.sol_keys) ? insightJson.sol_keys : [];
          if (solKeys.length > 0) {
            const latestKey = solKeys[solKeys.length - 1];
            const latestSol = insightJson[latestKey];
            const atAvg = typeof latestSol?.AT?.av === 'number' ? latestSol.AT.av : null;
            const preAvg = typeof latestSol?.PRE?.av === 'number' ? latestSol.PRE.av : null;
            const hwsAvg = typeof latestSol?.HWS?.av === 'number' ? latestSol.HWS.av : null;
            setTrekOffset({
              temp: atAvg !== null ? Math.max(-8, Math.min(8, Number((atAvg + 63).toFixed(1)))) : 0,
              pressure: preAvg !== null ? Math.max(-45, Math.min(45, Math.round(preAvg - 720))) : 0,
              windMs: hwsAvg !== null ? Number(hwsAvg.toFixed(1)) : 7.2,
            });
            gotTrekLive = true;
            gotLive = true;
          }
        }

        setTrekMode(gotTrekLive ? 'live' : 'verified');
        setDataMode(gotLive ? 'live' : 'verified');
      } catch {
        if (!cancelled) {
          setTrekMode('verified');
          setDataMode('verified');
        }
      } finally {
        window.clearTimeout(timeoutId);
      }
    };

    fetchNasaData();
    return () => {
      cancelled = true;
    };
  }, []);

  // --------------------------------------------------------------------------
  // HELPER: ROOM & SWITCH LOGIC ("2 OUT OF 3" POWER RULE)
  // --------------------------------------------------------------------------
  const isRoomOn = useCallback((room: RoomId) => activeRooms.includes(room), [activeRooms]);

  const toggleRoom = useCallback((room: RoomId) => {
    soundFX.unlock();
    const cur = stateRef.current;
    if (cur.phase !== 'PLAYING' || cur.isPaused) return;
    const isAr = cur.lang === 'ar';

    setHasActedThisSol(true);
    setTelemetry((prev) => ({ ...prev, switchToggles: prev.switchToggles + 1 }));

    setActiveRooms((prev) => {
      const currentlyOn = prev.includes(room);
      if (currentlyOn) {
        soundFX.playSwitch(false);
        const next = prev.filter((r) => r !== room);

        if (room === 'science' && cur.signalInFlight) {
          setSignalInFlight(false);
          setSignalProgress(0);
          soundFX.playSignalCancel();
          setTelemetry((tm) => ({ ...tm, signalsCancelled: tm.signalsCancelled + 1 }));
          setSignalFeedback({
            text:
              cur.planet === 'mars'
                ? isAr
                  ? 'انقطع الإرسال! إشارة المريخ تحتاج بقاء الاتصالات ON حتى تصل للأرض.'
                  : 'Signal Cancelled! Mars delay needs Comms ON until wave reaches Earth.'
                : isAr
                  ? 'تم إلغاء الرفع قبل وصول الإشارة للأرض!'
                  : 'Upload Cancelled before reaching Earth!',
            tone: 'warn',
          });
          setMascotNote(
            isAr
              ? 'أوه! توقفت الاتصالات قبل وصول موجة الراديو للأرض!'
              : 'Oops! Comms shut off before the radio wave reached Earth!'
          );
        }

        if (next.length > 0) {
          setMascotRoom(next[next.length - 1]);
        }

        const hasShield = next.includes('shield');
        const hasGreen = next.includes('greenhouse');
        const hasSci = next.includes('science');
        setCauseEffectNote({
          tone: room === 'shield' ? 'amber' : room === 'greenhouse' ? 'emerald' : 'sky',
          sentence: isAr
            ? room === 'shield'
              ? `إيقاف درع الإشعاع يوفّر طاقة البطارية للغرف الأخرى، لكن جدران القاعدة لن تحجب جسيمات الشمس إذا وصل توهج ${cur.livePhysics.activeSolFlare.classType}.`
              : room === 'greenhouse'
                ? 'إطفاء مصابيح النمو في البيت المحمي يوفّر الكهرباء، لكن النباتات تتوقف عن تحويل CO2 إلى أكسجين جديد.'
                : 'إيقاف طبق الاتصال يحرر الطاقة للدعم الحيوي، وتنتظر التجارب العلمية دورها قبل الإرسال للأرض.'
            : room === 'shield'
              ? `Powering down the Radiation Shield freed battery capacity for ${hasGreen && hasSci ? 'crops and Earth comms' : 'other rooms'}, leaving the outpost dome unshielded against ${cur.livePhysics.activeSolFlare.classType} solar particles.`
              : room === 'greenhouse'
                ? 'Switching off CSA Greenhouse grow-lights saves battery power, but hydroponic photosynthesis pauses so crew O2 slowly drops.'
                : 'Putting Science & Comms on standby reserves full grid power for crew life support and shielding.',
        });
        return next;
      } else {
        soundFX.playSwitch(true);
        const next = [...prev, room];
        let dropped: RoomId | null = null;
        if (next.length > 2) {
          dropped = next.shift()!;
          soundFX.playCycleOff();
          const labelMap: Record<RoomId, string> = isAr
            ? {
                shield: 'درع الإشعاع',
                greenhouse: 'البيت المحمي',
                science: 'العلوم والاتصالات',
              }
            : {
                shield: 'Radiation Shield',
                greenhouse: 'Greenhouse',
                science: 'Science & Comms',
              };
          setCycledNotice(
            isAr
              ? `حد الغرفتين: تم إطفاء ${labelMap[dropped]} تلقائياً`
              : `2-Room Limit: ${labelMap[dropped]} cycled OFF`
          );

          if (dropped === 'science' && cur.signalInFlight) {
            setSignalInFlight(false);
            setSignalProgress(0);
            soundFX.playSignalCancel();
            setTelemetry((tm) => ({ ...tm, signalsCancelled: tm.signalsCancelled + 1 }));
            setSignalFeedback({
              text: isAr
                ? 'حد البطارية أطفأ العلوم — ضاعت الإشارة في الفضاء!'
                : 'Battery Cap cycled Science OFF — signal lost in space!',
              tone: 'warn',
            });
          }
        }

        if (room === 'science') {
          setSignalInFlight(true);
          setSignalProgress(0);
          soundFX.playRadioBeep();
          setMascotNote(
            cur.planet === 'mars'
              ? isAr
                ? 'انطلقت الموجة للأرض! أبقِ الاتصالات ON لمدة 5 ثوانٍ!'
                : 'Sending wave to Earth! Keep Comms ON for 5s!'
              : isAr
                ? 'انطلقت إشارة القمر السريعة نحو الأرض!'
                : 'Fast Moon uplink beam launched!'
          );
        } else if (room === 'shield') {
          setMascotNote(
            isAr ? 'تم تفعيل قبة الدرع الإشعاعي الزرقاء!' : 'Blue Radiation Shield Dome energized!'
          );
        } else {
          setMascotNote(
            isAr ? 'البيت المحمي المائي يعمل — ينتج أكسجيناً نقياً!' : 'CSA Hydroponics glowing—making fresh O2!'
          );
        }

        // Instant Onboard AI Computer Cause & Effect scientific explanation
        const causeSentence = (() => {
          if (dropped === 'greenhouse' && room === 'shield') {
            return isAr
              ? 'توجيه طاقة البطارية إلى درع الإشعاع خفض إضاءة النمو في مزرعة CSA المائية، مما أوقف إنتاج الأكسجين مؤقتاً لحماية الطاقم.'
              : 'Routing battery power to the Radiation Shield dimmed grow-lights in the CSA hydroponic farm, pausing O2 production to keep radiation safety high.';
          }
          if (dropped === 'greenhouse' && room === 'science') {
            return isAr
              ? 'تشغيل طبق الاتصال ومختبر العلوم أوقف مصابيح LED في البيت المحمي مؤقتاً، لذا يعتمد الطاقم على مخزون الأكسجين أثناء البث.'
              : 'Powering Science & Earth Comms turned off the CSA Greenhouse LEDs, so the crew breathes stored O2 while radio packets travel to Earth.';
          }
          if (dropped === 'shield' && room === 'greenhouse') {
            return isAr
              ? 'إعادة الطاقة لمصابيح النمو في البيت المحمي أوقفت القبة المغناطيسية، فتنتج النباتات الأكسجين الآن بينما يتراجع الحماية من الإشعاع.'
              : 'Sending power back to CSA hydroponic grow-lights switched off the magnetic shield, boosting photosynthesis while radiation protection rests.';
          }
          if (dropped === 'shield' && room === 'science') {
            return isAr
              ? 'تغذية هوائي الفضاء العميق أطفأت الدرع الإشعاعي؛ تزداد نقاط العلوم بالإرسال، لكن راقب إنذار DONKI لأي توهج شمسي.'
              : 'Diverting power to the Deep Space Dish put the Radiation Shield on standby—science uplinks speed up, so watch DONKI for flares.';
          }
          if (dropped === 'science' && room === 'shield') {
            return isAr
              ? 'تشغيل الدرع الإشعاعي فصل الطاقة عن هوائي الاتصال؛ ينخفض الإشعاع داخل القاعدة فوراً مقابل تأجيل إرسال البيانات للأرض.'
              : 'Energizing the Shield Dome cut power to the radio dish, blocking harmful solar particles right away while Earth uploads wait.';
          }
          if (dropped === 'science' && room === 'greenhouse') {
            return isAr
              ? 'تشغيل المزرعة المائية أوقف البث العلمي نحو الأرض؛ تمتص النباتات ثاني أكسيد الكربون لتجديد الأكسجين قبل جولة الإرسال التالية.'
              : 'Switching on the CSA Greenhouse paused Earth comms, letting plants scrub CO2 into fresh oxygen before your next broadcast.';
          }
          if (next.includes('shield') && next.includes('greenhouse')) {
            return isAr
              ? 'يعمل الدرع والبيت المحمي معاً الآن: القبة تحمي الحمض النووي والنباتات تنتج الأكسجين، بينما يبقى الاتصال بالأرض في وضع الاستعداد.'
              : 'Shield Dome + CSA Hydroponics are paired: crew DNA stays protected and crops make fresh O2 while Earth comms stay on standby.';
          }
          if (next.includes('greenhouse') && next.includes('science')) {
            return isAr
              ? 'البيت المحمي ومختبر العلوم يعملان معاً: النباتات تجدد الأكسجين أثناء إرسال البيانات للأرض، مع بقاء الدرع الإشعاعي مطفأً.'
              : 'Hydroponics + Science Dish are active: crops replenish O2 while radio waves reach Earth, leaving the outer radiation shield offline.';
          }
          return isAr
            ? 'الدرع ومختبر العلوم يعملان معاً: القاعدة محمية من الجسيمات الشمسية أثناء البث للأرض، بينما يستهلك الطاقم الأكسجين المخزن.'
            : 'Shield + Science Dish are active: solar particles are deflected during Earth transmission while stored cabin O2 slowly drains.';
        })();

        setCauseEffectNote({
          tone: room === 'shield' ? 'sky' : room === 'greenhouse' ? 'emerald' : 'amber',
          sentence: causeSentence,
        });

        setMascotRoom(room);
        return next;
      }
    });
  }, []);

  useEffect(() => {
    if (!cycledNotice) return;
    const timer = window.setTimeout(() => setCycledNotice(null), 2400);
    return () => window.clearTimeout(timer);
  }, [cycledNotice]);

  useEffect(() => {
    if (!signalFeedback) return;
    const timer = window.setTimeout(() => setSignalFeedback(null), 2800);
    return () => window.clearTimeout(timer);
  }, [signalFeedback]);

  // --------------------------------------------------------------------------
  // MISSION CONTROL ACTIONS & AUDIO TOGGLES
  // --------------------------------------------------------------------------
  const startMission = useCallback(
    (chosenPlanet: PlanetId) => {
      soundFX.unlock();
      soundFX.playLaunchRocket();
      soundFX.startAmbient();
      soundFX.startSpaceWind();
      setPlanet(chosenPlanet);
      setSol(1);
      setSolElapsed(0);
      setIsPaused(false);
      setHasActedThisSol(false);
      setSolGoalCompleted(false);
      setCelebrating(false);
      setActiveRooms(['shield', 'greenhouse']);
      setHarvestUsedThisSol(false);
      setDustCleanedThisSol(false);
      recordedDebriefRef.current = false;
      setCauseEffectNote({
        tone: 'emerald',
        sentence:
          lang === 'ar'
            ? 'تشغّل البطارية الآن الدرع الإشعاعي ومصابيح النمو المائية معاً؛ لحماية الطاقم وتوليد الأكسجين قبل أي بث علمي.'
            : 'Your battery currently pairs the Radiation Shield with CSA Hydroponic grow-lights—protecting crew DNA and making O2 while Earth Comms stay standby.',
      });
      setResources({ oxygen: 82, radiation: 86, science: 58 });
      setSignalInFlight(false);
      setSignalProgress(0);
      setSignalFeedback(null);
      setCycledNotice(null);
      setFlareStage('none');
      stateRef.current.hasTriggeredFlareThisSol = false;
      stateRef.current.flareBlockedTicked = false;
      setMascotRoom('greenhouse');
      setMascotNote(
        lang === 'ar'
          ? chosenPlanet === 'mars'
            ? `أهلاً بك في فوهة جيزيرو يا ${commanderName}! انتبه لتأخر إشارة المريخ (5 ثوانٍ)!`
            : `أهلاً بك في قاعدة أرتميس يا ${commanderName}! يمكنك تشغيل غرفتين فقط معاً!`
          : chosenPlanet === 'mars'
            ? `Welcome to Jezero Crater, ${commanderName}! Watch that 5s Mars signal delay!`
            : `Welcome to Artemis Base, ${commanderName}! Power up 2 rooms at a time!`
      );
      setUnlockedSols([]);
      setTelemetry({
        flaresBlocked: 0,
        flaresTotal: 0,
        signalsSent: 0,
        signalsCancelled: 0,
        podSavesUsed: 0,
        switchToggles: 0,
      });
      setPhase('PLAYING');
    },
    [commanderName, lang]
  );

  const retrySolFromPodSave = useCallback(() => {
    soundFX.unlock();
    soundFX.playSwitch(true);
    setResources((prev) => ({
      oxygen: Math.max(prev.oxygen, 65),
      radiation: Math.max(prev.radiation, 65),
      science: Math.max(prev.science, 60),
    }));
    setSolElapsed(0);
    setHasActedThisSol(false);
    setSolGoalCompleted(false);
    setHarvestUsedThisSol(false);
    setDustCleanedThisSol(false);
    setCauseEffectNote({
      tone: 'amber',
      sentence:
        lang === 'ar'
          ? 'حاسوب القاعدة: بدّل بين الغرف مبكراً قبل أن يصل أي عداد إلى 0% لأن البطارية لا تغذي سوى غرفتين.'
          : 'Onboard Computer: Cycle rooms before any meter drops low—2-room battery limits mean every power trade shifts O2, shielding, or comms.',
    });
    setCelebrating(false);
    setFlareStage('none');
    setSignalInFlight(false);
    setSignalProgress(0);
    stateRef.current.hasTriggeredFlareThisSol = false;
    stateRef.current.flareBlockedTicked = false;
    setMascotNote(
      lang === 'ar'
        ? `تم الإنقاذ بنجاح يا ${commanderName}! لنجرب خطة طاقة جديدة.`
        : `Emergency Pod Save complete, ${commanderName}! Let’s try a new power combo.`
    );
    setPhase('PLAYING');
  }, [commanderName, lang]);

  const completeSolNow = useCallback(() => {
    const cur = stateRef.current;
    if (cur.phase !== 'PLAYING' || cur.isPaused) return;
    soundFX.unlock();

    const shieldActive = cur.activeRooms.includes('shield');
    const greenActive = cur.activeRooms.includes('greenhouse');
    const sciActive = cur.activeRooms.includes('science');
    const { goalType } = cur.livePhysics;

    let extraSci = 0;
    let extraRad = 0;
    const extraO2 = greenActive ? 4 : -1;

    if (sciActive && cur.signalInFlight) {
      extraSci += cur.planet === 'mars' ? 14 : 8;
      setTelemetry((tm) => ({ ...tm, signalsSent: tm.signalsSent + 1 }));
      if ((goalType === 'upload_rover' || goalType === 'upload_neo') && !cur.solGoalCompleted) {
        cur.solGoalCompleted = true;
        setSolGoalCompleted(true);
        extraSci += 10;
      }
    }

    if (FLARE_SOLS.has(cur.sol) && shieldActive && !cur.flareBlockedTicked) {
      cur.flareBlockedTicked = true;
      setTelemetry((tm) => ({
        ...tm,
        flaresTotal: Math.max(tm.flaresTotal, tm.flaresBlocked + 1),
        flaresBlocked: tm.flaresBlocked + 1,
      }));
      if (goalType === 'block_flare' && !cur.solGoalCompleted) {
        cur.solGoalCompleted = true;
        setSolGoalCompleted(true);
        extraSci += 10;
        extraRad += 5;
      }
    }

    if (goalType === 'charge_o2' && greenActive && cur.resources.oxygen >= 84 && !cur.solGoalCompleted) {
      cur.solGoalCompleted = true;
      setSolGoalCompleted(true);
      extraSci += 10;
    }

    if (extraSci !== 0 || extraRad !== 0 || sciActive) {
      setResources((prev) => ({
        oxygen: Math.min(100, Math.max(20, prev.oxygen + extraO2)),
        radiation: Math.min(100, Math.max(20, prev.radiation + (shieldActive ? 4 : -1) + extraRad)),
        science: Math.min(100, prev.science + extraSci),
      }));
    }

    setSolElapsed(SOL_DURATION_SEC);
    setUnlockedSols((prev) => (prev.includes(cur.sol) ? prev : [...prev, cur.sol]));
    triggerCelebration();

    if (cur.sol >= 10) {
      soundFX.playVictoryFanfare();
      setPhase('MISSION_DEBRIEF');
    } else {
      soundFX.playCardUnlock();
      setPhase('SOL_CARD_UNLOCK');
    }
  }, [triggerCelebration]);

  const advanceToNextSol = useCallback(() => {
    soundFX.unlock();
    soundFX.playSwitch(true);
    const nextSol = sol + 1;
    setSol(nextSol);
    setSolElapsed(0);
    setHasActedThisSol(false);
    setSolGoalCompleted(false);
    setHarvestUsedThisSol(false);
    setDustCleanedThisSol(false);
    setCauseEffectNote(null);
    setCelebrating(false);
    setFlareStage('none');
    setSignalInFlight(false);
    setSignalProgress(0);
    stateRef.current.hasTriggeredFlareThisSol = false;
    stateRef.current.flareBlockedTicked = false;
    setResources((prev) => ({
      oxygen: Math.min(100, Math.max(35, prev.oxygen + 5)),
      radiation: Math.min(100, Math.max(35, prev.radiation + 5)),
      science: Math.min(100, Math.max(35, prev.science + 5)),
    }));
    setMascotRoom(activeRooms[activeRooms.length - 1] || 'greenhouse');
    setMascotNote(
      lang === 'ar'
        ? FLARE_SOLS.has(nextSol)
          ? `بدأ اليوم ${nextSol} يا ${commanderName} — راقب تنبيهات ناسا للعواصف الشمسية!`
          : `بدأ اليوم ${nextSol} يا ${commanderName}! حافظ على توازن الموارد الثلاثة.`
        : FLARE_SOLS.has(nextSol)
          ? `Sol ${nextSol} starting, ${commanderName}—watch NASA DONKI for solar flares!`
          : `Sol ${nextSol} starting, ${commanderName}! Keep all 3 bars healthy.`
    );
    setPhase('PLAYING');
  }, [sol, activeRooms, commanderName, lang]);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      soundFX.muted = next;
      if (!next) {
        soundFX.unlock();
      }
      soundFX.updateAmbientGain();
      soundFX.updateSpaceWindGain();
      return next;
    });
  }, []);

  const toggleAmbient = useCallback(() => {
    setAmbientOn((prev) => {
      const next = !prev;
      soundFX.ambientEnabled = next;
      if (next && !soundFX.muted) {
        soundFX.unlock();
        soundFX.startAmbient();
      }
      soundFX.updateAmbientGain();
      return next;
    });
  }, []);

  const toggleSpaceWind = useCallback(() => {
    setSpaceWindOn((prev) => {
      const next = !prev;
      soundFX.spaceWindEnabled = next;
      if (next && !soundFX.muted) {
        soundFX.unlock();
        soundFX.startSpaceWind();
      }
      soundFX.updateSpaceWindGain();
      return next;
    });
  }, []);

  const toggleSfx = useCallback(() => {
    setSfxOn((prev) => {
      const next = !prev;
      soundFX.sfxEnabled = next;
      if (next && !soundFX.muted) {
        soundFX.unlock();
        soundFX.playSwitch(true);
      }
      return next;
    });
  }, []);

  const toggleAutoReadAloud = useCallback(() => {
    setAutoReadAloud((prev) => !prev);
  }, []);

  const toggleLang = useCallback(() => {
    setLang((prev) => (prev === 'en' ? 'ar' : 'en'));
  }, []);

  // --------------------------------------------------------------------------
  // KEYBOARD SHORTCUTS (1, 2, 3, Space, Enter, M, Esc)
  // --------------------------------------------------------------------------
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const isTypingInInput =
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA';

      if (e.key === 'Escape') {
        if (showSourcesModal || showAlbumModal || showSettingsModal || showSolPhotoModal || activeTerm) {
          setShowSourcesModal(false);
          setShowAlbumModal(false);
          setShowSettingsModal(false);
          setShowSolPhotoModal(false);
          setActiveTerm(null);
          return;
        }
        if (phase === 'PLAYING') {
          setIsPaused((p) => !p);
        }
        return;
      }
      if (showSourcesModal || showAlbumModal || showSettingsModal || showSolPhotoModal || activeTerm) return;

      if (phase === 'TITLE_MENU') {
        if (e.key === 'Enter') {
          e.preventDefault();
          startMission(planet);
        } else if (e.key === ' ' && !isTypingInInput) {
          e.preventDefault();
          startMission(planet);
        }
        return;
      }

      if (isTypingInInput) return;

      if (e.key === 'm' || e.key === 'M') {
        toggleMute();
        return;
      }

      if (phase === 'PLAYING') {
        if (e.key === '1') toggleRoom('shield');
        else if (e.key === '2') toggleRoom('greenhouse');
        else if (e.key === '3') toggleRoom('science');
        else if (e.key === ' ') {
          e.preventDefault();
          setIsPaused((p) => !p);
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    phase,
    planet,
    startMission,
    toggleRoom,
    toggleMute,
    showSourcesModal,
    showAlbumModal,
    showSettingsModal,
    showSolPhotoModal,
    activeTerm,
  ]);

  // --------------------------------------------------------------------------
  // 60FPS GAME SIMULATION LOOP
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (phase !== 'PLAYING') return;

    let rafId = 0;
    let lastTime = performance.now();

    const step = (now: number) => {
      const rawDt = (now - lastTime) / 1000;
      lastTime = now;
      const dt = Math.min(rawDt, 0.05);

      const cur = stateRef.current;
      if (!cur.isPaused && !cur.modalOpen && cur.phase === 'PLAYING') {
        const nextElapsed = cur.solElapsed + dt;
        const shieldOn = cur.activeRooms.includes('shield');
        const greenhouseOn = cur.activeRooms.includes('greenhouse');
        const scienceOn = cur.activeRooms.includes('science');
        const isAr = cur.lang === 'ar';
        const lp = cur.livePhysics;

        let goalSciBonus = 0;
        let goalRadBonus = 0;

        // 1. Solar Flare & CME Timing inside flare Sols (warning speed driven by live DONKI CME velocity)
        let nextFlareStage: 'none' | 'warning' | 'active' = 'none';
        const warnStart = 4.2;
        const activeStart = warnStart + lp.warningDuration;
        if (FLARE_SOLS.has(cur.sol)) {
          if (nextElapsed >= warnStart && nextElapsed < activeStart) {
            nextFlareStage = 'warning';
            if (!cur.hasTriggeredFlareThisSol) {
              cur.hasTriggeredFlareThisSol = true;
              const picked = lp.activeSolFlare;
              setCurrentFlare(picked);
              soundFX.playFlareAlarm();
              setTelemetry((tm) => ({ ...tm, flaresTotal: tm.flaresTotal + 1 }));
              setMascotNote(
                isAr
                  ? lp.fastCme
                    ? `تنبيه DONKI: توهج ${picked.classType} + انبعاث سريع (${lp.activeSolCme.speed} كم/ث)! الدرع فوراً!`
                    : `تنبيه DONKI: توهج شمسي ${picked.classType} قادم! فعّل الدرع الواقي!`
                  : lp.fastCme
                    ? `DONKI Alert: ${picked.classType} Flare + ${lp.activeSolCme.speed} km/s CME! Shield UP!`
                    : `DONKI Alert: ${picked.classType} Solar Flare incoming! Shield UP!`
              );
            }
          } else if (nextElapsed >= activeStart && nextElapsed < 12.8) {
            nextFlareStage = 'active';
            if (shieldOn && !cur.flareBlockedTicked) {
              cur.flareBlockedTicked = true;
              setTelemetry((tm) => ({ ...tm, flaresBlocked: tm.flaresBlocked + 1 }));
              if (lp.goalType === 'block_flare' && !cur.solGoalCompleted) {
                cur.solGoalCompleted = true;
                setSolGoalCompleted(true);
                goalSciBonus += 10;
                goalRadBonus += 5;
                soundFX.playCardUnlock();
                triggerCelebration();
                setMascotNote(
                  isAr
                    ? `هدف ناسا مكتمل! صددت التوهج ${lp.activeSolFlare.classType} (+10% علوم و+5% أمان)!`
                    : `NASA Goal Complete! Blocked ${lp.activeSolFlare.classType} flare (+10% Sci, +5% Safety)!`
                );
              }
            }
          }
        }
        if (nextFlareStage !== cur.flareStage) {
          setFlareStage(nextFlareStage);
        }

        // 2. Signal Wave Propagation (Moon 1.3s vs Mars 5.0s) carrying real NASA payloads
        let scienceBurst = 0;
        if (scienceOn) {
          const travelTime = cur.planet === 'mars' ? MARS_SIGNAL_SEC : MOON_SIGNAL_SEC;
          const nextProg = cur.signalProgress + dt / travelTime;
          if (nextProg >= 1) {
            scienceBurst = cur.planet === 'mars' ? 18 : 9;
            soundFX.playSignalSuccess();
            triggerCelebration();
            setTelemetry((tm) => ({ ...tm, signalsSent: tm.signalsSent + 1 }));

            const uploadLabel =
              cur.sol === 3 || cur.sol === 8
                ? isAr
                  ? `تم رفع بيانات ${lp.activeSolRover.rover} (يوم ${lp.activeSolRover.sol})! +${scienceBurst}% علوم`
                  : `Uploaded ${lp.activeSolRover.rover} Sol ${lp.activeSolRover.sol} (${lp.activeSolRover.camera})! +${scienceBurst}% Sci`
                : cur.sol === 6
                  ? isAr
                    ? `وصل رصد الكويكب ${lp.activeSolNeo.name} وAPOD (${cur.apodDate})! +${scienceBurst}% علوم`
                    : `Sent NEO ${lp.activeSolNeo.name} & APOD ${cur.apodDate} log! +${scienceBurst}% Sci`
                  : cur.planet === 'mars'
                    ? isAr
                      ? `استقبلت الأرض حزمة المريخ + ${lp.activeSolFlare.classType}! +${scienceBurst}% علوم`
                      : `Mars Telemetry & ${lp.activeSolFlare.classType} Log Received! +${scienceBurst}% Sci`
                    : isAr
                      ? `استقبلت الأرض حزمة القمر + ${lp.activeSolFlare.classType}! +${scienceBurst}% علوم`
                      : `Lunar Telemetry & ${lp.activeSolFlare.classType} Log Received! +${scienceBurst}% Sci`;

            setSignalFeedback({ text: uploadLabel, tone: 'success' });

            if ((lp.goalType === 'upload_rover' || lp.goalType === 'upload_neo') && !cur.solGoalCompleted) {
              cur.solGoalCompleted = true;
              setSolGoalCompleted(true);
              goalSciBonus += 10;
              setMascotNote(
                isAr
                  ? `هدف ناسا مكتمل! وصل الإرسال العلمي إلى الأرض (+10% علوم إضافية)!`
                  : `NASA Goal Complete! Real data packet reached Earth (+10% bonus Science)!`
              );
            }

            setSignalProgress(0);
            setSignalInFlight(true);
          } else {
            if (!cur.signalInFlight) setSignalInFlight(true);
            setSignalProgress(nextProg);
          }
        } else if (cur.signalInFlight) {
          setSignalInFlight(false);
          setSignalProgress(0);
        }

        // 3. Resource Rates driven directly by live NASA DONKI, InSight & Trek telemetry
        const o2Delta = (greenhouseOn ? lp.o2ChargeRate : lp.o2DrainRate) * dt;
        const radRate =
          shieldOn ? 5.2 : nextFlareStage === 'active' ? lp.unshieldedFlareRadRate : -1.6;
        const radDelta = radRate * dt;
        const sciDelta = (scienceOn ? 0.35 : -1.1) * dt + scienceBurst;

        const nextO2 = Math.max(0, Math.min(100, cur.resources.oxygen + o2Delta));
        const nextRad = Math.max(0, Math.min(100, cur.resources.radiation + radDelta + goalRadBonus));
        let nextSci = Math.max(0, Math.min(100, cur.resources.science + sciDelta + goalSciBonus));

        // Sol 1 interactive goal: boost O2 >= 88% with CSA Hydroponic Greenhouse
        if (lp.goalType === 'charge_o2' && !cur.solGoalCompleted && greenhouseOn && nextO2 >= 88) {
          cur.solGoalCompleted = true;
          setSolGoalCompleted(true);
          nextSci = Math.min(100, nextSci + 10);
          soundFX.playCardUnlock();
          triggerCelebration();
          setMascotNote(
            isAr
              ? 'هدف ناسا مكتمل! وصل الأكسجين إلى 88% عبر البيت المحمي (+10% علوم)!'
              : 'NASA Goal Complete! Crew O2 reached 88% with CSA Hydroponics (+10% Science)!'
          );
        }

        setResources({
          oxygen: nextO2,
          radiation: nextRad,
          science: nextSci,
        });

        // 4. Non-Punitive Emergency Pod Save Check
        if (nextO2 <= 0 || nextRad <= 0 || nextSci <= 0) {
          const cause: 'oxygen' | 'radiation' | 'science' =
            nextO2 <= 0 ? 'oxygen' : nextRad <= 0 ? 'radiation' : 'science';
          setEmergencyReason(cause);
          setTelemetry((tm) => ({ ...tm, podSavesUsed: tm.podSavesUsed + 1 }));
          soundFX.playPodSave();
          setPhase('EMERGENCY_POD');
          return;
        }

        // 5. Sol Completion Check
        if (nextElapsed >= SOL_DURATION_SEC) {
          setSolElapsed(SOL_DURATION_SEC);
          setUnlockedSols((prev) => (prev.includes(cur.sol) ? prev : [...prev, cur.sol]));
          triggerCelebration();
          if (cur.sol >= 10) {
            soundFX.playVictoryFanfare();
            setPhase('MISSION_DEBRIEF');
          } else {
            soundFX.playCardUnlock();
            setPhase('SOL_CARD_UNLOCK');
          }
          return;
        }

        setSolElapsed(nextElapsed);
      }

      rafId = requestAnimationFrame(step);
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [phase, triggerCelebration]);

  // Derived Astronaut Emotion & Telemetry
  const shieldOn = isRoomOn('shield');
  const greenhouseOn = isRoomOn('greenhouse');
  const scienceOn = isRoomOn('science');

  const astronautMood = useMemo(() => {
    if (resources.oxygen < 36) return 'sweating';
    if (flareStage === 'active' && shieldOn) return 'shielded';
    if (flareStage !== 'none' && !shieldOn) return 'visor';
    if (signalFeedback?.tone === 'success') return 'happy';
    return 'floating';
  }, [resources.oxygen, flareStage, shieldOn, signalFeedback]);

  const visorDown = flareStage !== 'none' || resources.radiation < 45;

  const radiationMsv = useMemo(() => {
    if (shieldOn) return planet === 'moon' ? '0.14' : '0.16';
    if (flareStage === 'active') return livePhysics.activeFlareMsv.toFixed(2);
    return planet === 'moon' ? '0.92' : '0.67';
  }, [shieldOn, flareStage, planet, livePhysics.activeFlareMsv]);

  // Planetary Atmospheric Stats (Mars Trek / Moon Trek + InSight Wind + DONKI CME Dust + Mini-Action Clean)
  const targetAtmos = useMemo<AtmosphericStats>(() => {
    const series = TREK_SOL_VARIATIONS[planet];
    const idx = Math.max(0, Math.min(series.length - 1, sol - 1));
    const base = series[idx];
    const flareBoost = flareStage !== 'none' ? 3 : 0;
    const dustRelief = dustCleanedThisSol ? 10 : 0;
    if (planet === 'mars') {
      return {
        tempC: Number((base.tempC + trekOffset.temp * 0.45).toFixed(1)),
        pressureVal: Math.round(base.pressureVal + trekOffset.pressure * 0.35),
        dustPct: Math.max(8, Math.min(95, base.dustPct + flareBoost + livePhysics.cmeDustBoost - dustRelief)),
      };
    }
    return {
      tempC: base.tempC,
      pressureVal: base.pressureVal,
      dustPct: Math.max(
        5,
        Math.min(60, base.dustPct + (flareStage !== 'none' ? 2 : 0) + Math.round(livePhysics.cmeDustBoost * 0.5) - dustRelief)
      ),
    };
  }, [planet, sol, trekOffset, flareStage, livePhysics.cmeDustBoost, dustCleanedThisSol]);

  const prevSolAtmos = useMemo<AtmosphericStats | null>(() => {
    if (sol <= 1) return null;
    const series = TREK_SOL_VARIATIONS[planet];
    const prevBase = series[Math.max(0, Math.min(series.length - 1, sol - 2))];
    if (planet === 'mars') {
      return {
        tempC: Number((prevBase.tempC + trekOffset.temp * 0.45).toFixed(1)),
        pressureVal: Math.round(prevBase.pressureVal + trekOffset.pressure * 0.35),
        dustPct: prevBase.dustPct,
      };
    }
    return prevBase;
  }, [planet, sol, trekOffset]);

  const [displayAtmos, setDisplayAtmos] = useState<AtmosphericStats>(targetAtmos);
  const [atmosSyncing, setAtmosSyncing] = useState<boolean>(false);
  const displayAtmosRef = useRef<AtmosphericStats>(targetAtmos);
  displayAtmosRef.current = displayAtmos;

  useEffect(() => {
    const from = displayAtmosRef.current;
    const to = targetAtmos;
    if (
      Math.abs(from.tempC - to.tempC) < 0.05 &&
      Math.abs(from.pressureVal - to.pressureVal) < 0.005 &&
      Math.abs(from.dustPct - to.dustPct) < 0.05
    ) {
      return;
    }

    setAtmosSyncing(true);
    let rafId = 0;
    const startTime = performance.now();
    const durationMs = 950;

    const tick = (now: number) => {
      const progress = Math.min(1, (now - startTime) / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayAtmos({
        tempC: Number((from.tempC + (to.tempC - from.tempC) * eased).toFixed(1)),
        pressureVal:
          planet === 'mars'
            ? Math.round(from.pressureVal + (to.pressureVal - from.pressureVal) * eased)
            : Number((from.pressureVal + (to.pressureVal - from.pressureVal) * eased).toFixed(2)),
        dustPct: Math.round(from.dustPct + (to.dustPct - from.dustPct) * eased),
      });
      if (progress < 1) {
        rafId = requestAnimationFrame(tick);
      } else {
        setAtmosSyncing(false);
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [targetAtmos, planet]);

  useEffect(() => {
    const activeDust =
      phase === 'PLAYING' || phase === 'SOL_CARD_UNLOCK' || phase === 'EMERGENCY_POD'
        ? displayAtmos.dustPct
        : planet === 'mars'
          ? 27
          : 14;
    soundFX.setDustLevel(activeDust);
  }, [phase, displayAtmos.dustPct, planet]);

  const mascotXPercent = mascotRoom === 'shield' ? 18 : mascotRoom === 'greenhouse' ? 50 : 81;
  const solPercent = Math.min(100, Math.round((solElapsed / SOL_DURATION_SEC) * 100));

  const currentCard = SCIENCE_CARDS[Math.min(sol - 1, SCIENCE_CARDS.length - 1)];

  // Dynamic per-Sol Mission Question, Live Gameplay Physics & Trackable Objective
  const solBrief = useMemo<SolBrief>(() => {
    const flr0 = donkiFlares[0] || CURATED_DONKI_FLARES[0];
    const flr1 = donkiFlares[1 % donkiFlares.length] || flr0;
    const flr2 = donkiFlares[2 % donkiFlares.length] || flr0;
    const cme0 = cmeEvents[0] || CURATED_DONKI_CMES[0];
    const cme1 = cmeEvents[1 % cmeEvents.length] || cme0;
    const r0 = roverPhotos[0] || CURATED_ROVER_PHOTOS[0];
    const r1 = roverPhotos[1 % roverPhotos.length] || r0;
    const r2 = roverPhotos[2 % roverPhotos.length] || r0;
    const neo0 = livePhysics.activeSolNeo;
    const isAr = lang === 'ar';
    const isLive = dataMode === 'live';

    const usableUrl = (candidate?: string) =>
      candidate && !failedPhotoUrls[candidate] ? candidate : '';

    const apodPhoto = !apodImgFailed ? usableUrl(apod.url) : '';
    const r0Photo = usableUrl(r0.imgSrc);
    const r1Photo = usableUrl(r1.imgSrc);
    const r2Photo = usableUrl(r2.imgSrc);

    const flrDate = (f: FlareRecord) => f.beginTime.split(' ')[0];
    const cmeDate = (c: CmeRecord) => c.startTime.split(' ')[0];

    const flrNow = livePhysics.activeSolFlare;
    const cmeNow = livePhysics.activeSolCme;
    const tempChip = isAr
      ? `الحرارة ${livePhysics.baseTemp}°C (${livePhysics.isColdSol ? 'برد قارس: O2 -3.1%/ث' : 'معتدل: شحن +6.2%/ث'})`
      : `Temp ${livePhysics.baseTemp}°C (${livePhysics.isColdSol ? 'Cold: O2 -3.1%/s' : 'Mild: O2 +6.2%/s'})`;
    const flareChip = isAr
      ? `توهج ${flrNow.classType} (${livePhysics.unshieldedFlareRadRate}%/ث أمان بدون درع) · CME ${cmeNow.speed} كم/ث`
      : `Flare ${flrNow.classType} (${livePhysics.unshieldedFlareRadRate}%/s unshielded) · CME ${cmeNow.speed} km/s`;

    switch (sol) {
      case 1:
        return {
          sol,
          sourceBadge: 'CSA · NASA Veggie & APOD',
          datasetTag: isLive
            ? `CSA Hydroponics · APOD ${apod.date}`
            : 'CSA Space Farming Dataset · RadLab',
          question: isAr
            ? `اليوم 1: وصلت بعثتك إلى ${planet === 'mars' ? 'فوهة جيزيرو' : 'القطب الجنوبي للقمر'}! شغّل البيت المحمي لرفع الأكسجين وسط برد ${livePhysics.baseTemp}°C.`
            : `Sol 1 Briefing: Welcome to ${planet === 'mars' ? 'Jezero Crater' : 'Artemis Base'}! Power the Greenhouse to charge crew O2 at ${livePhysics.baseTemp}°C.`,
          hint: isAr
            ? 'أبقِ البيت المحمي ON حتى يصل الأكسجين إلى 88%!'
            : 'Keep CSA Greenhouse ON until Oxygen reaches 88%!',
          physicsNote: tempChip,
          goalLabel: isAr ? 'الهدف: ارفع الأكسجين إلى 88% بالبيت المحمي (+10% علوم)' : 'Goal: Charge O2 to 88% via Greenhouse (+10% Sci)',
          goalType: 'charge_o2',
          photoUrl: apodPhoto || r0Photo,
          photoCaption: apod.title,
          photoCredit: `NASA APOD (${apod.date})`,
          isLiveTag: isLive,
        };
      case 2:
        return {
          sol,
          sourceBadge: 'NASA DONKI · FLR',
          datasetTag: `${isLive ? 'LIVE DONKI FLR' : 'DONKI FLR'} · ${flr0.classType} (${flrDate(flr0)})`,
          question: isAr
            ? `رصد DONKI توهجاً حقيقياً ${flr0.classType} (${flr0.sourceLocation}) يسبب ضرراً ${livePhysics.unshieldedFlareRadRate}%/ث دون درع! كيف ستحمي الطاقم؟`
            : `NASA DONKI tracked a real ${flr0.classType} flare at ${flr0.sourceLocation} (${livePhysics.unshieldedFlareRadRate}%/s unshielded)! Which room shields your crew?`,
          hint: isAr
            ? 'شغّل درع الإشعاع الأزرق قبل وصول ذروة الجسيمات!'
            : 'Switch the Blue Radiation Shield ON when the flare warning flashes!',
          physicsNote: `${flareChip} · ${isAr ? `مهلة إنذار ${livePhysics.warningDuration}ث` : `${livePhysics.warningDuration}s Warning`}`,
          goalLabel: isAr ? `الهدف: صد التوهج ${flr0.classType} بالدرع (+10% علوم)` : `Goal: Block ${flr0.classType} Flare with Shield (+10% Sci)`,
          goalType: 'block_flare',
          photoUrl: apodPhoto,
          photoCaption: isAr
            ? `رصد التوهج ${flr0.classType} · ${flr0.beginTime}`
            : `Tracked Solar Flare ${flr0.classType} · ${flr0.beginTime}`,
          photoCredit: 'NASA DONKI Space Weather API',
          isLiveTag: isLive,
        };
      case 3:
        return {
          sol,
          sourceBadge: 'NASA RadLab · Perseverance',
          datasetTag: `${r0Photo ? 'LIVE PERSEVERANCE' : 'NASA RADLAB'} · Sol ${r0.sol} (${radiationMsv} mSv/d)`,
          question: isAr
            ? `تُظهر كاميرا ${r0.camera} على المسبار Perseverance صخوراً قديمة، والجرعة ${radiationMsv} mSv/يوم! أرسل صورة المسبار إلى الأرض.`
            : `Perseverance (${r0.camera}, Sol ${r0.sol}) captured Mars rocks while RadLab reads ${radiationMsv} mSv/d! Beam this rover photo to Earth.`,
          hint: isAr
            ? 'شغّل غرفة العلوم وأكمل إرسال موجة واحدة نحو الأرض!'
            : 'Power Science & Comms ON until 1 Mars/Moon data packet reaches Earth!',
          physicsNote: `${tempChip} · ${isAr ? `الهدف: رفع ${r0.camera}` : `Payload: ${r0.camera} Sol ${r0.sol}`}`,
          goalLabel: isAr ? `الهدف: أرسل صورة Perseverance للأرض (+10% علوم)` : `Goal: Upload Perseverance Sol ${r0.sol} photo (+10% Sci)`,
          goalType: 'upload_rover',
          photoUrl: r0Photo || apodPhoto,
          photoCaption: `${r0.rover} · ${r0.camera} (Mars Sol ${r0.sol})`,
          photoCredit: `NASA Mars Rover Photos · ${r0.earthDate}`,
          isLiveTag: Boolean(r0Photo),
        };
      case 4:
        return {
          sol,
          sourceBadge: 'NASA DONKI FLR · Mars Trek',
          datasetTag: `${isLive ? 'LIVE DONKI FLR' : 'DONKI FLR'} · ${flr1.classType} · ${planet === 'mars' ? '5.0s Delay' : '1.3s Link'}`,
          question: isAr
            ? `مع توهج ${flr1.classType} وتأخر إشارة ${planet === 'mars' ? '5.0 ثوانٍ للمريخ' : '1.3 ثانية للقمر'}، واجه العاصفة الشمسية بالدرع في الوقت المناسب!`
            : `A ${flr1.classType} flare strikes alongside ${planet === 'mars' ? '5.0s Mars' : '1.3s Moon'} link delay! Keep Shield powered when the flare peaks.`,
          hint: isAr
            ? 'لا تنسَ: لا تطفئ العلوم أثناء موجة الراديو، ثم فعّل الدرع للعاصفة!'
            : 'Wait for active radio waves to finish, then keep Shield ON during peak flare!',
          physicsNote: flareChip,
          goalLabel: isAr ? `الهدف: صد التوهج ${flr1.classType} بالدرع (+10% علوم)` : `Goal: Block ${flr1.classType} Flare with Shield (+10% Sci)`,
          goalType: 'block_flare',
          photoUrl: r1Photo || apodPhoto,
          photoCaption: isAr
            ? `اتصال الفضاء العميق · توهج ${flr1.classType}`
            : `Deep Space Network Pass · Flare ${flr1.classType}`,
          photoCredit: 'NASA DONKI & Deep Space Network',
          isLiveTag: isLive,
        };
      case 5:
        return {
          sol,
          sourceBadge: 'NASA DONKI · CME',
          datasetTag: `${isLive ? 'LIVE DONKI CME' : 'DONKI CME'} · ${cme0.speed} km/s (${cmeDate(cme0)})`,
          question: isAr
            ? `انبعاث كتلي إكليلي (CME) بسرعة ${cme0.speed} كم/ث يزيد الغبار (+${livePhysics.cmeDustBoost}%) ويقلص الإنذار لـ ${livePhysics.warningDuration}ث! احمِ الطاقم والزرع.`
            : `Live DONKI CME racing at ${cme0.speed} km/s boosts dust (+${livePhysics.cmeDustBoost}%) and cuts warning to ${livePhysics.warningDuration}s! Shield crew and crops.`,
          hint: isAr
            ? 'ثبّت الدرع + البيت المحمي عندما تقترب موجة الـ CME!'
            : 'Pair Radiation Shield + Greenhouse when the CME shockwave arrives!',
          physicsNote: `${flareChip} · ${isAr ? `غبار +${livePhysics.cmeDustBoost}%` : `Dust +${livePhysics.cmeDustBoost}%`}`,
          goalLabel: isAr ? `الهدف: صد موجة CME (${cme0.speed} كم/ث) بالدرع` : `Goal: Defend CME (${cme0.speed} km/s) with Shield (+10% Sci)`,
          goalType: 'block_flare',
          photoUrl: apodPhoto || r0Photo,
          photoCaption: `CME ${cme0.speed} km/s · ${cme0.startTime}`,
          photoCredit: 'NASA DONKI CME Catalog',
          isLiveTag: isLive,
        };
      case 6:
        return {
          sol,
          sourceBadge: 'NASA APOD · NEO Asteroid Radar',
          datasetTag: `${isLive ? 'LIVE NEO & APOD' : 'NASA NEO & APOD'} · ${neo0.name}`,
          question: isAr
            ? `يرصد رادار ناسا الكويكب ${neo0.name} بسرعة ${neo0.speedKmH.toLocaleString()} كم/س! أرسل بيانات الكويكب وصورة "${apod.title}" إلى الأرض.`
            : `NASA NEO Radar is tracking asteroid ${neo0.name} at ${neo0.speedKmH.toLocaleString()} km/h! Upload this radar log & APOD "${apod.title}".`,
          hint: isAr
            ? 'اشحن الأكسجين ثم شغّل غرفة العلوم والاتصالات لإتمام الإرسال!'
            : 'Switch Science & Earth Comms ON until your NEO + APOD packet lands!',
          physicsNote: isAr
            ? `كويكب ${neo0.name} · مسافة ${(neo0.missKm / 1000).toFixed(0)} ألف كم · ${tempChip}`
            : `NEO ${neo0.name} · Miss ${(neo0.missKm / 1000).toFixed(0)}k km · ${tempChip}`,
          goalLabel: isAr ? `الهدف: أرسل رصد ${neo0.name} للأرض (+10% علوم)` : `Goal: Beam ${neo0.name} NEO log to Earth (+10% Sci)`,
          goalType: 'upload_neo',
          photoUrl: apodPhoto || r1Photo,
          photoCaption: apod.title,
          photoCredit: `NASA APOD & NEO Feed · ${apod.date}`,
          isLiveTag: isLive && (Boolean(apodPhoto) || neoObjects.length > 0),
        };
      case 7:
        return {
          sol,
          sourceBadge: 'NASA OSDR · DONKI FLR',
          datasetTag: `NASA OSDR Biology · ${flr2.classType} (${flrDate(flr2)})`,
          question: isAr
            ? `تدرس بيانات OSDR بكتيريا مفيدة للمحاصيل، بينما يقترب توهج ${flr2.classType} (${livePhysics.activeFlareMsv} mSv/d دون درع)! احمِ المحاصيل والطاقم.`
            : `NASA OSDR biology crops face flare ${flr2.classType} (${livePhysics.activeFlareMsv} mSv/d unshielded)! Protect both crops and crew!`,
          hint: isAr
            ? 'شغّل الدرع + البيت المحمي وقت ذروة التوهج ثم أعد الاتصالات.'
            : 'Keep Shield + Greenhouse active during peak flare, then switch to Science!',
          physicsNote: `${flareChip} · ${tempChip}`,
          goalLabel: isAr ? `الهدف: صد التوهج ${flr2.classType} بالدرع (+10% علوم)` : `Goal: Block ${flr2.classType} Flare with Shield (+10% Sci)`,
          goalType: 'block_flare',
          photoUrl: r2Photo || apodPhoto,
          photoCaption: `${r2.rover} · ${r2.camera} (Sol ${r2.sol})`,
          photoCredit: 'NASA OSDR & Perseverance Data',
          isLiveTag: isLive,
        };
      case 8:
        return {
          sol,
          sourceBadge: 'NASA InSight · Mars Trek · Perseverance',
          datasetTag: `${r1Photo ? 'LIVE PERSEVERANCE' : 'MARS TREK'} · Wind ${trekOffset.windMs} m/s · Sol ${r1.sol}`,
          question: isAr
            ? `وصل الغبار الكوكبي إلى ${Math.round(displayAtmos.dustPct)}% ورياح ${trekOffset.windMs} م/ث عند ${displayAtmos.tempC.toFixed(1)}°C! أرسل تقرير الطقس وصورة المسبار للأرض.`
            : `Dust hit ${Math.round(displayAtmos.dustPct)}% with ${trekOffset.windMs} m/s winds at ${displayAtmos.tempC.toFixed(1)}°C! Beam this terrain & weather log to Earth.`,
          hint: isAr
            ? 'وازِن الأكسجين أولاً ثم أبقِ العلوم ON لإكمال البث!'
            : 'Keep O2 healthy, then complete 1 Science & Comms upload to Earth!',
          physicsNote: isAr
            ? `رياح InSight ${trekOffset.windMs} م/ث · غبار ${Math.round(displayAtmos.dustPct)}% · ${tempChip}`
            : `InSight Wind ${trekOffset.windMs} m/s · Dust ${Math.round(displayAtmos.dustPct)}% · ${tempChip}`,
          goalLabel: isAr ? `الهدف: أرسل تقرير الطقس وصورة Sol ${r1.sol} (+10% علوم)` : `Goal: Upload Weather & Sol ${r1.sol} Photo (+10% Sci)`,
          goalType: 'upload_rover',
          photoUrl: r1Photo || apodPhoto,
          photoCaption: `${r1.rover} Terrain Check · ${r1.earthDate}`,
          photoCredit: 'NASA Mars Rover & InSight Telemetry',
          isLiveTag: Boolean(r1Photo),
        };
      case 9:
        return {
          sol,
          sourceBadge: 'NASA DONKI · RadLab DNA Repair',
          datasetTag: `${isLive ? 'LIVE DONKI' : 'DONKI'} · CME ${cme1.speed} km/s & FLR ${flr0.classType}`,
          question: isAr
            ? `اختبار أمان قصوى! انبعاث CME بسرعة ${cme1.speed} كم/ث مع توهج ${flrNow.classType} يرفع الجرعة إلى ${livePhysics.activeFlareMsv} mSv/d دون درع! احمِ الحمض النووي.`
            : `High-radiation alert! CME (${cme1.speed} km/s) + flare ${flrNow.classType} pushes dose to ${livePhysics.activeFlareMsv} mSv/d unshielded!`,
          hint: isAr
            ? 'الدرع الإشعاعي يخفض الجرعة إلى 0.16 mSv/d فوراً!'
            : 'Keep Blue Radiation Shield ON to drop dose to 0.16 mSv/d!',
          physicsNote: flareChip,
          goalLabel: isAr ? `الهدف: احمِ الطاقم من ${flrNow.classType} بالدرع (+10% علوم)` : `Goal: Shield crew from ${flrNow.classType} (+10% Sci)`,
          goalType: 'block_flare',
          photoUrl: apodPhoto || r2Photo,
          photoCaption: `RadLab DNA Shielding · CME ${cme1.speed} km/s`,
          photoCredit: 'NASA RadLab & DONKI',
          isLiveTag: isLive,
        };
      default:
        return {
          sol,
          sourceBadge: 'CSA · NASA Final Broadcast',
          datasetTag: `${isLive ? 'LIVE NASA TELEMETRY' : 'VERIFIED MISSION'} · Sol 10 Finale`,
          question: isAr
            ? `اليوم الأخير (Sol 10)! صد التوهج الشمسي النهائي ${flrNow.classType} وحافظ على الموارد فوق 0% لتحصل على شهادة القائد!`
            : `Final Sol 10! Block NASA's final ${flrNow.classType} solar storm and keep all 3 meters safe to earn your Commander Certificate!`,
          hint: isAr
            ? 'صد التوهج الأخير وحافظ على الموارد الثلاثة فوق 0%!'
            : 'Block the final flare and keep all 3 meters healthy through Sol 10!',
          physicsNote: `${flareChip} · ${tempChip}`,
          goalLabel: isAr ? `الهدف النهائي: صد العاصفة ${flrNow.classType} بالدرع (+10% علوم)` : `Final Goal: Block ${flrNow.classType} Storm with Shield (+10% Sci)`,
          goalType: 'block_flare',
          photoUrl: r2Photo || apodPhoto,
          photoCaption: isAr
            ? 'البث الختامي لقاعدة أسترو كيدز'
            : 'AstroKids Final Outpost Broadcast',
          photoCredit: 'NASA & CSA Challenge Finale',
          isLiveTag: isLive,
        };
    }
  }, [
    sol,
    planet,
    lang,
    dataMode,
    donkiFlares,
    cmeEvents,
    roverPhotos,
    neoObjects,
    apod,
    apodImgFailed,
    failedPhotoUrls,
    radiationMsv,
    displayAtmos.dustPct,
    displayAtmos.tempC,
    trekOffset.windMs,
    livePhysics,
  ]);

  // Auto-read aloud Sol questions, Science Cards & Emergency Pod tips when enabled in Settings
  useEffect(() => {
    if (!autoReadAloud) return;
    if (showSourcesModal || showAlbumModal || showSettingsModal || showSolPhotoModal || activeTerm) {
      return;
    }
    if (phase === 'PLAYING') {
      speakNow('sol-brief', `${solBrief.question} ${solBrief.hint}`);
    } else if (phase === 'SOL_CARD_UNLOCK') {
      speakNow('sol-card', `${currentCard.title[lang]}. ${currentCard.fact[lang]}`);
    } else if (phase === 'EMERGENCY_POD') {
      const tip =
        emergencyReason === 'oxygen'
          ? t(
              `Safe Rescue for ${commanderName}! Switch your CSA Greenhouse back ON whenever oxygen dips below 50 percent.`,
              `إنقاذ آمن للقائد ${commanderName}! أعد تشغيل البيت المحمي عندما ينخفض الأكسجين.`
            )
          : emergencyReason === 'radiation'
            ? t(
                `Safe Rescue for ${commanderName}! Flip the Blue Radiation Shield ON when solar flares arrive.`,
                `إنقاذ آمن للقائد ${commanderName}! شغّل الدرع الأزرق فور إنذار العاصفة.`
              )
            : t(
                `Safe Rescue for ${commanderName}! Keep Science and Comms ON until your radio wave reaches Earth.`,
                `إنقاذ آمن للقائد ${commanderName}! أبقِ العلوم تعمل حتى تصل الموجة للأرض.`
              );
      speakNow('pod-save', tip);
    }
  }, [
    autoReadAloud,
    phase,
    sol,
    lang,
    solBrief.question,
    solBrief.hint,
    currentCard,
    emergencyReason,
    commanderName,
    showSourcesModal,
    showAlbumModal,
    showSettingsModal,
    showSolPhotoModal,
    activeTerm,
    speakNow,
    t,
  ]);

  // Onboard AI Computer summary for Sol Complete card
  const solEndCauseEffect = useMemo(() => {
    if (causeEffectNote?.sentence) return causeEffectNote.sentence;
    const isAr = lang === 'ar';
    if (shieldOn && greenhouseOn) {
      return isAr
        ? 'بتشغيل الدرع والبيت المحمي معاً، حافظتَ على أمان الطاقم وتوليد الأكسجين عبر LED بينما بقيت اتصالات الأرض في وضع الاستعداد.'
        : 'By pairing the Shield Dome with the CSA Hydroponic Farm, you protected crew DNA and grew fresh O2 while Earth comms rested on standby.';
    }
    if (greenhouseOn && scienceOn) {
      return isAr
        ? 'تغذية البيت المحمي ومختبر العلوم سمحت للنباتات بتجديد الأكسجين أثناء بث البيانات للأرض دون تشغيل الدرع الإشعاعي.'
        : 'Powering CSA Hydroponics alongside Science & Comms kept photosynthesis running while beaming data to Earth, trading off outer radiation shielding.';
    }
    if (shieldOn && scienceOn) {
      return isAr
        ? 'توجيه الطاقة للدرع ومختبر العلوم حمى الطاقم أثناء إرسال الحزمة العلمية للأرض، ما قلل طاقة مصابيح النمو المائية مؤقتاً.'
        : 'Diverting power to the Radiation Shield and Science Dish protected the crew during Earth transmission while dimming CSA grow-lights.';
    }
    return isAr
      ? 'كل تبديل بين غرفتين من أصل ثلاث يعلّم رواد الفضاء كيفية موازنة الحياة والأمان والعلوم بموارد محدودة.'
      : 'Every 2-of-3 power trade balances life-support oxygen, radiation protection, and science transmissions just like real NASA missions.';
  }, [causeEffectNote, lang, shieldOn, greenhouseOn, scienceOn]);

  // Live NASA Telemetry News Ticker items
  const telemetryTickerItems = useMemo(() => {
    const flr = livePhysics.activeSolFlare;
    const cme = livePhysics.activeSolCme;
    const neo = livePhysics.activeSolNeo;
    const isAr = lang === 'ar';

    if (isAr) {
      return [
        `☀️ NASA DONKI FLR: أحدث توهج ${flr.classType} (${flr.beginTime}) · المنطقة ${flr.sourceLocation}`,
        `🌪️ NASA DONKI CME: سرعة الانبعاث ${cme.speed} كم/ث · زاوية ${cme.halfAngle}°`,
        `☢️ NASA RadLab: متوسط الجرعة في محطة ISS ~0.55 mSv/يوم · جرعة القاعدة الآن ${radiationMsv} mSv/يوم`,
        planet === 'mars'
          ? `🔴 Mars Trek & InSight: فوهة جيزيرو ${displayAtmos.tempC.toFixed(1)}°C · الضغط ${Math.round(displayAtmos.pressureVal)} Pa · غبار ${Math.round(displayAtmos.dustPct)}% · رياح ${trekOffset.windMs} م/ث`
          : `🌙 Moon Trek (أرتميس): القطب الجنوبي ${displayAtmos.tempC.toFixed(1)}°C · الضغط ${displayAtmos.pressureVal.toFixed(2)} nPa · غبار ${Math.round(displayAtmos.dustPct)}%`,
        `☄️ NASA NeoWs: الكويكب ${neo.name} بسرعة ${neo.speedKmH.toLocaleString()} كم/س`,
        `🌿 CSA الزراعة المائية: النباتات تمتص CO2 وتنتج الأكسجين تحت مصابيح LED`,
        `📡 شبكة الفضاء العميق: إشارة القمر 1.3ث · تأخر المريخ 4–22 دقيقة (محاكاة 5.0ث)`,
      ];
    }

    return [
      `☀️ NASA DONKI FLR: Latest Flare ${flr.classType} (${flr.beginTime}) · ${flr.sourceLocation}`,
      `🌪️ NASA DONKI CME: Speed ${cme.speed} km/s · Half-Angle ${cme.halfAngle}° (${cme.severity})`,
      `☢️ NASA RadLab: ISS Avg Dose ~0.55 mSv/day · Outpost Live Dose: ${radiationMsv} mSv/day`,
      planet === 'mars'
        ? `🔴 Jezero Crater (Mars Trek / InSight): ${displayAtmos.tempC.toFixed(1)}°C · ${Math.round(displayAtmos.pressureVal)} Pa · Dust ${Math.round(displayAtmos.dustPct)}% · Wind ${trekOffset.windMs} m/s`
        : `🌙 Artemis South Pole (Moon Trek): ${displayAtmos.tempC.toFixed(1)}°C · ${displayAtmos.pressureVal.toFixed(2)} nPa · Regolith Dust ${Math.round(displayAtmos.dustPct)}%`,
      `☄️ NASA NeoWs Radar: Asteroid ${neo.name} at ${neo.speedKmH.toLocaleString()} km/h`,
      `🌿 CSA Hydroponics: LED grow-lights turn crew CO2 into fresh breathable O2`,
      `📡 Deep Space Network: Moon light-speed link 1.3s · Mars delay 4–22 min (5.0s sim)`,
    ];
  }, [
    livePhysics.activeSolFlare,
    livePhysics.activeSolCme,
    livePhysics.activeSolNeo,
    lang,
    radiationMsv,
    planet,
    displayAtmos.tempC,
    displayAtmos.pressureVal,
    displayAtmos.dustPct,
    trekOffset.windMs,
  ]);

  const earnedRank = useMemo(() => {
    if (
      resources.oxygen >= 65 &&
      resources.radiation >= 65 &&
      resources.science >= 65 &&
      telemetry.podSavesUsed === 0
    ) {
      return {
        title: { en: 'Master Space Strategist', ar: 'مخطط الفضاء البارع' },
        reason: {
          en: 'Balanced life support, radiation safety, and science with zero emergency saves.',
          ar: 'وازنتَ بين الأكسجين والدرع والعلوم بذكاء دون أي عملية إنقاذ طارئة.',
        },
      };
    }
    if (telemetry.flaresBlocked >= Math.max(1, telemetry.flaresTotal) && resources.radiation >= 60) {
      return {
        title: { en: 'Solar Storm Guardian', ar: 'حارس العواصف الشمسية' },
        reason: {
          en: 'Blocked every incoming NASA DONKI solar flare to protect the outpost crew.',
          ar: 'صددتَ كل العواصف الشمسية من ناسا لحماية طاقم القاعدة.',
        },
      };
    }
    if (telemetry.signalsSent >= 4 && resources.science >= 65) {
      return {
        title: { en: 'Deep Space Signal Ace', ar: 'بطل إشارات الفضاء العميق' },
        reason: {
          en: 'Mastered space-to-Earth radio uplinks and delivered high-value NASA science.',
          ar: 'أتقنتَ إرسال البيانات العلمية عبر الفضاء بنجاح نحو كوكب الأرض.',
        },
      };
    }
    return {
      title: { en: 'Resilient Outpost Pioneer', ar: 'رائد القاعدة الفضائية الشجاع' },
      reason: {
        en: 'Guided the crew safely through all 10 Sols with steady resource trade-offs.',
        ar: 'قدتَ الطاقم بأمان عبر 10 أيام فضائية كاملة بموازنة ذكية للموارد.',
      },
    };
  }, [resources, telemetry]);

  // Zero-Lag Interactive Room Mini-Actions (CSA Crop Harvest & Surface Dust Brushing)
  const handleHarvestCrops = useCallback(() => {
    const cur = stateRef.current;
    if (cur.phase !== 'PLAYING' || cur.isPaused) return;
    if (!cur.activeRooms.includes('greenhouse') || harvestUsedThisSol) return;
    soundFX.unlock();
    soundFX.playSignalSuccess();
    setHarvestUsedThisSol(true);
    setHasActedThisSol(true);
    triggerCelebration();
    setResources((prev) => ({
      ...prev,
      oxygen: Math.min(100, prev.oxygen + 5),
      science: Math.min(100, prev.science + 3),
    }));
    setMascotRoom('greenhouse');
    setMascotNote(
      lang === 'ar'
        ? 'تم حصاد خس الفضاء المائي بنجاح! +5% أكسجين و+3% علوم!'
        : 'Fresh CSA space lettuce harvested! +5% O2 & +3% Science!'
    );
    setCauseEffectNote({
      tone: 'emerald',
      sentence:
        lang === 'ar'
          ? 'حصاد النباتات الناضجة في مزرعة CSA المائية يحفّز نمو شتلات جديدة، مما رفع الأكسجين +5% وأضاف بيانات أحياء +3%.'
          : 'Harvesting ripe CSA hydroponic greens clears room for new seedlings—boosting O2 efficiency by +5% and crop biology data by +3%.',
    });
  }, [harvestUsedThisSol, lang, triggerCelebration]);

  const handleBrushDust = useCallback(() => {
    const cur = stateRef.current;
    if (cur.phase !== 'PLAYING' || cur.isPaused) return;
    if (dustCleanedThisSol) return;
    soundFX.unlock();
    soundFX.playSwitch(true);
    setDustCleanedThisSol(true);
    setHasActedThisSol(true);
    triggerCelebration();
    setResources((prev) => ({
      ...prev,
      oxygen: Math.min(100, prev.oxygen + 2),
      science: Math.min(100, prev.science + 3),
    }));
    setMascotNote(
      lang === 'ar'
        ? 'تم تنظيف الغبار عن الألواح الشمسية والعدسات! انخفض الغبار -10% وزادت العلوم +3%!'
        : 'Brushed dust off solar panels & optics! Dust -10%, +3% Science & +2% O2!'
    );
    setCauseEffectNote({
      tone: 'amber',
      sentence:
        lang === 'ar'
          ? 'إزالة الغبار الكهروستاتيكي عن الألواح والمستشعرات أعادت كفاءة الطاقة وخفضت الغبار -10% لهذا اليوم.'
          : 'Clearing clinging surface dust restored solar array & optical sensor efficiency—cutting dust load by 10% and adding +3% Science.',
    });
  }, [dustCleanedThisSol, lang, triggerCelebration]);

  // Save best Mission Record per world in localStorage when reaching MISSION_DEBRIEF
  useEffect(() => {
    if (phase !== 'MISSION_DEBRIEF') {
      recordedDebriefRef.current = false;
      return;
    }
    if (recordedDebriefRef.current) return;
    recordedDebriefRef.current = true;

    const record: SavedMissionRecord = {
      planet,
      commanderName,
      science: Math.round(resources.science),
      oxygen: Math.round(resources.oxygen),
      radiation: Math.round(resources.radiation),
      rankTitle: earnedRank.title,
      flaresBlocked: telemetry.flaresBlocked,
      flaresTotal: Math.max(telemetry.flaresTotal, telemetry.flaresBlocked),
      signalsSent: telemetry.signalsSent,
      podSavesUsed: telemetry.podSavesUsed,
      switchToggles: telemetry.switchToggles,
      completedAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    };

    setMissionLog((prev) => {
      const existing = prev[planet];
      const shouldReplace =
        !existing ||
        record.science > existing.science ||
        (record.science === existing.science && record.podSavesUsed <= existing.podSavesUsed);
      const nextLog: MissionLogMap = shouldReplace ? { ...prev, [planet]: record } : prev;
      writeMissionLog(nextLog);
      return nextLog;
    });
  }, [phase, planet, commanderName, resources, earnedRank.title, telemetry]);

  // --------------------------------------------------------------------------
  // HIGH-CRAFT DOWNLOADABLE PNG CERTIFICATE GENERATOR (ENGLISH & ARABIC)
  // --------------------------------------------------------------------------
  const downloadCertificatePng = useCallback(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1480;
    canvas.height = 1120;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const isAr = lang === 'ar';

    // Deep cosmos royal outer background
    const bgGrad = ctx.createLinearGradient(0, 0, 1480, 1120);
    bgGrad.addColorStop(0, '#071024');
    bgGrad.addColorStop(0.5, '#0d1b38');
    bgGrad.addColorStop(1, '#071024');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1480, 1120);

    // Subtle decorative stars on outer frame
    ctx.fillStyle = '#fde68a';
    [
      [42, 42], [1438, 42], [42, 1078], [1438, 1078],
      [740, 22], [320, 22], [1160, 22], [320, 1098], [1160, 1098],
    ].forEach(([sx, sy]) => {
      ctx.beginPath();
      ctx.arc(sx, sy, 3.5, 0, Math.PI * 2);
      ctx.fill();
    });

    // Warm ivory parchment inner certificate sheet
    ctx.fillStyle = '#fffcf2';
    ctx.fillRect(46, 46, 1388, 1028);

    // Metallic gold outer border + dark navy inner frame + dashed orbital accent
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 7;
    ctx.strokeRect(62, 62, 1356, 996);

    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(76, 76, 1328, 968);

    ctx.save();
    ctx.setLineDash([8, 6]);
    ctx.strokeStyle = '#b45309';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(88, 88, 1304, 944);
    ctx.restore();

    // Ornate corner gold medallions
    [
      [76, 76], [1404, 76], [76, 1044], [1404, 1044],
    ].forEach(([cx, cy]) => {
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(cx, cy, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(cx, cy, 5, 0, Math.PI * 2);
      ctx.fill();
    });

    // Top Navy & Gold Ribbon Banner
    ctx.fillStyle = '#0f1d3a';
    ctx.fillRect(190, 118, 1100, 62);
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.strokeRect(190, 118, 1100, 62);

    ctx.fillStyle = '#fde68a';
    ctx.font = isAr ? '700 22px "Cairo", sans-serif' : '700 21px "Outfit", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(
      isAr
        ? 'أسترو كيدز: قيادة القاعدة الفضائية · تحدي تطبيقات الفضاء من ناسا'
        : 'ASTROKIDS: OUTPOST COMMAND · NASA SPACE APPS CHALLENGE',
      740,
      157
    );

    // Main Certificate Title
    ctx.fillStyle = '#92400e';
    ctx.font = isAr ? '800 48px "Cairo", sans-serif' : '800 46px "Outfit", sans-serif';
    ctx.fillText(
      isAr ? 'شهادة تميّز لقائد مهمة ناسا الصغير' : 'JUNIOR NASA MISSION COMMANDER',
      740,
      238
    );

    ctx.fillStyle = '#0f172a';
    ctx.font = isAr ? '700 26px "Cairo", sans-serif' : '700 25px "Outfit", sans-serif';
    ctx.fillText(
      isAr ? 'وسام الإنجاز الفضائي الرسمي' : 'OFFICIAL CERTIFICATE OF EXCELLENCE',
      740,
      282
    );

    // Gold stars separator
    ctx.fillStyle = '#d97706';
    ctx.font = '700 24px sans-serif';
    ctx.fillText('★   ★   ★', 740, 322);

    // Recipient intro
    ctx.fillStyle = '#475569';
    ctx.font = isAr ? '600 23px "Cairo", sans-serif' : '600 21px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(
      isAr ? 'تُمنح هذه الشهادة التقديرية بكل فخر إلى البطل:' : 'THIS OFFICIAL MISSION CITATION IS PROUDLY AWARDED TO',
      740,
      362
    );

    // Illuminated Commander Name Plaque
    ctx.fillStyle = '#eef6ff';
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 3;
    ctx.fillRect(280, 384, 920, 92);
    ctx.strokeRect(280, 384, 920, 92);

    ctx.fillStyle = '#0c4a6e';
    ctx.font = isAr ? '800 52px "Cairo", sans-serif' : '800 56px "Outfit", sans-serif';
    ctx.fillText(commanderName, 740, 446);

    // Inspiring Certificate Motto directly under Commander Name
    ctx.fillStyle = '#78350f';
    ctx.font = isAr
      ? 'italic 700 21px "Cairo", sans-serif'
      : 'italic 600 21px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(
      isAr
        ? '«رائد الفضاء الذكي ليس من يتجنب الخطر،'
        : '“A smart astronaut isn\'t the one who avoids danger—',
      740,
      514
    );
    ctx.fillText(
      isAr
        ? 'بل من يتخذ القرار الصحيح في الوقت المناسب.»'
        : 'it\'s the one who makes the right choice at the right time.”',
      740,
      542
    );

    // Mission citation line
    const siteLabel =
      planet === 'moon'
        ? isAr
          ? 'قاعدة أرتميس على سطح القمر'
          : 'Moon (Artemis Base)'
        : isAr
          ? 'فوهة جيزيرو على كوكب المريخ'
          : 'Mars (Jezero Crater)';

    ctx.fillStyle = '#1e293b';
    ctx.font = isAr ? '600 22px "Cairo", sans-serif' : '600 21px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(
      isAr
        ? `لإتمامه قيادة ${siteLabel} بنجاح عبر 10 أيام فضائية كاملة`
        : `For successfully commanding ${siteLabel} across all 10 Sols`,
      740,
      590
    );

    // Rank Ribbon Box
    ctx.fillStyle = '#fef3c7';
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 3;
    ctx.fillRect(370, 618, 740, 66);
    ctx.strokeRect(370, 618, 740, 66);

    ctx.fillStyle = '#92400e';
    ctx.font = isAr ? '800 27px "Cairo", sans-serif' : '800 26px "Outfit", sans-serif';
    ctx.fillText(
      isAr ? `الرتبة المكتسبة: ${earnedRank.title.ar}` : `RANK EARNED: ${earnedRank.title.en.toUpperCase()}`,
      740,
      660
    );

    // 4 Score Cards
    const metrics = [
      {
        label: isAr ? 'نقاط العلوم' : 'SCIENCE SCORE',
        val: `${Math.round(resources.science)}%`,
        color: '#b45309',
      },
      {
        label: isAr ? 'دعم الحياة (O2)' : 'LIFE SUPPORT (O2)',
        val: `${Math.round(resources.oxygen)}%`,
        color: '#047857',
      },
      {
        label: isAr ? 'أمان الإشعاع' : 'RADIATION SAFETY',
        val: `${Math.round(resources.radiation)}%`,
        color: '#0369a1',
      },
      {
        label: isAr ? 'بطاقات العلوم' : 'SCIENCE CARDS',
        val: `${unlockedSols.length} / 10`,
        color: '#0f172a',
      },
    ];

    metrics.forEach((m, i) => {
      const boxX = 160 + i * 295;
      ctx.fillStyle = '#f8fafc';
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 2;
      ctx.fillRect(boxX, 720, 265, 114);
      ctx.strokeRect(boxX, 720, 265, 114);

      ctx.fillStyle = '#475569';
      ctx.font = isAr ? '700 17px "Cairo", sans-serif' : '700 15px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(m.label, boxX + 132, 758);

      ctx.fillStyle = m.color;
      ctx.font = '800 38px "JetBrains Mono", monospace';
      ctx.fillText(m.val, boxX + 132, 808);
    });

    // Gold Seal Emblem bottom center
    ctx.fillStyle = '#0f1d3a';
    ctx.beginPath();
    ctx.arc(740, 922, 46, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.fillStyle = '#fbbf24';
    ctx.font = '700 36px sans-serif';
    ctx.fillText('★', 740, 935);

    // Date & Signature Lines
    const todayStr = new Date().toLocaleDateString(isAr ? 'ar-EG' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    ctx.fillStyle = '#334155';
    ctx.font = isAr ? '700 18px "Cairo", sans-serif' : '600 18px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(isAr ? `تاريخ الإتمام: ${todayStr}` : `Completed: ${todayStr}`, 130, 930);
    ctx.textAlign = 'right';
    ctx.fillText(
      isAr ? 'توقيع: مدير رحلات أسترو كيدز' : 'Signed: AstroKids Flight Director',
      1350,
      930
    );

    ctx.textAlign = 'center';
    ctx.fillStyle = '#64748b';
    ctx.font = isAr ? '500 15px "Cairo", sans-serif' : '500 15px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(
      isAr
        ? 'مبنية على بيانات حقيقية من NASA DONKI وAPOD وOSDR وRadLab وMars Trek وCSA'
        : 'Grounded in real data from NASA DONKI, APOD, OSDR, RadLab, Mars Trek & CSA',
      740,
      998
    );

    const link = document.createElement('a');
    const safeFile = commanderName.toLowerCase().replace(/[^a-z0-9\u0600-\u06FF]+/g, '-');
    link.download = `astrokids-certificate-${safeFile || 'commander'}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }, [commanderName, planet, earnedRank, resources, unlockedSols.length, lang]);

  // ==========================================================================
  // RENDER: TITLE MENU
  // ==========================================================================
  if (phase === 'TITLE_MENU') {
    return (
      <div
        dir={lang === 'ar' ? 'rtl' : 'ltr'}
        className="min-h-screen w-full bg-[#080e1c] text-slate-100 flex flex-col justify-between relative overflow-hidden"
      >
        {/* Atmospheric SVG Starfield + Planet Horizon Backdrop */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none select-none"
          viewBox="0 0 1440 900"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
        >
          <defs>
            <radialGradient id="titleGlow" cx="72%" cy="32%" r="55%">
              <stop
                offset="0%"
                stopColor={planet === 'mars' ? '#b45309' : '#1e3a8a'}
                stopOpacity="0.32"
              />
              <stop offset="100%" stopColor="#080e1c" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="horizonGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={planet === 'mars' ? '#7c2d12' : '#334155'} />
              <stop offset="100%" stopColor={planet === 'mars' ? '#2c1008' : '#0f172a'} />
            </linearGradient>
          </defs>

          <rect width="1440" height="900" fill="#080e1c" />
          <rect width="1440" height="900" fill="url(#titleGlow)" />

          {[
            [110, 90, 2], [240, 160, 1.5], [390, 75, 2], [540, 140, 1.2], [720, 60, 2.2],
            [890, 130, 1.5], [1050, 80, 2], [1220, 145, 1.8], [1340, 95, 1.4],
            [160, 280, 1.4], [480, 250, 1.8], [970, 240, 1.5], [1280, 290, 2.1],
            [80, 410, 1.3], [610, 340, 1.6], [1160, 380, 1.4],
          ].map(([cx, cy, r], i) => (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={r}
              fill="#e2e8f0"
              opacity={0.55 + (i % 3) * 0.15}
              className={
                i % 3 === 0
                  ? 'animate-twinkle-1'
                  : i % 3 === 1
                    ? 'animate-twinkle-2'
                    : 'animate-twinkle-3'
              }
              style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
            />
          ))}

          {/* Occasional Title Screen Shooting Stars */}
          <g transform="translate(220, 72)" className="pointer-events-none">
            <g className="animate-shooting-star-1">
              <line x1="0" y1="0" x2="54" y2="23" stroke="#bae6fd" strokeWidth="2.2" strokeLinecap="round" opacity="0.85" />
              <circle cx="54" cy="23" r="2.6" fill="#fef08a" />
            </g>
          </g>
          <g transform="translate(860, 52)" className="pointer-events-none">
            <g className="animate-shooting-star-2">
              <line x1="0" y1="0" x2="46" y2="20" stroke="#fde68a" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
              <circle cx="46" cy="20" r="2.2" fill="#ffffff" />
            </g>
          </g>

          <g transform="translate(1190, 175)">
            <circle r="34" fill="#1d4ed8" />
            <path d="M-14 -18 Q-2 -10 8 -20 Q18 -8 10 8 Q-4 20 -18 6 Z" fill="#22c55e" opacity="0.8" />
            <circle r="38" fill="none" stroke="#60a5fa" strokeWidth="1.5" opacity="0.35" />
          </g>

          <path
            d="M0 730 Q260 660 520 715 T1040 695 T1440 725 L1440 900 L0 900 Z"
            fill="url(#horizonGrad)"
          />

          <g transform="translate(920, 608)">
            <path
              d="M-30 92 C-30 -25, 350 -25, 350 92"
              fill="#38bdf8"
              fillOpacity="0.08"
              stroke="#38bdf8"
              strokeOpacity="0.45"
              strokeWidth="2"
            />
            <rect x="0" y="34" width="320" height="62" rx="14" fill="#162238" stroke="#475569" strokeWidth="2" />
            <rect x="24" y="48" width="76" height="32" rx="6" fill="#0ea5e9" fillOpacity="0.3" />
            <rect x="122" y="48" width="76" height="32" rx="6" fill="#10b981" fillOpacity="0.32" />
            <rect x="220" y="48" width="76" height="32" rx="6" fill="#f59e0b" fillOpacity="0.3" />
            <line x1="258" y1="34" x2="258" y2="12" stroke="#94a3b8" strokeWidth="3" />
            <path d="M242 14 Q258 2 274 14" fill="none" stroke="#fbbf24" strokeWidth="2.5" />
          </g>
        </svg>

        {/* Top Utility Row */}
        <header className="relative z-10 flex flex-wrap items-center justify-between gap-3 px-6 sm:px-10 pt-6">
          <div className="flex items-center gap-2.5 text-xs sm:text-sm font-bold text-white">
            <Rocket className="w-4 h-4 text-sky-400 shrink-0" />
            <span className="font-display tracking-wide">
              {t('AstroKids: Outpost Command', 'أسترو كيدز: قيادة القاعدة الفضائية')}
            </span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span className="text-xs font-medium text-slate-400">
              {t('NASA Space Apps Challenge', 'تحدي تطبيقات الفضاء من ناسا')}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={toggleLang}
              className="min-h-[44px] px-3.5 py-2 rounded-lg border border-sky-500/50 bg-slate-900/80 hover:bg-slate-800 text-sm font-bold text-sky-300 transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer"
            >
              <Languages className="w-4 h-4" />
              <span>{lang === 'en' ? 'العربية' : 'English'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowSourcesModal(true)}
              className="min-h-[44px] px-4 py-2 rounded-lg border border-slate-700/80 bg-slate-900/70 hover:bg-slate-800 text-sm font-medium text-slate-200 transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer"
            >
              <BookOpen className="w-4 h-4 text-amber-400" />
              <span>{t('NASA & CSA Data Sources', 'مصادر بيانات ناسا وكندا')}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowSettingsModal(true)}
              className="min-h-[44px] px-4 py-2 rounded-lg border border-indigo-400/50 bg-indigo-950/60 hover:bg-indigo-900/70 text-sm font-semibold text-indigo-200 transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer"
            >
              <Settings className="w-4 h-4 text-indigo-300" />
              <span>{t('Settings & Credits', 'الإعدادات والفريق')}</span>
            </button>

            <button
              type="button"
              onClick={toggleAmbient}
              aria-pressed={ambientOn}
              title={t('Toggle ambient space loop', 'تشغيل/إيقاف موسيقى الفضاء')}
              className={`min-h-[44px] px-3 rounded-lg border flex items-center gap-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                ambientOn && !isMuted
                  ? 'border-emerald-500/50 bg-emerald-950/60 text-emerald-300'
                  : 'border-slate-700/80 bg-slate-900/70 text-slate-400'
              }`}
            >
              <Music className="w-4 h-4" />
              <span className="hidden sm:inline">{t('Ambient', 'صوت الفضاء')}</span>
            </button>

            <button
              type="button"
              onClick={toggleMute}
              aria-label={isMuted ? 'Unmute sound effects' : 'Mute sound effects'}
              className="min-h-[44px] min-w-[44px] rounded-lg border border-slate-700/80 bg-slate-900/70 hover:bg-slate-800 text-slate-200 flex items-center justify-center transition-colors cursor-pointer"
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-slate-400" /> : <Volume2 className="w-4 h-4 text-sky-400" />}
            </button>
          </div>
        </header>

        {/* Main Kid-Friendly Hero: Rocket & Astronaut Centerpiece + Name + Destinations */}
        <main className="relative z-10 max-w-6xl w-full mx-auto px-5 sm:px-8 py-6 space-y-6">
          {/* Playful Cartoon Centerpiece Banner */}
          <div className="bg-gradient-to-br from-[#101e3b]/95 via-[#13254b]/90 to-[#0e1933]/95 border-2 border-sky-400/40 rounded-3xl p-5 sm:p-7 shadow-2xl grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            <div className="lg:col-span-7 space-y-4">
              {lang === 'en' ? (
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-amber-400/15 border border-amber-400/40 text-amber-200 text-xs font-bold">
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>AGES 7–12 SPACE MISSION</span>
                  </div>
                  <h1 className="font-display font-extrabold text-4xl sm:text-5xl text-white tracking-tight leading-none">
                    ASTROKIDS:{' '}
                    <span className="bg-gradient-to-r from-sky-300 via-emerald-300 to-amber-300 bg-clip-text text-transparent">
                      OUTPOST COMMAND
                    </span>
                  </h1>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-amber-400/15 border border-amber-400/40 text-amber-200 text-xs font-bold">
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>مهمة فضائية للأبطال بعمر 7–12</span>
                  </div>
                  <h1 className="font-display font-extrabold text-3xl sm:text-5xl text-white leading-tight">
                    أسترو كيدز:{' '}
                    <span className="text-sky-300">قيادة القاعدة الفضائية</span>
                  </h1>
                </div>
              )}

              <p className="text-sm sm:text-base text-slate-200 max-w-xl leading-relaxed">
                {t(
                  'Command a 3-room Moon or Mars base across 10 Sols! You can only power 2 rooms at once—shield your crew from real NASA solar storms, grow space veggies, and beam science back to Earth!',
                  'قُد قاعدة على القمر أو المريخ من 3 غرف عبر 10 أيام! يمكنك تشغيل غرفتين فقط في نفس الوقت—احمِ طاقمك من عواصف ناسا الشمسية، ازرع خضروات الفضاء، وأرسل العلوم إلى الأرض!'
                )}
              </p>

              {/* Big Colorful Astronaut Name Input Box */}
              <div className="bg-gradient-to-r from-sky-950/90 via-indigo-950/80 to-emerald-950/80 border-2 border-sky-400/70 rounded-2xl p-4 space-y-2 shadow-lg">
                <label
                  htmlFor="commander-name-input"
                  className="text-sm sm:text-base font-display font-extrabold text-amber-300 flex items-center gap-2"
                >
                  <UserCheck className="w-4 h-4 shrink-0 text-emerald-300" />
                  <span>
                    {t('Enter Your Astronaut Name:', 'اكتب اسمك أيها الرائد:')}
                  </span>
                </label>
                <input
                  id="commander-name-input"
                  type="text"
                  maxLength={32}
                  value={commanderInput}
                  onChange={(e) => setCommanderInput(e.target.value)}
                  placeholder={t('Commander Omar', 'القائد عمر')}
                  className="w-full min-h-[50px] px-4 py-2.5 rounded-xl bg-slate-950/95 border-2 border-emerald-400/60 focus:border-amber-300 focus:outline-none text-lg sm:text-xl font-display font-bold text-white placeholder:text-slate-400"
                />
                <div className="text-xs text-sky-200 flex items-center justify-between gap-2">
                  <span>
                    {commanderInput.trim()
                      ? t(`Welcome aboard, ${commanderName}!`, `أهلاً بك على متن الصاروخ يا ${commanderName}!`)
                      : t('Your name appears on your NASA Mission Badge & Certificate!', 'سيظهر اسمك على شارة المهمة وشهادة التخرج!')}
                  </span>
                </div>
              </div>
            </div>

            {/* Center/Right Cartoon Rocket & Smiling Astronaut Illustration */}
            <div className="lg:col-span-5 flex flex-col items-center justify-center">
              <svg
                viewBox="0 0 380 280"
                className="w-full max-w-[360px] h-auto drop-shadow-2xl"
                role="img"
                aria-label="Cartoon rocket and smiling astronaut mascot in starry space"
              >
                <defs>
                  <radialGradient id="heroSpaceGlow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.28" />
                    <stop offset="100%" stopColor="#0f172a" stopOpacity="0" />
                  </radialGradient>
                  <linearGradient id="rocketBody" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#ffffff" />
                    <stop offset="100%" stopColor="#cbd5e1" />
                  </linearGradient>
                </defs>

                <circle cx="190" cy="140" r="130" fill="url(#heroSpaceGlow)" />

                {/* Twinkling Cartoon Stars */}
                {[
                  [45, 50, 2.5], [90, 28, 1.8], [325, 45, 2.5], [345, 115, 1.8],
                  [35, 190, 2], [320, 225, 2.4], [175, 22, 2], [250, 250, 1.8],
                ].map(([sx, sy, sr], idx) => (
                  <circle
                    key={idx}
                    cx={sx}
                    cy={sy}
                    r={sr}
                    fill="#fef08a"
                    className={idx % 2 === 0 ? 'animate-twinkle-1' : 'animate-twinkle-2'}
                    style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
                  />
                ))}

                {/* Cute Ringed Planet */}
                <g transform="translate(64, 92)">
                  <circle r="18" fill="#fb923c" />
                  <ellipse cx="0" cy="2" rx="28" ry="6" fill="none" stroke="#fde047" strokeWidth="3" transform="rotate(-16)" />
                </g>

                {/* Animated Cartoon Rocket */}
                <g transform="translate(135, 138)">
                  <g className="animate-rocket-float">
                    {/* Exhaust Flame */}
                    <path d="M-12 52 Q0 92 12 52 Z" fill="#f97316" />
                    <path d="M-7 52 Q0 78 7 52 Z" fill="#fde047" />
                    {/* Side Fins */}
                    <path d="M-24 22 L-40 48 L-20 44 Z" fill="#ef4444" />
                    <path d="M24 22 L40 48 L20 44 Z" fill="#ef4444" />
                    {/* Rocket Hull */}
                    <path d="M0 -68 C24 -36 28 10 22 50 L-22 50 C-28 10 -24 -36 0 -68 Z" fill="url(#rocketBody)" stroke="#64748b" strokeWidth="2.5" />
                    {/* Nose Cone */}
                    <path d="M0 -68 C13 -48 18 -32 20 -24 L-20 -24 C-18 -32 -13 -48 0 -68 Z" fill="#ef4444" />
                    {/* Porthole Window */}
                    <circle cx="0" cy="2" r="14" fill="#0ea5e9" stroke="#334155" strokeWidth="3" />
                    <circle cx="-4" cy="-2" r="4" fill="#e0f2fe" opacity="0.8" />
                    {/* Stripe */}
                    <rect x="-20" y="34" width="40" height="8" rx="3" fill="#38bdf8" />
                  </g>
                </g>

                {/* Smiling Cartoon Astronaut Mascot Waving */}
                <g transform="translate(268, 152)">
                  <g className="animate-float-slow">
                    {/* Jetpack */}
                    <rect x="-24" y="-12" width="48" height="36" rx="10" fill="#38bdf8" stroke="#0284c7" strokeWidth="2" />
                    {/* Boots */}
                    <rect x="-18" y="34" width="14" height="12" rx="5" fill="#f59e0b" />
                    <rect x="4" y="34" width="14" height="12" rx="5" fill="#f59e0b" />
                    {/* Suit Torso */}
                    <rect x="-20" y="-10" width="40" height="46" rx="14" fill="#f8fafc" stroke="#94a3b8" strokeWidth="2.5" />
                    <rect x="-11" y="2" width="22" height="15" rx="4" fill="#0f172a" />
                    <circle cx="-5" cy="9" r="2.5" fill="#34d399" />
                    <circle cx="1" cy="9" r="2.5" fill="#38bdf8" />
                    <circle cx="7" cy="9" r="2.5" fill="#fbbf24" />
                    {/* Left & Waving Right Arms */}
                    <line x1="-20" y1="2" x2="-34" y2="18" stroke="#f1f5f9" strokeWidth="9" strokeLinecap="round" />
                    <line x1="20" y1="0" x2="36" y2="-20" stroke="#f1f5f9" strokeWidth="9" strokeLinecap="round" />
                    <circle cx="38" cy="-22" r="5" fill="#fbbf24" />
                    {/* Helmet & Big Happy Smile */}
                    <circle cx="0" cy="-34" r="27" fill="#ffffff" stroke="#94a3b8" strokeWidth="2.5" />
                    <rect x="-19" y="-47" width="38" height="26" rx="11" fill="#0f172a" stroke="#38bdf8" strokeWidth="2" />
                    {/* Gloss reflection */}
                    <path d="M-13 -42 Q-6 -45 -2 -41" fill="none" stroke="#bae6fd" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
                    {/* Cute Eyes & Big Smile */}
                    <circle cx="-7" cy="-35" r="3" fill="#ffffff" />
                    <circle cx="7" cy="-35" r="3" fill="#ffffff" />
                    <circle cx="-11" cy="-30" r="2.5" fill="#fb7185" opacity="0.75" />
                    <circle cx="11" cy="-30" r="2.5" fill="#fb7185" opacity="0.75" />
                    <path d="M-7 -28 Q0 -21 7 -28" fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" />
                  </g>
                </g>
              </svg>
            </div>
          </div>

          {/* Two Big Illustrated Destination Cards + Bouncy Launch & Data Sources Buttons */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-7 space-y-5">
              <div className="space-y-2.5">
                <div className="text-sm font-display font-bold text-sky-200">
                  {t('Pick Your Space Destination:', 'اختر وجهتك الفضائية:')}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Card 1: Moon Outpost (Artemis Base) with Glowing Crater Icon */}
                  <button
                    type="button"
                    onClick={() => {
                      soundFX.unlock();
                      soundFX.playSwitch(true);
                      setPlanet('moon');
                    }}
                    className={`text-start p-4 rounded-2xl border-2 transition-all cursor-pointer min-h-[44px] flex items-start gap-3.5 ${
                      planet === 'moon'
                        ? 'bg-sky-950/75 border-sky-400 shadow-xl shadow-sky-950/60 scale-[1.01]'
                        : 'bg-slate-900/80 border-slate-700/80 hover:border-sky-500/60'
                    }`}
                  >
                    <svg viewBox="0 0 64 64" className="w-14 h-14 shrink-0" aria-hidden="true">
                      <circle cx="32" cy="32" r="28" fill="#38bdf8" opacity="0.16" />
                      <circle cx="32" cy="32" r="22" fill="#cbd5e1" stroke="#7dd3fc" strokeWidth="2" />
                      <ellipse cx="24" cy="26" rx="6" ry="4" fill="#64748b" />
                      <ellipse cx="39" cy="38" rx="7" ry="5" fill="#475569" stroke="#38bdf8" strokeWidth="1.5" />
                      <circle cx="28" cy="42" r="3" fill="#94a3b8" />
                      <circle cx="39" cy="38" r="2.2" fill="#bae6fd" />
                    </svg>
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center justify-between gap-1.5">
                        <span className="font-display font-extrabold text-base sm:text-lg text-white">
                          {t('Moon Outpost (Artemis Base)', 'قاعدة القمر (أرتميس)')}
                        </span>
                        <span className="text-xs font-mono-tabular font-bold text-sky-300">
                          {t('1.3s Signal', 'إشارة 1.3ث')}
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-300 leading-snug">
                        {t(
                          'Glowing South Pole craters, super-fast Earth radio, and fierce solar flares!',
                          'فوهات قطبية مضيئة، إرسال سريع للأرض، وعواصف شمسية قوية!'
                        )}
                      </p>
                    </div>
                  </button>

                  {/* Card 2: Mars Base (Jezero Crater) with Red Planet & Signal-Wave Icon */}
                  <button
                    type="button"
                    onClick={() => {
                      soundFX.unlock();
                      soundFX.playSwitch(true);
                      setPlanet('mars');
                    }}
                    className={`text-start p-4 rounded-2xl border-2 transition-all cursor-pointer min-h-[44px] flex items-start gap-3.5 ${
                      planet === 'mars'
                        ? 'bg-amber-950/70 border-amber-400 shadow-xl shadow-amber-950/60 scale-[1.01]'
                        : 'bg-slate-900/80 border-slate-700/80 hover:border-amber-500/60'
                    }`}
                  >
                    <svg viewBox="0 0 64 64" className="w-14 h-14 shrink-0" aria-hidden="true">
                      <circle cx="28" cy="36" r="20" fill="#ea580c" stroke="#fdba74" strokeWidth="2" />
                      <path d="M14 34 Q28 28 42 36" fill="none" stroke="#9a3412" strokeWidth="4" strokeLinecap="round" />
                      <circle cx="22" cy="42" r="4" fill="#c2410c" />
                      <path d="M42 18 Q50 18 50 26" fill="none" stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round" />
                      <path d="M44 11 Q57 11 57 24" fill="none" stroke="#fde047" strokeWidth="2.5" strokeLinecap="round" />
                      <circle cx="42" cy="25" r="2.5" fill="#fef08a" />
                    </svg>
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center justify-between gap-1.5">
                        <span className="font-display font-extrabold text-base sm:text-lg text-white">
                          {t('Mars Base (Jezero Crater)', 'قاعدة المريخ (فوهة جيزيرو)')}
                        </span>
                        <span className="text-xs font-mono-tabular font-bold text-amber-300">
                          {t('5.0s Delay', 'تأخر 5.0ث')}
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-300 leading-snug">
                        {t(
                          'Red planet river delta! Keep Science Comms ON for 5s so waves reach Earth.',
                          'دلتا الكوكب الأحمر! أبقِ الاتصالات تعمل 5 ثوانٍ لتصل الموجات للأرض.'
                        )}
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Big Bouncy Launch Button + Prominent NASA & CSA Data Sources Button */}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => startMission(planet)}
                  className="animate-launch-bounce min-h-[56px] px-8 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-400 via-sky-400 to-amber-300 hover:from-emerald-300 hover:to-amber-200 active:scale-[0.98] text-slate-950 font-display font-extrabold text-lg sm:text-xl transition-all flex items-center gap-3 shadow-xl shadow-sky-500/30 cursor-pointer"
                >
                  <span>{t('LAUNCH MISSION 🚀', 'انطلاق المهمة 🚀')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowSourcesModal(true)}
                  className="min-h-[56px] px-5 py-3 rounded-2xl border-2 border-amber-400/60 bg-slate-900/90 hover:bg-slate-800 text-amber-200 font-display font-bold text-sm sm:text-base transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <BookOpen className="w-5 h-5 text-amber-400 shrink-0" />
                  <span>{t('NASA & CSA Data Sources', 'مصادر بيانات ناسا وكندا')}</span>
                </button>
              </div>
              <p className="text-xs font-mono-tabular text-slate-400">
                {t(
                  `Launching as ${commanderName} · Press 1, 2, 3 to toggle switches · Space: Pause`,
                  `ستنطلق باسم ${commanderName} · اضغط 1، 2، 3 للتشغيل · مسافة: إيقاف مؤقت`
                )}
              </p>
            </div>

            {/* Right Column: Kid-Friendly Briefing Card with Read-Aloud Speaker Button */}
            <div className="lg:col-span-5 bg-[#121c31]/90 border border-slate-700/80 rounded-2xl p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-display font-bold text-xl text-white">
                  {t('How to Play (Ages 7–12)', 'كيف تلعب (للأعمار 7–12)')}
                </h2>
                <ReadAloudButton
                  id="briefing"
                  lang={lang}
                  speaking={speakingId === 'briefing'}
                  onToggle={() =>
                    toggleSpeak(
                      'briefing',
                      t(
                        'Welcome to AstroKids Outpost Command! Rule 1: Your battery can only power 2 rooms at once. Flipping a 3rd switch turns the oldest room off. Rule 2: When NASA DONKI warns of a solar flare, turn on the Blue Radiation Shield. Rule 3: Survive 10 Sols to unlock 10 Science Cards and win your Commander Certificate!',
                        'أهلاً بك في أسترو كيدز! القاعدة الأولى: البطارية تشغل غرفتين فقط معاً. القاعدة الثانية: عند إنذار التوهج الشمسي من ناسا شغّل الدرع الأزرق. القاعدة الثالثة: أكمل 10 أيام لجمع 10 بطاقات علمية والحصول على شهادتك!'
                      )
                    )
                  }
                />
              </div>

              <div className="space-y-3.5 text-sm text-slate-200">
                <div className="flex items-start gap-3">
                  <Zap className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-white">
                      {t('The 2-of-3 Power Rule', 'قاعدة 2 من 3 للطاقة')}
                    </div>
                    <p className="text-slate-300 mt-0.5 text-xs sm:text-sm">
                      {t(
                        'Your battery powers only 2 rooms at once. Turning a 3rd switch ON cycles the oldest room OFF!',
                        'البطارية تكفي لغرفتين فقط معاً. تشغيل غرفة ثالثة يطفئ أقدم غرفة تلقائياً!'
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Flame className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-white">
                      {t('Real Solar Flare Alerts', 'تنبيهات التوهجات الشمسية')}
                    </div>
                    <p className="text-slate-300 mt-0.5 text-xs sm:text-sm">
                      {t(
                        'When NASA DONKI spots a solar flare, turn on the Blue Radiation Shield before particles hit!',
                        'عندما يرصد نظام DONKI من ناسا توهجاً شمسياً، شغّل الدرع الأزرق فوراً!'
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Award className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-white">
                      {t('Unlock 10 Cards & Certificate', 'اجمع 10 بطاقات واحصل على شهادتك')}
                    </div>
                    <p className="text-slate-300 mt-0.5 text-xs sm:text-sm">
                      {t(
                        'Survive 10 Sols to collect real NASA/CSA Science Cards and earn your custom Commander Certificate!',
                        'أكمل 10 أيام لجمع بطاقات ناسا وكندا والحصول على شهادة القائد باسمك!'
                      )}
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-700/70 text-xs text-slate-400 flex items-center justify-between">
                <span>{t('Latest Solar Flare Tracked', 'أحدث توهج شمسي مرصود')}</span>
                <span className="font-mono-tabular text-rose-300 font-semibold">
                  {currentFlare.classType} · {currentFlare.severity}
                </span>
              </div>

              {(missionLog.moon || missionLog.mars) && (
                <div className="pt-3 border-t border-slate-700/70 space-y-2">
                  <div className="text-xs font-bold text-emerald-300 flex items-center justify-between">
                    <span>{t('Saved Commander Records (Moon vs. Mars)', 'سجل القائد المحفوظ (القمر مقابل المريخ)')}</span>
                    <span className="font-mono-tabular text-slate-400">
                      {[missionLog.moon, missionLog.mars].filter(Boolean).length}/2
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {(['moon', 'mars'] as const).map((w) => {
                      const rec = missionLog[w];
                      return (
                        <div
                          key={w}
                          className={`rounded-lg border px-2.5 py-2 ${
                            rec
                              ? 'bg-slate-900/90 border-emerald-500/40'
                              : 'bg-slate-950/50 border-slate-800 text-slate-500'
                          }`}
                        >
                          <div className="font-bold text-white">
                            {w === 'moon' ? t('Moon (1.3s)', 'القمر (1.3ث)') : t('Mars (5.0s)', 'المريخ (5.0ث)')}
                          </div>
                          {rec ? (
                            <div className="font-mono-tabular text-[11px] text-sky-300 mt-0.5">
                              {t(`Sci ${rec.science}% · ${rec.commanderName}`, `علوم ${rec.science}% · ${rec.commanderName}`)}
                            </div>
                          ) : (
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              {t('Not completed yet', 'لم تكتمل بعد')}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>

        <footer className="relative z-10 px-6 sm:px-10 pb-5 text-xs text-slate-500 flex flex-wrap items-center justify-between gap-2">
          <span>{t('AstroKids: Outpost Command · Educational Mission Simulation', 'أسترو كيدز: قيادة القاعدة الفضائية · محاكاة تعليمية')}</span>
          <span>{t('Powered by NASA DONKI, APOD, OSDR, RadLab, Mars Trek & CSA', 'مبني على بيانات ناسا DONKI وAPOD وOSDR وRadLab وMars Trek وCSA')}</span>
        </footer>

        {showSourcesModal && (
          <DataSourcesModal
            lang={lang}
            dataMode={dataMode}
            donkiFlares={donkiFlares}
            cmeEvents={cmeEvents}
            roverPhotos={roverPhotos}
            neoObjects={neoObjects}
            apod={apod}
            apodImgFailed={apodImgFailed}
            failedPhotoUrls={failedPhotoUrls}
            onApodError={() => setApodImgFailed(true)}
            onPhotoError={markPhotoFailed}
            onClose={() => setShowSourcesModal(false)}
          />
        )}

        {showSettingsModal && (
          <SettingsCreditsModal
            lang={lang}
            sfxOn={sfxOn}
            ambientOn={ambientOn}
            spaceWindOn={spaceWindOn}
            autoReadAloud={autoReadAloud}
            voiceName={pickFriendlyVoice(lang)?.name || ''}
            onToggleSfx={toggleSfx}
            onToggleAmbient={toggleAmbient}
            onToggleSpaceWind={toggleSpaceWind}
            onToggleAutoRead={toggleAutoReadAloud}
            onClose={() => setShowSettingsModal(false)}
          />
        )}
      </div>
    );
  }

  // ==========================================================================
  // RENDER: ACTIVE GAMEPLAY SHELL + CUTAWAY BASE + MODALS
  // ==========================================================================
  return (
    <div
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
      className="min-h-screen w-full bg-[#080e1c] text-slate-100 flex flex-col select-none"
    >
      {/* TOP HUD BAR */}
      <header className="no-print w-full border-b border-slate-800 bg-[#0d1629]/95 px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          {/* Left: Commander Name, World & Sol Clock */}
          <div className="flex items-center gap-4">
            <div>
              <div className="flex items-center gap-2 text-sm font-display font-bold text-white">
                <span className="text-sky-300">{commanderName}</span>
                <span aria-hidden="true" className="text-slate-600">·</span>
                <span>
                  {planet === 'moon'
                    ? t('Moon (Artemis)', 'القمر (أرتميس)')
                    : t('Mars (Jezero)', 'المريخ (جيزيرو)')}
                </span>
                <span aria-hidden="true" className="text-slate-600">·</span>
                <span className="font-mono-tabular text-amber-300">
                  {t(`Sol ${sol} / 10`, `اليوم ${sol} / 10`)}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-28 h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-400 transition-[width] duration-150"
                    style={{ width: `${solPercent}%` }}
                  />
                </div>
                <span className="text-[11px] font-mono-tabular text-slate-400">
                  {Math.max(0, Math.ceil(SOL_DURATION_SEC - solElapsed))}
                  {t('s left', 'ث متبقية')}
                </span>
              </div>
            </div>
          </div>

          {/* Center: 3 Resource Bars (0-100%, Icon + Text + Tabular Readout) */}
          <div className="flex-1 max-w-2xl grid grid-cols-3 gap-3 min-w-[280px]">
            {/* Life Support O2 */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl px-3 py-2">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="flex items-center gap-1.5 font-semibold text-emerald-300 truncate">
                  <Leaf className="w-3.5 h-3.5 shrink-0" />
                  <span>{t('Life Support (O2)', 'الأكسجين (O2)')}</span>
                </span>
                <span className="font-mono-tabular font-bold text-white">
                  {Math.round(resources.oxygen)}%
                </span>
              </div>
              <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-colors ${
                    resources.oxygen < 30 ? 'bg-rose-500' : 'bg-emerald-400'
                  }`}
                  style={{ width: `${resources.oxygen}%` }}
                />
              </div>
            </div>

            {/* Radiation Safety */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl px-3 py-2">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="flex items-center gap-1.5 font-semibold text-sky-300 truncate">
                  <Shield className="w-3.5 h-3.5 shrink-0" />
                  <span>{t('Radiation Safety', 'أمان الإشعاع')}</span>
                </span>
                <span className="font-mono-tabular font-bold text-white">
                  {Math.round(resources.radiation)}%
                </span>
              </div>
              <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-colors ${
                    resources.radiation < 30 ? 'bg-rose-500' : 'bg-sky-400'
                  }`}
                  style={{ width: `${resources.radiation}%` }}
                />
              </div>
            </div>

            {/* Science Score */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl px-3 py-2">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="flex items-center gap-1.5 font-semibold text-amber-300 truncate">
                  <Microscope className="w-3.5 h-3.5 shrink-0" />
                  <span>{t('Science Score', 'نقاط العلوم')}</span>
                </span>
                <span className="font-mono-tabular font-bold text-white">
                  {Math.round(resources.science)}%
                </span>
              </div>
              <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-colors ${
                    resources.science < 30 ? 'bg-rose-500' : 'bg-amber-400'
                  }`}
                  style={{ width: `${resources.science}%` }}
                />
              </div>
            </div>
          </div>

          {/* Right: Language, Cards, NASA Data, Ambient Loop Toggle, Pause, Mute */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="hidden 2xl:inline-flex items-center gap-1.5 text-xs font-medium text-slate-300 mr-1">
              <Database className="w-3.5 h-3.5 text-sky-400" />
              <span>{dataMode === 'live' ? t('LIVE NASA DATA', 'ناسا مباشر') : t('VERIFIED NASA DATASET', 'بيانات موثقة')}</span>
            </span>

            <button
              type="button"
              onClick={toggleLang}
              className="min-h-[44px] px-3 py-2 rounded-lg border border-sky-500/50 bg-slate-900 hover:bg-slate-800 text-xs font-bold text-sky-300 flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <Languages className="w-4 h-4" />
              <span>{lang === 'en' ? 'عربي' : 'EN'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowAlbumModal(true)}
              className="min-h-[44px] px-3 py-2 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-slate-100 flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <Award className="w-4 h-4 text-emerald-400" />
              <span className="font-mono-tabular">
                {t(`Cards (${unlockedSols.length}/10)`, `البطاقات (${unlockedSols.length}/10)`)}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setShowSourcesModal(true)}
              className="min-h-[44px] px-3 py-2 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-slate-100 flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <BookOpen className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">{t('NASA Data', 'بيانات ناسا')}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowSettingsModal(true)}
              aria-label={t('Settings and Team Credits', 'الإعدادات وفريق التطوير')}
              className="min-h-[44px] px-3 py-2 rounded-lg border border-indigo-400/50 bg-indigo-950/60 hover:bg-indigo-900/70 text-xs font-semibold text-indigo-200 flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <Settings className="w-4 h-4 text-indigo-300" />
              <span className="hidden sm:inline">{t('Settings & Credits', 'الإعدادات والفريق')}</span>
            </button>

            {/* Ambient Space Outpost Loop Toggle */}
            <button
              type="button"
              onClick={toggleAmbient}
              aria-pressed={ambientOn}
              aria-label={t('Toggle ambient space outpost sound', 'تشغيل أو إيقاف موسيقى الفضاء')}
              className={`min-h-[44px] px-3 py-2 rounded-lg border text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors ${
                ambientOn && !isMuted
                  ? 'border-emerald-500/60 bg-emerald-950/60 text-emerald-300'
                  : 'border-slate-700 bg-slate-900 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Music className="w-4 h-4" />
              <span className="hidden md:inline">
                {ambientOn && !isMuted ? t('Ambient ON', 'موسيقى: تعمل') : t('Ambient OFF', 'موسيقى: متوقفة')}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setIsPaused((p) => !p)}
              aria-label={isPaused ? 'Resume mission' : 'Pause mission'}
              className="min-h-[44px] min-w-[44px] rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-100 flex items-center justify-center cursor-pointer"
            >
              {isPaused ? <Play className="w-4 h-4 text-emerald-400 fill-current" /> : <Pause className="w-4 h-4 text-slate-200" />}
            </button>

            <button
              type="button"
              onClick={toggleMute}
              aria-label={isMuted ? 'Unmute audio' : 'Mute audio'}
              className="min-h-[44px] min-w-[44px] rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-100 flex items-center justify-center cursor-pointer"
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-slate-400" /> : <Volume2 className="w-4 h-4 text-sky-400" />}
            </button>
          </div>
        </div>
      </header>

      {/* MAIN PLAYFIELD: 2D CUTAWAY DIORAMA */}
      <main className="no-print flex-1 flex flex-col justify-between max-w-7xl w-full mx-auto px-4 sm:px-6 py-4 gap-4">
        {/* Alert Strip */}
        <div className="min-h-[38px] flex flex-wrap items-center justify-between gap-2">
          {flareStage !== 'none' ? (
            <div
              className={`flex items-center gap-2.5 px-4 py-1.5 rounded-lg border text-sm font-semibold ${
                shieldOn
                  ? 'bg-sky-950/80 border-sky-500/60 text-sky-200'
                  : 'bg-rose-950/90 border-rose-500 text-rose-200'
              }`}
            >
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>
                {flareStage === 'warning'
                  ? t(
                      `SOLAR FLARE INCOMING (${currentFlare.classType} · ${currentFlare.sourceLocation}) — Turn Radiation Shield ON!`,
                      `توهج شمسي قادم (${currentFlare.classType}) — شغّل الدرع الإشعاعي الآن!`
                    )
                  : shieldOn
                    ? t(
                        `Solar Flare ${currentFlare.classType} Hitting Base — Blue Energy Dome Blocking Radiation!`,
                        `التوهج الشمسي ${currentFlare.classType} يضرب القاعدة — القبة الزرقاء تحمي الطاقم!`
                      )
                    : t(
                        `DANGER: Solar Flare ${currentFlare.classType} Unshielded! Turn Radiation Shield ON now!`,
                        `خطر: التوهج الشمسي ${currentFlare.classType} بدون درع! شغّل الدرع الإشعاعي فوراً!`
                      )}
              </span>
              <ReadAloudButton
                id="alert-strip"
                lang={lang}
                compact
                speaking={speakingId === 'alert-strip'}
                onToggle={() =>
                  toggleSpeak(
                    'alert-strip',
                    flareStage === 'warning'
                      ? t(
                          `Solar flare incoming! Turn the Radiation Shield ON right now!`,
                          `توهج شمسي قادم! شغّل الدرع الإشعاعي الآن!`
                        )
                      : shieldOn
                        ? t(
                            `Solar flare hitting base! Blue Energy Dome is blocking radiation!`,
                            `التوهج الشمسي يضرب القاعدة والقبة الزرقاء تحمي الطاقم!`
                          )
                        : t(
                            `Danger! Solar flare unshielded! Turn the Radiation Shield ON immediately!`,
                            `خطر! التوهج الشمسي بدون درع! شغّل الدرع الإشعاعي فوراً!`
                          )
                  )
                }
              />
            </div>
          ) : (
            <div className="text-xs sm:text-sm text-slate-300 flex items-center gap-2">
              <Info className="w-4 h-4 text-sky-400 shrink-0" />
              <span>{mascotNote}</span>
              {mascotNote && (
                <ReadAloudButton
                  id="alert-strip"
                  lang={lang}
                  compact
                  speaking={speakingId === 'alert-strip'}
                  onToggle={() => toggleSpeak('alert-strip', mascotNote)}
                />
              )}
            </div>
          )}

          <div className="flex items-center gap-3 text-xs font-medium">
            {cycledNotice && (
              <span className="px-3 py-1 rounded-lg bg-amber-950/90 border border-amber-500/60 text-amber-200">
                {cycledNotice}
              </span>
            )}
            {signalFeedback && (
              <span
                className={`px-3 py-1 rounded-lg border ${
                  signalFeedback.tone === 'success'
                    ? 'bg-emerald-950/90 border-emerald-500/60 text-emerald-200'
                    : 'bg-rose-950/90 border-rose-500/60 text-rose-200'
                }`}
              >
                {signalFeedback.text}
              </span>
            )}
          </div>
        </div>

        {/* LIVE NASA MISSION QUESTION, PHYSICS & TRACKABLE OBJECTIVE CARD */}
        <section className="rounded-2xl border border-sky-500/35 bg-gradient-to-r from-[#0e1a32]/95 via-[#11203d]/95 to-[#0e1a32]/95 px-4 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
          <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
            {/* Real NASA Perseverance Rover / APOD Photo Preview Button */}
            <button
              type="button"
              onClick={() => setShowSolPhotoModal(true)}
              title={t('Inspect real NASA photo & telemetry', 'عرض صورة ناسا والبيانات الحية')}
              className="group relative w-16 h-14 sm:w-20 sm:h-16 rounded-xl border border-sky-400/50 bg-slate-900 overflow-hidden shrink-0 cursor-pointer hover:border-amber-300 transition-colors"
            >
              {solBrief.photoUrl ? (
                <img
                  src={solBrief.photoUrl}
                  alt={solBrief.photoCaption}
                  referrerPolicy="no-referrer"
                  onError={() => markPhotoFailed(solBrief.photoUrl)}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-sky-950 to-amber-950/70 text-sky-300">
                  <Camera className="w-5 h-5" />
                  <span className="text-[9px] font-mono-tabular font-bold mt-0.5">NASA</span>
                </div>
              )}
            </button>

            <div className="min-w-0 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-sky-500/15 border border-sky-400/40 text-[11px] font-mono-tabular font-bold text-sky-300">
                  {solBrief.datasetTag}
                </span>
                <span className="text-[11px] font-semibold text-amber-300">
                  {solBrief.sourceBadge}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-md border text-[11px] font-mono-tabular font-bold transition-colors ${
                    solGoalCompleted
                      ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                      : 'bg-indigo-500/15 border-indigo-400/50 text-indigo-200'
                  }`}
                >
                  {solGoalCompleted
                    ? t('✓ NASA GOAL COMPLETE (+10%)', '✓ اكتمل هدف ناسا (+10%)')
                    : `🎯 ${solBrief.goalLabel}`}
                </span>
              </div>
              <p className="text-xs sm:text-sm font-display font-bold text-white leading-snug">
                {solBrief.question}
              </p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] sm:text-xs">
                <span className="text-slate-300">{solBrief.hint}</span>
                <span className="px-2 py-0.5 rounded bg-slate-900/90 border border-slate-700/80 font-mono-tabular text-[11px] text-amber-200">
                  ⚡ {solBrief.physicsNote}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            <ReadAloudButton
              id="sol-brief"
              lang={lang}
              compact
              speaking={speakingId === 'sol-brief'}
              onToggle={() => toggleSpeak('sol-brief', `${solBrief.question} ${solBrief.hint}`)}
            />
          </div>
        </section>

        {/* 2D CUTAWAY SVG STAGE (Keep dir="ltr" so 2D base room layout stays fixed) */}
        <div dir="ltr" className="relative w-full rounded-2xl border border-slate-700/80 bg-[#0b1326] overflow-hidden shadow-2xl">
          <svg
            viewBox="0 0 960 430"
            className="w-full h-auto block"
            role="img"
            aria-label="2D cutaway view of the AstroKids space outpost"
          >
            <defs>
              <linearGradient id="skyMoon" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#050814" />
                <stop offset="100%" stopColor="#131c33" />
              </linearGradient>
              <linearGradient id="skyMars" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#27141e" />
                <stop offset="55%" stopColor="#5b281c" />
                <stop offset="100%" stopColor="#853c20" />
              </linearGradient>
              <linearGradient id="flareTint" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.28" />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.06" />
              </linearGradient>
              <radialGradient id="shieldDomeGrad" cx="50%" cy="85%" r="65%">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.05" />
                <stop offset="70%" stopColor="#38bdf8" stopOpacity="0.18" />
                <stop offset="100%" stopColor="#7dd3fc" stopOpacity="0.46" />
              </radialGradient>
              <linearGradient id="groundMoon" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#475569" />
                <stop offset="100%" stopColor="#1e293b" />
              </linearGradient>
              <linearGradient id="groundMars" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#9a3412" />
                <stop offset="100%" stopColor="#431407" />
              </linearGradient>
            </defs>

            <rect width="960" height="350" fill={planet === 'moon' ? 'url(#skyMoon)' : 'url(#skyMars)'} />

            {flareStage !== 'none' && (
              <rect
                width="960"
                height="350"
                fill="url(#flareTint)"
                opacity={flareStage === 'active' ? 0.95 : 0.45}
              />
            )}

            {[
              [65, 42, 1.8], [140, 88, 1.3], [230, 35, 2], [320, 72, 1.4],
              [440, 48, 1.7], [530, 90, 1.2], [650, 38, 2.1], [740, 74, 1.4],
              [105, 145, 1.2], [385, 128, 1.5], [595, 130, 1.3],
            ].map(([cx, cy, r], i) => (
              <circle
                key={i}
                cx={cx}
                cy={cy}
                r={r}
                fill="#f8fafc"
                opacity={planet === 'moon' ? 0.75 : 0.38}
                className={
                  i % 3 === 0
                    ? 'animate-twinkle-1'
                    : i % 3 === 1
                      ? 'animate-twinkle-2'
                      : 'animate-twinkle-3'
                }
                style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
              />
            ))}

            {/* OCCASIONAL SHOOTING STARS */}
            <g transform="translate(210, 22)" className="pointer-events-none">
              <g className="animate-shooting-star-1">
                <line x1="0" y1="0" x2="42" y2="18" stroke="#bae6fd" strokeWidth="2" strokeLinecap="round" opacity="0.85" />
                <circle cx="42" cy="18" r="2.2" fill="#fef08a" />
              </g>
            </g>
            <g transform="translate(560, 18)" className="pointer-events-none">
              <g className="animate-shooting-star-2">
                <line x1="0" y1="0" x2="36" y2="15" stroke="#fde68a" strokeWidth="1.8" strokeLinecap="round" opacity="0.8" />
                <circle cx="36" cy="15" r="2" fill="#ffffff" />
              </g>
            </g>

            {/* SUN IN TOP-LEFT CORNER */}
            <g transform="translate(76, 66)">
              <circle
                r={flareStage !== 'none' ? 38 : 26}
                fill={flareStage !== 'none' ? '#fb7185' : '#fbbf24'}
                opacity="0.22"
              />
              <circle
                r={flareStage !== 'none' ? 24 : 18}
                fill={flareStage !== 'none' ? '#f97316' : '#fde047'}
              />
              {flareStage !== 'none' && (
                <path d="M18 -10 Q42 -26 52 -4 Q36 8 22 4 Z" fill="#fb7185" opacity="0.85" />
              )}
            </g>

            {/* DISTANT LANDMARKS */}
            {planet === 'moon' ? (
              <g transform="translate(115, 286)" opacity="0.65">
                <polygon points="15,0 35,0 42,26 8,26" fill="#cbd5e1" />
                <line x1="10" y1="26" x2="2" y2="42" stroke="#94a3b8" strokeWidth="2.5" />
                <line x1="40" y1="26" x2="48" y2="42" stroke="#94a3b8" strokeWidth="2.5" />
                <rect x="19" y="-10" width="12" height="10" rx="2" fill="#f59e0b" />
              </g>
            ) : (
              <g transform="translate(88, 294)" opacity="0.72">
                <rect x="6" y="8" width="34" height="12" rx="3" fill="#e2e8f0" />
                <rect x="30" y="-4" width="6" height="12" fill="#cbd5e1" />
                <circle cx="12" cy="24" r="5" fill="#1e293b" stroke="#94a3b8" strokeWidth="1.5" />
                <circle cx="23" cy="24" r="5" fill="#1e293b" stroke="#94a3b8" strokeWidth="1.5" />
                <circle cx="34" cy="24" r="5" fill="#1e293b" stroke="#94a3b8" strokeWidth="1.5" />
              </g>
            )}

            {/* MINI EARTH ICON IN TOP-RIGHT CORNER */}
            <g transform="translate(875, 68)">
              <circle r="38" fill="#38bdf8" opacity="0.12" />
              <circle r="27" fill="#1d4ed8" stroke="#93c5fd" strokeWidth="2" />
              <path d="M-12 -14 Q-1 -8 7 -15 Q16 -6 10 7 Q-2 15 -14 5 Z" fill="#22c55e" />
              <path d="M8 10 Q16 12 14 20 Q6 19 8 10 Z" fill="#4ade80" />
              <text
                x="0"
                y="45"
                textAnchor="middle"
                fill="#cbd5e1"
                fontFamily="Plus Jakarta Sans, Cairo, sans-serif"
                fontWeight="700"
                fontSize="12"
              >
                {t('EARTH', 'الأرض')}
              </text>
              <text
                x="0"
                y="59"
                textAnchor="middle"
                fill={planet === 'mars' ? '#fcd34d' : '#7dd3fc'}
                fontFamily="JetBrains Mono, monospace"
                fontSize="10"
              >
                {planet === 'mars' ? '5.0s DELAY' : '1.3s FAST'}
              </text>
            </g>

            {/* RADIO SIGNAL ARC */}
            <path
              d="M742 152 Q790 98 852 84"
              fill="none"
              stroke={scienceOn ? '#fbbf24' : '#475569'}
              strokeWidth="2.5"
              strokeDasharray="6 6"
              opacity={scienceOn ? 0.7 : 0.3}
            />

            {/* LIVE SIGNAL PACKET TRAVELING TO EARTH */}
            {scienceOn && signalInFlight && (() => {
              const prog = Math.min(1, Math.max(0, signalProgress));
              const omt = 1 - prog;
              const px = omt * omt * 742 + 2 * omt * prog * 790 + prog * prog * 852;
              const py = omt * omt * 152 + 2 * omt * prog * 98 + prog * prog * 84;
              return (
                <g transform={`translate(${px}, ${py})`}>
                  <circle r="13" fill="#fbbf24" opacity="0.28" />
                  <circle r="6" fill="#fef08a" stroke="#f59e0b" strokeWidth="2" />
                </g>
              );
            })()}

            {/* SOLAR FLARE PARTICLE STREAKS */}
            {flareStage === 'active' && (
              <g className="pointer-events-none">
                {[
                  [160, 40], [270, 20], [390, 55], [510, 25], [630, 50],
                ].map(([x, y], idx) => (
                  <g key={idx} transform={`translate(${x}, ${y})`}>
                    <line
                      x1="0"
                      y1="0"
                      x2="45"
                      y2="45"
                      stroke="#fb7185"
                      strokeWidth="3"
                      strokeLinecap="round"
                      className="animate-flare-streak"
                    />
                  </g>
                ))}
              </g>
            )}

            {/* PLANETARY GROUND SURFACE */}
            <path
              d="M0 328 Q240 314 480 326 T960 320 L960 430 L0 430 Z"
              fill={planet === 'moon' ? 'url(#groundMoon)' : 'url(#groundMars)'}
            />
            <ellipse cx="95" cy="365" rx="34" ry="8" fill="#000000" opacity="0.22" />
            <ellipse cx="870" cy="378" rx="44" ry="10" fill="#000000" opacity="0.22" />

            {/* GLOWING BLUE RADIATION SHIELD ENERGY DOME */}
            {shieldOn && (
              <g className="animate-dome-pulse">
                <path
                  d="M112 346 C112 72, 848 72, 848 346 Z"
                  fill="url(#shieldDomeGrad)"
                  stroke="#38bdf8"
                  strokeWidth="3.5"
                />
                <path
                  d="M132 346 C132 95, 828 95, 828 346"
                  fill="none"
                  stroke="#bae6fd"
                  strokeWidth="1.5"
                  strokeDasharray="10 8"
                  opacity="0.7"
                />
              </g>
            )}

            {/* OUTPOST PRESSURIZED 3-ROOM CUTAWAY SHELL */}
            <g transform="translate(150, 162)">
              <rect x="0" y="0" width="660" height="184" rx="20" fill="#0f172a" stroke="#64748b" strokeWidth="4" />

              {/* Top Overhead Power Conduit Rail */}
              <rect x="20" y="6" width="620" height="8" rx="4" fill="#1e293b" />
              <line x1="36" y1="10" x2="210" y2="10" stroke={shieldOn ? '#38bdf8' : '#334155'} strokeWidth="4" />
              <line x1="230" y1="10" x2="430" y2="10" stroke={greenhouseOn ? '#34d399' : '#334155'} strokeWidth="4" />
              <line x1="450" y1="10" x2="624" y2="10" stroke={scienceOn ? '#fbbf24' : '#334155'} strokeWidth="4" />

              {/* Base Foundation Pads */}
              <rect x="28" y="182" width="44" height="12" rx="3" fill="#475569" />
              <rect x="308" y="182" width="44" height="12" rx="3" fill="#475569" />
              <rect x="588" y="182" width="44" height="12" rx="3" fill="#475569" />

              {/* ROOM 1: RADIATION SHIELD GENERATOR */}
              <g transform="translate(14, 20)">
                <rect
                  width="202"
                  height="150"
                  rx="10"
                  fill={shieldOn ? '#0c2340' : '#111827'}
                  stroke={shieldOn ? '#38bdf8' : '#334155'}
                  strokeWidth="2"
                />
                <text
                  x="12"
                  y="20"
                  fill={shieldOn ? '#7dd3fc' : '#64748b'}
                  fontFamily="Outfit, Cairo, sans-serif"
                  fontWeight="700"
                  fontSize="12"
                >
                  {t('1. SHIELD GENERATOR', '1. مولّد الدرع')}
                </text>

                <g transform="translate(72, 82)">
                  <rect x="-26" y="28" width="52" height="14" rx="4" fill="#334155" />
                  <circle
                    r="30"
                    fill={shieldOn ? '#0284c7' : '#1e293b'}
                    fillOpacity={shieldOn ? 0.3 : 0.8}
                    stroke={shieldOn ? '#38bdf8' : '#475569'}
                    strokeWidth="3"
                  />
                  <g className={shieldOn ? 'animate-spin-slow' : ''}>
                    <line x1="-22" y1="0" x2="22" y2="0" stroke={shieldOn ? '#7dd3fc' : '#475569'} strokeWidth="4" />
                    <line x1="0" y1="-22" x2="0" y2="22" stroke={shieldOn ? '#7dd3fc' : '#475569'} strokeWidth="4" />
                  </g>
                  <circle r="10" fill={shieldOn ? '#e0f2fe' : '#334155'} />
                </g>

                <g transform="translate(120, 46)">
                  <rect width="70" height="50" rx="6" fill="#09111e" stroke="#334155" strokeWidth="1.5" />
                  <text x="35" y="17" textAnchor="middle" fill="#94a3b8" fontFamily="Plus Jakarta Sans, sans-serif" fontSize="9">
                    DOSE RATE
                  </text>
                  <text
                    x="35"
                    y="33"
                    textAnchor="middle"
                    fill={shieldOn ? '#38bdf8' : flareStage === 'active' ? '#fb7185' : '#fbbf24'}
                    fontFamily="JetBrains Mono, monospace"
                    fontWeight="700"
                    fontSize="12"
                  >
                    {radiationMsv}
                  </text>
                  <text x="35" y="44" textAnchor="middle" fill="#cbd5e1" fontFamily="JetBrains Mono, monospace" fontSize="8.5">
                    mSv/day
                  </text>
                </g>

                <text
                  x="12"
                  y="140"
                  fill={shieldOn ? '#38bdf8' : '#64748b'}
                  fontFamily="JetBrains Mono, Cairo, monospace"
                  fontWeight="700"
                  fontSize="10.5"
                >
                  {shieldOn ? t('DOME: ACTIVE', 'القبة: مفعّلة') : t('DOME: STANDBY', 'القبة: متوقفة')}
                </text>
              </g>

              <rect x="216" y="76" width="14" height="68" rx="3" fill="#1e293b" stroke="#475569" strokeWidth="1.5" />

              {/* ROOM 2: CSA HYDROPONIC GREENHOUSE */}
              <g transform="translate(230, 20)">
                <rect
                  width="200"
                  height="150"
                  rx="10"
                  fill={greenhouseOn ? '#092922' : '#111827'}
                  stroke={greenhouseOn ? '#34d399' : '#334155'}
                  strokeWidth="2"
                />
                <text
                  x="12"
                  y="20"
                  fill={greenhouseOn ? '#6ee7b7' : '#64748b'}
                  fontFamily="Outfit, Cairo, sans-serif"
                  fontWeight="700"
                  fontSize="12"
                >
                  {t('2. CSA GREENHOUSE', '2. البيت المحمي')}
                </text>

                {[0, 1].map((rack) => (
                  <g key={rack} transform={`translate(${20 + rack * 90}, 42)`}>
                    <rect x="0" y="0" width="70" height="82" rx="4" fill="none" stroke="#334155" strokeWidth="2" />
                    <rect x="6" y="5" width="58" height="5" rx="2" fill={greenhouseOn ? '#f472b6' : '#334155'} />
                    <rect x="6" y="44" width="58" height="5" rx="2" fill={greenhouseOn ? '#f472b6' : '#334155'} />
                    <rect x="6" y="34" width="58" height="6" rx="2" fill={greenhouseOn ? '#0ea5e9' : '#1e293b'} />
                    <rect x="6" y="73" width="58" height="6" rx="2" fill={greenhouseOn ? '#0ea5e9' : '#1e293b'} />
                    {[15, 35, 55].map((px, pi) => (
                      <g key={pi}>
                        <circle cx={px} cy="27" r="8" fill={greenhouseOn ? '#22c55e' : '#374151'} />
                        <circle cx={px} cy="66" r="8" fill={greenhouseOn ? '#10b981' : '#374151'} />
                        {greenhouseOn && pi === 1 && <circle cx={px + 2} cy="65" r="2.5" fill="#ef4444" />}
                      </g>
                    ))}
                  </g>
                ))}

                {greenhouseOn && !harvestUsedThisSol && (
                  <g
                    transform="translate(148, 28)"
                    onClick={handleHarvestCrops}
                    role="button"
                    aria-label={t('Harvest ripe space lettuce for +5% O2', 'احصد خس الفضاء لإنتاج +5% أكسجين')}
                    className="cursor-pointer"
                  >
                    <rect x="-26" y="-12" width="70" height="22" rx="6" fill="#059669" stroke="#6ee7b7" strokeWidth="1.5" />
                    <text x="9" y="3" textAnchor="middle" fill="#ffffff" fontFamily="JetBrains Mono, Cairo, sans-serif" fontWeight="700" fontSize="9.5">
                      {t('HARVEST +O2', 'احصد +O2')}
                    </text>
                  </g>
                )}

                {greenhouseOn && (
                  <g className="pointer-events-none">
                    <g transform="translate(46, 112)">
                      <circle r="5" fill="#6ee7b7" opacity="0.85" className="animate-bubble-1" />
                    </g>
                    <g transform="translate(88, 116)">
                      <circle r="4" fill="#a7f3d0" opacity="0.85" className="animate-bubble-2" />
                    </g>
                    <g transform="translate(128, 108)">
                      <circle r="5.5" fill="#34d399" opacity="0.85" className="animate-bubble-3" />
                    </g>
                    <g transform="translate(162, 114)">
                      <circle r="4.2" fill="#6ee7b7" opacity="0.8" className="animate-bubble-2" />
                    </g>
                    {harvestUsedThisSol && (
                      <text x="148" y="36" fill="#a7f3d0" fontFamily="JetBrains Mono, monospace" fontWeight="700" fontSize="10">
                        +O2 ✓
                      </text>
                    )}
                  </g>
                )}

                <text
                  x="12"
                  y="140"
                  fill={greenhouseOn ? '#34d399' : '#64748b'}
                  fontFamily="JetBrains Mono, Cairo, monospace"
                  fontWeight="700"
                  fontSize="10.5"
                >
                  {greenhouseOn ? t('CROPS: PRODUCING O2', 'النباتات: تنتج O2') : t('CROPS: DORMANT', 'النباتات: خاملة')}
                </text>
              </g>

              <rect x="430" y="76" width="14" height="68" rx="3" fill="#1e293b" stroke="#475569" strokeWidth="1.5" />

              {/* ROOM 3: SCIENCE LAB & EARTH COMMS */}
              <g transform="translate(444, 20)">
                <rect
                  width="202"
                  height="150"
                  rx="10"
                  fill={scienceOn ? '#261e0c' : '#111827'}
                  stroke={scienceOn ? '#fbbf24' : '#334155'}
                  strokeWidth="2"
                />
                <text
                  x="12"
                  y="20"
                  fill={scienceOn ? '#fcd34d' : '#64748b'}
                  fontFamily="Outfit, Cairo, sans-serif"
                  fontWeight="700"
                  fontSize="12"
                >
                  {t('3. SCIENCE & COMMS', '3. المختبر والاتصال')}
                </text>

                <g transform="translate(22, 68)">
                  <rect x="0" y="34" width="76" height="12" rx="3" fill="#334155" />
                  <rect x="16" y="14" width="8" height="20" fill="#94a3b8" />
                  <rect x="12" y="10" width="18" height="6" rx="2" fill={scienceOn ? '#fbbf24' : '#64748b'} />
                  <rect x="44" y="12" width="24" height="18" rx="3" fill="#09111e" stroke="#475569" />
                  <path
                    d="M48 23 Q53 16 57 23 T65 21"
                    fill="none"
                    stroke={scienceOn ? '#fbbf24' : '#475569'}
                    strokeWidth="2"
                  />
                </g>

                <g transform="translate(114, 48)">
                  <rect width="74" height="58" rx="6" fill="#09111e" stroke="#334155" strokeWidth="1.5" />
                  <text x="37" y="16" textAnchor="middle" fill="#94a3b8" fontFamily="Plus Jakarta Sans, sans-serif" fontSize="9">
                    EARTH UPLINK
                  </text>
                  <text
                    x="37"
                    y="33"
                    textAnchor="middle"
                    fill={scienceOn ? '#fcd34d' : '#64748b'}
                    fontFamily="JetBrains Mono, monospace"
                    fontWeight="700"
                    fontSize="12"
                  >
                    {scienceOn ? `${Math.round(signalProgress * 100)}%` : 'OFF'}
                  </text>
                  <rect x="10" y="42" width="54" height="6" rx="3" fill="#1e293b" />
                  <rect x="10" y="42" width={54 * Math.min(1, Math.max(0, scienceOn ? signalProgress : 0))} height="6" rx="3" fill="#fbbf24" />
                </g>

                <text
                  x="12"
                  y="140"
                  fill={scienceOn ? '#fbbf24' : '#64748b'}
                  fontFamily="JetBrains Mono, Cairo, monospace"
                  fontWeight="700"
                  fontSize="10.5"
                >
                  {scienceOn ? t('SIGNAL BEAMING...', 'جاري الإرسال...') : t('DISH: STANDBY', 'الطبق: متوقف')}
                </text>
              </g>

              {/* ROOF RADIO DISH ANTENNA */}
              <g transform="translate(572, 0)">
                <rect x="-4" y="-18" width="8" height="18" fill="#64748b" />
                <path d="M-20 -26 Q0 -8 24 -28" fill="none" stroke="#cbd5e1" strokeWidth="4" strokeLinecap="round" />
                <line x1="2" y1="-17" x2="12" y2="-32" stroke="#94a3b8" strokeWidth="2.5" />
                <circle cx="13" cy="-33" r="3.5" fill={scienceOn ? '#fbbf24' : '#64748b'} />
                {scienceOn && (
                  <g transform="translate(16, -34)">
                    <circle r="14" fill="none" stroke="#fbbf24" strokeWidth="2" className="animate-wave-ripple" />
                  </g>
                )}
              </g>

              {/* ROOF CLICKABLE SOLAR DUST BRUSH HOTSPOT */}
              {!dustCleanedThisSol && targetAtmos.dustPct >= 20 && (
                <g
                  transform="translate(330, -14)"
                  onClick={handleBrushDust}
                  role="button"
                  aria-label={t('Brush dust off base solar panels', 'نظّف الغبار عن الألواح الشمسية')}
                  className="cursor-pointer"
                >
                  <rect x="-64" y="-12" width="128" height="22" rx="6" fill="#d97706" stroke="#fde68a" strokeWidth="1.5" />
                  <text x="0" y="3" textAnchor="middle" fill="#ffffff" fontFamily="JetBrains Mono, Cairo, sans-serif" fontWeight="700" fontSize="9.5">
                    {t('BRUSH DUST (-10%)', 'نظّف الغبار (-10%)')}
                  </text>
                </g>
              )}

              {/* ANIMATED 2D ASTRONAUT MASCOT WITH ZERO-G HOP & STAR CONFETTI */}
              <g
                style={{
                  transform: `translate(${(mascotXPercent / 100) * 660}px, 128px)`,
                  transition: 'transform 650ms cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              >
                {celebrating && (
                  <g className="pointer-events-none">
                    {[
                      { tx: '-38px', ty: '-52px', color: '#fde047', delay: '0ms' },
                      { tx: '36px', ty: '-54px', color: '#38bdf8', delay: '60ms' },
                      { tx: '-52px', ty: '-22px', color: '#34d399', delay: '90ms' },
                      { tx: '50px', ty: '-24px', color: '#f472b6', delay: '40ms' },
                      { tx: '-20px', ty: '-66px', color: '#fb923c', delay: '110ms' },
                      { tx: '22px', ty: '-68px', color: '#fef08a', delay: '70ms' },
                      { tx: '0px', ty: '-74px', color: '#60a5fa', delay: '30ms' },
                      { tx: '-44px', ty: '8px', color: '#a7f3d0', delay: '130ms' },
                    ].map((c, ci) => (
                      <g
                        key={ci}
                        transform="translate(0, -18)"
                        className="animate-confetti-pop"
                        style={
                          {
                            '--tx': c.tx,
                            '--ty': c.ty,
                            animationDelay: c.delay,
                          } as React.CSSProperties
                        }
                      >
                        <polygon
                          points="0,-6 1.8,-1.8 6,0 1.8,1.8 0,6 -1.8,1.8 -6,0 -1.8,-1.8"
                          fill={c.color}
                        />
                      </g>
                    ))}
                  </g>
                )}
                <g className={celebrating ? 'animate-zero-g-hop' : 'animate-float-slow'}>
                  {astronautMood === 'shielded' && <circle r="30" cy="-14" fill="#38bdf8" opacity="0.22" />}
                  <rect x="-11" y="16" width="9" height="8" rx="3" fill="#475569" />
                  <rect x="2" y="16" width="9" height="8" rx="3" fill="#475569" />
                  <rect x="-13" y="-6" width="26" height="24" rx="8" fill="#f8fafc" stroke="#94a3b8" strokeWidth="1.5" />
                  <rect x="-7" y="0" width="14" height="10" rx="2" fill="#1e293b" />
                  <circle cx="-3" cy="5" r="1.8" fill="#38bdf8" />
                  <circle cx="3" cy="5" r="1.8" fill="#34d399" />
                  <line x1="-13" y1="2" x2="-20" y2={celebrating ? -8 : 10} stroke="#e2e8f0" strokeWidth="5" strokeLinecap="round" />
                  <line
                    x1="13"
                    y1="2"
                    x2="20"
                    y2={celebrating || astronautMood === 'happy' || astronautMood === 'shielded' ? -8 : 10}
                    stroke="#e2e8f0"
                    strokeWidth="5"
                    strokeLinecap="round"
                  />
                  <circle cx="0" cy="-22" r="17" fill="#f8fafc" stroke="#94a3b8" strokeWidth="2" />
                  <rect
                    x="-12"
                    y="-31"
                    width="24"
                    height="17"
                    rx="7"
                    fill={visorDown ? '#d97706' : '#0f172a'}
                    stroke={visorDown ? '#fde047' : '#38bdf8'}
                    strokeWidth="1.5"
                  />
                  {astronautMood === 'sweating' && !celebrating ? (
                    <>
                      <circle cx="-5" cy="-23" r="1.8" fill="#f8fafc" />
                      <circle cx="5" cy="-23" r="1.8" fill="#f8fafc" />
                      <path d="M-4 -18 Q0 -21 4 -18" fill="none" stroke="#fb7185" strokeWidth="1.6" strokeLinecap="round" />
                      <path d="M13 -28 Q16 -24 13 -21 Q10 -24 13 -28 Z" fill="#38bdf8" />
                    </>
                  ) : (
                    <>
                      <circle cx="-5" cy="-23" r="2" fill={visorDown ? '#fef3c7' : '#f8fafc'} />
                      <circle cx="5" cy="-23" r="2" fill={visorDown ? '#fef3c7' : '#f8fafc'} />
                      <path
                        d={
                          celebrating || astronautMood === 'happy' || astronautMood === 'shielded'
                            ? 'M-5 -19 Q0 -14 5 -19'
                            : 'M-4 -19 Q0 -16 4 -19'
                        }
                        fill="none"
                        stroke={visorDown ? '#fef08a' : '#34d399'}
                        strokeWidth="1.8"
                        strokeLinecap="round"
                      />
                    </>
                  )}
                </g>
              </g>
            </g>
          </svg>
        </div>

        {/* BOTTOM TACTILE POWER CONSOLE (2-OF-3 RULE) + GLOSSARY BAR */}
        <section className="bg-[#101a30] border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Zap className="w-4 h-4 text-amber-400" />
              <h2 className="font-display font-bold text-base sm:text-lg text-white">
                {t('Outpost Power Switches (2-of-3 Rule)', 'مفاتيح طاقة القاعدة (قاعدة 2 من 3)')}
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs font-mono-tabular">
              <span className="text-slate-300">
                {t('Active Rooms:', 'الغرف النشطة:')}{' '}
                <strong className="text-white">{activeRooms.length} / 2 MAX</strong>
              </span>
              <span aria-hidden="true" className="text-slate-600 hidden sm:inline">·</span>
              <span className="text-slate-400 hidden md:inline">
                {t(
                  'Turning a 3rd switch ON cycles the oldest room OFF',
                  'تشغيل غرفة ثالثة يطفئ أقدم غرفة تلقائياً'
                )}
              </span>

              {hasActedThisSol && (
                <button
                  type="button"
                  onClick={completeSolNow}
                  className="animate-next-sol-glow min-h-[44px] px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-400 via-teal-300 to-sky-400 hover:from-emerald-300 hover:to-sky-300 text-slate-950 font-display font-extrabold text-sm sm:text-base flex items-center gap-2 cursor-pointer transition-all whitespace-nowrap"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{t('Next Sol >>', 'اليوم التالي >>')}</span>
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <SwitchControl
              shortcut="1"
              title={t('Radiation Shield', 'درع الإشعاع')}
              subtitle={
                shieldOn
                  ? t(`Energy Dome ON (${radiationMsv} mSv/d)`, `القبة تعمل (${radiationMsv} mSv/d)`)
                  : t('OFF · Radiation drifting down', 'متوقف · الأمان يتناقص')
              }
              active={shieldOn}
              oldestActive={activeRooms.length === 2 && activeRooms[0] === 'shield'}
              oldestLabel={t('Next to cycle OFF', 'ستُطفأ تالياً')}
              accent="sky"
              icon={<Shield className="w-5 h-5" />}
              onClick={() => toggleRoom('shield')}
            />

            <SwitchControl
              shortcut="2"
              title={t('CSA Greenhouse', 'البيت المحمي')}
              subtitle={
                greenhouseOn
                  ? t('Growing food & making +O2', 'ينتج الغذاء و +O2')
                  : t('OFF · Crew using stored O2', 'متوقف · استهلاك O2')
              }
              active={greenhouseOn}
              oldestActive={activeRooms.length === 2 && activeRooms[0] === 'greenhouse'}
              oldestLabel={t('Next to cycle OFF', 'ستُطفأ تالياً')}
              accent="emerald"
              icon={<Leaf className="w-5 h-5" />}
              onClick={() => toggleRoom('greenhouse')}
            />

            <SwitchControl
              shortcut="3"
              title={t('Science & Earth Comms', 'العلوم والاتصال بالأرض')}
              subtitle={
                scienceOn
                  ? planet === 'mars'
                    ? t(
                        `Beaming (${Math.round(signalProgress * 100)}% of 5.0s Mars delay)`,
                        `إرسال (${Math.round(signalProgress * 100)}% من تأخر 5ث)`
                      )
                    : t(
                        `Fast Moon Uplink (${Math.round(signalProgress * 100)}%)`,
                        `إرسال سريع (${Math.round(signalProgress * 100)}%)`
                      )
                  : t('OFF · No data reaching Earth', 'متوقف · لا تصل بيانات للأرض')
              }
              active={scienceOn}
              oldestActive={activeRooms.length === 2 && activeRooms[0] === 'science'}
              oldestLabel={t('Next to cycle OFF', 'ستُطفأ تالياً')}
              accent="amber"
              icon={<Radio className="w-5 h-5" />}
              onClick={() => toggleRoom('science')}
            />
          </div>

          {/* ZERO-LAG MINI-ACTIONS STRIP (HARVEST CROPS & BRUSH SURFACE DUST) */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-slate-800 bg-slate-900/75 px-3.5 py-2.5">
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" />
              <span>{t('Quick Crew Mini-Actions (Once per Sol):', 'مهام سريعة للطاقم (مرة لكل يوم):')}</span>
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={!greenhouseOn || harvestUsedThisSol}
                onClick={handleHarvestCrops}
                className={`min-h-[38px] px-3.5 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-1.5 transition-all ${
                  harvestUsedThisSol
                    ? 'border-emerald-500/30 bg-emerald-950/40 text-emerald-300/70 cursor-default'
                    : greenhouseOn
                      ? 'border-emerald-400 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-100 cursor-pointer active:scale-[0.98]'
                      : 'border-slate-700 bg-slate-900 text-slate-500 cursor-not-allowed'
                }`}
              >
                <Leaf className="w-3.5 h-3.5" />
                <span>
                  {harvestUsedThisSol
                    ? t('Crops Harvested ✓', 'تم الحصاد ✓')
                    : greenhouseOn
                      ? t('Harvest Space Lettuce (+5% O2, +3% Sci)', 'حصاد خس الفضاء (+5% O2، +3% علوم)')
                      : t('Turn Greenhouse ON to Harvest', 'شغّل البيت المحمي للحصاد')}
                </span>
              </button>

              <button
                type="button"
                disabled={dustCleanedThisSol || targetAtmos.dustPct < 20}
                onClick={handleBrushDust}
                className={`min-h-[38px] px-3.5 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-1.5 transition-all ${
                  dustCleanedThisSol
                    ? 'border-amber-500/30 bg-amber-950/40 text-amber-300/70 cursor-default'
                    : targetAtmos.dustPct >= 20
                      ? 'border-amber-400 bg-amber-500/20 hover:bg-amber-500/30 text-amber-100 cursor-pointer active:scale-[0.98]'
                      : 'border-slate-700 bg-slate-900 text-slate-500 cursor-not-allowed'
                }`}
              >
                <Wind className="w-3.5 h-3.5" />
                <span>
                  {dustCleanedThisSol
                    ? t('Panels Brushed (-10% Dust) ✓', 'تم تنظيف الغبار ✓')
                    : targetAtmos.dustPct >= 20
                      ? t('Brush Surface Dust (-10% Dust, +3% Sci)', 'تنظيف غبار الألواح (-10% غبار، +3% علوم)')
                      : t('Dust Low (Panels Clean)', 'الغبار منخفض')}
                </span>
              </button>
            </div>
          </div>

          {/* INSTANT ONBOARD AI COMPUTER CAUSE & EFFECT FEEDBACK */}
          {causeEffectNote && (
            <div
              className={`rounded-xl border px-3.5 py-2.5 flex items-center justify-between gap-3 transition-colors ${
                causeEffectNote.tone === 'sky'
                  ? 'bg-sky-950/55 border-sky-500/45 text-sky-100'
                  : causeEffectNote.tone === 'emerald'
                    ? 'bg-emerald-950/55 border-emerald-500/45 text-emerald-100'
                    : 'bg-amber-950/55 border-amber-500/45 text-amber-100'
              }`}
            >
              <div className="flex items-start sm:items-center gap-2.5 min-w-0">
                <Cpu className="w-4 h-4 shrink-0 mt-0.5 sm:mt-0 text-sky-300" />
                <p className="text-xs sm:text-sm leading-snug">
                  <strong className="font-display font-bold text-white me-1.5">
                    {t('Onboard Computer · Cause & Effect:', 'حاسوب القاعدة · السبب والنتيجة:')}
                  </strong>
                  <span>{causeEffectNote.sentence}</span>
                </p>
              </div>
              <ReadAloudButton
                id="cause-effect-live"
                lang={lang}
                compact
                speaking={speakingId === 'cause-effect-live'}
                onToggle={() => toggleSpeak('cause-effect-live', causeEffectNote.sentence)}
              />
            </div>
          )}

          {/* 3 ANIMATED PLANETARY ATMOSPHERIC TELEMETRY WIDGETS (MARS TREK / MOON TREK) */}
          <div className="pt-3 border-t border-slate-800/90 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 text-slate-300 font-semibold">
                <Globe className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span>
                  {planet === 'mars'
                    ? t(
                        'Mars Trek Telemetry · Jezero Crater (18.38°N, 77.58°E)',
                        'قياسات Mars Trek · فوهة جيزيرو (18.38°N, 77.58°E)'
                      )
                    : t(
                        'Moon Trek Telemetry · Artemis South Pole (89.54°S)',
                        'قياسات Moon Trek · القطب الجنوبي للقمر (89.54°S)'
                      )}
                </span>
              </div>
              <span
                className={`font-mono-tabular px-2 py-0.5 rounded-md border text-[11px] font-bold transition-colors ${
                  atmosSyncing
                    ? 'border-sky-400/70 bg-sky-950/80 text-sky-200'
                    : 'border-slate-700 bg-slate-900/90 text-slate-300'
                }`}
              >
                {trekMode === 'live'
                  ? t(`MARS TREK API LIVE · SOL ${sol}`, `بيانات Trek الحية · يوم ${sol}`)
                  : t(`MARS TREK DATASET · SOL ${sol}`, `بيانات Trek الموثقة · يوم ${sol}`)}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Widget 1: Surface Temperature */}
              <div
                className={`rounded-xl border p-3 bg-slate-900/80 transition-colors duration-300 ${
                  atmosSyncing ? 'border-sky-400/70' : 'border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="flex items-center gap-1.5 font-semibold text-sky-300">
                    <Thermometer className="w-3.5 h-3.5 shrink-0" />
                    <span>{t('Surface Temp', 'درجة الحرارة')}</span>
                  </span>
                  {prevSolAtmos && (
                    <span className="font-mono-tabular text-[11px] text-slate-400">
                      {targetAtmos.tempC - prevSolAtmos.tempC >= 0 ? '+' : ''}
                      {(targetAtmos.tempC - prevSolAtmos.tempC).toFixed(1)}°
                    </span>
                  )}
                </div>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-mono-tabular font-extrabold text-lg sm:text-xl text-white">
                    {displayAtmos.tempC.toFixed(1)}°C
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {planet === 'mars'
                      ? t('Chilly Desert', 'صحراء متجمدة')
                      : t('Polar Shadow', 'ظل قطبي')}
                  </span>
                </div>
                <div className="mt-2 h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-400 to-sky-400 transition-all duration-700"
                    style={{
                      width: `${Math.max(
                        12,
                        Math.min(100, planet === 'mars' ? ((displayAtmos.tempC + 85) / 45) * 100 : ((displayAtmos.tempC + 145) / 55) * 100)
                      )}%`,
                    }}
                  />
                </div>
              </div>

              {/* Widget 2: Atmospheric Pressure */}
              <div
                className={`rounded-xl border p-3 bg-slate-900/80 transition-colors duration-300 ${
                  atmosSyncing ? 'border-indigo-400/70' : 'border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="flex items-center gap-1.5 font-semibold text-indigo-300">
                    <Gauge className="w-3.5 h-3.5 shrink-0" />
                    <span>{t('Pressure', 'الضغط الجوي')}</span>
                  </span>
                  {prevSolAtmos && (
                    <span className="font-mono-tabular text-[11px] text-slate-400">
                      {targetAtmos.pressureVal - prevSolAtmos.pressureVal >= 0 ? '+' : ''}
                      {planet === 'mars'
                        ? `${Math.round(targetAtmos.pressureVal - prevSolAtmos.pressureVal)} Pa`
                        : `${(targetAtmos.pressureVal - prevSolAtmos.pressureVal).toFixed(2)} nPa`}
                    </span>
                  )}
                </div>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-mono-tabular font-extrabold text-lg sm:text-xl text-white">
                    {planet === 'mars'
                      ? `${Math.round(displayAtmos.pressureVal)} Pa`
                      : `${displayAtmos.pressureVal.toFixed(2)} nPa`}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {planet === 'mars'
                      ? t('0.7% of Earth', '0.7% من الأرض')
                      : t('Near-Vacuum', 'شبه فراغ')}
                  </span>
                </div>
                <div className="mt-2 h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-400 to-violet-400 transition-all duration-700"
                    style={{
                      width: `${Math.max(
                        15,
                        Math.min(100, planet === 'mars' ? ((displayAtmos.pressureVal - 680) / 80) * 100 : (displayAtmos.pressureVal / 0.55) * 100)
                      )}%`,
                    }}
                  />
                </div>
              </div>

              {/* Widget 3: Dust / Regolith Level */}
              <div
                className={`rounded-xl border p-3 bg-slate-900/80 transition-colors duration-300 ${
                  atmosSyncing ? 'border-amber-400/70' : 'border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="flex items-center gap-1.5 font-semibold text-amber-300">
                    <Wind className="w-3.5 h-3.5 shrink-0" />
                    <span>{t('Dust Level', 'مستوى الغبار')}</span>
                  </span>
                  {prevSolAtmos && (
                    <span className="font-mono-tabular text-[11px] text-slate-400">
                      {targetAtmos.dustPct - prevSolAtmos.dustPct >= 0 ? '+' : ''}
                      {targetAtmos.dustPct - prevSolAtmos.dustPct}%
                    </span>
                  )}
                </div>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-mono-tabular font-extrabold text-lg sm:text-xl text-white">
                    {Math.round(displayAtmos.dustPct)}%
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {planet === 'mars'
                      ? displayAtmos.dustPct >= 40
                        ? t('Gusty Haze', 'عاصف قليلاً')
                        : t('Light Dust', 'غبار خفيف')
                      : t('Static Regolith', 'غبار ساكن')}
                  </span>
                </div>
                <div className="mt-2 h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-700 ${
                      displayAtmos.dustPct >= 40
                        ? 'bg-gradient-to-r from-amber-400 to-orange-500'
                        : 'bg-gradient-to-r from-amber-300 to-amber-400'
                    }`}
                    style={{ width: `${Math.max(10, Math.min(100, displayAtmos.dustPct))}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800/90 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-400 mr-1 flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-sky-400" />
              <span>{t('Tap a Space Word to Learn:', 'اضغط على مصطلح علمي لتتعلم معناه:')}</span>
            </span>
            {GLOSSARY_TERMS.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => setActiveTerm(g)}
                className="min-h-[36px] px-3 py-1 rounded-lg border border-slate-700/80 bg-slate-900/90 hover:bg-slate-800 hover:border-sky-500/60 text-xs font-semibold text-slate-200 transition-colors cursor-pointer"
              >
                {g.term[lang]}
              </button>
            ))}
          </div>
        </section>
      </main>

      {/* SLEEK LIVE NASA TELEMETRY NEWS TICKER */}
      <footer
        dir="ltr"
        className="no-print border-t border-slate-800/90 bg-[#070d1b]/95 px-3 sm:px-6 py-2 flex items-center gap-3 overflow-hidden"
      >
        <div className="shrink-0 px-2.5 py-1 rounded-md bg-sky-500/15 border border-sky-400/40 flex items-center gap-1.5 text-[11px] font-mono-tabular font-bold text-sky-300">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>{dataMode === 'live' ? 'NASA LIVE' : 'NASA DATA'}</span>
        </div>
        <div className="flex-1 overflow-hidden">
          <div className="animate-telemetry-marquee items-center gap-8 text-xs font-mono-tabular text-slate-300 whitespace-nowrap">
            {[...telemetryTickerItems, ...telemetryTickerItems].map((item, idx) => (
              <span key={idx} className="inline-flex items-center gap-3">
                <span>{item}</span>
                <span aria-hidden="true" className="text-slate-600">•</span>
              </span>
            ))}
          </div>
        </div>
      </footer>

      {/* PAUSE OVERLAY MODAL */}
      {isPaused && phase === 'PLAYING' && !showSourcesModal && !showAlbumModal && !showSettingsModal && !showSolPhotoModal && !activeTerm && (
        <div className="fixed inset-0 z-40 bg-slate-950/75 flex items-center justify-center p-4">
          <div className="bg-[#121c31] border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-5 text-center shadow-2xl">
            <h2 className="font-display font-bold text-2xl text-white">
              {t('Mission Paused', 'تم إيقاف المهمة مؤقتاً')}
            </h2>
            <p className="text-sm text-slate-300">
              {t(
                `Take a breather, ${commanderName}! Your outpost on ${planet === 'moon' ? 'the Moon' : 'Mars'} is standing by on Sol ${sol}.`,
                `خذ استراحة يا ${commanderName}! قاعدتك على ${planet === 'moon' ? 'القمر' : 'المريخ'} جاهزة في اليوم ${sol}.`
              )}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                type="button"
                onClick={() => setIsPaused(false)}
                className="min-h-[44px] px-6 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold cursor-pointer"
              >
                {t('Resume Mission', 'استكمال المهمة')}
              </button>
              <button
                type="button"
                onClick={() => setPhase('TITLE_MENU')}
                className="min-h-[44px] px-6 py-2.5 rounded-xl border border-slate-600 bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold cursor-pointer"
              >
                {t('Exit to Title', 'العودة للبداية')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SOL COMPLETE -> UNLOCK NASA SCIENCE CARD MODAL */}
      {phase === 'SOL_CARD_UNLOCK' && (
        <div className="fixed inset-0 z-40 bg-slate-950/80 flex items-center justify-center p-4">
          <div className="relative bg-[#121c31] border border-emerald-500/50 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl overflow-visible">
            {/* Celebratory Star Confetti Burst */}
            <div className="pointer-events-none absolute -top-2 left-1/2 -translate-x-1/2 flex gap-4">
              {[
                { tx: '-60px', ty: '-36px', color: 'text-amber-300', delay: '0ms' },
                { tx: '-26px', ty: '-48px', color: 'text-sky-300', delay: '80ms' },
                { tx: '28px', ty: '-46px', color: 'text-emerald-300', delay: '40ms' },
                { tx: '64px', ty: '-34px', color: 'text-pink-300', delay: '100ms' },
              ].map((s, idx) => (
                <span
                  key={idx}
                  className={`animate-confetti-pop text-lg font-bold ${s.color}`}
                  style={
                    {
                      '--tx': s.tx,
                      '--ty': s.ty,
                      animationDelay: s.delay,
                    } as React.CSSProperties
                  }
                >
                  ★
                </span>
              ))}
            </div>

            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-mono-tabular font-bold text-emerald-300">
                {t(
                  `SOL ${sol} COMPLETE, ${commanderName.toUpperCase()} · CARD UNLOCKED`,
                  `أحسنت يا ${commanderName}! اكتمل اليوم ${sol} وفُتحت بطاقة جديدة`
                )}
              </span>
              <div className="flex items-center gap-2">
                <ReadAloudButton
                  id="sol-card"
                  lang={lang}
                  speaking={speakingId === 'sol-card'}
                  onToggle={() =>
                    toggleSpeak(
                      'sol-card',
                      `${currentCard.title[lang]}. ${currentCard.fact[lang]} ${currentCard.protocolNote[lang]}`
                    )
                  }
                />
                <Sparkles className="w-5 h-5 text-amber-400 animate-zero-g-hop shrink-0" />
              </div>
            </div>

            <div className="bg-slate-900/90 border border-slate-700/80 rounded-xl p-5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs font-semibold text-sky-300">
                  {currentCard.category[lang]} · {currentCard.agency[lang]}
                </div>
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-400/40 text-[11px] font-mono-tabular font-bold text-emerald-300">
                  {solBrief.datasetTag}
                </span>
              </div>

              {solBrief.photoUrl && (
                <div className="rounded-lg overflow-hidden border border-slate-700/80 bg-slate-950">
                  <img
                    src={solBrief.photoUrl}
                    alt={solBrief.photoCaption}
                    referrerPolicy="no-referrer"
                    onError={() => markPhotoFailed(solBrief.photoUrl)}
                    className="w-full h-36 object-cover"
                  />
                  <div className="px-3 py-1.5 text-[11px] text-slate-300 flex items-center justify-between gap-2 bg-slate-950/90">
                    <span className="truncate">{solBrief.photoCaption}</span>
                    <span className="font-mono-tabular text-amber-300 shrink-0">{solBrief.photoCredit}</span>
                  </div>
                </div>
              )}

              <h3 className="font-display font-bold text-2xl text-white">
                {currentCard.title[lang]}
              </h3>
              <p className="text-sm sm:text-base text-slate-200 leading-relaxed">
                {currentCard.fact[lang]}
              </p>
              <div className="pt-2 border-t border-slate-800 text-xs text-slate-400">
                {t('NASA Mission Protocol:', 'بروتوكول ناسا:')} {currentCard.protocolNote[lang]}
              </div>

              {/* Onboard AI Computer 1-Sentence Cause & Effect Recap */}
              <div className="rounded-lg bg-sky-950/60 border border-sky-500/40 px-3.5 py-2.5 flex items-start gap-2.5 text-xs text-sky-100 leading-relaxed">
                <Cpu className="w-4 h-4 text-sky-300 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-sky-300 me-1">
                    {t('Onboard Computer:', 'حاسوب القاعدة:')}
                  </strong>
                  <span>{solEndCauseEffect}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setShowAlbumModal(true)}
                className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 text-sm font-semibold text-slate-200 cursor-pointer"
              >
                {t(`View Album (${unlockedSols.length}/10)`, `الألبوم (${unlockedSols.length}/10)`)}
              </button>
              <button
                type="button"
                onClick={advanceToNextSol}
                className="animate-next-sol-glow min-h-[44px] px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-400 to-sky-400 hover:from-emerald-300 hover:to-sky-300 text-slate-950 font-display font-extrabold text-base cursor-pointer"
              >
                {t('Next Sol >>', 'اليوم التالي >>')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NON-PUNITIVE EMERGENCY POD SAVE MODAL */}
      {phase === 'EMERGENCY_POD' && (
        <div className="fixed inset-0 z-40 bg-slate-950/80 flex items-center justify-center p-4">
          <div className="bg-[#121c31] border border-amber-500/60 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-amber-300 shrink-0">
                  <Shield className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-xs font-mono-tabular font-bold text-amber-300">
                    {t('EMERGENCY POD SAVE ACTIVATED', 'تم تفعيل كبسولة الإنقاذ الطارئة')}
                  </div>
                  <h2 className="font-display font-bold text-xl text-white">
                    {t(`Safe Rescue for ${commanderName} on Sol ${sol}!`, `إنقاذ آمن للقائد ${commanderName} في اليوم ${sol}!`)}
                  </h2>
                </div>
              </div>
              <ReadAloudButton
                id="pod-save"
                lang={lang}
                speaking={speakingId === 'pod-save'}
                onToggle={() => {
                  const tipText =
                    emergencyReason === 'oxygen'
                      ? t(
                          `Safe Rescue for ${commanderName}! Hold tight—Life Support reached 0 percent. Switch your CSA Greenhouse back ON whenever oxygen dips below 50 percent.`,
                          `إنقاذ آمن للقائد ${commanderName}! وصل الأكسجين إلى صفر بالمئة. أعد تشغيل البيت المحمي عندما ينخفض الأكسجين تحت خمسين بالمئة.`
                        )
                      : emergencyReason === 'radiation'
                        ? t(
                            `Safe Rescue for ${commanderName}! Radiation Safety dropped to 0 percent. Watch NASA DONKI alerts and flip the Blue Radiation Shield ON right away.`,
                            `إنقاذ آمن للقائد ${commanderName}! انخفض أمان الإشعاع إلى صفر بالمئة. شغّل الدرع الأزرق فور سماع الإنذار.`
                          )
                        : t(
                            `Safe Rescue for ${commanderName}! Your Science Score reached 0 percent. Flip Science and Comms ON—and on Mars, keep it ON for the full 5 second delay!`,
                            `إنقاذ آمن للقائد ${commanderName}! احتاجت الأرض لمزيد من التجارب العلمية. شغّل العلوم والاتصالات وأبقها تعمل خمس ثوانٍ كاملة!`
                          );
                  toggleSpeak('pod-save', tipText);
                }}
              />
            </div>

            <div className="bg-slate-900/90 border border-slate-700 rounded-xl p-4 space-y-2 text-sm text-slate-200">
              <div className="font-semibold text-sky-300">
                {t(`NASA Flight Director Tip for ${commanderName}:`, `نصيحة مدير الرحلات لـ ${commanderName}:`)}
              </div>
              {emergencyReason === 'oxygen' && (
                <p>
                  {t(
                    `Hold tight, ${commanderName}—Life Support (O2) reached 0%! Astronauts breathe oxygen constantly, so switch your CSA Greenhouse back ON whenever O2 dips below 50%.`,
                    `لا تقلق يا ${commanderName}—وصل الأكسجين إلى 0%! يتنفس الرواد باستمرار، لذا أعد تشغيل البيت المحمي عندما ينخفض الأكسجين تحت 50%.`
                  )}
                </p>
              )}
              {emergencyReason === 'radiation' && (
                <p>
                  {t(
                    `Watch out, ${commanderName}—Radiation Safety dropped to 0%! During a solar flare, particles spike fast. Watch NASA DONKI alerts and flip the Blue Radiation Shield ON right away.`,
                    `انتبه يا ${commanderName}—انخفض أمان الإشعاع إلى 0%! خلال العواصف الشمسية يرتفع الخطر بسرعة، فشغّل الدرع الأزرق فور سماع الإنذار.`
                  )}
                </p>
              )}
              {emergencyReason === 'science' && (
                <p>
                  {t(
                    `Almost there, ${commanderName}! Your Science Score reached 0% because Earth needed more experiment updates. Flip Science & Comms ON—and on Mars, keep it ON for the full 5.0s delay!`,
                    `اقتربتَ جداً يا ${commanderName}! احتاجت الأرض لمزيد من التجارب العلمية. شغّل العلوم والاتصالات—وعلى المريخ أبقها تعمل 5 ثوانٍ كاملة!`
                  )}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={retrySolFromPodSave}
              className="w-full min-h-[48px] px-6 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-display font-bold text-base flex items-center justify-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>{t(`Retry Sol ${sol} with New Strategy`, `أعد محاولة اليوم ${sol} بخطة جديدة`)}</span>
            </button>
          </div>
        </div>
      )}

      {/* END-OF-MISSION ORNATE CERTIFICATE & DEBRIEF MODAL */}
      {phase === 'MISSION_DEBRIEF' && (
        <div className="fixed inset-0 z-40 bg-slate-950/90 flex items-center justify-center p-4 overflow-y-auto">
          <div className="max-w-3xl w-full space-y-5 my-auto">
            {/* SPECIAL ORNATE CERTIFICATE CARD */}
            <div className="print-certificate relative rounded-3xl p-3 sm:p-4 bg-gradient-to-br from-[#0a1530] via-[#132652] to-[#0a1530] border-4 border-amber-400 shadow-2xl">
              {/* Victory Star Confetti Burst */}
              <div className="no-print pointer-events-none absolute -top-3 left-1/2 -translate-x-1/2 flex gap-5">
                {[
                  { tx: '-90px', ty: '-40px', color: 'text-amber-300', delay: '0ms' },
                  { tx: '-42px', ty: '-58px', color: 'text-sky-300', delay: '90ms' },
                  { tx: '0px', ty: '-66px', color: 'text-emerald-300', delay: '40ms' },
                  { tx: '46px', ty: '-56px', color: 'text-pink-300', delay: '120ms' },
                  { tx: '92px', ty: '-38px', color: 'text-amber-200', delay: '70ms' },
                ].map((s, idx) => (
                  <span
                    key={idx}
                    className={`animate-confetti-pop text-xl font-bold ${s.color}`}
                    style={
                      {
                        '--tx': s.tx,
                        '--ty': s.ty,
                        animationDelay: s.delay,
                      } as React.CSSProperties
                    }
                  >
                    ★
                  </span>
                ))}
              </div>

              {/* Gold Corner Medallions */}
              <div className="hidden sm:block absolute top-2 left-2 w-4 h-4 rounded-full bg-amber-400 border-2 border-slate-900" />
              <div className="hidden sm:block absolute top-2 right-2 w-4 h-4 rounded-full bg-amber-400 border-2 border-slate-900" />
              <div className="hidden sm:block absolute bottom-2 left-2 w-4 h-4 rounded-full bg-amber-400 border-2 border-slate-900" />
              <div className="hidden sm:block absolute bottom-2 right-2 w-4 h-4 rounded-full bg-amber-400 border-2 border-slate-900" />

              <div className="bg-[#fffcf2] text-slate-900 rounded-2xl border-2 border-amber-600 p-5 sm:p-7">
                <div className="border-2 border-dashed border-amber-700/60 rounded-xl p-5 sm:p-6 space-y-5">
                  {/* Top Navy & Gold Ribbon Header */}
                  <div className="bg-[#0f1d3a] text-amber-200 rounded-xl px-4 py-2.5 border border-amber-400/70 flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-start">
                    <span className="text-[11px] sm:text-xs font-mono-tabular font-bold tracking-wide">
                      {t(
                        'ASTROKIDS: OUTPOST COMMAND · NASA SPACE APPS CHALLENGE',
                        'أسترو كيدز: قيادة القاعدة الفضائية · تحدي تطبيقات الفضاء من ناسا'
                      )}
                    </span>
                    <span className="text-amber-400 font-bold tracking-widest text-xs">★ ★ ★</span>
                  </div>

                  {/* Certificate Heading + Custom Planetary Seal */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-amber-300/80 pb-4">
                    <div className="text-center sm:text-start">
                      <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-amber-900">
                        {t('Junior NASA Mission Commander', 'شهادة قائد مهمة ناسا الصغير')}
                      </h2>
                      <div className="text-sm font-bold text-slate-800 mt-0.5">
                        {t('Official Certificate of Excellence', 'وثيقة تميّز فضائي رسمية')}
                      </div>
                    </div>

                    {/* Planet-Specific Gold Crest SVG */}
                    <svg viewBox="0 0 96 96" className="w-20 h-20 shrink-0" aria-hidden="true">
                      <circle cx="48" cy="48" r="44" fill="#0f1d3a" stroke="#d97706" strokeWidth="4" />
                      <circle cx="48" cy="48" r="36" fill="none" stroke="#fbbf24" strokeWidth="1.5" strokeDasharray="4 3" />
                      <circle cx="48" cy="48" r="22" fill={planet === 'mars' ? '#c2410c' : '#64748b'} />
                      {planet === 'moon' ? (
                        <>
                          <circle cx="40" cy="43" r="4" fill="#475569" />
                          <circle cx="55" cy="54" r="5" fill="#475569" />
                        </>
                      ) : (
                        <path d="M31 46 Q48 39 65 48" fill="none" stroke="#fdba74" strokeWidth="3" opacity="0.7" />
                      )}
                      <polygon points="48,10 51,18 59,18 53,23 55,31 48,26 41,31 43,23 37,18 45,18" fill="#fbbf24" />
                    </svg>
                  </div>

                  {/* Illuminated Commander Name Plaque & Inspiring Motto */}
                  <div className="text-center space-y-3 py-1">
                    <div className="text-xs font-bold text-slate-600">
                      {t('PROUDLY AWARDED TO', 'تُمنح بكل فخر وتقدير إلى البطل')}
                    </div>
                    <div className="inline-block bg-sky-50 border-2 border-sky-600 rounded-xl px-8 py-3 shadow-inner">
                      <div className="font-display font-extrabold text-3xl sm:text-4xl text-sky-950">
                        {commanderName}
                      </div>
                    </div>

                    {/* Prominent Certificate Motto */}
                    <blockquote className="max-w-xl mx-auto rounded-xl bg-amber-50/90 border border-amber-300/90 px-4 py-2.5 text-amber-950">
                      <p className="font-display italic font-semibold text-sm sm:text-base leading-snug">
                        {lang === 'ar'
                          ? '«رائد الفضاء الذكي ليس من يتجنب الخطر، بل من يتخذ القرار الصحيح في الوقت المناسب.»'
                          : '“A smart astronaut isn\'t the one who avoids danger—it\'s the one who makes the right choice at the right time.”'}
                      </p>
                      {lang === 'ar' && (
                        <p dir="ltr" className="text-[11px] italic text-amber-800 mt-1">
                          “A smart astronaut isn&apos;t the one who avoids danger—it&apos;s the one who makes the right choice at the right time.”
                        </p>
                      )}
                    </blockquote>

                    <p className="text-sm text-slate-700 max-w-xl mx-auto">
                      {t(
                        `For commanding ${planet === 'moon' ? 'Moon (Artemis Base)' : 'Mars (Jezero Crater)'} across all 10 Sols with scientific skill.`,
                        `لقيادة ${planet === 'moon' ? 'قاعدة أرتميس على القمر' : 'فوهة جيزيرو على المريخ'} بنجاح عبر 10 أيام فضائية كاملة.`
                      )}
                    </p>
                  </div>

                  {/* Personalized Rank Ribbon */}
                  <div className="bg-gradient-to-r from-amber-100 via-amber-200/80 to-amber-100 border-2 border-amber-500 rounded-xl px-4 py-3 text-center">
                    <div className="text-xs sm:text-sm font-bold text-amber-950">
                      {t('RANK EARNED:', 'الرتبة المكتسبة:')}{' '}
                      <span className="font-display text-base sm:text-lg text-amber-900">
                        {earnedRank.title[lang]}
                      </span>
                    </div>
                    <div className="text-xs text-amber-900 mt-0.5">{earnedRank.reason[lang]}</div>
                  </div>

                  {/* Final Scores Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                    <div className="bg-slate-50 border border-slate-300 rounded-xl p-2.5">
                      <div className="text-[11px] font-bold text-slate-600">
                        {t('SCIENCE SCORE', 'نقاط العلوم')}
                      </div>
                      <div className="font-mono-tabular font-extrabold text-xl text-amber-700">
                        {Math.round(resources.science)}%
                      </div>
                    </div>
                    <div className="bg-slate-50 border border-slate-300 rounded-xl p-2.5">
                      <div className="text-[11px] font-bold text-slate-600">
                        {t('LIFE SUPPORT (O2)', 'الأكسجين (O2)')}
                      </div>
                      <div className="font-mono-tabular font-extrabold text-xl text-emerald-700">
                        {Math.round(resources.oxygen)}%
                      </div>
                    </div>
                    <div className="bg-slate-50 border border-slate-300 rounded-xl p-2.5">
                      <div className="text-[11px] font-bold text-slate-600">
                        {t('RADIATION SAFETY', 'أمان الإشعاع')}
                      </div>
                      <div className="font-mono-tabular font-extrabold text-xl text-sky-800">
                        {Math.round(resources.radiation)}%
                      </div>
                    </div>
                    <div className="bg-slate-50 border border-slate-300 rounded-xl p-2.5">
                      <div className="text-[11px] font-bold text-slate-600">
                        {t('SCIENCE CARDS', 'بطاقات العلوم')}
                      </div>
                      <div className="font-mono-tabular font-extrabold text-xl text-slate-900">
                        {unlockedSols.length}/10
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-xs text-slate-600 border-t border-slate-300">
                    <span>
                      {t(
                        `Mission Site: ${planet === 'moon' ? 'Lunar South Pole (Artemis)' : 'Jezero Crater, Mars'}`,
                        `الموقع: ${planet === 'moon' ? 'القطب الجنوبي للقمر (أرتميس)' : 'فوهة جيزيرو، المريخ'}`
                      )}
                    </span>
                    <span className="font-semibold text-slate-800">
                      {t('Signed: AstroKids Flight Director', 'توقيع: مدير رحلات أسترو كيدز')}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Real NASA Mission-Control Protocol Comparison + Save/Print Actions */}
            <div className="no-print bg-[#121c31] border border-slate-700 rounded-2xl p-5 sm:p-6 space-y-4 shadow-2xl">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="font-display font-bold text-base sm:text-lg text-white flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <span>
                    {t(
                      `How ${commanderName}’s Choices Match NASA Protocols`,
                      `كيف تطابقت قرارات ${commanderName} مع بروتوكولات ناسا`
                    )}
                  </span>
                </h3>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={downloadCertificatePng}
                    className="min-h-[44px] px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-display font-bold text-sm flex items-center gap-2 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>{t('Save Certificate (PNG)', 'حفظ الشهادة (صورة)')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-600 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm flex items-center gap-2 cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    <span>{t('Print Certificate', 'طباعة الشهادة')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => startMission(planet === 'moon' ? 'mars' : 'moon')}
                    className="min-h-[44px] px-4 py-2 rounded-xl border border-emerald-400/60 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 font-display font-bold text-sm flex items-center gap-2 cursor-pointer"
                  >
                    <Globe className="w-4 h-4 text-emerald-300" />
                    <span>
                      {planet === 'moon'
                        ? t('Play on Mars (Jezero Crater)', 'العب على المريخ (فوهة جيزيرو)')
                        : t('Play on Moon (Artemis Base)', 'العب على القمر (قاعدة أرتميس)')}
                    </span>
                  </button>
                </div>
              </div>

              <ul className="space-y-2 text-sm text-slate-300">
                <li className="flex items-start gap-2">
                  <Shield className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-white">{t('Solar Storm Protocol:', 'بروتوكول العواصف الشمسية:')}</strong>{' '}
                    {t(
                      `You blocked ${telemetry.flaresBlocked} / ${Math.max(telemetry.flaresTotal, 1)} DONKI solar flares. Real Artemis crews also enter storm shelters first and pause non-essential gear.`,
                      `صددتَ ${telemetry.flaresBlocked} من أصل ${Math.max(telemetry.flaresTotal, 1)} توهج شمسي. رواد أرتميس يدخلون الملاجئ الواقية أولاً أيضاً.`
                    )}
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Radio className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-white">{t('Deep Space Comms:', 'اتصالات الفضاء العميق:')}</strong>{' '}
                    {t(
                      `You completed ${telemetry.signalsSent} science uploads (${telemetry.signalsCancelled} cancelled early). On Mars, NASA schedules uninterrupted antenna windows to beat light-speed delay.`,
                      `أكملتَ ${telemetry.signalsSent} عملية إرسال علمية (${telemetry.signalsCancelled} ألغيت مبكراً). في المريخ تجدول ناسا الاتصال دون انقطاع لتجاوز تأخر الإشارة.`
                    )}
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Wind className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-white">{t('Power Shedding & Resilience:', 'إدارة الطاقة والمرونة:')}</strong>{' '}
                    {t(
                      `You made ${telemetry.switchToggles} power trades with ${telemetry.podSavesUsed} Emergency Pod Save(s)—just like real flight controllers balancing life support and science!`,
                      `أجريتَ ${telemetry.switchToggles} تبديلاً للطاقة مع ${telemetry.podSavesUsed} إنقاذ طارئ—تماماً مثل مهندسي ناسا في الموازنة بين الأكسجين والعلوم!`
                    )}
                  </span>
                </li>
              </ul>

              {/* LOCAL MISSION LOG: MOON VS MARS STRATEGY COMPARISON */}
              <div className="rounded-xl border border-indigo-400/40 bg-slate-900/85 p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-display font-bold text-sm sm:text-base text-white flex items-center gap-2">
                    <Award className="w-4 h-4 text-amber-400" />
                    <span>
                      {t('Moon vs. Mars Strategy Log (Saved Locally)', 'مقارنة استراتيجية القمر مقابل المريخ (محفوظة محلياً)')}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono-tabular text-sky-300">
                    {[missionLog.moon, missionLog.mars].filter(Boolean).length}/2 {t('WORLDS COMPLETED', 'عالم مكتمل')}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {(['moon', 'mars'] as const).map((w) => {
                    const rec = missionLog[w];
                    const isCurrentWorld = planet === w;
                    return (
                      <div
                        key={w}
                        className={`rounded-xl border p-3 space-y-1.5 ${
                          rec
                            ? isCurrentWorld
                              ? 'bg-sky-950/50 border-sky-400/60'
                              : 'bg-slate-950/70 border-emerald-500/40'
                            : 'bg-slate-950/40 border-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-display font-bold text-sm text-white">
                            {w === 'moon' ? t('Moon · Artemis (1.3s)', 'القمر · أرتميس (1.3ث)') : t('Mars · Jezero (5.0s)', 'المريخ · جيزيرو (5.0ث)')}
                          </span>
                          {rec && (
                            <span className="font-mono-tabular font-bold text-amber-300">
                              {rec.science}% {t('Sci', 'علوم')}
                            </span>
                          )}
                        </div>
                        {rec ? (
                          <>
                            <div className="text-[11px] text-emerald-300 font-semibold">
                              {rec.rankTitle[lang]} · {rec.commanderName}
                            </div>
                            <div className="font-mono-tabular text-[11px] text-slate-300 flex flex-wrap gap-x-3 gap-y-0.5">
                              <span>O2: {rec.oxygen}%</span>
                              <span>{t('Safe:', 'أمان:')} {rec.radiation}%</span>
                              <span>{t('Signals:', 'إشارات:')} {rec.signalsSent}</span>
                              <span>{t('Flares:', 'توهجات:')} {rec.flaresBlocked}/{rec.flaresTotal}</span>
                            </div>
                          </>
                        ) : (
                          <div className="text-[11px] text-slate-400">
                            {t(
                              `Complete a 10-Sol mission on ${w === 'moon' ? 'Moon' : 'Mars'} to unlock side-by-side comparison!`,
                              `أكمل مهمة 10 أيام على ${w === 'moon' ? 'القمر' : 'المريخ'} لفتح المقارنة المباشرة!`
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {missionLog.moon && missionLog.mars && (
                  <p className="text-xs text-indigo-200 leading-relaxed border-t border-slate-800 pt-2">
                    <strong className="text-white me-1">
                      {t('Strategy Comparison:', 'تحليل الاستراتيجية:')}
                    </strong>
                    {missionLog.mars.science >= missionLog.moon.science
                      ? t(
                          `Impressive! Your Mars Science (${missionLog.mars.science}%) beat your Moon record (${missionLog.moon.science}%) even with the 5.0s Mars light-speed delay (${missionLog.mars.signalsSent} Mars uplinks vs. ${missionLog.moon.signalsSent} Moon uplinks).`,
                          `رائع! تفوقت نقاط علوم المريخ (${missionLog.mars.science}%) على رقمك في القمر (${missionLog.moon.science}%) رغم تأخر إشارة المريخ البالغ 5 ثوانٍ!`
                        )
                      : t(
                          `Fast lunar links helped you score ${missionLog.moon.science}% Science on Moon (${missionLog.moon.signalsSent} uplinks) vs. ${missionLog.mars.science}% on Mars (${missionLog.mars.signalsSent} uplinks)—can you beat Mars with uninterrupted 5.0s comms?`,
                          `ساعدك الإرسال السريع في القمر على تحقيق ${missionLog.moon.science}% علوم مقابل ${missionLog.mars.science}% في المريخ—جرّب تحدي المريخ مرة أخرى دون قطع موجة الـ 5 ثوانٍ!`
                        )}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAlbumModal(true)}
                  className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 text-sm font-semibold text-slate-200 cursor-pointer"
                >
                  {t('Open Science Card Album', 'فتح ألبوم البطاقات')}
                </button>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => startMission(planet === 'moon' ? 'mars' : 'moon')}
                    className="min-h-[44px] px-5 py-2.5 rounded-xl border border-amber-400/60 bg-amber-500/15 hover:bg-amber-500/25 text-amber-200 font-bold text-sm cursor-pointer"
                  >
                    {planet === 'moon'
                      ? t('Compare on Mars (Signal Delay)', 'قارن على المريخ (تأخر الإشارة)')
                      : t('Compare on Moon (Artemis)', 'قارن على القمر (أرتميس)')}
                  </button>
                  <button
                    type="button"
                    onClick={() => startMission(planet)}
                    className="min-h-[44px] px-6 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-display font-bold text-sm cursor-pointer"
                  >
                    {t('Play Again', 'العب مجدداً')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TOOLTIP POPUP FOR GLOSSARY TERMS */}
      {activeTerm && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/70 flex items-center justify-center p-4"
          onClick={() => setActiveTerm(null)}
        >
          <div
            className="bg-[#121c31] border border-sky-400/60 rounded-2xl max-w-md w-full p-6 space-y-3 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-sky-300">{activeTerm.source[lang]}</span>
              <div className="flex items-center gap-1.5">
                <ReadAloudButton
                  id="glossary-term"
                  lang={lang}
                  speaking={speakingId === 'glossary-term'}
                  onToggle={() =>
                    toggleSpeak(
                      'glossary-term',
                      `${activeTerm.term[lang]}. ${activeTerm.shortDesc[lang]}. ${activeTerm.detail[lang]}`
                    )
                  }
                />
                <button
                  type="button"
                  onClick={() => setActiveTerm(null)}
                  aria-label="Close definition"
                  className="min-h-[40px] min-w-[40px] rounded-lg hover:bg-slate-800 flex items-center justify-center text-slate-300 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <h3 className="font-display font-bold text-2xl text-white">{activeTerm.term[lang]}</h3>
            <p className="text-sm font-semibold text-emerald-300">{activeTerm.shortDesc[lang]}</p>
            <p className="text-sm text-slate-200 leading-relaxed">{activeTerm.detail[lang]}</p>
          </div>
        </div>
      )}

      {/* COLLECTIBLE SCIENCE CARDS ALBUM MODAL */}
      {showAlbumModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/80 flex items-center justify-center p-4"
          onClick={() => setShowAlbumModal(false)}
        >
          <div
            className="bg-[#121c31] border border-slate-700 rounded-2xl max-w-4xl w-full max-h-[88vh] flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
              <div>
                <h2 className="font-display font-bold text-xl text-white">
                  {t(
                    `NASA & CSA Science Card Album (${unlockedSols.length} / 10)`,
                    `ألبوم بطاقات ناسا وكندا العلمية (${unlockedSols.length} / 10)`
                  )}
                </h2>
                <p className="text-xs text-slate-400">
                  {t(
                    'Complete each Sol to collect real space biology, radiation, and hydroponics cards.',
                    'أكمل كل يوم فضائي لجمع بطاقات حقيقية في أحياء الفضاء والإشعاع والزراعة المائية.'
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAlbumModal(false)}
                aria-label="Close Science Card Album"
                className="min-h-[44px] min-w-[44px] rounded-lg hover:bg-slate-800 flex items-center justify-center text-slate-300 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-4">
              {SCIENCE_CARDS.map((card) => {
                const unlocked = unlockedSols.includes(card.sol);
                const cardSpeakId = `album-card-${card.sol}`;
                return (
                  <div
                    key={card.sol}
                    className={`rounded-xl border p-4 space-y-2 ${
                      unlocked
                        ? 'bg-slate-900/95 border-emerald-500/40'
                        : 'bg-slate-950/60 border-slate-800 opacity-70'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-mono-tabular font-bold text-slate-400">
                        {t(`SOL ${card.sol}`, `اليوم ${card.sol}`)}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className={unlocked ? 'text-sky-300 font-semibold' : 'text-slate-500'}>
                          {unlocked ? card.agency[lang] : t('Locked', 'مقفلة')}
                        </span>
                        {unlocked && (
                          <ReadAloudButton
                            id={cardSpeakId}
                            lang={lang}
                            compact
                            speaking={speakingId === cardSpeakId}
                            onToggle={() =>
                              toggleSpeak(cardSpeakId, `${card.title[lang]}. ${card.fact[lang]}`)
                            }
                          />
                        )}
                      </div>
                    </div>
                    <h3 className="font-display font-bold text-base text-white">
                      {unlocked
                        ? card.title[lang]
                        : t(`Complete Sol ${card.sol} to Unlock`, `أكمل اليوم ${card.sol} لفتحها`)}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                      {unlocked
                        ? card.fact[lang]
                        : t(
                            `Keep Life Support, Radiation Safety, and Science Score above 0% through Sol ${card.sol} to discover this NASA/CSA fact!`,
                            `حافظ على الموارد الثلاثة فوق 0% حتى نهاية اليوم ${card.sol} لاكتشاف هذه المعلومة من ناسا!`
                          )}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* NASA & CSA DATA SOURCES MODAL */}
      {showSourcesModal && (
        <DataSourcesModal
          lang={lang}
          dataMode={dataMode}
          donkiFlares={donkiFlares}
          cmeEvents={cmeEvents}
          roverPhotos={roverPhotos}
          neoObjects={neoObjects}
          apod={apod}
          apodImgFailed={apodImgFailed}
          failedPhotoUrls={failedPhotoUrls}
          onApodError={() => setApodImgFailed(true)}
          onPhotoError={markPhotoFailed}
          onClose={() => setShowSourcesModal(false)}
        />
      )}

      {/* SETTINGS & CREDITS MODAL */}
      {showSettingsModal && (
        <SettingsCreditsModal
          lang={lang}
          sfxOn={sfxOn}
          ambientOn={ambientOn}
          spaceWindOn={spaceWindOn}
          autoReadAloud={autoReadAloud}
          voiceName={pickFriendlyVoice(lang)?.name || ''}
          onToggleSfx={toggleSfx}
          onToggleAmbient={toggleAmbient}
          onToggleSpaceWind={toggleSpaceWind}
          onToggleAutoRead={toggleAutoReadAloud}
          onClose={() => setShowSettingsModal(false)}
        />
      )}

      {/* SOL PHOTO & TELEMETRY LIGHTBOX */}
      {showSolPhotoModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/85 flex items-center justify-center p-4"
          onClick={() => setShowSolPhotoModal(false)}
        >
          <div
            className="bg-[#121c31] border border-sky-400/50 rounded-2xl max-w-xl w-full p-5 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-xs font-mono-tabular font-bold text-sky-300">
                  {solBrief.datasetTag}
                </div>
                <h3 className="font-display font-bold text-lg text-white">{solBrief.photoCaption}</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSolPhotoModal(false)}
                aria-label="Close NASA photo preview"
                className="min-h-[40px] min-w-[40px] rounded-lg hover:bg-slate-800 flex items-center justify-center text-slate-300 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {solBrief.photoUrl ? (
              <img
                src={solBrief.photoUrl}
                alt={solBrief.photoCaption}
                referrerPolicy="no-referrer"
                onError={() => markPhotoFailed(solBrief.photoUrl)}
                className="w-full max-h-[340px] object-cover rounded-xl border border-slate-700"
              />
            ) : (
              <div className="w-full h-52 rounded-xl border border-slate-700 bg-gradient-to-br from-slate-900 via-sky-950 to-amber-950/60 flex flex-col items-center justify-center gap-2 text-center p-4">
                <Camera className="w-10 h-10 text-sky-300" />
                <div className="font-display font-bold text-white">{solBrief.sourceBadge}</div>
                <div className="text-xs text-slate-300">{solBrief.photoCredit}</div>
              </div>
            )}
            <p className="text-sm text-slate-200 leading-relaxed">{solBrief.question}</p>
            <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-slate-800">
              <span>{solBrief.photoCredit}</span>
              <ReadAloudButton
                id="sol-photo-read"
                lang={lang}
                compact
                speaking={speakingId === 'sol-photo-read'}
                onToggle={() => toggleSpeak('sol-photo-read', `${solBrief.photoCaption}. ${solBrief.question}`)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface SwitchControlProps {
  shortcut: string;
  title: string;
  subtitle: string;
  active: boolean;
  oldestActive: boolean;
  oldestLabel: string;
  accent: 'sky' | 'emerald' | 'amber';
  icon: React.ReactNode;
  onClick: () => void;
}

function SwitchControl({
  shortcut,
  title,
  subtitle,
  active,
  oldestActive,
  oldestLabel,
  accent,
  icon,
  onClick,
}: SwitchControlProps) {
  const accentStyles = {
    sky: active
      ? 'bg-sky-950/75 border-sky-400 text-sky-100 shadow-lg shadow-sky-950/40'
      : 'bg-slate-900/90 border-slate-700/80 text-slate-300 hover:border-slate-500',
    emerald: active
      ? 'bg-emerald-950/75 border-emerald-400 text-emerald-100 shadow-lg shadow-emerald-950/40'
      : 'bg-slate-900/90 border-slate-700/80 text-slate-300 hover:border-slate-500',
    amber: active
      ? 'bg-amber-950/75 border-amber-400 text-amber-100 shadow-lg shadow-amber-950/40'
      : 'bg-slate-900/90 border-slate-700/80 text-slate-300 hover:border-slate-500',
  }[accent];

  const knobColor = {
    sky: active ? 'bg-sky-400' : 'bg-slate-600',
    emerald: active ? 'bg-emerald-400' : 'bg-slate-600',
    amber: active ? 'bg-amber-400' : 'bg-slate-600',
  }[accent];

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`min-h-[68px] w-full rounded-xl border p-3.5 text-start transition-all flex items-center justify-between gap-3 cursor-pointer active:scale-[0.99] ${accentStyles}`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
            active ? 'bg-white/10 text-white' : 'bg-slate-800 text-slate-400'
          }`}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono-tabular text-[11px] font-bold text-slate-400">[{shortcut}]</span>
            <span className="font-display font-bold text-sm sm:text-base text-white truncate">
              {title}
            </span>
          </div>
          <div className="text-xs text-slate-300 truncate mt-0.5">
            {oldestActive ? `${subtitle} · ${oldestLabel}` : subtitle}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <span className="font-mono-tabular text-xs font-bold">{active ? 'ON' : 'OFF'}</span>
        <div className={`w-11 h-6 rounded-full p-0.5 transition-colors ${active ? 'bg-slate-950/70' : 'bg-slate-800'}`}>
          <div
            className={`w-5 h-5 rounded-full transition-transform duration-150 ${knobColor} ${
              active ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </div>
      </div>
    </button>
  );
}

interface DataSourcesModalProps {
  lang: Lang;
  dataMode: 'loading' | 'live' | 'verified';
  donkiFlares: FlareRecord[];
  cmeEvents: CmeRecord[];
  roverPhotos: RoverPhoto[];
  neoObjects: NeoRecord[];
  apod: ApodData;
  apodImgFailed: boolean;
  failedPhotoUrls: Record<string, boolean>;
  onApodError: () => void;
  onPhotoError: (url: string) => void;
  onClose: () => void;
}

function DataSourcesModal({
  lang,
  dataMode,
  donkiFlares,
  cmeEvents,
  roverPhotos,
  neoObjects,
  apod,
  apodImgFailed,
  failedPhotoUrls,
  onApodError,
  onPhotoError,
  onClose,
}: DataSourcesModalProps) {
  const tr = (en: string, ar: string) => (lang === 'ar' ? ar : en);
  const topRover = roverPhotos[0];
  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/80 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#121c31] border border-slate-700 rounded-2xl max-w-3xl w-full max-h-[88vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div>
            <div className="text-xs font-mono-tabular text-sky-300 font-bold">
              {dataMode === 'live'
                ? tr('LIVE NASA API CONNECTED', 'متصل بواجهة بيانات ناسا الحية')
                : tr('VERIFIED NASA & CSA DATASETS', 'مجموعة بيانات ناسا وكندا الموثقة')}
            </div>
            <h2 className="font-display font-bold text-xl text-white">
              {tr('NASA & CSA Data Sources', 'مصادر بيانات ناسا ووكالة الفضاء الكندية')}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close data sources modal"
            className="min-h-[44px] min-w-[44px] rounded-lg hover:bg-slate-800 flex items-center justify-center text-slate-300 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6 text-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-2.5">
              {apod.url && !apodImgFailed ? (
                <img
                  src={apod.url}
                  alt={apod.title}
                  referrerPolicy="no-referrer"
                  onError={onApodError}
                  className="w-full h-36 object-cover rounded-lg border border-slate-700"
                />
              ) : (
                <div className="w-full h-36 rounded-lg border border-slate-700 bg-gradient-to-br from-slate-800 via-sky-950 to-slate-900 flex flex-col items-center justify-center p-3 text-center">
                  <Globe className="w-8 h-8 text-sky-400 mb-1.5" />
                  <span className="text-xs font-semibold text-slate-200">
                    {tr('NASA APOD Archive', 'أرشيف صور ناسا الفلكية')}
                  </span>
                  <span className="text-[11px] text-slate-400">{apod.date}</span>
                </div>
              )}
              <div className="text-xs font-semibold text-amber-300">
                NASA APOD · {apod.date}
              </div>
              <h3 className="font-display font-bold text-sm text-white line-clamp-1">{apod.title}</h3>
              <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">{apod.explanation}</p>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-2.5">
              {topRover?.imgSrc && !failedPhotoUrls[topRover.imgSrc] ? (
                <img
                  src={topRover.imgSrc}
                  alt={`${topRover.rover} ${topRover.camera}`}
                  referrerPolicy="no-referrer"
                  onError={() => onPhotoError(topRover.imgSrc)}
                  className="w-full h-36 object-cover rounded-lg border border-slate-700"
                />
              ) : (
                <div className="w-full h-36 rounded-lg border border-slate-700 bg-gradient-to-br from-slate-800 via-amber-950/60 to-slate-900 flex flex-col items-center justify-center p-3 text-center">
                  <Camera className="w-8 h-8 text-amber-400 mb-1.5" />
                  <span className="text-xs font-semibold text-slate-200">
                    {tr('Perseverance Rover Archive', 'أرشيف المسبار بيرسيفيرانس')}
                  </span>
                  <span className="text-[11px] text-slate-400">Mars Sol {topRover?.sol ?? 1420}</span>
                </div>
              )}
              <div className="text-xs font-semibold text-emerald-300">
                {tr('NASA Mars Rover Photos (Perseverance)', 'صور المسبار بيرسيفيرانس على المريخ')}
              </div>
              <h3 className="font-display font-bold text-sm text-white line-clamp-1">
                {topRover?.camera || 'Mastcam-Z'} · Mars Sol {topRover?.sol ?? 1420}
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                {tr(
                  `Latest surface imagery captured on ${topRover?.earthDate || '2025-02-18'} inside Jezero Crater.`,
                  `أحدث صور السطح الملتقطة بتاريخ ${topRover?.earthDate || '2025-02-18'} في فوهة جيزيرو.`
                )}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="font-display font-bold text-base text-white">
              {tr('NASA DONKI Solar Flare Feed (FLR)', 'بيانات التوهجات الشمسية من ناسا (DONKI FLR)')}
            </h3>
            <div className="border border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-start text-xs">
                <thead className="bg-slate-900 text-slate-400">
                  <tr>
                    <th className="px-3 py-2.5 font-semibold">{tr('Class', 'الفئة')}</th>
                    <th className="px-3 py-2.5 font-semibold">{tr('Severity', 'الشدة')}</th>
                    <th className="px-3 py-2.5 font-semibold">{tr('Region', 'المنطقة')}</th>
                    <th className="px-3 py-2.5 font-semibold">{tr('Observed', 'وقت الرصد')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 bg-slate-950/40">
                  {donkiFlares.slice(0, 5).map((flr) => (
                    <tr key={flr.id}>
                      <td className="px-3 py-2 font-mono-tabular font-bold text-rose-300">{flr.classType}</td>
                      <td className="px-3 py-2 text-slate-200">{flr.severity}</td>
                      <td className="px-3 py-2 font-mono-tabular text-slate-300">{flr.sourceLocation}</td>
                      <td className="px-3 py-2 font-mono-tabular text-slate-400">{flr.beginTime}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="font-display font-bold text-base text-white">
              {tr('NASA DONKI Coronal Mass Ejections (CME)', 'بيانات الانبعاثات الكتلية الإكليلية (DONKI CME)')}
            </h3>
            <div className="border border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-start text-xs">
                <thead className="bg-slate-900 text-slate-400">
                  <tr>
                    <th className="px-3 py-2.5 font-semibold">{tr('Speed', 'السرعة')}</th>
                    <th className="px-3 py-2.5 font-semibold">{tr('Severity', 'الشدة')}</th>
                    <th className="px-3 py-2.5 font-semibold">{tr('Half Angle', 'نصف الزاوية')}</th>
                    <th className="px-3 py-2.5 font-semibold">{tr('Start Time', 'وقت البدء')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 bg-slate-950/40">
                  {cmeEvents.slice(0, 4).map((cme) => (
                    <tr key={cme.id}>
                      <td className="px-3 py-2 font-mono-tabular font-bold text-amber-300">{cme.speed} km/s</td>
                      <td className="px-3 py-2 text-slate-200">{cme.severity}</td>
                      <td className="px-3 py-2 font-mono-tabular text-slate-300">{cme.halfAngle}°</td>
                      <td className="px-3 py-2 font-mono-tabular text-slate-400">{cme.startTime}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="font-display font-bold text-base text-white">
              {tr('NASA Near-Earth Asteroids Radar (NeoWs)', 'رادار الكويكبات القريبة من الأرض (NASA NeoWs)')}
            </h3>
            <div className="border border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-start text-xs">
                <thead className="bg-slate-900 text-slate-400">
                  <tr>
                    <th className="px-3 py-2.5 font-semibold">{tr('Asteroid', 'الكويكب')}</th>
                    <th className="px-3 py-2.5 font-semibold">{tr('Speed', 'السرعة')}</th>
                    <th className="px-3 py-2.5 font-semibold">{tr('Miss Distance', 'مسافة المرور')}</th>
                    <th className="px-3 py-2.5 font-semibold">{tr('Status', 'الحالة')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 bg-slate-950/40">
                  {neoObjects.slice(0, 4).map((neo) => (
                    <tr key={neo.id}>
                      <td className="px-3 py-2 font-mono-tabular font-bold text-sky-300">{neo.name}</td>
                      <td className="px-3 py-2 font-mono-tabular text-slate-200">{neo.speedKmH.toLocaleString()} km/h</td>
                      <td className="px-3 py-2 font-mono-tabular text-slate-300">
                        {(neo.missKm / 1000).toFixed(0)}k km
                      </td>
                      <td className={`px-3 py-2 font-semibold ${neo.hazardous ? 'text-amber-300' : 'text-emerald-300'}`}>
                        {neo.hazardous ? tr('Tracked Watch', 'مرصود بدقة') : tr('Safe Flyby', 'مرور آمن')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Traceable Dataset-to-Gameplay Mapping Table for Judges */}
          <div className="space-y-2">
            <h3 className="font-display font-bold text-base text-white">
              {tr(
                'Official NASA & CSA Datasets Powering AstroKids',
                'مجموعات بيانات ناسا وكندا الرسمية التي تشغّل اللعبة'
              )}
            </h3>
            <div className="border border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-start text-xs">
                <thead className="bg-slate-900 text-slate-300">
                  <tr>
                    <th className="px-3.5 py-2.5 font-bold w-1/3">
                      {tr('Official Dataset', 'مصدر البيانات الرسمي')}
                    </th>
                    <th className="px-3.5 py-2.5 font-bold">
                      {tr('How It Powers the Game', 'كيف يُستخدم في اللعبة')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 bg-slate-950/45 text-slate-200">
                  <tr>
                    <td className="px-3.5 py-2.5 font-bold text-rose-300">
                      NASA DONKI (FLR &amp; CME)
                    </td>
                    <td className="px-3.5 py-2.5 text-slate-300">
                      {tr(
                        'Drives live solar flare radiation damage rates, CME speeds (km/s), warning window countdowns, and real flare dates per Sol.',
                        'يشغّل معدلات ضرر التوهج الشمسي وسرعات الانبعاث الكتلي وتقليص مهلة الإنذار وتواريخ العواصف الحقيقية في كل يوم.'
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-3.5 py-2.5 font-bold text-cyan-300">
                      NASA NeoWs (Asteroids) &amp; InSight
                    </td>
                    <td className="px-3.5 py-2.5 text-slate-300">
                      {tr(
                        'Feeds live near-Earth asteroid tracking missions on Sol 6 and Mars wind/temperature impacts on O2 charge & dust levels.',
                        'يغذي مهمة رصد الكويكبات في اليوم 6 وتأثير الرياح والحرارة الحقيقية على استهلاك الأكسجين ومستوى الغبار.'
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-3.5 py-2.5 font-bold text-sky-300">
                      NASA RadLab (OSDR Radiation Dosimetry)
                    </td>
                    <td className="px-3.5 py-2.5 text-slate-300">
                      {tr(
                        'Provides authentic ISS absorbed radiation dose rates (mSv/day) used to calculate shield vs. health trade-offs.',
                        'يوفر معدلات جرعات الإشعاع الممتصة الحقيقية (mSv/day) لحساب موازنة الدرع والصحة.'
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-3.5 py-2.5 font-bold text-emerald-300">
                      NASA OSDR (Open Science Data Repository)
                    </td>
                    <td className="px-3.5 py-2.5 text-slate-300">
                      {tr(
                        'Grounds astronaut health alerts (bone density, muscle mass, immune system) and unlockable science cards.',
                        'يدعم تنبيهات صحة الرواد (العظام والعضلات والمناعة) وبطاقات العلوم القابلة للجمع.'
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-3.5 py-2.5 font-bold text-amber-300">
                      NASA Mars Trek &amp; Perseverance Photos
                    </td>
                    <td className="px-3.5 py-2.5 text-slate-300">
                      {tr(
                        'Supplies live Mars rover photos uploaded during Science uplinks, Jezero Crater telemetry, and Mars-Earth signal delay mechanics.',
                        'يوفر صور المسبار بيرسيفيرانس الحية المرفوعة للأرض، وقياسات فوهة جيزيرو، وميكانيكية تأخر الاتصال بالأرض.'
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-3.5 py-2.5 font-bold text-indigo-300">
                      NASA APOD (Astronomy Picture of the Day)
                    </td>
                    <td className="px-3.5 py-2.5 text-slate-300">
                      {tr(
                        'Supplies real daily space imagery and astronomy mission questions.',
                        'يوفر صوراً فضائية حقيقية يومية وأسئلة فلكية موثقة.'
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-3.5 py-2.5 font-bold text-teal-300">
                      CSA (Canadian Space Agency)
                    </td>
                    <td className="px-3.5 py-2.5 text-slate-300">
                      {tr(
                        'Powers the Hydroponic Space Farm mechanics for lunar/Martian food & oxygen production.',
                        'يشغّل آلية المزرعة المائية لإنتاج الغذاء والأكسجين على القمر والمريخ.'
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-xl border border-sky-500/40 bg-sky-950/40 px-4 py-3 text-xs text-sky-100 leading-relaxed">
            <strong className="text-sky-300">
              {tr('Educational Attribution Note:', 'ملاحظة علمية رسمية:')}
            </strong>{' '}
            {tr(
              'Real NASA open data (DONKI FLR & CME, Perseverance Photos, RadLab, OSDR, Mars Trek, APOD) and Canadian Space Agency (CSA) space-farming research are used solely for interactive educational simulation for learners ages 7–12.',
              'تُستخدم بيانات ناسا المفتوحة الحقيقية وأبحاث وكالة الفضاء الكندية حصرياً للمحاكاة التعليمية التفاعلية للأطفال بعمر 7–12 عاماً.'
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface SettingsCreditsModalProps {
  lang: Lang;
  sfxOn: boolean;
  ambientOn: boolean;
  spaceWindOn: boolean;
  autoReadAloud: boolean;
  voiceName: string;
  onToggleSfx: () => void;
  onToggleAmbient: () => void;
  onToggleSpaceWind: () => void;
  onToggleAutoRead: () => void;
  onClose: () => void;
}

function SettingsCreditsModal({
  lang,
  sfxOn,
  ambientOn,
  spaceWindOn,
  autoReadAloud,
  voiceName,
  onToggleSfx,
  onToggleAmbient,
  onToggleSpaceWind,
  onToggleAutoRead,
  onClose,
}: SettingsCreditsModalProps) {
  const tr = (en: string, ar: string) => (lang === 'ar' ? ar : en);
  const toggleRows = [
    {
      id: 'sfx',
      label: tr('Sound Effects (SFX)', 'المؤثرات الصوتية'),
      desc: tr(
        'Rocket launch, mechanical switch clicks, cosmic radio beeps & flare alerts.',
        'صوت إطلاق الصاروخ، نقرات المفاتيح الفضائية، إشارات الراديو، وإنذارات التوهج.'
      ),
      enabled: sfxOn,
      onToggle: onToggleSfx,
      icon: <Volume2 className="w-5 h-5 text-sky-300" />,
    },
    {
      id: 'ambient',
      label: tr('Background Space Ambience', 'صوت الفضاء الخلفي'),
      desc: tr(
        'Gentle space outpost synthesizer hum with subtle solar-flare pitch shifts.',
        'موسيقى فضائية هادئة للقاعدة تتفاعل بلطف مع العواصف الشمسية.'
      ),
      enabled: ambientOn,
      onToggle: onToggleAmbient,
      icon: <Music className="w-5 h-5 text-emerald-300" />,
    },
    {
      id: 'spacewind',
      label: tr('Space Wind (Dust-Reactive)', 'رياح الفضاء (حسب الغبار الجوي)'),
      desc: tr(
        'Procedural atmospheric wind whose volume and sweep rise with planetary dust levels.',
        'صوت رياح فضائية يتغير مستواه وحدّته تلقائياً حسب نسبة الغبار الجوي على الكوكب.'
      ),
      enabled: spaceWindOn,
      onToggle: onToggleSpaceWind,
      icon: <Wind className="w-5 h-5 text-cyan-300" />,
    },
    {
      id: 'autoread',
      label: tr('Auto-Read Questions Aloud for Kids', 'القراءة الصوتية التلقائية للأسئلة'),
      desc: voiceName
        ? tr(
            `Automatically reads mission questions & cards aloud (${voiceName}).`,
            `يقرأ الأسئلة والبطاقات تلقائياً بصوت واضح (${voiceName}).`
          )
        : tr(
            'Automatically reads mission questions & unlocked science cards aloud.',
            'يقرأ الأسئلة والبطاقات العلمية تلقائياً بصوت واضح للأطفال.'
          ),
      enabled: autoReadAloud,
      onToggle: onToggleAutoRead,
      icon: <Sparkles className="w-5 h-5 text-amber-300" />,
    },
  ];

  const leadDevelopers = [
    {
      name: { en: 'Mohamed Moataz', ar: 'محمد معتز' },
      badge: { en: 'Lead Developer', ar: 'المطور الأساسي' },
    },
    {
      name: { en: 'Jana Mohamed', ar: 'جنى محمد' },
      badge: { en: 'Lead Developer', ar: 'المطورة الأساسية' },
    },
  ];

  const contentCoDevelopers = [
    {
      name: { en: 'Nada Ahmed', ar: 'ندى أحمد' },
      badge: { en: 'Mission Questions & Co-Dev', ar: 'الأسئلة والمحتوى · مطورة مشاركة' },
    },
    {
      name: { en: 'Radwa', ar: 'رضوى' },
      badge: { en: 'Science Content & Co-Dev', ar: 'المحتوى العلمي · مطورة مشاركة' },
    },
    {
      name: { en: 'Hisham', ar: 'هشام' },
      badge: { en: 'Science Questions & Co-Dev', ar: 'أسئلة المهمة · مطور مشارك' },
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/80 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#121c31] border border-indigo-400/50 rounded-2xl max-w-2xl w-full max-h-[88vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <Settings className="w-5 h-5 text-indigo-300" />
            <div>
              <div className="text-xs font-mono-tabular font-bold text-indigo-300">
                {tr('AUDIO, VOICE & MISSION TEAM', 'إعدادات الصوت وفريق العمل')}
              </div>
              <h2 className="font-display font-bold text-xl text-white">
                {tr('Settings & Game Credits', 'الإعدادات وصنّاع اللعبة')}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings modal"
            className="min-h-[44px] min-w-[44px] rounded-lg hover:bg-slate-800 flex items-center justify-center text-slate-300 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          {/* Audio & Accessibility Toggles */}
          <div className="space-y-3">
            <h3 className="font-display font-bold text-sm uppercase tracking-wider text-slate-300">
              {tr('Audio & Accessibility Settings', 'إعدادات الصوت والقراءة للأطفال')}
            </h3>
            <div className="space-y-2.5">
              {toggleRows.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  role="switch"
                  aria-checked={row.enabled}
                  onClick={row.onToggle}
                  className="w-full min-h-[64px] rounded-xl border border-slate-700/90 bg-slate-900/90 hover:border-sky-400/60 p-3.5 flex items-center justify-between gap-4 text-start transition-colors cursor-pointer"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center shrink-0">
                      {row.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="font-display font-bold text-sm sm:text-base text-white">
                        {row.label}
                      </div>
                      <p className="text-xs text-slate-400 leading-snug">{row.desc}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`font-mono-tabular text-xs font-bold ${
                        row.enabled ? 'text-emerald-300' : 'text-slate-400'
                      }`}
                    >
                      {row.enabled ? 'ON' : 'OFF'}
                    </span>
                    <div
                      dir="ltr"
                      className={`w-12 h-6 rounded-full p-0.5 transition-colors flex items-center ${
                        row.enabled ? 'bg-emerald-500/35 border border-emerald-400/60' : 'bg-slate-800 border border-slate-700'
                      }`}
                    >
                      <div
                        className={`w-[18px] h-[18px] rounded-full transition-transform duration-150 ${
                          row.enabled ? 'translate-x-[22px] bg-emerald-400' : 'translate-x-0 bg-slate-500'
                        }`}
                      />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Prominent Game Creators & Development Team Credits */}
          <div className="rounded-2xl border-2 border-amber-400/45 bg-gradient-to-br from-[#0e1933] via-[#132245] to-[#0e1933] p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <Users className="w-5 h-5 text-amber-300" />
                <h3 className="font-display font-extrabold text-lg text-white">
                  {tr('Game Creators & Development Team', 'صنّاع اللعبة وفريق التطوير')}
                </h3>
              </div>
              <span className="text-xs font-mono-tabular font-bold text-amber-300">
                NASA SPACE APPS TEAM
              </span>
            </div>

            {/* Lead Developers */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-sky-300 flex items-center gap-1.5">
                <Code2 className="w-4 h-4" />
                <span>{tr('Lead Developers', 'المطورون الأساسيون')}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {leadDevelopers.map((member) => (
                  <div
                    key={member.name.en}
                    className="rounded-xl border border-sky-400/50 bg-sky-950/45 px-4 py-3 flex items-center justify-between gap-2"
                  >
                    <div>
                      <div className="font-display font-extrabold text-base text-white">
                        {member.name[lang]}
                      </div>
                      <div className="text-[11px] font-semibold text-sky-300">
                        {member.badge[lang]}
                      </div>
                    </div>
                    <span className="text-lg" aria-hidden="true">🚀</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Mission Questions, Science Content & Co-Developers */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                <Microscope className="w-4 h-4" />
                <span>
                  {tr(
                    'Mission Questions, Science Content & Co-Developers',
                    'مطورو الأسئلة والمحتوى العلمي والمشاركون في التطوير'
                  )}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {contentCoDevelopers.map((member) => (
                  <div
                    key={member.name.en}
                    className="rounded-xl border border-emerald-400/40 bg-emerald-950/35 px-3.5 py-3 space-y-1"
                  >
                    <div className="font-display font-extrabold text-sm sm:text-base text-white">
                      {member.name[lang]}
                    </div>
                    <div className="text-[11px] font-semibold text-emerald-300 leading-snug">
                      {member.badge[lang]}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface ReadAloudButtonProps {
  id: string;
  lang: Lang;
  speaking: boolean;
  compact?: boolean;
  onToggle: () => void;
}

function ReadAloudButton({ lang, speaking, compact = false, onToggle }: ReadAloudButtonProps) {
  const tr = (en: string, ar: string) => (lang === 'ar' ? ar : en);
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  if (!supported) return null;

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={speaking}
      aria-label={speaking ? tr('Stop reading aloud', 'إيقاف القراءة الصوتية') : tr('Read aloud', 'استمع للنص')}
      className={`inline-flex items-center gap-1.5 rounded-lg border font-semibold transition-colors cursor-pointer shrink-0 ${
        compact ? 'min-h-[32px] px-2.5 py-1 text-xs' : 'min-h-[38px] px-3 py-1.5 text-xs'
      } ${
        speaking
          ? 'border-emerald-400 bg-emerald-950/90 text-emerald-200'
          : 'border-sky-500/50 bg-slate-900/90 hover:bg-slate-800 text-sky-200'
      }`}
    >
      {speaking ? (
        <>
          <span className="flex items-end gap-0.5 h-3.5" aria-hidden="true">
            <span className="w-0.5 h-3.5 bg-emerald-300 rounded-full origin-bottom animate-sound-bar-1" />
            <span className="w-0.5 h-3.5 bg-emerald-300 rounded-full origin-bottom animate-sound-bar-2" />
            <span className="w-0.5 h-3.5 bg-emerald-300 rounded-full origin-bottom animate-sound-bar-3" />
          </span>
          <Square className="w-3 h-3 fill-current" />
          <span>{tr('Stop', 'إيقاف')}</span>
        </>
      ) : (
        <>
          <span aria-hidden="true">🔊</span>
          <span>{compact ? tr('Listen', 'استمع') : tr('Read Aloud', 'استمع')}</span>
        </>
      )}
    </button>
  );
}
