import { useState, useEffect, useMemo } from "react";
import { listen } from "@tauri-apps/api/event";
import "./App.css";
import ContextMenu from "./ContextMenu";
import QuickLookModal from "./QuickLookModal";
import AppGrid from "./components/AppGrid";
import CategorySidebar from "./components/CategorySidebar";
import SettingsDashboard from "./components/SettingsDashboard";
import useFilteredApps from "./hooks/useFilteredApps";
import useKeyboardNavigation from "./hooks/useKeyboardNavigation";
import type { AppConfig, AppInfo } from "./types/app";
import {
  addCategory,
  addScript,
  autoCategorize,
  getConfig,
  getInstalledApps,
  launchApp as tauriLaunchApp,
  removeCategory,
  removeScript,
  revealInFinder,
  runScript,
  saveConfig,
  updateAppCategory,
  updateShortcut,
} from "./api/tauri";


function App() {
  const [apps, setApps] = useState<AppInfo[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
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

  const filteredApps = useFilteredApps({ apps, searchQuery, selectedCategory, sortBy });

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{ visible: boolean; x: number; y: number; app: AppInfo | null }>({
    visible: false,
    x: 0,
    y: 0,
    app: null
  });

  const [quickLookApp, setQuickLookApp] = useState<AppInfo | null>(null);

  const defaultCategories = ["All", "Frequent", "Scripts", "Development", "Social", "Design", "Productivity", "User Apps", "System"];
  const allCategories = config?.category_order && config.category_order.length > 0
    ? config.category_order
    : [...defaultCategories, ...(config?.user_categories || []).filter(c => !defaultCategories.includes(c))];

  const categoryIcons: Record<string, string> = {
    "All": "🏠",
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
      console.error("Failed to load config", e);
      return null;
    }
  }

  async function loadApps(refresh: boolean = false) {
    try {
      const installedApps: AppInfo[] = await getInstalledApps(refresh);

      // Merge scripts
      const cfg: AppConfig = config ?? await getConfig();
      const scriptApps: AppInfo[] = (cfg.scripts || []).map(script => ({
        name: script.name,
        path: "Script: " + script.command,
        is_system: false,
        is_script: true,
        command: script.command,
        cwd: script.cwd,
        usage_count: 0,
        category: "Scripts",
        date_modified: Date.now() / 1000
      }));

      setApps([...scriptApps, ...installedApps]);
    } catch (error) {
      console.error("Failed to fetch apps:", error);
    }
  }

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
      console.error("Failed to launch app:", error);
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
    if (selectedCategory === category) setSelectedCategory("All");
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

  async function handleAutoCategorize() {
    try {
      await autoCategorize();
      await loadConfig();
      await loadApps(true); // Force refresh app list from disk
    } catch (e) {
      console.error("Auto categorize failed", e);
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
    if (selectedIndex >= 0) {
      const el = document.getElementById(`app-${selectedIndex}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [selectedIndex]);

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

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    counts["All"] = apps.length;

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
    <div className="app-container layout-vertical">
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
            apps={filteredApps}
            navigationArea={navigationArea}
            selectedIndex={selectedIndex}
            onLaunch={launchApp}
            onOpenContextMenu={(x, y, app) => setContextMenu({ visible: true, x, y, app })}
          />
        ) : (
          <SettingsDashboard
            config={config}
            defaultCategories={defaultCategories}
            newShortcut={newShortcut}
            onRecordShortcut={handleRecordShortcut}
            onSaveShortcut={handleUpdateShortcut}
            onAutoCategorize={handleAutoCategorize}
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
          />
        )}
      </main>

      {/* Context Menu & Modals */}
      <ContextMenu
        visible={contextMenu.visible}
        x={contextMenu.x}
        y={contextMenu.y}
        onClose={() => setContextMenu((prev) => ({ ...prev, visible: false }))}
        actions={[
          {
            label: "Open / Launch",
            onClick: () => contextMenu.app && launchApp(contextMenu.app.path)
          },
          ...((contextMenu.app && !contextMenu.app.is_system && !contextMenu.app.is_script) ? [
            { label: "--- CATEGORY ---", onClick: () => { }, divider: true },
            {
              label: "Uncategorized",
              onClick: () => contextMenu.app && setCategory(contextMenu.app.path, "")
            },
            ...allCategories.filter(c => !["All", "Frequent", "Scripts", "User Apps", "System"].includes(c)).map(c => ({
              label: `Move to ${c}`,
              onClick: () => contextMenu.app && setCategory(contextMenu.app.path, c)
            }))
          ] : []),
          { label: "--- SYSTEM ---", onClick: () => { }, divider: true },
          {
            label: "Reveal in Finder",
            onClick: () => contextMenu.app && revealInFinder(contextMenu.app.path)
          },
          {
            label: "Copy Path",
            onClick: () => {
              if (contextMenu.app) {
                navigator.clipboard.writeText(contextMenu.app.path);
              }
            }
          }
        ]}
      />

      <QuickLookModal
        app={quickLookApp}
        onClose={() => setQuickLookApp(null)}
      />
    </div>
  );
}

export default App;
