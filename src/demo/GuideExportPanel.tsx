import { useCameraPathStore } from "./useCameraPathStore";
import { useGuideExportStore } from "./useGuideExportStore";

// showPlayback adds preview/clear controls; the web workspace already has them
// in its camera panel, the phone workspace has no other way to preview a recording.
export function GuideExportPanel({ showPlayback = false }: { showPlayback?: boolean }) {
  const keyframeCount = useCameraPathStore((s) => s.keyframes.length);
  const isRecording = useCameraPathStore((s) => s.isRecording);
  const isPlaying = useCameraPathStore((s) => s.isPlaying);
  const play = useCameraPathStore((s) => s.play);
  const stop = useCameraPathStore((s) => s.stop);
  const clearPath = useCameraPathStore((s) => s.clearPath);
  const openExport = useGuideExportStore((s) => s.openExport);

  const hasPath = keyframeCount >= 2;
  const busy = isRecording || isPlaying;

  return (
    <div className="panel">
      <h2>가이드 영상</h2>
      <p className="panel__hint">
        {hasPath
          ? "카메라 무빙과 오브젝트 움직임을 영상 파일로 내보내요. 폰 촬영 화면에서 반투명 가이드로 쓸 수 있어요"
          : "먼저 카메라 무빙을 만들어주세요"}
      </p>
      {showPlayback && (
        <div className="panel__row">
          <button type="button" onClick={() => (isPlaying ? stop() : play())} disabled={!hasPath}>
            {isPlaying ? "재생 중지" : "경로 재생"}
          </button>
          <button type="button" onClick={clearPath} disabled={keyframeCount === 0 || isPlaying}>
            경로 지우기
          </button>
        </div>
      )}
      <div className="panel__row">
        <button type="button" onClick={openExport} disabled={!hasPath || busy}>
          영상 내보내기
        </button>
      </div>
    </div>
  );
}
