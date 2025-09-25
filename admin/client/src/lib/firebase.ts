import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";
import type { User } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  // IMPORTANT: Web uploads must use the appspot.com bucket domain
  storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.appspot.com`,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export const signInAdmin = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    // Verify admin privileges using custom claims
    // Force refresh to ensure we read the latest custom claims
    const idTokenResult = await userCredential.user.getIdTokenResult(true);
    if (!idTokenResult.claims.admin) {
      await signOut(auth);
      throw new Error("Access denied. Admin privileges required.");
    }
    return userCredential.user;
  } catch (error) {
    throw error;
  }
};

export const signOutAdmin = () => signOut(auth);

export const onAuthStateChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

export const getCurrentUser = () => auth.currentUser;

export const getIdToken = async () => {
  const user = getCurrentUser();
  if (!user) throw new Error("No authenticated user");
  return await user.getIdToken();
};

export const uploadStorage = storage;
