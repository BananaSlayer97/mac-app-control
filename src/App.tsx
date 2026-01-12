import { useState, useEffect } from "react";
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

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [newShortcut, setNewShortcut] = useState("");

  // Script Management State
  const [newScriptName, setNewScriptName] = useState("");
  const [newScriptCmd, setNewScriptCmd] = useState("");
  const [newScriptCwd, setNewScriptCwd] = useState(""); // CWD State

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{ visible: boolean; x: number; y: number; appPath: string | null }>({
    visible: false,
    x: 0,
    y: 0,
    appPath: null
  });

  const [quickLookApp, setQuickLookApp] = useState<AppInfo | null>(null);

  const defaultCategories = ["All", "Frequent", "User Apps", "System"];
  const allCategories = [...defaultCategories, ...(config?.user_categories || [])];

  // Generate a consistent color based on the app name
  const getColorFromName = (name: string) => {
    const colors = [
      "#FF5733", "#33FF57", "#3357FF", "#F333FF", "#33FFF3",
      "#F3FF33", "#FF3385", "#8533FF", "#33FFBD", "#FF8C33"
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
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
    let result = apps;
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

    // Prioritize scripts in search if they match well
    if (searchQuery) {
      result.sort((a, b) => {
        if (a.is_script && !b.is_script) return -1;
        if (!a.is_script && b.is_script) return 1;
        return 0;
      });
    }

    setFilteredApps(result);
  }, [searchQuery, apps, selectedCategory]);

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
        category: "Scripts"
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

  useEffect(() => {
    const handleClick = () => setContextMenu({ ...contextMenu, visible: false });
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [contextMenu]);

  // Handle Keyboard Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // If modal is open, let it handle keys (except Escape to close)
      if (isSettingsOpen) {
        if (e.key === 'Escape') setIsSettingsOpen(false);
        return;
      }

      // Quick Focus Search
      if (e.metaKey && e.key === 'f') {
        e.preventDefault();
        (document.querySelector('.search-bar') as HTMLInputElement)?.focus();
        (document.querySelector('.search-bar') as HTMLInputElement)?.focus();
        return;
      }

      // Quick Look (Space)
      if (e.code === 'Space' && navigationArea === 'grid' && selectedIndex >= 0 && !searchQuery && !quickLookApp) {
        // Only trigger if not typing in search bar (usually space is typed there)
        // Check if search bar is focused
        if (document.activeElement?.className !== 'search-bar') {
          e.preventDefault();
          setQuickLookApp(filteredApps[selectedIndex]);
          return;
        }
      }

      // Close Quick Look with Space or Escape
      if (quickLookApp && (e.code === 'Space' || e.key === 'Escape')) {
        e.preventDefault();
        setQuickLookApp(null);
        return;
      }

      // App Launch
      if (e.key === 'Enter') {
        if (navigationArea === 'grid' && selectedIndex >= 0 && selectedIndex < filteredApps.length) {
          launchApp(filteredApps[selectedIndex].path);
        } else if (navigationArea === 'sidebar') {
          // Sidebar selection is already active, maybe focus grid?
          setNavigationArea('grid');
          setSelectedIndex(0);
        }
        return;
      }

      // Navigation Logic
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();

        if (navigationArea === 'grid') {
          const cols = Math.floor((document.querySelector('.apps-grid')?.clientWidth || 1000) / 140); // Approx width + gap
          const total = filteredApps.length;

          if (e.key === 'ArrowRight') setSelectedIndex(prev => Math.min(prev + 1, total - 1));
          if (e.key === 'ArrowLeft') setSelectedIndex(prev => Math.max(prev - 1, 0));
          if (e.key === 'ArrowDown') setSelectedIndex(prev => Math.min(prev + cols, total - 1));
          if (e.key === 'ArrowUp') setSelectedIndex(prev => Math.max(prev - cols, 0));
        } else {
          const total = allCategories.length;
          if (e.key === 'ArrowDown') setSelectedSideIndex(prev => Math.min(prev + 1, total - 1));
          if (e.key === 'ArrowUp') setSelectedSideIndex(prev => Math.max(prev - 1, 0));
        }
      }

      // Tab Switching
      if (e.key === 'Tab') {
        e.preventDefault();
        setNavigationArea(prev => prev === 'sidebar' ? 'grid' : 'sidebar');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredApps, selectedIndex, navigationArea, isSettingsOpen, allCategories]);

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

  return (
    <div className="app-container layout-vertical">
      <button className="settings-btn" onClick={() => setIsSettingsOpen(true)} title="Settings">
        ⚙️
      </button>

      <aside className="sidebar">
        <h2 className="sidebar-title">Categories</h2>
        {allCategories.map((category, index) => (
          <div
            key={category}
            className={`category-item ${selectedCategory === category ? "active" : ""} ${navigationArea === 'sidebar' && selectedSideIndex === index ? "selected" : ""}`}
            onClick={() => {
              setSelectedCategory(category);
              setNavigationArea('sidebar');
              setSelectedSideIndex(index);
            }}
            onContextMenu={(e) => e.preventDefault()}
          >
            {category}
          </div>
        ))}
      </aside>

      <main className="main-content">
        <header className="header">
          <div></div>
          <input
            type="text"
            className="search-bar"
            placeholder="Search applications..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </header>

        <div className="apps-grid">
          {filteredApps.map((app, index) => (
            <div
              key={app.path}
              id={`app-${index}`}
              className={`app-card ${selectedIndex === index ? 'selected' : ''}`}
              onClick={() => {
                setSelectedIndex(index);
                launchApp(app.path);
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                setContextMenu({
                  visible: true,
                  x: e.clientX,
                  y: e.clientY,
                  appPath: app.path
                });
              }}
            >
              <div className="app-icon">
                {app.is_script ? (
                  <div className="placeholder-icon script-icon" style={{ backgroundColor: '#10b981' }}>
                    {'>_'}
                  </div>
                ) : app.icon_data ? (
                  <img src={app.icon_data} alt={app.name} className="native-icon" />
                ) : (
                  <div className="placeholder-icon" style={{ backgroundColor: getColorFromName(app.name) }}>
                    {app.name[0]}
                  </div>
                )}
              </div>
              <div className="app-name">{app.name}</div>
              {!app.is_system && !app.is_script ? (
                <select
                  className="category-select"
                  value={app.category || "Other"}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => setCategory(app.path, e.target.value)}
                >
                  {allCategories.filter(c => !["All", "Frequent", "User Apps", "System"].includes(c)).map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                  <option value="Other">Other</option>
                </select>
              ) : (
                <div className="system-tag">System App</div>
              )}
            </div>
          ))}
        </div>
      </main>

      {isSettingsOpen && (
        <div className="modal-overlay" onClick={() => setIsSettingsOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Settings</h3>

            <section className="settings-section">
              <h4>Global Shortcut</h4>
              <div className="setting-row">
                <input
                  type="text"
                  value={newShortcut}
                  readOnly
                  placeholder="Click to record shortcut..."
                  className="shortcut-input"
                  onKeyDown={handleRecordShortcut}
                  style={{ cursor: 'pointer', textAlign: 'center', fontWeight: 'bold' }}
                />
                <button onClick={handleUpdateShortcut}>Save</button>
              </div>
              <p className="setting-hint">Click the box and press your desired key combination (e.g. Cmd+P)</p>
            </section>

            <section className="settings-section">
              <h4>Scripts (Custom Commands)</h4>
              <div className="category-list">
                {(config?.scripts || []).map(s => (
                  <div key={s.name} className="category-manager-item">
                    <div className="script-info">
                      <span className="script-name">{s.name}</span>
                      <span className="script-details" title={`${s.command} ${s.cwd ? `(in ${s.cwd})` : ''}`}>
                        {s.command} {s.cwd ? <span style={{ color: '#10b981' }}>(in {s.cwd})</span> : ''}
                      </span>
                    </div>
                    <button onClick={() => handleRemoveScript(s.name)}>Delete</button>
                  </div>
                ))}
              </div>
              <div className="setting-row">
                <input
                  type="text"
                  value={newScriptName}
                  onChange={(e) => setNewScriptName(e.target.value)}
                  placeholder="Name"
                />
                <input
                  type="text"
                  value={newScriptCmd}
                  onChange={(e) => setNewScriptCmd(e.target.value)}
                  placeholder="Command"
                />
                <input
                  type="text"
                  value={newScriptCwd}
                  onChange={(e) => setNewScriptCwd(e.target.value)}
                  placeholder="Directory (Optional)"
                />
                <button onClick={handleAddScript}>Add</button>
              </div>
            </section>

            <section className="settings-section">
              <h4>Manage Categories</h4>
              <div className="category-list">
                {config?.user_categories.map(c => (
                  <div key={c} className="category-manager-item">
                    <span>{c}</span>
                    <button onClick={() => handleRemoveCategory(c)}>Delete</button>
                  </div>
                ))}
              </div>
              <div className="setting-row">
                <input
                  type="text"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="New category name"
                />
                <button onClick={handleAddCategory}>Add</button>
              </div>
            </section>

            <button className="close-modal" onClick={() => setIsSettingsOpen(false)}>Close</button>
          </div>
        </div>
      )}

      <ContextMenu
        visible={contextMenu.visible}
        x={contextMenu.x}
        y={contextMenu.y}
        onClose={() => setContextMenu({ ...contextMenu, visible: false })}
        actions={[
          {
            label: "Open / Launch",
            onClick: () => contextMenu.appPath && launchApp(contextMenu.appPath)
          },
          {
            label: "Reveal in Finder",
            onClick: () => contextMenu.appPath && invoke("reveal_in_finder", { path: contextMenu.appPath })
          },
          {
            label: "Copy Path",
            onClick: () => {
              if (contextMenu.appPath) {
                navigator.clipboard.writeText(contextMenu.appPath);
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
