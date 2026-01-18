import { useEffect } from "react";

export type NoticeKind = "error" | "info";

export default function NoticeBar({
  kind,
  message,
  onClose,
  autoHideMs,
}: {
  kind: NoticeKind;
  message: string;
  onClose: () => void;
  autoHideMs?: number;
}) {
  useEffect(() => {
    if (!autoHideMs) return;
    const id = window.setTimeout(() => onClose(), autoHideMs);
    return () => window.clearTimeout(id);
  }, [autoHideMs, onClose]);

  return (
    <div className={`notice-bar ${kind}`}>
      <div className="notice-message">{message}</div>
      <button className="notice-close" onClick={onClose} aria-label="Close">
        ×
      </button>
    </div>
  );
}

