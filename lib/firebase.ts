import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  initializeAuth,
  getReactNativePersistence,
  Auth
} from 'firebase/auth';
import {
  getFirestore,
  Firestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '',
};

console.log('[Firebase] Initializing with project:', firebaseConfig.projectId ? 'configured' : 'MISSING');

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.authDomain &&
  firebaseConfig.projectId &&
  firebaseConfig.appId
);

if (!isFirebaseConfigured) {
  console.warn('[Firebase] Missing credentials - auth will not work. Demo mode available.');
}

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

// Only initialize Firebase if credentials are configured
if (isFirebaseConfigured) {
  try {
    if (getApps().length === 0) {
      app = initializeApp(firebaseConfig);

      if (Platform.OS === 'web') {
        auth = getAuth(app);
      } else {
        auth = initializeAuth(app, {
          persistence: getReactNativePersistence(AsyncStorage),
        });
      }
      db = getFirestore(app);
    } else {
      app = getApps()[0];
      // Use getAuth for existing app (initializeAuth was already called)
      auth = getAuth(app);
      db = getFirestore(app);
    }
    console.log('[Firebase] Initialized successfully');
  } catch (error) {
    console.error('[Firebase] Initialization error:', error);
  }
}

export { app, auth, db };

// Firestore helper functions
export const firestoreHelpers = {
  // User financial data
  async saveUserFinancials(userId: string, financials: Record<string, unknown>) {
    if (!isFirebaseConfigured || !db) return null;
    const ref = doc(db, 'users', userId, 'data', 'financials');
    await setDoc(ref, { ...financials, updatedAt: serverTimestamp() }, { merge: true });
    return true;
  },

  async getUserFinancials(userId: string) {
    if (!isFirebaseConfigured || !db) return null;
    const ref = doc(db, 'users', userId, 'data', 'financials');
    const snap = await getDoc(ref);
    return snap.exists() ? snap.data() : null;
  },

  // Learning progress
  async saveLearningProgress(userId: string, completedCards: string[]) {
    if (!isFirebaseConfigured || !db) return null;
    const ref = doc(db, 'users', userId, 'data', 'learning');
    await setDoc(ref, { completedCards, updatedAt: serverTimestamp() }, { merge: true });
    return true;
  },

  async getLearningProgress(userId: string) {
    if (!isFirebaseConfigured || !db) return null;
    const ref = doc(db, 'users', userId, 'data', 'learning');
    const snap = await getDoc(ref);
    return snap.exists() ? snap.data() : null;
  },

  // Goals
  async saveUserGoals(userId: string, goals: Record<string, unknown>[]) {
    if (!isFirebaseConfigured || !db) return null;
    const ref = doc(db, 'users', userId, 'data', 'goals');
    await setDoc(ref, { goals, updatedAt: serverTimestamp() }, { merge: true });
    return true;
  },

  async getUserGoals(userId: string) {
    if (!isFirebaseConfigured || !db) return null;
    const ref = doc(db, 'users', userId, 'data', 'goals');
    const snap = await getDoc(ref);
    return snap.exists() ? snap.data() : null;
  },

  // Coach messages
  async saveCoachMessages(userId: string, messages: Record<string, unknown>[]) {
    if (!isFirebaseConfigured || !db) return null;
    const ref = doc(db, 'users', userId, 'data', 'coach');
    await setDoc(ref, { messages, updatedAt: serverTimestamp() }, { merge: true });
    return true;
  },

  async getCoachMessages(userId: string) {
    if (!isFirebaseConfigured || !db) return null;
    const ref = doc(db, 'users', userId, 'data', 'coach');
    const snap = await getDoc(ref);
    return snap.exists() ? snap.data() : null;
  },
};
