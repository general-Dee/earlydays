import { getApps, initializeApp, type FirebaseOptions } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Lazy on purpose: Next.js executes client component modules while
// prerendering static pages at build time, and getAuth() throws
// immediately on a missing/invalid API key. Deferring init to first
// actual use (inside a useEffect or event handler, never during
// render/prerender) keeps static pages buildable without real
// Firebase credentials.
function getFirebaseApp() {
  return getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
}

let cachedAuth: Auth | null = null;
let cachedDb: Firestore | null = null;

export function getFirebaseAuth(): Auth {
  if (!cachedAuth) cachedAuth = getAuth(getFirebaseApp());
  return cachedAuth;
}

export function getFirebaseDb(): Firestore {
  if (!cachedDb) cachedDb = getFirestore(getFirebaseApp());
  return cachedDb;
}
