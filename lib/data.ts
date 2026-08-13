// ============================================================
// Earlydays site content. Edit values here — components and
// pages read from this single source of truth.
// ============================================================

export const site = {
  name: "Earlydays",
  fullName: "Earlydays Nursery & Primary School",
  location: "Kaduna, Nigeria",
  whatsapp: "2340000000000", // TODO: replace with real WhatsApp number
  phone: "+234 000 000 0000", // TODO: replace
  email: "hello@earlydays.example", // TODO: replace
};

export function waLink(message: string) {
  return `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(message)}`;
}

export type Stage = {
  code: string;
  age: string;
  name: string;
  tag: string;
  desc: string;
  points: string[];
};

export const stages: Stage[] = [
  {
    code: "CR",
    age: "3–12 mo",
    name: "Creche",
    tag: "Foundations",
    desc: "Warm, secure care for our youngest — routines built around sleep, feeding, and gentle sensory play.",
    points: ["Low child-to-caregiver ratio", "Daily feeding & nap log for parents", "Sensory-rich, safe play environment"],
  },
  {
    code: "PN",
    age: "1–2 yrs",
    name: "Pre-Nursery",
    tag: "Foundations",
    desc: "First steps into structure — songs, movement, and simple routines that build independence.",
    points: ["Toilet-training support", "Music & movement daily", "First social play with peers"],
  },
  {
    code: "N1",
    age: "3 yrs",
    name: "Nursery 1",
    tag: "Nursery",
    desc: "Guided play meets early literacy — letters, numbers, and colours through hands-on activity.",
    points: ["Phonics introduction", "Fine motor skill building", "Show-and-tell & storytime"],
  },
  {
    code: "N2",
    age: "4 yrs",
    name: "Nursery 2",
    tag: "Nursery",
    desc: "School-readiness year — reading, writing, and number work that prepares for Primary 1.",
    points: ["Early reading & writing", "Number sense to 20", "Class routines mirroring Primary 1"],
  },
  {
    code: "P1",
    age: "5 yrs",
    name: "Primary 1",
    tag: "Primary — No Transition Shock",
    desc: "Same campus, same faces, familiar routines — just a new curriculum, not a new world.",
    points: ["Same trusted teaching team on campus", "Full literacy & numeracy curriculum", "Continuity report from Nursery 2 teacher"],
  },
  {
    code: "P2",
    age: "6 yrs",
    name: "Primary 2",
    tag: "Primary",
    desc: "Building fluency in reading, writing, and arithmetic, with the first structured project work.",
    points: ["Reading fluency focus", "Basic science & social studies", "First class projects"],
  },
  {
    code: "P3",
    age: "7 yrs",
    name: "Primary 3",
    tag: "Primary",
    desc: "Broader subjects, more independence, and the start of regular assessments.",
    points: ["Full subject curriculum", "Termly assessments begin", "Growing independent study habits"],
  },
  {
    code: "P4",
    age: "8 yrs",
    name: "Primary 4",
    tag: "Primary",
    desc: "Deeper subject content and exam preparation habits begin to take shape.",
    points: ["Subject specialization begins", "Study skills coaching", "Inter-class competitions"],
  },
  {
    code: "P5",
    age: "9 yrs",
    name: "Primary 5",
    tag: "Primary",
    desc: "Building toward common entrance readiness with structured revision and mock assessments.",
    points: ["Common entrance prep begins", "Structured revision timetable", "Leadership & prefect opportunities"],
  },
  {
    code: "P6",
    age: "10 yrs",
    name: "Primary 6",
    tag: "Primary — Graduation",
    desc: "Final polish, mock exams, and a proper send-off — nine years of one relationship, well finished.",
    points: ["Full exam preparation", "Secondary school placement support", "Graduation ceremony"],
  },
];

export type DayStep = { time: string; title: string; desc: string };
export type DaySchedule = { name: string; schedule: DayStep[] };

export const daySchedules: DaySchedule[] = [
  {
    name: "Nursery",
    schedule: [
      { time: "7:30", title: "Arrival & Free Play", desc: "Warm welcome at the gate, bags away, quiet free play as the class fills up." },
      { time: "8:15", title: "Circle Time", desc: "Songs, calendar, weather, and the day's theme — building routine and language." },
      { time: "9:00", title: "Learning Centres", desc: "Small-group literacy, numeracy, and sensory stations rotate every 20 minutes." },
      { time: "10:30", title: "Snack & Outdoor Play", desc: "Fresh air, climbing frames, and unstructured play — non-negotiable, every day." },
      { time: "11:15", title: "Story & Rest", desc: "A read-aloud story winds the class down before a supervised nap or quiet rest." },
      { time: "1:00", title: "Pickup Begins", desc: "Verified pickup starts, with a quick note home on how the day went." },
    ],
  },
  {
    name: "Primary",
    schedule: [
      { time: "7:45", title: "Assembly", desc: "Whole-school assembly — announcements, a short talk, and the day ahead." },
      { time: "8:15", title: "Core Subjects", desc: "English and Mathematics, taught in focused, uninterrupted blocks." },
      { time: "10:15", title: "Break", desc: "Snack, sport, and social time on the shared playground." },
      { time: "10:45", title: "Science & Social Studies", desc: "Hands-on lessons, often linked to a class project or experiment." },
      { time: "12:30", title: "Lunch", desc: "Supervised lunch, followed by quiet reading time." },
      { time: "1:30", title: "Electives & Clubs", desc: "Art, computing, or sport — then closing routines and dismissal." },
    ],
  },
];

export const safetyPoints = [
  { icon: "◉", title: "Full CCTV coverage", desc: "Every classroom, corridor, and gate — monitored throughout the school day." },
  { icon: "✓", title: "Vetted staff, always", desc: "Background checks, reference calls, and a probation term before any teacher leads a class." },
  { icon: "🔑", title: "Verified pickup only", desc: "Children are released only to guardians on a signed, photo-ID pickup list — no exceptions." },
  { icon: "☎", title: "Same-day communication", desc: "Incidents, however small, reach parents the same day — by phone and WhatsApp." },
];

export type Teacher = { name: string; role: string; color: string };

export const teachers: Teacher[] = [
  { name: "Mrs. Grace A.", role: "Head of Nursery, 8 yrs exp.", color: "#3F7D58" },
  { name: "Mr. Yusuf I.", role: "Primary 4 Class Teacher, 6 yrs exp.", color: "#C4522A" },
  { name: "Mrs. Chidinma O.", role: "Literacy Coordinator, 10 yrs exp.", color: "#F5A623" },
  { name: "Mr. Suleiman B.", role: "Head of Primary, 12 yrs exp.", color: "#16213E" },
];

export type GalleryCell = { label: string; tall?: boolean; gradient: string };

export const galleryCells: GalleryCell[] = [
  { label: "Classrooms", tall: true, gradient: "linear-gradient(135deg,#F5A623,#C4522A)" },
  { label: "Playground", gradient: "linear-gradient(135deg,#3F7D58,#16213E)" },
  { label: "Library Corner", gradient: "linear-gradient(135deg,#16213E,#3E4C72)" },
  { label: "Art Studio", gradient: "linear-gradient(135deg,#C4522A,#F5A623)" },
  { label: "Assembly Hall", gradient: "linear-gradient(135deg,#3E4C72,#F5A623)" },
  { label: "Nap Room", tall: true, gradient: "linear-gradient(135deg,#3F7D58,#F5A623)" },
];

export type Testimonial = { quote: string; name: string; area: string; initial: string };

export const testimonials: Testimonial[] = [
  { quote: "My daughter moved from Nursery 2 to Primary 1 without a single tear — same building, same faces she trusted already.", name: "Aisha B.", area: "Parent, Barnawa", initial: "A" },
  { quote: "I get a WhatsApp message the same day if anything happens. That alone is worth the switch from her old school.", name: "Emeka O.", area: "Parent, Malali", initial: "E" },
  { quote: "Two kids, one gate, one uniform, one calendar. It sounds small until you've lived the alternative.", name: "Fatima S.", area: "Parent, Sabon Tasha", initial: "F" },
];

export type BlogPost = {
  slug: string;
  category: string;
  title: string;
  excerpt: string;
  body: string[];
  gradient: string;
};

export const blogPosts: BlogPost[] = [
  {
    slug: "helping-a-shy-child-through-the-first-week",
    category: "Settling In",
    title: "Helping a shy child through the first week",
    excerpt: "Small routines that make drop-off easier for both of you.",
    body: [
      "The first week is harder on parents than it looks on children. A short, predictable goodbye — the same words, the same hug, every morning — helps far more than lingering.",
      "Arrive a few minutes early so your child isn't rushed into the room, and let a teacher greet them by name at the door. Familiar faces build confidence fast.",
      "Expect a rough day two or three before things settle. That dip is normal, not a sign something is wrong.",
    ],
    gradient: "linear-gradient(135deg,#F5A623,#C4522A)",
  },
  {
    slug: "what-school-readiness-really-means-at-4",
    category: "Learning",
    title: "What \"school readiness\" really means at 4",
    excerpt: "It's less about letters, more about these five habits.",
    body: [
      "Parents often worry about whether their child knows the alphabet before Primary 1. In practice, five habits matter more: following two-step instructions, sitting through a short story, sharing with peers, using the toilet independently, and expressing needs in words.",
      "Letters and numbers are taught well within the first term. The habits above are much harder to build quickly, which is why Nursery 2 focuses on them deliberately.",
    ],
    gradient: "linear-gradient(135deg,#3F7D58,#16213E)",
  },
  {
    slug: "reading-at-home-without-turning-it-into-homework",
    category: "Primary Years",
    title: "Reading at home without turning it into homework",
    excerpt: "Ten minutes a night, in a way kids actually enjoy.",
    body: [
      "The single best predictor of reading progress isn't a workbook — it's ten unhurried minutes a night where reading feels like a treat, not a task.",
      "Let your child pick the book, even if it's below their level or read for the fifth time. Familiarity builds fluency and confidence, which matters more than difficulty at this stage.",
    ],
    gradient: "linear-gradient(135deg,#C4522A,#FCE3B4)",
  },
];

export type EventItem = { day: string; month: string; title: string; desc: string; tag: string; color: string };

export const events: EventItem[] = [
  { day: "14", month: "SEP", title: "Term 1 Resumption", desc: "All students return · full uniform required.", tag: "All Stages", color: "#3F7D58" },
  { day: "03", month: "OCT", title: "Open Day for Prospective Parents", desc: "Campus tour, meet the teachers, Q&A session.", tag: "Admissions", color: "#C4522A" },
  { day: "21", month: "NOV", title: "Nursery Sports Day", desc: "Fun races and team games — parents welcome.", tag: "Nursery", color: "#F5A623" },
  { day: "09", month: "DEC", title: "Primary 6 Graduation", desc: "Closing ceremony for our graduating class.", tag: "Primary", color: "#16213E" },
];

export type FeeRow = { stage: string; age: string; amount: string };

// Sample termly figures in Naira — replace with confirmed fee schedule.
export const fees: FeeRow[] = [
  { stage: "Creche", age: "3–12 months", amount: "45,000" },
  { stage: "Pre-Nursery", age: "1–2 yrs", amount: "50,000" },
  { stage: "Nursery 1–2", age: "3–4 yrs", amount: "60,000" },
  { stage: "Primary 1–3", age: "5–7 yrs", amount: "75,000" },
  { stage: "Primary 4–6", age: "8–10 yrs", amount: "85,000" },
];

export const navLinks = [
  { href: "/journey", label: "The Journey" },
  { href: "/safety", label: "Safety" },
  { href: "/admissions", label: "Admissions" },
  { href: "/events", label: "Events" },
  { href: "/blog", label: "Blog" },
  { href: "/contact", label: "Contact" },
];
