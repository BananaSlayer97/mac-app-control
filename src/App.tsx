import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";

interface AppInfo {
  name: string;
  path: string;
  is_system: boolean;
  category?: string;
  usage_count: number;
  icon_data?: string;
}

interface AppConfig {
  categories: Record<string, string>;
  usage_counts: Record<string, number>;
  user_categories: string[];
  shortcut: string;
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
    loadApps();
    loadConfig();
  }, []);

  async function loadConfig() {
    try {
      const cfg: AppConfig = await invoke("get_config");
      setConfig(cfg);
      setNewShortcut(cfg.shortcut);
    } catch (e) {
      console.error("Failed to load config", e);
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
      result = result.filter(app => !app.is_system);
    } else if (selectedCategory === "Frequent") {
      result = result.filter(app => app.usage_count > 0)
        .sort((a, b) => b.usage_count - a.usage_count)
        .slice(0, 10);
    } else if (selectedCategory !== "All") {
      result = result.filter(app => !app.is_system && app.category === selectedCategory);
    }

    setFilteredApps(result);
  }, [searchQuery, apps, selectedCategory]);

  async function loadApps() {
    try {
      const installedApps: AppInfo[] = await invoke("get_installed_apps");
      setApps(installedApps);
    } catch (error) {
      console.error("Failed to fetch apps:", error);
    }
  }

  async function launchApp(path: string) {
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
    loadApps();
  }

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
            className={`category-item ${selectedCategory === category ? "active" : ""} ${navigationArea === 'sidebar' && selectedSideIndex === index ? "selected" : ""}`} // Add visual selected state for keyboard
            onClick={() => {
              setSelectedCategory(category);
              setNavigationArea('sidebar');
              setSelectedSideIndex(index);
            }}
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
            // Removed individual tabIndex and onKeyDown as global listener handles it better
            >
              <div className="app-icon">
                {app.icon_data ? (
                  <img src={app.icon_data} alt={app.name} className="native-icon" />
                ) : (
                  <div className="placeholder-icon" style={{ backgroundColor: getColorFromName(app.name) }}>
                    {app.name[0]}
                  </div>
                )}
              </div>
              <div className="app-name">{app.name}</div>
              {!app.is_system ? (
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
    </div>
  );
}

export default App;
