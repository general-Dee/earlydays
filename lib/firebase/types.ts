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
