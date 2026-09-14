import { useAuthStore } from "../store/authStore";

export function LoginButton() {
  const { user, isLoading, signInWithGoogle, signOutUser } = useAuthStore();

  if (isLoading) return <span>로그인 확인 중...</span>;

  if (user) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        {user.photoURL && (
          <img
            src={user.photoURL}
            alt=""
            width={28}
            height={28}
            style={{ borderRadius: "50%" }}
          />
        )}
        <span>{user.displayName ?? user.email}</span>
        <button type="button" onClick={() => void signOutUser()}>
          로그아웃
        </button>
      </div>
    );
  }

  return (
    <button type="button" onClick={() => void signInWithGoogle()}>
      Google로 로그인
    </button>
  );
}
