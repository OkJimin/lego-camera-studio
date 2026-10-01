import { useState } from "react";
import { useProjectStore } from "./useProjectStore";
import { useWorkflowStore } from "./useWorkflowStore";

export function StartScreen() {
  const setMode = useWorkflowStore((s) => s.setMode);
  const [showProjects, setShowProjects] = useState(false);
  const myProjects = useProjectStore((s) => s.myProjects);
  const isLoadingList = useProjectStore((s) => s.isLoadingList);
  const fetchMyProjects = useProjectStore((s) => s.fetchMyProjects);
  const loadProject = useProjectStore((s) => s.loadProject);
  const startNewProject = useProjectStore((s) => s.startNewProject);

  const handleOpenProjects = async () => {
    setShowProjects(true);
    await fetchMyProjects();
  };

  const handleLoad = async (id: string) => {
    await loadProject(id);
    setMode("web");
  };

  const handleChooseMode = (nextMode: "web" | "phone-setup") => {
    startNewProject();
    setMode(nextMode);
  };

  return (
    <div className="start-screen">
      <div className="start-screen__card">
        <h1>레고 카메라 스튜디오</h1>
        <p>카메라를 어떻게 제어할지 먼저 선택해주세요</p>

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
            <h2>폰으로 카메라 제어</h2>
            <p>
              여기서는 오브젝트 배치와 움직임까지만 만들고, 카메라 촬영은 폰을 연결해서
              진행합니다
            </p>
          </button>
        </div>

        <button type="button" className="start-screen__link" onClick={handleOpenProjects}>
          내 프로젝트 불러오기
        </button>

        {showProjects && (
          <div className="start-screen__projects">
            {isLoadingList && <p>불러오는 중...</p>}
            {!isLoadingList && myProjects.length === 0 && <p>저장된 프로젝트가 없어요</p>}
            {myProjects.map((project) => (
              <button
                key={project.id}
                type="button"
                className="start-screen__project-item"
                onClick={() => handleLoad(project.id)}
              >
                {project.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
