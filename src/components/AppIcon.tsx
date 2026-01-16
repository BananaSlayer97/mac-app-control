import { useEffect, useState } from "react";
import { getAppIcon } from "../api/tauri";

const ICON_CACHE_MAX = 300;
const ICON_CACHE = new Map<string, string>();

function putIconCache(path: string, icon: string) {
  if (ICON_CACHE.has(path)) {
    ICON_CACHE.delete(path);
  }
  ICON_CACHE.set(path, icon);
  if (ICON_CACHE.size > ICON_CACHE_MAX) {
    const firstKey = ICON_CACHE.keys().next().value;
    if (typeof firstKey === "string") {
      ICON_CACHE.delete(firstKey);
    }
  }
}

export function useIconData(path: string, initialIcon?: string) {
  const [icon, setIcon] = useState<string | null>(initialIcon || null);

  useEffect(() => {
    let cancelled = false;

    if (initialIcon) {
      setIcon(initialIcon);
      return () => {
        cancelled = true;
      };
    }

    if (path.startsWith("Script:")) {
      setIcon(null);
      return () => {
        cancelled = true;
      };
    }

    const cached = ICON_CACHE.get(path);
    if (cached) {
      setIcon(cached);
      return () => {
        cancelled = true;
      };
    }

    getAppIcon(path).then((result) => {
      if (cancelled) return;
      if (!result) return;
      putIconCache(path, result);
      setIcon(result);
    });

    return () => {
      cancelled = true;
    };
  }, [path, initialIcon]);

  return icon;
}

export default function AppIcon({ path, name, initialIcon }: { path: string; name: string; initialIcon?: string }) {
  const icon = useIconData(path, initialIcon);

  if (icon) {
    return <img src={icon} alt={name} className="app-icon" />;
  }
  return <div className="app-icon app-placeholder">{name.charAt(0)}</div>;
}
