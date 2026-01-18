import { convertFileSrc } from "@tauri-apps/api/core";

export function resolveWallpaperUrl(wallpaper: string | null | undefined): string {
  const raw = wallpaper?.trim();
  if (!raw) return "";
  if (raw.startsWith("http://") || raw.startsWith("https://") || raw.startsWith("data:") || raw.startsWith("blob:")) {
    return raw;
  }
  if (raw.startsWith("file://")) {
    return convertFileSrc(raw.slice("file://".length));
  }
  if (raw.startsWith("/")) {
    return convertFileSrc(raw);
  }
  return raw;
}

