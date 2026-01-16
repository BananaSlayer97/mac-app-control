import { invoke } from "@tauri-apps/api/core";
import type { AppConfig, AppInfo } from "../types/app";

export function getConfig() {
  return invoke<AppConfig>("get_config");
}

export function saveConfig(config: AppConfig) {
  return invoke<void>("save_config_command", { config });
}

export function getInstalledApps(refresh: boolean = false) {
  return invoke<AppInfo[]>("get_installed_apps", { refresh });
}

export function getAppIcon(path: string) {
  return invoke<string | null>("get_app_icon", { path });
}

export function launchApp(path: string) {
  return invoke<void>("launch_app", { path });
}

export function updateAppCategory(path: string, category: string) {
  return invoke<void>("update_app_category", { path, category });
}

export function addCategory(category: string) {
  return invoke<void>("add_category", { category });
}

export function removeCategory(category: string) {
  return invoke<void>("remove_category", { category });
}

export function updateShortcut(shortcut: string) {
  return invoke<void>("update_shortcut", { shortcut });
}

export function revealInFinder(path: string) {
  return invoke<void>("reveal_in_finder", { path });
}

export function runScript(command: string, cwd?: string) {
  return invoke<void>("run_script", { command, cwd });
}

export function addScript(name: string, command: string, cwd?: string) {
  return invoke<void>("add_script", { name, command, cwd });
}

export function removeScript(name: string) {
  return invoke<void>("remove_script", { name });
}

export function autoCategorize() {
  return invoke<void>("auto_categorize");
}

