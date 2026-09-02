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
  url: "https://earlydays.example", // TODO: replace with the real domain
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

export const TERMS = ["Term 1", "Term 2", "Term 3"];

export type HowItWorksStep = { number: string; title: string; desc: string };

export const howItWorksSteps: HowItWorksStep[] = [
  { number: "01", title: "Book a visit", desc: "Tour the campus and meet the team on WhatsApp — it takes one message." },
  { number: "02", title: "Enroll your child", desc: "Pick the stage. We handle placement, fees, and the paperwork." },
  { number: "03", title: "Watch them grow, uninterrupted", desc: "From Creche to Primary 6 — same campus, same trusted teachers, same relationship with your family." },
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
  { icon: "video-camera", title: "Full CCTV coverage", desc: "Every classroom, corridor, and gate — monitored throughout the school day." },
  { icon: "check-circle", title: "Vetted staff, always", desc: "Background checks, reference calls, and a probation term before any teacher leads a class." },
  { icon: "key", title: "Verified pickup only", desc: "Children are released only to guardians on a signed, photo-ID pickup list — no exceptions." },
  { icon: "phone-call", title: "Same-day communication", desc: "Incidents, however small, reach parents the same day — by phone and WhatsApp." },
];

export type Testimonial = { id: string; quote: string; name: string; area: string; initial: string };

export const testimonials: Testimonial[] = [
  { id: "aisha-b", quote: "My daughter moved from Nursery 2 to Primary 1 without a single tear — same building, same faces she trusted already.", name: "Aisha B.", area: "Parent, Barnawa", initial: "A" },
  { id: "emeka-o", quote: "I get a WhatsApp message the same day if anything happens. That alone is worth the switch from her old school.", name: "Emeka O.", area: "Parent, Malali", initial: "E" },
  { id: "fatima-s", quote: "Two kids, one gate, one uniform, one calendar. It sounds small until you've lived the alternative.", name: "Fatima S.", area: "Parent, Sabon Tasha", initial: "F" },
];

export const navLinks = [
  { href: "/journey", label: "The Journey" },
  { href: "/safety", label: "Safety" },
  { href: "/gallery", label: "Gallery" },
  { href: "/admissions", label: "Admissions" },
  { href: "/events", label: "Events" },
  { href: "/blog", label: "Blog" },
  { href: "/contact", label: "Contact" },
  { href: "/portal", label: "Portal" },
];
