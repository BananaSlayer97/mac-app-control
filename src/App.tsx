import { useRef, useState, useEffect, useMemo } from "react";
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
import { buildAppContextMenuItems } from "./lib/contextMenuItems";
import { resolveWallpaperUrl } from "./lib/wallpaper";
import { useAppStore } from "./store/useAppStore";
import { revealInFinder } from "./api/tauri";

function App() {
  const {
    apps,
    config,
    loadInitialData,
    loadApps,
    appsRefreshing,
    notice,
    setNotice,
    launchApp,
    setAppCategory,
    reorderCategories
  } = useAppStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [viewMode, setViewMode] = useState<'grid' | 'settings'>('grid');

  // Navigation State
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [selectedSideIndex, setSelectedSideIndex] = useState<number>(0);
  const [navigationArea, setNavigationArea] = useState<'sidebar' | 'grid'>('grid');

  const scrollRafRef = useRef<number | null>(null);

  const filteredApps = useFilteredApps({ apps, searchQuery, selectedCategory, sortBy: 'name' });

  const wallpaperUrl = useMemo(() => {
    return resolveWallpaperUrl(config?.wallpaper);
  }, [config?.wallpaper]);

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{ visible: boolean; x: number; y: number; app: any | null }>({
    visible: false,
    x: 0,
    y: 0,
    app: null
  });

  const [quickLookApp, setQuickLookApp] = useState<any | null>(null);

  const defaultCategories = ["Frequent", "Scripts", "Development", "Social", "Design", "Productivity", "User Apps", "System"];

  const allCategories = useMemo(() => {
    if (!config) return defaultCategories;
    return config.category_order && config.category_order.length > 0
      ? config.category_order
      : [...defaultCategories, ...(config.user_categories || []).filter(c => !defaultCategories.includes(c))];
  }, [config, defaultCategories]);

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
    loadInitialData();

    const unlistenFocus = listen('tauri://focus', () => {
      setSearchQuery("");
      setSelectedIndex(0);
      (document.querySelector('.search-bar') as HTMLInputElement)?.focus();
      loadApps(false);
    });

    return () => {
      unlistenFocus.then(f => f());
    }
  }, []);

  // Sync selection to category
  useEffect(() => {
    if (navigationArea === 'sidebar' && allCategories[selectedSideIndex]) {
      setSelectedCategory(allCategories[selectedSideIndex]);
    }
  }, [selectedSideIndex, navigationArea, allCategories]);

  // Reset index on change
  useEffect(() => {
    setSelectedIndex(0);
  }, [selectedCategory, searchQuery]);

  // Scroller
  useEffect(() => {
    if (viewMode !== "grid" || navigationArea !== "grid" || selectedIndex < 0) return;

    if (scrollRafRef.current) cancelAnimationFrame(scrollRafRef.current);
    scrollRafRef.current = requestAnimationFrame(() => {
      const el = document.getElementById(`app-${selectedIndex}`);
      const container = document.querySelector(".apps-grid") as HTMLElement | null;
      if (el && container) {
        el.scrollIntoView({ behavior: "auto", block: "nearest" });
      }
    });
  }, [selectedIndex, navigationArea, viewMode]);

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

  const getCategoryCount = (category: string) => {
    // Simplified: in a real refactor we'd move this to store or a memo
    if (category === "Frequent") return apps.filter(a => (a.usage_count || 0) > 0).length;
    if (category === "Scripts") return apps.filter(a => a.is_script).length;
    return apps.filter(a => a.category === category).length;
  };

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
        onReorder={reorderCategories}
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
            sortBy={'name'}
            onSortByChange={() => { }}
            onRefreshApps={() => loadApps(true)}
            appsRefreshing={appsRefreshing}
            apps={filteredApps}
            navigationArea={navigationArea}
            selectedIndex={selectedIndex}
            onLaunch={launchApp}
            onOpenContextMenu={(x, y, app) => setContextMenu({ visible: true, x, y, app })}
            currentCategory={selectedCategory}
          />
        ) : (
          <SettingsDashboard />
        )}
      </main>

      <ContextMenu
        visible={contextMenu.visible}
        x={contextMenu.x}
        y={contextMenu.y}
        onClose={() => setContextMenu((prev) => ({ ...prev, visible: false }))}
        items={buildAppContextMenuItems({
          app: contextMenu.app,
          allCategories,
          onLaunch: launchApp,
          onSetCategory: setAppCategory,
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
