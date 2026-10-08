import { useEffect, useState } from "react";
import { useAuthStore } from "../store/authStore";
import { CaptureView } from "./CaptureWorkspace";
import type { CaptureData } from "./CaptureWorkspace";
import { fetchProjectForShoot, useProjectStore } from "./useProjectStore";

export function ShootLibrary() {
  const user = useAuthStore((s) => s.user);
  const authLoading = useAuthStore((s) => s.isLoading);
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle);
  const myProjects = useProjectStore((s) => s.myProjects);
  const isLoadingList = useProjectStore((s) => s.isLoadingList);
  const fetchMyProjects = useProjectStore((s) => s.fetchMyProjects);

  const [selected, setSelected] = useState<CaptureData | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const signedIn = !!user && !user.isAnonymous;

  useEffect(() => {
    if (!signedIn) return;
    fetchMyProjects().catch(() => setError("프로젝트 목록을 불러오지 못했어요"));
  }, [signedIn, fetchMyProjects]);

  const handleLogin = () => {
    setError(null);
    signInWithGoogle().catch(() => setError("로그인에 실패했어요. 다시 시도해주세요"));
  };

  const handleOpen = async (id: string) => {
    setOpeningId(id);
    setError(null);
    try {
      const data = await fetchProjectForShoot(id);
      if (!data) {
        setError("프로젝트를 찾을 수 없어요");
        return;
      }
      setSelected(data);
    } catch {
      setError("프로젝트를 여는 중 문제가 생겼어요");
    } finally {
      setOpeningId(null);
    }
  };

  if (authLoading) {
    return (
      <div className="shoot-library">
        <p>불러오는 중...</p>
      </div>
    );
  }

  if (selected) {
    return <CaptureView {...selected} onBack={() => setSelected(null)} />;
  }

  if (!signedIn) {
    return (
      <div className="shoot-library">
        <h1>촬영 라이브러리</h1>
        <p className="shoot-library__hint">
          데스크톱에서 저장한 프로젝트를 보려면 같은 구글 계정으로 로그인하세요.
        </p>
        <button type="button" className="shoot-library__primary" onClick={handleLogin}>
          구글로 로그인
        </button>
        {error && <p className="shoot-library__error">{error}</p>}
      </div>
    );
  }

  return (
    <div className="shoot-library">
      <h1>프로젝트 선택</h1>
      {error && <p className="shoot-library__error">{error}</p>}
      {isLoadingList && <p className="shoot-library__hint">목록 불러오는 중...</p>}
      {!isLoadingList && myProjects.length === 0 && (
        <p className="shoot-library__hint">
          저장된 프로젝트가 없어요. 데스크톱에서 카메라 경로까지 만든 뒤 저장해주세요.
        </p>
      )}
      <ul className="shoot-library__list">
        {myProjects.map((project) => (
          <li key={project.id}>
            <button
              type="button"
              className="shoot-library__item"
              disabled={openingId !== null}
              onClick={() => handleOpen(project.id)}
            >
              {project.name}
              {openingId === project.id && <span> · 여는 중</span>}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
