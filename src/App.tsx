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
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [config, setConfig] = useState<AppConfig | null>(null);
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
        {allCategories.map(category => (
          <div
            key={category}
            className={`category-item ${selectedCategory === category ? "active" : ""}`}
            onClick={() => setSelectedCategory(category)}
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
          {filteredApps.map((app) => (
            <div
              key={app.path}
              className="app-card"
              onClick={() => launchApp(app.path)}
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && launchApp(app.path)}
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
                  onChange={(e) => setNewShortcut(e.target.value)}
                  placeholder="Alt+Space"
                />
                <button onClick={handleUpdateShortcut}>Save</button>
              </div>
              <p className="setting-hint">Format: Alt+Space, Cmd+P, etc.</p>
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
