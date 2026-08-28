import type { NextRequest } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";

export function getClientIp(req: NextRequest): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  return forwardedFor?.split(",")[0]?.trim() || "unknown";
}

type Bucket = { count: number; resetAt: number };

// Firestore-backed so limits are enforced across every serverless instance,
// not just whichever one happens to handle a given request (Vercel functions
// don't share memory). A transaction avoids two racing requests both
// squeaking past the limit. Buckets never expire on their own — set a TTL
// policy on this collection's `resetAt` field in the Firebase Console.
export async function checkRateLimit(key: string, options: { max: number; windowMs: number }): Promise<boolean> {
  const db = getAdminDb();
  const docRef = db.collection(COLLECTIONS.rateLimits).doc(key);
  const now = Date.now();

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(docRef);
    const bucket = snap.exists ? (snap.data() as Bucket) : null;

    if (!bucket || bucket.resetAt <= now) {
      tx.set(docRef, { count: 1, resetAt: now + options.windowMs });
      return true;
    }

    if (bucket.count >= options.max) {
      return false;
    }

    tx.update(docRef, { count: bucket.count + 1 });
    return true;
  });
}
