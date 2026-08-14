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

export type Announcement = {
  id: string;
  title: string;
  body: string;
  createdBy: string;
  createdAt: number;
};
