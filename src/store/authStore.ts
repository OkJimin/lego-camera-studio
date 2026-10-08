import { create } from "zustand";
import type { User } from "firebase/auth";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut,
} from "firebase/auth";
import { auth } from "../lib/firebase";

interface AuthState {
  user: User | null;
  isLoading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
}

// Phone browsers often block the sign-in popup, so touch devices use a full-page
// redirect instead. Desktop keeps the popup so the unsaved scene isn't reloaded away.
function isTouchPrimary(): boolean {
  return window.matchMedia("(pointer: coarse)").matches;
}

export const useAuthStore = create<AuthState>(() => ({
  user: null,
  isLoading: true,
  signInWithGoogle: async () => {
    const provider = new GoogleAuthProvider();
    if (isTouchPrimary()) {
      await signInWithRedirect(auth, provider);
      return;
    }
    await signInWithPopup(auth, provider);
  },
  signOutUser: async () => {
    await signOut(auth);
  },
}));

onAuthStateChanged(auth, (user) => {
  useAuthStore.setState({ user, isLoading: false });
});
