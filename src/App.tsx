import { CaptureWorkspace } from "./demo/CaptureWorkspace";
import { MobileController } from "./demo/MobileController";
import { PhoneWorkspace } from "./demo/PhoneWorkspace";
import { ShootLibrary } from "./demo/ShootLibrary";
import { StartScreen } from "./demo/StartScreen";
import { useWorkflowStore } from "./demo/useWorkflowStore";
import { WebWorkspace } from "./demo/WebWorkspace";
import "./App.css";

function App() {
  const mode = useWorkflowStore((s) => s.mode);
  const phoneSessionId = useWorkflowStore((s) => s.phoneSessionId);
  const captureSessionId = useWorkflowStore((s) => s.captureSessionId);
  const shootMode = useWorkflowStore((s) => s.shootMode);

  if (shootMode) return <ShootLibrary />;
  if (captureSessionId) return <CaptureWorkspace sessionId={captureSessionId} />;
  if (phoneSessionId) return <MobileController sessionId={phoneSessionId} />;
  if (mode === "web") return <WebWorkspace />;
  if (mode === "phone-setup") return <PhoneWorkspace />;
  return <StartScreen />;
}

export default App;
