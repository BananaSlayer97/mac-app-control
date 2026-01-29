export interface AppInfo {
  name: string;
  path: string;
  is_system: boolean;
  category?: string;
  usage_count: number;
  icon_data?: string;
  date_modified: number;
  is_script?: boolean;
  command?: string;
  cwd?: string;
}

export interface ScriptAction {
  name: string;
  command: string;
  cwd?: string;
}

export interface AppConfig {
  categories: Record<string, string>;
  usage_counts: Record<string, number>;
  user_categories: string[];
  shortcut: string;
  scripts: ScriptAction[];
  category_order: string[];
  theme: string;
  wallpaper?: string | null;
  wallpaper_blur: number;
  wallpaper_overlay: number;
  wallpaper_fit: string;
  wallpaper_position: string;
}

export interface WallpaperFile {
  path: string;
  filename: string;
  size: number;
  modified_ms: number | null;
}
