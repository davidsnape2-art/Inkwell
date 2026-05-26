import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInAnonymously } from "firebase/auth";
import { getFirestore, doc, getDocFromServer } from "firebase/firestore";
const firebaseConfig = {
  apiKey: "",
  authDomain: "",
  projectId: "test-project-id",
  storageBucket: "",
  messagingSenderId: "",
  appId: "",
  firestoreDatabaseId: "(default)"
};

// Detect if Firebase configuration is using placeholders
export const isOfflineMode = !firebaseConfig.apiKey || 
  firebaseConfig.apiKey.includes("placeholder") || 
  firebaseConfig.projectId === "test-project-id";

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

export const googleProvider = new GoogleAuthProvider();

export async function signIn() {
  sessionStorage.removeItem("inkwell_explicit_sign_out");
  if (isOfflineMode) {
    const guestUser = {
      uid: "local_scribe_guest",
      displayName: "Local Scribe",
      isAnonymous: true,
    };
    localStorage.setItem("inkwell_guest_user", JSON.stringify(guestUser));
    window.dispatchEvent(new Event("storage_auth_changed"));
    return guestUser;
  }

  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    console.warn("Google sign-in popup blocked or failed in frame. Seamlessly provisioning fallback anonymous editor workspace.", error);
    try {
      const result = await signInAnonymously(auth);
      return result.user;
    } catch (anonError) {
      console.error("Anonymous authentication fallback failed:", anonError);
      throw anonError;
    }
  }
}

export async function signOut() {
  sessionStorage.setItem("inkwell_explicit_sign_out", "true");
  if (isOfflineMode) {
    localStorage.removeItem("inkwell_guest_user");
    window.dispatchEvent(new Event("storage_auth_changed"));
    return;
  }
  return auth.signOut();
}

export async function signInGuest() {
  sessionStorage.removeItem("inkwell_explicit_sign_out");
  if (isOfflineMode) {
    const guestUser = {
      uid: "local_scribe_guest",
      displayName: "Local Scribe",
      isAnonymous: true,
    };
    localStorage.setItem("inkwell_guest_user", JSON.stringify(guestUser));
    window.dispatchEvent(new Event("storage_auth_changed"));
    return guestUser;
  }

  try {
    const result = await signInAnonymously(auth);
    return result.user;
  } catch (error) {
    console.error("Guest Auth Error:", error);
    throw error;
  }
}

async function testConnection() {
  if (isOfflineMode) return;
  try {
    await getDocFromServer(doc(db, "test", "connection"));
  } catch (error) {
    if (error instanceof Error && error.message.includes("the client is offline")) {
      console.error("Please check your Firebase configuration.");
    }
  }
}

testConnection();

