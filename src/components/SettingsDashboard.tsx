import type { AppConfig } from "../types/app";

export default function SettingsDashboard({
  config,
  defaultCategories,
  newShortcut,
  onRecordShortcut,
  onSaveShortcut,
  onAutoCategorize,
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
}: {
  config: AppConfig | null;
  defaultCategories: string[];
  newShortcut: string;
  onRecordShortcut: (e: React.KeyboardEvent) => void;
  onSaveShortcut: () => void;
  onAutoCategorize: () => void;
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
}) {
  return (
    <div className="settings-dashboard">
      <h1 className="settings-title">Control Center</h1>

      <div className="settings-grid">
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
            <div className="setting-item">
              <div className="setting-label">
                <span>Smart Auto-Sort</span>
                <small>Heuristically categorize apps</small>
              </div>
              <button className="action-btn gradient-btn" onClick={onAutoCategorize}>
                ✨ Auto-Sort Now
              </button>
            </div>
            <div className="divider"></div>
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
                    <span className="name">{s.name}</span>
                    <span className="cmd">{s.command}</span>
                  </div>
                  <button className="delete-btn" onClick={() => onRemoveScript(s.name)}>
                    Delete
                  </button>
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
