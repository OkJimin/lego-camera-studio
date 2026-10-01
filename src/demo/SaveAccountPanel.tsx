import { useAuthStore } from "../store/authStore";
import { useProjectStore } from "./useProjectStore";

export function SaveAccountPanel() {
  const user = useAuthStore((s) => s.user);
  const signOutUser = useAuthStore((s) => s.signOutUser);
  const currentProjectName = useProjectStore((s) => s.currentProjectName);
  const setCurrentProjectName = useProjectStore((s) => s.setCurrentProjectName);
  const saveProject = useProjectStore((s) => s.saveProject);
  const isSaving = useProjectStore((s) => s.isSaving);
  const lastSavedAt = useProjectStore((s) => s.lastSavedAt);

  return (
    <div className="panel">
      <h2>저장</h2>
      <input
        type="text"
        className="project-name-input"
        value={currentProjectName}
        onChange={(e) => setCurrentProjectName(e.target.value)}
        placeholder="프로젝트 이름"
      />
      <div className="panel__row">
        <button type="button" onClick={() => saveProject()} disabled={isSaving}>
          {isSaving ? "저장 중..." : "저장하기"}
        </button>
        {user && (
          <button type="button" onClick={() => signOutUser()}>
            로그아웃
          </button>
        )}
      </div>
      <p className="panel__hint">
        {user
          ? `${user.displayName ?? user.email}(으)로 로그인됨`
          : "저장하면 구글 로그인을 먼저 진행합니다"}
      </p>
      {lastSavedAt && <p className="panel__hint">저장됨 ✅</p>}
    </div>
  );
}
