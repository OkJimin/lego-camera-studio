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

// Turns a Firebase sign-in failure into something actionable instead of a bare
// "login failed" — the usual causes are all configuration, not user error.
export function describeAuthError(err: unknown): string {
  const code = (err as { code?: string } | null)?.code ?? "";
  console.error("Google sign-in failed:", err);
  switch (code) {
    case "auth/unauthorized-domain":
      return `이 주소(${window.location.hostname})가 Firebase 승인된 도메인에 없어요. 콘솔 → Authentication → 설정 → 승인된 도메인에 추가해주세요`;
    case "auth/popup-blocked":
      return "브라우저가 로그인 팝업을 막았어요. 이 사이트의 팝업을 허용해주세요";
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "로그인 창이 닫혔어요. 다시 시도해주세요";
    case "auth/operation-not-allowed":
      return "Firebase에서 Google 로그인이 꺼져 있어요 (Authentication → 로그인 방법)";
    case "auth/network-request-failed":
      return "네트워크 오류예요. 연결을 확인해주세요";
    default:
      return code ? `로그인에 실패했어요 (${code})` : "로그인에 실패했어요. 다시 시도해주세요";
  }
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
