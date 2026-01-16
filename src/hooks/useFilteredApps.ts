import { useMemo } from "react";
import type { AppInfo } from "../types/app";

export default function useFilteredApps({
  apps,
  searchQuery,
  selectedCategory,
  sortBy,
}: {
  apps: AppInfo[];
  searchQuery: string;
  selectedCategory: string;
  sortBy: "name" | "usage" | "date";
}) {
  return useMemo(() => {
    let result = [...apps];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((app) => app.name.toLowerCase().includes(q));
    }

    if (selectedCategory === "System") {
      result = result.filter((app) => app.is_system);
    } else if (selectedCategory === "User Apps") {
      result = result.filter((app) => !app.is_system && !app.is_script);
    } else if (selectedCategory === "Scripts") {
      result = result.filter((app) => app.is_script);
    } else if (selectedCategory === "Frequent") {
      result = result
        .filter((app) => app.usage_count > 0)
        .sort((a, b) => b.usage_count - a.usage_count)
        .slice(0, 10);
    } else if (selectedCategory !== "All") {
      result = result.filter((app) => !app.is_system && !app.is_script && app.category === selectedCategory);
    }

    if (sortBy === "name") {
      result.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
    } else if (sortBy === "usage") {
      result.sort((a, b) => b.usage_count - a.usage_count);
    } else if (sortBy === "date") {
      result.sort((a, b) => b.date_modified - a.date_modified);
    }

    if (searchQuery) {
      result.sort((a, b) => {
        if (a.is_script && !b.is_script) return -1;
        if (!a.is_script && b.is_script) return 1;
        return 0;
      });
    }

    return result;
  }, [apps, searchQuery, selectedCategory, sortBy]);
}

