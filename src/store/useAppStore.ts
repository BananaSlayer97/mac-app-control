import { create } from 'zustand';
import { 
  getConfig, 
  saveConfig, 
  getInstalledApps, 
  updateAppCategory,
  addCategory as tauriAddCategory,
  removeCategory as tauriRemoveCategory,
  updateShortcut as tauriUpdateShortcut,
  addScript as tauriAddScript,
  removeScript as tauriRemoveScript,
  updateScript as tauriUpdateScript,
  launchApp as tauriLaunchApp,
  runScript as tauriRunScript
} from '../api/tauri';
import type { AppConfig, AppInfo } from '../types/app';
import { mergeScriptsIntoApps } from '../lib/apps';

interface AppState {
  apps: AppInfo[];
  config: AppConfig | null;
  appsRefreshing: boolean;
  notice: { kind: 'error' | 'info'; message: string; key: string } | null;
  
  // Actions
  loadInitialData: () => Promise<void>;
  loadApps: (refresh?: boolean) => Promise<void>;
  setNotice: (notice: { kind: 'error' | 'info'; message: string; key: string } | null) => void;
  
  // App Actions
  launchApp: (path: string) => Promise<void>;
  setAppCategory: (path: string, category: string) => Promise<void>;
  
  // Config Actions
  updateTheme: (theme: string) => Promise<void>;
  updateWallpaper: (path: string) => Promise<void>;
  updateWallpaperBlur: (blur: number) => Promise<void>;
  updateWallpaperFit: (fit: string) => Promise<void>;
  updateWallpaperPosition: (pos: string) => Promise<void>;
  updateShortcut: (shortcut: string) => Promise<void>;
  
  // Category Actions
  addCategory: (category: string) => Promise<void>;
  removeCategory: (category: string) => Promise<void>;
  reorderCategories: (newOrder: string[]) => Promise<void>;
  
  // Script Actions
  addScript: (name: string, command: string, cwd?: string) => Promise<void>;
  removeScript: (name: string) => Promise<void>;
  updateScript: (originalName: string, name: string, command: string, cwd?: string) => Promise<void>;
  runScript: (command: string, cwd?: string) => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  apps: [],
  config: null,
  appsRefreshing: false,
  notice: null,

  setNotice: (notice) => set({ notice }),

  loadInitialData: async () => {
    try {
      const config = await getConfig();
      set({ config });
      await get().loadApps();
    } catch (e) {
      set({ notice: { kind: 'error', message: '加载配置失败', key: 'load-config-error' } });
    }
  },

  loadApps: async (refresh = false) => {
    set({ appsRefreshing: true });
    try {
      const installedApps = await getInstalledApps(refresh);
      const config = get().config;
      if (config) {
        set({ apps: mergeScriptsIntoApps(installedApps, config) });
      } else {
        set({ apps: installedApps });
      }
    } catch (e) {
      set({ notice: { kind: 'error', message: '加载应用列表失败', key: 'load-apps-error' } });
    } finally {
      set({ appsRefreshing: false });
    }
  },

  launchApp: async (path: string) => {
    const { apps } = get();
    const app = apps.find(a => a.path === path);
    
    if (app?.is_script && app.command) {
      await tauriRunScript(app.command, app.cwd);
      return;
    }

    try {
      await tauriLaunchApp(path);
      // Optimistic update
      set({
        apps: apps.map(a => a.path === path ? { ...a, usage_count: (a.usage_count || 0) + 1 } : a)
      });
    } catch (e) {
      set({ notice: { kind: 'error', message: '启动失败', key: `launch-error-${path}` } });
      await get().loadApps(); // Reload to sync state
    }
  },

  setAppCategory: async (path: string, category: string) => {
    try {
      await updateAppCategory(path, category);
      set({
        apps: get().apps.map(a => a.path === path ? { ...a, category } : a)
      });
    } catch (e) {
      set({ notice: { kind: 'error', message: '更新分类失败', key: 'update-category-error' } });
    }
  },

  updateTheme: async (theme: string) => {
    const { config } = get();
    if (!config) return;
    const nextConfig = { ...config, theme };
    set({ config: nextConfig });
    document.documentElement.setAttribute('data-theme', theme);
    await saveConfig(nextConfig);
  },

  updateWallpaper: async (path: string) => {
    const { config } = get();
    if (!config) return;
    const nextConfig = { ...config, wallpaper: path || null };
    set({ config: nextConfig });
    await saveConfig(nextConfig);
  },

  updateWallpaperBlur: async (blur: number) => {
    const { config } = get();
    if (!config) return;
    const clampedBlur = Math.max(0, Math.min(20, blur));
    const overlay = (clampedBlur / 20) * 0.45;
    const nextConfig = { ...config, wallpaper_blur: clampedBlur, wallpaper_overlay: overlay };
    set({ config: nextConfig });
    await saveConfig(nextConfig);
  },

  updateWallpaperFit: async (fit: string) => {
    const { config } = get();
    if (!config) return;
    const nextConfig = { ...config, wallpaper_fit: fit };
    set({ config: nextConfig });
    await saveConfig(nextConfig);
  },

  updateWallpaperPosition: async (pos: string) => {
    const { config } = get();
    if (!config) return;
    const nextConfig = { ...config, wallpaper_position: pos };
    set({ config: nextConfig });
    await saveConfig(nextConfig);
  },

  updateShortcut: async (shortcut: string) => {
    await tauriUpdateShortcut(shortcut);
    const config = await getConfig();
    set({ config });
  },

  addCategory: async (category: string) => {
    await tauriAddCategory(category);
    const config = await getConfig();
    set({ config });
  },

  removeCategory: async (category: string) => {
    await tauriRemoveCategory(category);
    const config = await getConfig();
    set({ config });
  },

  reorderCategories: async (newOrder: string[]) => {
    const { config } = get();
    if (!config) return;
    const nextConfig = { ...config, category_order: newOrder };
    set({ config: nextConfig });
    await saveConfig(nextConfig);
  },

  addScript: async (name: string, command: string, cwd?: string) => {
    await tauriAddScript(name, command, cwd);
    await get().loadInitialData();
  },

  removeScript: async (name: string) => {
    await tauriRemoveScript(name);
    await get().loadInitialData();
  },

  updateScript: async (originalName: string, name: string, command: string, cwd?: string) => {
    await tauriUpdateScript(originalName, name, command, cwd);
    await get().loadInitialData();
  },

  runScript: async (command: string, cwd?: string) => {
    await tauriRunScript(command, cwd);
  }
}));
