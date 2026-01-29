import { useCallback, useRef, useState, useEffect, useMemo } from "react";
import { listen } from "@tauri-apps/api/event";
import "./App.css";
import ContextMenu from "./ContextMenu";
import QuickLookModal from "./QuickLookModal";
import AppGrid from "./components/AppGrid";
import CategorySidebar from "./components/CategorySidebar";
import NoticeBar from "./components/NoticeBar";
import SettingsDashboard from "./components/SettingsDashboard";
import useFilteredApps from "./hooks/useFilteredApps";
import useKeyboardNavigation from "./hooks/useKeyboardNavigation";
import type { AppConfig, AppInfo } from "./types/app";
import { mergeScriptsIntoApps } from "./lib/apps";
import { buildAppContextMenuItems } from "./lib/contextMenuItems";
import { resolveWallpaperUrl } from "./lib/wallpaper";
import {
  addCategory,
  addScript,
  getConfig,
  getInstalledApps,
  launchApp as tauriLaunchApp,
  removeCategory,
  removeScript,
  revealInFinder,
  runScript,
  saveConfig,
  updateScript,
  updateAppCategory,
  updateShortcut,
} from "./api/tauri";

function App() {
  const [apps, setApps] = useState<AppInfo[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [config, setConfig] = useState<AppConfig | null>(null);

  // Navigation State
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [selectedSideIndex, setSelectedSideIndex] = useState<number>(0);
  const [navigationArea, setNavigationArea] = useState<'sidebar' | 'grid'>('grid');

  const [viewMode, setViewMode] = useState<'grid' | 'settings'>('grid');
  const [newCategory, setNewCategory] = useState("");
  const [newShortcut, setNewShortcut] = useState("");

  // Script Management State
  const [newScriptName, setNewScriptName] = useState("");
  const [newScriptCmd, setNewScriptCmd] = useState("");
  const [newScriptCwd, setNewScriptCwd] = useState("");

  const [sortBy, setSortBy] = useState<'name' | 'usage' | 'date'>('name');
  const scrollRafRef = useRef<number | null>(null);
  const [appsRefreshing, setAppsRefreshing] = useState(false);

  const filteredApps = useFilteredApps({ apps, searchQuery, selectedCategory, sortBy });

  const [notice, setNotice] = useState<{ kind: "error" | "info"; message: string; key: string } | null>(null);
  const noticeLastShownRef = useRef<Map<string, number>>(new Map());

  const showNotice = useCallback((params: { key: string; kind: "error" | "info"; message: string }) => {
    const now = Date.now();
    const last = noticeLastShownRef.current.get(params.key) ?? 0;
    if (now - last < 2500) return;
    noticeLastShownRef.current.set(params.key, now);
    setNotice(params);
  }, []);

  const wallpaperUrl = useMemo(() => {
    return resolveWallpaperUrl(config?.wallpaper);
  }, [config?.wallpaper]);

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{ visible: boolean; x: number; y: number; app: AppInfo | null }>({
    visible: false,
    x: 0,
    y: 0,
    app: null
  });

  const [quickLookApp, setQuickLookApp] = useState<AppInfo | null>(null);

  const defaultCategories = ["Frequent", "Scripts", "User Apps", "System"];
  const allCategories = (config?.category_order && config.category_order.length > 0
    ? config.category_order
    : [...defaultCategories, ...(config?.user_categories || []).filter(c => !defaultCategories.includes(c))])
    .filter((c) => c !== "All");

  const categoryIcons: Record<string, string> = {
    "Frequent": "⭐",
    "Scripts": "🐚",
    "Development": "💻",
    "Social": "💬",
    "Design": "🎨",
    "Productivity": "📅",
    "User Apps": "👤",
    "System": "⚙️"
  };



  useEffect(() => {
    // Load config first, then apps (because apps need config for scripts)
    loadConfig().then(() => loadApps());

    // Smart Reset: Clear search when window gains focus
    const unlisten = listen('tauri://focus', () => {
      setSearchQuery("");
      setSelectedIndex(0);
      // Optional: Select search bar
      (document.querySelector('.search-bar') as HTMLInputElement)?.focus();
      loadApps(false);
    });

    return () => {
      unlisten.then(f => f());
    }
  }, []);

  async function loadConfig() {
    try {
      const cfg: AppConfig = await getConfig();
      setConfig(cfg);
      setNewShortcut(cfg.shortcut);
      return cfg;
    } catch (e) {
      showNotice({ key: "config-load-failed", kind: "error", message: "配置加载失败" });
      return null;
    }
  }

  async function loadApps(refresh: boolean = false) {
    try {
      const installedApps: AppInfo[] = await getInstalledApps(refresh);

      // Merge scripts
      const cfg: AppConfig = config ?? await getConfig();
      setApps(mergeScriptsIntoApps(installedApps, cfg));
    } catch (error) {
      showNotice({ key: "apps-load-failed", kind: "error", message: "应用列表加载失败" });
    }
  }

  const handleRefreshApps = useCallback(async () => {
    if (appsRefreshing) return;
    setAppsRefreshing(true);
    try {
      await loadApps(true);
    } finally {
      setAppsRefreshing(false);
    }
  }, [appsRefreshing]);

  async function launchApp(path: string) {
    // Check if it's a script based on path (hacky but works with our AppInfo structure)
    // Better: find app in state
    const app = apps.find(a => a.path === path);
    if (app && app.is_script && app.command) {
      runScript(app.command, app.cwd);
      return;
    }

    try {
      await tauriLaunchApp(path);
      // Optimized: Increment count locally for instant UI update
      setApps(prev => prev.map(a => a.path === path ? { ...a, usage_count: (a.usage_count || 0) + 1 } : a));
    } catch (error) {
      showNotice({ key: `app-launch-failed:${path}`, kind: "error", message: "启动失败（应用可能已被移除或权限不足）" });
      setApps(prev => prev.filter(a => a.path !== path));
      await loadApps(false);
    }
  }

  async function setCategory(path: string, category: string) {
    try {
      await updateAppCategory(path, category);
      // Optimized: Update local state instead of full refresh
      setApps(prev => prev.map(a => a.path === path ? { ...a, category } : a));
    } catch (error) {
      console.error("Failed to update category:", error);
    }
  }

  async function handleAddCategory() {
    if (!newCategory.trim()) return;
    await addCategory(newCategory);
    setNewCategory("");
    loadConfig();
  }

  async function handleRemoveCategory(category: string) {
    await removeCategory(category);
    if (selectedCategory === category) setSelectedCategory("");
    loadConfig();
  }

  const handleReorderCategories = async (newOrder: string[]) => {
    if (!config) return;
    const newConfig = { ...config, category_order: newOrder };
    setConfig(newConfig);
    await saveConfig(newConfig);
  };

  async function handleAddScript() {
    if (!newScriptName.trim() || !newScriptCmd.trim()) return;
    await addScript(newScriptName, newScriptCmd, newScriptCwd);
    setNewScriptName("");
    setNewScriptCmd("");
    setNewScriptCwd("");
    loadConfig().then(() => loadApps());
  }

  async function handleRemoveScript(name: string) {
    await removeScript(name);
    loadConfig().then(() => loadApps());
  }

  async function handleTestScript(command: string, cwd?: string) {
    if (!command.trim()) {
      showNotice({ key: "script-test-missing-command", kind: "error", message: "脚本命令为空" });
      return;
    }
    runScript(command, cwd);
  }

  async function handleUpdateScript(originalName: string, name: string, command: string, cwd?: string) {
    if (!name.trim()) {
      showNotice({ key: "script-update-missing-name", kind: "error", message: "脚本名称不能为空" });
      return;
    }
    if (!command.trim()) {
      showNotice({ key: "script-update-missing-command", kind: "error", message: "脚本命令不能为空" });
      return;
    }
    try {
      await updateScript(originalName, name, command, cwd);
      await loadConfig();
      await loadApps(false);
      showNotice({ key: `script-updated:${originalName}:${name}`, kind: "info", message: "脚本已保存" });
    } catch {
      showNotice({ key: "script-update-failed", kind: "error", message: "脚本保存失败" });
    }
  }

  // Sync selected side index to category
  useEffect(() => {
    if (navigationArea === 'sidebar' && allCategories[selectedSideIndex]) {
      setSelectedCategory(allCategories[selectedSideIndex]);
    }
  }, [selectedSideIndex, navigationArea]);

  // Reset grid selection when category changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [selectedCategory, searchQuery]);

  // Auto-scroll to selected item
  useEffect(() => {
    if (viewMode !== "grid") return;
    if (navigationArea !== "grid") return;
    if (selectedIndex < 0) return;

    if (scrollRafRef.current) {
      cancelAnimationFrame(scrollRafRef.current);
    }
    scrollRafRef.current = requestAnimationFrame(() => {
      const el = document.getElementById(`app-${selectedIndex}`);
      const container = document.querySelector(".apps-grid") as HTMLElement | null;
      if (!el || !container) return;

      const cRect = container.getBoundingClientRect();
      const eRect = el.getBoundingClientRect();
      const padding = 10;
      const above = eRect.top < cRect.top + padding;
      const below = eRect.bottom > cRect.bottom - padding;

      if (above || below) {
        el.scrollIntoView({ behavior: "auto", block: "nearest" });
      }
    });

    return () => {
      if (scrollRafRef.current) cancelAnimationFrame(scrollRafRef.current);
    };
  }, [selectedIndex, navigationArea, viewMode]);

  const handleRecordShortcut = (e: React.KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const key = e.key.toUpperCase();
    const code = e.code;

    // Ignore standalone modifier presses
    if (["CONTROL", "ALT", "SHIFT", "META"].includes(key)) return;

    let modifiers = [];
    if (e.altKey) modifiers.push("Alt");
    if (e.ctrlKey) modifiers.push("Ctrl");
    if (e.shiftKey) modifiers.push("Shift");
    if (e.metaKey) modifiers.push("Cmd");

    // Map common keys to standard names
    let finalKey = key;
    if (code === "Space") finalKey = "Space";
    else if (key.length === 1) finalKey = key;
    else if (code.startsWith("Key")) finalKey = code.replace("Key", "");
    else if (code.startsWith("Digit")) finalKey = code.replace("Digit", "");

    if (modifiers.length > 0) {
      setNewShortcut(`${modifiers.join("+")}+${finalKey}`);
    } else {
      // Allow single function keys but prefer modifiers for standard keys
      setNewShortcut(finalKey);
    }
  };

  async function handleUpdateShortcut() {
    await updateShortcut(newShortcut);
    loadConfig();
  }

  async function handleThemeChange(theme: string) {
    if (!config) return;
    const newConfig = { ...config, theme };
    setConfig(newConfig);
    document.documentElement.setAttribute('data-theme', theme);
    try {
      await saveConfig(newConfig);
    } catch {
      showNotice({ key: "config-save-failed", kind: "error", message: "配置保存失败" });
    }
  }

  async function handleWallpaperChange(path: string) {
    if (!config) return;
    const raw = path.trim();
    const newConfig = { ...config, wallpaper: raw ? raw : null };
    setConfig(newConfig);
    try {
      await saveConfig(newConfig);
    } catch {
      showNotice({ key: "config-save-failed", kind: "error", message: "配置保存失败" });
    }
  }

  async function handleWallpaperBlurChange(blur: number) {
    if (!config) return;
    const clampedBlur = Math.max(0, Math.min(20, blur));
    const overlay = (clampedBlur / 20) * 0.45;
    const newConfig = { ...config, wallpaper_blur: clampedBlur, wallpaper_overlay: overlay };
    setConfig(newConfig);
    try {
      await saveConfig(newConfig);
    } catch {
      showNotice({ key: "config-save-failed", kind: "error", message: "配置保存失败" });
    }
  }

  async function handleWallpaperFitChange(fit: string) {
    if (!config) return;
    const next = fit === "contain" ? "contain" : "cover";
    const newConfig = { ...config, wallpaper_fit: next };
    setConfig(newConfig);
    try {
      await saveConfig(newConfig);
    } catch {
      showNotice({ key: "config-save-failed", kind: "error", message: "配置保存失败" });
    }
  }

  async function handleWallpaperPositionChange(pos: string) {
    if (!config) return;
    const allowed = new Set([
      "center",
      "top",
      "bottom",
      "left",
      "right",
      "top left",
      "top right",
      "bottom left",
      "bottom right",
    ]);
    const next = allowed.has(pos) ? pos : "center";
    const newConfig = { ...config, wallpaper_position: next };
    setConfig(newConfig);
    try {
      await saveConfig(newConfig);
    } catch {
      showNotice({ key: "config-save-failed", kind: "error", message: "配置保存失败" });
    }
  }

  useEffect(() => {
    if (config?.theme) {
      document.documentElement.setAttribute('data-theme', config.theme);
    }
  }, [config?.theme]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};

    let frequent = 0;
    let userApps = 0;
    let system = 0;
    let scripts = 0;
    const byCategory: Record<string, number> = {};

    for (const app of apps) {
      if (app.usage_count > 0) frequent += 1;
      if (app.is_script) scripts += 1;
      if (app.is_system) system += 1;
      if (!app.is_system && !app.is_script) userApps += 1;
      if (app.category) {
        byCategory[app.category] = (byCategory[app.category] || 0) + 1;
      }
    }

    counts["Frequent"] = frequent;
    counts["User Apps"] = userApps;
    counts["System"] = system;
    counts["Scripts"] = scripts;

    for (const category of allCategories) {
      if (counts[category] === undefined) {
        counts[category] = byCategory[category] || 0;
      }
    }

    return counts;
  }, [apps, allCategories]);

  const getCategoryCount = (category: string) => {
    return categoryCounts[category] ?? 0;
  };

  useKeyboardNavigation({
    filteredApps,
    selectedIndex,
    setSelectedIndex,
    navigationArea,
    setNavigationArea,
    viewMode,
    setViewMode,
    allCategories,
    selectedSideIndex,
    setSelectedSideIndex,
    quickLookApp,
    setQuickLookApp,
    searchQuery,
    setSearchQuery,
    onLaunch: launchApp,
  });


  return (
    <div
      className={`app-container layout-vertical ${wallpaperUrl ? "has-wallpaper" : ""}`}
      style={
        wallpaperUrl
          ? {
              backgroundImage: `url("${wallpaperUrl}")`,
              ["--wallpaper-blur" as any]: `${config?.wallpaper_blur ?? 10}px`,
              ["--wallpaper-overlay" as any]: `${config?.wallpaper_overlay ?? 0.4}`,
              ["--wallpaper-fit" as any]: (config?.wallpaper_fit || "cover"),
              ["--wallpaper-position" as any]: (config?.wallpaper_position || "center"),
            }
          : {}
      }
    >
      {notice && (
        <NoticeBar
          kind={notice.kind}
          message={notice.message}
          onClose={() => setNotice(null)}
          autoHideMs={notice.kind === "info" ? 1500 : undefined}
        />
      )}
      <button
        className={`settings-btn ${viewMode === 'settings' ? 'active' : ''}`}
        onClick={() => setViewMode(prev => prev === 'grid' ? 'settings' : 'grid')}
        title="Settings"
      >
        {viewMode === 'grid' ? '⚙️' : '🏠'}
      </button>

      <CategorySidebar
        categories={allCategories}
        selectedCategory={selectedCategory}
        navigationArea={navigationArea}
        selectedSideIndex={selectedSideIndex}
        categoryIcons={categoryIcons}
        getCategoryCount={getCategoryCount}
        onReorder={handleReorderCategories}
        onSelectCategory={(category, index) => {
          setSelectedCategory(category);
          setNavigationArea("sidebar");
          setSelectedSideIndex(index);
          if (viewMode === "settings") setViewMode("grid");
        }}
      />

      <main className="main-content">
        {viewMode === 'grid' ? (
          <AppGrid
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
            sortBy={sortBy}
            onSortByChange={setSortBy}
            onRefreshApps={handleRefreshApps}
            appsRefreshing={appsRefreshing}
            apps={filteredApps}
            navigationArea={navigationArea}
            selectedIndex={selectedIndex}
            onLaunch={launchApp}
            onOpenContextMenu={(x, y, app) => setContextMenu({ visible: true, x, y, app })}
            currentCategory={selectedCategory}
          />
        ) : (
          <SettingsDashboard
            config={config}
            defaultCategories={defaultCategories}
            newShortcut={newShortcut}
            onRecordShortcut={handleRecordShortcut}
            onSaveShortcut={handleUpdateShortcut}
            newCategory={newCategory}
            onNewCategoryChange={setNewCategory}
            onAddCategory={handleAddCategory}
            onRemoveCategory={handleRemoveCategory}
            newScriptName={newScriptName}
            onNewScriptNameChange={setNewScriptName}
            newScriptCmd={newScriptCmd}
            onNewScriptCmdChange={setNewScriptCmd}
            newScriptCwd={newScriptCwd}
            onNewScriptCwdChange={setNewScriptCwd}
            onAddScript={handleAddScript}
            onRemoveScript={handleRemoveScript}
            onTestScript={handleTestScript}
            onUpdateScript={handleUpdateScript}
            currentTheme={config?.theme || "Midnight"}
            onThemeChange={handleThemeChange}
            wallpaper={config?.wallpaper || ""}
            onWallpaperChange={handleWallpaperChange}
            wallpaperBlur={config?.wallpaper_blur ?? 10}
            onWallpaperBlurChange={handleWallpaperBlurChange}
            wallpaperFit={config?.wallpaper_fit || "cover"}
            onWallpaperFitChange={handleWallpaperFitChange}
            wallpaperPosition={config?.wallpaper_position || "center"}
            onWallpaperPositionChange={handleWallpaperPositionChange}
            apps={apps}
          />
        )}
      </main>

      {/* Context Menu & Modals */}
      <ContextMenu
        visible={contextMenu.visible}
        x={contextMenu.x}
        y={contextMenu.y}
        onClose={() => setContextMenu((prev) => ({ ...prev, visible: false }))}
        items={buildAppContextMenuItems({
          app: contextMenu.app,
          allCategories,
          onLaunch: launchApp,
          onSetCategory: setCategory,
          onRevealInFinder: revealInFinder,
          onCopyText: (text) => navigator.clipboard.writeText(text),
        })}
      />

      <QuickLookModal
        app={quickLookApp}
        onClose={() => setQuickLookApp(null)}
      />
    </div>
  );
}

export default App;
