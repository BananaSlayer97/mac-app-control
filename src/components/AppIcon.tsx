import { useEffect, useMemo, useRef, useState } from "react";
import { getAppIcon } from "../api/tauri";

const ICON_CACHE_MAX = 300;
const ICON_CACHE = new Map<string, string>();

type IconQueueEntry = {
  path: string;
  priority: number;
  enqueuedAt: number;
  cancelled: boolean;
  resolve: (value: string | null) => void;
  reject: (reason?: unknown) => void;
};

const ICON_QUEUE_CONCURRENCY = 6;
let iconQueueActive = 0;
const iconQueuePending: IconQueueEntry[] = [];
const iconQueueInFlight = new Map<string, Promise<string | null>>();

function drainIconQueue() {
  while (iconQueueActive < ICON_QUEUE_CONCURRENCY) {
    while (iconQueuePending.length > 0 && iconQueuePending[0]?.cancelled) {
      iconQueuePending.shift();
    }
    if (iconQueuePending.length === 0) return;
    iconQueuePending.sort((a, b) => (b.priority - a.priority) || (a.enqueuedAt - b.enqueuedAt));
    const entry = iconQueuePending.shift();
    if (!entry || entry.cancelled) continue;

    const existing = iconQueueInFlight.get(entry.path);
    if (existing) {
      existing.then(entry.resolve).catch(entry.reject);
      continue;
    }

    iconQueueActive += 1;
    const p = getAppIcon(entry.path)
      .then((result) => result)
      .finally(() => {
        iconQueueActive -= 1;
        iconQueueInFlight.delete(entry.path);
        drainIconQueue();
      });
    iconQueueInFlight.set(entry.path, p);
    p.then(entry.resolve).catch(entry.reject);
  }
}

function enqueueIconFetch(path: string, priority: number) {
  const entry: Omit<IconQueueEntry, "resolve" | "reject"> & {
    resolve?: IconQueueEntry["resolve"];
    reject?: IconQueueEntry["reject"];
  } = {
    path,
    priority,
    enqueuedAt: Date.now(),
    cancelled: false,
  };

  const promise = new Promise<string | null>((resolve, reject) => {
    entry.resolve = resolve;
    entry.reject = reject;
  });

  iconQueuePending.push(entry as IconQueueEntry);
  drainIconQueue();

  return {
    promise,
    cancel: () => {
      entry.cancelled = true;
    },
  };
}

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

export function useIconData(
  path: string,
  initialIcon?: string,
  options?: { enabled?: boolean; priority?: number }
) {
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

    const enabled = options?.enabled ?? true;
    if (!enabled) {
      return () => {
        cancelled = true;
      };
    }

    const { promise, cancel } = enqueueIconFetch(path, options?.priority ?? 0);
    promise.then((result) => {
      if (cancelled) return;
      if (!result) return;
      putIconCache(path, result);
      setIcon(result);
    }).catch(() => {});

    return () => {
      cancelled = true;
      cancel();
    };
  }, [path, initialIcon, options?.enabled, options?.priority]);

  return icon;
}

export default function AppIcon({ path, name, initialIcon }: { path: string; name: string; initialIcon?: string }) {
  const rootEl = useMemo(() => document.querySelector(".apps-grid"), []);
  const ref = useRef<HTMLDivElement | null>(null);
  const [inView, setInView] = useState(true);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const root = rootEl instanceof HTMLElement ? rootEl : null;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        setInView(entry.isIntersecting);
      },
      { root, rootMargin: "240px 0px", threshold: 0.01 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [rootEl]);

  const icon = useIconData(path, initialIcon, { enabled: inView, priority: 10 });

  if (icon) {
    return (
      <div ref={ref} className="app-icon">
        <img src={icon} alt={name} className="native-icon" loading="lazy" />
      </div>
    );
  }
  return (
    <div ref={ref} className="app-icon">
      <div className="placeholder-icon">{name.charAt(0)}</div>
    </div>
  );
}
