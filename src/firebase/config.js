import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBryVh7p7WbkV0HKQP3IskTEm79gda5OzU",
  authDomain: "xtreme-equipos.firebaseapp.com",
  projectId: "xtreme-equipos",
  storageBucket: "xtreme-equipos.firebasestorage.app",
  messagingSenderId: "910635189742",
  appId: "1:910635189742:web:c72ef43245b98a6b22faff",
  measurementId: "G-6V17CX680L"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
