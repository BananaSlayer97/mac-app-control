import type { AppConfig, AppInfo } from "../types/app";
import { useMemo, useState } from "react";

export default function SettingsDashboard({
  config,
  apps,
  defaultCategories,
  newShortcut,
  onRecordShortcut,
  onSaveShortcut,
  newCategory,
  onNewCategoryChange,
  onAddCategory,
  onRemoveCategory,
  newScriptName,
  onNewScriptNameChange,
  newScriptCmd,
  onNewScriptCmdChange,
  newScriptCwd,
  onNewScriptCwdChange,
  onAddScript,
  onRemoveScript,
  onTestScript,
  onUpdateScript,
  currentTheme,
  onThemeChange,
  wallpaper,
  onWallpaperChange,
  wallpaperBlur,
  onWallpaperBlurChange,
  wallpaperFit,
  onWallpaperFitChange,
  wallpaperPosition,
  onWallpaperPositionChange,
}: {
  config: AppConfig | null;
  apps: AppInfo[];
  defaultCategories: string[];
  newShortcut: string;
  onRecordShortcut: (e: React.KeyboardEvent) => void;
  onSaveShortcut: () => void;
  newCategory: string;
  onNewCategoryChange: (value: string) => void;
  onAddCategory: () => void;
  onRemoveCategory: (category: string) => void;
  newScriptName: string;
  onNewScriptNameChange: (value: string) => void;
  newScriptCmd: string;
  onNewScriptCmdChange: (value: string) => void;
  newScriptCwd: string;
  onNewScriptCwdChange: (value: string) => void;
  onAddScript: () => void;
  onRemoveScript: (name: string) => void;
  onTestScript: (command: string, cwd?: string) => void;
  onUpdateScript: (originalName: string, name: string, command: string, cwd?: string) => Promise<void> | void;
  currentTheme: string;
  onThemeChange: (theme: string) => void;
  wallpaper: string;
  onWallpaperChange: (path: string) => void;
  wallpaperBlur: number;
  onWallpaperBlurChange: (blur: number) => void;
  wallpaperFit: string;
  onWallpaperFitChange: (fit: string) => void;
  wallpaperPosition: string;
  onWallpaperPositionChange: (pos: string) => void;
}) {
  const themes = ["Midnight", "Dawn", "Nebula", "Forest"];
  const [editingScript, setEditingScript] = useState<{
    originalName: string;
    name: string;
    command: string;
    cwd: string;
  } | null>(null);

  const topApps = useMemo(() => {
    if (!config || !config.usage_counts) return [];
    return Object.entries(config.usage_counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([path, count]) => {
        const app = apps.find((a) => a.path === path);
        return { name: app?.name || path.split("/").pop() || path, count, icon: app?.icon_data };
      });
  }, [config, apps]);

  const maxUsage = topApps.length > 0 ? topApps[0].count : 1;

  return (
    <div className="settings-dashboard">
      <h1 className="settings-title">Control Center</h1>

      <div className="settings-grid">
        <section className="settings-group">
          <h3 className="group-title">Statistics</h3>
          <div className="group-card" style={{ padding: "16px" }}>
             <h4 style={{fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px'}}>Top 5 Most Used</h4>
             <div className="stats-list">
                 {topApps.map((app, i) => (
                     <div key={i} className="stat-row">
                         <span className="stat-name">{app.name}</span>
                         <div className="stat-bar-container">
                             <div 
                                className="stat-bar" 
                                style={{ width: `${(app.count / maxUsage) * 100}%` }}
                             />
                         </div>
                         <span className="stat-count">{app.count}</span>
                     </div>
                 ))}
                 {topApps.length === 0 && <div className="empty-state-text">No usage data yet</div>}
             </div>
          </div>
        </section>

        <section className="settings-group">
          <h3 className="group-title">Appearance</h3>
          <div className="group-card">
            <div className="setting-item column">
              <div className="setting-label">
                <span>Theme</span>
              </div>
              <div className="theme-selector">
                {themes.map((theme) => (
                  <button
                    key={theme}
                    className={`theme-btn ${currentTheme === theme ? "active" : ""}`}
                    onClick={() => onThemeChange(theme)}
                    data-theme={theme}
                  >
                    {theme}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="setting-item column">
                <div className="setting-label">
                    <span>Custom Wallpaper</span>
                    <small>支持：PNG/JPG/JPEG/WebP/GIF｜远程：https://...｜本地：/Users/... 或 file:///Users/...</small>
                </div>
                <div className="setting-control" style={{width: '100%'}}>
                    <input 
                        type="text" 
                        value={wallpaper} 
                        onChange={(e) => onWallpaperChange(e.target.value)}
                        placeholder="https://source.unsplash.com/random/1920x1080"
                        style={{width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.2)', color: 'white'}}
                    />
                </div>
            </div>

            <div className="setting-item column">
              <div className="setting-label">
                <span>Wallpaper Frost (磨砂程度)</span>
                <small>0 = 原图（不磨砂/无遮罩），20 = 强磨砂</small>
              </div>
              <div className="wallpaper-tuning-row">
                <div className="wallpaper-tuning-item">
                  <div className="wallpaper-tuning-label">
                    <span>Frost</span>
                    <span className="wallpaper-tuning-value">{wallpaperBlur}px</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={20}
                    step={1}
                    value={wallpaperBlur}
                    onChange={(e) => onWallpaperBlurChange(Number(e.target.value))}
                    className="wallpaper-range"
                  />
                </div>

                <div className="wallpaper-tuning-item">
                  <div className="wallpaper-tuning-label">
                    <span>Fit</span>
                  </div>
                  <select className="sort-select wallpaper-select" value={wallpaperFit} onChange={(e) => onWallpaperFitChange(e.target.value)}>
                    <option value="cover">Cover</option>
                    <option value="contain">Contain</option>
                  </select>
                </div>

                <div className="wallpaper-tuning-item">
                  <div className="wallpaper-tuning-label">
                    <span>Position</span>
                  </div>
                  <select
                    className="sort-select wallpaper-select"
                    value={wallpaperPosition}
                    onChange={(e) => onWallpaperPositionChange(e.target.value)}
                  >
                    <option value="center">Center</option>
                    <option value="top">Top</option>
                    <option value="bottom">Bottom</option>
                    <option value="left">Left</option>
                    <option value="right">Right</option>
                    <option value="top left">Top Left</option>
                    <option value="top right">Top Right</option>
                    <option value="bottom left">Bottom Left</option>
                    <option value="bottom right">Bottom Right</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="settings-group">
          <h3 className="group-title">General</h3>
          <div className="group-card">
            <div className="setting-item">
              <div className="setting-label">
                <span>Global Shortcut</span>
                <small>Wake app from anywhere</small>
                <small>格式：Cmd+Space / Ctrl+Alt+K（支持 Alt/Ctrl/Shift/Cmd + A-Z/Space）</small>
              </div>
              <div className="setting-control">
                <input
                  type="text"
                  value={newShortcut}
                  readOnly
                  placeholder="Press keys..."
                  className="shortcut-input"
                  onKeyDown={onRecordShortcut}
                />
                <button className="small-btn" onClick={onSaveShortcut}>
                  Save
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="settings-group">
          <h3 className="group-title">Organization</h3>
          <div className="group-card">
            <div className="setting-item column">
              <div className="setting-label">
                <span>Manage Categories</span>
              </div>
              <div className="tags-container">
                {config?.user_categories
                  .filter((c) => !defaultCategories.includes(c))
                  .map((c) => (
                    <span key={c} className="tag-chip">
                      {c}
                      <button onClick={() => onRemoveCategory(c)}>×</button>
                    </span>
                  ))}
              </div>
              <div className="add-row">
                <input
                  type="text"
                  value={newCategory}
                  onChange={(e) => onNewCategoryChange(e.target.value)}
                  placeholder="New Category..."
                />
                <button className="small-btn" onClick={onAddCategory}>
                  Add
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="settings-group">
          <h3 className="group-title">Automation & Scripts</h3>
          <div className="group-card">
            <div className="setting-item column bg-subtle">
              <div className="add-script-row">
                <input
                  type="text"
                  value={newScriptName}
                  onChange={(e) => onNewScriptNameChange(e.target.value)}
                  placeholder="Name "
                  style={{ width: "120px" }}
                />
                <input
                  type="text"
                  value={newScriptCmd}
                  onChange={(e) => onNewScriptCmdChange(e.target.value)}
                  placeholder="Shell Command "
                  style={{ flex: 1 }}
                />
                <input
                  type="text"
                  value={newScriptCwd}
                  onChange={(e) => onNewScriptCwdChange(e.target.value)}
                  placeholder="Directory "
                  style={{ width: "100px" }}
                />
                <button className="small-btn" onClick={() => onTestScript(newScriptCmd, newScriptCwd)}>
                  Test
                </button>
                <button className="small-btn primary" onClick={onAddScript}>
                  Add
                </button>
              </div>
            </div>

            <div className="scripts-list">
              {(config?.scripts || []).map((s) => (
                <div key={s.name} className="script-row">
                  <div className="script-icon-badge">{">_"}</div>
                  <div className="script-info">
                    {editingScript?.originalName === s.name ? (
                      <>
                        <div style={{ display: "flex", gap: "8px", width: "100%" }}>
                          <input
                            type="text"
                            value={editingScript.name}
                            onChange={(e) => setEditingScript({ ...editingScript, name: e.target.value })}
                            style={{ width: "140px" }}
                          />
                          <input
                            type="text"
                            value={editingScript.cwd}
                            onChange={(e) => setEditingScript({ ...editingScript, cwd: e.target.value })}
                            placeholder="Directory"
                            style={{ width: "140px" }}
                          />
                        </div>
                        <input
                          type="text"
                          value={editingScript.command}
                          onChange={(e) => setEditingScript({ ...editingScript, command: e.target.value })}
                          placeholder="Shell Command"
                          style={{ width: "100%" }}
                        />
                      </>
                    ) : (
                      <>
                        <span className="name">{s.name}</span>
                        <span className="cmd">{s.command}</span>
                      </>
                    )}
                  </div>
                  {editingScript?.originalName === s.name ? (
                    <>
                      <button
                        className="small-btn"
                        onClick={() => {
                          setEditingScript(null);
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        className="small-btn primary"
                        onClick={async () => {
                          const next = editingScript;
                          if (!next) return;
                          await onUpdateScript(next.originalName, next.name, next.command, next.cwd);
                          setEditingScript(null);
                        }}
                      >
                        Save
                      </button>
                    </>
                  ) : (
                    <>
                      <button className="small-btn" onClick={() => onTestScript(s.command, s.cwd)}>
                        Run
                      </button>
                      <button
                        className="small-btn"
                        onClick={() =>
                          setEditingScript({
                            originalName: s.name,
                            name: s.name,
                            command: s.command,
                            cwd: s.cwd || "",
                          })
                        }
                      >
                        Edit
                      </button>
                      <button className="delete-btn" onClick={() => onRemoveScript(s.name)}>
                        Delete
                      </button>
                    </>
                  )}
                </div>
              ))}
              {(config?.scripts || []).length === 0 && <div className="empty-state">No custom scripts added yet.</div>}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
