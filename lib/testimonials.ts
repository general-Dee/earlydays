import { getAdminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import type { Testimonial } from "@/lib/firebase/types";

// Same three sample quotes the site shipped with before testimonials
// became admin-editable. Used as a fallback so the homepage still renders
// something reasonable at build time without real Firebase credentials
// (see FeesTable/blogPosts' identical fallback, added for the same reason
// in commit 74aae4b), and so the site doesn't go blank the moment this
// feature ships, before an admin has added any real testimonials.
export function defaultTestimonials(): Testimonial[] {
  return [
    {
      id: "aisha-b",
      quote:
        "My daughter moved from Nursery 2 to Primary 1 without a single tear — same building, same faces she trusted already.",
      name: "Aisha B.",
      area: "Parent, Barnawa",
      initial: "A",
      order: 0,
      createdBy: "seed",
      createdAt: 0,
    },
    {
      id: "emeka-o",
      quote:
        "I get a WhatsApp message the same day if anything happens. That alone is worth the switch from her old school.",
      name: "Emeka O.",
      area: "Parent, Malali",
      initial: "E",
      order: 1,
      createdBy: "seed",
      createdAt: 0,
    },
    {
      id: "fatima-s",
      quote:
        "Two kids, one gate, one uniform, one calendar. It sounds small until you've lived the alternative.",
      name: "Fatima S.",
      area: "Parent, Sabon Tasha",
      initial: "F",
      order: 2,
      createdBy: "seed",
      createdAt: 0,
    },
  ];
}

// Unlike the payment/cron/admin paths, the public homepage should degrade
// to the sample quotes rather than fail to render if Firestore is briefly
// unreachable (or, at build time, has no real credentials yet) — same
// reasoning as FeesTable/blogPosts. Once an admin adds a real testimonial
// through /admin/testimonials, the live collection takes over.
export async function getTestimonials(): Promise<Testimonial[]> {
  try {
    const snapshot = await getAdminDb().collection(COLLECTIONS.testimonials).orderBy("order", "asc").get();
    if (snapshot.empty) return defaultTestimonials();
    return snapshot.docs.map((doc) => doc.data() as Testimonial);
  } catch (err) {
    console.error("getTestimonials: failed to load live testimonials, showing defaults", err);
    return defaultTestimonials();
  }
}
