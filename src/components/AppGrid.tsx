import AppIcon from "./AppIcon";
import EmptyState from "./EmptyState";
import type { AppInfo } from "../types/app";

export default function AppGrid({
  searchQuery,
  onSearchQueryChange,
  sortBy,
  onSortByChange,
  onRefreshApps,
  appsRefreshing,
  apps,
  navigationArea,
  selectedIndex,
  onLaunch,
  onOpenContextMenu,
  currentCategory,
}: {
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  sortBy: "name" | "usage" | "date";
  onSortByChange: (value: "name" | "usage" | "date") => void;
  onRefreshApps: () => void;
  appsRefreshing: boolean;
  apps: AppInfo[];
  navigationArea: "sidebar" | "grid";
  selectedIndex: number;
  onLaunch: (path: string) => void;
  onOpenContextMenu: (x: number, y: number, app: AppInfo) => void;
  currentCategory?: string;
}) {
  return (
    <>
      <header className="header">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchQueryChange(e.target.value)}
          placeholder="Search apps..."
          className="search-bar"
        />
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div className="sort-controls">
            <select
              className="sort-select"
              value={sortBy}
              onChange={(e) => onSortByChange(e.target.value as "name" | "usage" | "date")}
            >
              <option value="name">Name (A-Z)</option>
              <option value="usage">Most Used</option>
              <option value="date">Newest</option>
            </select>
          </div>
          <button className="small-btn" onClick={onRefreshApps} disabled={appsRefreshing} title="Rescan installed apps">
            {appsRefreshing ? "刷新中..." : "刷新"}
          </button>
        </div>
      </header>

      {apps.length === 0 ? (
        <div className="apps-grid-empty">
          <EmptyState category={currentCategory || "Apps"} />
        </div>
      ) : (
        <div className="apps-grid">
          {apps.map((app, index) => (
            <div
              key={app.path}
              id={`app-${index}`}
              className={`app-card ${navigationArea === "grid" && selectedIndex === index ? "selected" : ""}`}
              onClick={() => onLaunch(app.path)}
              onContextMenu={(e) => {
                e.preventDefault();
                onOpenContextMenu(e.clientX, e.clientY, app);
              }}
            >
              <AppIcon path={app.path} name={app.name} initialIcon={app.icon_data} />
              <span className="app-name">{app.name}</span>
              {app.is_script && <span className="script-badge">Script</span>}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
