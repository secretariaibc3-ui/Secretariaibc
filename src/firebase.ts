import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
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

// Enable offline persistence for Progressive Web App capability
if (typeof window !== 'undefined') {
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn("Firestore offline persistence failed: multiple tabs open.");
    } else if (err.code === 'unimplemented') {
      console.warn("Firestore offline persistence is not supported by this browser.");
    }
  });
}

export { db };
export const auth = getAuth(app);
export const storage = getStorage(app);
