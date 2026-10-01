import { MobileController } from "./demo/MobileController";
import { PhoneWorkspace } from "./demo/PhoneWorkspace";
import { StartScreen } from "./demo/StartScreen";
import { useWorkflowStore } from "./demo/useWorkflowStore";
import { WebWorkspace } from "./demo/WebWorkspace";
import "./App.css";

function App() {
  const mode = useWorkflowStore((s) => s.mode);
  const phoneSessionId = useWorkflowStore((s) => s.phoneSessionId);

  if (phoneSessionId) return <MobileController sessionId={phoneSessionId} />;
  if (mode === "web") return <WebWorkspace />;
  if (mode === "phone-setup") return <PhoneWorkspace />;
  return <StartScreen />;
}

export default App;
