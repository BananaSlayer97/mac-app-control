import { useState, useEffect } from "react";
import { Reorder } from "framer-motion";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import "./App.css";
import ContextMenu from "./ContextMenu";
import QuickLookModal from "./QuickLookModal";

interface AppInfo {
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

interface ScriptAction {
  name: string;
  command: string;
  cwd?: string;
}

interface AppConfig {
  categories: Record<string, string>;
  usage_counts: Record<string, number>;
  user_categories: string[];
  shortcut: string;
  scripts: ScriptAction[];
  category_order: string[];
}

function App() {
  const [apps, setApps] = useState<AppInfo[]>([]);
  const [filteredApps, setFilteredApps] = useState<AppInfo[]>([]);
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
    });

    return () => {
      unlisten.then(f => f());
    }
  }, []);

  async function loadConfig() {
    try {
      const cfg: AppConfig = await invoke("get_config");
      setConfig(cfg);
      setNewShortcut(cfg.shortcut);
      return cfg;
    } catch (e) {
      console.error("Failed to load config", e);
      return null;
    }
  }

  useEffect(() => {
    let result = [...apps];

    // Filtering
    if (searchQuery) {
      result = result.filter(app =>
        app.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (selectedCategory === "System") {
      result = result.filter(app => app.is_system);
    } else if (selectedCategory === "User Apps") {
      result = result.filter(app => !app.is_system && !app.is_script);
    } else if (selectedCategory === "Scripts") {
      result = result.filter(app => app.is_script);
    } else if (selectedCategory === "Frequent") {
      result = result.filter(app => app.usage_count > 0)
        .sort((a, b) => b.usage_count - a.usage_count)
        .slice(0, 10);
    } else if (selectedCategory !== "All") {
      result = result.filter(app => !app.is_system && !app.is_script && app.category === selectedCategory);
    }

    // Sorting
    if (sortBy === 'name') {
      result.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
    } else if (sortBy === 'usage') {
      result.sort((a, b) => b.usage_count - a.usage_count);
    } else if (sortBy === 'date') {
      result.sort((a, b) => b.date_modified - a.date_modified);
    }

    // Prioritize scripts in search
    if (searchQuery) {
      result.sort((a, b) => {
        if (a.is_script && !b.is_script) return -1;
        if (!a.is_script && b.is_script) return 1;
        return 0;
      });
    }

    setFilteredApps(result);
  }, [searchQuery, apps, selectedCategory, sortBy]);

  async function loadApps() {
    try {
      const installedApps: AppInfo[] = await invoke("get_installed_apps");

      // Merge scripts
      const cfg: AppConfig = await invoke("get_config"); // Re-fetch to be safe
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
      invoke("run_script", { command: app.command, cwd: app.cwd });
      return;
    }

    try {
      await invoke("launch_app", { path });
      // Refresh to update usage counts
      loadApps();
    } catch (error) {
      console.error("Failed to launch app:", error);
    }
  }

  async function setCategory(path: string, category: string) {
    try {
      await invoke("update_app_category", { path, category });
      loadApps(); // Refresh UI
    } catch (error) {
      console.error("Failed to update category:", error);
    }
  }

  async function handleAddCategory() {
    if (!newCategory.trim()) return;
    await invoke("add_category", { category: newCategory });
    setNewCategory("");
    loadConfig();
  }

  async function handleRemoveCategory(category: string) {
    await invoke("remove_category", { category });
    if (selectedCategory === category) setSelectedCategory("All");
    loadConfig();
  }

  const handleReorderCategories = async (newOrder: string[]) => {
    if (!config) return;
    const newConfig = { ...config, category_order: newOrder };
    setConfig(newConfig);
    await invoke("save_config", { config: newConfig });
  };

  async function handleAddScript() {
    if (!newScriptName.trim() || !newScriptCmd.trim()) return;
    await invoke("add_script", { name: newScriptName, command: newScriptCmd, cwd: newScriptCwd });
    setNewScriptName("");
    setNewScriptCmd("");
    setNewScriptCwd("");
    loadConfig().then(() => loadApps());
  }

  async function handleRemoveScript(name: string) {
    await invoke("remove_script", { name });
    loadConfig().then(() => loadApps());
  }

  async function handleAutoCategorize() {
    try {
      await invoke("auto_categorize");
      await loadConfig();
      await loadApps();
    } catch (e) {
      console.error("Auto categorize failed", e);
    }
  }

  useEffect(() => {
    const handleClick = () => setContextMenu({ ...contextMenu, visible: false });
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [contextMenu]);

  // Handle Keyboard Navigation
  useEffect(() => {
    // This effect is now replaced by the one above (Lines 409). 
    // We will merge them to cleanup. 
    // For now, removing the conflicting legacy one.
  }, []);

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
    await invoke("update_shortcut", { shortcut: newShortcut });
    loadConfig();
  }

  const getCategoryCount = (category: string) => {
    if (category === "All") return apps.length;
    if (category === "Frequent") return apps.filter(a => a.usage_count > 0).length;
    if (category === "User Apps") return apps.filter(a => !a.is_system && !a.is_script).length;
    if (category === "System") return apps.filter(a => a.is_system).length;
    if (category === "Scripts") return apps.filter(a => a.is_script).length;
    return apps.filter(a => a.category === category).length;
  };


  // ... (keep script state)

  // ... (keep effects)

  // Handle Keyboard Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Global Back (Escape)
      if (e.key === 'Escape') {
        if (quickLookApp) setQuickLookApp(null);
        else if (viewMode === 'settings') setViewMode('grid');
        else if (searchQuery) setSearchQuery('');
        return;
      }

      if (viewMode === 'settings') return; // Disable grid nav in settings

      // Arrow Keys
      if (navigationArea === 'grid') {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedIndex(prev => Math.min(prev + 5, filteredApps.length - 1));
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedIndex(prev => Math.max(prev - 5, 0));
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          setSelectedIndex(prev => Math.min(prev + 1, filteredApps.length - 1));
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          if (selectedIndex === 0 || selectedIndex % 5 === 0) {
            setNavigationArea('sidebar');
            setSelectedIndex(-1);
          } else {
            setSelectedIndex(prev => Math.max(prev - 1, 0));
          }
        } else if (e.key === 'Enter' && selectedIndex >= 0) {
          launchApp(filteredApps[selectedIndex].path);
        } else if (e.key === ' ') {
          // Quick Look
          e.preventDefault();
          if (selectedIndex >= 0) {
            setQuickLookApp(filteredApps[selectedIndex]);
          }
        }
      } else {
        // Sidebar Navigation
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedSideIndex(prev => Math.min(prev + 1, allCategories.length - 1));
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedSideIndex(prev => Math.max(prev - 1, 0));
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          setNavigationArea('grid');
          setSelectedIndex(0);
        } else if (e.key === 'Enter') {
          setSelectedCategory(allCategories[selectedSideIndex]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredApps, selectedIndex, navigationArea, viewMode, allCategories, quickLookApp, searchQuery, selectedSideIndex]);


  return (
    <div className="app-container layout-vertical">
      <button
        className={`settings-btn ${viewMode === 'settings' ? 'active' : ''}`}
        onClick={() => setViewMode(prev => prev === 'grid' ? 'settings' : 'grid')}
        title="Settings"
      >
        {viewMode === 'grid' ? '⚙️' : '🏠'}
      </button>

      <aside className="sidebar">
        <h2 className="sidebar-title">Categories</h2>
        <Reorder.Group
          axis="y"
          values={allCategories}
          onReorder={handleReorderCategories}
          className="categories-list"
          style={{ listStyle: 'none', padding: 0, margin: 0 }}
        >
          {allCategories.map((category, index) => (
            <Reorder.Item
              key={category}
              value={category}
              className={`category-item-wrapper`}
            >
              <div
                className={`category-item ${selectedCategory === category ? "active" : ""} ${navigationArea === 'sidebar' && selectedSideIndex === index ? "selected" : ""}`}
                onClick={() => {
                  setSelectedCategory(category);
                  setNavigationArea('sidebar');
                  setSelectedSideIndex(index);
                  if (viewMode === 'settings') setViewMode('grid');
                }}
                onContextMenu={(e) => e.preventDefault()}
              >
                <div className="category-header">
                  <span className="category-icon">{categoryIcons[category] || "📁"}</span>
                  <span className="category-name">{category}</span>
                </div>
                <span className="category-count">{getCategoryCount(category)}</span>
              </div>
            </Reorder.Item>
          ))}
        </Reorder.Group>
      </aside>

      <main className="main-content">
        {viewMode === 'grid' ? (
          <>
            <header className="header">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search apps..."
                className="search-bar"
              />
              <div className="sort-controls">
                <select
                  className="sort-select"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'name' | 'usage' | 'date')}
                >
                  <option value="name">Name (A-Z)</option>
                  <option value="usage">Most Used</option>
                  <option value="date">Newest</option>
                </select>
              </div>
            </header>

            <div className="apps-grid">
              {filteredApps.map((app, index) => (
                <div
                  key={app.path}
                  id={`app-${index}`}
                  className={`app-card ${navigationArea === 'grid' && selectedIndex === index ? 'selected' : ''}`}
                  onClick={() => launchApp(app.path)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setContextMenu({ visible: true, x: e.clientX, y: e.clientY, app: app });
                  }}
                >
                  {app.icon_data ? (
                    <img src={app.icon_data} alt={app.name} className="app-icon" />
                  ) : (
                    <div className="app-placeholder">{app.name.charAt(0)}</div>
                  )}
                  <span className="app-name">{app.name}</span>
                  {app.is_script && <span className="script-badge">Script</span>}
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="settings-dashboard">
            <h1 className="settings-title">Control Center</h1>

            <div className="settings-grid">
              {/* General Section */}
              <section className="settings-group">
                <h3 className="group-title">General</h3>
                <div className="group-card">
                  <div className="setting-item">
                    <div className="setting-label">
                      <span>Global Shortcut</span>
                      <small>Wake app from anywhere</small>
                    </div>
                    <div className="setting-control">
                      <input
                        type="text"
                        value={newShortcut}
                        readOnly
                        placeholder="Press keys..."
                        className="shortcut-input"
                        onKeyDown={handleRecordShortcut}
                      />
                      <button className="small-btn" onClick={handleUpdateShortcut}>Save</button>
                    </div>
                  </div>
                </div>
              </section>

              {/* Organization Section */}
              <section className="settings-group">
                <h3 className="group-title">Organization</h3>
                <div className="group-card">
                  <div className="setting-item">
                    <div className="setting-label">
                      <span>Smart Auto-Sort</span>
                      <small>Heuristically categorize apps</small>
                    </div>
                    <button className="action-btn gradient-btn" onClick={handleAutoCategorize}>
                      ✨ Auto-Sort Now
                    </button>
                  </div>
                  <div className="divider"></div>
                  <div className="setting-item column">
                    <div className="setting-label">
                      <span>Manage Categories</span>
                    </div>
                    <div className="tags-container">
                      {config?.user_categories.filter(c => !defaultCategories.includes(c)).map(c => (
                        <span key={c} className="tag-chip">
                          {c}
                          <button onClick={() => handleRemoveCategory(c)}>×</button>
                        </span>
                      ))}
                    </div>
                    <div className="add-row">
                      <input
                        type="text"
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                        placeholder="New Category..."
                      />
                      <button className="small-btn" onClick={handleAddCategory}>Add</button>
                    </div>
                  </div>
                </div>
              </section>

              {/* Automation Section */}
              <section className="settings-group">
                <h3 className="group-title">Automation & Scripts</h3>
                <div className="group-card">
                  {/* Add Script */}
                  <div className="setting-item column bg-subtle">
                    <div className="add-script-row">
                      <input
                        type="text"
                        value={newScriptName}
                        onChange={(e) => setNewScriptName(e.target.value)}
                        placeholder="Name (e.g. 'Deploy')"
                        style={{ width: '120px' }}
                      />
                      <input
                        type="text"
                        value={newScriptCmd}
                        onChange={(e) => setNewScriptCmd(e.target.value)}
                        placeholder="Shell Command..."
                        style={{ flex: 1 }}
                      />
                      <input
                        type="text"
                        value={newScriptCwd}
                        onChange={(e) => setNewScriptCwd(e.target.value)}
                        placeholder="CWD (Optional)"
                        style={{ width: '100px' }}
                      />
                      <button className="small-btn primary" onClick={handleAddScript}>Add</button>
                    </div>
                  </div>

                  {/* Script List */}
                  <div className="scripts-list">
                    {(config?.scripts || []).map(s => (
                      <div key={s.name} className="script-row">
                        <div className="script-icon-badge">{'>_'}</div>
                        <div className="script-info">
                          <span className="name">{s.name}</span>
                          <span className="cmd">{s.command}</span>
                        </div>
                        <button className="delete-btn" onClick={() => handleRemoveScript(s.name)}>Delete</button>
                      </div>
                    ))}
                    {(config?.scripts || []).length === 0 && (
                      <div className="empty-state">No custom scripts added yet.</div>
                    )}
                  </div>
                </div>
              </section>
            </div>
          </div>
        )}
      </main>

      {/* Context Menu & Modals */}
      <ContextMenu
        visible={contextMenu.visible}
        x={contextMenu.x}
        y={contextMenu.y}
        onClose={() => setContextMenu({ ...contextMenu, visible: false })}
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
            onClick: () => contextMenu.app && invoke("reveal_in_finder", { path: contextMenu.app.path })
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
