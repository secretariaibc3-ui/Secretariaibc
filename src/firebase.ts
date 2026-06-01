import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export { firebaseConfig };
let db;
try {
  db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
} catch (error) {
  console.error("Firestore initialization with specific ID failed, falling back to default.", error);
  db = getFirestore(app);
}

export { db };
export const auth = getAuth(app);
export const storage = getStorage(app);
