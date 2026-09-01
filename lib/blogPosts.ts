import { getAdminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import type { BlogPost } from "@/lib/firebase/types";

// Same three sample posts the site shipped with before blog posts became
// admin-editable. Used as a fallback so public blog pages still render
// something reasonable at build time without real Firebase credentials
// (see FeesTable's identical fallback, added for the same reason in
// commit 74aae4b), and so the site doesn't go blank the moment this
// feature ships, before an admin has added any real posts.
export function defaultBlogPosts(): BlogPost[] {
  return [
    {
      id: "helping-a-shy-child-through-the-first-week",
      slug: "helping-a-shy-child-through-the-first-week",
      category: "Settling In",
      title: "Helping a shy child through the first week",
      excerpt: "Small routines that make drop-off easier for both of you.",
      body: [
        "The first week is harder on parents than it looks on children. A short, predictable goodbye — the same words, the same hug, every morning — helps far more than lingering.",
        "Arrive a few minutes early so your child isn't rushed into the room, and let a teacher greet them by name at the door. Familiar faces build confidence fast.",
        "Expect a rough day two or three before things settle. That dip is normal, not a sign something is wrong.",
      ],
      gradient: "linear-gradient(135deg,#232532,#292b31)",
      order: 0,
      createdBy: "seed",
      createdAt: 0,
    },
    {
      id: "what-school-readiness-really-means-at-4",
      slug: "what-school-readiness-really-means-at-4",
      category: "Learning",
      title: 'What "school readiness" really means at 4',
      excerpt: "It's less about letters, more about these five habits.",
      body: [
        "Parents often worry about whether their child knows the alphabet before Primary 1. In practice, five habits matter more: following two-step instructions, sitting through a short story, sharing with peers, using the toilet independently, and expressing needs in words.",
        "Letters and numbers are taught well within the first term. The habits above are much harder to build quickly, which is why Nursery 2 focuses on them deliberately.",
      ],
      gradient: "linear-gradient(135deg,#232532,#292b31)",
      order: 1,
      createdBy: "seed",
      createdAt: 0,
    },
    {
      id: "reading-at-home-without-turning-it-into-homework",
      slug: "reading-at-home-without-turning-it-into-homework",
      category: "Primary Years",
      title: "Reading at home without turning it into homework",
      excerpt: "Ten minutes a night, in a way kids actually enjoy.",
      body: [
        "The single best predictor of reading progress isn't a workbook — it's ten unhurried minutes a night where reading feels like a treat, not a task.",
        "Let your child pick the book, even if it's below their level or read for the fifth time. Familiarity builds fluency and confidence, which matters more than difficulty at this stage.",
      ],
      gradient: "linear-gradient(135deg,#232532,#292b31)",
      order: 2,
      createdBy: "seed",
      createdAt: 0,
    },
  ];
}

// Unlike the payment/cron/admin paths, public marketing pages should
// degrade to the sample posts rather than fail to render if Firestore is
// briefly unreachable (or, at build time, has no real credentials yet) —
// same reasoning as FeesTable. Once an admin adds a real post through
// /admin/blog, the live collection takes over from the sample posts.
export async function getBlogPosts(): Promise<BlogPost[]> {
  try {
    const snapshot = await getAdminDb().collection(COLLECTIONS.blog).orderBy("order", "asc").get();
    if (snapshot.empty) return defaultBlogPosts();
    return snapshot.docs.map((doc) => doc.data() as BlogPost);
  } catch (err) {
    console.error("getBlogPosts: failed to load live blog posts, showing defaults", err);
    return defaultBlogPosts();
  }
}
