import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInAnonymously
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyB88HYSVptz1BQkMmZQJICz2svOSF55juk",
  authDomain: "room-expense-tracker-35ada.firebaseapp.com",
  projectId: "room-expense-tracker-35ada",
  storageBucket: "room-expense-tracker-35ada.firebasestorage.app",
  messagingSenderId: "340453502991",
  appId: "1:340453502991:web:72123bae6cc3006a5a337a",
};

const configured = true;

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export {
  configured,
  auth,
  db,
  signInAnonymously
};