import { useEffect, useState } from "react";
import { describeAuthError, useAuthStore } from "../store/authStore";
import { CAMERA_TEMPLATES, startFromTemplate } from "./cameraTemplates";
import type { CameraTemplate } from "./cameraTemplates";
import { PhoneShootQr } from "./PhoneShootQr";
import { useProjectStore } from "./useProjectStore";
import { useWorkflowStore } from "./useWorkflowStore";

type Step = "library" | "choose-mode";

function formatUpdatedAt(ms: number): string {
  if (!ms) return "";
  return new Date(ms).toLocaleDateString("ko-KR", { month: "long", day: "numeric" });
}

export function StartScreen() {
  const user = useAuthStore((s) => s.user);
  const authLoading = useAuthStore((s) => s.isLoading);
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle);
  const signOutUser = useAuthStore((s) => s.signOutUser);
  const setMode = useWorkflowStore((s) => s.setMode);
  const myProjects = useProjectStore((s) => s.myProjects);
  const isLoadingList = useProjectStore((s) => s.isLoadingList);
  const fetchMyProjects = useProjectStore((s) => s.fetchMyProjects);
  const loadProject = useProjectStore((s) => s.loadProject);
  const startNewProject = useProjectStore((s) => s.startNewProject);

  const [step, setStep] = useState<Step>("library");
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showShootQr, setShowShootQr] = useState(false);

  // Anonymous accounts only exist for phone pairing and don't own projects.
  const signedIn = !!user && !user.isAnonymous;

  useEffect(() => {
    if (!signedIn) return;
    fetchMyProjects().catch(() => setError("프로젝트 목록을 불러오지 못했어요"));
  }, [signedIn, fetchMyProjects]);

  const handleLogin = () => {
    setError(null);
    signInWithGoogle().catch((err) => setError(describeAuthError(err)));
  };

  const handleOpen = async (id: string) => {
    setOpeningId(id);
    setError(null);
    try {
      const mode = await loadProject(id);
      if (!mode) {
        setError("프로젝트를 찾을 수 없어요");
        return;
      }
      setMode(mode);
    } catch {
      setError("프로젝트를 여는 중 문제가 생겼어요");
    } finally {
      setOpeningId(null);
    }
  };

  const handleStartTemplate = (template: CameraTemplate) => {
    startFromTemplate(template);
    setMode("web");
  };

  const handleChooseMode = (nextMode: "web" | "phone-setup") => {
    startNewProject();
    setMode(nextMode);
  };

  if (authLoading) {
    return (
      <div className="start-screen">
        <div className="start-screen__card">
          <p>로그인 확인 중...</p>
        </div>
      </div>
    );
  }

  if (!signedIn) {
    return (
      <div className="start-screen">
        <div className="start-screen__card">
          <h1>레고 카메라 스튜디오</h1>
          <p>작업을 저장하고 다시 불러오려면 로그인해주세요</p>
          <button type="button" className="start-screen__primary" onClick={handleLogin}>
            구글로 로그인
          </button>
          {error && <p className="start-screen__error">{error}</p>}
        </div>
      </div>
    );
  }

  if (step === "choose-mode") {
    return (
      <div className="start-screen">
        <div className="start-screen__card">
          <h1>새 작업</h1>
          <p>카메라를 어떻게 제어할지 선택해주세요</p>

          <div className="start-screen__options">
            <button
              type="button"
              className="start-screen__option"
              onClick={() => handleChooseMode("web")}
            >
              <h2>웹으로 카메라 제어</h2>
              <p>오브젝트 배치부터 카메라 무빙까지 이 화면에서 전부 진행합니다</p>
            </button>
            <button
              type="button"
              className="start-screen__option"
              onClick={() => handleChooseMode("phone-setup")}
            >
              <h2>폰 자이로로 카메라 제어</h2>
              <p>
                여기서는 오브젝트 배치와 움직임까지 만들고, 카메라 무빙은 폰을 연결해서
                직접 움직여 기록합니다
              </p>
            </button>
          </div>

          <button type="button" className="start-screen__link" onClick={() => setStep("library")}>
            ◀ 라이브러리로
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="start-screen">
      <div className="start-screen__card">
        <h1>내 라이브러리</h1>
        <p className="start-screen__account">
          {user.displayName ?? user.email}
          <button type="button" className="start-screen__link" onClick={() => signOutUser()}>
            로그아웃
          </button>
        </p>

        <button type="button" className="start-screen__primary" onClick={() => setStep("choose-mode")}>
          + New
        </button>

        <button
          type="button"
          className="start-screen__secondary"
          onClick={() => setShowShootQr((v) => !v)}
        >
          📱 폰으로 가이드 촬영하기
        </button>
        {showShootQr && (
          <div className="start-screen__shoot">
            <p>
              폰으로 QR을 스캔하고 <strong>가이드 영상 선택</strong>을 누르면, 카메라 위에 가이드가
              반투명하게 겹쳐진 채로 촬영할 수 있어요. 가이드 영상은 노트북에서 내보낸 뒤 폰으로
              옮겨두세요
            </p>
            <PhoneShootQr />
          </div>
        )}

        <h2 className="start-screen__section">카메라 템플릿</h2>
        <div className="start-screen__templates">
          {CAMERA_TEMPLATES.map((template) => (
            <button
              key={template.id}
              type="button"
              className="start-screen__template"
              onClick={() => handleStartTemplate(template)}
            >
              <strong>{template.name}</strong>
              <span>{template.description}</span>
              <span className="start-screen__project-meta">
                {template.focalLengthMm}mm · {template.durationSeconds}초
              </span>
            </button>
          ))}
        </div>

        <h2 className="start-screen__section">내 프로젝트</h2>
        {error && <p className="start-screen__error">{error}</p>}
        {isLoadingList && <p>불러오는 중...</p>}
        {!isLoadingList && myProjects.length === 0 && <p>저장된 프로젝트가 없어요</p>}

        <div className="start-screen__projects">
          {myProjects.map((project) => (
            <button
              key={project.id}
              type="button"
              className="start-screen__project-item"
              disabled={openingId !== null}
              onClick={() => handleOpen(project.id)}
            >
              <span>{project.name}</span>
              <span className="start-screen__project-meta">
                {project.mode === "phone-setup" ? "폰 자이로" : "웹"}
                {project.updatedAtMs ? ` · ${formatUpdatedAt(project.updatedAtMs)}` : ""}
                {openingId === project.id ? " · 여는 중" : ""}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
