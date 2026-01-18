import type { AppInfo } from "../types/app";
import type { ContextMenuItem } from "../types/contextMenu";

export function buildAppContextMenuItems(params: {
  app: AppInfo | null;
  allCategories: string[];
  onLaunch: (path: string) => void;
  onSetCategory: (path: string, category: string) => void;
  onRevealInFinder: (path: string) => void;
  onCopyText: (text: string) => void;
}): ContextMenuItem[] {
  const { app, allCategories, onLaunch, onSetCategory, onRevealInFinder, onCopyText } = params;
  const items: ContextMenuItem[] = [];
  if (!app) return items;

  items.push({ type: "item", label: "Open / Launch", onClick: () => onLaunch(app.path) });

  if (!app.is_system && !app.is_script) {
    items.push({ type: "divider" });
    items.push({ type: "header", label: "Category" });

    const customCategories = allCategories.filter(
      (c) => !["All", "Frequent", "Scripts", "User Apps", "System"].includes(c)
    );

    items.push({
      type: "item",
      label: "Uncategorized",
      onClick: () => onSetCategory(app.path, ""),
      checked: !app.category,
      disabled: !app.category,
    });

    for (const c of customCategories) {
      items.push({
        type: "item",
        label: c,
        onClick: () => onSetCategory(app.path, c),
        checked: app.category === c,
        disabled: app.category === c,
      });
    }
  }

  items.push({ type: "divider" });
  items.push({ type: "header", label: "System" });
  items.push({ type: "item", label: "Reveal in Finder", onClick: () => onRevealInFinder(app.path) });
  items.push({ type: "item", label: "Copy Path", onClick: () => onCopyText(app.path) });

  return items;
}

