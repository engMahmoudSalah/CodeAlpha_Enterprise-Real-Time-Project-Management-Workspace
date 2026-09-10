import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  signOut,
  updateProfile,
  updatePassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  onAuthStateChanged,
  type User as FirebaseUser,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDocFromServer,
  type Firestore,
} from 'firebase/firestore';
import fileConfig from '../firebase-applet-config.json';

export const firebaseConfig = {
  projectId: fileConfig.projectId || 'voltaic-condition-mj1d7',
  appId: fileConfig.appId || '',
  apiKey: fileConfig.apiKey || '',
  authDomain: fileConfig.authDomain || `${fileConfig.projectId || 'voltaic-condition-mj1d7'}.firebaseapp.com`,
  firestoreDatabaseId: fileConfig.firestoreDatabaseId || '',
  storageBucket: fileConfig.storageBucket || '',
  messagingSenderId: fileConfig.messagingSenderId || '',
  measurementId: fileConfig.measurementId || '',
};

export const isFirebaseConfigured: boolean = Boolean(
  firebaseConfig.apiKey &&
  !firebaseConfig.apiKey.includes('your-') &&
  !firebaseConfig.apiKey.includes('Placeholder') &&
  firebaseConfig.apiKey.startsWith('AIza') &&
  firebaseConfig.apiKey.length > 20
);

// Initialize Firebase App singleton safely with fallback configuration
const app = getApps().length > 0
  ? getApp()
  : initializeApp({
      projectId: firebaseConfig.projectId || 'voltaic-condition-mj1d7',
      appId: firebaseConfig.appId || '1:563460478547:web:localFallbackAppId',
      apiKey: firebaseConfig.apiKey || 'AIzaSyFallbackKeyForSafeBuild00000',
      authDomain: firebaseConfig.authDomain || 'voltaic-condition-mj1d7.firebaseapp.com',
      storageBucket: firebaseConfig.storageBucket || '',
      messagingSenderId: firebaseConfig.messagingSenderId || '563460478547',
    });

// Initialize Firebase Authentication & Google Provider
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('profile');
googleProvider.addScope('email');
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Initialize Firestore with custom databaseId if configured
export const db: Firestore = (firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)')
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// Verify live Firestore connection
if (isFirebaseConfigured) {
  getDocFromServer(doc(db, 'test', 'connection')).catch((error) => {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore offline notice: please verify network or Firebase setup.');
    }
  });
}

export {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  signOut,
  updateProfile,
  updatePassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  onAuthStateChanged,
  type FirebaseUser,
};

export default app;
