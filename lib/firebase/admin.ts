import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

// Lazy on purpose: Next.js loads route modules at build time to collect
// page data, and eagerly calling cert() there would crash the build on
// placeholder/missing credentials. Initializing on first request-time use
// keeps the build independent of runtime secrets.
function getAdminApp() {
  if (getApps().length) return getApps()[0];

  return initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });
}

let cachedAuth: Auth | null = null;
let cachedDb: Firestore | null = null;
let cachedBucket: ReturnType<ReturnType<typeof getStorage>["bucket"]> | null = null;

export function getAdminAuth(): Auth {
  if (!cachedAuth) cachedAuth = getAuth(getAdminApp());
  return cachedAuth;
}

export function getAdminDb(): Firestore {
  if (!cachedDb) cachedDb = getFirestore(getAdminApp());
  return cachedDb;
}

export function getAdminBucket() {
  if (!cachedBucket) cachedBucket = getStorage(getAdminApp()).bucket();
  return cachedBucket;
}
