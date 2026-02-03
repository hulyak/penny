import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  initializeAuth,
  Auth,
  // @ts-ignore - getReactNativePersistence may not be typed correctly
  getReactNativePersistence,
} from 'firebase/auth';
import {
  getFirestore,
  Firestore,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import type { Holding, Transaction, PriceAlert, PortfolioSettings } from '@/types';
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

  // Portfolio Settings
  async savePortfolioSettings(userId: string, settings: Partial<PortfolioSettings>) {
    if (!isFirebaseConfigured || !db) return null;
    const ref = doc(db, 'users', userId, 'portfolio', 'settings');
    await setDoc(ref, { ...settings, updatedAt: serverTimestamp() }, { merge: true });
    return true;
  },

  async getPortfolioSettings(userId: string): Promise<PortfolioSettings | null> {
    if (!isFirebaseConfigured || !db) return null;
    const ref = doc(db, 'users', userId, 'portfolio', 'settings');
    const snap = await getDoc(ref);
    return snap.exists() ? (snap.data() as PortfolioSettings) : null;
  },

  // Holdings
  async saveHolding(userId: string, holding: Holding) {
    if (!isFirebaseConfigured || !db) return null;
    const ref = doc(db, 'users', userId, 'portfolio', 'holdings', 'items', holding.id);
    await setDoc(ref, { ...holding, updatedAt: serverTimestamp() }, { merge: true });
    return true;
  },

  async getHoldings(userId: string): Promise<Holding[]> {
    if (!isFirebaseConfigured || !db) return [];
    const ref = collection(db, 'users', userId, 'portfolio', 'holdings', 'items');
    const q = query(ref, orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as Holding);
  },

  async getHolding(userId: string, holdingId: string): Promise<Holding | null> {
    if (!isFirebaseConfigured || !db) return null;
    const ref = doc(db, 'users', userId, 'portfolio', 'holdings', 'items', holdingId);
    const snap = await getDoc(ref);
    return snap.exists() ? (snap.data() as Holding) : null;
  },

  async deleteHolding(userId: string, holdingId: string) {
    if (!isFirebaseConfigured || !db) return null;
    const ref = doc(db, 'users', userId, 'portfolio', 'holdings', 'items', holdingId);
    await deleteDoc(ref);
    return true;
  },

  // Transactions
  async saveTransaction(userId: string, transaction: Transaction) {
    if (!isFirebaseConfigured || !db) return null;
    const ref = doc(db, 'users', userId, 'portfolio', 'transactions', 'items', transaction.id);
    await setDoc(ref, { ...transaction, createdAt: serverTimestamp() });
    return true;
  },

  async getTransactions(userId: string, holdingId?: string): Promise<Transaction[]> {
    if (!isFirebaseConfigured || !db) return [];
    const ref = collection(db, 'users', userId, 'portfolio', 'transactions', 'items');
    const q = query(ref, orderBy('date', 'desc'));
    const snap = await getDocs(q);
    const transactions = snap.docs.map(d => d.data() as Transaction);
    if (holdingId) {
      return transactions.filter(t => t.holdingId === holdingId);
    }
    return transactions;
  },

  // Alerts
  async saveAlert(userId: string, alert: PriceAlert) {
    if (!isFirebaseConfigured || !db) return null;
    const ref = doc(db, 'users', userId, 'portfolio', 'alerts', 'items', alert.id);
    await setDoc(ref, { ...alert }, { merge: true });
    return true;
  },

  async getAlerts(userId: string): Promise<PriceAlert[]> {
    if (!isFirebaseConfigured || !db) return [];
    const ref = collection(db, 'users', userId, 'portfolio', 'alerts', 'items');
    const snap = await getDocs(ref);
    return snap.docs.map(d => d.data() as PriceAlert);
  },

  async deleteAlert(userId: string, alertId: string) {
    if (!isFirebaseConfigured || !db) return null;
    const ref = doc(db, 'users', userId, 'portfolio', 'alerts', 'items', alertId);
    await deleteDoc(ref);
    return true;
  },
};
