import { getAdminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import type { Faq } from "@/lib/firebase/types";

// Same reasoning as defaultTestimonials()/getTestimonials() — the public
// FAQ page should degrade to these starter questions rather than render
// empty if Firestore is briefly unreachable, or before an admin has added
// any real FAQs through /admin/faqs.
export function defaultFaqs(): Faq[] {
  return [
    {
      id: "ages-stages",
      question: "What ages and stages do you take children through?",
      answer:
        "Creche from 3-12 months through Primary 6 (around age 10) — nine years on one campus, with the same trusted teaching team from Nursery through Primary 1.",
      order: 0,
      createdBy: "seed",
      createdAt: 0,
    },
    {
      id: "fees",
      question: "How are fees structured, and how do I pay?",
      answer:
        "Fees are set per stage bracket (Creche, Pre-Nursery, Nursery, Primary Junior, Primary Senior) and billed each term. Parents pay online through the parent portal via Paystack, and can view receipts and payment history there.",
      order: 1,
      createdBy: "seed",
      createdAt: 0,
    },
    {
      id: "safety",
      question: "What safety measures are in place?",
      answer:
        "Full CCTV coverage across every classroom, corridor, and gate; vetted staff with background checks and a probation term; verified pickup only, against a signed photo-ID list; and same-day communication to parents for any incident, however small.",
      order: 2,
      createdBy: "seed",
      createdAt: 0,
    },
    {
      id: "daily-schedule",
      question: "What does a typical day look like?",
      answer:
        "Nursery days run from arrival and free play at 7:30 through circle time, learning centres, outdoor play, story time, and rest, with pickup from 1:00. Primary days start with assembly at 7:45, followed by core subjects, break, science and social studies, lunch, and electives or clubs in the afternoon.",
      order: 3,
      createdBy: "seed",
      createdAt: 0,
    },
    {
      id: "how-to-enroll",
      question: "How do I enroll my child?",
      answer:
        "Book a visit to tour the campus and meet the team on WhatsApp, then submit an application through the Admissions page. We handle placement, fees, and paperwork from there.",
      order: 4,
      createdBy: "seed",
      createdAt: 0,
    },
  ];
}

export async function getFaqs(): Promise<Faq[]> {
  try {
    const snapshot = await getAdminDb().collection(COLLECTIONS.faqs).orderBy("order", "asc").get();
    if (snapshot.empty) return defaultFaqs();
    return snapshot.docs.map((doc) => doc.data() as Faq);
  } catch (err) {
    console.error("getFaqs: failed to load live FAQs, showing defaults", err);
    return defaultFaqs();
  }
}
