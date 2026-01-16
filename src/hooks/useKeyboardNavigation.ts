import { useEffect } from "react";
import type { AppInfo } from "../types/app";

export default function useKeyboardNavigation({
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
  onLaunch,
}: {
  filteredApps: AppInfo[];
  selectedIndex: number;
  setSelectedIndex: React.Dispatch<React.SetStateAction<number>>;
  navigationArea: "sidebar" | "grid";
  setNavigationArea: React.Dispatch<React.SetStateAction<"sidebar" | "grid">>;
  viewMode: "grid" | "settings";
  setViewMode: React.Dispatch<React.SetStateAction<"grid" | "settings">>;
  allCategories: string[];
  selectedSideIndex: number;
  setSelectedSideIndex: React.Dispatch<React.SetStateAction<number>>;
  quickLookApp: AppInfo | null;
  setQuickLookApp: React.Dispatch<React.SetStateAction<AppInfo | null>>;
  searchQuery: string;
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  onLaunch: (path: string) => void;
}) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (quickLookApp) setQuickLookApp(null);
        else if (viewMode === "settings") setViewMode("grid");
        else if (searchQuery) setSearchQuery("");
        return;
      }

      if (e.key === " " && quickLookApp) {
        e.preventDefault();
        setQuickLookApp(null);
        return;
      }

      if (viewMode === "settings") return;

      if (navigationArea === "grid") {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setSelectedIndex((prev) => Math.min(prev + 5, filteredApps.length - 1));
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          setSelectedIndex((prev) => Math.max(prev - 5, 0));
        } else if (e.key === "ArrowRight") {
          e.preventDefault();
          setSelectedIndex((prev) => Math.min(prev + 1, filteredApps.length - 1));
        } else if (e.key === "ArrowLeft") {
          e.preventDefault();
          if (selectedIndex === 0 || selectedIndex % 5 === 0) {
            setNavigationArea("sidebar");
            setSelectedIndex(-1);
          } else {
            setSelectedIndex((prev) => Math.max(prev - 1, 0));
          }
        } else if (e.key === "Enter" && selectedIndex >= 0) {
          onLaunch(filteredApps[selectedIndex].path);
        } else if (e.key === " ") {
          e.preventDefault();
          if (selectedIndex >= 0) {
            setQuickLookApp(filteredApps[selectedIndex]);
          }
        }
      } else {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setSelectedSideIndex((prev) => Math.min(prev + 1, allCategories.length - 1));
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          setSelectedSideIndex((prev) => Math.max(prev - 1, 0));
        } else if (e.key === "ArrowRight") {
          e.preventDefault();
          setNavigationArea("grid");
          setSelectedIndex(0);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    filteredApps,
    selectedIndex,
    navigationArea,
    viewMode,
    allCategories,
    quickLookApp,
    searchQuery,
    selectedSideIndex,
    setNavigationArea,
    setQuickLookApp,
    setSearchQuery,
    setSelectedIndex,
    setSelectedSideIndex,
    setViewMode,
    onLaunch,
  ]);
}
