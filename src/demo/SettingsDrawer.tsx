import { useState, type ReactNode } from "react";

export function SettingsDrawer({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="settings-drawer">
      {open && <div className="settings-drawer__content">{children}</div>}
      <button type="button" className="settings-drawer__toggle" onClick={() => setOpen((o) => !o)}>
        {open ? "▶ 설정 닫기" : "◀ 설정"}
      </button>
    </div>
  );
}
