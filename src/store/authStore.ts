import { create } from "zustand";
import type { User } from "firebase/auth";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { auth } from "../lib/firebase";

interface AuthState {
  user: User | null;
  isLoading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>(() => ({
  user: null,
  isLoading: true,
  signInWithGoogle: async () => {
    await signInWithPopup(auth, new GoogleAuthProvider());
  },
  signOutUser: async () => {
    await signOut(auth);
  },
}));

onAuthStateChanged(auth, (user) => {
  useAuthStore.setState({ user, isLoading: false });
});
