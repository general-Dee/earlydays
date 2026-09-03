export type AdminArea =
  | "announcements"
  | "applications"
  | "inquiries"
  | "parents"
  | "events"
  | "reports"
  | "dashboard"
  | "payments"
  | "staff"
  | "blog"
  | "gallery"
  | "testimonials";

// Single source of truth for the runtime list of areas — mirrors the
// `AdminArea` union above. Consumed by the admin-access API's validation and
// by the admin-access UI's area picker, so the list is never hand-duplicated.
export const ADMIN_AREAS: readonly AdminArea[] = [
  "announcements",
  "applications",
  "inquiries",
  "parents",
  "events",
  "reports",
  "dashboard",
  "payments",
  "staff",
  "blog",
  "gallery",
  "testimonials",
];

// Source of truth for who can manage which admin areas. Looked up by uid in
// `lib/firebase/admin-auth.ts`; `ADMIN_EMAILS`/`ADMIN_EMAILS_<AREA>` env vars
// remain a bootstrap/break-glass fallback for accounts with no doc here yet.
// `disabled` is never stored here — same convention as `Parent.disabled`
// below: it lives only on the Firebase Auth user record, merged in on read.
export type AdminUser = {
  uid: string;
  email: string;
  displayName: string;
  // Superadmin status alone grants management of other admins — no area needed.
  isSuperAdmin: boolean;
  areas: AdminArea[];
  createdAt: number;
  createdBy: string;
  updatedAt?: number;
  updatedBy?: string;
  disabled?: boolean;
};

export type AuditLogEntry = {
  id: string;
  action: string;
  actorEmail: string;
  targetUid?: string;
  targetEmail?: string;
  detail?: string;
  createdAt: number;
};

export type ChildRecord = {
  id: string;
  name: string;
  stage: string;
  admissionNo?: string;
};

export type Parent = {
  uid: string;
  guardianName: string;
  email: string;
  phone?: string;
  children: ChildRecord[];
  createdAt: number;
  // Live Firebase Auth account status — only ever populated by GET
  // /api/admin/parents; never stored in Firestore or present on
  // client-side portal reads.
  disabled?: boolean;
};

export type PaymentStatus = "pending" | "success" | "failed";

export type PaymentRecord = {
  reference: string;
  childId: string;
  childName: string;
  term: string;
  amountKobo: number;
  status: PaymentStatus;
  createdAt: number;
  paidAt?: number;
  channel?: string;
};

export type InquiryStatus = "new" | "contacted" | "resolved";

export type Inquiry = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  message: string;
  status: InquiryStatus;
  createdAt: number;
};

export type ApplicationStatus = "new" | "reviewing" | "accepted" | "waitlisted" | "declined";

export type Application = {
  id: string;
  childName: string;
  childDob: string;
  desiredStage: string;
  guardianName: string;
  email: string | null;
  phone: string | null;
  notes: string;
  status: ApplicationStatus;
  referenceCode: string;
  createdAt: number;
};

export type Announcement = {
  id: string;
  title: string;
  body: string;
  createdBy: string;
  createdAt: number;
};

export type CalendarEvent = {
  id: string;
  title: string;
  date: string;
  tag: string;
  desc: string;
  createdBy: string;
  createdAt: number;
};

export type ProgressReport = {
  id: string;
  childId: string;
  childName: string;
  term: string;
  fileName: string;
  storagePath: string;
  uploadedBy: string;
  createdAt: number;
};

export type Staff = {
  id: string;
  name: string;
  role: string;
  bio: string;
  photoUrl?: string;
  // Needed to delete/replace the file when a new photo is uploaded.
  photoStoragePath?: string;
  order: number;
  createdBy: string;
  createdAt: number;
  updatedAt?: number;
};

export type GalleryPhoto = {
  id: string;
  alt: string;
  category: "Campus & Grounds" | "Classrooms" | "Play & Discovery";
  tall?: boolean;
  photoUrl: string;
  // Needed to delete the file when the record itself is deleted.
  photoStoragePath: string;
  order: number;
  createdBy: string;
  createdAt: number;
  updatedAt?: number;
};

export type Testimonial = {
  id: string;
  quote: string;
  name: string;
  area: string;
  initial: string;
  order: number;
  createdBy: string;
  createdAt: number;
  updatedAt?: number;
};

export type BlogPost = {
  id: string;
  slug: string;
  category: string;
  title: string;
  excerpt: string;
  body: string[];
  // Fallback cover treatment shown when no cover photo has been uploaded.
  gradient: string;
  coverPhotoUrl?: string;
  // Needed to delete/replace the file when a new cover photo is uploaded.
  coverPhotoStoragePath?: string;
  order: number;
  createdBy: string;
  createdAt: number;
  updatedAt?: number;
};
