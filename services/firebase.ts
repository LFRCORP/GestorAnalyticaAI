
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBlrmjHmATdS7R65fgFIcGFkBtkxkE5Qvw",
  authDomain: "gestor-analytica-ai.firebaseapp.com",
  projectId: "gestor-analytica-ai",
  storageBucket: "gestor-analytica-ai.firebasestorage.app",
  messagingSenderId: "475971419656",
  appId: "1:475971419656:web:bd9fdac8f5cf9594a0dbbd",
  measurementId: "G-QTD9MP2L8Z"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

const provider = new GoogleAuthProvider();

export const signInWithGoogle = () => {
    return signInWithPopup(auth, provider);
};

export const signOutUser = () => {
    return signOut(auth);
};

export { auth, db, storage };
